#!/usr/bin/env node
/* eslint-disable no-console */

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { performance } from "node:perf_hooks";

import {
  classifyReleaseTarget,
  sanitizeDiagnosticValue,
} from "./release-diagnostics-capture.mjs";
import { validateProtectedActionProofArtifact } from "./staging-protected-action-proof.mjs";

const root = process.cwd();
const INTERNAL_AUTH_HEADER = "x-nexus-internal-auth";
const DEFAULT_MAX_RESPONSE_BYTES = 256 * 1024;
const DEFAULT_REQUEST_TIMEOUT_MS = 10_000;
const CHILD_CHECK_TIMEOUT_MS = 5 * 60 * 1000;
const EVIDENCE_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const ARTIFACT_FILENAME = "web-staging-assurance-latest.json";
const PROTECTED_ACTION_PROOF_FILENAME = "protected-action-proof-latest.json";

export const PROTECTED_ACTION_PROOF_SCHEMA_VERSION =
  "nexus-protected-action-proof.v1";

export const WEB_STAGING_ASSURANCE_SCHEMA_VERSION =
  "nexus-web-staging-assurance.v1";

export const WEB_STAGING_CATEGORY_KEYS = Object.freeze([
  "health",
  "auth",
  "routes",
  "smoke",
  "diagnostics",
  "feeds",
  "capabilityAssurance",
  "protectedActions",
]);

export const WEB_STAGING_FEED_ROUTES = Object.freeze([
  "/api/cves",
  "/api/earthquakes",
  "/api/defi",
  "/api/hacker-news",
  "/api/threat-intel",
  "/api/news",
  "/api/sec-filings",
  "/api/conflict",
]);

const WEB_STAGING_FEED_PROBES = Object.freeze([
  {
    route: "/api/cves",
    validate: (payload) => Array.isArray(payload?.vulnerabilities),
  },
  {
    route: "/api/earthquakes",
    validate: (payload) => Array.isArray(payload?.earthquakes),
  },
  {
    route: "/api/defi",
    validate: (payload) =>
      payload?.type === "tvl" && Array.isArray(payload?.protocols),
  },
  {
    route: "/api/hacker-news",
    validate: (payload) => Array.isArray(payload?.stories),
  },
  {
    route: "/api/threat-intel",
    validate: (payload) =>
      Array.isArray(payload?.iocs) && Array.isArray(payload?.otx_pulses),
  },
  { route: "/api/news", validate: (payload) => Array.isArray(payload) },
  {
    route: "/api/sec-filings",
    requestPath: "/api/sec-filings?query=10-K",
    validate: (payload) => Array.isArray(payload?.filings),
  },
  {
    route: "/api/conflict",
    validate: (payload) => Array.isArray(payload?.articles),
  },
]);

export const EXISTING_CHECK_COMPOSITION = Object.freeze([
  {
    id: "release:smoke",
    invoked: false,
    reason:
      "Replaced by the read-only GET smoke subset because release:smoke submits token POST requests.",
  },
  {
    id: "runtime:consistency",
    invoked: true,
    reason:
      "Composed because it performs bounded read-only runtime GET checks.",
  },
  {
    id: "cp2:launch:gate --live",
    invoked: false,
    reason:
      "Not invoked because its release-smoke and auth E2E dependencies can submit mutating requests.",
  },
  {
    id: "release:diagnostics:capture --require-staged",
    invoked: true,
    reason:
      "Composed in an isolated temporary output directory and removed after summarization.",
  },
]);

export function parseEnvText(text) {
  const values = {};
  for (const line of String(text ?? "").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator <= 0) continue;
    const key = trimmed.slice(0, separator).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;
    let value = trimmed.slice(separator + 1).trim();
    if (
      value.length >= 2 &&
      ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'")))
    ) {
      value = value.slice(1, -1);
    }
    values[key] = value;
  }
  return values;
}

function readLocalEnv(filePath) {
  try {
    if (!fs.existsSync(filePath)) return {};
    return parseEnvText(fs.readFileSync(filePath, "utf8"));
  } catch {
    return {};
  }
}

export function normalizeWebStagingTarget(value, evidenceKey = "") {
  let target;
  try {
    target = classifyReleaseTarget(value, { evidenceKey });
  } catch {
    throw new Error(
      "Web staging assurance requires a valid HTTPS staged target origin without path, query, fragment, or credentials.",
    );
  }
  if (!target.staged || target.protocol !== "https") {
    throw new Error("Web staging assurance requires an HTTPS staged target.");
  }
  return {
    ...target,
    origin: new URL(String(value).trim()).origin,
  };
}

