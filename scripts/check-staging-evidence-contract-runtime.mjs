#!/usr/bin/env node
/* eslint-disable no-console */

import assert from "node:assert/strict";
import {
  DEFAULT_DIAGNOSTIC_ROUTES,
  buildIdentityPosture,
  buildSecurityPosture,
  buildTargetId,
  classifyReleaseTarget,
  resolveDiagnosticRoute,
  sanitizeDiagnosticValue,
  validateDiagnosticRoute,
} from "./release-diagnostics-capture.mjs";
import { createRollbackPosture } from "./cp2-staged-release-rehearsal.mjs";
import { normalizeReleaseSmokeTarget } from "./release-smoke.mjs";
import {
  RELEASE_ENVIRONMENT_SCHEMA_VERSION,
  buildReleaseIdentity,
} from "../lib/releaseIdentity.ts";
import {
  ACTIVE_RELEASE_CANDIDATE_TAG,
  classifyReleaseCandidate,
} from "./release-candidate.mjs";

const gaRoutes = [
  "/hq",
  "/command",
  "/intel",
  "/alpha",
  "/cyber",
  "/recon",
  "/vault",
  "/resources",
];
const sourceCommit = "6".repeat(40);
const releaseCandidate = classifyReleaseCandidate({
  candidateTag: ACTIVE_RELEASE_CANDIDATE_TAG,
  tagObject: "5".repeat(40),
  peeledCommit: sourceCommit,
  objectType: "tag",
});
assert.equal(releaseCandidate.ready, true);
for (const route of gaRoutes) {
  assert.equal(
    DEFAULT_DIAGNOSTIC_ROUTES.includes(route),
    true,
    `default diagnostics must include ${route}`,
  );
}
for (const route of ["/", "/api/health", "/api/status", "/api/diagnostics"]) {
  assert.equal(DEFAULT_DIAGNOSTIC_ROUTES.includes(route), true);
}
assert.equal(DEFAULT_DIAGNOSTIC_ROUTES.includes("/vehicle"), false);
assert.equal(DEFAULT_DIAGNOSTIC_ROUTES.includes("/internal/vehicle"), false);

for (const route of DEFAULT_DIAGNOSTIC_ROUTES) {
  assert.equal(validateDiagnosticRoute(route), route);
  assert.equal(
    new URL(resolveDiagnosticRoute("https://stage.example.test", route)).origin,
    "https://stage.example.test",
  );
}
for (const unsafeRoute of [
  "@evil.example/path",
  "//evil.example/path",
  "\\\\evil.example\\path",
  "/%5cevil.example/path",
  "/%2f%2fevil.example/path",
  "/%40evil.example/path",
  "/api/status?next=https://evil.example",
  "/api/status#evil",
  "/api/status%0d%0ax-nexus-internal-auth:leak",
]) {
  assert.throws(
    () => validateDiagnosticRoute(unsafeRoute),
    /diagnostic route/i,
  );
}

const local = classifyReleaseTarget("http://127.0.0.1:3100");
assert.equal(local.kind, "local");
assert.equal(local.staged, false);

const evidenceKey = "fixture-private-evidence-key";
const staged = classifyReleaseTarget("https://stage.example.test", {
  evidenceKey,
});
assert.equal(staged.kind, "staged");
assert.equal(staged.staged, true);
assert.match(staged.targetId, /^staging-[a-f0-9]{16}$/);
assert.equal(
  staged.targetId,
  buildTargetId("https://stage.example.test", evidenceKey),
);
assert.notEqual(
  staged.targetId,
  buildTargetId("https://stage.example.test", "different-private-evidence-key"),
);
assert.throws(
  () => classifyReleaseTarget("https://stage.example.test"),
  /private evidence key/i,
);
assert.equal(JSON.stringify(staged).includes("stage.example.test"), false);

for (const invalid of [
  "http://stage.example.test",
  "https://user:pass@stage.example.test",
  "https://stage.example.test/path",
  "ftp://stage.example.test",
]) {
  assert.throws(() => classifyReleaseTarget(invalid));
}
assert.equal(
  normalizeReleaseSmokeTarget("http://127.0.0.1:3000").origin,
  "http://127.0.0.1:3000",
);
assert.equal(
  normalizeReleaseSmokeTarget("https://stage.example.test").display,
  "https://<staging-target>",
);
for (const invalid of [
  "http://stage.example.test",
  "https://user:pass@stage.example.test",
  "https://stage.example.test/path",
  "https://stage.example.test?token=leak",
]) {
  assert.throws(() => normalizeReleaseSmokeTarget(invalid));
}

