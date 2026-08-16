#!/usr/bin/env node
/* eslint-disable no-console */

import assert from "node:assert/strict";
import {
  ACTIVE_RELEASE_CANDIDATE_TAG,
  READINESS_SCHEMA_VERSION,
  READINESS_STATES,
  buildReadinessLane,
  buildReadinessRollup,
  createEvidenceRecord,
  evaluateReleaseCandidateCorrelation,
  sanitizeForArtifact,
} from "./readiness-rollup.mjs";
import { signCapabilityProtectedActionReceipt } from "../lib/capabilityProtectedActionReceipt.mjs";
import { signProtectedActionProofEnvelope } from "./staging-protected-action-proof.mjs";
import {
  ROLLBACK_CONFIRMATION,
  buildKnownGoodDeployment,
  buildRollbackProof,
} from "./staging-rollback-proof.mjs";
import { createRollbackPosture } from "./cp2-staged-release-rehearsal.mjs";

const NOW = "2026-08-11T12:00:00.000Z";
const HOUR = 60 * 60 * 1000;
const EVIDENCE_KEY = "fixture-private-evidence-key";

function evidence(id, reportedState = "ready", overrides = {}) {
  return createEvidenceRecord(
    {
      id,
      owner: `fixture:${id}`,
      file: `docs/metrics/${id}-latest.json`,
      appliesTo: ["webCandidate"],
      required: true,
      capturedAt: "2026-08-11T11:00:00.000Z",
      maxAgeMs: 24 * HOUR,
      reportedState,
      reason: `${id} is ${reportedState}`,
      nextAction: {
        id: `inspect-${id}`,
        label: `Inspect ${id}`,
        command: "npm run readiness:rollup",
        requiresApproval: false,
        reason: `Refresh ${id} evidence.`,
      },
      ...overrides,
    },
    NOW,
  );
}

assert.equal(READINESS_SCHEMA_VERSION, "nexus-readiness-rollup.v2");
assert.equal(ACTIVE_RELEASE_CANDIDATE_TAG, "v1.0.0-rc.2");
assert.deepEqual(READINESS_STATES, [
  "ready",
  "degraded",
  "retained",
  "unavailable",
  "stale",
  "blocked",
  "approval-required",
]);

for (const status of READINESS_STATES) {
  const lane = buildReadinessLane({
    id: "webCandidate",
    label: "Web candidate (v1.0.0-rc.2)",
    evidence: [evidence(`state-${status}`, status)],
  });
  assert.equal(lane.status, status, `lane must preserve ${status}`);
  assert.equal(lane.ready, status === "ready");
}

const expired = evidence("expired", "ready", {
  capturedAt: "2026-08-01T00:00:00.000Z",
  maxAgeMs: HOUR,
});
assert.equal(expired.freshnessStatus, "stale");
assert.equal(expired.state, "stale");
assert.equal(expired.expiresAt, "2026-08-01T01:00:00.000Z");

const future = evidence("future", "ready", {
  capturedAt: "2026-08-12T12:00:00.000Z",
});
assert.equal(future.freshnessStatus, "unavailable");
assert.equal(future.state, "unavailable");
assert.match(future.reason, /future/i);

const declaredExpired = createEvidenceRecord(
  {
    id: "declared-expired",
    owner: "fixture:declared-expired",
    file: "docs/metrics/declared-expired-latest.json",
    appliesTo: ["webCandidate"],
    required: true,
    capturedAt: "2026-08-11T11:00:00.000Z",
    declaredExpiresAt: "2026-08-11T11:30:00.000Z",
    maxAgeMs: 24 * HOUR,
    reportedState: "ready",
    reason: "fixture declares a shorter freshness window",
  },
  NOW,
);
assert.equal(declaredExpired.state, "stale");
assert.equal(declaredExpired.expiresAt, "2026-08-11T11:30:00.000Z");

const missing = createEvidenceRecord(
  {
    id: "missing",
    owner: "fixture:missing",
    file: "docs/metrics/missing-latest.json",
    appliesTo: ["webCandidate"],
    required: true,
    capturedAt: null,
    maxAgeMs: HOUR,
    reportedState: "ready",
    reason: "fixture should fail closed",
  },
  NOW,
);
assert.equal(missing.freshnessStatus, "unavailable");
assert.equal(missing.state, "unavailable");

