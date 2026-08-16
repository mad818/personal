#!/usr/bin/env node
/* eslint-disable no-console */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const findings = [];

function read(relativePath) {
  const fullPath = join(root, relativePath);
  if (!existsSync(fullPath)) {
    findings.push(`Missing ${relativePath}.`);
    return "";
  }
  return readFileSync(fullPath, "utf8");
}

function requireText(text, needle, owner) {
  if (!text.includes(needle)) findings.push(`${owner} is missing ${needle}.`);
}

const diagnostics = read("scripts/release-diagnostics-capture.mjs");
const releaseCandidate = read("scripts/release-candidate.mjs");
const rehearsal = read("scripts/cp2-staged-release-rehearsal.mjs");
const releaseSmoke = read("scripts/release-smoke.mjs");
const runtime = read("scripts/check-staging-evidence-contract-runtime.mjs");
const rollbackProof = read("scripts/staging-rollback-proof.mjs");
const rollbackSignature = read("scripts/rollback-proof-signature.mjs");
const rollbackRuntime = read(
  "scripts/check-staging-rollback-proof-runtime.mjs",
);
const dockerProof = read("scripts/docker-release-proof.mjs");
const dockerRuntime = read("scripts/check-docker-release-proof-runtime.mjs");
const webAssurance = read("scripts/web-staging-assurance.mjs");
const webAssuranceRuntime = read(
  "scripts/check-web-staging-assurance-runtime.mjs",
);
const webAssuranceValidator = read(
  "scripts/validate-web-staging-assurance.mjs",
);
const releaseIdentity = read("lib/releaseIdentity.ts");
const healthRoute = read("app/api/health/route.ts");
const statusRoute = read("app/api/status/route.ts");
const diagnosticsRoute = read("app/api/diagnostics/route.ts");
const dockerfile = read("Dockerfile");
const envExample = read(".env.example");
const retention = read("scripts/validate-metrics-retention.mjs");
const metricsReadme = read("docs/metrics/README.md");
const webRunbook = read("docs/deployment/web-operator-runbook.md");
const fd2Runbook = read("docs/deployment/fd2-release-runbook.md");
const checklist = read("docs/deployment/release-readiness-checklist.md");
const packageJson = JSON.parse(read("package.json") || "{}");

for (const needle of [
  "parseReleaseTarget",
  "normalizeReleaseSmokeTarget",
  "https://<staging-target>",
]) {
  requireText(releaseSmoke, needle, "release smoke target safety");
}

