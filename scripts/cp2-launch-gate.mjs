#!/usr/bin/env node
/* eslint-disable no-console */

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { performance } from "node:perf_hooks";
import { config as loadEnv } from "dotenv";

const CHECK_TIMEOUT_MS = 12 * 60 * 1000;
const HEALTH_TIMEOUT_MS = 5_000;
const RELEASE_INTENT = "CP2.4 final launch gate";

export const CP2_STATIC_CHECKS = [
  {
    id: "release-gate",
    label: "Repository release gate (includes verify, type-check, and lint)",
    script: "release:gate",
    args: ["--intent", RELEASE_INTENT],
  },
  {
    id: "runtime-eval",
    label: "Agent runtime evaluation",
    script: "eval:agent-runtime:ci",
    args: [],
  },
];

export const CP2_LIVE_CHECKS = [
  {
    id: "route-integrity",
    label: "Target route integrity",
    script: "route:integrity",
    args: [],
  },
  {
    id: "release-smoke",
    label: "Target release smoke",
    script: "release:smoke",
    args: [],
  },
  {
    id: "auth-e2e",
    label: "Target auth E2E",
    script: "auth:e2e",
    args: [],
  },
];

export class Cp2LaunchGateUsageError extends Error {}

export function parseCp2LaunchGateArgs(argv) {
  const options = { help: false, json: false, live: false };
  for (const arg of argv) {
    if (arg === "--help" || arg === "-h") options.help = true;
    else if (arg === "--json") options.json = true;
    else if (arg === "--live") options.live = true;
    else throw new Cp2LaunchGateUsageError(`unknown option: ${arg}`);
  }
  return options;
}

export function normalizeCp2TargetUrl(value) {
  const raw = String(value ?? "").trim();
  if (!raw) {
    throw new Cp2LaunchGateUsageError(
      "--live requires NEXUS_RELEASE_BASE_URL",
    );
  }

  let target;
  try {
    target = new URL(raw);
  } catch {
    throw new Cp2LaunchGateUsageError(
      "NEXUS_RELEASE_BASE_URL must be a valid http(s) URL",
    );
  }

  if (!["http:", "https:"].includes(target.protocol)) {
    throw new Cp2LaunchGateUsageError(
      "NEXUS_RELEASE_BASE_URL must use http or https",
    );
  }
  if (target.username || target.password) {
    throw new Cp2LaunchGateUsageError(
      "NEXUS_RELEASE_BASE_URL must not contain credentials",
    );
  }
  if ((target.pathname && target.pathname !== "/") || target.search || target.hash) {
    throw new Cp2LaunchGateUsageError(
      "NEXUS_RELEASE_BASE_URL must be an origin without a path, query, or fragment",
    );
  }
  return target.origin;
}

export function sanitizeCp2OutputLines(...values) {
  return values
    .flatMap((value) => String(value ?? "").split(/\r?\n/))
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !line.startsWith("> "))
    .filter((line) => !line.startsWith("npm warn config production"))
    .map((line) =>
      line
        .replace(/[A-Za-z]:\\Users\\[^\\\s]+\\[^\s]*/g, "[local-path]")
        .replace(/\b(token|secret|api[_-]?key)=\S+/gi, "$1=[redacted]")
        .slice(0, 240),
    )
    .slice(-8);
}

function npmInvocation(script, args) {
  const npmCli = process.env.npm_execpath;
  if (!npmCli || !existsSync(npmCli)) {
    throw new Error(
      "npm runner unavailable; invoke this gate through npm run cp2:launch:gate",
    );
  }
  return {
    command: process.execPath,
    args: [npmCli, "run", script, ...(args.length ? ["--", ...args] : [])],
  };
}

function runCheck(check, extraEnv) {
  const startedAt = performance.now();
  try {
    const invocation = npmInvocation(check.script, check.args);
    const result = spawnSync(invocation.command, invocation.args, {
      cwd: process.cwd(),
      encoding: "utf8",
      env: { ...process.env, ...extraEnv },
      shell: false,
      stdio: "pipe",
      timeout: CHECK_TIMEOUT_MS,
      windowsHide: true,
    });
    const passed = result.status === 0 && !result.error && !result.signal;
    return {
      id: check.id,
      label: check.label,
      passed,
      status: result.status,
      durationMs: Math.round(performance.now() - startedAt),
      detailLines: sanitizeCp2OutputLines(
        result.stdout,
        result.stderr,
        result.error?.message,
        result.signal ? `ended by signal ${result.signal}` : "",
      ),
    };
  } catch (error) {
    return {
      id: check.id,
      label: check.label,
      passed: false,
      status: null,
      durationMs: Math.round(performance.now() - startedAt),
      detailLines: sanitizeCp2OutputLines(
        error instanceof Error ? error.message : String(error),
      ),
    };
  }
}

function runChecks(checks, extraEnv) {
  const results = [];
  for (const check of checks) {
    const result = runCheck(check, extraEnv);
    results.push(result);
    if (!result.passed) break;
  }
  return results;
}