const malformedSchemaRollup = buildReadinessRollup({
  now: NOW,
  metrics: {
    githubSecurity: {
      file: "docs/metrics/github-security-posture-latest.json",
      data: {
        schemaVersion: "wrong-schema",
        capturedAt: "2026-08-11T11:00:00.000Z",
        ready: true,
        zeroOpen: true,
      },
    },
    dependencyPosture: { file: "dependency", data: null },
    infraHardening: { file: "infra", data: null },
    releaseDiagnostics: { file: "release", data: null },
    dockerReleaseProof: { file: "docker", data: null },
    webStagingAssurance: { file: "assurance", data: null },
    protectedActionProof: {
      file: "protected-action",
      data: {
        schemaVersion: "wrong-schema",
        capturedAt: "2026-08-11T11:00:00.000Z",
        expiresAt: "2026-08-12T11:00:00.000Z",
        targetId: "staging-aaaaaaaaaaaaaaaa",
        protectedActionReady: true,
        method: "GET",
        route: "/api/capability-assurance",
        blockers: [],
        receipt: {},
      },
    },
    knownGoodDeployment: { file: "known-good", data: null },
    rollbackProof: { file: "rollback", data: null },
    desktopTrustChain: { file: "desktop", data: null },
    desktopSigning: { file: "signing", data: null },
    phoneAcceptance: { file: "phone", data: null },
    dependencyAudit: { file: "audit", data: null },
    agentRuntime: { file: "agent", data: null },
    runtimeExperiment: { file: "experiment", data: null },
  },
  checks: {
    publicationSafety: { ok: true, summary: "ok" },
    capabilityAssurance: { ok: true, summary: "ok" },
    liveFeedReliability: { ok: true, summary: "ok" },
  },
});
const malformedSecurity =
  malformedSchemaRollup.lanes.webCandidate.evidence.find(
    (entry) => entry.id === "github-security-posture",
  );
assert.equal(malformedSecurity.state, "unavailable");
assert.match(malformedSecurity.reason, /schema/i);
const malformedProtectedAction =
  malformedSchemaRollup.lanes.webCandidate.evidence.find(
    (entry) => entry.id === "protected-action-proof",
  );
assert.equal(malformedProtectedAction.state, "unavailable");
assert.match(malformedProtectedAction.reason, /schema/i);

