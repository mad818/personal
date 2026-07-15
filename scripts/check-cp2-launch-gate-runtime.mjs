#!/usr/bin/env node
/* eslint-disable no-console */

import assert from "node:assert/strict";
import {
  CP2_LIVE_CHECKS,
  CP2_STATIC_CHECKS,
  classifyCp2LaunchGate,
  normalizeCp2TargetUrl,
  parseCp2LaunchGateArgs,
  sanitizeCp2OutputLines,
} from "./cp2-launch-gate.mjs";

const pass = (id) => ({ id, passed: true });

assert.deepEqual(
  CP2_STATIC_CHECKS.map((check) => check.id),
  ["release-gate", "runtime-eval"],
);
assert.deepEqual(
  CP2_LIVE_CHECKS.map((check) => check.id),
  ["route-integrity", "release-smoke", "auth-e2e"],
);

assert.deepEqual(parseCp2LaunchGateArgs(["--live", "--json"]), {
  help: false,
  json: true,
  live: true,
});
assert.throws(
  () => parseCp2LaunchGateArgs(["--skip-verify"]),
  /unknown option/,
);

assert.equal(
  normalizeCp2TargetUrl("https://nexus.example:8443/"),
  "https://nexus.example:8443",
);
assert.throws(() => normalizeCp2TargetUrl(""), /requires NEXUS_RELEASE_BASE_URL/);
assert.throws(
  () => normalizeCp2TargetUrl("file:///tmp/nexus"),
  /must use http or https/,
);
assert.throws(
  () => normalizeCp2TargetUrl("https://user:pass@nexus.example"),
  /must not contain credentials/,
);
assert.throws(
  () => normalizeCp2TargetUrl("https://nexus.example/app"),
  /must be an origin/,
);

const staticResult = classifyCp2LaunchGate({
  checks: CP2_STATIC_CHECKS.map((check) => pass(check.id)),
  live: false,
});
assert.equal(staticResult.outcome, "static_checks_passed");
assert.equal(staticResult.liveTargetProofPassed, false);
assert.ok(staticResult.blockers.includes("live_target_checks_not_run"));

const liveResult = classifyCp2LaunchGate({
  checks: [
    pass("target-health"),
    ...CP2_STATIC_CHECKS.map((check) => pass(check.id)),
    ...CP2_LIVE_CHECKS.map((check) => pass(check.id)),
  ],
  live: true,
});
assert.equal(liveResult.outcome, "target_checks_passed");
assert.equal(liveResult.liveTargetProofPassed, true);

const failedResult = classifyCp2LaunchGate({
  checks: [pass("target-health"), { id: "release-smoke", passed: false }],
  live: true,
});
assert.equal(failedResult.outcome, "blocked_local_checks");
assert.deepEqual(failedResult.blockers, [
  "local_check_failed:release-smoke",
]);

const sanitized = sanitizeCp2OutputLines(
  "C:\\Users\\mario\\Desktop\\personal\\secret.txt token=abc123",
);
assert.equal(sanitized.length, 1);
assert.ok(!sanitized[0].includes("mario"));
assert.ok(!sanitized[0].includes("abc123"));

console.log("ok cp2-launch-gate-runtime");
