#!/usr/bin/env node
/* eslint-disable no-console */

import assert from "node:assert/strict";
import {
  ROLLBACK_CONFIRMATION,
  buildKnownGoodDeployment,
  buildRollbackProof,
  classifyKnownGoodWrite,
  validateKnownGoodDeploymentArtifact,
  validateRollbackProofArtifact,
} from "./staging-rollback-proof.mjs";
import { buildWebStagingAssuranceArtifact } from "./web-staging-assurance.mjs";
import { signCapabilityProtectedActionReceipt } from "../lib/capabilityProtectedActionReceipt.mjs";
import { signProtectedActionProofEnvelope } from "./staging-protected-action-proof.mjs";
import {
  signKnownGoodEnvelope,
  signRollbackProofEnvelope,
} from "./rollback-proof-signature.mjs";

const sourceCommit = "7".repeat(40);
const imageDigest = `sha256:${"a".repeat(64)}`;
const targetId = "staging-0123456789abcdef";
const startedAt = "2026-08-12T05:00:00.000Z";
const finishedAt = "2026-08-12T05:04:00.000Z";
const evidenceKey = "fixture-private-evidence-key";
const protectedRunId = "qa-rollback-producer-proof";
const protectedReceipt = {
  schemaVersion: "capability-assurance.v1",
  id: "receipt-qa-rollback-producer-proof-1786510950000",
  runId: protectedRunId,
  capabilityId: "archive-continuity",
  actionId: "remove-temporary-qa-evidence",
  finishedAt: "2026-08-12T05:03:15.000Z",
  mode: "action",
  status: "verified",
  approvalRequired: true,
  verificationRequired: true,
  verificationPassed: true,
  provenance: "server_protected_action",
  approvalGranted: true,
  proofSignature: null,
  serverProofVerified: true,
};
protectedReceipt.proofSignature = signCapabilityProtectedActionReceipt(
  protectedReceipt,
  evidenceKey,
);
const protectedActionProof = {
  schemaVersion: "nexus-protected-action-proof.v1",
  capturedAt: "2026-08-12T05:03:30.000Z",
  expiresAt: "2026-08-13T05:03:30.000Z",
  evidenceMaxAgeMs: 24 * 60 * 60 * 1000,
  targetId,
  route: "/api/capability-assurance",
  method: "GET",
  runId: protectedRunId,
  request: {
    status: 200,
    durationMs: 10,
    responseBytes: 2048,
    bodyWithinLimit: true,
    validJson: true,
  },
  receipt: protectedReceipt,
  protectedActionReady: true,
  blockers: [],
  envelopeSignature: null,
};
protectedActionProof.envelopeSignature = signProtectedActionProofEnvelope(
  protectedActionProof,
  evidenceKey,
);

function diagnostics(overrides = {}) {
  return {
    schemaVersion: "nexus-release-diagnostics.v1",
    capturedAt: "2026-08-12T05:03:00.000Z",
    expiresAt: "2026-08-13T05:03:00.000Z",
    evidenceMaxAgeMs: 24 * 60 * 60 * 1000,
    target: { kind: "staged", staged: true, targetId },
    identity: {
      passed: true,
      actual: {
        sourceCommit,
        releaseTag: "v1.0.0-rc.2",
        imageDigest,
        deploymentId: "deployment-fedcba9876543210",
        environmentSchemaVersion: "nexus-runtime-env.v1",
        deploymentProfile: "web-self-hosted",
      },
    },
    routes: [
      {
        route: "/api/diagnostics",
        body: { runtime: { bootId: "boot-fixture-known-good" } },
      },
    ],
    diagnosticsReady: true,
    releaseProofReady: true,
    blocked: [],
    ...overrides,
  };
}

function assurance(overrides = {}) {
  return {
    schemaVersion: "nexus-web-staging-assurance.v1",
    capturedAt: "2026-08-12T05:03:45.000Z",
    expiresAt: "2026-08-13T05:03:45.000Z",
    targetId,
    assuranceReady: true,
    checks: {
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
        available: true,
        schemaVersion: "nexus-protected-action-proof.v1",
        capturedAt: "2026-08-12T05:03:30.000Z",
        targetId,
        targetMatches: true,
        protectedActionReady: true,
        passed: true,
      },
    },
    blocked: [],
    ...overrides,
  };
}

