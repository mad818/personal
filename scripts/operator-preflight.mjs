#!/usr/bin/env node
/* eslint-disable no-console */

import { spawnSync } from "node:child_process";
import { performance } from "node:perf_hooks";

const npmCommand = "npm";

export const OPERATOR_PREFLIGHT_CHECKS = [
  {
    id: "handoff",
    label: "Handoff mirrors",
    script: "handoff:check",
    recovery: "Run npm run handoff:write, then rerun this preflight.",
  },
  {
    id: "offline-local",
    label: "Free local readiness wiring",
    script: "offline:local:check",
    recovery: "Fix the local/offline readiness contract before phone acceptance.",
  },
  {
    id: "phone-access",
    label: "Phone access posture",
    script: "phone:access:check",
    recovery: "Repair phone access docs, PWA, or protected route posture.",
  },
  {
    id: "phone-lan",
    label: "Phone LAN and receipt lane",
    script: "phone:lan:check",
    recovery: "Repair phone LAN, QR, receipt, or capture wiring.",
  },
  {
    id: "publication-safety",
    label: "Publication safety",
    script: "publication:safety:check",
    recovery: "Remove private paths, key material, or raw local proof before publishing.",
  },
  {
    id: "security",
    label: "Static security scan",
    script: "security-scan",
    recovery: "Fix critical/high scanner findings before using this build.",
  },
];

function normalizeLines(value) {
  return String(value ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !line.startsWith("> "))
    .filter((line) => !line.startsWith("npm warn config production"));
}

function summarizeOutput(stdout, stderr, error) {
  if (error) return `Spawn failed: ${error}`;
  const lines = [...normalizeLines(stdout), ...normalizeLines(stderr)];
  return lines.at(-1) ?? "No output captured.";
}

function tailOutput(stdout, stderr, error) {
  if (error) return [`Spawn failed: ${error}`];
  const lines = [...normalizeLines(stdout), ...normalizeLines(stderr)];
  return lines.slice(-12);
}

function runCheck(check) {
  const startedAt = performance.now();
  const result = spawnSync(`${npmCommand} run ${check.script}`, {
    encoding: "utf8",
    shell: true,
    stdio: "pipe",
    windowsHide: true,
  });
  const durationMs = Math.round(performance.now() - startedAt);
  const passed = result.status === 0;
  const error = result.error ? String(result.error.message ?? result.error) : null;

  return {
    ...check,
    durationMs,
    passed,
    status: result.status,
    summary: summarizeOutput(result.stdout, result.stderr, error),
    detailLines: tailOutput(result.stdout, result.stderr, error),
  };
}

function printResult(result) {
  const status = result.passed ? "OK" : "FAIL";
  const seconds = (result.durationMs / 1000).toFixed(1);
  console.log(`[${status}] ${result.label} (${seconds}s) - ${result.summary}`);
}

console.log("Nexus operator preflight");
console.log("Running local checks only. No services are started and no proof files are written.");
console.log("");

const results = OPERATOR_PREFLIGHT_CHECKS.map(runCheck);
for (const result of results) printResult(result);

const failures = results.filter((result) => !result.passed);
const hasFailures = failures.length > 0;

console.log("");
if (hasFailures) {
  console.log(`Preflight blocked: ${failures.length} check(s) failed.`);
  for (const failure of failures) {
    console.log("");
    console.log(`${failure.label}:`);
    console.log(`Next action: ${failure.recovery}`);
    if (failure.detailLines.length) {
      console.log("Last output:");
      for (const line of failure.detailLines) console.log(`  ${line}`);
    }
  }
} else {
  console.log("Preflight ready: local checks passed.");
  console.log(
    "Physical phone/iPad acceptance remains manual: scan/open HQ, log in, send ping, ask one local AI prompt, install the PWA, then rerun capture until acceptance is true.",
  );
}

process.exit(hasFailures ? 1 : 0);
