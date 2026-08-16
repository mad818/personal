#!/usr/bin/env node
/* eslint-disable no-console */

import assert from "node:assert/strict";

import {
  WEB_STAGING_ASSURANCE_SCHEMA_VERSION,
  WEB_STAGING_CATEGORY_KEYS,
  WEB_STAGING_FEED_ROUTES,
  buildWebStagingAssuranceArtifact,
  evaluateProtectedActionProof,
  normalizeWebStagingTarget,
  parseEnvText,
  readBoundedJsonResponse,
} from "./web-staging-assurance.mjs";
import { signCapabilityProtectedActionReceipt } from "../lib/capabilityProtectedActionReceipt.mjs";
import { signProtectedActionProofEnvelope } from "./staging-protected-action-proof.mjs";

const evidenceKey = "fixture-private-evidence-key";
const redactedTokenEnvLine = [
  "NEXUS_TOKEN",
  '"<redacted-local-token>"',
].join("=");
const redactedEvidenceKeyEnvLine = [
  "NEXUS_EVIDENCE_KEY",
  '"<redacted-local-token>"',
].join("=");
const target = normalizeWebStagingTarget(
  "https://stage.example.test",
  evidenceKey,
);
assert.equal(target.staged, true);
assert.equal(target.targetId.startsWith("staging-"), true);
assert.equal(target.targetId.includes("example"), false);
assert.throws(
  () => normalizeWebStagingTarget("http://stage.example.test", evidenceKey),
  /HTTPS staged target/i,
);
assert.throws(
  () => normalizeWebStagingTarget("http://127.0.0.1:3000", evidenceKey),
  /HTTPS staged target/i,
);
assert.throws(
  () =>
    normalizeWebStagingTarget("https://stage.example.test/path", evidenceKey),
  /origin without path/i,
);

assert.deepEqual(
  parseEnvText(
    [
      "# comment",
      "NEXUS_RELEASE_BASE_URL='https://stage.example.test'",
      redactedTokenEnvLine,
      redactedEvidenceKeyEnvLine,
      "IGNORED_LINE",
    ].join("\n"),
  ),
  {
    NEXUS_RELEASE_BASE_URL: "https://stage.example.test",
    NEXUS_TOKEN: "<redacted-local-token>",
    NEXUS_EVIDENCE_KEY: "<redacted-local-token>",
  },
);

assert.deepEqual(WEB_STAGING_FEED_ROUTES, [
  "/api/cves",
  "/api/earthquakes",
  "/api/defi",
  "/api/hacker-news",
  "/api/threat-intel",
  "/api/news",
  "/api/sec-filings",
  "/api/conflict",
]);

const smallResponse = new Response(JSON.stringify({ ok: true }), {
  headers: { "content-type": "application/json" },
});
const small = await readBoundedJsonResponse(smallResponse, 256);
assert.equal(small.withinLimit, true);
assert.equal(small.validJson, true);
assert.deepEqual(small.json, { ok: true });

const largeResponse = new Response(JSON.stringify({ value: "x".repeat(300) }), {
  headers: { "content-type": "application/json" },
});
const large = await readBoundedJsonResponse(largeResponse, 128);
assert.equal(large.withinLimit, false);
assert.equal(large.validJson, false);
assert.equal(large.json, null);

function protectedActionProof(overrides = {}) {
  const runId = "qa-web-staging-proof";
  const receipt = {
    schemaVersion: "capability-assurance.v1",
    id: "receipt-qa-web-staging-proof-1786478040000",
    runId,
    capabilityId: "archive-continuity",
    actionId: "remove-temporary-qa-evidence",
    mode: "action",
    status: "verified",
    approvalRequired: true,
    verificationRequired: true,
    verificationPassed: true,
    finishedAt: "2026-08-11T19:54:00.000Z",
    provenance: "server_protected_action",
    approvalGranted: true,
    proofSignature: null,
    serverProofVerified: true,
  };
  receipt.proofSignature = signCapabilityProtectedActionReceipt(
    receipt,
    evidenceKey,
  );
  const artifact = {
    schemaVersion: "nexus-protected-action-proof.v1",
    capturedAt: "2026-08-11T19:55:00.000Z",
    expiresAt: "2026-08-12T19:55:00.000Z",
    evidenceMaxAgeMs: 24 * 60 * 60 * 1000,
    targetId: target.targetId,
    route: "/api/capability-assurance",
    method: "GET",
    runId,
    request: {
      status: 200,
      durationMs: 12,
      responseBytes: 2048,
      bodyWithinLimit: true,
      validJson: true,
    },
    receipt,
    blockers: [],
    protectedActionReady: true,
    baseUrl: "https://stage.example.test",
    token: "fixture-secret",
    ...overrides,
  };
  artifact.envelopeSignature = signProtectedActionProofEnvelope(
    artifact,
    evidenceKey,
  );
  return artifact;
}