const knownGood = buildKnownGoodDeployment({
  diagnostics: diagnostics(),
  assurance: assurance(),
  protectedActionProof,
  now: new Date("2026-08-12T05:04:00.000Z"),
  evidenceKey,
});
assert.equal(knownGood.ready, true);
assert.equal(knownGood.identity.sourceCommit, sourceCommit);
assert.equal(knownGood.identity.imageDigest, imageDigest);
assert.equal(knownGood.runtime.bootId, "boot-fixture-known-good");
assert.equal(JSON.stringify(knownGood).includes("example.test"), false);
assert.equal(
  validateKnownGoodDeploymentArtifact({
    proof: knownGood,
    capturedAt: new Date("2026-08-12T05:04:00.000Z"),
    evidenceKey,
  }).passed,
  true,
);
assert.equal(classifyKnownGoodWrite(null).allowed, true);
assert.equal(classifyKnownGoodWrite(knownGood).allowed, false);
assert.equal(classifyKnownGoodWrite({ unreadable: true }).allowed, false);

const expiredKnownGoodInput = buildKnownGoodDeployment({
  diagnostics: diagnostics({ expiresAt: "2026-08-12T05:03:59.000Z" }),
  assurance: assurance(),
  protectedActionProof,
  now: new Date("2026-08-12T05:04:00.000Z"),
  evidenceKey,
});
assert.equal(expiredKnownGoodInput.ready, false);
assert.match(expiredKnownGoodInput.blocked.join(" "), /fresh/i);

const futureKnownGoodInput = buildKnownGoodDeployment({
  diagnostics: diagnostics({ capturedAt: "2026-08-12T05:05:00.000Z" }),
  assurance: assurance(),
  protectedActionProof,
  now: new Date("2026-08-12T05:04:00.000Z"),
  evidenceKey,
});
assert.equal(futureKnownGoodInput.ready, false);
assert.match(futureKnownGoodInput.blocked.join(" "), /fresh/i);

const wrongSchemaKnownGoodInput = buildKnownGoodDeployment({
  diagnostics: diagnostics({ schemaVersion: "wrong-schema" }),
  assurance: assurance(),
  protectedActionProof,
  now: new Date("2026-08-12T05:04:00.000Z"),
  evidenceKey,
});
assert.equal(wrongSchemaKnownGoodInput.ready, false);
assert.match(wrongSchemaKnownGoodInput.blocked.join(" "), /schema/i);

const staleCapturedKnownGoodInput = buildKnownGoodDeployment({
  diagnostics: diagnostics({
    capturedAt: "2026-08-10T04:59:00.000Z",
    expiresAt: "2026-08-12T05:04:00.000Z",
  }),
  assurance: assurance(),
  protectedActionProof,
  now: new Date("2026-08-12T05:04:00.000Z"),
  evidenceKey,
});
assert.equal(staleCapturedKnownGoodInput.ready, false);
assert.match(staleCapturedKnownGoodInput.blocked.join(" "), /fresh/i);

const overlongExpiryKnownGoodInput = buildKnownGoodDeployment({
  diagnostics: diagnostics({ expiresAt: "2026-08-14T05:03:00.000Z" }),
  assurance: assurance(),
  protectedActionProof,
  now: new Date("2026-08-12T05:04:00.000Z"),
  evidenceKey,
});
assert.equal(overlongExpiryKnownGoodInput.ready, false);
assert.match(overlongExpiryKnownGoodInput.blocked.join(" "), /fresh/i);

const tamperedKnownGood = structuredClone(knownGood);
tamperedKnownGood.runtime.bootId = "boot-tampered-known-good";
assert.equal(
  validateKnownGoodDeploymentArtifact({
    proof: tamperedKnownGood,
    capturedAt: new Date("2026-08-12T05:04:00.000Z"),
    evidenceKey,
  }).passed,
  false,
);

