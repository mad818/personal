#!/usr/bin/env node
/* eslint-disable no-console */

import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { performance } from "node:perf_hooks";

function npmCheck(script) {
  if (process.platform === "win32") {
    return {
      command: process.env.ComSpec || "cmd.exe",
      args: ["/d", "/s", "/c", `npm.cmd run ${script}`],
    };
  }
  return {
    command: "npm",
    args: ["run", script],
  };
}

export const RELEASE_GATE_CHECKS = [
  {
    id: "diff-check",
    label: "Git whitespace and conflict markers",
    command: "git",
    args: ["diff", "--check"],
  },
  {
    id: "handoff",
    label: "Canonical handoff",
    ...npmCheck("handoff:check"),
  },
  {
    id: "operator-preflight",
    label: "Operator preflight",
    ...npmCheck("ops:preflight"),
  },
  {
    id: "full-verify",
    label: "Full Nexus verification",
    ...npmCheck("verify"),
    fullOnly: true,
  },
];

export class ReleaseGateUsageError extends Error {}

export function parseReleaseGateArgs(argv) {
  const options = {
    help: false,
    intent: null,
    json: false,
    quick: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") {
      options.help = true;
      continue;
    }
    if (arg === "--json") {
      options.json = true;
      continue;
    }
    if (arg === "--quick") {
      options.quick = true;
      continue;
    }
    if (arg === "--intent") {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) {
        throw new ReleaseGateUsageError("--intent requires a non-empty value");
      }
      options.intent = value.trim();
      index += 1;
      continue;
    }
    if (arg.startsWith("--intent=")) {
      options.intent = arg.slice("--intent=".length).trim();
      continue;
    }
    throw new ReleaseGateUsageError(`unknown option: ${arg}`);
  }

  if (!options.help && !options.intent) {
    throw new ReleaseGateUsageError("--intent is required");
  }

  return options;
}

function clean(value) {
  return String(value ?? "").trim();
}