function parseEvidenceDate(value) {
  if (typeof value !== "string" || !value.trim()) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? new Date(parsed) : null;
}

export function evaluateProtectedActionProof({
  proof,
  targetId,
  capturedAt,
  evidenceKey = "",
}) {
  const now = capturedAt instanceof Date ? capturedAt : new Date(capturedAt);
  const proofCaptured = parseEvidenceDate(proof?.capturedAt);
  const proofExpires = parseEvidenceDate(proof?.expiresAt);
  const canonical = validateProtectedActionProofArtifact({
    proof,
    targetId,
    capturedAt: now,
    evidenceKey,
  });

  return {
    file: `docs/metrics/${PROTECTED_ACTION_PROOF_FILENAME}`,
    available: Boolean(proof),
    schemaVersion:
      typeof proof?.schemaVersion === "string" ? proof.schemaVersion : null,
    capturedAt: proofCaptured?.toISOString() ?? null,
    expiresAt: proofExpires?.toISOString() ?? null,
    targetId: typeof proof?.targetId === "string" ? proof.targetId : null,
    schemaValid: canonical.schemaValid,
    timestampsValid: canonical.timestampsValid,
    targetMatches: canonical.targetMatches,
    requestValid: canonical.requestValid,
    runMatches: canonical.runMatches,
    identifiersValid: canonical.identifiersValid,
    receiptVerified: canonical.semanticsValid && canonical.signedServerReceipt,
    protectedActionReady: canonical.protectedActionReady,
    passed: canonical.passed,
  };
}

function readProtectedActionProof() {
  try {
    return JSON.parse(
      fs.readFileSync(
        path.join(root, "docs", "metrics", PROTECTED_ACTION_PROOF_FILENAME),
        "utf8",
      ),
    );
  } catch {
    return null;
  }
}

export async function readBoundedJsonResponse(
  response,
  maxBytes = DEFAULT_MAX_RESPONSE_BYTES,
) {
  if (!response.body) {
    return {
      withinLimit: true,
      validJson: false,
      byteLength: 0,
      json: null,
    };
  }

  const reader = response.body.getReader();
  const chunks = [];
  let byteLength = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      byteLength += value.byteLength;
      if (byteLength > maxBytes) {
        await reader.cancel("web staging assurance response limit exceeded");
        return {
          withinLimit: false,
          validJson: false,
          byteLength,
          json: null,
        };
      }
      chunks.push(value);
    }
  } catch {
    return {
      withinLimit: false,
      validJson: false,
      byteLength,
      json: null,
    };
  }

  const bytes = new Uint8Array(byteLength);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    return {
      withinLimit: true,
      validJson: true,
      byteLength,
      json: JSON.parse(new TextDecoder().decode(bytes)),
    };
  } catch {
    return {
      withinLimit: true,
      validJson: false,
      byteLength,
      json: null,
    };
  }
}

function safeProbeSummary(probe) {
  return {
    route: probe.route,
    method: "GET",
    passed: Boolean(probe.passed),
    status: Number.isInteger(probe.status) ? probe.status : 0,
    durationMs: Number.isFinite(probe.durationMs) ? probe.durationMs : 0,
    responseBytes: Number.isFinite(probe.responseBytes)
      ? probe.responseBytes
      : 0,
    bodyWithinLimit: Boolean(probe.bodyWithinLimit),
    validJson: Boolean(probe.validJson),
    shapePassed:
      typeof probe.shapePassed === "boolean" ? probe.shapePassed : undefined,
    error: probe.error ? sanitizeDiagnosticValue(probe.error) : null,
  };
}

