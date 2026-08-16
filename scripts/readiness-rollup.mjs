#!/usr/bin/env node
/* eslint-disable no-console */

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";
import { ACTIVE_RELEASE_CANDIDATE_TAG } from "./release-candidate.mjs";
import { validateProtectedActionProofArtifact } from "./staging-protected-action-proof.mjs";
import { validateRollbackProofArtifact } from "./staging-rollback-proof.mjs";

const root = process.cwd();
const metricsDir = join(root, "docs", "metrics");
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

export const READINESS_SCHEMA_VERSION = "nexus-readiness-rollup.v2";
export { ACTIVE_RELEASE_CANDIDATE_TAG };
export const READINESS_STATES = Object.freeze([
  "ready",
  "degraded",
  "retained",
  "unavailable",
  "stale",
  "blocked",
  "approval-required",
]);

const STATE_PRECEDENCE = Object.freeze([
  "blocked",
  "unavailable",
  "stale",
  "approval-required",
  "retained",
  "degraded",
  "ready",
]);

const WAVE_IDS = Object.freeze(["webCandidate", "desktop", "phonePwa"]);

function sanitizeString(value) {
  return value
    .replace(
      /\b(?:10(?:\.\d{1,3}){3}|172\.(?:1[6-9]|2\d|3[01])(?:\.\d{1,3}){2}|192\.168(?:\.\d{1,3}){2})\b/g,
      "<LAN-IP>",
    )
    .replace(/\b[A-Za-z]:\\Users\\[^\\\s`"']+(?:\\[^\s`"']*)?/g, "<repo-root>")
    .replace(
      /\bBearer\s+[A-Za-z0-9._-]{8,}\b/g,
      "Bearer <redacted-local-token>",
    )
    .replace(
      /\b(?:token|secret|password|apiKey|authHeader)\b["']?\s*[:=]\s*["'][^"']+["']/gi,
      '$1: "<redacted-local-token>"',
    )
    .replace(
      /\b(https?):\/\/([A-Za-z0-9.-]+)(?::\d+)?/gi,
      (match, protocol, hostname) => {
        const normalized = hostname.toLowerCase();
        if (normalized === "localhost" || normalized === "127.0.0.1") {
          return match;
        }
        return `${protocol.toLowerCase()}://<release-target>`;
      },
    );
}

export function sanitizeForArtifact(value) {
  if (typeof value === "string") return sanitizeString(value);
  if (Array.isArray(value)) return value.map(sanitizeForArtifact);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [
      key,
      sanitizeForArtifact(entry),
    ]),
  );
}

function normalizeDate(value) {
  if (typeof value !== "string" || !value.trim()) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? new Date(parsed) : null;
}

function timestampFrom(data) {
  if (!data || typeof data !== "object") return null;
  for (const key of ["capturedAt", "generatedAt", "ts", "createdAt"]) {
    if (typeof data[key] === "string" && normalizeDate(data[key])) {
      return data[key];
    }
  }
  return null;
}

function allowedState(value) {
  return READINESS_STATES.includes(value) ? value : "unavailable";
}

function defaultEvidenceAction(id, state) {
  const actions = {
    ready: {
      id: "refresh-readiness-evidence",
      label: "Refresh readiness evidence before it expires",
      command: "npm run readiness:rollup",
      requiresApproval: false,
      reason: "Keep the stable latest artifact current.",
    },
    degraded: {
      id: `inspect-${id}`,
      label: `Inspect degraded ${id} evidence`,
      command: "npm run readiness:rollup",
      requiresApproval: false,
      reason: "Inspect the degraded evidence without mutating the target.",
    },
    retained: {
      id: `refresh-${id}`,
      label: `Refresh retained ${id} evidence`,
      command: "npm run readiness:rollup",
      requiresApproval: false,
      reason: "Replace retained proof with a current verified observation.",
    },
    unavailable: {
      id: "inspect-missing-evidence",
      label: "Inspect missing required evidence",
      command: "npm run readiness:rollup",
      requiresApproval: false,
      reason: "Missing or malformed evidence cannot be treated as success.",
    },
    stale: {
      id: `refresh-stale-${id}`,
      label: `Refresh stale ${id} evidence`,
      command: "npm run readiness:rollup",
      requiresApproval: false,
      reason: "Expired evidence must be recaptured before promotion.",
    },
    blocked: {
      id: `inspect-blocked-${id}`,
      label: `Inspect blocking ${id} evidence`,
      command:
        id === "docker-release-proof"
          ? "npm run staging:docker:preflight"
          : "npm run readiness:rollup",
      requiresApproval: false,
      reason:
        id === "docker-release-proof"
          ? "Restore the exact tag object in a network-enabled Git environment, then inspect the immutable Docker contract."
          : "Resolve the blocking condition at its owning boundary.",
    },
    "approval-required": {
      id: `request-approval-${id}`,
      label: `Request approval for ${id}`,
      command: null,
      requiresApproval: true,
      reason: "The next useful action crosses an explicit operator boundary.",
    },
  };
  return actions[state] ?? actions.unavailable;
}

export function createEvidenceRecord(input, nowInput = new Date()) {
  const now = normalizeDate(
    nowInput instanceof Date ? nowInput.toISOString() : String(nowInput),
  );
  if (!now)
    throw new Error("createEvidenceRecord requires a valid current time");

  const captured = normalizeDate(input.capturedAt);
  const maxAgeMs = Number(input.maxAgeMs);
  const validMaxAge = Number.isFinite(maxAgeMs) && maxAgeMs > 0;
  const baseReason = sanitizeString(
    String(input.reason || "Evidence state was not reported."),
  );
  let state = allowedState(input.reportedState);
  let freshnessStatus = "fresh";
  let expiresAt = null;
  let reason = baseReason;

  if (!captured || !validMaxAge) {
    state = "unavailable";
    freshnessStatus = "unavailable";
    reason = `${baseReason} Evidence timestamp or freshness policy is missing.`;
  } else {
    if (captured.getTime() > now.getTime() + 5 * 60 * 1000) {
      state = "unavailable";
      freshnessStatus = "unavailable";
      reason = `${baseReason} Evidence timestamp is in the future.`;
    }
    const policyExpiry = new Date(captured.getTime() + maxAgeMs);
    const declaredExpiry = normalizeDate(input.declaredExpiresAt);
    const expiry =
      declaredExpiry && declaredExpiry.getTime() < policyExpiry.getTime()
        ? declaredExpiry
        : policyExpiry;
    expiresAt = expiry.toISOString();
    if (freshnessStatus === "fresh" && now.getTime() > expiry.getTime()) {
      state = "stale";
      freshnessStatus = "stale";
      reason = `${baseReason} Evidence expired at ${expiresAt}.`;
    }
  }

  return sanitizeForArtifact({
    id: String(input.id),
    owner: String(input.owner),
    file: input.file ?? null,
    appliesTo: Array.isArray(input.appliesTo)
      ? input.appliesTo.filter((id) => WAVE_IDS.includes(id))
      : [],
    required: input.required !== false,
    capturedAt: captured?.toISOString() ?? null,
    maxAgeMs: validMaxAge ? maxAgeMs : null,
    expiresAt,
    freshnessStatus,
    state,
    reason,
    nextAction:
      input.nextAction ?? defaultEvidenceAction(String(input.id), state),
  });
}

function stateForEvidence(evidence) {
  return allowedState(evidence?.state);
}

function highestPrecedenceState(evidence) {
  for (const state of STATE_PRECEDENCE) {
    if (evidence.some((item) => stateForEvidence(item) === state)) return state;
  }
  return "unavailable";
}

function strongestAction(evidence, laneStatus) {
  const source = evidence.find(
    (item) => stateForEvidence(item) === laneStatus && item.nextAction,
  );
  return sanitizeForArtifact(
    source?.nextAction ??
      defaultEvidenceAction(source?.id ?? "readiness", laneStatus),
  );
}

export function buildReadinessLane({ id, label, evidence }) {
  const applicable = (Array.isArray(evidence) ? evidence : []).filter((item) =>
    item?.appliesTo?.includes(id),
  );

  if (applicable.length === 0) {
    return {
      id,
      label,
      status: "unavailable",
      ready: false,
      evidence: [],
      blockers: ["No applicable readiness evidence is available."],
      strongestSafeNextAction: defaultEvidenceAction(
        "readiness",
        "unavailable",
      ),
    };
  }

  const required = applicable.filter((item) => item.required);
  const requiredStatus = highestPrecedenceState(
    required.length ? required : applicable,
  );
  const optionalProblem = applicable.find(
    (item) => !item.required && stateForEvidence(item) !== "ready",
  );
  const status =
    requiredStatus === "ready" && optionalProblem ? "degraded" : requiredStatus;
  const blockers = applicable
    .filter((item) => stateForEvidence(item) !== "ready")
    .map((item) => item.reason);

  return sanitizeForArtifact({
    id,
    label,
    status,
    ready: status === "ready",
    evidence: applicable,
    blockers,
    strongestSafeNextAction: strongestAction(applicable, status),
  });
}

function readJsonSafe(filePath) {
  try {
    return sanitizeForArtifact(JSON.parse(readFileSync(filePath, "utf8")));
  } catch {
    return null;
  }
}

function stableMetric(fileName) {
  const fullPath = join(metricsDir, fileName);
  return {
    file: relative(root, fullPath).replace(/\\/g, "/"),
    data: existsSync(fullPath) ? readJsonSafe(fullPath) : null,
  };
}

function runNpmCheck(script) {
  const npmExecPath = process.env.npm_execpath?.trim();
  const command = npmExecPath
    ? process.execPath
    : process.platform === "win32"
      ? process.env.ComSpec || "cmd.exe"
      : "npm";
  const args = npmExecPath
    ? [npmExecPath, "run", script]
    : process.platform === "win32"
      ? ["/d", "/s", "/c", `npm run ${script}`]
      : ["run", script];
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: "utf8",
    windowsHide: true,
  });
  const output =
    result.status === 0 ? result.stdout : result.stderr || result.stdout;
  return {
    command: `npm run ${script}`,
    ok: result.status === 0,
    exitCode: result.status ?? 1,
    summary: sanitizeString(
      output?.trim().split(/\r?\n/).filter(Boolean).at(-1) ??
        (result.status === 0 ? "OK" : "check failed"),
    ),
  };
}

