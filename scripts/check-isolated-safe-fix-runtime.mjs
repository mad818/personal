#!/usr/bin/env node
/* eslint-disable no-console */

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import {
  IsolatedSafeFixUsageError,
  applyProvenFixPatch,
  buildSafeFixRunId,
  classifyEligibleSafeFixPath,
  classifySafeFixOutcome,
  findChangedPathOverlap,
  findUnexpectedFixPaths,
  parseIsolatedSafeFixArgs,
  resolveContainedFixWorktree,
} from "./isolated-safe-fix.mjs";

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

const parsed = parseIsolatedSafeFixArgs([
  "--intent",
  "Apply only proven staged formatting",
  "--apply",
  "--json",
]);
assert.equal(parsed.intent, "Apply only proven staged formatting");
assert.equal(parsed.apply, true);
assert.equal(parsed.json, true);
assert.equal(parsed.help, false);

assert.deepEqual(parseIsolatedSafeFixArgs(["--help"]), {
  help: true,
  intent: null,
  apply: false,
  json: false,
});
for (const argv of [
  [],
  ["--intent", "missing acknowledgement"],
  ["--apply"],
  ["--intent", "one", "--intent", "two", "--apply"],
  ["--intent", "one", "--apply", "--apply"],
  ["--intent", "one", "--apply", "--json", "--json"],
  ["--intent", "line one\nline two", "--apply"],
  ["--unknown"],
]) {
  assert.throws(
    () => parseIsolatedSafeFixArgs(argv),
    IsolatedSafeFixUsageError,
  );
}

for (const file of [
  "app/api/status/route.ts",
  "components/ui/Button.tsx",
  "lib/example.mdx",
]) {
  assert.equal(classifyEligibleSafeFixPath(file).eligible, true, file);
}
for (const [file, reason] of [
  ["../app/page.tsx", "outside_repository"],
  ["C:/repo/app/page.tsx", "outside_repository"],
  ["scripts/example.mjs", "unsupported_root"],
  ["app/hq/page.tsx", "canonical_format_exclusion"],
  ["lib/example.json", "unsupported_extension"],
]) {
  assert.deepEqual(
    classifyEligibleSafeFixPath(file),
    { eligible: false, reason },
    file,
  );
}

assert.deepEqual(
  findChangedPathOverlap(
    ["app/a.ts", "lib/b.ts", "app/a.ts"],
    ["notes/c.md", "app/a.ts"],
  ),
  ["app/a.ts"],
);
assert.deepEqual(
  findUnexpectedFixPaths(
    ["app/a.ts", "lib/b.ts"],
    ["lib/b.ts", "scripts/unexpected.mjs"],
  ),
  ["scripts/unexpected.mjs"],
);

const runId = buildSafeFixRunId(
  new Date("2026-07-27T07:00:00.000Z"),
  Buffer.from("staged diff"),
);
assert.match(runId, /^2026-07-27T07-00-00Z-[a-f0-9]{10}$/);
const contained = resolveContainedFixWorktree(path.resolve("C:/nexus"), runId);
assert.equal(
  path.relative(path.resolve("C:/nexus"), contained).replaceAll("\\", "/"),
  `.worktrees/isolated-fix-${runId}`,
);
assert.throws(() =>
  resolveContainedFixWorktree(path.resolve("C:/nexus"), "../../outside"),
);

assert.equal(
  classifySafeFixOutcome({
    phaseFailure: null,
    rollbackAttempted: false,
    rollbackPassed: false,
    cleanupPassed: true,
    fixedPathCount: 1,
    applied: true,
  }).outcome,
  "applied",
);
assert.equal(
  classifySafeFixOutcome({
    phaseFailure: null,
    rollbackAttempted: false,
    rollbackPassed: false,
    cleanupPassed: true,
    fixedPathCount: 0,
    applied: false,
  }).outcome,
  "no_changes",
);
assert.equal(
  classifySafeFixOutcome({
    phaseFailure: "source_drift",
    rollbackAttempted: false,
    rollbackPassed: false,
    cleanupPassed: true,
    fixedPathCount: 1,
    applied: false,
  }).outcome,
  "failed_source_drift",
);
assert.equal(
  classifySafeFixOutcome({
    phaseFailure: "postcondition",
    rollbackAttempted: true,
    rollbackPassed: false,
    cleanupPassed: true,
    fixedPathCount: 1,
    applied: true,
  }).outcome,
  "failed_rollback",
);
assert.equal(
  classifySafeFixOutcome({
    phaseFailure: null,
    rollbackAttempted: false,
    rollbackPassed: false,
    cleanupPassed: false,
    fixedPathCount: 1,
    applied: true,
  }).outcome,
  "failed_cleanup",
);