export async function probeBoundedJsonGet(
  origin,
  route,
  {
    requestPath = route,
    token = "",
    authenticated = false,
    expectedStatuses = [200],
    timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS,
    maxBytes = DEFAULT_MAX_RESPONSE_BYTES,
    validateShape = null,
  } = {},
) {
  const startedAt = performance.now();
  const headers =
    authenticated && token ? { [INTERNAL_AUTH_HEADER]: token } : undefined;

  try {
    const response = await fetch(`${origin}${requestPath}`, {
      method: "GET",
      headers,
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.timeout(timeoutMs),
    });
    const body = await readBoundedJsonResponse(response, maxBytes);
    const shapePassed =
      body.validJson && typeof validateShape === "function"
        ? Boolean(validateShape(body.json))
        : body.validJson;
    return {
      route,
      passed:
        expectedStatuses.includes(response.status) &&
        body.withinLimit &&
        body.validJson &&
        shapePassed,
      shapePassed,
      status: response.status,
      durationMs: Math.round(performance.now() - startedAt),
      responseBytes: body.byteLength,
      bodyWithinLimit: body.withinLimit,
      validJson: body.validJson,
      error: body.withinLimit
        ? body.validJson
          ? null
          : "invalid_json"
        : "response_limit_exceeded",
    };
  } catch (error) {
    return {
      route,
      passed: false,
      shapePassed: false,
      status: 0,
      durationMs: Math.round(performance.now() - startedAt),
      responseBytes: 0,
      bodyWithinLimit: false,
      validJson: false,
      error: sanitizeDiagnosticValue(
        error instanceof Error ? error.message : "request_failed",
      ),
    };
  }
}

function summarizeExternalCheck(check) {
  return {
    id: check.id,
    invoked: Boolean(check.invoked),
    readOnly: Boolean(check.readOnly),
    passed: Boolean(check.passed),
    status: Number.isInteger(check.status) ? check.status : null,
    durationMs: Number.isFinite(check.durationMs) ? check.durationMs : 0,
  };
}

export function buildWebStagingAssuranceArtifact({
  capturedAt,
  target,
  tokenConfigured,
  externalChecks,
  diagnosticsEvidence,
  healthProbe,
  unauthenticatedProtectedProbe,
  capabilityProbe,
  protectedActionProof = null,
  evidenceKey = "",
  feedProbes,
  mutatingMethodsUsed,
}) {
  const capturedDate =
    capturedAt instanceof Date ? capturedAt : new Date(capturedAt);
  const routes = Array.isArray(diagnosticsEvidence?.routes)
    ? diagnosticsEvidence.routes
    : [];
  const protectedActionEvidence = evaluateProtectedActionProof({
    proof: protectedActionProof,
    targetId: target?.targetId ?? null,
    capturedAt: capturedDate,
    evidenceKey,
  });
  const exactFeedCoverage =
    WEB_STAGING_FEED_ROUTES.every((route) =>
      feedProbes.some(
        (probe) =>
          probe.route === route && probe.passed && probe.shapePassed === true,
      ),
    ) && feedProbes.length === WEB_STAGING_FEED_ROUTES.length;
  const categories = {
    health:
      Boolean(healthProbe?.passed) &&
      Boolean(externalChecks?.runtimeConsistency?.passed),
    auth:
      Boolean(tokenConfigured) &&
      Boolean(unauthenticatedProtectedProbe?.passed) &&
      Boolean(capabilityProbe?.passed),
    routes:
      Boolean(diagnosticsEvidence?.diagnosticsReady) &&
      routes.length > 0 &&
      routes.every((route) => route.ok === true),
    smoke: false,
    diagnostics:
      Boolean(externalChecks?.releaseDiagnostics?.passed) &&
      Boolean(diagnosticsEvidence?.releaseProofReady),
    feeds: exactFeedCoverage,
    capabilityAssurance:
      Boolean(capabilityProbe?.passed) && Boolean(capabilityProbe?.shapePassed),
    protectedActions:
      Array.isArray(mutatingMethodsUsed) &&
      mutatingMethodsUsed.length === 0 &&
      protectedActionEvidence.passed,
  };
  categories.smoke = categories.health && categories.auth && categories.routes;

  const blockers = WEB_STAGING_CATEGORY_KEYS.filter(
    (key) => !categories[key],
  ).map((key) => `category_failed:${key}`);

  return sanitizeDiagnosticValue({
    schemaVersion: WEB_STAGING_ASSURANCE_SCHEMA_VERSION,
    capturedAt: capturedDate.toISOString(),
    expiresAt: new Date(
      capturedDate.getTime() + EVIDENCE_MAX_AGE_MS,
    ).toISOString(),
    evidenceMaxAgeMs: EVIDENCE_MAX_AGE_MS,
    targetId: target.targetId,
    checks: categories,
    categories,
    externalChecks: {
      runtimeConsistency: summarizeExternalCheck(
        externalChecks.runtimeConsistency,
      ),
      releaseDiagnostics: summarizeExternalCheck(
        externalChecks.releaseDiagnostics,
      ),
    },
    checkComposition: EXISTING_CHECK_COMPOSITION,
    diagnosticsEvidence: {
      diagnosticsReady: Boolean(diagnosticsEvidence?.diagnosticsReady),
      releaseProofReady: Boolean(diagnosticsEvidence?.releaseProofReady),
      routeCount: routes.length,
      routesPassed: routes.filter((route) => route.ok === true).length,
    },
    probes: {
      health: safeProbeSummary(healthProbe),
      unauthenticatedProtected: safeProbeSummary(unauthenticatedProtectedProbe),
      capabilityAssurance: safeProbeSummary(capabilityProbe),
      protectedAction: protectedActionEvidence,
      feeds: feedProbes.map(safeProbeSummary),
    },
    requestPolicy: {
      allowedMethods: ["GET"],
      mutatingMethodsUsed: [...mutatingMethodsUsed],
      deployed: false,
      restarted: false,
      approvalsChanged: false,
      smokeMode: "read-only-get-subset",
    },
    blockers,
    assuranceReady: blockers.length === 0,
  });
}

