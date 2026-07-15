#!/usr/bin/env node
/* eslint-disable no-console */

import path from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";
import {
  ROUTE_POLICIES,
  isRouteAllowedInMode,
} from "../lib/security/routePolicy.ts";
import { buildSecureRuntimeProfile } from "./secure-runtime-gate.mjs";

const HEALTH_TIMEOUT_MS = 5_000;
const INTERNAL_AUTH_HEADER = "x-nexus-internal-auth";
const FIXTURE_TOKEN = "desktop-isolation-static-fixture-token-1234567890";

export class DesktopIsolationUsageError extends Error {}

export function parseDesktopIsolationArgs(argv) {
  const options = { help: false, json: false, live: false };
  for (const arg of argv) {
    if (arg === "--help" || arg === "-h") options.help = true;
    else if (arg === "--json") options.json = true;
    else if (arg === "--live") options.live = true;
    else throw new DesktopIsolationUsageError(`unknown option: ${arg}`);
  }
  return options;
}

export function normalizeDesktopIsolationTarget(value) {
  const raw = String(value ?? "").trim();
  if (!raw) {
    throw new DesktopIsolationUsageError(
      "--live requires NEXUS_RELEASE_BASE_URL",
    );
  }

  let target;
  try {
    target = new URL(raw);
  } catch {
    throw new DesktopIsolationUsageError(
      "NEXUS_RELEASE_BASE_URL must be a valid http(s) URL",
    );
  }
  if (!["http:", "https:"].includes(target.protocol)) {
    throw new DesktopIsolationUsageError(
      "NEXUS_RELEASE_BASE_URL must use http or https",
    );
  }
  if (target.username || target.password) {
    throw new DesktopIsolationUsageError(
      "NEXUS_RELEASE_BASE_URL must not contain credentials",
    );
  }
  if (
    (target.pathname && target.pathname !== "/") ||
    target.search ||
    target.hash
  ) {
    throw new DesktopIsolationUsageError(
      "NEXUS_RELEASE_BASE_URL must be an origin without a path, query, or fragment",
    );
  }
  return target.origin;
}

export function buildStaticIsolationEvidence() {
  const profile = buildSecureRuntimeProfile({
    profile: "local",
    token: FIXTURE_TOKEN,
    port: "3100",
  });

  const policyCounts = {
    local_only: 0,
    connector_opt_in: 0,
    high_risk: 0,
  };
  const policyFailures = [];

  for (const policy of ROUTE_POLICIES) {
    policyCounts[policy.routeClass] += 1;
    const allowed = isRouteAllowedInMode(policy.routeClass, "isolated", true);
    const expected = policy.routeClass === "local_only";
    if (allowed !== expected) {
      policyFailures.push({
        prefix: policy.prefix,
        routeClass: policy.routeClass,
        expectedAllowed: expected,
        actualAllowed: allowed,
      });
    }
  }

  const profileChecks = {
    loopbackBound: profile.host === "127.0.0.1",
    isolatedMode: profile.env.NEXUS_NETWORK_MODE === "isolated",
    paidApisBlocked: profile.env.NEXUS_ALLOW_PAID_APIS === "false",
    highRiskToolsDisabled: profile.env.NEXUS_ENABLE_HIGH_RISK_TOOLS === "false",
    highRiskWritesRequireApproval:
      profile.env.NEXUS_HIGH_RISK_WRITES_REQUIRE_APPROVAL === "true",
    phoneLanDisabled: profile.env.NEXUS_PHONE_LAN_ENABLED === "false",
  };
  const staticReady =
    Object.values(profileChecks).every(Boolean) && policyFailures.length === 0;

  return {
    staticReady,
    profileChecks,
    policyCounts,
    policyTotal: ROUTE_POLICIES.length,
    blockedConnectorPolicies:
      policyCounts.connector_opt_in + policyCounts.high_risk,
    policyFailures,
    claimBoundary:
      "Application route policy only; OS-level no-outbound behavior is not proven.",
  };
}

export function evaluateLiveIsolationStatus(payload) {
  const summary = payload?.summary ?? {};
  const policies = payload?.readiness?.policies ?? {};
  const checks = {
    statusOk: payload?.status === "ok",
    desktopSecureProfile:
      summary?.release?.deploymentProfile === "desktop-secure",
    isolatedMode: summary?.networkMode === "isolated",
    paidApisBlocked: summary?.allowPaidApis === false,
    highRiskRoutesDisabled: summary?.highRiskRoutesEnabled === false,
    tokenConfigured: summary?.tokenConfigured === true,
    strictToolPolicy: policies?.toolPolicyMode === "strict",
    highRiskWritesRequireApproval:
      policies?.highRiskWritesRequireApproval === true,
  };
  return {
    ready: Object.values(checks).every(Boolean),
    checks,
  };
}