const incompleteKnownGood = structuredClone(knownGood);
for (const key of [
  "releaseTag",
  "deploymentId",
  "environmentSchemaVersion",
  "deploymentProfile",
]) {
  delete incompleteKnownGood.identity[key];
  delete incompleteKnownGood.sourceEvidence.diagnostics.identity[key];
}
incompleteKnownGood.envelopeSignature = null;
incompleteKnownGood.envelopeSignature = signKnownGoodEnvelope(
  incompleteKnownGood,
  evidenceKey,
);
assert.equal(
  validateKnownGoodDeploymentArtifact({
    proof: incompleteKnownGood,
    capturedAt: new Date("2026-08-12T05:04:00.000Z"),
    evidenceKey,
  }).passed,
  false,
);

const mismatchedKnownGoodIdentity = structuredClone(knownGood);
mismatchedKnownGoodIdentity.sourceEvidence.diagnostics.identity.releaseTag =
  "v9.0.0";
mismatchedKnownGoodIdentity.envelopeSignature = null;
mismatchedKnownGoodIdentity.envelopeSignature = signKnownGoodEnvelope(
  mismatchedKnownGoodIdentity,
  evidenceKey,
);
assert.equal(
  validateKnownGoodDeploymentArtifact({
    proof: mismatchedKnownGoodIdentity,
    capturedAt: new Date("2026-08-12T05:04:00.000Z"),
    evidenceKey,
  }).passed,
  false,
);

const producerArtifact = buildWebStagingAssuranceArtifact({
  capturedAt: new Date("2026-08-12T05:03:30.000Z"),
  target: { targetId },
  evidenceKey,
  tokenConfigured: true,
  externalChecks: {
    runtimeConsistency: { passed: true },
    releaseDiagnostics: { passed: true },
  },
  diagnosticsEvidence: {
    diagnosticsReady: true,
    releaseProofReady: true,
    routes: [{ route: "/api/health", ok: true }],
  },
  healthProbe: { route: "/api/health", passed: true },
  unauthenticatedProtectedProbe: {
    route: "/api/capability-assurance",
    passed: true,
  },
  capabilityProbe: {
    route: "/api/capability-assurance",
    passed: true,
    shapePassed: true,
  },
  protectedActionProof,
  feedProbes: [
    "/api/cves",
    "/api/earthquakes",
    "/api/defi",
    "/api/hacker-news",
    "/api/threat-intel",
    "/api/news",
    "/api/sec-filings",
    "/api/conflict",
  ].map((route) => ({ route, passed: true, shapePassed: true })),
  mutatingMethodsUsed: [],
});
const producerConsumerKnownGood = buildKnownGoodDeployment({
  diagnostics: diagnostics(),
  assurance: producerArtifact,
  protectedActionProof,
  now: new Date("2026-08-12T05:04:00.000Z"),
  evidenceKey,
});
assert.equal(producerConsumerKnownGood.ready, true);

const missingAssurance = buildKnownGoodDeployment({
  diagnostics: diagnostics(),
  assurance: null,
  protectedActionProof,
  now: new Date("2026-08-12T05:04:00.000Z"),
  evidenceKey,
});
assert.equal(missingAssurance.ready, false);
assert.match(missingAssurance.blocked.join(" "), /assurance/i);

const missingRuntimeIdentity = buildKnownGoodDeployment({
  diagnostics: diagnostics({ routes: [] }),
  assurance: assurance(),
  protectedActionProof,
  now: new Date("2026-08-12T05:04:00.000Z"),
  evidenceKey,
});
assert.equal(missingRuntimeIdentity.ready, false);
assert.match(missingRuntimeIdentity.blocked.join(" "), /boot/i);

const unconfirmed = buildRollbackProof({
  knownGood,
  diagnostics: diagnostics(),
  assurance: assurance(),
  protectedActionProof,
  rollbackStartedAt: startedAt,
  confirmation: "",
  now: new Date(finishedAt),
  evidenceKey,
});
assert.equal(unconfirmed.rollbackVerified, false);
assert.equal(unconfirmed.knownGoodMatch, true);
assert.equal(unconfirmed.postRollbackChecksPassed, true);
assert.match(unconfirmed.blocked.join(" "), /confirmation/i);