export function sanitizeOutputLines(...values) {
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

function runCommand(command, args) {
  const startedAt = performance.now();
  const result = spawnSync(command, args, {
    encoding: "utf8",
    shell: false,
    stdio: "pipe",
    windowsHide: true,
  });

  return {
    status: result.status,
    passed: result.status === 0,
    durationMs: Math.round(performance.now() - startedAt),
    detailLines: sanitizeOutputLines(
      result.stdout,
      result.stderr,
      result.error ? String(result.error.message ?? result.error) : "",
    ),
  };
}

function readGitValue(args) {
  const result = readGit(args);
  return result.status === 0
    ? clean(result.stdout).split(/\r?\n/)[0] || null
    : null;
}

function readGit(args) {
  return spawnSync("git", args, {
    encoding: "utf8",
    shell: false,
    stdio: "pipe",
    windowsHide: true,
  });
}

export function collectGitState() {
  const branch = readGitValue(["branch", "--show-current"]);
  const upstream = readGitValue([
    "rev-parse",
    "--abbrev-ref",
    "--symbolic-full-name",
    "@{u}",
  ]);
  const statusResult = readGit(["status", "--porcelain=v1"]);
  const changedFiles =
    statusResult.status === 0
      ? clean(statusResult.stdout).split(/\r?\n/).filter(Boolean)
      : [];

  let ahead = null;
  let behind = null;
  if (upstream) {
    const counts = readGit(["rev-list", "--left-right", "--count", `${upstream}...HEAD`]);
    if (counts.status === 0) {
      const [behindText, aheadText] = clean(counts.stdout).split(/\s+/);
      behind = Number.parseInt(behindText ?? "", 10);
      ahead = Number.parseInt(aheadText ?? "", 10);
      if (!Number.isFinite(behind)) behind = null;
      if (!Number.isFinite(ahead)) ahead = null;
    }
  }

  return {
    branch,
    upstream,
    ahead,
    behind,
    dirty: changedFiles.length > 0,
    changedCount: changedFiles.length,
  };
}

function failedCheckIds(checks) {
  return checks.filter((check) => !check.passed).map((check) => check.id);
}

export function classifyReleaseReadiness({ checks, gitState, quick }) {
  const failed = failedCheckIds(checks);
  if (failed.length > 0) {
    return {
      outcome: "blocked_local_checks",
      exitCode: 1,
      readyForOperatorPush: false,
      blockers: failed.map((id) => `local_check_failed:${id}`),
      nextAction: "Fix the first failing local check, then rerun the release gate.",
    };
  }

  if (gitState.dirty) {
    return {
      outcome: "blocked_worktree",
      exitCode: 1,
      readyForOperatorPush: false,
      blockers: ["working_tree_not_clean"],
      nextAction: "Review and commit the intended files, then rerun the release gate.",
    };
  }

  if (!gitState.upstream || gitState.ahead === null || gitState.behind === null) {
    return {
      outcome: "blocked_unknown_upstream",
      exitCode: 1,
      readyForOperatorPush: false,
      blockers: ["upstream_state_unknown"],
      nextAction: "Repair or refresh the upstream configuration, then rerun the gate.",
    };
  }

  if (gitState.behind > 0) {
    return {
      outcome: "blocked_upstream_divergence",
      exitCode: 1,
      readyForOperatorPush: false,
      blockers: ["cached_upstream_has_newer_commits"],
      nextAction: "Pull with the repository handoff command, reconcile safely, and rerun the gate.",
    };
  }

  if (quick) {
    return {
      outcome: "quick_checks_passed",
      exitCode: 0,
      readyForOperatorPush: false,
      blockers: ["full_verification_not_run", "remote_ci_confirmation_required"],
      nextAction: "Run the full release gate before publishing.",
    };
  }

  const hasCommitsToPublish = gitState.ahead > 0;
  return {
    outcome: "checks_passed_local",
    exitCode: 0,
    readyForOperatorPush: hasCommitsToPublish,
    blockers: hasCommitsToPublish
      ? ["remote_push_required", "remote_ci_confirmation_required"]
      : ["remote_ci_confirmation_required"],
    nextAction: hasCommitsToPublish
      ? "Publish manually with the repository safe Git wrapper, then confirm GitHub CI."
      : "Refresh remote state when network access is available and confirm GitHub CI.",
  };
}

function runReleaseChecks(quick) {
  const checks = [];
  for (const check of RELEASE_GATE_CHECKS) {
    if (check.fullOnly && quick) continue;
    const result = runCommand(check.command, check.args);
    checks.push({
      id: check.id,
      label: check.label,
      ...result,
    });
    if (!result.passed) break;
  }
  return checks;
}

function printUsage() {
  console.log("Nexus release gate");
  console.log("");
  console.log('Usage: npm run release:gate -- --intent "operator objective" [--quick] [--json]');
  console.log("");
  console.log("The gate is local and read-only. It never pushes, opens a PR, edits files, or starts services.");
}

function printHuman(report) {
  console.log("Nexus release gate");
  console.log("Local checks only. No files, services, remotes, pull requests, or CI state are changed.");
  console.log(`Mode: ${report.mode}`);
  console.log(`Intent received: yes (${report.intentCharacters} characters; content not printed or stored)`);
  console.log("");

  for (const check of report.checks) {
    const status = check.passed ? "OK" : "FAIL";
    console.log(`[${status}] ${check.label} (${(check.durationMs / 1000).toFixed(1)}s)`);
    if (!check.passed) {
      for (const line of check.detailLines) console.log(`  ${line}`);
    }
  }

  console.log("");
  console.log(`Branch: ${report.git.branch ?? "unknown"}`);
  console.log(`Upstream: ${report.git.upstream ?? "unknown"}`);
  console.log(`Cached ahead/behind: ${report.git.ahead ?? "unknown"}/${report.git.behind ?? "unknown"}`);
  console.log(`Working tree: ${report.git.dirty ? `dirty (${report.git.changedCount})` : "clean"}`);
  console.log(`Outcome: ${report.result.outcome}`);
  console.log(`Ready for operator push: ${report.result.readyForOperatorPush}`);
  if (report.result.blockers.length) {
    console.log(`Remaining/manual blockers: ${report.result.blockers.join(", ")}`);
  }
  console.log(`Next action: ${report.result.nextAction}`);
}

async function main() {
  let options;
  try {
    options = parseReleaseGateArgs(process.argv.slice(2));
  } catch (error) {
    console.error(`release-gate: ${error instanceof Error ? error.message : String(error)}`);
    printUsage();
    process.exit(2);
  }

  if (options.help) {
    printUsage();
    process.exit(0);
  }

  const checks = runReleaseChecks(options.quick);
  const gitState = collectGitState();
  const result = classifyReleaseReadiness({
    checks,
    gitState,
    quick: options.quick,
  });
  const report = {
    schemaVersion: 1,
    mode: options.quick ? "quick" : "full",
    intentPresent: true,
    intentCharacters: options.intent.length,
    checks,
    git: gitState,
    result,
  };

  if (options.json) console.log(JSON.stringify(report, null, 2));
  else printHuman(report);
  process.exit(result.exitCode);
}

const isMain =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) await main();
