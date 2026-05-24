#!/usr/bin/env node
/* eslint-disable no-console */

import { spawnSync } from "node:child_process";

export const REPO_SYNC_STATUS_COMMANDS = {
  branch: "branch --show-current",
  lastCommit: "log -1 --oneline",
  status: "status --short --branch",
  upstream: "rev-parse --abbrev-ref --symbolic-full-name @{u}",
  aheadBehind: "rev-list --left-right --count @{u}...HEAD",
};

function runGit(args, options = {}) {
  return spawnSync("git", args, {
    encoding: "utf8",
    stdio: "pipe",
    windowsHide: true,
    ...options,
  });
}

function clean(value) {
  return String(value ?? "").trim();
}

function readGitLine(command) {
  const result = runGit(command.split(" "));
  if (result.status !== 0) return null;
  return clean(result.stdout).split(/\r?\n/)[0] ?? null;
}

function readStatusLines() {
  const result = runGit(["status", "--short", "--branch"]);
  if (result.status !== 0) {
    return {
      ok: false,
      lines: [],
      error: clean(result.stderr) || "git status failed",
    };
  }
  return {
    ok: true,
    lines: clean(result.stdout).split(/\r?\n/).filter(Boolean),
    error: null,
  };
}

function parseAheadBehind() {
  const result = runGit([
    "rev-list",
    "--left-right",
    "--count",
    "@{u}...HEAD",
  ]);
  if (result.status !== 0) {
    return { ahead: null, behind: null };
  }

  const [behindText, aheadText] = clean(result.stdout).split(/\s+/);
  return {
    ahead: Number.parseInt(aheadText ?? "0", 10),
    behind: Number.parseInt(behindText ?? "0", 10),
  };
}

function parseBranchLine(lines) {
  const branchLine = lines.find((line) => line.startsWith("## ")) ?? "";
  const cleaned = branchLine.replace(/^##\s+/, "");
  const [branchPart, trackingPart] = cleaned.split("...");
  return {
    branchFromStatus: branchPart || null,
    trackingPart: trackingPart || null,
  };
}

function describeWorkingTree(lines) {
  const changed = lines.filter((line) => !line.startsWith("## "));
  if (changed.length === 0) {
    return {
      label: "clean",
      detail: "No local working-tree changes detected.",
      changedCount: 0,
    };
  }
  return {
    label: "dirty",
    detail: `${changed.length} local changed file(s) need review before publishing.`,
    changedCount: changed.length,
  };
}

function getNextAction({ ahead, behind, workingTree }) {
  if (workingTree.changedCount > 0) {
    return "Review local changes, then stage/commit with npm run git:safe -- add and npm run git:safe -- commit.";
  }
  if ((behind ?? 0) > 0) {
    return "Run npm run handoff:pull when network access is available, then resolve any local divergence.";
  }
  if ((ahead ?? 0) > 0) {
    return "Local commits are ready to publish. From normal PowerShell, run npm run git:safe -- push.";
  }
  return "Local branch matches the last known upstream snapshot; run npm run handoff:pull at the start of the next session.";
}

const status = readStatusLines();

console.log("Nexus repo sync status");
console.log("No network calls are made. This command reads local Git metadata only.");
console.log("");

if (!status.ok) {
  console.log("Status: blocked");
  console.log(`Reason: ${status.error}`);
  console.log("Next action: run npm run repo:sync:health, then retry this command.");
  process.exit(0);
}

const branchLine = parseBranchLine(status.lines);
const branch = readGitLine(REPO_SYNC_STATUS_COMMANDS.branch) ?? branchLine.branchFromStatus ?? "unknown";
const upstream = readGitLine(REPO_SYNC_STATUS_COMMANDS.upstream) ?? "no upstream configured";
const lastCommit = readGitLine(REPO_SYNC_STATUS_COMMANDS.lastCommit) ?? "no commits found";
const counts = parseAheadBehind();
const workingTree = describeWorkingTree(status.lines);
const aheadLabel = counts.ahead === null ? "unknown" : String(counts.ahead);
const behindLabel = counts.behind === null ? "unknown" : String(counts.behind);
const nextAction = getNextAction({
  ahead: counts.ahead,
  behind: counts.behind,
  workingTree,
});

console.log(`Branch: ${branch}`);
console.log(`Upstream: ${upstream}`);
console.log(`Ahead: ${aheadLabel}`);
console.log(`Behind: ${behindLabel}`);
console.log(`Working tree: ${workingTree.label} - ${workingTree.detail}`);
console.log(`Last commit: ${lastCommit}`);
console.log("");
console.log(`Next action: ${nextAction}`);
console.log("");
console.log("Useful commands:");
console.log("  npm run repo:sync:health");
console.log("  npm run handoff:pull");
console.log("  npm run git:safe -- status --short --branch");
console.log("  npm run git:safe -- push");

process.exit(0);