for (const needle of [
  "DEFAULT_DIAGNOSTIC_ROUTES",
  "MAX_RESPONSE_BYTES",
  "Remote staging targets must use HTTPS",
  "buildTargetId",
  "NEXUS_EVIDENCE_KEY",
  "sanitizeDiagnosticValue",
  "evidenceMaxAgeMs",
  "releaseIdentity",
  "strictTransportSecurity",
  "contentSecurityPolicy",
  "no-store",
  "releaseProofReady",
  "ACTIVE_RELEASE_CANDIDATE_TAG",
  "resolveLocalReleaseCandidate",
  "trusted-candidate-tag-resolution",
  "locally editable JSON are not independent provenance",
]) {
  requireText(diagnostics, needle, "release diagnostics");
}
for (const forbidden of [
  "platform-deployment-proof-latest.json",
  "platformProof?.verified",
  "EXPECTED_RC1_COMMIT",
  "EXPECTED_RC1_TAG",
  "5160ac9863725a10230a51c4d45c4cb0be218540",
]) {
  if (diagnostics.includes(forbidden)) {
    findings.push(
      `Release diagnostics still trusts local platform assertion ${forbidden}.`,
    );
  }
}
for (const needle of [
  'ACTIVE_RELEASE_CANDIDATE_TAG = "v1.0.0-rc.2"',
  "classifyReleaseCandidate",
  "resolveLocalReleaseCandidate",
  "refs/tags/",
  'normalizedObjectType !== "tag"',
  'state: "ref-changed"',
  "no HEAD, environment, or artifact fallback",
]) {
  requireText(releaseCandidate, needle, "release candidate resolver");
}
for (const forbidden of ["process.env", "EXPECTED_SOURCE_COMMIT"]) {
  if (releaseCandidate.includes(forbidden)) {
    findings.push(
      `Release candidate resolver contains forbidden fallback material ${forbidden}.`,
    );
  }
}
for (const route of [
  '"/hq"',
  '"/command"',
  '"/intel"',
  '"/alpha"',
  '"/cyber"',
  '"/recon"',
  '"/vault"',
  '"/resources"',
]) {
  requireText(runtime, route, "staging runtime proof");
}
for (const needle of [
  "createRollbackPosture",
  "Diagnostics are not rollback proof",
  "--require-staged",
  "targetIdentityMatches",
  "validateRollbackProofArtifact",
]) {
  requireText(rehearsal, needle, "staged rehearsal");
}
for (const needle of [
  "I_PERFORMED_PLATFORM_ROLLBACK",
  "buildKnownGoodDeployment",
  "buildRollbackProof",
  "known-good-deployment-latest.json",
  "web-staging-assurance-latest.json",
  "rollback-proof-latest.json",
  "postRollbackEvidenceIsFresh",
  "recoveryDurationMs",
  "validateRollbackProofArtifact",
  "validateKnownGoodDeploymentArtifact",
  "classifyKnownGoodWrite",
  "verifyRollbackProofEnvelope",
  "verifyKnownGoodEnvelope",
  'attestationKind: "operator-confirmed-platform-action"',
  "sourceEvidence",
  "REQUIRED_IDENTITY_KEYS",
  "IMMUTABLE_ROLLBACK_IDENTITY_KEYS",
  "immutableRollbackIdentityMatches",
  "currentEvidenceReady",
  "evidenceBootsMatch",
  "assuranceProtectedActionMatches",
  "exclusive: true",
]) {
  requireText(rollbackProof, needle, "rollback proof contract");
}
for (const needle of [
  "KNOWN_GOOD_ENVELOPE_VERSION",
  "signKnownGoodEnvelope",
  "verifyKnownGoodEnvelope",
  "ROLLBACK_PROOF_ENVELOPE_VERSION",
  "signRollbackProofEnvelope",
  "verifyRollbackProofEnvelope",
]) {
  requireText(rollbackSignature, needle, "rollback signature contract");
}
for (const needle of [
  "diagnosisAlone",
  "stalePreRollbackEvidence",
  "wrongImageAndCommit",
  "ROLLBACK_CONFIRMATION",
  "staleCapturedKnownGoodInput",
  "overlongExpiryKnownGoodInput",
  "tamperedKnownGood",
  "incompleteKnownGood",
  "mismatchedKnownGoodIdentity",
  "restoredRuntimeForgery",
  "forgedFailedCurrentProof",
  "forgedIncompleteIdentityProof",
  "forgedMismatchedTargetProof",
  "forgedProjectionProof",
  "futureNestedEvidence",
  "lateReceiptRollback",
]) {
  requireText(rollbackRuntime, needle, "rollback runtime proof");
}
for (const needle of [
  "EXPECTED_RELEASE_TAG",
  "ACTIVE_RELEASE_CANDIDATE_TAG",
  "resolveLocalReleaseCandidate",
  "source.peeledCommit",
  "source.tagObject",
  '"archive"',
  "127.0.0.1::3000",
  "pollContainerHealth",
  "release-smoke.mjs",
  "runtimeUid",
  "cleanup.passed",
  "docker-release-proof-latest.json",
]) {
  requireText(dockerProof, needle, "Docker release proof");
}
for (const needle of [
  "classifyReleaseCandidate",
  "resolveLocalReleaseCandidate",
  "sanitizeArtifact",
  "isContainedPath",
  "isNonRootUser",
  "classifyDockerProof",
]) {
  requireText(dockerRuntime, needle, "Docker release runtime proof");
}
for (const needle of [
  "nexus-web-staging-assurance.v1",
  "web-staging-assurance-latest.json",
  "WEB_STAGING_FEED_PROBES",
  "/api/sec-filings?query=10-K",
  'method: "GET"',
  "readBoundedJsonResponse",
  "runtime-consistency.mjs",
  "release-diagnostics-capture.mjs",
  "mutatingMethodsUsed",
]) {
  requireText(webAssurance, needle, "web staging assurance");
}
requireText(
  webAssuranceRuntime,
  "malformedFeed",
  "web staging assurance runtime proof",
);
requireText(
  webAssuranceValidator,
  "read-only composition",
  "web staging assurance validator",
);
for (const forbidden of [
  "rollbackProof.captured = diagnostics.status === 0",
  "https?:\\/\\/",
  "baseUrl: baseUrl || null",
  "readJson(rollbackPath)",
]) {
  if (rehearsal.includes(forbidden)) {
    findings.push(
      `Staged rehearsal still contains forbidden pattern ${forbidden}.`,
    );
  }
}