function parseArgs(argv) {
  const options = {};
  for (const arg of argv) {
    if (arg.startsWith("--base-url=")) {
      options.baseUrl = arg.slice("--base-url=".length);
    } else if (arg.startsWith("--out-dir=")) {
      options.outDir = arg.slice("--out-dir=".length);
    } else {
      throw new Error("Unknown web staging assurance option.");
    }
  }
  return options;
}

function runNodeCheck(id, scriptPath, args, env) {
  const startedAt = performance.now();
  const result = spawnSync(process.execPath, [scriptPath, ...args], {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env, ...env },
    shell: false,
    stdio: "pipe",
    timeout: CHILD_CHECK_TIMEOUT_MS,
    windowsHide: true,
  });
  return {
    id,
    invoked: true,
    readOnly: true,
    passed: result.status === 0 && !result.error && !result.signal,
    status: result.status,
    durationMs: Math.round(performance.now() - startedAt),
  };
}

function summarizeDiagnosticsArtifact(value) {
  return {
    diagnosticsReady: value?.diagnosticsReady === true,
    releaseProofReady: value?.releaseProofReady === true,
    routes: Array.isArray(value?.routes)
      ? value.routes.map((route) => ({
          route: typeof route?.route === "string" ? route.route : "unknown",
          ok: route?.ok === true,
        }))
      : [],
  };
}

function runExistingReadOnlyChecks(origin, token, evidenceKey) {
  const env = {
    NEXUS_RELEASE_BASE_URL: origin,
    NEXUS_TOKEN: token,
    NEXUS_EVIDENCE_KEY: evidenceKey,
  };
  const runtimeConsistency = runNodeCheck(
    "runtime:consistency",
    path.join(root, "scripts", "runtime-consistency.mjs"),
    [],
    env,
  );

  const temporaryDirectory = fs.mkdtempSync(
    path.join(os.tmpdir(), "nexus-web-staging-assurance-"),
  );
  try {
    const releaseDiagnostics = runNodeCheck(
      "release:diagnostics:capture --require-staged",
      path.join(root, "scripts", "release-diagnostics-capture.mjs"),
      [
        `--base-url=${origin}`,
        `--out-dir=${temporaryDirectory}`,
        "--require-staged",
      ],
      env,
    );
    let diagnosticsEvidence = {
      diagnosticsReady: false,
      releaseProofReady: false,
      routes: [],
    };
    try {
      const artifact = JSON.parse(
        fs.readFileSync(
          path.join(temporaryDirectory, "release-diagnostics-latest.json"),
          "utf8",
        ),
      );
      diagnosticsEvidence = summarizeDiagnosticsArtifact(artifact);
    } catch {
      // Failure remains explicit in the returned booleans.
    }
    return { runtimeConsistency, releaseDiagnostics, diagnosticsEvidence };
  } finally {
    fs.rmSync(temporaryDirectory, { recursive: true, force: true });
  }
}

function writeArtifact(artifact, outDir) {
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, ARTIFACT_FILENAME);
  fs.writeFileSync(outPath, `${JSON.stringify(artifact, null, 2)}\n`);
  console.log(
    `web staging assurance captured: ${path.relative(root, outPath)}`,
  );
  return outPath;
}