const sanitized = sanitizeDiagnosticValue({
  baseUrl: "https://stage.example.test",
  token: "abcdefghijklmnop",
  authorization: "Bearer abcdefghijklmnop",
  body: { preview: "served by https://stage.example.test" },
});
const serialized = JSON.stringify(sanitized);
assert.equal(serialized.includes("stage.example.test"), false);
assert.equal(serialized.includes("abcdefghijklmnop"), false);

const rollback = createRollbackPosture({
  diagnosticsExitCode: 0,
  rollbackArtifact: null,
});
assert.equal(rollback.verified, false);
assert.equal(rollback.source, null);
assert.match(rollback.reason, /separate platform rollback proof/i);

const unrelatedRollback = createRollbackPosture({
  targetId: staged.targetId,
  diagnosticsIdentity: {
    sourceCommit,
    imageDigest: `sha256:${"a".repeat(64)}`,
  },
  rollbackArtifact: {
    schemaVersion: "nexus-rollback-proof.v1",
    expiresAt: "2026-08-13T05:00:00.000Z",
    targetId: "staging-ffffffffffffffff",
    restoredIdentity: {
      sourceCommit,
      imageDigest: `sha256:${"a".repeat(64)}`,
    },
    rollbackVerified: true,
    knownGoodMatch: true,
    postRollbackChecksPassed: true,
  },
  now: new Date("2026-08-12T05:00:00.000Z"),
});
assert.equal(unrelatedRollback.verified, false);

const fabricatedSameTargetRollback = createRollbackPosture({
  targetId: staged.targetId,
  diagnosticsIdentity: {
    sourceCommit,
    imageDigest: `sha256:${"a".repeat(64)}`,
  },
  protectedActionProof: null,
  evidenceKey: "fixture-private-evidence-key",
  rollbackArtifact: {
    schemaVersion: "nexus-rollback-proof.v1",
    capturedAt: "2026-08-12T04:59:00.000Z",
    expiresAt: "2026-08-13T04:59:00.000Z",
    rollbackStartedAt: "2026-08-12T04:55:00.000Z",
    recoveryDurationMs: 240_000,
    targetId: staged.targetId,
    restoredIdentity: {
      sourceCommit,
      imageDigest: `sha256:${"a".repeat(64)}`,
    },
    knownGoodIdentity: {
      sourceCommit,
      imageDigest: `sha256:${"a".repeat(64)}`,
    },
    restoredRuntime: { bootId: "restored", restartObserved: true },
    knownGoodRuntime: { bootId: "known-good" },
    rollbackVerified: true,
    knownGoodMatch: true,
    postRollbackChecksPassed: true,
    operatorConfirmedPlatformRollback: true,
    blocked: [],
    envelopeSignature: null,
  },
  now: new Date("2026-08-12T05:00:00.000Z"),
});
assert.equal(
  fabricatedSameTargetRollback.verified,
  false,
  "CP2 must reject shape-perfect unsigned rollback summaries",
);

assert.equal(RELEASE_ENVIRONMENT_SCHEMA_VERSION, "nexus-runtime-env.v1");
const imageDigest = `sha256:${"a".repeat(64)}`;
const identity = buildReleaseIdentity({
  NEXUS_BUILD_COMMIT_SHA: sourceCommit,
  NEXUS_RELEASE_TAG: ACTIVE_RELEASE_CANDIDATE_TAG,
  NEXUS_IMAGE_DIGEST: imageDigest,
  NEXUS_DEPLOYMENT_ID: "private-coolify-resource-name",
  NEXUS_DEPLOYMENT_PROFILE: "web-self-hosted",
});
assert.equal(identity.complete, true);
assert.equal(identity.sourceCommit, sourceCommit);
assert.equal(identity.imageDigest, imageDigest);
assert.match(identity.deploymentId, /^deployment-[a-f0-9]{16}$/);
assert.equal(
  JSON.stringify(identity).includes("private-coolify-resource-name"),
  false,
);