const acceptedProtectedAction = evaluateProtectedActionProof({
  proof: protectedActionProof(),
  targetId: target.targetId,
  capturedAt: new Date("2026-08-11T20:00:00.000Z"),
  evidenceKey,
});
assert.equal(acceptedProtectedAction.passed, true);
assert.equal(acceptedProtectedAction.targetMatches, true);
assert.equal(
  JSON.stringify(acceptedProtectedAction).includes("example.test"),
  false,
);

const passingInput = {
  capturedAt: new Date("2026-08-11T20:00:00.000Z"),
  target,
  tokenConfigured: true,
  externalChecks: {
    runtimeConsistency: { passed: true },
    releaseDiagnostics: { passed: true },
  },
  diagnosticsEvidence: {
    diagnosticsReady: true,
    releaseProofReady: true,
    routes: [
      { route: "/", ok: true },
      { route: "/api/health", ok: true },
    ],
  },
  healthProbe: { passed: true },
  unauthenticatedProtectedProbe: { passed: true },
  capabilityProbe: { passed: true, shapePassed: true },
  protectedActionProof: protectedActionProof(),
  evidenceKey,
  feedProbes: WEB_STAGING_FEED_ROUTES.map((route) => ({
    route,
    passed: true,
    shapePassed: true,
  })),
  mutatingMethodsUsed: [],
};

const passing = buildWebStagingAssuranceArtifact(passingInput);
assert.equal(passing.schemaVersion, WEB_STAGING_ASSURANCE_SCHEMA_VERSION);
assert.deepEqual(Object.keys(passing.categories), WEB_STAGING_CATEGORY_KEYS);
assert.equal(passing.assuranceReady, true);
assert.deepEqual(passing.blockers, []);
assert.equal(JSON.stringify(passing).includes("stage.example.test"), false);
assert.equal(JSON.stringify(passing).includes("fixture-secret"), false);
assert.equal(passing.categories.protectedActions, true);

const malformedFeed = buildWebStagingAssuranceArtifact({
  ...passingInput,
  feedProbes: WEB_STAGING_FEED_ROUTES.map((route) => ({
    route,
    passed: true,
    shapePassed: route !== "/api/news",
  })),
});
assert.equal(malformedFeed.assuranceReady, false);
assert.equal(malformedFeed.categories.feeds, false);

const missingProtectedActionReceipt = buildWebStagingAssuranceArtifact({
  ...passingInput,
  protectedActionProof: null,
});
assert.equal(missingProtectedActionReceipt.assuranceReady, false);
assert.equal(missingProtectedActionReceipt.categories.protectedActions, false);

for (const invalidProof of [
  protectedActionProof({ schemaVersion: "wrong-schema" }),
  protectedActionProof({
    capturedAt: "2026-08-09T19:55:00.000Z",
    expiresAt: "2026-08-10T19:55:00.000Z",
  }),
  protectedActionProof({
    capturedAt: "2026-08-11T20:10:00.000Z",
    expiresAt: "2026-08-12T20:10:00.000Z",
  }),
  protectedActionProof({
    expiresAt: "2026-08-13T19:55:00.000Z",
  }),
  protectedActionProof({ targetId: "staging-ffffffffffffffff" }),
  protectedActionProof({ protectedActionReady: false }),
]) {
  const rejected = buildWebStagingAssuranceArtifact({
    ...passingInput,
    protectedActionProof: invalidProof,
  });
  assert.equal(rejected.categories.protectedActions, false);
  assert.equal(rejected.assuranceReady, false);
}

const failing = buildWebStagingAssuranceArtifact({
  ...passingInput,
  capabilityProbe: { passed: false, shapePassed: false },
  protectedActionProof: protectedActionProof({ protectedActionReady: false }),
  mutatingMethodsUsed: ["POST"],
});
assert.equal(failing.assuranceReady, false);
assert.equal(failing.categories.capabilityAssurance, false);
assert.equal(failing.categories.protectedActions, false);
assert.equal(
  failing.blockers.includes("category_failed:capabilityAssurance"),
  true,
);
assert.equal(
  failing.blockers.includes("category_failed:protectedActions"),
  true,
);

console.log(
  "ok web-staging-assurance runtime (HTTPS-only target, bounded GETs, exact categories, fail-closed aggregation, sanitized evidence)",
);
