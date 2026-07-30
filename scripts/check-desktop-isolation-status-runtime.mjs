#!/usr/bin/env node
/* eslint-disable no-console */

import assert from "node:assert/strict";
import {
  buildStaticIsolationEvidence,
  classifyDesktopIsolationStatus,
  evaluateLiveIsolationStatus,
  normalizeDesktopIsolationTarget,
  parseDesktopIsolationArgs,
} from "./desktop-isolation-status.mjs";

const staticEvidence = buildStaticIsolationEvidence();
assert.equal(staticEvidence.staticReady, true);
assert.ok(staticEvidence.policyTotal > 20);
assert.ok(staticEvidence.policyCounts.local_only > 0);
assert.ok(staticEvidence.policyCounts.connector_opt_in > 0);
assert.ok(staticEvidence.policyCounts.high_risk > 0);
assert.equal(staticEvidence.policyFailures.length, 0);
assert.equal(
  staticEvidence.blockedConnectorPolicies,
  staticEvidence.policyCounts.connector_opt_in +
    staticEvidence.policyCounts.high_risk,
);

assert.deepEqual(parseDesktopIsolationArgs(["--live", "--json"]), {
  help: false,
  json: true,
  live: true,
});
assert.throws(
  () => parseDesktopIsolationArgs(["--assume-packaged"]),
  /unknown option/,
);
assert.equal(
  normalizeDesktopIsolationTarget("https://nexus.example:8443/"),
  "https://nexus.example:8443",
);
assert.throws(
  () => normalizeDesktopIsolationTarget("file:///tmp/nexus"),
  /must use http or https/,
);
assert.throws(
  () => normalizeDesktopIsolationTarget("https://user:pass@nexus.example"),
  /must not contain credentials/,
);

const liveReady = evaluateLiveIsolationStatus({
  status: "ok",
  summary: {
    networkMode: "isolated",
    highRiskRoutesEnabled: false,
    allowPaidApis: false,
    tokenConfigured: true,
    release: { deploymentProfile: "desktop-secure" },
  },
  readiness: {
    policies: {
      toolPolicyMode: "strict",
      highRiskWritesRequireApproval: true,
    },
  },
});
assert.equal(liveReady.ready, true);

const liveUnsafe = evaluateLiveIsolationStatus({
  status: "ok",
  summary: {
    networkMode: "connected",
    highRiskRoutesEnabled: true,
    allowPaidApis: true,
    tokenConfigured: true,
    release: { deploymentProfile: "web-self-hosted" },
  },
  readiness: {
    policies: {
      toolPolicyMode: "permissive",
      highRiskWritesRequireApproval: false,
    },
  },
});
assert.equal(liveUnsafe.ready, false);

const staticOnly = classifyDesktopIsolationStatus({
  staticEvidence,
  liveEvidence: null,
});
assert.equal(staticOnly.outcome, "static_ready_live_app_proof_pending");
assert.equal(staticOnly.cp22Complete, false);
assert.ok(staticOnly.blockers.includes("os_no_outbound_capture_required"));

const livePass = classifyDesktopIsolationStatus({
  staticEvidence,
  liveEvidence: liveReady,
});
assert.equal(
  livePass.outcome,
  "live_app_isolation_passed_packaged_proof_pending",
);
assert.equal(livePass.cp22Complete, false);

const liveFail = classifyDesktopIsolationStatus({
  staticEvidence,
  liveEvidence: liveUnsafe,
});
assert.equal(liveFail.outcome, "blocked_live_app_isolation");
assert.equal(liveFail.exitCode, 1);

const staticFail = classifyDesktopIsolationStatus({
  staticEvidence: { ...staticEvidence, staticReady: false },
  liveEvidence: null,
});
assert.equal(staticFail.outcome, "blocked_static_isolation_contract");

console.log("ok desktop-isolation-status-runtime");