const runtimeCommand = packageJson.scripts?.["staging:evidence:runtime:check"];
const checkCommand = packageJson.scripts?.["staging:evidence:check"];
if (
  runtimeCommand !==
  "node --no-warnings --experimental-strip-types scripts/check-staging-evidence-contract-runtime.mjs"
) {
  findings.push(
    "package.json is missing the exact staging:evidence:runtime:check command.",
  );
}
if (
  packageJson.scripts?.["staging:known-good:record"] !==
  "node scripts/staging-rollback-proof.mjs record-known-good"
) {
  findings.push(
    "package.json is missing the exact staging:known-good:record command.",
  );
}
if (
  packageJson.scripts?.["staging:rollback:verify"] !==
  "node scripts/staging-rollback-proof.mjs verify-rollback"
) {
  findings.push(
    "package.json is missing the exact staging:rollback:verify command.",
  );
}
if (
  packageJson.scripts?.["staging:docker:preflight"] !==
    "node scripts/docker-release-proof.mjs --preflight" ||
  packageJson.scripts?.["staging:docker:proof"] !==
    "node scripts/docker-release-proof.mjs"
) {
  findings.push(
    "package.json is missing the exact Docker release proof commands.",
  );
}
if (
  packageJson.scripts?.["staging:assurance"] !==
    "node scripts/web-staging-assurance.mjs" ||
  packageJson.scripts?.["staging:assurance:check"] !==
    "node scripts/validate-web-staging-assurance.mjs && npm run staging:assurance:runtime:check"
) {
  findings.push(
    "package.json is missing the exact web staging assurance commands.",
  );
}

for (const needle of [
  "RELEASE_IDENTITY_SCHEMA_VERSION",
  "RELEASE_ENVIRONMENT_SCHEMA_VERSION",
  "buildReleaseIdentity",
  "NEXUS_BUILD_COMMIT_SHA",
  "NEXUS_RELEASE_TAG",
  "NEXUS_IMAGE_DIGEST",
  "NEXUS_DEPLOYMENT_ID",
  "createHash",
]) {
  requireText(releaseIdentity, needle, "release identity contract");
}
if (healthRoute.includes("releaseIdentity")) {
  findings.push("Public health route must not expose release provenance.");
}
for (const [route, owner] of [
  [statusRoute, "status route"],
  [diagnosticsRoute, "diagnostics route"],
]) {
  requireText(route, "readReleaseIdentity", owner);
  requireText(route, "releaseIdentity", owner);
}
for (const needle of [
  "FROM node:24-alpine AS deps",
  "FROM node:24-alpine AS builder",
  "FROM node:24-alpine AS runner",
  "ARG NEXUS_BUILD_COMMIT_SHA",
  "ARG NEXUS_RELEASE_TAG",
  "org.opencontainers.image.revision",
  "org.opencontainers.image.version",
  "HEALTHCHECK",
]) {
  requireText(dockerfile, needle, "Dockerfile");
}
if (dockerfile.includes("node:20")) {
  findings.push(
    "Dockerfile still uses Node 20 instead of the manifest-aligned Node 24 lane.",
  );
}
for (const variable of [
  "NEXUS_BUILD_COMMIT_SHA",
  "NEXUS_RELEASE_TAG",
  "NEXUS_IMAGE_DIGEST",
  "NEXUS_DEPLOYMENT_ID",
  "NEXUS_EVIDENCE_KEY",
]) {
  requireText(envExample, variable, ".env.example");
}
if (
  checkCommand !==
  "node scripts/validate-staging-evidence-contract.mjs && npm run staging:evidence:runtime:check && npm run staging:docker:runtime:check && npm run staging:protected-action:check && npm run staging:assurance:check && npm run staging:rollback:runtime:check"
) {
  findings.push(
    "package.json is missing the exact staging:evidence:check command.",
  );
}
if (
  !String(packageJson.scripts?.verify ?? "").includes(
    "npm run staging:evidence:check",
  )
) {
  findings.push("Canonical verify does not run staging:evidence:check.");
}

for (const family of [
  "cp2-staged-release-rehearsal",
  "docker-release-proof",
  "known-good-deployment",
  "rollback-proof",
]) {
  requireText(retention, family, "metrics retention validator");
}
for (const needle of [
  "sanitized target identity",
  "docker-release-proof-latest.json",
  "rollback-proof-latest.json",
  "cp2-staged-release-rehearsal-latest.json",
]) {
  requireText(metricsReadme, needle, "metrics README");
}
for (const [text, owner] of [
  [webRunbook, "web operator runbook"],
  [fd2Runbook, "FD2 runbook"],
  [checklist, "release readiness checklist"],
]) {
  requireText(text, "explicit approval", owner);
  requireText(text, "*-latest.json", owner);
  if (/timestamped diagnostics/i.test(text)) {
    findings.push(`${owner} still requires timestamped diagnostics.`);
  }
}

if (findings.length > 0) {
  console.error(
    `Staging evidence validation found ${findings.length} issue(s):`,
  );
  for (const finding of findings) console.error(`- ${finding}`);
  process.exit(1);
}

console.log(
  "Staging evidence validation OK (HTTPS target, sanitized identity, bounded routes, distinct rollback proof, stable retention, and approval stops).",
);