const originalPatch = Buffer.from("original staged snapshot");
const expectedPatch = Buffer.from("proven formatted snapshot");
const fixPatch = Buffer.from("mechanical patch");
let cachedDiffRead = 0;
let reverseApplyCalled = false;
const rollbackFixture = applyProvenFixPatch({
  repoRoot: "C:/fixture",
  stagedPaths: ["app/sample.ts"],
  fixPatch,
  originalStagedSha256: sha256(originalPatch),
  provenFinalStagedSha256: sha256(expectedPatch),
  runGitCommand: (_root, args) => {
    if (args[0] === "diff" && args.includes("--cached")) {
      cachedDiffRead += 1;
      return {
        status: 0,
        stdout:
          cachedDiffRead === 1
            ? originalPatch
            : cachedDiffRead === 2
              ? Buffer.from("unexpected applied snapshot")
              : originalPatch,
        stderr: Buffer.alloc(0),
        error: null,
        durationMs: 1,
      };
    }
    if (args[0] === "diff" && args.includes("--name-only")) {
      return {
        status: 0,
        stdout: "",
        stderr: "",
        error: null,
        durationMs: 1,
      };
    }
    if (args[0] === "apply") {
      if (args.includes("-R")) reverseApplyCalled = true;
      return {
        status: 0,
        stdout: Buffer.alloc(0),
        stderr: Buffer.alloc(0),
        error: null,
        durationMs: 1,
      };
    }
    throw new Error(`unexpected fake Git call: ${args.join(" ")}`);
  },
});
assert.equal(rollbackFixture.phaseFailure, "postcondition");
assert.equal(rollbackFixture.sourceApplication.postconditionPassed, false);
assert.equal(rollbackFixture.sourceApplication.applied, false);
assert.equal(rollbackFixture.rollback.attempted, true);
assert.equal(rollbackFixture.rollback.passed, true);
assert.equal(reverseApplyCalled, true);

let driftApplyCalled = false;
const driftFixture = applyProvenFixPatch({
  repoRoot: "C:/fixture",
  stagedPaths: ["app/sample.ts"],
  fixPatch,
  originalStagedSha256: sha256(originalPatch),
  provenFinalStagedSha256: sha256(expectedPatch),
  runGitCommand: (_root, args) => {
    if (args[0] === "diff" && args.includes("--cached")) {
      return {
        status: 0,
        stdout: Buffer.from("drifted snapshot"),
        stderr: Buffer.alloc(0),
        error: null,
        durationMs: 1,
      };
    }
    if (args[0] === "diff" && args.includes("--name-only")) {
      return {
        status: 0,
        stdout: "",
        stderr: "",
        error: null,
        durationMs: 1,
      };
    }
    if (args[0] === "apply") driftApplyCalled = true;
    throw new Error(`unexpected fake Git call: ${args.join(" ")}`);
  },
});
assert.equal(driftFixture.phaseFailure, "source_drift");
assert.equal(driftFixture.sourceApplication.attempted, false);
assert.equal(driftApplyCalled, false);

function run(command, args, cwd, encoding = "utf8") {
  const result = spawnSync(command, args, {
    cwd,
    encoding,
    shell: false,
    stdio: "pipe",
    windowsHide: true,
  });
  assert.equal(
    result.status,
    0,
    `${command} ${args.join(" ")}\n${String(result.stdout)}\n${String(result.stderr)}`,
  );
  return result;
}

const projectRoot = process.cwd();
const fixtureRoot = fs.mkdtempSync(
  path.join(os.tmpdir(), "nexus-isolated-safe-fix-"),
);
const fixtureNodeModules = path.join(fixtureRoot, "node_modules");