const verified = buildRollbackProof({
  knownGood,
  diagnostics: diagnostics({
    routes: [
      {
        route: "/api/diagnostics",
        body: { runtime: { bootId: "boot-fixture-restored" } },
      },
    ],
  }),
  assurance: assurance(),
  protectedActionProof,
  rollbackStartedAt: startedAt,
  confirmation: ROLLBACK_CONFIRMATION,
  now: new Date(finishedAt),
  evidenceKey,
});
assert.equal(verified.rollbackVerified, true);
assert.equal(verified.knownGoodMatch, true);
assert.equal(verified.postRollbackChecksPassed, true);
assert.equal(verified.recoveryDurationMs, 240_000);
assert.equal(verified.restoredRuntime.bootId, "boot-fixture-restored");
assert.equal(verified.restoredRuntime.restartObserved, true);
const verifiedValidation = validateRollbackProofArtifact({
  proof: verified,
  knownGood,
  diagnostics: diagnostics({
    routes: [
      {
        route: "/api/diagnostics",
        body: { runtime: { bootId: "boot-fixture-restored" } },
      },
    ],
  }),
  assurance: assurance(),
  protectedActionProof,
  targetId,
  sourceCommit,
  imageDigest,
  capturedAt: new Date(finishedAt),
  evidenceKey,
});
assert.equal(verifiedValidation.passed, true);
assert.equal(verifiedValidation.signedEnvelope, true);

const unsignedShapePerfect = structuredClone(verified);
unsignedShapePerfect.envelopeSignature = null;
assert.equal(
  validateRollbackProofArtifact({
    proof: unsignedShapePerfect,
    knownGood,
    diagnostics: diagnostics({
      routes: [
        {
          route: "/api/diagnostics",
          body: { runtime: { bootId: "boot-fixture-restored" } },
        },
      ],
    }),
    assurance: assurance(),
    protectedActionProof,
    targetId,
    sourceCommit,
    imageDigest,
    capturedAt: new Date(finishedAt),
    evidenceKey,
  }).passed,
  false,
);

const tamperedRollback = structuredClone(verified);
tamperedRollback.operatorConfirmedPlatformRollback = false;
assert.equal(
  validateRollbackProofArtifact({
    proof: tamperedRollback,
    knownGood,
    diagnostics: diagnostics({
      routes: [
        {
          route: "/api/diagnostics",
          body: { runtime: { bootId: "boot-fixture-restored" } },
        },
      ],
    }),
    assurance: assurance(),
    protectedActionProof,
    targetId,
    sourceCommit,
    imageDigest,
    capturedAt: new Date(finishedAt),
    evidenceKey,
  }).passed,
  false,
);

const restoredRuntimeForgery = structuredClone(verified);
restoredRuntimeForgery.restoredRuntime.bootId = "boot-attacker-invented";
restoredRuntimeForgery.envelopeSignature = null;
restoredRuntimeForgery.envelopeSignature = signRollbackProofEnvelope(
  restoredRuntimeForgery,
  evidenceKey,
);
assert.equal(
  validateRollbackProofArtifact({
    proof: restoredRuntimeForgery,
    knownGood,
    diagnostics: diagnostics({
      routes: [
        {
          route: "/api/diagnostics",
          body: { runtime: { bootId: "boot-fixture-restored" } },
        },
      ],
    }),
    assurance: assurance(),
    protectedActionProof,
    targetId,
    sourceCommit,
    imageDigest,
    capturedAt: new Date(finishedAt),
    evidenceKey,
  }).passed,
  false,
);