const identity = {
  sourceCommit: "5".repeat(40),
  releaseTag: "v1.0.0-rc.2",
  imageDigest: `sha256:${"a".repeat(64)}`,
  deploymentId: "deployment-readiness-fixture",
  environmentSchemaVersion: "nexus-runtime-env.v1",
  deploymentProfile: "web-self-hosted",
};
const protectedRunId = "qa-readiness-proof";
const protectedReceipt = {
  schemaVersion: "capability-assurance.v1",
  id: "receipt-qa-readiness-proof-1786474740000",
  runId: protectedRunId,
  capabilityId: "archive-continuity",
  actionId: "remove-temporary-qa-evidence",
  mode: "action",
  status: "verified",
  approvalRequired: true,
  verificationRequired: true,
  verificationPassed: true,
  finishedAt: "2026-08-11T10:59:00.000Z",
  provenance: "server_protected_action",
  approvalGranted: true,
  proofSignature: null,
  serverProofVerified: true,
};
protectedReceipt.proofSignature = signCapabilityProtectedActionReceipt(
  protectedReceipt,
  EVIDENCE_KEY,
);
const protectedProofData = {
  schemaVersion: "nexus-protected-action-proof.v1",
  capturedAt: "2026-08-11T11:00:00.000Z",
  expiresAt: "2026-08-12T11:00:00.000Z",
  targetId: "staging-bbbbbbbbbbbbbbbb",
  evidenceMaxAgeMs: 24 * HOUR,
  method: "GET",
  route: "/api/capability-assurance",
  runId: protectedRunId,
  request: {
    status: 200,
    durationMs: 10,
    responseBytes: 2048,
    bodyWithinLimit: true,
    validJson: true,
  },
  blockers: [],
  receipt: protectedReceipt,
  protectedActionReady: true,
  envelopeSignature: null,
};
protectedProofData.envelopeSignature = signProtectedActionProofEnvelope(
  protectedProofData,
  EVIDENCE_KEY,
);
const mismatchedTargetMetrics = {
  githubSecurity: { file: "security", data: null },
  dependencyPosture: { file: "dependency", data: null },
  infraHardening: { file: "infra", data: null },
  releaseDiagnostics: {
    file: "release",
    data: {
      schemaVersion: "nexus-release-diagnostics.v1",
      capturedAt: "2026-08-11T10:58:30.000Z",
      expiresAt: "2026-08-12T10:58:30.000Z",
      releaseProofReady: true,
      target: { targetId: "staging-aaaaaaaaaaaaaaaa" },
      identity: {
        expectedSourceCommit: identity.sourceCommit,
        expectedReleaseTag: ACTIVE_RELEASE_CANDIDATE_TAG,
        passed: false,
        actual: identity,
      },
    },
  },
  dockerReleaseProof: { file: "docker", data: null },
  webStagingAssurance: {
    file: "assurance",
    data: {
      schemaVersion: "nexus-web-staging-assurance.v1",
      capturedAt: "2026-08-11T11:00:30.000Z",
      expiresAt: "2026-08-12T11:00:30.000Z",
      targetId: "staging-bbbbbbbbbbbbbbbb",
      categories: {
        health: true,
        auth: true,
        routes: true,
        smoke: true,
        diagnostics: true,
        feeds: true,
        capabilityAssurance: true,
        protectedActions: true,
      },
      probes: {
        protectedAction: {
          schemaVersion: "nexus-protected-action-proof.v1",
          capturedAt: protectedProofData.capturedAt,
          targetId: "staging-bbbbbbbbbbbbbbbb",
          targetMatches: true,
          protectedActionReady: true,
          passed: true,
        },
      },
      assuranceReady: true,
    },
  },
  protectedActionProof: {
    file: "protected-action",
    data: protectedProofData,
  },
  knownGoodDeployment: { file: "known-good", data: null },
  rollbackProof: {
    file: "rollback",
    data: {
      schemaVersion: "nexus-rollback-proof.v1",
      capturedAt: "2026-08-11T11:00:00.000Z",
      expiresAt: "2026-08-12T11:00:00.000Z",
      targetId: "staging-bbbbbbbbbbbbbbbb",
      restoredIdentity: identity,
      rollbackVerified: true,
    },
  },
  desktopTrustChain: { file: "desktop", data: null },
  desktopSigning: { file: "signing", data: null },
  phoneAcceptance: { file: "phone", data: null },
  dependencyAudit: { file: "audit", data: null },
  agentRuntime: { file: "agent", data: null },
  runtimeExperiment: { file: "experiment", data: null },
};
const readinessChecks = {
  publicationSafety: { ok: true, summary: "ok" },
  capabilityAssurance: { ok: true, summary: "ok" },
  liveFeedReliability: { ok: true, summary: "ok" },
};
const mismatchedTargetRollup = buildReadinessRollup({
  now: NOW,
  metrics: mismatchedTargetMetrics,
  checks: {
    ...readinessChecks,
  },
  evidenceKey: EVIDENCE_KEY,
});
for (const id of [
  "web-staging-assurance",
  "protected-action-proof",
  "rollback-proof",
]) {
  assert.equal(
    mismatchedTargetRollup.lanes.webCandidate.evidence.find(
      (entry) => entry.id === id,
    ).state,
    "blocked",
  );
}
assert.equal(
  mismatchedTargetRollup.latestEvidence.releaseDiagnostics.targetId,
  "staging-aaaaaaaaaaaaaaaa",
  "release projection must read target.targetId",
);

const matchingTargetMetrics = structuredClone(mismatchedTargetMetrics);
matchingTargetMetrics.releaseDiagnostics.data.target.targetId =
  "staging-bbbbbbbbbbbbbbbb";
