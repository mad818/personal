#!/usr/bin/env node
/* eslint-disable no-console */

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function fail(message) {
  console.error(`x isolated-verification: ${message}`);
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

const runner = readRequired("scripts", "isolated-verify.mjs");
const runtime = readRequired(
  "scripts",
  "check-isolated-verification-runtime.mjs",
);
const spec = readRequired(
  "specs",
  "features",
  "no-mistakes-isolated-verification.md",
);
const todo = readRequired("tasks", "todo.md");
const gitignore = readRequired(".gitignore");
const packageJson = JSON.parse(readRequired("package.json"));
const matrix = JSON.parse(
  readRequired("docs", "ideas", "source-parity", "no-mistakes.json"),
);

for (const needle of [
  "parseIsolatedVerifyArgs",
  "buildIsolatedRunId",
  "resolveContainedWorktree",
  "findChangedPathOverlap",
  "classifyIsolatedOutcome",
  '["diff", "--cached", "--binary"]',
  '"worktree",\n      "add"',
  "const applyResult = runGit(",
  '"apply", "--index", "-"',
  '"worktree",\n        "remove"',
  '"npm.cmd run verify"',
  "git-with-acl-repair.ps1",
  'path.join(repoRoot, "node_modules")',
  "fs.unlinkSync(nodeModulesLink)",
  "const worktreeRemoved = !fs.existsSync(worktreePath)",
  'path.join(evidencePath, "receipt.json")',
  "storedVerbatim: false",
  'createHash("sha256").update(options.intent)',
  "remote push and CI confirmation remain explicit operator actions",
]) {
  requireText(runner, needle, "isolated verifier");
}

for (const forbidden of [
  "fetch(",
  "npm install",
  "npm ci",
  '["push"',
  '["rebase"',
  '["merge"',
  "create pull request",
  "auto-fix",
]) {
  forbidText(runner, forbidden, "isolated verifier");
}

for (const needle of [
  "No-Mistakes Isolated Verification",
  "exact staged binary diff",
  ".nexus/isolated-verification/",
  "Hash rather than store",
  "no auto-fix",
]) {
  requireText(spec, needle, "feature spec");
}
requireText(todo, "NO-MISTAKES-ISOLATED-VERIFICATION", "task queue");
requireText(runtime, "failed_cleanup", "runtime validator");
requireText(gitignore, ".worktrees/", ".gitignore");
requireText(gitignore, ".nexus/", ".gitignore");

const isolatedCapability = matrix.capabilities?.find(
  (item) => item.id === "disposable-worktree-isolation",
);
const evidenceCapability = matrix.capabilities?.find(
  (item) => item.id === "durable-run-evidence",
);
if (isolatedCapability?.disposition !== "adapted") {
  fail("disposable-worktree-isolation must be adapted");
}
if (evidenceCapability?.disposition !== "adapted") {
  fail("durable-run-evidence must be adapted");
}
for (const capability of [isolatedCapability, evidenceCapability]) {
  if (!capability.proof?.includes("scripts/isolated-verify.mjs")) {
    fail(`${capability.id} must cite the isolated verifier`);
  }
}

if (
  packageJson.scripts?.["verify:isolated"] !==
  "node scripts/isolated-verify.mjs"
) {
  fail("package.json is missing verify:isolated");
}
if (
  packageJson.scripts?.["verify:isolated:runtime:check"] !==
  "node scripts/check-isolated-verification-runtime.mjs"
) {
  fail("package.json is missing verify:isolated:runtime:check");
}
if (
  packageJson.scripts?.["verify:isolated:check"] !==
  "node scripts/validate-isolated-verification.mjs && npm run verify:isolated:runtime:check"
) {
  fail("package.json is missing verify:isolated:check");
}
requireText(
  packageJson.scripts?.verify ?? "",
  "npm run verify:isolated:check",
  "canonical verify",
);

console.log(
  "ok isolated-verification (fixed staged scope, contained worktree, local evidence, fail-closed cleanup)",
);
