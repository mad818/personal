#!/usr/bin/env node
/* eslint-disable no-console */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { config as loadEnv } from "dotenv";
import { buildCurrentReadinessRollup } from "./readiness-rollup.mjs";

loadEnv({ path: ".env.local" });

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

const script = read("scripts/readiness-rollup.mjs");
const runtime = read("scripts/check-readiness-rollup-runtime.mjs");
const spec = read(
  "specs/features/rc1-web-staging-and-adaptive-reliability-closure.md",
);
const metricsReadme = read("docs/metrics/README.md");
const packageJsonText = read("package.json");
const artifactText = read("docs/metrics/readiness-rollup-latest.json");

let packageJson = {};
let artifact = {};
try {
  packageJson = JSON.parse(packageJsonText);
} catch {
  findings.push("package.json is not valid JSON.");
}
try {
  artifact = JSON.parse(artifactText);
} catch {
  findings.push("readiness-rollup-latest.json is not valid JSON.");
}

for (const needle of [
  'READINESS_SCHEMA_VERSION = "nexus-readiness-rollup.v2"',
  "ACTIVE_RELEASE_CANDIDATE_TAG",
  '"webCandidate"',
  '"desktop"',
  '"phonePwa"',
  '"approval-required"',
  '"protected-action-proof"',
  '"nexus-protected-action-proof.v1"',
  "protectedActionTargetMatches",
  "evaluateReleaseCandidateCorrelation",
  "createEvidenceRecord",
  "buildReadinessLane",
  "buildCurrentReadinessRollup",
  "sanitizeForArtifact",
  'stableMetric("readiness-rollup-latest.json")',
]) {
  if (needle === 'stableMetric("readiness-rollup-latest.json")') continue;
  requireText(script, needle, "readiness rollup runtime");
}
for (const file of [
  "phone-local-acceptance-latest.json",
  "release-diagnostics-latest.json",
  "github-security-posture-latest.json",
  "dependabot-security-audit-latest.json",
  "dependency-risk-posture-latest.json",
  "infra-hardening-latest.json",
  "desktop-trust-chain-latest.json",
  "desktop-signing-preflight-latest.json",
  "docker-release-proof-latest.json",
  "web-staging-assurance-latest.json",
  "protected-action-proof-latest.json",
  "known-good-deployment-latest.json",
  "rollback-proof-latest.json",
]) {
  requireText(script, file, "readiness rollup runtime");
}

if (/latestMetric\s*\(/.test(script)) {
  findings.push(
    "Readiness rollup must use exact stable artifact paths, not prefix discovery.",
  );
}
requireText(runtime, "seven states", "readiness runtime proof");
requireText(
  runtime,
  "phone and desktop must not block web",
  "readiness runtime proof",
);
requireText(runtime, "shared blocker must reach", "readiness runtime proof");
requireText(
  runtime,
  "release projection must read target.targetId",
  "readiness runtime proof",
);
requireText(runtime, "cp2FullChain", "readiness runtime proof");
requireText(runtime, "noKeyRollup", "readiness runtime proof");
requireText(runtime, "tamperedKnownGoodRollup", "readiness runtime proof");
requireText(runtime, "staleRc1Metrics", "readiness runtime proof");
requireText(
  read("scripts/validate-readiness-rollup.mjs"),
  "Latest readiness artifact does not match a canonical recomputation",
  "readiness validator",
);
requireText(
  spec,
  "Required missing, malformed, or timestamp-free evidence is never success",
  "feature spec",
);

const runtimeCommand =
  packageJson.scripts?.["readiness:rollup:runtime:check"] ?? "";
const checkCommand = packageJson.scripts?.["readiness:rollup:check"] ?? "";
if (runtimeCommand !== "node scripts/check-readiness-rollup-runtime.mjs") {
  findings.push(
    "package.json has no exact readiness:rollup:runtime:check command.",
  );
}
if (
  checkCommand !==
  "node scripts/validate-readiness-rollup.mjs && npm run readiness:rollup:runtime:check"
) {
  findings.push("package.json has no exact readiness:rollup:check command.");
}
if (
  !String(packageJson.scripts?.verify ?? "").includes(
    "npm run readiness:rollup:check",
  )
) {
  findings.push("Canonical verify does not run readiness:rollup:check.");
}

requireText(metricsReadme, "Web candidate", "metrics README");
requireText(metricsReadme, "Phone/PWA", "metrics README");
requireText(metricsReadme, "evidence expiry", "metrics README");
requireText(
  metricsReadme,
  "protected-action-proof-latest.json",
  "metrics README",
);

if (artifact.schemaVersion !== "nexus-readiness-rollup.v2") {
  findings.push("Latest readiness artifact has the wrong schemaVersion.");
}
for (const lane of ["webCandidate", "desktop", "phonePwa"]) {
  if (!artifact.lanes?.[lane])
    findings.push(`Latest artifact is missing lanes.${lane}.`);
}
if (!artifact.artifacts?.protectedActionProof) {
  findings.push("Latest artifact is missing artifacts.protectedActionProof.");
}
if (!artifact.artifacts?.knownGoodDeployment) {
  findings.push("Latest artifact is missing artifacts.knownGoodDeployment.");
}
if (
  !artifact.lanes?.webCandidate?.evidence?.some(
    (entry) => entry?.id === "protected-action-proof",
  )
) {
  findings.push(
    "Latest Web candidate lane is missing protected-action-proof evidence.",
  );
}
if (artifact.releaseCandidateReadyScope !== "webCandidate") {
  findings.push(
    "Legacy releaseCandidateReady is not explicitly scoped to webCandidate.",
  );
}
if (artifact.candidateIdentity?.tag !== "v1.0.0-rc.2") {
  findings.push(
    "Latest artifact is not scoped to active candidate v1.0.0-rc.2.",
  );
}
if (typeof artifact.candidateIdentity?.ready !== "boolean") {
  findings.push("Latest artifact is missing candidate identity correlation.");
}
if (Object.hasOwn(artifact.lanes ?? {}, "webRc1")) {
  findings.push("Latest artifact still exposes the retired lanes.webRc1 key.");
}
if (Object.hasOwn(artifact.posture ?? {}, "webRc1Ready")) {
  findings.push(
    "Latest artifact still exposes the retired webRc1Ready posture.",
  );
}
if (
  artifactText.includes("private-stage.example.internal") ||
  /Bearer\s+[A-Za-z0-9._-]{8,}/.test(artifactText)
) {
  findings.push(
    "Latest readiness artifact contains unsanitized target or token data.",
  );
}

if (artifact?.capturedAt) {
  try {
    const recomputed = buildCurrentReadinessRollup({
      now: artifact.capturedAt,
      evidenceKey: process.env.NEXUS_EVIDENCE_KEY ?? "",
    });
    if (JSON.stringify(recomputed) !== JSON.stringify(artifact)) {
      findings.push(
        "Latest readiness artifact does not match a canonical recomputation from current evidence and checks.",
      );
    }
  } catch {
    findings.push(
      "Latest readiness artifact could not be canonically recomputed from current evidence.",
    );
  }
} else {
  findings.push("Latest readiness artifact is missing capturedAt.");
}

if (findings.length > 0) {
  console.error(
    `Readiness rollup validation found ${findings.length} issue(s):`,
  );
  for (const finding of findings) console.error(`- ${finding}`);
  process.exit(1);
}

console.log(
  "Readiness rollup validation OK (versioned waves, exact stable evidence, canonical proof, and sanitized latest artifact).",
);
