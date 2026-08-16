#!/usr/bin/env node
/* eslint-disable no-console */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";
import { sanitizeDiagnosticValue } from "./release-diagnostics-capture.mjs";
import { validateProtectedActionProofArtifact } from "./staging-protected-action-proof.mjs";
import {
  signKnownGoodEnvelope,
  signRollbackProofEnvelope,
  verifyKnownGoodEnvelope,
  verifyRollbackProofEnvelope,
} from "./rollback-proof-signature.mjs";

export const ROLLBACK_CONFIRMATION = "I_PERFORMED_PLATFORM_ROLLBACK";
export const KNOWN_GOOD_SCHEMA_VERSION = "nexus-known-good-deployment.v1";
export const ROLLBACK_PROOF_SCHEMA_VERSION = "nexus-rollback-proof.v1";

const root = process.cwd();
const metricsDir = join(root, "docs", "metrics");
const diagnosticsPath = join(metricsDir, "release-diagnostics-latest.json");
const assurancePath = join(metricsDir, "web-staging-assurance-latest.json");
const protectedActionPath = join(
  metricsDir,
  "protected-action-proof-latest.json",
);
const knownGoodPath = join(metricsDir, "known-good-deployment-latest.json");
const rollbackPath = join(metricsDir, "rollback-proof-latest.json");
const ROLLBACK_EVIDENCE_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const FUTURE_CLOCK_SKEW_MS = 5 * 60 * 1000;

