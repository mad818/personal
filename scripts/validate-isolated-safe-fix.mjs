#!/usr/bin/env node
/* eslint-disable no-console */

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function fail(message) {
  console.error(`x isolated-safe-fix: ${message}`);
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

const runner = readRequired("scripts", "isolated-safe-fix.mjs");
const runtime = readRequired("scripts", "check-isolated-safe-fix-runtime.mjs");
const spec = readRequired(
  "specs",
  "features",
  "no-mistakes-isolated-safe-fixes.md",
);
const todo = readRequired("tasks", "todo.md");
const gitignore = readRequired(".gitignore");
const packageJson = JSON.parse(readRequired("package.json"));
const matrix = JSON.parse(
  readRequired("docs", "ideas", "source-parity", "no-mistakes.json"),
);

for (const needle of [
  "parseIsolatedSafeFixArgs",
  "classifyEligibleSafeFixPath",
  "resolveContainedFixWorktree",
  "findUnexpectedFixPaths",
  "findChangedPathOverlap",
  "classifySafeFixOutcome",
  "applyProvenFixPatch",
  "--apply is required",
  '["diff", "--cached", "--binary"]',
  '"--diff-filter=M"',
  '"worktree",\n      "add"',
  '"apply", "--index", "-"',
  '"prettier.cjs"',
  '"--write"',
  '"--ignore-unknown"',
  '["format-check", "format:check", "formatCheck"]',
  '["type-check", "type-check", "typeCheck"]',
  '["lint", "lint", "lint"]',
  '"apply", "--index", "--whitespace=nowarn", "-"',
  '"apply", "-R", "--index", "--whitespace=nowarn", "-"',
  "snapshotUnchanged",
  "postconditionPassed",
  "fs.unlinkSync(nodeModulesLink)",
  '"worktree",\n        "remove"',
  "storedVerbatim: false",
  "exactPathsStored: false",
  'path.join(evidencePath, "receipt.json")',
  "contentStored: false",
  "git-with-acl-repair.ps1",
]) {
  requireText(runner, needle, "isolated safe-fix runner");
}

for (const forbidden of [
  "fetch(",
  "npm install",
  "npm ci",
  '["push"',
  '["pull"',
  '["rebase"',
  '["merge"',
  "child_process.exec(",
  "shell: true",
]) {
  forbidText(runner, forbidden, "isolated safe-fix runner");
}

for (const needle of [
  "No-Mistakes Isolated Safe Fixes",
  "explicit `--apply`",
  "zero staged/unstaged path",
  "run the fixed format, type-check, and lint gates",
  "reverse the exact mechanical patch",
  ".nexus/isolated-fixes/",
  "no file names",
  "does not accept arbitrary commands",
]) {
  requireText(spec, needle, "feature spec");
}
requireText(todo, "NO-MISTAKES-ISOLATED-SAFE-FIXES", "task queue");
requireText(runtime, "unrelated dirty work", "runtime validator");
requireText(
  runtime,
  "sourceApplication.postconditionPassed",
  "runtime validator",
);
requireText(gitignore, ".worktrees/", ".gitignore");
requireText(gitignore, ".nexus/", ".gitignore");

const safeFixCapability = matrix.capabilities?.find(
  (item) => item.id === "safe-mechanical-auto-fixes",
);
if (safeFixCapability?.disposition !== "adapted") {
  fail("safe-mechanical-auto-fixes must be adapted");
}
for (const proof of [
  "scripts/isolated-safe-fix.mjs",
  "scripts/check-isolated-safe-fix-runtime.mjs",
  "specs/features/no-mistakes-isolated-safe-fixes.md",
]) {
  if (!safeFixCapability.proof?.includes(proof)) {
    fail(`safe-mechanical-auto-fixes must cite ${proof}`);
  }
}
if (matrix.status !== "complete") {
  fail("no-mistakes source parity must be complete");
}
if (
  matrix.capabilities.some((capability) => capability.disposition === "pending")
) {
  fail("no-mistakes source parity must have no pending capabilities");
}

const expectedScripts = {
  "verify:isolated:fix": "node scripts/isolated-safe-fix.mjs",
  "verify:isolated:fix:runtime:check":
    "node scripts/check-isolated-safe-fix-runtime.mjs",
  "verify:isolated:fix:check":
    "node scripts/validate-isolated-safe-fix.mjs && npm run verify:isolated:fix:runtime:check",
};
for (const [name, expected] of Object.entries(expectedScripts)) {
  if (packageJson.scripts?.[name] !== expected) {
    fail(`package.json ${name} must equal ${expected}`);
  }
}
requireText(
  packageJson.scripts?.verify ?? "",
  "npm run verify:isolated:fix:check",
  "canonical verify",
);

console.log(
  "ok isolated-safe-fix (explicit staged-only formatter, isolated proof, snapshot lock, rollback, content-free evidence)",
);
