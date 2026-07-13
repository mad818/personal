#!/usr/bin/env node
/* eslint-disable no-console */

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function fail(message) {
  console.error(`x nexus-release-gate: ${message}`);
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

const spec = readRequired("specs", "features", "no-mistakes-release-gate.md");
const runner = readRequired("scripts", "nexus-release-gate.mjs");
const runtime = readRequired("scripts", "check-nexus-release-gate-runtime.mjs");
const matrixText = readRequired(
  "docs",
  "ideas",
  "source-parity",
  "no-mistakes.json",
);
const context = readRequired(
  "docs",
  "ideas",
  "repo-analysis",
  "no-mistakes",
  "REPO_CONTEXT.md",
);
const todo = readRequired("tasks", "todo.md");
const prePush = readRequired(".husky", "pre-push");
const packageJson = JSON.parse(readRequired("package.json"));
const matrix = JSON.parse(matrixText);

for (const needle of [
  "NO-MISTAKES-RELEASE-GATE",
  "read-only release gate",
  "--intent",
  "--quick",
  "never printed verbatim",
]) {
  requireText(spec, needle, "feature spec");
}

for (const needle of [
  "RELEASE_GATE_CHECKS",
  "parseReleaseGateArgs",
  "classifyReleaseReadiness",
  "collectGitState",
  'args: ["run", "verify"]',
  "intentCharacters",
  "remote_ci_confirmation_required",
  "readyForOperatorPush",
  "shell: false",
]) {
  requireText(runner, needle, "release gate runner");
}

for (const forbidden of [
  "writeFile",
  "appendFile",
  "rmSync",
  "unlinkSync",
  "fetch(",
  "Start-Process",
  'readGit(["push"]',
  'readGit(["rebase"]',
  'readGit(["merge"]',
]) {
  forbidText(runner, forbidden, "release gate runner");
}

requireText(runtime, "checks_passed_local", "runtime validator");
requireText(runtime, "blocked_worktree", "runtime validator");
requireText(runtime, "blocked_unknown_upstream", "runtime validator");
requireText(context, "disposable worktree", "repo context");
requireText(todo, "NO-MISTAKES-RELEASE-GATE", "todo queue");
requireText(prePush, "npm run release:gate:check", "pre-push hook");

if (matrix.status !== "in_progress") fail("source parity status must remain in_progress");
if (matrix.source?.version !== "v1.34.0") fail("source parity must pin v1.34.0");
if (!matrix.capabilities?.some((item) => item.disposition === "pending")) {
  fail("source parity must preserve useful pending capabilities");
}

if (packageJson.scripts?.["release:gate"] !== "node scripts/nexus-release-gate.mjs") {
  fail("package.json is missing release:gate");
}
if (
  packageJson.scripts?.["release:gate:runtime:check"] !==
  "node scripts/check-nexus-release-gate-runtime.mjs"
) {
  fail("package.json is missing release:gate:runtime:check");
}
if (
  packageJson.scripts?.["release:gate:check"] !==
  "node scripts/validate-nexus-release-gate.mjs && npm run release:gate:runtime:check"
) {
  fail("package.json is missing release:gate:check");
}
requireText(
  packageJson.scripts?.verify ?? "",
  "npm run release:gate:check",
  "verify script",
);

console.log("ok nexus-release-gate");