function timestamp(value) {
  const parsed = Date.parse(String(value ?? ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function evidenceContractReady({
  evidence,
  schemaVersion,
  now,
  maxAgeMs = ROLLBACK_EVIDENCE_MAX_AGE_MS,
}) {
  const capturedAt = timestamp(evidence?.capturedAt ?? evidence?.generatedAt);
  const expiresAt = timestamp(evidence?.expiresAt);
  const current = now instanceof Date ? now.getTime() : timestamp(now);
  return (
    evidence?.schemaVersion === schemaVersion &&
    capturedAt !== null &&
    expiresAt !== null &&
    current !== null &&
    capturedAt <= current &&
    current - capturedAt <= maxAgeMs &&
    current <= expiresAt &&
    capturedAt < expiresAt &&
    expiresAt - capturedAt <= maxAgeMs
  );
}

function nonEmpty(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readJson(filePath) {
  if (!existsSync(filePath)) return null;
  try {
    return sanitizeDiagnosticValue(JSON.parse(readFileSync(filePath, "utf8")));
  } catch {
    return null;
  }
}

function writeJson(filePath, artifact, { exclusive = false } = {}) {
  mkdirSync(metricsDir, { recursive: true });
  writeFileSync(
    filePath,
    `${JSON.stringify(sanitizeDiagnosticValue(artifact), null, 2)}\n`,
    { encoding: "utf8", flag: exclusive ? "wx" : "w" },
  );
}

function identityFromDiagnostics(diagnostics) {
  const declared = diagnostics?.identity?.actual ?? {};
  const checks = Array.isArray(diagnostics?.identity?.checks)
    ? diagnostics.identity.checks
    : [];
  const actualFor = (id) =>
    nonEmpty(checks.find((entry) => entry?.id === id)?.actual);
  return {
    sourceCommit: nonEmpty(declared.sourceCommit) ?? actualFor("source-commit"),
    releaseTag: nonEmpty(declared.releaseTag) ?? actualFor("release-tag"),
    imageDigest: nonEmpty(declared.imageDigest) ?? actualFor("image-digest"),
    deploymentId: nonEmpty(declared.deploymentId) ?? actualFor("deployment-id"),
    environmentSchemaVersion:
      nonEmpty(declared.environmentSchemaVersion) ??
      actualFor("environment-schema"),
    deploymentProfile:
      nonEmpty(declared.deploymentProfile) ?? actualFor("deployment-profile"),
  };
}

function bootIdFromDiagnostics(diagnostics) {
  const routes = Array.isArray(diagnostics?.routes) ? diagnostics.routes : [];
  for (const route of ["/api/diagnostics", "/api/status", "/api/health"]) {
    const body = routes.find((entry) => entry?.route === route)?.body;
    const bootId = nonEmpty(
      body?.runtime?.bootId ?? body?.readiness?.runtime?.bootId,
    );
    if (bootId) return bootId;
  }
  return null;
}

function targetIdFrom(value) {
  return nonEmpty(value?.targetId ?? value?.target?.targetId);
}

const REQUIRED_IDENTITY_KEYS = Object.freeze([
  "sourceCommit",
  "releaseTag",
  "imageDigest",
  "deploymentId",
  "environmentSchemaVersion",
  "deploymentProfile",
]);
const IMMUTABLE_ROLLBACK_IDENTITY_KEYS = Object.freeze([
  "sourceCommit",
  "releaseTag",
  "imageDigest",
  "environmentSchemaVersion",
  "deploymentProfile",
]);

function requiredIdentityMissing(identity) {
  return REQUIRED_IDENTITY_KEYS.filter((key) => !nonEmpty(identity?.[key]));
}

function immutableRollbackIdentityMatches(restored, knownGood) {
  return IMMUTABLE_ROLLBACK_IDENTITY_KEYS.every(
    (key) =>
      nonEmpty(restored?.[key]) !== null &&
      restored?.[key] === knownGood?.[key],
  );
}

const ASSURANCE_CHECK_IDS = Object.freeze([
  "health",
  "auth",
  "routes",
  "smoke",
  "diagnostics",
  "feeds",
  "capabilityAssurance",
  "protectedActions",
]);

function assuranceChecksPassed(assurance) {
  const checks = assurance?.checks ?? assurance?.categories;
  if (!checks || typeof checks !== "object" || Array.isArray(checks))
    return false;
  return ASSURANCE_CHECK_IDS.every((key) => checks[key] === true);
}

function summarizeDiagnosticsEvidence(diagnostics) {
  return sanitizeDiagnosticValue({
    schemaVersion: diagnostics?.schemaVersion ?? null,
    capturedAt: diagnostics?.capturedAt ?? null,
    expiresAt: diagnostics?.expiresAt ?? null,
    targetId: targetIdFrom(diagnostics),
    releaseProofReady: diagnostics?.releaseProofReady === true,
    identityPassed: diagnostics?.identity?.passed === true,
    identity: identityFromDiagnostics(diagnostics),
    bootId: bootIdFromDiagnostics(diagnostics),
  });
}

function summarizeAssuranceEvidence(assurance) {
  const checks = assurance?.checks ?? assurance?.categories ?? {};
  const normalizedChecks = Object.fromEntries(
    ASSURANCE_CHECK_IDS.map((key) => [key, checks?.[key] === true]),
  );
  const protectedAction = protectedActionEvidenceFromAssurance(assurance);
  return sanitizeDiagnosticValue({
    schemaVersion: assurance?.schemaVersion ?? null,
    capturedAt: assurance?.capturedAt ?? null,
    expiresAt: assurance?.expiresAt ?? null,
    targetId: targetIdFrom(assurance),
    assuranceReady: assurance?.assuranceReady === true,
    checks: normalizedChecks,
    protectedAction: protectedAction
      ? {
          schemaVersion: protectedAction.schemaVersion ?? null,
          capturedAt: protectedAction.capturedAt ?? null,
          targetId: targetIdFrom(protectedAction),
          targetMatches: protectedAction.targetMatches === true,
          protectedActionReady: protectedAction.protectedActionReady === true,
          passed: protectedAction.passed === true,
        }
      : null,
  });
}

function postRollbackEvidenceIsFresh({ evidence, rollbackStartedAt }) {
  const capturedAt = timestamp(evidence?.capturedAt ?? evidence?.generatedAt);
  const startedAt = timestamp(rollbackStartedAt);
  return capturedAt !== null && startedAt !== null && capturedAt >= startedAt;
}

function protectedActionEvidenceFromAssurance(assurance) {
  const evidence = assurance?.probes?.protectedAction;
  return evidence && typeof evidence === "object" ? evidence : null;
}

function summarizeProtectedActionProof(proof, validation) {
  return {
    schemaVersion: proof?.schemaVersion ?? null,
    capturedAt: proof?.capturedAt ?? null,
    expiresAt: proof?.expiresAt ?? null,
    targetId: proof?.targetId ?? null,
    runId: proof?.runId ?? null,
    envelopeSignature: proof?.envelopeSignature ?? null,
    receipt: {
      id: proof?.receipt?.id ?? null,
      runId: proof?.receipt?.runId ?? null,
      capabilityId: proof?.receipt?.capabilityId ?? null,
      actionId: proof?.receipt?.actionId ?? null,
      finishedAt: proof?.receipt?.finishedAt ?? null,
      proofSignature: proof?.receipt?.proofSignature ?? null,
    },
    protectedActionReady: proof?.protectedActionReady === true,
    canonicalPassed: validation?.passed === true,
  };
}

function summariesMatch(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function validateRollbackProofArtifact({
  proof,
  knownGood,
  diagnostics,
  assurance,
  protectedActionProof,
  targetId,
  sourceCommit,
  imageDigest,
  capturedAt = new Date(),
  evidenceKey = "",
}) {
  const nowMs =
    capturedAt instanceof Date
      ? capturedAt.getTime()
      : new Date(capturedAt).getTime();
  const proofCapturedMs = timestamp(proof?.capturedAt);
  const proofExpiresMs = timestamp(proof?.expiresAt);
  const rollbackStartedMs = timestamp(proof?.rollbackStartedAt);
  const protectedActionCapturedMs = timestamp(protectedActionProof?.capturedAt);
  const protectedActionFinishedMs = timestamp(
    protectedActionProof?.receipt?.finishedAt,
  );
  const protectedActionValidation = validateProtectedActionProofArtifact({
    proof: protectedActionProof,
    targetId,
    capturedAt,
    evidenceKey,
  });
  const protectedActionSummary = summarizeProtectedActionProof(
    protectedActionProof,
    protectedActionValidation,
  );
  const nestedProofMatches = summariesMatch(
    proof?.protectedActionProof,
    protectedActionSummary,
  );
  const knownGoodValidation = validateKnownGoodDeploymentArtifact({
    proof: knownGood,
    capturedAt,
    evidenceKey,
  });
  const sourceEvidenceMatches =
    summariesMatch(
      proof?.sourceEvidence?.diagnostics,
      summarizeDiagnosticsEvidence(diagnostics),
    ) &&
    summariesMatch(
      proof?.sourceEvidence?.assurance,
      summarizeAssuranceEvidence(assurance),
    );
  const assuranceProtectedAction =
    protectedActionEvidenceFromAssurance(assurance);
  const assuranceProtectedActionMatches =
    assuranceProtectedAction?.schemaVersion ===
      protectedActionProof?.schemaVersion &&
    assuranceProtectedAction?.capturedAt === protectedActionProof?.capturedAt &&
    targetIdFrom(assuranceProtectedAction) ===
      targetIdFrom(protectedActionProof) &&
    assuranceProtectedAction?.targetMatches ===
      protectedActionValidation.targetMatches &&
    assuranceProtectedAction?.protectedActionReady ===
      protectedActionValidation.protectedActionReady &&
    assuranceProtectedAction?.passed === protectedActionValidation.passed;
  const currentEvidenceReady =
    evidenceContractReady({
      evidence: diagnostics,
      schemaVersion: "nexus-release-diagnostics.v1",
      now: capturedAt,
    }) &&
    evidenceContractReady({
      evidence: assurance,
      schemaVersion: "nexus-web-staging-assurance.v1",
      now: capturedAt,
    }) &&
    diagnostics?.releaseProofReady === true &&
    diagnostics?.identity?.passed === true &&
    assurance?.assuranceReady === true &&
    assuranceChecksPassed(assurance);
  const diagnosticsCapturedMs = timestamp(diagnostics?.capturedAt);
  const assuranceCapturedMs = timestamp(assurance?.capturedAt);
  const timestampsValid =
    Number.isFinite(nowMs) &&
    proofCapturedMs !== null &&
    proofExpiresMs !== null &&
    rollbackStartedMs !== null &&
    rollbackStartedMs <= proofCapturedMs &&
    proofCapturedMs <= nowMs + FUTURE_CLOCK_SKEW_MS &&
    proofExpiresMs > proofCapturedMs &&
    proofExpiresMs <= proofCapturedMs + ROLLBACK_EVIDENCE_MAX_AGE_MS &&
    nowMs <= proofExpiresMs &&
    protectedActionCapturedMs !== null &&
    protectedActionFinishedMs !== null &&
    protectedActionCapturedMs >= rollbackStartedMs &&
    protectedActionFinishedMs >= rollbackStartedMs &&
    diagnosticsCapturedMs !== null &&
    assuranceCapturedMs !== null &&
    diagnosticsCapturedMs >= rollbackStartedMs &&
    protectedActionFinishedMs >= diagnosticsCapturedMs &&
    protectedActionCapturedMs >= diagnosticsCapturedMs &&
    protectedActionFinishedMs <= protectedActionCapturedMs &&
    assuranceCapturedMs >= protectedActionCapturedMs &&
    diagnosticsCapturedMs <= proofCapturedMs &&
    protectedActionFinishedMs <= proofCapturedMs &&
    protectedActionCapturedMs <= proofCapturedMs &&
    assuranceCapturedMs <= proofCapturedMs &&
    proof?.recoveryDurationMs === proofCapturedMs - rollbackStartedMs;
  const targetMatches =
    /^staging-[a-f0-9]{16}$/.test(targetId ?? "") &&
    proof?.targetId === targetId &&
    knownGood?.targetId === targetId &&
    diagnostics?.target?.staged === true &&
    targetIdFrom(diagnostics) === targetId &&
    targetIdFrom(assurance) === targetId &&
    protectedActionProof?.targetId === targetId;
  const restoredEvidenceIdentity = identityFromDiagnostics(diagnostics);
  const identityMatches =
    /^[a-f0-9]{40}$/.test(sourceCommit ?? "") &&
    /^sha256:[a-f0-9]{64}$/.test(imageDigest ?? "") &&
    requiredIdentityMissing(restoredEvidenceIdentity).length === 0 &&
    requiredIdentityMissing(knownGood?.identity).length === 0 &&
    immutableRollbackIdentityMatches(
      restoredEvidenceIdentity,
      knownGood?.identity,
    ) &&
    proof?.restoredIdentity?.sourceCommit === sourceCommit &&
    proof?.restoredIdentity?.imageDigest === imageDigest &&
    proof?.knownGoodIdentity?.sourceCommit === sourceCommit &&
    proof?.knownGoodIdentity?.imageDigest === imageDigest &&
    summariesMatch(proof?.restoredIdentity, restoredEvidenceIdentity) &&
    summariesMatch(proof?.knownGoodIdentity, knownGood?.identity);
  const evidenceBootsMatch =
    proof?.restoredRuntime?.bootId === bootIdFromDiagnostics(diagnostics) &&
    proof?.knownGoodRuntime?.bootId === knownGood?.runtime?.bootId;
  const bootTransitionValid =
    evidenceBootsMatch &&
    Boolean(proof?.knownGoodRuntime?.bootId) &&
    Boolean(proof?.restoredRuntime?.bootId) &&
    proof.knownGoodRuntime.bootId !== proof.restoredRuntime.bootId &&
    proof?.restoredRuntime?.restartObserved === true;
  const semanticsValid =
    proof?.schemaVersion === ROLLBACK_PROOF_SCHEMA_VERSION &&
    proof?.attestationKind === "operator-confirmed-platform-action" &&
    proof?.operatorConfirmedPlatformRollback === true &&
    proof?.knownGoodMatch === true &&
    proof?.postRollbackChecksPassed === true &&
    proof?.rollbackVerified === true &&
    proof?.knownGoodEnvelopeSignature === knownGood?.envelopeSignature &&
    Array.isArray(proof?.blocked) &&
    proof.blocked.length === 0 &&
    proof?.evidence?.knownGood ===
      "docs/metrics/known-good-deployment-latest.json" &&
    proof?.evidence?.diagnostics ===
      "docs/metrics/release-diagnostics-latest.json" &&
    proof?.evidence?.assurance ===
      "docs/metrics/web-staging-assurance-latest.json" &&
    proof?.evidence?.protectedAction ===
      "docs/metrics/protected-action-proof-latest.json";
  const signedEnvelope = verifyRollbackProofEnvelope(proof, evidenceKey);

  return {
    available: Boolean(proof),
    timestampsValid,
    targetMatches,
    identityMatches,
    bootTransitionValid,
    knownGoodPassed: knownGoodValidation.passed,
    protectedActionPassed: protectedActionValidation.passed,
    nestedProofMatches,
    sourceEvidenceMatches,
    assuranceProtectedActionMatches,
    currentEvidenceReady,
    semanticsValid,
    signedEnvelope,
    passed:
      Boolean(proof) &&
      timestampsValid &&
      targetMatches &&
      identityMatches &&
      bootTransitionValid &&
      knownGoodValidation.passed &&
      protectedActionValidation.passed &&
      nestedProofMatches &&
      sourceEvidenceMatches &&
      assuranceProtectedActionMatches &&
      currentEvidenceReady &&
      semanticsValid &&
      signedEnvelope,
  };
}

export function validateKnownGoodDeploymentArtifact({
  proof,
  capturedAt = new Date(),
  evidenceKey = "",
}) {
  const nowMs =
    capturedAt instanceof Date
      ? capturedAt.getTime()
      : new Date(capturedAt).getTime();
  const proofCapturedMs = timestamp(proof?.capturedAt);
  const targetId = targetIdFrom(proof);
  const diagnosticsSummary = proof?.sourceEvidence?.diagnostics;
  const assuranceSummary = proof?.sourceEvidence?.assurance;
  const embeddedProtectedAction = proof?.protectedActionProof;
  const diagnosticsCapturedMs = timestamp(diagnosticsSummary?.capturedAt);
  const assuranceCapturedMs = timestamp(assuranceSummary?.capturedAt);
  const protectedActionCapturedMs = timestamp(
    embeddedProtectedAction?.capturedAt,
  );
  const protectedActionFinishedMs = timestamp(
    embeddedProtectedAction?.receipt?.finishedAt,
  );
  const protectedActionValidation = validateProtectedActionProofArtifact({
    proof: embeddedProtectedAction,
    targetId,
    capturedAt: proof?.capturedAt ?? capturedAt,
    evidenceKey,
  });
  const assuranceProtectedAction = assuranceSummary?.protectedAction;
  const protectedProjectionMatches =
    assuranceProtectedAction?.schemaVersion ===
      embeddedProtectedAction?.schemaVersion &&
    assuranceProtectedAction?.capturedAt ===
      embeddedProtectedAction?.capturedAt &&
    assuranceProtectedAction?.targetId === embeddedProtectedAction?.targetId &&
    assuranceProtectedAction?.targetMatches ===
      protectedActionValidation.targetMatches &&
    assuranceProtectedAction?.protectedActionReady ===
      protectedActionValidation.protectedActionReady &&
    assuranceProtectedAction?.passed === protectedActionValidation.passed;
  const sourceEvidenceValid =
    evidenceContractReady({
      evidence: diagnosticsSummary,
      schemaVersion: "nexus-release-diagnostics.v1",
      now: new Date(proofCapturedMs ?? Number.NaN),
    }) &&
    evidenceContractReady({
      evidence: assuranceSummary,
      schemaVersion: "nexus-web-staging-assurance.v1",
      now: new Date(proofCapturedMs ?? Number.NaN),
    }) &&
    diagnosticsSummary?.releaseProofReady === true &&
    diagnosticsSummary?.identityPassed === true &&
    assuranceSummary?.assuranceReady === true &&
    assuranceChecksPassed({ checks: assuranceSummary?.checks });
  const identityValid =
    requiredIdentityMissing(proof?.identity ?? {}).length === 0 &&
    /^[a-f0-9]{40}$/.test(proof?.identity?.sourceCommit ?? "") &&
    /^sha256:[a-f0-9]{64}$/.test(proof?.identity?.imageDigest ?? "") &&
    summariesMatch(diagnosticsSummary?.identity, proof?.identity);
  const targetAndRuntimeValid =
    /^staging-[a-f0-9]{16}$/.test(targetId ?? "") &&
    diagnosticsSummary?.targetId === targetId &&
    assuranceSummary?.targetId === targetId &&
    Boolean(proof?.runtime?.bootId) &&
    diagnosticsSummary?.bootId === proof?.runtime?.bootId;
  const timestampsValid =
    Number.isFinite(nowMs) &&
    proofCapturedMs !== null &&
    proofCapturedMs <= nowMs + FUTURE_CLOCK_SKEW_MS &&
    diagnosticsCapturedMs !== null &&
    assuranceCapturedMs !== null &&
    protectedActionCapturedMs !== null &&
    protectedActionFinishedMs !== null &&
    diagnosticsCapturedMs <= protectedActionFinishedMs &&
    protectedActionFinishedMs <= protectedActionCapturedMs &&
    protectedActionCapturedMs <= assuranceCapturedMs &&
    assuranceCapturedMs <= proofCapturedMs;
  const semanticsValid =
    proof?.schemaVersion === KNOWN_GOOD_SCHEMA_VERSION &&
    proof?.ready === true &&
    Array.isArray(proof?.blocked) &&
    proof.blocked.length === 0 &&
    proof?.evidence?.diagnostics ===
      "docs/metrics/release-diagnostics-latest.json" &&
    proof?.evidence?.assurance ===
      "docs/metrics/web-staging-assurance-latest.json" &&
    proof?.evidence?.protectedAction ===
      "docs/metrics/protected-action-proof-latest.json";
  const signedEnvelope = verifyKnownGoodEnvelope(proof, evidenceKey);
  return {
    available: Boolean(proof),
    timestampsValid,
    sourceEvidenceValid,
    identityValid,
    targetAndRuntimeValid,
    protectedActionPassed: protectedActionValidation.passed,
    protectedProjectionMatches,
    semanticsValid,
    signedEnvelope,
    passed:
      Boolean(proof) &&
      timestampsValid &&
      sourceEvidenceValid &&
      identityValid &&
      targetAndRuntimeValid &&
      protectedActionValidation.passed &&
      protectedProjectionMatches &&
      semanticsValid &&
      signedEnvelope,
  };
}

export function classifyKnownGoodWrite(existing) {
  return existing
    ? {
        allowed: false,
        reason:
          "The first signed known-good deployment is immutable; rotate it only through a separately approved release action.",
      }
    : { allowed: true, reason: null };
}

export function buildKnownGoodDeployment({
  diagnostics,
  assurance,
  protectedActionProof,
  now = new Date(),
  evidenceKey = "",
}) {
  const capturedAt = now.toISOString();
  const identity = identityFromDiagnostics(diagnostics);
  const targetId = targetIdFrom(diagnostics);
  const assuranceTargetId = targetIdFrom(assurance);
  const bootId = bootIdFromDiagnostics(diagnostics);
  const protectedActionValidation = validateProtectedActionProofArtifact({
    proof: protectedActionProof,
    targetId,
    capturedAt: now,
    evidenceKey,
  });
  const protectedActionEvidence =
    protectedActionEvidenceFromAssurance(assurance);
  const diagnosticsCapturedMs = timestamp(diagnostics?.capturedAt);
  const assuranceCapturedMs = timestamp(assurance?.capturedAt);
  const protectedActionCapturedMs = timestamp(protectedActionProof?.capturedAt);
  const protectedActionFinishedMs = timestamp(
    protectedActionProof?.receipt?.finishedAt,
  );
  const protectedProjectionMatches =
    protectedActionEvidence?.schemaVersion ===
      protectedActionProof?.schemaVersion &&
    protectedActionEvidence?.capturedAt === protectedActionProof?.capturedAt &&
    targetIdFrom(protectedActionEvidence) ===
      targetIdFrom(protectedActionProof) &&
    protectedActionEvidence?.targetMatches ===
      protectedActionValidation.targetMatches &&
    protectedActionEvidence?.protectedActionReady ===
      protectedActionValidation.protectedActionReady &&
    protectedActionEvidence?.passed === protectedActionValidation.passed;
  const blocked = [];

  if (
    !evidenceContractReady({
      evidence: diagnostics,
      schemaVersion: "nexus-release-diagnostics.v1",
      now,
    })
  ) {
    blocked.push("Current staged diagnostics schema or freshness is invalid.");
  }
  if (
    !evidenceContractReady({
      evidence: assurance,
      schemaVersion: "nexus-web-staging-assurance.v1",
      now,
    })
  ) {
    blocked.push(
      "Current web staging assurance schema or freshness is invalid.",
    );
  }

  if (
    diagnostics?.releaseProofReady !== true ||
    diagnostics?.identity?.passed !== true
  ) {
    blocked.push(
      "Current staged diagnostics do not prove a release-ready deployment.",
    );
  }
  if (!targetId || diagnostics?.target?.staged !== true) {
    blocked.push(
      "Known-good evidence requires a sanitized staged target identity.",
    );
  }
  const missingIdentity = requiredIdentityMissing(identity);
  if (missingIdentity.length > 0) {
    blocked.push(
      `Known-good deployment identity is incomplete: ${missingIdentity.join(", ")}.`,
    );
  }
  if (!bootId) {
    blocked.push(
      "Known-good diagnostics do not expose a runtime boot identity.",
    );
  }
  if (assurance?.assuranceReady !== true || !assuranceChecksPassed(assurance)) {
    blocked.push("Current web staging assurance is missing or incomplete.");
  }
  if (targetId && assuranceTargetId !== targetId) {
    blocked.push(
      "Diagnostics and assurance do not refer to the same staged target.",
    );
  }
  if (!protectedActionValidation.passed || !protectedProjectionMatches) {
    blocked.push(
      "Known-good evidence requires the same canonically signed protected-action proof projected by assurance.",
    );
  }
  if (
    diagnosticsCapturedMs === null ||
    assuranceCapturedMs === null ||
    protectedActionCapturedMs === null ||
    protectedActionFinishedMs === null ||
    diagnosticsCapturedMs > protectedActionFinishedMs ||
    protectedActionFinishedMs > protectedActionCapturedMs ||
    protectedActionCapturedMs > assuranceCapturedMs ||
    assuranceCapturedMs > now.getTime()
  ) {
    blocked.push(
      "Known-good evidence must order diagnostics, the signed protected action, assurance, and baseline capture on the same runtime.",
    );
  }
  if (typeof evidenceKey !== "string" || evidenceKey.length < 16) {
    blocked.push(
      "NEXUS_EVIDENCE_KEY is required to sign the immutable known-good baseline.",
    );
  }

  const artifact = sanitizeDiagnosticValue({
    schemaVersion: KNOWN_GOOD_SCHEMA_VERSION,
    capturedAt,
    targetId,
    identity,
    runtime: { bootId },
    sourceEvidence: {
      diagnostics: summarizeDiagnosticsEvidence(diagnostics),
      assurance: summarizeAssuranceEvidence(assurance),
    },
    protectedActionProof: sanitizeDiagnosticValue(protectedActionProof),
    evidence: {
      diagnostics: "docs/metrics/release-diagnostics-latest.json",
      assurance: "docs/metrics/web-staging-assurance-latest.json",
      protectedAction: "docs/metrics/protected-action-proof-latest.json",
    },
    ready: blocked.length === 0,
    blocked,
    envelopeSignature: null,
  });
  if (typeof evidenceKey === "string" && evidenceKey.length >= 16) {
    artifact.envelopeSignature = signKnownGoodEnvelope(artifact, evidenceKey);
  }
  return artifact;
}

export function buildRollbackProof({
  knownGood,
  diagnostics,
  assurance,
  protectedActionProof,
  rollbackStartedAt,
  confirmation,
  now = new Date(),
  evidenceKey = "",
}) {
  const capturedAt = now.toISOString();
  const identity = identityFromDiagnostics(diagnostics);
  const restoredBootId = bootIdFromDiagnostics(diagnostics);
  const knownIdentity = knownGood?.identity ?? {};
  const identityMatches =
    requiredIdentityMissing(identity).length === 0 &&
    requiredIdentityMissing(knownIdentity).length === 0 &&
    immutableRollbackIdentityMatches(identity, knownIdentity);
  const targetMatches =
    Boolean(knownGood?.targetId) &&
    targetIdFrom(diagnostics) === knownGood.targetId &&
    targetIdFrom(assurance) === knownGood.targetId;
  const restartObserved =
    Boolean(restoredBootId && knownGood?.runtime?.bootId) &&
    restoredBootId !== knownGood.runtime.bootId;
  const diagnosticsArePostRollback = postRollbackEvidenceIsFresh({
    evidence: diagnostics,
    rollbackStartedAt,
  });
  const startedAtMs = timestamp(rollbackStartedAt);
  const diagnosticsCapturedMs = timestamp(diagnostics?.capturedAt);
  const assuranceCapturedMs = timestamp(assurance?.capturedAt);
  const assuranceIsPostRollback = postRollbackEvidenceIsFresh({
    evidence: assurance,
    rollbackStartedAt,
  });
  const protectedActionEvidence =
    protectedActionEvidenceFromAssurance(assurance);
  const protectedActionValidation = validateProtectedActionProofArtifact({
    proof: protectedActionProof,
    targetId: knownGood?.targetId ?? null,
    capturedAt: now,
    evidenceKey,
  });
  const protectedActionIsPostRollback = postRollbackEvidenceIsFresh({
    evidence: protectedActionProof,
    rollbackStartedAt,
  });
  const protectedActionReceiptIsPostRollback =
    timestamp(protectedActionProof?.receipt?.finishedAt) !== null &&
    startedAtMs !== null &&
    timestamp(protectedActionProof?.receipt?.finishedAt) >= startedAtMs;
  const protectedActionCapturedMs = timestamp(protectedActionProof?.capturedAt);
  const protectedActionFinishedMs = timestamp(
    protectedActionProof?.receipt?.finishedAt,
  );
  const protectedActionObservedOnRestoredRuntime =
    diagnosticsCapturedMs !== null &&
    assuranceCapturedMs !== null &&
    protectedActionCapturedMs !== null &&
    protectedActionFinishedMs !== null &&
    protectedActionFinishedMs >= diagnosticsCapturedMs &&
    protectedActionCapturedMs >= diagnosticsCapturedMs &&
    protectedActionFinishedMs <= protectedActionCapturedMs &&
    assuranceCapturedMs >= protectedActionCapturedMs &&
    assuranceCapturedMs <= now.getTime();
  const protectedActionTargetMatches =
    Boolean(knownGood?.targetId) &&
    protectedActionValidation.targetMatches === true &&
    targetIdFrom(protectedActionProof) === knownGood.targetId;
  const protectedActionAssuranceProjectionMatches =
    protectedActionEvidence?.schemaVersion ===
      protectedActionProof?.schemaVersion &&
    protectedActionEvidence?.passed === protectedActionValidation.passed &&
    protectedActionEvidence?.targetMatches ===
      protectedActionValidation.targetMatches &&
    protectedActionEvidence?.protectedActionReady ===
      protectedActionValidation.protectedActionReady &&
    protectedActionEvidence?.capturedAt === protectedActionProof?.capturedAt &&
    targetIdFrom(protectedActionEvidence) ===
      targetIdFrom(protectedActionProof);
  const protectedActionEvidencePassed = protectedActionValidation.passed;
  const knownGoodValidation = validateKnownGoodDeploymentArtifact({
    proof: knownGood,
    capturedAt: now,
    evidenceKey,
  });
  const postRollbackChecksPassed =
    diagnostics?.releaseProofReady === true &&
    diagnostics?.identity?.passed === true &&
    assurance?.assuranceReady === true &&
    assuranceChecksPassed(assurance) &&
    knownGoodValidation.passed &&
    targetMatches &&
    protectedActionIsPostRollback &&
    protectedActionReceiptIsPostRollback &&
    protectedActionObservedOnRestoredRuntime &&
    protectedActionTargetMatches &&
    protectedActionAssuranceProjectionMatches &&
    protectedActionEvidencePassed;
  const finishedAtMs = now.getTime();
  const recoveryDurationMs =
    startedAtMs !== null && finishedAtMs >= startedAtMs
      ? finishedAtMs - startedAtMs
      : null;
  const blocked = [];

  if (
    !evidenceContractReady({
      evidence: diagnostics,
      schemaVersion: "nexus-release-diagnostics.v1",
      now,
    })
  ) {
    blocked.push("Post-rollback diagnostics schema or freshness is invalid.");
  }
  if (
    !evidenceContractReady({
      evidence: assurance,
      schemaVersion: "nexus-web-staging-assurance.v1",
      now,
    })
  ) {
    blocked.push("Post-rollback web assurance schema or freshness is invalid.");
  }

  if (!knownGoodValidation.passed) {
    blocked.push(
      "A signed, immutable, canonically valid known-good deployment is required before rollback proof.",
    );
  }
  if (confirmation !== ROLLBACK_CONFIRMATION) {
    blocked.push(
      "Explicit operator confirmation of the real platform rollback is required.",
    );
  }
  if (startedAtMs === null || recoveryDurationMs === null) {
    blocked.push("A valid rollback start timestamp is required.");
  }
  if (!diagnosticsArePostRollback || !assuranceIsPostRollback) {
    blocked.push(
      "Diagnostics and assurance must be captured after rollback started.",
    );
  }
  if (!protectedActionIsPostRollback) {
    blocked.push(
      "The nested protected-action proof must be captured after rollback started.",
    );
  }
  if (!protectedActionReceiptIsPostRollback) {
    blocked.push(
      "The protected-action receipt must finish after rollback started.",
    );
  }
  if (!protectedActionObservedOnRestoredRuntime) {
    blocked.push(
      "The protected action must finish after restored-runtime diagnostics and before the final assurance capture.",
    );
  }
  if (!protectedActionTargetMatches) {
    blocked.push(
      "The nested protected-action proof must match the restored staged target.",
    );
  }
  if (!protectedActionAssuranceProjectionMatches) {
    blocked.push(
      "Web assurance must project the same canonical protected-action proof used for rollback verification.",
    );
  }
  if (!protectedActionEvidencePassed) {
    blocked.push(
      "The protected-action artifact must retain valid receipt and envelope signatures with a passing canonical verdict.",
    );
  }
  if (!identityMatches) {
    blocked.push(
      "Restored source commit and image digest do not match known-good identity.",
    );
  }
  if (!restoredBootId) {
    blocked.push(
      "Post-rollback diagnostics do not expose a runtime boot identity.",
    );
  }
  if (!restartObserved) {
    blocked.push(
      "Rollback proof requires a new runtime boot identity after restoration.",
    );
  }
  if (!postRollbackChecksPassed) {
    blocked.push(
      "Fresh post-rollback health, auth, routes, feeds, capability, and protected-action checks have not all passed.",
    );
  }

  if (typeof evidenceKey !== "string" || evidenceKey.length < 16) {
    blocked.push(
      "NEXUS_EVIDENCE_KEY is required to verify and sign rollback evidence.",
    );
  }

  const artifact = sanitizeDiagnosticValue({
    schemaVersion: ROLLBACK_PROOF_SCHEMA_VERSION,
    capturedAt,
    expiresAt: new Date(
      now.getTime() + ROLLBACK_EVIDENCE_MAX_AGE_MS,
    ).toISOString(),
    rollbackStartedAt: nonEmpty(rollbackStartedAt),
    recoveryDurationMs,
    targetId: knownGood?.targetId ?? null,
    attestationKind: "operator-confirmed-platform-action",
    restoredIdentity: identity,
    knownGoodIdentity: knownIdentity,
    knownGoodEnvelopeSignature: knownGood?.envelopeSignature ?? null,
    restoredRuntime: {
      bootId: restoredBootId,
      restartObserved,
    },
    knownGoodRuntime: knownGood?.runtime ?? { bootId: null },
    knownGoodMatch: identityMatches,
    postRollbackChecksPassed,
    operatorConfirmedPlatformRollback: confirmation === ROLLBACK_CONFIRMATION,
    rollbackVerified: blocked.length === 0,
    protectedActionProof: summarizeProtectedActionProof(
      protectedActionProof,
      protectedActionValidation,
    ),
    sourceEvidence: {
      diagnostics: summarizeDiagnosticsEvidence(diagnostics),
      assurance: summarizeAssuranceEvidence(assurance),
    },
    evidence: {
      knownGood: "docs/metrics/known-good-deployment-latest.json",
      diagnostics: "docs/metrics/release-diagnostics-latest.json",
      assurance: "docs/metrics/web-staging-assurance-latest.json",
      protectedAction: "docs/metrics/protected-action-proof-latest.json",
    },
    blocked,
    envelopeSignature: null,
  });
  if (typeof evidenceKey === "string" && evidenceKey.length >= 16) {
    artifact.envelopeSignature = signRollbackProofEnvelope(
      artifact,
      evidenceKey,
    );
  }
  return artifact;
}

function readArg(name) {
  const prefix = `--${name}=`;
  const arg = process.argv.slice(3).find((entry) => entry.startsWith(prefix));
  return arg ? arg.slice(prefix.length).trim() : "";
}

function recordKnownGood() {
  loadEnv({ path: ".env.local" });
  const writePosture = classifyKnownGoodWrite(
    existsSync(knownGoodPath)
      ? (readJson(knownGoodPath) ?? { unreadable: true })
      : null,
  );
  if (!writePosture.allowed) {
    console.error(`x known-good record blocked: ${writePosture.reason}`);
    process.exit(1);
  }
  const evidenceKey = process.env.NEXUS_EVIDENCE_KEY ?? "";
  const artifact = buildKnownGoodDeployment({
    diagnostics: readJson(diagnosticsPath),
    assurance: readJson(assurancePath),
    protectedActionProof: readJson(protectedActionPath),
    evidenceKey,
  });
  const validation = validateKnownGoodDeploymentArtifact({
    proof: artifact,
    capturedAt: new Date(),
    evidenceKey,
  });
  if (!validation.passed) {
    console.error(
      `x known-good record blocked: ${artifact.blocked.join("; ")}`,
    );
    process.exit(1);
  }
  try {
    writeJson(knownGoodPath, artifact, { exclusive: true });
  } catch (error) {
    if (error?.code === "EEXIST") {
      console.error(
        "x known-good record blocked: an immutable baseline already exists.",
      );
      process.exit(1);
    }
    throw error;
  }
  console.log("ok known-good deployment recorded from current staged evidence");
}

function verifyRollback() {
  loadEnv({ path: ".env.local" });
  const evidenceKey = process.env.NEXUS_EVIDENCE_KEY ?? "";
  const knownGood = readJson(knownGoodPath);
  const diagnostics = readJson(diagnosticsPath);
  const assurance = readJson(assurancePath);
  const protectedActionProof = readJson(protectedActionPath);
  const artifact = buildRollbackProof({
    knownGood,
    diagnostics,
    assurance,
    protectedActionProof,
    rollbackStartedAt: readArg("started-at"),
    confirmation: readArg("confirm"),
    evidenceKey,
  });
  writeJson(rollbackPath, artifact);
  const identity = identityFromDiagnostics(diagnostics);
  const validation = validateRollbackProofArtifact({
    proof: artifact,
    knownGood,
    diagnostics,
    assurance,
    protectedActionProof,
    targetId: knownGood?.targetId ?? null,
    sourceCommit: identity.sourceCommit,
    imageDigest: identity.imageDigest,
    capturedAt: new Date(),
    evidenceKey,
  });
  if (!validation.passed) {
    console.error(
      `x rollback verification blocked: ${artifact.blocked.join("; ")}`,
    );
    process.exit(1);
  }
  console.log(
    "ok platform rollback verified against known-good identity and fresh post-rollback checks",
  );
}

function main() {
  const command = process.argv[2];
  if (command === "record-known-good") return recordKnownGood();
  if (command === "verify-rollback") return verifyRollback();
  console.error(
    "Usage: staging-rollback-proof.mjs <record-known-good|verify-rollback> [--started-at=<ISO>] [--confirm=I_PERFORMED_PLATFORM_ROLLBACK]",
  );
  process.exit(2);
}

const isMain =
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) main();
