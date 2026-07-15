#!/usr/bin/env node
/* eslint-disable no-console */

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function fail(message) {
  console.error(`x cp2-launch-gate: ${message}`);
  process.exit(1);
}

function readRequired(...parts) {
  const filePath = path.join(root, ...parts);
  if (!fs.existsSync(filePath)) fail(`${parts.join("/")} is missing`);
  return fs.readFileSync(filePath, "utf8");
}

function requireText(source, needle, label) {
  if (!source.includes(needle)) fail(`${label} is missing ${needle}`);
}

function forbidText(source, needle, label) {
  if (source.includes(needle)) fail(`${label} must not include ${needle}`);
}

const spec = readRequired(
  "specs",
  "features",
  "cp2-launch-gate-contract-repair.md",
);
const runner = readRequired("scripts", "cp2-launch-gate.mjs");
const runtime = readRequired("scripts", "check-cp2-launch-gate-runtime.mjs");
const operationalWrapper = readRequired(
  "scripts",
  "cp2-operational-live-gate.mjs",
);
const playwright = readRequired("playwright.auth.config.ts");
const checklist = readRequired(
  "docs",
  "deployment",
  "release-readiness-checklist.md",
);
const todo = readRequired("tasks", "todo.md");
const packageJson = JSON.parse(readRequired("package.json"));

for (const needle of [
  "CP2.4 Launch Gate Contract Repair",
  "operator-managed runtime",
  "No runtime or service auto-start",
  "Static mode never claims live-target acceptance",
]) {
  requireText(spec, needle, "feature spec");
}

for (const needle of [
  "CP2_STATIC_CHECKS",
  "CP2_LIVE_CHECKS",
  'script: "release:gate"',
  'script: "eval:agent-runtime:ci"',
  'script: "route:integrity"',
  'script: "release:smoke"',
  'script: "auth:e2e"',
  "normalizeCp2TargetUrl",
  "checkTargetHealth",
  "NEXUS_PLAYWRIGHT_EXTERNAL_RUNTIME",
  "remote_ci_confirmation_required",
  "promotion_rollback_record_required",
  "shell: false",
]) {
  requireText(runner, needle, "launch gate runner");
}

for (const forbidden of [
  "writeFile",
  "appendFile",
  "mkdirSync",
  "rmSync",
  "unlinkSync",
  "Start-Process",
  "runtime:launch:3100",
  "shell: true",
  "git push",
  "createPullRequest",
]) {
  forbidText(runner, forbidden, "launch gate runner");
}

requireText(runtime, "static_checks_passed", "runtime validator");
requireText(runtime, "target_checks_passed", "runtime validator");
requireText(runtime, "--skip-verify", "runtime validator");
requireText(
  operationalWrapper,
  'includes("Outcome: target_checks_passed")',
  "operational compatibility wrapper",
);
forbidText(
  operationalWrapper,
  "ok cp2-local-launch-gate",
  "operational compatibility wrapper",
);
requireText(
  playwright,
  'process.env.NEXUS_PLAYWRIGHT_EXTERNAL_RUNTIME === "1"',
  "Playwright config",
);
requireText(
  playwright,
  "webServer: externalRuntime",
  "Playwright config",
);
requireText(playwright, "? undefined", "Playwright external-runtime branch");
requireText(checklist, "npm run cp2:launch:gate", "release checklist");
requireText(todo, "CP2.4 — Final launch gate", "task queue");
requireText(
  todo,
  "cp2-launch-gate-contract-repair.md",
  "task queue design link",
);

const expectedScripts = {
  "cp2:launch:gate": "node scripts/cp2-launch-gate.mjs",
  "cp2:launch:runtime:check":
    "node scripts/check-cp2-launch-gate-runtime.mjs",
  "cp2:launch:check":
    "node scripts/validate-cp2-launch-gate.mjs && npm run cp2:launch:runtime:check",
  "cp2:local:launch-gate": "npm run cp2:launch:gate -- --live",
  "launch:gate:target": "npm run cp2:launch:gate -- --live",
  "cp2:operational:live-gate": "node scripts/cp2-operational-live-gate.mjs",
  "cp2:live:preflight": "node scripts/cp2-live-launch-preflight.mjs",
  "cp2:web:release:local-rehearsal":
    "node scripts/cp2-web-release-local-rehearsal.mjs",
  "cp2:staged:release:rehearsal":
    "node scripts/cp2-staged-release-rehearsal.mjs",
};

for (const [name, command] of Object.entries(expectedScripts)) {
  if (packageJson.scripts?.[name] !== command) {
    fail(`package.json ${name} must equal ${command}`);
  }
}
requireText(
  packageJson.scripts?.verify ?? "",
  "npm run cp2:launch:check",
  "verify script",
);

console.log("ok cp2-launch-gate");