function buildUnavailableArtifact(capturedAt, blocker) {
  const categories = Object.fromEntries(
    WEB_STAGING_CATEGORY_KEYS.map((key) => [key, false]),
  );
  return {
    schemaVersion: WEB_STAGING_ASSURANCE_SCHEMA_VERSION,
    capturedAt: capturedAt.toISOString(),
    expiresAt: new Date(
      capturedAt.getTime() + EVIDENCE_MAX_AGE_MS,
    ).toISOString(),
    evidenceMaxAgeMs: EVIDENCE_MAX_AGE_MS,
    targetId: null,
    checks: categories,
    categories,
    requestPolicy: {
      allowedMethods: ["GET"],
      mutatingMethodsUsed: [],
      deployed: false,
      restarted: false,
      approvalsChanged: false,
      smokeMode: "read-only-get-subset",
    },
    blockers: [blocker],
    assuranceReady: false,
  };
}

async function main() {
  const capturedAt = new Date();
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch {
    const outDir = path.join(root, "docs", "metrics");
    writeArtifact(
      buildUnavailableArtifact(capturedAt, "operator_arguments_invalid"),
      outDir,
    );
    process.exit(2);
  }

  const outDir = args.outDir
    ? path.resolve(root, args.outDir)
    : path.join(root, "docs", "metrics");
  const fileEnv = readLocalEnv(path.join(root, ".env.local"));
  const rawBaseUrl =
    args.baseUrl ??
    process.env.NEXUS_RELEASE_BASE_URL ??
    fileEnv.NEXUS_RELEASE_BASE_URL ??
    "";
  const token = process.env.NEXUS_TOKEN ?? fileEnv.NEXUS_TOKEN ?? "";
  const evidenceKey =
    process.env.NEXUS_EVIDENCE_KEY ?? fileEnv.NEXUS_EVIDENCE_KEY ?? "";

  if (evidenceKey.length < 16) {
    writeArtifact(
      buildUnavailableArtifact(capturedAt, "private_evidence_key_required"),
      outDir,
    );
    console.error(
      "web-staging-assurance blocked: private evidence key required",
    );
    process.exit(2);
  }

  let target;
  try {
    target = normalizeWebStagingTarget(rawBaseUrl, evidenceKey);
  } catch {
    writeArtifact(
      buildUnavailableArtifact(capturedAt, "https_staged_target_required"),
      outDir,
    );
    console.error(
      "web-staging-assurance blocked: HTTPS staged target required",
    );
    process.exit(2);
  }

  console.log(`web staging assurance target: ${target.targetId}`);

  const healthProbe = await probeBoundedJsonGet(target.origin, "/api/health");
  const unauthenticatedProtectedProbe = await probeBoundedJsonGet(
    target.origin,
    "/api/capability-assurance",
    { expectedStatuses: [401, 403] },
  );
  const capabilityProbe = token
    ? await probeBoundedJsonGet(target.origin, "/api/capability-assurance", {
        token,
        authenticated: true,
        validateShape: (payload) =>
          payload?.ok === true &&
          payload?.available === true &&
          payload?.schemaVersion === "capability-assurance.v1",
      })
    : {
        route: "/api/capability-assurance",
        passed: false,
        shapePassed: false,
        error: "internal_auth_token_missing",
      };
  const feedProbes = token
    ? await Promise.all(
        WEB_STAGING_FEED_PROBES.map((probe) =>
          probeBoundedJsonGet(target.origin, probe.route, {
            token,
            authenticated: true,
            requestPath: probe.requestPath,
            validateShape: probe.validate,
          }),
        ),
      )
    : WEB_STAGING_FEED_ROUTES.map((route) => ({
        route,
        passed: false,
        shapePassed: false,
        error: "internal_auth_token_missing",
      }));

  // This command remains read-only. It can only consume the stable receipt
  // artifact produced after a separately approved protected action.
  const protectedActionProof = readProtectedActionProof();

  const composed = runExistingReadOnlyChecks(target.origin, token, evidenceKey);
  const artifact = buildWebStagingAssuranceArtifact({
    capturedAt,
    target,
    tokenConfigured: Boolean(token),
    externalChecks: {
      runtimeConsistency: composed.runtimeConsistency,
      releaseDiagnostics: composed.releaseDiagnostics,
    },
    diagnosticsEvidence: composed.diagnosticsEvidence,
    healthProbe,
    unauthenticatedProtectedProbe,
    capabilityProbe,
    protectedActionProof,
    evidenceKey,
    feedProbes,
    mutatingMethodsUsed: [],
  });
  writeArtifact(artifact, outDir);

  if (!artifact.assuranceReady) {
    console.log(
      `web staging assurance blocked: ${artifact.blockers.join(", ")}`,
    );
    process.exit(1);
  }
  console.log("web staging assurance ready");
}

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main().catch(() => {
    console.error("web-staging-assurance failed safely");
    process.exit(1);
  });
}