const failedCurrentDiagnostics = diagnostics({
  releaseProofReady: false,
  identity: { ...diagnostics().identity, passed: false },
  routes: [
    {
      route: "/api/diagnostics",
      body: { runtime: { bootId: "boot-fixture-restored" } },
    },
  ],
});
const forgedFailedCurrentProof = buildRollbackProof({
  knownGood,
  diagnostics: failedCurrentDiagnostics,
  assurance: assurance(),
  protectedActionProof,
  rollbackStartedAt: startedAt,
  confirmation: ROLLBACK_CONFIRMATION,
  now: new Date(finishedAt),
  evidenceKey,
});
forgedFailedCurrentProof.postRollbackChecksPassed = true;
forgedFailedCurrentProof.rollbackVerified = true;
forgedFailedCurrentProof.blocked = [];
forgedFailedCurrentProof.envelopeSignature = null;
forgedFailedCurrentProof.envelopeSignature = signRollbackProofEnvelope(
  forgedFailedCurrentProof,
  evidenceKey,
);
assert.equal(
  validateRollbackProofArtifact({
    proof: forgedFailedCurrentProof,
    knownGood,
    diagnostics: failedCurrentDiagnostics,
    assurance: assurance(),
    protectedActionProof,
    targetId,
    sourceCommit,
    imageDigest,
    capturedAt: new Date(finishedAt),
    evidenceKey,
  }).passed,
  false,
);

const incompleteRestoredDiagnostics = diagnostics({
  identity: {
    passed: true,
    actual: {
      sourceCommit,
      releaseTag: null,
      imageDigest,
      deploymentId: null,
      environmentSchemaVersion: null,
      deploymentProfile: null,
    },
  },
  routes: [
    {
      route: "/api/diagnostics",
      body: { runtime: { bootId: "boot-fixture-restored" } },
    },
  ],
});
const forgedIncompleteIdentityProof = buildRollbackProof({
  knownGood,
  diagnostics: incompleteRestoredDiagnostics,
  assurance: assurance(),
  protectedActionProof,
  rollbackStartedAt: startedAt,
  confirmation: ROLLBACK_CONFIRMATION,
  now: new Date(finishedAt),
  evidenceKey,
});
forgedIncompleteIdentityProof.knownGoodMatch = true;
forgedIncompleteIdentityProof.postRollbackChecksPassed = true;
forgedIncompleteIdentityProof.rollbackVerified = true;
forgedIncompleteIdentityProof.blocked = [];
forgedIncompleteIdentityProof.envelopeSignature = null;
forgedIncompleteIdentityProof.envelopeSignature = signRollbackProofEnvelope(
  forgedIncompleteIdentityProof,
  evidenceKey,
);
assert.equal(
  validateRollbackProofArtifact({
    proof: forgedIncompleteIdentityProof,
    knownGood,
    diagnostics: incompleteRestoredDiagnostics,
    assurance: assurance(),
    protectedActionProof,
    targetId,
    sourceCommit,
    imageDigest,
    capturedAt: new Date(finishedAt),
    evidenceKey,
  }).passed,
  false,
);

const otherTargetId = "staging-fedcba9876543210";
const mismatchedTargetDiagnostics = diagnostics({
  target: { kind: "staged", staged: false, targetId: otherTargetId },
  routes: [
    {
      route: "/api/diagnostics",
      body: { runtime: { bootId: "boot-fixture-restored" } },
    },
  ],
});
const mismatchedTargetAssurance = assurance({ targetId: otherTargetId });
const forgedMismatchedTargetProof = buildRollbackProof({
  knownGood,
  diagnostics: mismatchedTargetDiagnostics,
  assurance: mismatchedTargetAssurance,
  protectedActionProof,
  rollbackStartedAt: startedAt,
  confirmation: ROLLBACK_CONFIRMATION,
  now: new Date(finishedAt),
  evidenceKey,
});
forgedMismatchedTargetProof.postRollbackChecksPassed = true;
forgedMismatchedTargetProof.rollbackVerified = true;
forgedMismatchedTargetProof.blocked = [];
forgedMismatchedTargetProof.envelopeSignature = null;
forgedMismatchedTargetProof.envelopeSignature = signRollbackProofEnvelope(
  forgedMismatchedTargetProof,
  evidenceKey,
);
assert.equal(
  validateRollbackProofArtifact({
    proof: forgedMismatchedTargetProof,
    knownGood,
    diagnostics: mismatchedTargetDiagnostics,
    assurance: mismatchedTargetAssurance,
    protectedActionProof,
    targetId,
    sourceCommit,
    imageDigest,
    capturedAt: new Date(finishedAt),
    evidenceKey,
  }).passed,
  false,
);