export function classifyDesktopIsolationStatus({
  staticEvidence,
  liveEvidence,
}) {
  const remainingBlockers = [
    "packaged_desktop_shell_evidence_required",
    "os_no_outbound_capture_required",
  ];

  if (!staticEvidence.staticReady) {
    return {
      outcome: "blocked_static_isolation_contract",
      exitCode: 1,
      cp22Complete: false,
      blockers: ["static_isolation_contract_failed", ...remainingBlockers],
      nextAction:
        "Repair the secure profile or route-policy contradiction, then rerun the static status command.",
    };
  }

  if (liveEvidence === null) {
    return {
      outcome: "static_ready_live_app_proof_pending",
      exitCode: 0,
      cp22Complete: false,
      blockers: ["live_app_isolation_not_run", ...remainingBlockers],
      nextAction:
        "Start the desktop-secure runtime, export NEXUS_RELEASE_BASE_URL and NEXUS_TOKEN, then rerun with --live.",
    };
  }

  if (!liveEvidence.ready) {
    return {
      outcome: "blocked_live_app_isolation",
      exitCode: 1,
      cp22Complete: false,
      blockers: ["live_app_isolation_failed", ...remainingBlockers],
      nextAction:
        "Restore the desktop-secure isolated profile, restart the runtime, and rerun live status.",
    };
  }

  return {
    outcome: "live_app_isolation_passed_packaged_proof_pending",
    exitCode: 0,
    cp22Complete: false,
    blockers: remainingBlockers,
    nextAction:
      "Capture packaged desktop-shell and OS-level no-outbound evidence before closing CP2.2.",
  };
}

async function fetchLiveIsolationStatus(baseUrl, token) {
  const health = await fetch(`${baseUrl}/api/health`, {
    redirect: "manual",
    signal: AbortSignal.timeout(HEALTH_TIMEOUT_MS),
  });
  if (!health.ok) {
    throw new Error(`/api/health returned HTTP ${health.status}`);
  }

  const status = await fetch(`${baseUrl}/api/status`, {
    headers: { [INTERNAL_AUTH_HEADER]: token },
    redirect: "manual",
    signal: AbortSignal.timeout(HEALTH_TIMEOUT_MS),
  });
  if (!status.ok) {
    throw new Error(`/api/status returned HTTP ${status.status}`);
  }
  try {
    return evaluateLiveIsolationStatus(await status.json());
  } catch {
    throw new Error("/api/status did not return valid JSON");
  }
}

function printUsage() {
  console.log("Desktop isolation status");
  console.log("");
  console.log("Usage: npm run desktop:isolation:status -- [--live] [--json]");
  console.log("");
  console.log("Static mode reads no env file and makes no network request.");
  console.log(
    "Live mode reads an existing local env configuration and calls only /api/health and protected /api/status.",
  );
}

function printHuman(report) {
  console.log("Desktop isolation status");
  console.log(
    "Read-only application-policy evidence. No connector is called and no OS-level no-outbound claim is made.",
  );
  console.log(`Mode: ${report.mode}`);
  if (report.target) {
    console.log(`Target: ${report.target}`);
    console.log("Token configured: yes (value not printed)");
  }
  console.log("");
  console.log(
    `Static secure profile: ${report.static.staticReady ? "ready" : "failed"}`,
  );
  console.log(
    `Policy inventory: ${report.static.policyTotal} total; ${report.static.policyCounts.local_only} local-only; ${report.static.policyCounts.connector_opt_in} connector; ${report.static.policyCounts.high_risk} high-risk`,
  );
  console.log(
    `Denied in isolated mode: ${report.static.blockedConnectorPolicies} connector/high-risk policies`,
  );
  if (report.live) {
    console.log(
      `Live application posture: ${report.live.ready ? "ready" : "failed"}`,
    );
    for (const [name, passed] of Object.entries(report.live.checks)) {
      console.log(`  ${passed ? "[OK]" : "[FAIL]"} ${name}`);
    }
  }
  console.log("");
  console.log(`Outcome: ${report.result.outcome}`);
  console.log(`CP2.2 complete: ${report.result.cp22Complete}`);
  console.log(`Remaining blockers: ${report.result.blockers.join(", ")}`);
  console.log(`Next action: ${report.result.nextAction}`);
}

async function main() {
  let options;
  try {
    options = parseDesktopIsolationArgs(process.argv.slice(2));
  } catch (error) {
    console.error(
      `desktop-isolation-status: ${error instanceof Error ? error.message : String(error)}`,
    );
    printUsage();
    process.exit(2);
  }

  if (options.help) {
    printUsage();
    process.exit(0);
  }

  const staticEvidence = buildStaticIsolationEvidence();
  let target = null;
  let liveEvidence = null;

  if (options.live) {
    loadEnv({ path: ".env.local", override: false, quiet: true });
    try {
      target = normalizeDesktopIsolationTarget(
        process.env.NEXUS_RELEASE_BASE_URL,
      );
      const token = process.env.NEXUS_TOKEN?.trim();
      if (!token) {
        throw new DesktopIsolationUsageError("--live requires NEXUS_TOKEN");
      }
      liveEvidence = await fetchLiveIsolationStatus(target, token);
    } catch (error) {
      if (error instanceof DesktopIsolationUsageError) {
        console.error(`desktop-isolation-status: ${error.message}`);
        process.exit(2);
      }
      liveEvidence = {
        ready: false,
        checks: {
          targetReachableAndAuthenticated: false,
        },
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  const result = classifyDesktopIsolationStatus({
    staticEvidence,
    liveEvidence,
  });
  const report = {
    schemaVersion: 1,
    mode: options.live ? "live" : "static",
    target,
    static: staticEvidence,
    live: liveEvidence,
    result,
  };

  if (options.json) console.log(JSON.stringify(report, null, 2));
  else {
    printHuman(report);
    if (liveEvidence?.error) console.log(`Live detail: ${liveEvidence.error}`);
  }
  process.exit(result.exitCode);
}

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) await main();