function artifactSummary(metric) {
  const currentMetric = metric ?? { file: null, data: null };
  return {
    file: currentMetric.file,
    capturedAt: timestampFrom(currentMetric.data),
    available: Boolean(currentMetric.data),
  };
}

function metricEvidence(
  {
    id,
    owner,
    metric,
    appliesTo,
    required = true,
    maxAgeMs,
    state,
    reason,
    nextAction,
    expectedSchema = null,
    validateContract = null,
  },
  now,
) {
  const currentMetric = metric ?? { file: null, data: null };
  const schemaValid =
    !expectedSchema || currentMetric.data?.schemaVersion === expectedSchema;
  const shapeValid =
    typeof validateContract !== "function" ||
    validateContract(currentMetric.data) === true;
  const declaredExpiry = normalizeDate(currentMetric.data?.expiresAt);
  const capturedAt = timestampFrom(currentMetric.data);
  const capturedDate = normalizeDate(capturedAt);
  const declaredExpiryValid =
    !currentMetric.data?.expiresAt ||
    (declaredExpiry &&
      capturedDate &&
      declaredExpiry.getTime() > capturedDate.getTime());
  const contractValid =
    Boolean(currentMetric.data) &&
    schemaValid &&
    shapeValid &&
    declaredExpiryValid;
  return createEvidenceRecord(
    {
      id,
      owner,
      file: currentMetric.file,
      appliesTo,
      required,
      capturedAt,
      declaredExpiresAt: currentMetric.data?.expiresAt ?? null,
      maxAgeMs,
      reportedState: contractValid ? state(currentMetric.data) : "unavailable",
      reason: contractValid
        ? reason(currentMetric.data)
        : currentMetric.data
          ? `${owner} artifact schema or declared expiry is invalid.`
          : `${owner} artifact is missing or unreadable.`,
      nextAction,
    },
    now,
  );
}

