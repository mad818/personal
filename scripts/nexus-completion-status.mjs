#!/usr/bin/env node
/* eslint-disable no-console */
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const metricsDir = join(root, "docs", "metrics");

function readJsonIfExists(relativePath) {
  const path = join(root, relativePath);
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}

function ghOpenAlertCount() {
  const result = spawnSync(
    "gh",
    ["api", "repos/mad818/personal/dependabot/alerts?state=open&per_page=5"],
    { encoding: "utf8", windowsHide: true },
  );
  if (result.status !== 0) return null;
  try {
    return JSON.parse(result.stdout).length;
  } catch {
    return null;
  }
}

function main() {
  const liveGate = readJsonIfExists("docs/metrics/cp2-operational-live-gate-latest.json");
  const webRehearsal = readJsonIfExists("docs/metrics/cp2-web-release-local-rehearsal-latest.json");
  const stagedRehearsal = readJsonIfExists("docs/metrics/cp2-staged-release-rehearsal-latest.json");
  const signingPreflight = readJsonIfExists("docs/metrics/desktop-signing-preflight-latest.json");
  const dependabotApply = readJsonIfExists("docs/metrics/dependabot-github-closure-apply.json");

  const operatorActions = [];

  if (!liveGate?.passed) {
    operatorActions.push("npm run cp2:operational:live-gate");
  }
  if (!stagedRehearsal?.stagedHostDetected) {
    operatorActions.push(
      "Set NEXUS_RELEASE_BASE_URL in .env.local, then npm run cp2:staged:release:rehearsal",
    );
  } else if (stagedRehearsal.blocked?.length) {
    operatorActions.push("Fix staged rehearsal blockers, then rerun cp2:staged:release:rehearsal");
  }
  if (!signingPreflight?.releaseReady) {
    operatorActions.push(
      "Set NEXUS_WINDOWS_SIGNING_THUMBPRINT (or macOS identity), then npm run desktop:signing:preflight",
    );
  }
  if (ghOpenAlertCount() > 0) {
    operatorActions.push("npm run dependabot:github:closure:apply");
  }
  operatorActions.push("git commit && git push (ship js-yaml@4.2.0 and wave 10–14 changes)");

  const report = {
    generatedAt: new Date().toISOString(),
    program: "nexus-completion-program-2026",
    assimilationWaves: "1-21 shipped; wave21 daily-use improvements",
    activeQueue: "drained",
    cp2: {
      localLaunchGate: liveGate?.passed ?? false,
      webLocalRehearsal: Boolean(webRehearsal?.dockerfilePresent),
      stagedRehearsalReady: Boolean(stagedRehearsal),
      stagedHostConfigured: stagedRehearsal?.stagedHostDetected ?? false,
      signingReleaseReady: signingPreflight?.releaseReady ?? false,
    },
    dependabot: {
      localClosureApplied: Boolean(dependabotApply),
      openAlertsOnGitHub: ghOpenAlertCount(),
    },
    deferredByPolicy: [
      "FREE-LOCAL-PHONE-ACCEPTANCE (physical phone/iPad)",
      "LOCAL-AI-OFFLINE-OPERATIONS (browser/phone receipt)",
      "MW6* ARPG production lane",
      "UXA3 worktree retirement",
    ],
    operatorActions,
  };

  mkdirSync(metricsDir, { recursive: true });
  const outPath = join(metricsDir, "nexus-completion-status-latest.json");
  writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  console.log("Nexus program completion status");
  console.log(`  Active queue: ${report.activeQueue}`);
  console.log(`  CP2 live gate: ${report.cp2.localLaunchGate ? "passed" : "missing"}`);
  console.log(
    `  Staged host: ${report.cp2.stagedHostConfigured ? "configured" : "not configured"}`,
  );
  console.log(
    `  Signing release-ready: ${report.cp2.signingReleaseReady ? "yes" : "no"}`,
  );
  console.log(
    `  Dependabot open alerts: ${
      report.dependabot.openAlertsOnGitHub === null
        ? "unknown (gh offline)"
        : report.dependabot.openAlertsOnGitHub
    }`,
  );
  console.log("");
  console.log("Operator actions:");
  for (const action of operatorActions) {
    console.log(`  - ${action}`);
  }
  console.log("");
  console.log(`Wrote ${outPath.replace(/\\/g, "/")}`);
  console.log("ok nexus-completion-status");
}

main();