matchingTargetMetrics.releaseDiagnostics.data.target.staged = true;
matchingTargetMetrics.releaseDiagnostics.data.identity.passed = true;
matchingTargetMetrics.dockerReleaseProof = {
  file: "docker",
  data: {
    schemaVersion: "nexus-docker-release-proof.v1",
    generatedAt: "2026-08-11T10:59:30.000Z",
    proofReady: true,
    source: {
      tag: ACTIVE_RELEASE_CANDIDATE_TAG,
      resolvedCommit: identity.sourceCommit,
      tagObjectId: "6".repeat(40),
      ready: true,
    },
  },
};
matchingTargetMetrics.releaseDiagnostics.data.routes = [
  {
    route: "/api/diagnostics",
    body: { runtime: { bootId: "boot-readiness-restored" } },
  },
];
const knownGoodReceipt = {
  ...protectedReceipt,
  id: "receipt-qa-readiness-known-good-1786474230000",
  runId: "qa-readiness-known-good",
  finishedAt: "2026-08-11T10:50:30.000Z",
  proofSignature: null,
};
knownGoodReceipt.proofSignature = signCapabilityProtectedActionReceipt(
  knownGoodReceipt,
  EVIDENCE_KEY,
);
const knownGoodProtectedProof = {
  ...protectedProofData,
  capturedAt: "2026-08-11T10:51:00.000Z",
  expiresAt: "2026-08-12T10:51:00.000Z",
  runId: knownGoodReceipt.runId,
  receipt: knownGoodReceipt,
  envelopeSignature: null,
};
knownGoodProtectedProof.envelopeSignature = signProtectedActionProofEnvelope(
  knownGoodProtectedProof,
  EVIDENCE_KEY,
);
const knownGoodDiagnostics = {
  schemaVersion: "nexus-release-diagnostics.v1",
  capturedAt: "2026-08-11T10:50:00.000Z",
  expiresAt: "2026-08-12T10:50:00.000Z",
  target: {
    targetId: "staging-bbbbbbbbbbbbbbbb",
    staged: true,
  },
  identity: { passed: true, actual: identity },
  routes: [
    {
      route: "/api/diagnostics",
      body: { runtime: { bootId: "boot-readiness-known-good" } },
    },
  ],
  releaseProofReady: true,
  blocked: [],
};
const knownGoodAssurance = {
  schemaVersion: "nexus-web-staging-assurance.v1",
  capturedAt: "2026-08-11T10:51:30.000Z",
  expiresAt: "2026-08-12T10:51:30.000Z",
  targetId: "staging-bbbbbbbbbbbbbbbb",
  categories: {
    health: true,
    auth: true,
    routes: true,
    smoke: true,
    diagnostics: true,
    feeds: true,
    capabilityAssurance: true,
    protectedActions: true,
  },
  probes: {
    protectedAction: {
      schemaVersion: "nexus-protected-action-proof.v1",
      capturedAt: knownGoodProtectedProof.capturedAt,
      targetId: knownGoodProtectedProof.targetId,
      targetMatches: true,
      protectedActionReady: true,
      passed: true,
    },
  },
  assuranceReady: true,
  blocked: [],
};
const signedKnownGood = buildKnownGoodDeployment({
  diagnostics: knownGoodDiagnostics,
  assurance: knownGoodAssurance,
  protectedActionProof: knownGoodProtectedProof,
  now: new Date("2026-08-11T10:52:00.000Z"),
  evidenceKey: EVIDENCE_KEY,
});
assert.equal(signedKnownGood.ready, true);
matchingTargetMetrics.knownGoodDeployment.data = JSON.parse(
  JSON.stringify(signedKnownGood),
);
matchingTargetMetrics.rollbackProof.data = buildRollbackProof({
  knownGood: matchingTargetMetrics.knownGoodDeployment.data,
  diagnostics: matchingTargetMetrics.releaseDiagnostics.data,
  assurance: matchingTargetMetrics.webStagingAssurance.data,
  protectedActionProof: protectedProofData,
  rollbackStartedAt: "2026-08-11T10:58:00.000Z",
  confirmation: ROLLBACK_CONFIRMATION,
  now: new Date("2026-08-11T11:01:00.000Z"),
  evidenceKey: EVIDENCE_KEY,
});
matchingTargetMetrics.rollbackProof.data = JSON.parse(
  JSON.stringify(matchingTargetMetrics.rollbackProof.data),
);
assert.equal(matchingTargetMetrics.rollbackProof.data.rollbackVerified, true);
const matchingTargetRollup = buildReadinessRollup({
  now: NOW,
  metrics: matchingTargetMetrics,
  checks: readinessChecks,
  evidenceKey: EVIDENCE_KEY,
});
for (const id of [
  "release-diagnostics",
  "docker-release-proof",
  "web-staging-assurance",
  "protected-action-proof",
  "rollback-proof",
]) {
  assert.equal(
    matchingTargetRollup.lanes.webCandidate.evidence.find(
      (entry) => entry.id === id,
    ).state,
    "ready",
  );
}
assert.deepEqual(evaluateReleaseCandidateCorrelation(matchingTargetMetrics), {
  tag: ACTIVE_RELEASE_CANDIDATE_TAG,
  sourceCommit: identity.sourceCommit,
  diagnosticsMatches: true,
  dockerMatches: true,
  ready: true,
});