const incompleteIdentity = buildReleaseIdentity({
  NEXUS_BUILD_COMMIT_SHA: "short",
  NEXUS_RELEASE_TAG: "not a tag",
  NEXUS_IMAGE_DIGEST: "latest",
  NEXUS_DEPLOYMENT_ID: "",
  NEXUS_DEPLOYMENT_PROFILE: "local-dev",
});
assert.equal(incompleteIdentity.complete, false);
assert.deepEqual(incompleteIdentity.missing, [
  "sourceCommit",
  "releaseTag",
  "imageDigest",
  "deploymentId",
]);

const legacyIdentity = buildIdentityPosture(
  [
    {
      route: "/api/diagnostics",
      body: { release: { profile: "web-self-hosted" } },
    },
    { route: "/api/status", body: {} },
  ],
  releaseCandidate,
);
assert.equal(legacyIdentity.passed, false);
assert.equal(legacyIdentity.identityMode, "unavailable");
assert.equal(legacyIdentity.actual.sourceCommit, null);
assert.equal(legacyIdentity.actual.imageDigest, null);

const runtimeClaimIdentity = buildIdentityPosture(
  [
    {
      route: "/api/diagnostics",
      body: {
        releaseIdentity: {
          sourceCommit,
          releaseTag: ACTIVE_RELEASE_CANDIDATE_TAG,
          imageDigest,
          deploymentId: "deployment-0123456789abcdef",
          environmentSchemaVersion: "nexus-runtime-env.v1",
          deploymentProfile: "web-self-hosted",
        },
      },
    },
  ],
  releaseCandidate,
);
assert.equal(runtimeClaimIdentity.identityMode, "runtime-claims-unverified");
assert.equal(runtimeClaimIdentity.passed, false);
assert.equal(
  runtimeClaimIdentity.checks.find(
    (check) => check.id === "independent-platform-provenance",
  )?.passed,
  false,
);
assert.match(
  runtimeClaimIdentity.blocked.join(" "),
  /independent-platform-provenance/i,
);

const expectedIdentityCannotBeOverridden = buildIdentityPosture(
  [],
  releaseCandidate,
);
assert.equal(expectedIdentityCannotBeOverridden.passed, false);
assert.equal(
  expectedIdentityCannotBeOverridden.expectedSourceCommit,
  sourceCommit,
);
assert.equal(
  expectedIdentityCannotBeOverridden.expectedReleaseTag,
  ACTIVE_RELEASE_CANDIDATE_TAG,
);

const missingCandidateIdentity = buildIdentityPosture([]);
assert.equal(missingCandidateIdentity.passed, false);
assert.equal(missingCandidateIdentity.expectedSourceCommit, null);
assert.equal(
  missingCandidateIdentity.checks.find(
    (check) => check.id === "trusted-candidate-tag-resolution",
  )?.passed,
  false,
);

const insecureHeaders = buildSecurityPosture(staged, [
  {
    route: "/",
    headers: {
      strictTransportSecurity: "max-age=0",
      contentSecurityPolicy: "default-src *",
      xFrameOptions: "ALLOWALL",
      xContentTypeOptions: "nosniff",
    },
  },
  { route: "/api/status", headers: { cacheControl: "no-store" } },
  { route: "/api/diagnostics", headers: { cacheControl: "no-store" } },
]);
assert.equal(insecureHeaders.passed, false);
for (const id of ["hsts", "csp", "frame-protection"]) {
  assert.equal(
    insecureHeaders.checks.find((check) => check.id === id)?.passed,
    false,
  );
}

const secureHeaders = buildSecurityPosture(staged, [
  {
    route: "/",
    headers: {
      strictTransportSecurity: "max-age=31536000; includeSubDomains",
      contentSecurityPolicy: "default-src 'self'; frame-ancestors 'none'",
      xFrameOptions: "DENY",
      xContentTypeOptions: "nosniff",
    },
  },
  { route: "/api/status", headers: { cacheControl: "private, no-store" } },
  { route: "/api/diagnostics", headers: { cacheControl: "no-store" } },
]);
assert.equal(secureHeaders.passed, true);

console.log(
  "Staging evidence runtime OK (HTTPS-only remote target, sanitized identity, eight GA routes, and no diagnostics-as-rollback claim).",
);