const mismatchedProjectionAssurance = assurance({
  probes: {
    protectedAction: {
      available: true,
      schemaVersion: "nexus-protected-action-proof.v1",
      capturedAt: protectedActionProof.capturedAt,
      targetId,
      targetMatches: true,
      protectedActionReady: false,
      passed: false,
    },
  },
});
const forgedProjectionProof = buildRollbackProof({
  knownGood,
  diagnostics: diagnostics({
    routes: [
      {
        route: "/api/diagnostics",
        body: { runtime: { bootId: "boot-fixture-restored" } },
      },
    ],
  }),
  assurance: mismatchedProjectionAssurance,
  protectedActionProof,
  rollbackStartedAt: startedAt,
  confirmation: ROLLBACK_CONFIRMATION,
  now: new Date(finishedAt),
  evidenceKey,
});
forgedProjectionProof.postRollbackChecksPassed = true;
forgedProjectionProof.rollbackVerified = true;
forgedProjectionProof.blocked = [];
forgedProjectionProof.envelopeSignature = null;
forgedProjectionProof.envelopeSignature = signRollbackProofEnvelope(
  forgedProjectionProof,
  evidenceKey,
);
assert.equal(
  validateRollbackProofArtifact({
    proof: forgedProjectionProof,
    knownGood,
    diagnostics: diagnostics({
      routes: [
        {
          route: "/api/diagnostics",
          body: { runtime: { bootId: "boot-fixture-restored" } },
        },
      ],
    }),
    assurance: mismatchedProjectionAssurance,
    protectedActionProof,
    targetId,
    sourceCommit,
    imageDigest,
    capturedAt: new Date(finishedAt),
    evidenceKey,
  }).passed,
  false,
);

const oldProtectedReceipt = {
  ...protectedReceipt,
  finishedAt: "2026-08-12T04:58:30.000Z",
  proofSignature: null,
};
oldProtectedReceipt.proofSignature = signCapabilityProtectedActionReceipt(
  oldProtectedReceipt,
  evidenceKey,
);
const oldProtectedActionProof = {
  ...protectedActionProof,
  capturedAt: "2026-08-12T04:59:00.000Z",
  expiresAt: "2026-08-13T04:59:00.000Z",
  receipt: oldProtectedReceipt,
  envelopeSignature: null,
};
oldProtectedActionProof.envelopeSignature = signProtectedActionProofEnvelope(
  oldProtectedActionProof,
  evidenceKey,
);
const newAssuranceWithOldProtectedActionProof =
  buildWebStagingAssuranceArtifact({
    capturedAt: new Date("2026-08-12T05:03:30.000Z"),
    target: { targetId },
    evidenceKey,
    tokenConfigured: true,
    externalChecks: {
      runtimeConsistency: { passed: true },
      releaseDiagnostics: { passed: true },
    },
    diagnosticsEvidence: {
      diagnosticsReady: true,
      releaseProofReady: true,
      routes: [{ route: "/api/health", ok: true }],
    },
    healthProbe: { route: "/api/health", passed: true },
    unauthenticatedProtectedProbe: {
      route: "/api/capability-assurance",
      passed: true,
    },
    capabilityProbe: {
      route: "/api/capability-assurance",
      passed: true,
      shapePassed: true,
    },
    protectedActionProof: oldProtectedActionProof,
    feedProbes: [
      "/api/cves",
      "/api/earthquakes",
      "/api/defi",
      "/api/hacker-news",
      "/api/threat-intel",
      "/api/news",
      "/api/sec-filings",
      "/api/conflict",
    ].map((route) => ({ route, passed: true, shapePassed: true })),
    mutatingMethodsUsed: [],
  });
assert.equal(newAssuranceWithOldProtectedActionProof.assuranceReady, true);
const oldProtectedActionAfterRollback = buildRollbackProof({
  knownGood,
  diagnostics: diagnostics({
    routes: [
      {
        route: "/api/diagnostics",
        body: { runtime: { bootId: "boot-fixture-restored" } },
      },
    ],
  }),
  assurance: newAssuranceWithOldProtectedActionProof,
  protectedActionProof: oldProtectedActionProof,
  rollbackStartedAt: startedAt,
  confirmation: ROLLBACK_CONFIRMATION,
  now: new Date(finishedAt),
  evidenceKey,
});
assert.equal(oldProtectedActionAfterRollback.rollbackVerified, false);
assert.equal(oldProtectedActionAfterRollback.postRollbackChecksPassed, false);
assert.match(
  oldProtectedActionAfterRollback.blocked.join(" "),
  /protected-action proof must be captured after rollback started/i,
);

