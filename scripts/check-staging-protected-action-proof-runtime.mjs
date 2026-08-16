#!/usr/bin/env node
/* eslint-disable no-console */

import assert from "node:assert/strict";

import {
  buildProtectedActionProofArtifact,
  normalizeProtectedActionTarget,
  normalizeRunId,
  readBoundedJsonResponse,
  signProtectedActionProofEnvelope,
  validateProtectedActionProofArtifact,
} from "./staging-protected-action-proof.mjs";
import { signCapabilityProtectedActionReceipt } from "../lib/capabilityProtectedActionReceipt.mjs";

const now = new Date("2026-08-12T06:00:00.000Z");
const nowMs = now.getTime();
const targetId = "staging-0123456789abcdef";
const runId = "run_2026-08-12T05-59-00Z_a1b2c3";
const evidenceKey = "fixture-private-evidence-key";

function payload({
  approvalRequired = true,
  status = "verified",
  verificationPassed = true,
  includeReceipt = true,
} = {}) {
  const receipt = {
    schemaVersion: "capability-assurance.v1",
    id: `receipt-${runId}-${nowMs - 1_000}`,
    runId,
    capabilityId: "archive-continuity",
    actionId: "remove-temporary-qa-evidence",
    mode: "action",
    status,
    verificationRequired: true,
    verificationPassed,
    finishedAt: nowMs - 1_000,
    provenance: "server_protected_action",
    approvalGranted: true,
    proofSignature: null,
  };
  receipt.proofSignature = signCapabilityProtectedActionReceipt(
    receipt,
    evidenceKey,
  );
  return {
    ok: true,
    available: true,
    schemaVersion: "capability-assurance.v1",
    contracts: [
      {
        capabilityId: "archive-continuity",
        actions: [
          {
            id: "remove-temporary-qa-evidence",
            approvalRequired,
          },
        ],
      },
    ],
    recentReceipts: includeReceipt ? [receipt] : [],
  };
}

function artifact(body) {
  return buildProtectedActionProofArtifact({
    capturedAt: now,
    targetId,
    runId,
    evidenceKey,
    probe: {
      status: 200,
      durationMs: 14,
      responseBytes: 2_048,
      bodyWithinLimit: true,
      validJson: true,
      payload: body,
      error: null,
    },
  });
}

const verified = artifact(payload());
assert.equal(verified.protectedActionReady, true);
assert.deepEqual(verified.blockers, []);
assert.equal(verified.receipt?.runId, runId);
assert.equal(verified.receipt?.approvalRequired, true);
assert.equal(verified.receipt?.verificationPassed, true);
assert.equal(verified.receipt?.mode, "action");
assert.equal(verified.receipt?.provenance, "server_protected_action");
assert.equal(verified.receipt?.serverProofVerified, true);
assert.match(verified.envelopeSignature, /^[a-f0-9]{64}$/);
assert.equal(
  validateProtectedActionProofArtifact({
    proof: verified,
    targetId,
    capturedAt: now,
    evidenceKey,
  }).passed,
  true,
);
assert.equal(JSON.stringify(verified).includes("example.test"), false);

const nonApproval = artifact(payload({ approvalRequired: false }));
assert.equal(nonApproval.protectedActionReady, false);
assert.match(nonApproval.blockers.join(" "), /approval-required/i);

const failed = artifact(
  payload({ status: "failed", verificationPassed: false }),
);
assert.equal(failed.protectedActionReady, false);
assert.match(failed.blockers.join(" "), /verified/i);

const missing = artifact(payload({ includeReceipt: false }));
assert.equal(missing.protectedActionReady, false);
assert.match(missing.blockers.join(" "), /matching receipt/i);

const forgedPayload = payload();
forgedPayload.recentReceipts[0] = {
  ...forgedPayload.recentReceipts[0],
  provenance: "client_reported",
  approvalGranted: false,
  proofSignature: null,
};
const forged = artifact(forgedPayload);
assert.equal(forged.protectedActionReady, false);
assert.match(forged.blockers.join(" "), /server protected-action provenance/i);