const staleRc1Metrics = structuredClone(matchingTargetMetrics);
staleRc1Metrics.releaseDiagnostics.data.identity.expectedReleaseTag =
  "v1.0.0-rc.1";
staleRc1Metrics.releaseDiagnostics.data.identity.actual.releaseTag =
  "v1.0.0-rc.1";
staleRc1Metrics.dockerReleaseProof.data.source.tag = "v1.0.0-rc.1";
const staleRc1Rollup = buildReadinessRollup({
  now: NOW,
  metrics: staleRc1Metrics,
  checks: readinessChecks,
  evidenceKey: EVIDENCE_KEY,
});
assert.equal(staleRc1Rollup.candidateIdentity.ready, false);
assert.equal(
  staleRc1Rollup.lanes.webCandidate.evidence.find(
    (entry) => entry.id === "release-diagnostics",
  ).state,
  "blocked",
);
assert.equal(
  staleRc1Rollup.lanes.webCandidate.evidence.find(
    (entry) => entry.id === "docker-release-proof",
  ).state,
  "blocked",
);
assert.equal(
  staleRc1Rollup.lanes.webCandidate.evidence.find(
    (entry) => entry.id === "web-staging-assurance",
  ).state,
  "blocked",
);

const cp2FullChain = createRollbackPosture({
  rollbackArtifact: matchingTargetMetrics.rollbackProof.data,
  targetId: "staging-bbbbbbbbbbbbbbbb",
  diagnosticsIdentity: identity,
  diagnostics: matchingTargetMetrics.releaseDiagnostics.data,
  assurance: matchingTargetMetrics.webStagingAssurance.data,
  knownGood: matchingTargetMetrics.knownGoodDeployment.data,
  protectedActionProof: matchingTargetMetrics.protectedActionProof.data,
  evidenceKey: EVIDENCE_KEY,
  now: new Date(NOW),
});
assert.equal(cp2FullChain.verified, true);

const noKeyRollup = buildReadinessRollup({
  now: NOW,
  metrics: matchingTargetMetrics,
  checks: readinessChecks,
  evidenceKey: "",
});
assert.equal(
  noKeyRollup.lanes.webCandidate.evidence.find(
    (entry) => entry.id === "protected-action-proof",
  ).state,
  "blocked",
);
assert.equal(
  noKeyRollup.lanes.webCandidate.evidence.find(
    (entry) => entry.id === "rollback-proof",
  ).state,
  "blocked",
);

const tamperedKnownGoodMetrics = structuredClone(matchingTargetMetrics);
tamperedKnownGoodMetrics.knownGoodDeployment.data.runtime.bootId =
  "boot-readiness-tampered";
const tamperedKnownGoodRollup = buildReadinessRollup({
  now: NOW,
  metrics: tamperedKnownGoodMetrics,
  checks: readinessChecks,
  evidenceKey: EVIDENCE_KEY,
});
assert.equal(
  tamperedKnownGoodRollup.lanes.webCandidate.evidence.find(
    (entry) => entry.id === "rollback-proof",
  ).state,
  "blocked",
);
assert.equal(
  createRollbackPosture({
    rollbackArtifact: tamperedKnownGoodMetrics.rollbackProof.data,
    targetId: "staging-bbbbbbbbbbbbbbbb",
    diagnosticsIdentity: identity,
    diagnostics: tamperedKnownGoodMetrics.releaseDiagnostics.data,
    assurance: tamperedKnownGoodMetrics.webStagingAssurance.data,
    knownGood: tamperedKnownGoodMetrics.knownGoodDeployment.data,
    protectedActionProof: tamperedKnownGoodMetrics.protectedActionProof.data,
    evidenceKey: EVIDENCE_KEY,
    now: new Date(NOW),
  }).verified,
  false,
);

const unsignedRollbackMetrics = structuredClone(matchingTargetMetrics);
unsignedRollbackMetrics.rollbackProof.data.envelopeSignature = null;
const unsignedRollbackRollup = buildReadinessRollup({
  now: NOW,
  metrics: unsignedRollbackMetrics,
  checks: readinessChecks,
  evidenceKey: EVIDENCE_KEY,
});
assert.equal(
  unsignedRollbackRollup.lanes.webCandidate.evidence.find(
    (entry) => entry.id === "rollback-proof",
  ).state,
  "blocked",
);