function checkEvidence(
  { id, owner, check, appliesTo, maxAgeMs, nextAction },
  now,
) {
  return createEvidenceRecord(
    {
      id,
      owner,
      file: null,
      appliesTo,
      required: true,
      capturedAt: now,
      maxAgeMs,
      reportedState: check.ok ? "ready" : "blocked",
      reason: check.ok
        ? `${owner} passed.`
        : `${owner} failed: ${check.summary}`,
      nextAction,
    },
    now,
  );
}

function phoneEvidenceProjection(phone) {
  if (!phone?.data) return null;
  return {
    baseUrl: phone.data.baseUrl ?? null,
    routes: phone.data.routes ?? null,
    readinessSummary: phone.data.readinessSummary ?? null,
    manualPhoneProof: phone.data.manualPhoneProof ?? null,
    receiptPhoneProof: phone.data.receiptPhoneProof ?? null,
    combinedPhoneProof: phone.data.combinedPhoneProof ?? null,
    receiptLiveStatus: phone.data.receiptLiveStatus ?? null,
    missingReceiptProofItems: phone.data.missingReceiptProofItems ?? [],
    blocked: phone.data.blocked ?? [],
    acceptanceReady: phone.data.acceptanceReady === true,
  };
}

function releaseEvidenceProjection(release) {
  if (!release?.data) return null;
  return {
    targetId: release.data.target?.targetId ?? null,
    baseUrl: release.data.baseUrl ?? null,
    routes: release.data.routes ?? null,
    docker: release.data.docker ?? null,
    blocked: release.data.blocked ?? [],
    releaseProofReady: release.data.releaseProofReady === true,
  };
}

function normalizedCommit(value) {
  const candidate = typeof value === "string" ? value.trim().toLowerCase() : "";
  return /^[a-f0-9]{40}$/.test(candidate) ? candidate : null;
}

function normalizedGitObjectId(value) {
  const candidate = typeof value === "string" ? value.trim().toLowerCase() : "";
  return /^[a-f0-9]{40,64}$/.test(candidate) ? candidate : null;
}

export function evaluateReleaseCandidateCorrelation(metrics) {
  const diagnostics = metrics?.releaseDiagnostics?.data ?? null;
  const identity = diagnostics?.identity ?? null;
  const actual = identity?.actual ?? null;
  const docker = metrics?.dockerReleaseProof?.data ?? null;
  const source = docker?.source ?? null;
  const expectedCommit =
    identity?.expectedReleaseTag === ACTIVE_RELEASE_CANDIDATE_TAG
      ? normalizedCommit(identity?.expectedSourceCommit)
      : null;
  const actualCommit = normalizedCommit(actual?.sourceCommit);
  const dockerCommit = normalizedCommit(
    source?.resolvedCommit ?? source?.peeledCommit,
  );
  const diagnosticsMatches =
    diagnostics?.releaseProofReady === true &&
    identity?.passed === true &&
    identity?.expectedReleaseTag === ACTIVE_RELEASE_CANDIDATE_TAG &&
    actual?.releaseTag === ACTIVE_RELEASE_CANDIDATE_TAG &&
    Boolean(expectedCommit) &&
    actualCommit === expectedCommit;
  const dockerMatches =
    docker?.proofReady === true &&
    source?.ready === true &&
    source?.tag === ACTIVE_RELEASE_CANDIDATE_TAG &&
    Boolean(normalizedGitObjectId(source?.tagObjectId ?? source?.tagObject)) &&
    Boolean(expectedCommit) &&
    dockerCommit === expectedCommit;

  return sanitizeForArtifact({
    tag: ACTIVE_RELEASE_CANDIDATE_TAG,
    sourceCommit: expectedCommit,
    diagnosticsMatches,
    dockerMatches,
    ready: diagnosticsMatches && dockerMatches,
  });
}