try {
  fs.mkdirSync(path.join(fixtureRoot, "app"), { recursive: true });
  fs.mkdirSync(path.join(fixtureRoot, "scripts"), { recursive: true });
  fs.copyFileSync(
    path.join(projectRoot, "scripts", "git-with-acl-repair.ps1"),
    path.join(fixtureRoot, "scripts", "git-with-acl-repair.ps1"),
  );
  fs.writeFileSync(
    path.join(fixtureRoot, "package.json"),
    `${JSON.stringify(
      {
        private: true,
        scripts: {
          "format:check": 'node -e "process.exit(0)"',
          "type-check": 'node -e "process.exit(0)"',
          lint: 'node -e "process.exit(0)"',
        },
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
  fs.symlinkSync(
    fs.realpathSync(path.join(projectRoot, "node_modules")),
    fixtureNodeModules,
    process.platform === "win32" ? "junction" : "dir",
  );

  run("git", ["init"], fixtureRoot);
  run("git", ["config", "user.email", "fixture@nexus.local"], fixtureRoot);
  run("git", ["config", "user.name", "Nexus Fixture"], fixtureRoot);

  const sourcePath = path.join(fixtureRoot, "app", "sample.ts");
  const unrelatedPath = path.join(fixtureRoot, "notes.txt");
  fs.writeFileSync(
    sourcePath,
    "export const answer = { value: 41 };\n",
    "utf8",
  );
  fs.writeFileSync(unrelatedPath, "base\n", "utf8");
  run(
    "git",
    [
      "add",
      "--",
      "app/sample.ts",
      "notes.txt",
      "package.json",
      "scripts/git-with-acl-repair.ps1",
    ],
    fixtureRoot,
  );
  run("git", ["commit", "-m", "fixture base"], fixtureRoot);

  fs.writeFileSync(sourcePath, "export const answer={value:42}\n", "utf8");
  run("git", ["add", "--", "app/sample.ts"], fixtureRoot);
  fs.writeFileSync(unrelatedPath, "unrelated dirty work\n", "utf8");
  const unrelatedBefore = fs.readFileSync(unrelatedPath);

  const cliResult = spawnSync(
    process.execPath,
    [
      path.join(projectRoot, "scripts", "isolated-safe-fix.mjs"),
      "--intent",
      "Format the staged fixture only",
      "--apply",
      "--json",
    ],
    {
      cwd: fixtureRoot,
      encoding: "utf8",
      shell: false,
      stdio: "pipe",
      windowsHide: true,
    },
  );
  assert.equal(
    cliResult.status,
    0,
    `${String(cliResult.stdout)}\n${String(cliResult.stderr)}`,
  );
  const receipt = JSON.parse(String(cliResult.stdout));
  assert.equal(receipt.result.outcome, "applied");
  assert.equal(receipt.fixedPathCount, 1);
  assert.equal(receipt.sourceApplication.snapshotUnchanged, true);
  assert.equal(receipt.sourceApplication.applied, true);
  assert.equal(receipt.sourceApplication.postconditionPassed, true);
  assert.equal(receipt.rollback.attempted, false);
  assert.equal(receipt.cleanup.passed, true);
  assert.equal(receipt.cleanup.worktreeRemoved, true);
  assert.equal(receipt.scope.exactPathsStored, false);
  assert.equal(receipt.intent.storedVerbatim, false);

  assert.equal(
    fs.readFileSync(sourcePath, "utf8").replaceAll("\r\n", "\n"),
    "export const answer = { value: 42 };\n",
  );
  assert.deepEqual(fs.readFileSync(unrelatedPath), unrelatedBefore);
  assert.equal(
    String(
      run("git", ["diff", "--cached", "--name-only"], fixtureRoot).stdout,
    ).trim(),
    "app/sample.ts",
  );
  assert.equal(
    String(run("git", ["diff", "--", "app/sample.ts"], fixtureRoot).stdout),
    "",
  );

  const evidencePath = path.join(
    fixtureRoot,
    ...receipt.evidenceDirectory.split("/"),
    "receipt.json",
  );
  const persistedReceipt = JSON.parse(fs.readFileSync(evidencePath, "utf8"));
  assert.equal(persistedReceipt.result.outcome, "applied");
  assert.equal(
    String(run("git", ["worktree", "list"], fixtureRoot).stdout).includes(
      "isolated-fix-",
    ),
    false,
  );
} finally {
  if (fs.existsSync(fixtureNodeModules)) {
    fs.unlinkSync(fixtureNodeModules);
  }
  fs.rmSync(fixtureRoot, { recursive: true, force: true });
}

console.log(
  "ok isolated-safe-fix-runtime (explicit approval, eligible scope, exact formatting, staged apply, unrelated preservation, cleanup)",
);