for (const tamper of [
  (value) => {
    value.request.status = 500;
  },
  (value) => {
    value.request.bodyWithinLimit = false;
  },
  (value) => {
    value.request.validJson = false;
  },
  (value) => {
    value.request.responseBytes = 2_049;
  },
  (value) => {
    value.receipt.runId = "run_tampered";
  },
  (value) => {
    value.receipt.actionId = "unsafe action id";
  },
  (value) => {
    value.receipt.proofSignature = "0".repeat(64);
  },
]) {
  const altered = structuredClone(verified);
  tamper(altered);
  assert.equal(
    validateProtectedActionProofArtifact({
      proof: altered,
      targetId,
      capturedAt: now,
      evidenceKey,
    }).passed,
    false,
  );
}

const replayedTarget = structuredClone(verified);
replayedTarget.targetId = "staging-bbbbbbbbbbbbbbbb";
assert.equal(
  validateProtectedActionProofArtifact({
    proof: replayedTarget,
    targetId: "staging-bbbbbbbbbbbbbbbb",
    capturedAt: now,
    evidenceKey,
  }).passed,
  false,
);

const explicitlyResignedTarget = structuredClone(verified);
explicitlyResignedTarget.targetId = "staging-bbbbbbbbbbbbbbbb";
explicitlyResignedTarget.envelopeSignature = signProtectedActionProofEnvelope(
  explicitlyResignedTarget,
  evidenceKey,
);
assert.equal(
  validateProtectedActionProofArtifact({
    proof: explicitlyResignedTarget,
    targetId: "staging-bbbbbbbbbbbbbbbb",
    capturedAt: now,
    evidenceKey: "different-private-evidence-key",
  }).passed,
  false,
);

assert.throws(
  () =>
    normalizeProtectedActionTarget(
      "http://stage.example.test",
      "fixture-private-evidence-key",
    ),
  /HTTPS staged target/i,
);
assert.throws(() => normalizeRunId(` ${runId}`), /exact safe identifier/i);
assert.equal(normalizeRunId(runId), runId);
assert.match(
  normalizeProtectedActionTarget(
    "https://stage.example.test",
    "fixture-private-evidence-key",
  ).targetId,
  /^staging-[a-f0-9]{16}$/,
);

const oversized = await readBoundedJsonResponse(
  new Response(JSON.stringify({ value: "x".repeat(80) })),
  32,
);
assert.equal(oversized.withinLimit, false);
assert.equal(oversized.validJson, false);
const oversizedArtifact = buildProtectedActionProofArtifact({
  capturedAt: now,
  targetId,
  runId,
  evidenceKey,
  probe: {
    status: 200,
    responseBytes: oversized.byteLength,
    bodyWithinLimit: oversized.withinLimit,
    validJson: oversized.validJson,
    payload: oversized.json,
  },
});
assert.equal(oversizedArtifact.protectedActionReady, false);
assert.match(oversizedArtifact.blockers.join(" "), /response limit/i);

const invalidJson = await readBoundedJsonResponse(
  new Response("not-json", {
    headers: { "content-type": "application/json" },
  }),
  256,
);
assert.equal(invalidJson.withinLimit, true);
assert.equal(invalidJson.validJson, false);
const invalidJsonArtifact = buildProtectedActionProofArtifact({
  capturedAt: now,
  targetId,
  runId,
  probe: {
    status: 200,
    responseBytes: invalidJson.byteLength,
    bodyWithinLimit: invalidJson.withinLimit,
    validJson: invalidJson.validJson,
    payload: invalidJson.json,
  },
});
assert.equal(invalidJsonArtifact.protectedActionReady, false);
assert.match(invalidJsonArtifact.blockers.join(" "), /valid JSON/i);

console.log(
  "ok protected-action proof runtime contract (exact run, approval-required action, bounded GET evidence)",
);