function protectedActionProofProjection(metric) {
  const data = metric?.data;
  if (!data) return null;
  return {
    schemaVersion: data.schemaVersion ?? null,
    capturedAt: data.capturedAt ?? null,
    expiresAt: data.expiresAt ?? null,
    targetId: data.targetId ?? null,
    protectedActionReady: data.protectedActionReady === true,
  };
}

function protectedActionProofShapeValid(data) {
  return (
    /^staging-[a-f0-9]{16}$/.test(data?.targetId ?? "") &&
    typeof data?.protectedActionReady === "boolean" &&
    data?.method === "GET" &&
    data?.route === "/api/capability-assurance" &&
    data?.request?.status === 200 &&
    data?.request?.bodyWithinLimit === true &&
    data?.request?.validJson === true &&
    Array.isArray(data?.blockers) &&
    (data?.receipt === null || typeof data?.receipt === "object") &&
    typeof data?.runId === "string" &&
    data?.receipt?.runId === data.runId
  );
}

function webStagingAssuranceShapeValid(data) {
  const categories = [
    "health",
    "auth",
    "routes",
    "smoke",
    "diagnostics",
    "feeds",
    "capabilityAssurance",
    "protectedActions",
  ];
  const categoriesValid = categories.every(
    (key) => typeof data?.categories?.[key] === "boolean",
  );
  const allCategoriesReady =
    categoriesValid && categories.every((key) => data.categories[key] === true);
  return (
    /^staging-[a-f0-9]{16}$/.test(data?.targetId ?? "") &&
    categoriesValid &&
    data?.assuranceReady === allCategoriesReady &&
    data?.categories?.protectedActions ===
      data?.probes?.protectedAction?.passed &&
    data?.probes?.protectedAction?.schemaVersion ===
      "nexus-protected-action-proof.v1" &&
    data?.probes?.protectedAction?.targetId === data?.targetId &&
    typeof data?.probes?.protectedAction?.protectedActionReady === "boolean"
  );
}

function protectedActionProofVerified(data, evidenceKey, now, targetId) {
  return validateProtectedActionProofArtifact({
    proof: data,
    targetId,
    capturedAt: now,
    evidenceKey,
  }).passed;
}

function dependencyAuditProjection(metric) {
  const data = metric?.data;
  if (!data) return null;
  return {
    knownWarning: data.knownWarning ?? null,
    classification: data.classification ?? null,
    metadataSource: data.metadataSource
      ? {
          githubReachable: data.metadataSource.githubReachable ?? null,
          importedAlertMetadata:
            data.metadataSource.importedAlertMetadata ?? null,
          alertImportArtifact: data.metadataSource.alertImportArtifact ?? null,
          manualMetadataRequired:
            data.metadataSource.manualMetadataRequired ?? null,
        }
      : null,
    blocked: data.blocked ?? [],
    auditReady: data.auditReady === true,
  };
}

function dependencyPostureProjection(metric) {
  const data = metric?.data;
  if (!data) return null;
  return {
    packageGraph: data.packageGraph ?? null,
    lifecycleScriptPackageCount: data.lifecycleScriptPackageCount ?? null,
    warnings: data.warnings ?? [],
    blocked: data.blocked ?? [],
    riskReady: data.riskReady === true,
  };
}

function infraHardeningProjection(metric) {
  const data = metric?.data;
  if (!data) return null;
  return {
    checks: Array.isArray(data.checks)
      ? data.checks.map((check) => ({
          id: check.id ?? null,
          critical: check.critical === true,
          ok: check.ok === true,
          exitCode: check.exitCode ?? null,
        }))
      : [],
    releasePrerequisites: data.releasePrerequisites ?? null,
    criticalFailures: data.criticalFailures ?? [],
    blocked: data.blocked ?? [],
    hardeningReady: data.hardeningReady === true,
  };
}

function githubSecurityProjection(metric) {
  const data = metric?.data;
  if (!data) return null;
  return {
    source: data.source
      ? {
          kind: data.source.kind ?? null,
          perAlertMetadataAvailable:
            data.source.perAlertMetadataAvailable === true,
          limitations: data.source.limitations ?? [],
        }
      : null,
    surfaces: data.surfaces ?? null,
    zeroOpen: data.zeroOpen === true,
    ready: data.ready === true,
  };
}

