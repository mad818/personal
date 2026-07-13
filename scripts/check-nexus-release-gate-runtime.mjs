#!/usr/bin/env node
/* eslint-disable no-console */

import assert from "node:assert/strict";
import {
  classifyReleaseReadiness,
  parseReleaseGateArgs,
  sanitizeOutputLines,
} from "./nexus-release-gate.mjs";

const passedChecks = [
  { id: "diff-check", passed: true },
  { id: "handoff", passed: true },
  { id: "operator-preflight", passed: true },
  { id: "full-verify", passed: true },
];

function gitState(overrides = {}) {
  return {
    branch: "main",
    upstream: "origin/main",
    ahead: 2,
    behind: 0,
    dirty: false,
    changedCount: 0,
    ...overrides,
  };
}

const parsed = parseReleaseGateArgs([
  "--intent",
  "Ship the Nexus release safely",
  "--quick",
  "--json",
]);
assert.equal(parsed.intent, "Ship the Nexus release safely");
assert.equal(parsed.quick, true);
assert.equal(parsed.json, true);

assert.throws(
  () => parseReleaseGateArgs([]),
  /--intent is required/,
  "intent must be required",
);

const full = classifyReleaseReadiness({
  checks: passedChecks,
  gitState: gitState(),
  quick: false,
});
assert.equal(full.outcome, "checks_passed_local");
assert.equal(full.readyForOperatorPush, true);
assert.deepEqual(full.blockers, [
  "remote_push_required",
  "remote_ci_confirmation_required",
]);

const quick = classifyReleaseReadiness({
  checks: passedChecks.slice(0, 3),
  gitState: gitState(),
  quick: true,
});
assert.equal(quick.outcome, "quick_checks_passed");
assert.equal(quick.readyForOperatorPush, false);
assert.ok(quick.blockers.includes("full_verification_not_run"));

const dirty = classifyReleaseReadiness({
  checks: passedChecks,
  gitState: gitState({ dirty: true, changedCount: 3 }),
  quick: false,
});
assert.equal(dirty.outcome, "blocked_worktree");

const failed = classifyReleaseReadiness({
  checks: [{ id: "handoff", passed: false }],
  gitState: gitState(),
  quick: false,
});
assert.equal(failed.outcome, "blocked_local_checks");
assert.deepEqual(failed.blockers, ["local_check_failed:handoff"]);

const unknown = classifyReleaseReadiness({
  checks: passedChecks,
  gitState: gitState({ upstream: null, ahead: null, behind: null }),
  quick: false,
});
assert.equal(unknown.outcome, "blocked_unknown_upstream");

const behind = classifyReleaseReadiness({
  checks: passedChecks,
  gitState: gitState({ behind: 1 }),
  quick: false,
});
assert.equal(behind.outcome, "blocked_upstream_divergence");

const sanitized = sanitizeOutputLines(
  "C:\\Users\\mario\\Desktop\\personal\\secret.txt token=abc123",
);
assert.equal(sanitized.length, 1);
assert.ok(!sanitized[0].includes("mario"));
assert.ok(!sanitized[0].includes("abc123"));

console.log("ok nexus-release-gate-runtime");