async function checkTargetHealth(baseUrl) {
  const startedAt = performance.now();
  try {
    const response = await fetch(`${baseUrl}/api/health`, {
      redirect: "manual",
      signal: AbortSignal.timeout(HEALTH_TIMEOUT_MS),
    });
    return {
      id: "target-health",
      label: "Operator-managed target health",
      passed: response.ok,
      status: response.status,
      durationMs: Math.round(performance.now() - startedAt),
      detailLines: response.ok
        ? []
        : [`/api/health returned HTTP ${response.status}`],
    };
  } catch (error) {
    return {
      id: "target-health",
      label: "Operator-managed target health",
      passed: false,
      status: null,
      durationMs: Math.round(performance.now() - startedAt),
      detailLines: sanitizeCp2OutputLines(
        error instanceof Error ? error.message : String(error),
      ),
    };
  }
}

export function classifyCp2LaunchGate({ checks, live }) {
  const failed = checks.find((check) => !check.passed);
  if (failed) {
    return {
      outcome: "blocked_local_checks",
      exitCode: 1,
      liveTargetProofPassed: false,
      blockers: [`local_check_failed:${failed.id}`],
      nextAction: "Fix the first failing check, then rerun the same gate mode.",
    };
  }

  if (!live) {
    return {
      outcome: "static_checks_passed",
      exitCode: 0,
      liveTargetProofPassed: false,
      blockers: [
        "live_target_checks_not_run",
        "remote_ci_confirmation_required",
      ],
      nextAction:
        "Start or select the operator-managed target, export NEXUS_RELEASE_BASE_URL and NEXUS_TOKEN, then rerun with --live.",
    };
  }

  return {
    outcome: "target_checks_passed",
    exitCode: 0,
    liveTargetProofPassed: true,
    blockers: [
      "remote_ci_confirmation_required",
      "promotion_rollback_record_required",
    ],
    nextAction:
      "Confirm remote CI and attach staged promotion and rollback evidence before release.",
  };
}

function printUsage() {
  console.log("CP2.4 launch gate");
  console.log("");
  console.log("Usage: npm run cp2:launch:gate -- [--live] [--json]");
  console.log("");
  console.log("Static mode is local and does not call a target.");
  console.log(
    "Live mode requires NEXUS_RELEASE_BASE_URL and NEXUS_TOKEN for an already-running target.",
  );
}

function printHuman(report) {
  console.log("CP2.4 launch gate");
  console.log(
    "Fixed checks only. This command does not start services, write evidence, mutate env files, or publish.",
  );
  console.log(`Mode: ${report.mode}`);
  if (report.live) {
    console.log(`Target: ${report.target}`);
    console.log("Token configured: yes (value not printed)");
  }
  console.log("");

  for (const check of report.checks) {
    console.log(
      `[${check.passed ? "OK" : "FAIL"}] ${check.label} (${(
        check.durationMs / 1000
      ).toFixed(1)}s)`,
    );
    if (!check.passed) {
      for (const line of check.detailLines) console.log(`  ${line}`);
    }
  }

  console.log("");
  console.log(`Outcome: ${report.result.outcome}`);
  console.log(
    `Live target proof passed: ${report.result.liveTargetProofPassed}`,
  );
  if (report.result.blockers.length) {
    console.log(`Remaining blockers: ${report.result.blockers.join(", ")}`);
  }
  console.log(`Next action: ${report.result.nextAction}`);
}

async function main() {
  let options;
  try {
    options = parseCp2LaunchGateArgs(process.argv.slice(2));
  } catch (error) {
    console.error(
      `cp2-launch-gate: ${error instanceof Error ? error.message : String(error)}`,
    );
    printUsage();
    process.exit(2);
  }

  if (options.help) {
    printUsage();
    process.exit(0);
  }

  loadEnv({ path: ".env.local", override: false, quiet: true });

  let target = null;
  if (options.live) {
    try {
      target = normalizeCp2TargetUrl(process.env.NEXUS_RELEASE_BASE_URL);
      if (!process.env.NEXUS_TOKEN?.trim()) {
        throw new Cp2LaunchGateUsageError("--live requires NEXUS_TOKEN");
      }
    } catch (error) {
      console.error(
        `cp2-launch-gate: ${error instanceof Error ? error.message : String(error)}`,
      );
      process.exit(2);
    }
  }

  const checkEnv = options.live
    ? {
        NEXUS_RELEASE_BASE_URL: target,
        PLAYWRIGHT_BASE_URL: target,
        NEXUS_PLAYWRIGHT_EXTERNAL_RUNTIME: "1",
      }
    : {};

  const checks = [];
  if (options.live) {
    const health = await checkTargetHealth(target);
    checks.push(health);
    if (!health.passed) {
      const result = classifyCp2LaunchGate({ checks, live: true });
      const report = {
        schemaVersion: 1,
        mode: "live",
        live: true,
        target,
        checks,
        result,
      };
      if (options.json) console.log(JSON.stringify(report, null, 2));
      else printHuman(report);
      process.exit(result.exitCode);
    }
  }

  checks.push(...runChecks(CP2_STATIC_CHECKS, checkEnv));
  if (checks.every((check) => check.passed) && options.live) {
    checks.push(...runChecks(CP2_LIVE_CHECKS, checkEnv));
  }

  const result = classifyCp2LaunchGate({ checks, live: options.live });
  const report = {
    schemaVersion: 1,
    mode: options.live ? "live" : "static",
    live: options.live,
    target,
    checks,
    result,
  };
  if (options.json) console.log(JSON.stringify(report, null, 2));
  else printHuman(report);
  process.exit(result.exitCode);
}

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) await main();