export function buildReadinessRollup({
  now,
  metrics,
  checks,
  evidenceKey = "",
}) {
  const allWaves = [...WAVE_IDS];
  const diagnosticsTargetId =
    metrics.releaseDiagnostics?.data?.target?.targetId ?? null;
  const diagnosticsIdentity =
    metrics.releaseDiagnostics?.data?.identity?.actual ?? null;
  const candidateCorrelation = evaluateReleaseCandidateCorrelation(metrics);
  const assuranceTargetMatches =
    Boolean(diagnosticsTargetId) &&
    metrics.webStagingAssurance?.data?.targetId === diagnosticsTargetId;
  const protectedActionTargetMatches =
    Boolean(diagnosticsTargetId) &&
    metrics.protectedActionProof?.data?.targetId === diagnosticsTargetId &&
    metrics.protectedActionProof?.data?.targetId ===
      metrics.webStagingAssurance?.data?.targetId;
  const protectedActionVerified = protectedActionProofVerified(
    metrics.protectedActionProof?.data,
    evidenceKey,
    now,
    diagnosticsTargetId,
  );
  const rollbackVerified = validateRollbackProofArtifact({
    proof: metrics.rollbackProof?.data,
    knownGood: metrics.knownGoodDeployment?.data,
    diagnostics: metrics.releaseDiagnostics?.data,
    assurance: metrics.webStagingAssurance?.data,
    protectedActionProof: metrics.protectedActionProof?.data,
    targetId: diagnosticsTargetId,
    sourceCommit: diagnosticsIdentity?.sourceCommit,
    imageDigest: diagnosticsIdentity?.imageDigest,
    capturedAt: now,
    evidenceKey,
  }).passed;
  const evidence = [
    checkEvidence(
      {
        id: "publication-safety",
        owner: "publication safety",
        check: checks.publicationSafety,
        appliesTo: allWaves,
        maxAgeMs: HOUR,
        nextAction: {
          id: "rerun-publication-safety",
          label: "Rerun publication safety",
          command: "npm run publication:safety:check",
          requiresApproval: false,
          reason: "Resolve tracked privacy or publication findings first.",
        },
      },
      now,
    ),
    metricEvidence(
      {
        id: "github-security-posture",
        owner: "GitHub security posture",
        metric: metrics.githubSecurity,
        appliesTo: allWaves,
        maxAgeMs: DAY,
        expectedSchema: "nexus-github-security-posture.v1",
        state: (data) =>
          data.ready === true && data.zeroOpen === true ? "ready" : "blocked",
        reason: (data) =>
          data.ready === true && data.zeroOpen === true
            ? "Current Dependabot, code-scanning, and secret-scanning open counts are zero."
            : "One or more current GitHub security surfaces is not clear.",
        nextAction: {
          id: "refresh-github-security-posture",
          label: "Refresh current GitHub security evidence",
          command: null,
          requiresApproval: false,
          reason:
            "Capture current zero/open counts without inventing per-alert metadata.",
        },
      },
      now,
    ),
    metricEvidence(
      {
        id: "dependency-risk",
        owner: "dependency risk posture",
        metric: metrics.dependencyPosture,
        appliesTo: allWaves,
        maxAgeMs: 7 * DAY,
        validateContract: (data) =>
          data?.postureName === "DEPENDENCY-RISK-POSTURE",
        state: (data) => (data.riskReady === true ? "ready" : "blocked"),
        reason: (data) =>
          data.riskReady === true
            ? "Dependency graph and lifecycle posture pass."
            : "Dependency graph or lifecycle posture has blocking findings.",
        nextAction: {
          id: "refresh-dependency-risk",
          label: "Refresh dependency risk posture",
          command: "npm run dependency:risk:posture",
          requiresApproval: false,
          reason: "Re-evaluate the installed and locked dependency graph.",
        },
      },
      now,
    ),
    metricEvidence(
      {
        id: "infra-hardening",
        owner: "infrastructure hardening",
        metric: metrics.infraHardening,
        appliesTo: allWaves,
        maxAgeMs: 7 * DAY,
        validateContract: (data) =>
          data?.auditName === "SECURITY-INFRASTRUCTURE-HARDENING",
        state: (data) => (data.hardeningReady === true ? "ready" : "blocked"),
        reason: (data) =>
          data.hardeningReady === true
            ? "Critical infrastructure hardening checks pass."
            : "Infrastructure hardening has critical failures.",
        nextAction: {
          id: "refresh-infra-hardening",
          label: "Refresh infrastructure hardening",
          command: "npm run infra:hardening:audit",
          requiresApproval: false,
          reason: "Recapture current infrastructure checks and prerequisites.",
        },
      },
      now,
    ),
    checkEvidence(
      {
        id: "capability-assurance-contract",
        owner: "Capability Assurance contract",
        check: checks.capabilityAssurance,
        appliesTo: ["webCandidate"],
        maxAgeMs: HOUR,
        nextAction: {
          id: "rerun-capability-assurance",
          label: "Rerun Capability Assurance proof",
          command: "npm run capability:assurance:check",
          requiresApproval: false,
          reason:
            "Verify all canonical capability contracts and reinforcement boundaries.",
        },
      },
      now,
    ),
    checkEvidence(
      {
        id: "live-feed-reliability-contract",
        owner: "live-feed reliability contract",
        check: checks.liveFeedReliability,
        appliesTo: ["webCandidate"],
        maxAgeMs: HOUR,
        nextAction: {
          id: "rerun-live-feed-reliability",
          label: "Rerun live-feed reliability proof",
          command: "npm run live-feed:reliability:check",
          requiresApproval: false,
          reason:
            "Verify feed failure, retained-data, cancellation, and stale-result semantics.",
        },
      },
      now,
    ),
    metricEvidence(
      {
        id: "release-diagnostics",
        owner: "release diagnostics",
        metric: metrics.releaseDiagnostics,
        appliesTo: ["webCandidate"],
        maxAgeMs: DAY,
        expectedSchema: "nexus-release-diagnostics.v1",
        state: (data) =>
          data.releaseProofReady !== true
            ? "unavailable"
            : candidateCorrelation.diagnosticsMatches
              ? "ready"
              : "blocked",
        reason: (data) =>
          data.releaseProofReady === true &&
          candidateCorrelation.diagnosticsMatches
            ? "Current release diagnostics and candidate identity pass."
            : data.releaseProofReady === true
              ? "Release diagnostics do not match the active candidate tag and commit."
              : "A real HTTPS staged target with the active candidate identity is not proven.",
        nextAction: {
          id: "authorize-first-staging-deployment",
          label:
            "Provide the HTTPS staging target and approve first deployment",
          command: null,
          requiresApproval: true,
          reason:
            "Live release diagnostics require the real approved staged target.",
        },
      },
      now,
    ),
    metricEvidence(
      {
        id: "docker-release-proof",
        owner: "Docker release proof",
        metric: metrics.dockerReleaseProof,
        appliesTo: ["webCandidate"],
        maxAgeMs: DAY,
        expectedSchema: "nexus-docker-release-proof.v1",
        state: (data) =>
          data.proofReady === true && candidateCorrelation.dockerMatches
            ? "ready"
            : "blocked",
        reason: (data) =>
          data.proofReady === true && candidateCorrelation.dockerMatches
            ? "Exact-source candidate image build, runtime health, and identity pass."
            : "Docker image proof is missing or does not match the active candidate tag and commit.",
      },
      now,
    ),
    metricEvidence(
      {
        id: "web-staging-assurance",
        owner: "read-only web staging assurance",
        metric: metrics.webStagingAssurance,
        appliesTo: ["webCandidate"],
        maxAgeMs: DAY,
        expectedSchema: "nexus-web-staging-assurance.v1",
        validateContract: webStagingAssuranceShapeValid,
        state: (data) =>
          data.assuranceReady === true &&
          assuranceTargetMatches &&
          candidateCorrelation.ready
            ? "ready"
            : "blocked",
        reason: (data) =>
          data.assuranceReady === true &&
          assuranceTargetMatches &&
          candidateCorrelation.ready
            ? "Current HTTPS target identity, auth, routes, feeds, capabilities, and protected-action posture pass."
            : "Current read-only staging assurance has blocking findings.",
        nextAction: {
          id: "rerun-web-staging-assurance",
          label: "Rerun read-only web staging assurance",
          command: "npm run staging:assurance",
          requiresApproval: false,
          reason:
            "Refresh target evidence without deploying, restarting, or mutating it.",
        },
      },
      now,
    ),
    metricEvidence(
      {
        id: "protected-action-proof",
        owner: "protected action proof",
        metric: metrics.protectedActionProof,
        appliesTo: ["webCandidate"],
        maxAgeMs: DAY,
        expectedSchema: "nexus-protected-action-proof.v1",
        validateContract: protectedActionProofShapeValid,
        state: (data) =>
          protectedActionVerified &&
          protectedActionTargetMatches &&
          candidateCorrelation.ready
            ? "ready"
            : "blocked",
        reason: (data) =>
          protectedActionVerified &&
          protectedActionTargetMatches &&
          candidateCorrelation.ready
            ? "Current approved protected-action receipt matches the staged target."
            : "Protected-action proof is not ready or does not match current staged evidence.",
        nextAction: {
          id: "capture-approved-protected-action-proof",
          label: "Capture the approved protected-action receipt",
          command: null,
          requiresApproval: true,
          reason:
            "A matching receipt exists only after a separately approved protected action.",
        },
      },
      now,
    ),
    metricEvidence(
      {
        id: "rollback-proof",
        owner: "platform rollback proof",
        metric: metrics.rollbackProof,
        appliesTo: ["webCandidate"],
        maxAgeMs: DAY,
        expectedSchema: "nexus-rollback-proof.v1",
        state: () =>
          rollbackVerified && candidateCorrelation.ready ? "ready" : "blocked",
        reason: () =>
          rollbackVerified && candidateCorrelation.ready
            ? "Known-good deployment restoration and post-rollback checks pass."
            : "A signed, target-bound real platform rollback has not been verified.",
        nextAction: {
          id: "perform-approved-platform-rollback",
          label: "Perform and verify the approved platform rollback",
          command: null,
          requiresApproval: true,
          reason:
            "Rollback proof requires an operator-completed platform action.",
        },
      },
      now,
    ),
    metricEvidence(
      {
        id: "desktop-trust-chain",
        owner: "desktop trust chain",
        metric: metrics.desktopTrustChain,
        appliesTo: ["desktop"],
        maxAgeMs: 7 * DAY,
        validateContract: (data) => data?.slice === "CP2.3-SIGNING-PREFLIGHT",
        state: (data) => (data.releaseReady === true ? "ready" : "blocked"),
        reason: (data) =>
          data.releaseReady === true
            ? "Desktop checksums, signing, and SBOM posture pass."
            : "Desktop packaging, checksums, or signing proof remains open.",
        nextAction: {
          id: "inspect-desktop-trust-chain",
          label: "Inspect desktop trust-chain blockers",
          command: "npm run desktop:trust-chain",
          requiresApproval: false,
          reason: "Desktop release work remains independent from web staging.",
        },
      },
      now,
    ),
    metricEvidence(
      {
        id: "desktop-signing",
        owner: "desktop signing preflight",
        metric: metrics.desktopSigning,
        appliesTo: ["desktop"],
        maxAgeMs: 7 * DAY,
        validateContract: (data) => data?.releaseLane === "desktop",
        state: (data) => (data.releaseReady === true ? "ready" : "blocked"),
        reason: (data) =>
          data.releaseReady === true
            ? "Desktop signing preflight passes."
            : "Desktop signing identities and packaged artifacts remain unproven.",
      },
      now,
    ),
    metricEvidence(
      {
        id: "phone-pwa-acceptance",
        owner: "phone/PWA acceptance",
        metric: metrics.phoneAcceptance,
        appliesTo: ["phonePwa"],
        maxAgeMs: 7 * DAY,
        validateContract: (data) => Array.isArray(data?.routes),
        state: (data) =>
          data.acceptanceReady === true ? "ready" : "approval-required",
        reason: (data) =>
          data.acceptanceReady === true
            ? "Physical phone/PWA acceptance passes."
            : "Phone/PWA acceptance is intentionally deferred until Mario resumes it.",
        nextAction: {
          id: "resume-phone-acceptance-when-approved",
          label: "Keep phone/PWA deferred",
          command: null,
          requiresApproval: true,
          reason:
            "Do not reopen phone/PWA work without Mario's explicit direction.",
        },
      },
      now,
    ),
  ];

  const lanes = {
    webCandidate: buildReadinessLane({
      id: "webCandidate",
      label: `Web candidate (${ACTIVE_RELEASE_CANDIDATE_TAG})`,
      evidence,
    }),
    desktop: buildReadinessLane({ id: "desktop", label: "Desktop", evidence }),
    phonePwa: buildReadinessLane({
      id: "phonePwa",
      label: "Phone/PWA",
      evidence,
    }),
  };

  const phone = metrics.phoneAcceptance;
  const release = metrics.releaseDiagnostics;
  const dependencyAudit = metrics.dependencyAudit;
  const dependencyPosture = metrics.dependencyPosture;
  const infraHardening = metrics.infraHardening;
  const phoneProjection = phoneEvidenceProjection(phone);

  return sanitizeForArtifact({
    schemaVersion: READINESS_SCHEMA_VERSION,
    capturedAt: new Date(now).toISOString(),
    rollupName: "WEB-CANDIDATE-STAGING-ADAPTIVE-RELIABILITY",
    freshnessPolicy: {
      localChecksMaxAgeMs: HOUR,
      liveSecurityAndTargetMaxAgeMs: DAY,
      localArtifactMaxAgeMs: 7 * DAY,
      rule: "Missing, malformed, or expired required evidence is never success.",
    },
    artifacts: {
      phoneAcceptance: artifactSummary(phone),
      releaseDiagnostics: artifactSummary(release),
      githubSecurity: artifactSummary(metrics.githubSecurity),
      dependencyAudit: artifactSummary(dependencyAudit),
      dependencyPosture: artifactSummary(dependencyPosture),
      infraHardening: artifactSummary(infraHardening),
      desktopTrustChain: artifactSummary(metrics.desktopTrustChain),
      desktopSigning: artifactSummary(metrics.desktopSigning),
      dockerReleaseProof: artifactSummary(metrics.dockerReleaseProof),
      webStagingAssurance: artifactSummary(metrics.webStagingAssurance),
      protectedActionProof: artifactSummary(metrics.protectedActionProof),
      knownGoodDeployment: artifactSummary(metrics.knownGoodDeployment),
      rollbackProof: artifactSummary(metrics.rollbackProof),
      agentRuntime: artifactSummary(metrics.agentRuntime),
      runtimeExperiment: artifactSummary(metrics.runtimeExperiment),
    },
    lanes,
    candidateIdentity: candidateCorrelation,
    strongestSafeNextAction: lanes.webCandidate.strongestSafeNextAction,
    posture: {
      publicationSafety: checks.publicationSafety,
      webCandidateReady: lanes.webCandidate.ready,
      desktopReady: lanes.desktop.ready,
      phonePwaReady: lanes.phonePwa.ready,
      githubSecurityReady:
        metrics.githubSecurity?.data?.ready === true &&
        metrics.githubSecurity?.data?.zeroOpen === true,
      phoneAcceptanceReady: phone?.data?.acceptanceReady === true,
      localAiOfflineReady:
        phone?.data?.acceptanceReady === true &&
        (phone?.data?.combinedPhoneProof?.localAiReceipt === true ||
          phone?.data?.manualPhoneProof?.localAiReceipt === true),
      releaseDiagnosticsReady:
        release?.data?.releaseProofReady === true &&
        candidateCorrelation.diagnosticsMatches,
      candidateIdentityReady: candidateCorrelation.ready,
      protectedActionReady:
        protectedActionVerified &&
        protectedActionTargetMatches &&
        candidateCorrelation.ready,
      dependencyAuditReady: dependencyAudit?.data?.auditReady === true,
      dependencyRiskReady: dependencyPosture?.data?.riskReady === true,
      infraHardeningReady: infraHardening?.data?.hardeningReady === true,
    },
    latestEvidence: {
      phoneAcceptance: phoneProjection,
      releaseDiagnostics: releaseEvidenceProjection(release),
      protectedActionProof: protectedActionProofProjection(
        metrics.protectedActionProof,
      ),
      githubSecurity: githubSecurityProjection(metrics.githubSecurity),
      dependencyAudit: dependencyAuditProjection(dependencyAudit),
      dependencyPosture: dependencyPostureProjection(dependencyPosture),
      infraHardening: infraHardeningProjection(infraHardening),
    },
    legacyCompatibility: {
      deprecated: true,
      releaseCandidateReadyMapsTo: "lanes.webCandidate.ready",
      blockedMapsTo: "lanes.webCandidate.blockers",
      phoneLocalAiProjectionRetained: true,
    },
    blockedScope: "webCandidate",
    blocked: lanes.webCandidate.blockers,
    releaseCandidateReadyScope: "webCandidate",
    releaseCandidateReady: lanes.webCandidate.ready,
    nextCommands: [
      "npm run readiness:rollup",
      "npm run release:diagnostics:capture",
      "npm run dependency:risk:posture",
      "npm run infra:hardening:audit",
      "npm run capability:assurance:check",
      "npm run live-feed:reliability:check",
      "npm run staging:protected-action:proof -- --run-id=<approved-run-id>",
      "npm run staging:assurance",
      "npm run verify",
    ],
  });
}