const newProofWithOldReceipt = {
  ...protectedActionProof,
  receipt: oldProtectedReceipt,
  envelopeSignature: null,
};
newProofWithOldReceipt.envelopeSignature = signProtectedActionProofEnvelope(
  newProofWithOldReceipt,
  evidenceKey,
);
const oldReceiptAfterRollback = buildRollbackProof({
  knownGood,
  diagnostics: diagnostics({
    routes: [
      {
        route: "/api/diagnostics",
        body: { runtime: { bootId: "boot-fixture-restored" } },
      },
    ],
  }),
  assurance: assurance(),
  protectedActionProof: newProofWithOldReceipt,
  rollbackStartedAt: startedAt,
  confirmation: ROLLBACK_CONFIRMATION,
  now: new Date(finishedAt),
  evidenceKey,
});
assert.equal(oldReceiptAfterRollback.rollbackVerified, false);
assert.match(
  oldReceiptAfterRollback.blocked.join(" "),
  /receipt must finish after rollback started/i,
);

const wrongTargetProtectedProof = {
  ...protectedActionProof,
  targetId: "staging-fedcba9876543210",
  envelopeSignature: null,
};
wrongTargetProtectedProof.envelopeSignature = signProtectedActionProofEnvelope(
  wrongTargetProtectedProof,
  evidenceKey,
);
const wrongProtectedActionTarget = buildRollbackProof({
  knownGood,
  diagnostics: diagnostics({
    routes: [
      {
        route: "/api/diagnostics",
        body: { runtime: { bootId: "boot-fixture-restored" } },
      },
    ],
  }),
  assurance: assurance({
    probes: {
      protectedAction: {
        available: true,
        schemaVersion: "nexus-protected-action-proof.v1",
        capturedAt: "2026-08-12T05:03:00.000Z",
        targetId: "staging-fedcba9876543210",
        targetMatches: true,
        protectedActionReady: true,
        passed: true,
      },
    },
  }),
  protectedActionProof: wrongTargetProtectedProof,
  rollbackStartedAt: startedAt,
  confirmation: ROLLBACK_CONFIRMATION,
  now: new Date(finishedAt),
  evidenceKey,
});
assert.equal(wrongProtectedActionTarget.rollbackVerified, false);
assert.match(
  wrongProtectedActionTarget.blocked.join(" "),
  /protected-action proof must match the restored staged target/i,
);

const sameBoot = buildRollbackProof({
  knownGood,
  diagnostics: diagnostics(),
  assurance: assurance(),
  protectedActionProof,
  rollbackStartedAt: startedAt,
  confirmation: ROLLBACK_CONFIRMATION,
  now: new Date(finishedAt),
  evidenceKey,
});
assert.equal(sameBoot.rollbackVerified, false);
assert.match(sameBoot.blocked.join(" "), /new runtime boot/i);

const futureProtectedReceipt = {
  ...protectedReceipt,
  finishedAt: "2026-08-12T05:04:30.000Z",
  proofSignature: null,
};
futureProtectedReceipt.proofSignature = signCapabilityProtectedActionReceipt(
  futureProtectedReceipt,
  evidenceKey,
);
const futureProtectedProof = {
  ...protectedActionProof,
  capturedAt: "2026-08-12T05:05:00.000Z",
  expiresAt: "2026-08-13T05:05:00.000Z",
  receipt: futureProtectedReceipt,
  envelopeSignature: null,
};
futureProtectedProof.envelopeSignature = signProtectedActionProofEnvelope(
  futureProtectedProof,
  evidenceKey,
);
const futureNestedEvidence = buildRollbackProof({
  knownGood,
  diagnostics: diagnostics({
    routes: [
      {
        route: "/api/diagnostics",
        body: { runtime: { bootId: "boot-fixture-restored" } },
      },
    ],
  }),
  assurance: assurance({
    capturedAt: "2026-08-12T05:05:30.000Z",
    expiresAt: "2026-08-13T05:05:30.000Z",
    probes: {
      protectedAction: {
        available: true,
        schemaVersion: "nexus-protected-action-proof.v1",
        capturedAt: futureProtectedProof.capturedAt,
        targetId,
        targetMatches: true,
        protectedActionReady: true,
        passed: true,
      },
    },
  }),
  protectedActionProof: futureProtectedProof,
  rollbackStartedAt: startedAt,
  confirmation: ROLLBACK_CONFIRMATION,
  now: new Date(finishedAt),
  evidenceKey,
});
assert.equal(futureNestedEvidence.rollbackVerified, false);
assert.match(
  futureNestedEvidence.blocked.join(" "),
  /before the final assurance capture|freshness/i,
);

