#!/usr/bin/env node
/* eslint-disable no-console */
import assert from "node:assert/strict";
import {
  FEYNMAN_REPLICATION_LIMITS,
  REPLICATION_SCRIPT_ALLOWLIST,
  formatReplicationResult,
  runReplicationScript,
  validateReplicationScriptPath,
} from "../lib/feynmanLocalReplication.ts";

// ── validateReplicationScriptPath ────────────────────────────────────────────
const PROJECT_ROOT = "/tmp/nexus-test-root";

const goodCheck = validateReplicationScriptPath(
  "scripts/replication/run-experiment.mjs",
  PROJECT_ROOT,
);
assert.equal(goodCheck.safe, true);
assert.ok(goodCheck.safe && goodCheck.absolute.replace(/\\/g, "/").includes("scripts/replication/run-experiment.mjs"));

const expCheck = validateReplicationScriptPath(
  "scripts/experiments/baseline.mjs",
  PROJECT_ROOT,
);
assert.equal(expCheck.safe, true);

// Traversal blocked
const traversalCheck = validateReplicationScriptPath(
  "scripts/replication/../../../etc/passwd",
  PROJECT_ROOT,
);
assert.equal(traversalCheck.safe, false);
assert.ok(!traversalCheck.safe && traversalCheck.reason.includes("traversal"));

// Outside allowlist blocked
const outsideCheck = validateReplicationScriptPath("scripts/run-anything.mjs", PROJECT_ROOT);
assert.equal(outsideCheck.safe, false);

// Empty path blocked
const emptyCheck = validateReplicationScriptPath("", PROJECT_ROOT);
assert.equal(emptyCheck.safe, false);

// Blocked segment in resolved path
const blockedCheck = validateReplicationScriptPath(
  "scripts/replication/node_modules/evil.mjs",
  PROJECT_ROOT,
);
assert.equal(blockedCheck.safe, false);

// ── REPLICATION_SCRIPT_ALLOWLIST exported ─────────────────────────────────────
assert.ok(Array.isArray(REPLICATION_SCRIPT_ALLOWLIST));
assert.ok(REPLICATION_SCRIPT_ALLOWLIST.length >= 2);

// ── FEYNMAN_REPLICATION_LIMITS ────────────────────────────────────────────────
assert.ok(FEYNMAN_REPLICATION_LIMITS.defaultTimeoutMs > 0);
assert.ok(FEYNMAN_REPLICATION_LIMITS.maximumTimeoutMs > FEYNMAN_REPLICATION_LIMITS.defaultTimeoutMs);
assert.ok(FEYNMAN_REPLICATION_LIMITS.maximumOutputBytes > 0);

// ── runReplicationScript — blocked without approve ────────────────────────────
const blockedResult = await runReplicationScript({
  approve: false,
  scriptRelPath: "scripts/replication/run.mjs",
});
assert.equal(blockedResult.approved, false);
assert.ok(blockedResult.error?.includes("approve"));
assert.equal(blockedResult.exitCode, null);
assert.equal(blockedResult.stdout, "");
assert.equal(blockedResult.stderr, "");

// ── runReplicationScript — blocked on bad path even if approved ───────────────
const badPathResult = await runReplicationScript({
  approve: true,
  scriptRelPath: "scripts/../../evil.mjs",
});
assert.equal(badPathResult.approved, false);
assert.ok(badPathResult.error?.includes("Blocked"));

// ── runReplicationScript — fixture mode (approved, good path, fixture spawn) ──
const FIXTURE_STDOUT = "Replication completed: 42 samples matched.";
const FIXTURE_STDERR = "";

const fixtureResult = await runReplicationScript(
  {
    approve: true,
    scriptRelPath: "scripts/replication/run-fixture.mjs",
    args: ["--dry-run"],
    timeoutMs: 5_000,
  },
  {
    cwd: PROJECT_ROOT,
    spawnImpl: async (_scriptAbsPath, _args, _opts) => ({
      exitCode: 0,
      stdout: FIXTURE_STDOUT,
      stderr: FIXTURE_STDERR,
    }),
  },
);
assert.equal(fixtureResult.approved, true);
assert.equal(fixtureResult.exitCode, 0);
assert.equal(fixtureResult.stdout, FIXTURE_STDOUT);
assert.equal(fixtureResult.stderr, FIXTURE_STDERR);
assert.equal(fixtureResult.truncated, false);
assert.ok(fixtureResult.durationMs >= 0);

// ── runReplicationScript — fixture mode with non-zero exit code ───────────────
const failFixtureResult = await runReplicationScript(
  {
    approve: true,
    scriptRelPath: "scripts/replication/run-fixture.mjs",
  },
  {
    cwd: PROJECT_ROOT,
    spawnImpl: async () => ({
      exitCode: 1,
      stdout: "",
      stderr: "Missing input file.",
    }),
  },
);
assert.equal(failFixtureResult.approved, true);
assert.equal(failFixtureResult.exitCode, 1);
assert.equal(failFixtureResult.stderr, "Missing input file.");

// ── timeout clamping ──────────────────────────────────────────────────────────
let capturedTimeoutMs = 0;
await runReplicationScript(
  {
    approve: true,
    scriptRelPath: "scripts/replication/run-fixture.mjs",
    timeoutMs: FEYNMAN_REPLICATION_LIMITS.maximumTimeoutMs + 999_999,
  },
  {
    cwd: PROJECT_ROOT,
    spawnImpl: async (_abs, _args, opts) => {
      capturedTimeoutMs = opts.timeoutMs;
      return { exitCode: 0, stdout: "", stderr: "" };
    },
  },
);
assert.ok(capturedTimeoutMs <= FEYNMAN_REPLICATION_LIMITS.maximumTimeoutMs);

// ── output truncation ─────────────────────────────────────────────────────────
const bigOutput = "x".repeat(FEYNMAN_REPLICATION_LIMITS.maximumOutputBytes + 10_000);
const truncResult = await runReplicationScript(
  {
    approve: true,
    scriptRelPath: "scripts/replication/run-fixture.mjs",
  },
  {
    cwd: PROJECT_ROOT,
    spawnImpl: async () => ({ exitCode: 0, stdout: bigOutput, stderr: "" }),
  },
);
assert.equal(truncResult.truncated, true);
assert.ok(
  Buffer.byteLength(truncResult.stdout, "utf-8") <=
    FEYNMAN_REPLICATION_LIMITS.maximumOutputBytes + 200,
);

// ── formatReplicationResult ───────────────────────────────────────────────────
const formatted = formatReplicationResult(fixtureResult);
assert.ok(formatted.includes("Feynman replication result"));
assert.ok(formatted.includes(FIXTURE_STDOUT));
assert.ok(formatted.includes("Approved: true"));
assert.ok(formatted.includes("Exit code: 0"));

const blockedFormatted = formatReplicationResult(blockedResult);
assert.ok(blockedFormatted.includes("Approved: false"));
assert.ok(blockedFormatted.includes("approve"));

console.log("ok feynman-local-replication (path allowlist, approve gate, fixture spawn, output truncation, format)");