const tamperedRollbackMetrics = structuredClone(matchingTargetMetrics);
tamperedRollbackMetrics.rollbackProof.data.operatorConfirmedPlatformRollback = false;
const tamperedRollbackRollup = buildReadinessRollup({
  now: NOW,
  metrics: tamperedRollbackMetrics,
  checks: readinessChecks,
  evidenceKey: EVIDENCE_KEY,
});
assert.equal(
  tamperedRollbackRollup.lanes.webCandidate.evidence.find(
    (entry) => entry.id === "rollback-proof",
  ).state,
  "blocked",
);

const staleProtectedActionMetrics = structuredClone(matchingTargetMetrics);
staleProtectedActionMetrics.protectedActionProof.data.capturedAt =
  "2026-08-09T11:00:00.000Z";
staleProtectedActionMetrics.protectedActionProof.data.expiresAt =
  "2026-08-10T11:00:00.000Z";
const staleProtectedActionRollup = buildReadinessRollup({
  now: NOW,
  metrics: staleProtectedActionMetrics,
  checks: readinessChecks,
  evidenceKey: EVIDENCE_KEY,
});
assert.equal(
  staleProtectedActionRollup.lanes.webCandidate.evidence.find(
    (entry) => entry.id === "protected-action-proof",
  ).state,
  "stale",
);

const dockerBlockedLane = buildReadinessLane({
  id: "webCandidate",
  label: "Web candidate (v1.0.0-rc.2)",
  evidence: [
    evidence("docker-release-proof", "blocked", { nextAction: undefined }),
  ],
});
assert.equal(
  dockerBlockedLane.strongestSafeNextAction.command,
  "npm run staging:docker:preflight",
);

const webLane = buildReadinessLane({
  id: "webCandidate",
  label: "Web candidate (v1.0.0-rc.2)",
  evidence: [evidence("web-proof")],
});
const desktopLane = buildReadinessLane({
  id: "desktop",
  label: "Desktop",
  evidence: [
    evidence("desktop-signing", "blocked", { appliesTo: ["desktop"] }),
  ],
});
const phoneLane = buildReadinessLane({
  id: "phonePwa",
  label: "Phone/PWA",
  evidence: [
    evidence("phone-acceptance", "stale", { appliesTo: ["phonePwa"] }),
  ],
});
assert.equal(webLane.status, "ready", "phone and desktop must not block web");
assert.equal(desktopLane.status, "blocked");
assert.equal(phoneLane.status, "stale");

const sharedBlocker = evidence("publication-safety", "blocked", {
  appliesTo: ["webCandidate", "desktop", "phonePwa"],
});
for (const [id, label] of [
  ["webCandidate", "Web candidate (v1.0.0-rc.2)"],
  ["desktop", "Desktop"],
  ["phonePwa", "Phone/PWA"],
]) {
  const lane = buildReadinessLane({
    id,
    label,
    evidence: [sharedBlocker],
  });
  assert.equal(lane.status, "blocked", `shared blocker must reach ${id}`);
}

const precedence = buildReadinessLane({
  id: "webCandidate",
  label: "Web candidate (v1.0.0-rc.2)",
  evidence: [
    evidence("degraded", "degraded"),
    evidence("approval", "approval-required"),
    missing,
  ],
});
assert.equal(precedence.status, "unavailable");
assert.equal(precedence.strongestSafeNextAction.id, "inspect-missing-evidence");
assert.equal(precedence.strongestSafeNextAction.requiresApproval, false);

const sanitized = sanitizeForArtifact({
  baseUrl: "https://private-stage.example.internal",
  authorization: "Bearer abcdefghijklmnop",
  note: "token='super-secret-value'",
});
const serialized = JSON.stringify(sanitized);
assert.equal(serialized.includes("private-stage.example.internal"), false);
assert.equal(serialized.includes("abcdefghijklmnop"), false);
assert.equal(serialized.includes("super-secret-value"), false);

console.log(
  "Readiness rollup runtime OK (seven states, expiry, active-candidate tag/commit correlation with stale-RC1 rejection, serialized signed rollback chain, no-key/tamper rejection, lane isolation, safe action ranking, and sanitization).",
);
