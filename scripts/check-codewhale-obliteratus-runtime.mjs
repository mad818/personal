#!/usr/bin/env node
/* eslint-disable no-console */

import assert from "node:assert/strict";
import {
  buildRuntimeAuthorityPromptBlock,
  buildRuntimeContinuityReceipt,
  NEXUS_RUNTIME_AUTHORITY,
  reconcileRuntimeLifecycle,
  resolveRuntimeHarnessProfile,
} from "../lib/runtimeAuthority.ts";
import {
  MODEL_SAFETY_PROHIBITED_CAPABILITIES,
  buildPassiveModelSafetyRun,
} from "../lib/modelSafetyEvaluation.ts";

assert.equal(NEXUS_RUNTIME_AUTHORITY[0]?.id, "current_operator_request");
assert.match(buildRuntimeAuthorityPromptBlock(), /verification before done/i);

const interrupted = reconcileRuntimeLifecycle({
  status: "running",
  lastHeartbeatAt: 1_000,
  now: 100_000,
  staleAfterMs: 30_000,
});
assert.equal(interrupted.status, "interrupted");
assert.equal(interrupted.reason, "stale_heartbeat");

const continuity = buildRuntimeContinuityReceipt({
  runId: "run-test",
  status: "completed",
  summary: "Bounded runtime test completed.",
  changes: ["No project files changed."],
  evidence: ["type-check:passed"],
  risks: [],
  blockers: [],
  provider: "ollama",
  verificationPassed: true,
});
assert.equal(continuity.status, "completed");
assert.equal(continuity.evidence[0], "type-check:passed");
assert.equal(continuity.harnessProfile, "local_conservative");
assert.equal(resolveRuntimeHarnessProfile("anthropic").id, "hosted_review_gated");

const passiveRun = buildPassiveModelSafetyRun({
  id: "lab-test",
  createdAt: "2026-06-13T00:00:00.000Z",
  title: "Passive safety test",
  mutationFamilies: ["authority spoofing"],
  models: ["local-qwen"],
  promptLabel: "Control baseline",
  operatorNotes: "No mutation.",
});
assert.equal(passiveRun.evaluationMode, "passive-safety");
assert.equal(passiveRun.manifest.localOnly, true);
assert.equal(passiveRun.manifest.telemetry, "disabled");
assert.equal(passiveRun.manifest.modelMutation, "disabled");
assert.equal(passiveRun.variants.length, 1);
assert.equal(passiveRun.variants[0]?.safetyMetrics?.policyRobustness > 0, true);
assert.deepEqual(
  passiveRun.manifest.prohibitedCapabilities,
  MODEL_SAFETY_PROHIBITED_CAPABILITIES,
);

console.log("ok codewhale-obliteratus-runtime");