const lateProtectedReceipt = {
  ...protectedReceipt,
  finishedAt: "2026-08-12T05:03:50.000Z",
  proofSignature: null,
};
lateProtectedReceipt.proofSignature = signCapabilityProtectedActionReceipt(
  lateProtectedReceipt,
  evidenceKey,
);
const lateReceiptProof = {
  ...protectedActionProof,
  receipt: lateProtectedReceipt,
  envelopeSignature: null,
};
lateReceiptProof.envelopeSignature = signProtectedActionProofEnvelope(
  lateReceiptProof,
  evidenceKey,
);
const lateReceiptRollback = buildRollbackProof({
  knownGood,
  diagnostics: diagnostics({
    routes: [
      {
        route: "/api/diagnostics",
        body: { runtime: { bootId: "boot-fixture-restored" } },
      },
    ],
  }),
  assurance: assurance(),
  protectedActionProof: lateReceiptProof,
  rollbackStartedAt: startedAt,
  confirmation: ROLLBACK_CONFIRMATION,
  now: new Date(finishedAt),
  evidenceKey,
});
assert.equal(lateReceiptRollback.rollbackVerified, false);
assert.match(
  lateReceiptRollback.blocked.join(" "),
  /after restored-runtime diagnostics and before the final assurance capture/i,
);

const stalePreRollbackEvidence = buildRollbackProof({
  knownGood,
  diagnostics: diagnostics({ capturedAt: "2026-08-12T04:59:59.000Z" }),
  assurance: assurance(),
  protectedActionProof,
  rollbackStartedAt: startedAt,
  confirmation: ROLLBACK_CONFIRMATION,
  now: new Date(finishedAt),
  evidenceKey,
});
assert.equal(stalePreRollbackEvidence.rollbackVerified, false);
assert.match(
  stalePreRollbackEvidence.blocked.join(" "),
  /after rollback started/i,
);

const wrongImageAndCommit = buildRollbackProof({
  knownGood,
  diagnostics: diagnostics({
    identity: {
      passed: true,
      actual: {
        ...diagnostics().identity.actual,
        sourceCommit: "f".repeat(40),
        imageDigest: `sha256:${"b".repeat(64)}`,
      },
    },
    routes: [
      {
        route: "/api/diagnostics",
        body: { runtime: { bootId: "boot-fixture-restored" } },
      },
    ],
  }),
  assurance: assurance(),
  protectedActionProof,
  rollbackStartedAt: startedAt,
  confirmation: ROLLBACK_CONFIRMATION,
  now: new Date(finishedAt),
  evidenceKey,
});
assert.equal(wrongImageAndCommit.rollbackVerified, false);
assert.equal(wrongImageAndCommit.knownGoodMatch, false);

const diagnosisAlone = buildRollbackProof({
  knownGood,
  diagnostics: diagnostics(),
  assurance: null,
  protectedActionProof,
  rollbackStartedAt: startedAt,
  confirmation: ROLLBACK_CONFIRMATION,
  now: new Date(finishedAt),
  evidenceKey,
});
assert.equal(diagnosisAlone.rollbackVerified, false);
assert.equal(diagnosisAlone.postRollbackChecksPassed, false);

console.log(
  "Staging rollback runtime OK (known-good, explicit confirmation, fresh post-rollback assurance, identity match, and no diagnostics-only proof).",
);
