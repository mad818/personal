#!/usr/bin/env node
/* eslint-disable no-console */

import assert from "node:assert/strict";
import path from "node:path";
import {
  IsolatedVerifyUsageError,
  buildIsolatedRunId,
  classifyIsolatedOutcome,
  findChangedPathOverlap,
  parseIsolatedVerifyArgs,
  resolveContainedWorktree,
} from "./isolated-verify.mjs";

const parsed = parseIsolatedVerifyArgs([
  "--intent",
  "Verify only the staged Nexus tranche",
  "--json",
]);
assert.equal(parsed.intent, "Verify only the staged Nexus tranche");
assert.equal(parsed.json, true);
assert.equal(parsed.help, false);

assert.deepEqual(parseIsolatedVerifyArgs(["--help"]), {
  help: true,
  intent: null,
  json: false,
});
for (const argv of [
  [],
  ["--intent", ""],
  ["--intent", "one", "--intent", "two"],
  ["--json", "--json", "--intent", "one"],
  ["--unknown"],
  ["--intent", "line one\nline two"],
]) {
  assert.throws(() => parseIsolatedVerifyArgs(argv), IsolatedVerifyUsageError);
}

const runId = buildIsolatedRunId(
  new Date("2026-07-26T18:30:00.000Z"),
  Buffer.from("staged diff"),
);
assert.match(runId, /^2026-07-26T18-30-00Z-[a-f0-9]{10}$/);

const repoRoot = path.resolve("C:/nexus");
const contained = resolveContainedWorktree(repoRoot, runId);
assert.equal(
  path.relative(repoRoot, contained).replaceAll("\\", "/"),
  `.worktrees/isolated-verify-${runId}`,
);
assert.throws(() =>
  resolveContainedWorktree(repoRoot, "../../outside-worktree"),
);

assert.deepEqual(
  findChangedPathOverlap(
    ["app/a.ts", "lib/b.ts", "app/a.ts"],
    ["docs/c.md", "app/a.ts"],
  ),
  ["app/a.ts"],
);

assert.deepEqual(
  classifyIsolatedOutcome({
    verificationPassed: true,
    cleanupPassed: true,
  }),
  {
    outcome: "passed",
    exitCode: 0,
    nextAction:
      "Review the staged diff and commit it; remote push and CI confirmation remain explicit operator actions.",
  },
);
assert.equal(
  classifyIsolatedOutcome({
    verificationPassed: false,
    cleanupPassed: true,
  }).outcome,
  "failed_verification",
);
assert.equal(
  classifyIsolatedOutcome({
    verificationPassed: true,
    cleanupPassed: false,
  }).outcome,
  "failed_cleanup",
);

console.log(
  "ok isolated-verification-runtime (intent, containment, overlap, fail-closed outcomes)",
);