export function buildCurrentReadinessRollup({
  now = new Date().toISOString(),
  evidenceKey = "",
} = {}) {
  const metrics = {
    phoneAcceptance: stableMetric("phone-local-acceptance-latest.json"),
    releaseDiagnostics: stableMetric("release-diagnostics-latest.json"),
    githubSecurity: stableMetric("github-security-posture-latest.json"),
    dependencyAudit: stableMetric("dependabot-security-audit-latest.json"),
    dependencyPosture: stableMetric("dependency-risk-posture-latest.json"),
    infraHardening: stableMetric("infra-hardening-latest.json"),
    desktopTrustChain: stableMetric("desktop-trust-chain-latest.json"),
    desktopSigning: stableMetric("desktop-signing-preflight-latest.json"),
    dockerReleaseProof: stableMetric("docker-release-proof-latest.json"),
    webStagingAssurance: stableMetric("web-staging-assurance-latest.json"),
    protectedActionProof: stableMetric("protected-action-proof-latest.json"),
    knownGoodDeployment: stableMetric("known-good-deployment-latest.json"),
    rollbackProof: stableMetric("rollback-proof-latest.json"),
    agentRuntime: stableMetric("agent-runtime-latest.json"),
    runtimeExperiment: stableMetric("runtime-experiment-latest.json"),
  };
  const checks = {
    publicationSafety: runNpmCheck("publication:safety:check"),
    capabilityAssurance: runNpmCheck("capability:assurance:check"),
    liveFeedReliability: runNpmCheck("live-feed:reliability:check"),
  };
  return buildReadinessRollup({
    now,
    metrics,
    checks,
    evidenceKey,
  });
}

function main() {
  loadEnv({ path: ".env.local" });
  mkdirSync(metricsDir, { recursive: true });
  const artifact = buildCurrentReadinessRollup({
    now: new Date().toISOString(),
    evidenceKey: process.env.NEXUS_EVIDENCE_KEY ?? "",
  });
  const outPath = join(metricsDir, "readiness-rollup-latest.json");
  writeFileSync(outPath, `${JSON.stringify(artifact, null, 2)}\n`);

  console.log(
    `Readiness rollup written: ${relative(root, outPath).replace(/\\/g, "/")}`,
  );
  for (const lane of Object.values(artifact.lanes)) {
    console.log(`${lane.label}: ${lane.status}${lane.ready ? " (ready)" : ""}`);
  }
  console.log(
    `Strongest safe next action: ${artifact.strongestSafeNextAction.label}`,
  );
}

const cliPath = process.argv[1] ? resolve(process.argv[1]) : null;
if (cliPath && fileURLToPath(import.meta.url) === cliPath) {
  main();
}
