#!/usr/bin/env node
/* eslint-disable no-console */

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function fail(message) {
  console.error(`x repo-sync-status: ${message}`);
  process.exit(1);
}

function readRequired(...parts) {
  const filePath = path.join(root, ...parts);
  if (!fs.existsSync(filePath)) {
    fail(`${parts.join("/")} is missing`);
  }
  return fs.readFileSync(filePath, "utf8");
}

function assertIncludes(source, needle, label) {
  if (!source.includes(needle)) {
    fail(`${label} is missing ${needle}`);
  }
}

function assertExcludes(source, needle, label) {
  if (source.includes(needle)) {
    fail(`${label} must not include ${needle}`);
  }
}

const spec = readRequired("specs", "features", "repo-sync-status-summary.md");
const runner = readRequired("scripts", "repo-sync-status.mjs");
const gitSafeWrapper = readRequired("scripts", "git-with-acl-repair.ps1");
const gitRecoveryRunbook = readRequired(
  "docs",
  "repo-hygiene",
  "git-permission-recovery.md",
);
const packageJsonText = readRequired("package.json");
const packageJson = JSON.parse(packageJsonText);

assertIncludes(spec, "REPO-SYNC-STATUS-SUMMARY", "feature spec");
assertIncludes(runner, "REPO_SYNC_STATUS_COMMANDS", "repo sync status runner");
assertIncludes(runner, "status --short --branch", "repo sync status runner");
assertIncludes(runner, "rev-list --left-right --count", "repo sync status runner");
assertIncludes(runner, "branch --show-current", "repo sync status runner");
assertIncludes(runner, "log -1 --oneline", "repo sync status runner");
assertIncludes(runner, "npm run git:safe -- push", "repo sync status runner");
assertIncludes(runner, "npm run handoff:pull", "repo sync status runner");
assertIncludes(runner, "No network calls are made", "repo sync status runner");
assertIncludes(runner, "process.exit(0)", "repo sync status runner");
assertIncludes(
  gitSafeWrapper,
  "$GitArgs = @($args)",
  "git safe wrapper",
);
assertIncludes(gitSafeWrapper, "Remove-KnownGitDenyAcl", "git safe wrapper");
assertIncludes(gitSafeWrapper, "& git @GitArgs", "git safe wrapper");

for (const knownDenySid of [
  "S-1-5-21-779443000-71960511-1366699174-2556294504",
  "S-1-5-21-1768906453-2027885692-4155740187-81600975",
]) {
  assertIncludes(gitSafeWrapper, knownDenySid, "git safe wrapper");
  assertIncludes(gitRecoveryRunbook, knownDenySid, "git recovery runbook");
}

for (const unsafe of [
  "fetch(",
  "github.com",
  "git fetch",
  "git pull",
  "git push",
  "reset --hard",
  "checkout --",
  ".env.local",
  "NEXUS_TOKEN",
  "process.env",
]) {
  assertExcludes(runner, unsafe, "repo sync status runner");
}

if (packageJson.scripts?.["repo:sync:status"] !== "node scripts/repo-sync-status.mjs") {
  fail("package.json is missing repo:sync:status");
}

if (
  packageJson.scripts?.["repo:sync:status:check"] !==
  "node scripts/validate-repo-sync-status.mjs"
) {
  fail("package.json is missing repo:sync:status:check");
}

assertIncludes(
  packageJson.scripts?.["git:safe"] ?? "",
  "scripts/git-with-acl-repair.ps1",
  "git safe package script",
);

assertIncludes(
  packageJson.scripts?.verify ?? "",
  "npm run repo:sync:status:check",
  "verify script",
);

console.log("ok repo-sync-status");
