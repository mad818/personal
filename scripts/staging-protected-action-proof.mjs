#!/usr/bin/env node
/* eslint-disable no-console */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { performance } from "node:perf_hooks";
import { createHmac, timingSafeEqual } from "node:crypto";

import {
  CAPABILITY_PROTECTED_ACTION_CAPABILITY_ID,
  CAPABILITY_PROTECTED_ACTION_ID,
  verifyCapabilityProtectedActionReceipt,
} from "../lib/capabilityProtectedActionReceipt.mjs";

import {
  classifyReleaseTarget,
  sanitizeDiagnosticValue,
} from "./release-diagnostics-capture.mjs";

const root = process.cwd();
const INTERNAL_AUTH_HEADER = "x-nexus-internal-auth";
const ROUTE = "/api/capability-assurance";
const ARTIFACT_FILENAME = "protected-action-proof-latest.json";
const DEFAULT_MAX_RESPONSE_BYTES = 256 * 1024;
const DEFAULT_REQUEST_TIMEOUT_MS = 10_000;
const EVIDENCE_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const FUTURE_CLOCK_SKEW_MS = 5 * 60 * 1000;
const SAFE_RUN_ID = /^[A-Za-z0-9][A-Za-z0-9:_-]{1,118}[A-Za-z0-9]$/;
const SAFE_EVIDENCE_ID = /^[A-Za-z0-9][A-Za-z0-9:_-]{0,159}$/;

export const PROTECTED_ACTION_PROOF_SCHEMA_VERSION =
  "nexus-protected-action-proof.v1";
export const PROTECTED_ACTION_PROOF_ENVELOPE_VERSION =
  "nexus-protected-action-proof-envelope.v1";

function proofEnvelopeValue(value) {
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return typeof value === "string" ? value : "";
}

export function protectedActionProofEnvelopePayload(proof) {
  return [
    PROTECTED_ACTION_PROOF_ENVELOPE_VERSION,
    proof?.schemaVersion,
    proof?.capturedAt,
    proof?.expiresAt,
    proof?.evidenceMaxAgeMs,
    proof?.targetId,
    proof?.route,
    proof?.method,
    proof?.runId,
    proof?.request?.status,
    proof?.request?.durationMs,
    proof?.request?.responseBytes,
    proof?.request?.bodyWithinLimit,
    proof?.request?.validJson,
    proof?.receipt?.proofSignature,
    proof?.protectedActionReady,
    JSON.stringify(Array.isArray(proof?.blockers) ? proof.blockers : []),
  ]
    .map(proofEnvelopeValue)
    .join("\n");
}

export function signProtectedActionProofEnvelope(proof, evidenceKey) {
  if (typeof evidenceKey !== "string" || evidenceKey.length < 16) {
    throw new Error(
      "A private evidence key is required to sign proof evidence.",
    );
  }
  return createHmac("sha256", evidenceKey)
    .update(protectedActionProofEnvelopePayload(proof))
    .digest("hex");
}

export function verifyProtectedActionProofEnvelope(proof, evidenceKey) {
  const signature = proof?.envelopeSignature;
  if (
    typeof signature !== "string" ||
    !/^[a-f0-9]{64}$/.test(signature) ||
    typeof evidenceKey !== "string" ||
    evidenceKey.length < 16
  ) {
    return false;
  }
  const expected = signProtectedActionProofEnvelope(proof, evidenceKey);
  return timingSafeEqual(
    Buffer.from(signature, "hex"),
    Buffer.from(expected, "hex"),
  );
}

function parseArgs(argv) {
  const args = {};
  for (const arg of argv) {
    if (arg.startsWith("--base-url=")) {
      args.baseUrl = arg.slice("--base-url=".length);
    } else if (arg.startsWith("--run-id=")) {
      args.runId = arg.slice("--run-id=".length);
    } else if (arg.startsWith("--out-dir=")) {
      args.outDir = arg.slice("--out-dir=".length);
    } else {
      throw new Error("unsupported_operator_argument");
    }
  }
  return args;
}

function parseEnvText(text) {
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
    return fs.existsSync(filePath)
      ? parseEnvText(fs.readFileSync(filePath, "utf8"))
      : {};
  } catch {
    return {};
  }
}

export function normalizeRunId(value) {
  if (
    typeof value !== "string" ||
    value !== value.trim() ||
    !SAFE_RUN_ID.test(value)
  ) {
    throw new Error(
      "Protected-action proof requires an exact safe identifier in --run-id=.",
    );
  }
  return value;
}

export function normalizeProtectedActionTarget(value, evidenceKey) {
  let target;
  try {
    target = classifyReleaseTarget(value, { evidenceKey });
  } catch {
    throw new Error(
      "Protected-action proof requires a valid HTTPS staged target origin.",
    );
  }
  if (!target.staged || target.protocol !== "https") {
    throw new Error("Protected-action proof requires an HTTPS staged target.");
  }
  return {
    targetId: target.targetId,
    origin: new URL(String(value)).origin,
  };
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
        await reader.cancel("protected action proof response limit exceeded");
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

function safeEvidenceId(value) {
  return typeof value === "string" &&
    value === value.trim() &&
    SAFE_EVIDENCE_ID.test(value)
    ? value
    : null;
}

function selectMatchingReceipt(payload, runId) {
  if (!Array.isArray(payload?.recentReceipts)) return null;
  return (
    payload.recentReceipts
      .filter((entry) => entry && entry.runId === runId)
      .sort(
        (left, right) =>
          (Number(right?.finishedAt) || 0) - (Number(left?.finishedAt) || 0),
      )[0] ?? null
  );
}

function selectContractAction(payload, receipt) {
  if (!receipt || !Array.isArray(payload?.contracts)) return null;
  const contract = payload.contracts.find(
    (entry) => entry?.capabilityId === receipt.capabilityId,
  );
  if (!contract || !Array.isArray(contract.actions)) return null;
  return (
    contract.actions.find((entry) => entry?.id === receipt.actionId) ?? null
  );
}

export function buildProtectedActionProofArtifact({
  capturedAt = new Date(),
  targetId = null,
  runId = null,
  probe = null,
  evidenceKey = "",
}) {
  const captured =
    capturedAt instanceof Date ? capturedAt : new Date(capturedAt);
  const capturedMs = captured.getTime();
  const payload = probe?.payload;
  const blockers = [];

  if (!/^staging-[a-f0-9]{16}$/.test(targetId ?? "")) {
    blockers.push("HTTPS staged target identity is unavailable.");
  }
  let exactRunId = null;
  try {
    exactRunId = normalizeRunId(runId);
  } catch {
    blockers.push("An exact sanitized run id is required.");
  }
  if (!probe) {
    blockers.push("Protected capability evidence was not fetched.");
  } else {
    if (probe.status !== 200) {
      blockers.push("Protected capability evidence did not return HTTP 200.");
    }
    if (!probe.bodyWithinLimit) {
      blockers.push(
        "Protected capability evidence exceeded the response limit.",
      );
    }
    if (!probe.validJson) {
      blockers.push("Protected capability evidence was not valid JSON.");
    }
    if (probe.error) {
      blockers.push("Protected capability evidence request failed.");
    }
  }
  if (
    payload?.ok !== true ||
    payload?.available !== true ||
    payload?.schemaVersion !== "capability-assurance.v1"
  ) {
    blockers.push(
      "Capability assurance payload was unavailable or incompatible.",
    );
  }

  const receipt = exactRunId
    ? selectMatchingReceipt(payload, exactRunId)
    : null;
  if (!receipt) {
    blockers.push("No matching receipt exists for the exact run id.");
  }
  const action = selectContractAction(payload, receipt);
  if (!action) {
    blockers.push("The receipt action is absent from its capability contract.");
  }

  const finishedAt = Number(receipt?.finishedAt);
  const recent =
    Number.isFinite(finishedAt) &&
    finishedAt > 0 &&
    finishedAt <= capturedMs + FUTURE_CLOCK_SKEW_MS &&
    capturedMs - finishedAt <= EVIDENCE_MAX_AGE_MS;
  if (receipt && !recent) {
    blockers.push("The matching receipt is not recent evidence.");
  }
  if (receipt?.mode !== "action") {
    blockers.push("The matching receipt is not an action outcome.");
  }
  if (receipt?.status !== "verified" || receipt?.verificationPassed !== true) {
    blockers.push("The matching receipt is not a verified outcome.");
  }
  if (receipt?.verificationRequired !== true) {
    blockers.push(
      "The matching receipt did not require explicit verification.",
    );
  }
  if (action?.approvalRequired !== true) {
    blockers.push("The matching contract action is not approval-required.");
  }
  if (
    receipt?.capabilityId !== CAPABILITY_PROTECTED_ACTION_CAPABILITY_ID ||
    receipt?.actionId !== CAPABILITY_PROTECTED_ACTION_ID
  ) {
    blockers.push(
      "The matching receipt is not the server-owned temporary QA cleanup action.",
    );
  }
  const serverProofVerified = verifyCapabilityProtectedActionReceipt(
    receipt,
    evidenceKey,
  );
  if (receipt && !serverProofVerified) {
    blockers.push(
      "The matching receipt lacks valid server protected-action provenance.",
    );
  }

  const capabilityEvidenceId = safeEvidenceId(receipt?.id);
  const capabilityId = safeEvidenceId(receipt?.capabilityId);
  const actionId = safeEvidenceId(receipt?.actionId);
  if (receipt && (!capabilityEvidenceId || !capabilityId || !actionId)) {
    blockers.push("Receipt identifiers are not privacy-safe evidence ids.");
  }

  const protectedActionReady = blockers.length === 0;
  const artifact = {
    schemaVersion: PROTECTED_ACTION_PROOF_SCHEMA_VERSION,
    capturedAt: Number.isFinite(capturedMs) ? captured.toISOString() : null,
    expiresAt: Number.isFinite(capturedMs)
      ? new Date(capturedMs + EVIDENCE_MAX_AGE_MS).toISOString()
      : null,
    evidenceMaxAgeMs: EVIDENCE_MAX_AGE_MS,
    targetId,
    route: ROUTE,
    method: "GET",
    runId: exactRunId,
    request: {
      status: Number.isInteger(probe?.status) ? probe.status : 0,
      durationMs: Number.isFinite(probe?.durationMs)
        ? Math.max(0, Math.round(probe.durationMs))
        : 0,
      responseBytes: Number.isFinite(probe?.responseBytes)
        ? Math.max(0, Math.round(probe.responseBytes))
        : 0,
      bodyWithinLimit: Boolean(probe?.bodyWithinLimit),
      validJson: Boolean(probe?.validJson),
    },
    receipt: receipt
      ? {
          id: capabilityEvidenceId,
          schemaVersion:
            receipt.schemaVersion === "capability-assurance.v1"
              ? receipt.schemaVersion
              : null,
          runId: exactRunId,
          capabilityId,
          actionId,
          finishedAt: recent ? new Date(finishedAt).toISOString() : null,
          mode: receipt.mode === "action" ? "action" : null,
          status: receipt.status === "verified" ? "verified" : null,
          approvalRequired: action?.approvalRequired === true,
          verificationRequired: receipt.verificationRequired === true,
          verificationPassed: receipt.verificationPassed === true,
          provenance:
            receipt.provenance === "server_protected_action"
              ? receipt.provenance
              : null,
          approvalGranted: receipt.approvalGranted === true,
          proofSignature:
            typeof receipt.proofSignature === "string" &&
            /^[a-f0-9]{64}$/.test(receipt.proofSignature)
              ? receipt.proofSignature
              : null,
          serverProofVerified,
        }
      : null,
    protectedActionReady,
    blockers: Array.from(new Set(blockers)).map((entry) =>
      sanitizeDiagnosticValue(entry),
    ),
    envelopeSignature: null,
  };
  if (typeof evidenceKey === "string" && evidenceKey.length >= 16) {
    artifact.envelopeSignature = signProtectedActionProofEnvelope(
      artifact,
      evidenceKey,
    );
  }
  return artifact;
}

function parseArtifactDate(value) {
  if (typeof value !== "string" || !value.trim()) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function validateProtectedActionProofArtifact({
  proof,
  targetId,
  capturedAt = new Date(),
  evidenceKey = "",
}) {
  const nowMs =
    capturedAt instanceof Date
      ? capturedAt.getTime()
      : new Date(capturedAt).getTime();
  const capturedMs = parseArtifactDate(proof?.capturedAt);
  const expiresMs = parseArtifactDate(proof?.expiresAt);
  const finishedMs = parseArtifactDate(proof?.receipt?.finishedAt);
  let normalizedRunId = null;
  try {
    normalizedRunId = normalizeRunId(proof?.runId);
  } catch {
    // Invalid identifiers fail the canonical validator below.
  }
  const receipt = proof?.receipt;
  const identifiersValid = Boolean(
    safeEvidenceId(receipt?.id) &&
    safeEvidenceId(receipt?.capabilityId) &&
    safeEvidenceId(receipt?.actionId),
  );
  const requestValid =
    proof?.request?.status === 200 &&
    proof?.request?.bodyWithinLimit === true &&
    proof?.request?.validJson === true &&
    Number.isFinite(proof?.request?.responseBytes) &&
    proof.request.responseBytes >= 0 &&
    proof.request.responseBytes <= DEFAULT_MAX_RESPONSE_BYTES;
  const timestampsValid =
    Number.isFinite(nowMs) &&
    capturedMs !== null &&
    expiresMs !== null &&
    finishedMs !== null &&
    capturedMs <= nowMs + FUTURE_CLOCK_SKEW_MS &&
    expiresMs > capturedMs &&
    expiresMs <= capturedMs + EVIDENCE_MAX_AGE_MS &&
    nowMs <= expiresMs &&
    nowMs - capturedMs <= EVIDENCE_MAX_AGE_MS &&
    finishedMs <= capturedMs + FUTURE_CLOCK_SKEW_MS &&
    capturedMs - finishedMs <= EVIDENCE_MAX_AGE_MS;
  const targetMatches =
    /^staging-[a-f0-9]{16}$/.test(targetId ?? "") &&
    proof?.targetId === targetId;
  const runMatches =
    normalizedRunId !== null && receipt?.runId === normalizedRunId;
  const signedServerReceipt = verifyCapabilityProtectedActionReceipt(
    receipt,
    evidenceKey,
  );
  const signedEnvelope = verifyProtectedActionProofEnvelope(proof, evidenceKey);
  const semanticsValid =
    proof?.method === "GET" &&
    proof?.route === ROUTE &&
    Array.isArray(proof?.blockers) &&
    proof.blockers.length === 0 &&
    receipt?.schemaVersion === "capability-assurance.v1" &&
    receipt?.capabilityId === CAPABILITY_PROTECTED_ACTION_CAPABILITY_ID &&
    receipt?.actionId === CAPABILITY_PROTECTED_ACTION_ID &&
    receipt?.mode === "action" &&
    receipt?.status === "verified" &&
    receipt?.approvalRequired === true &&
    receipt?.verificationRequired === true &&
    receipt?.verificationPassed === true &&
    receipt?.provenance === "server_protected_action" &&
    receipt?.approvalGranted === true &&
    receipt?.serverProofVerified === true;
  const schemaValid =
    proof?.schemaVersion === PROTECTED_ACTION_PROOF_SCHEMA_VERSION;
  const protectedActionReady = proof?.protectedActionReady === true;
  return {
    available: Boolean(proof),
    schemaValid,
    timestampsValid,
    targetMatches,
    requestValid,
    runMatches,
    identifiersValid,
    signedServerReceipt,
    signedEnvelope,
    semanticsValid,
    protectedActionReady,
    passed:
      Boolean(proof) &&
      schemaValid &&
      timestampsValid &&
      targetMatches &&
      requestValid &&
      runMatches &&
      identifiersValid &&
      signedServerReceipt &&
      signedEnvelope &&
      semanticsValid &&
      protectedActionReady,
  };
}

async function fetchProtectedActionEvidence(origin, token) {
  const startedAt = performance.now();
  try {
    const response = await fetch(`${origin}${ROUTE}`, {
      method: "GET",
      headers: { [INTERNAL_AUTH_HEADER]: token },
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.timeout(DEFAULT_REQUEST_TIMEOUT_MS),
    });
    const body = await readBoundedJsonResponse(response);
    return {
      status: response.status,
      durationMs: Math.round(performance.now() - startedAt),
      responseBytes: body.byteLength,
      bodyWithinLimit: body.withinLimit,
      validJson: body.validJson,
      payload: body.json,
      error: null,
    };
  } catch {
    return {
      status: 0,
      durationMs: Math.round(performance.now() - startedAt),
      responseBytes: 0,
      bodyWithinLimit: false,
      validJson: false,
      payload: null,
      error: "request_failed",
    };
  }
}

function writeArtifact(artifact, outDir) {
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(
    path.join(outDir, ARTIFACT_FILENAME),
    `${JSON.stringify(artifact, null, 2)}\n`,
    "utf8",
  );
}

async function main() {
  const capturedAt = new Date();
  let args = {};
  try {
    args = parseArgs(process.argv.slice(2));
  } catch {
    // Invalid arguments still produce a stable fail-closed evidence artifact.
  }
  const outDir = args.outDir
    ? path.resolve(root, args.outDir)
    : path.join(root, "docs", "metrics");
  const localEnv = readLocalEnv(path.join(root, ".env.local"));
  const rawTarget =
    args.baseUrl ??
    process.env.NEXUS_RELEASE_BASE_URL ??
    localEnv.NEXUS_RELEASE_BASE_URL ??
    "";
  const token = process.env.NEXUS_TOKEN ?? localEnv.NEXUS_TOKEN ?? "";
  const evidenceKey =
    process.env.NEXUS_EVIDENCE_KEY ?? localEnv.NEXUS_EVIDENCE_KEY ?? "";

  let target = null;
  let runId = null;
  try {
    target = normalizeProtectedActionTarget(rawTarget, evidenceKey);
    runId = normalizeRunId(args.runId);
  } catch {
    // The artifact builder reports exact safe blockers without echoing inputs.
  }

  const probe =
    target && runId && token
      ? await fetchProtectedActionEvidence(target.origin, token)
      : null;
  const artifact = buildProtectedActionProofArtifact({
    capturedAt,
    targetId: target?.targetId ?? null,
    runId,
    probe,
    evidenceKey,
  });
  if (!token) {
    artifact.blockers.push("NEXUS_TOKEN is required for the protected GET.");
    artifact.protectedActionReady = false;
  }
  if (evidenceKey.length < 16) {
    artifact.blockers.push(
      "NEXUS_EVIDENCE_KEY is required for stable staged target identity.",
    );
    artifact.protectedActionReady = false;
  }
  writeArtifact(artifact, outDir);
  console.log(
    `protected-action proof target: ${artifact.targetId ?? "unavailable"}`,
  );
  console.log(
    `protected-action proof ready: ${artifact.protectedActionReady ? "yes" : "no"}`,
  );
  if (!artifact.protectedActionReady) process.exit(2);
}

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main().catch(() => {
    console.error("protected-action proof failed");
    process.exit(1);
  });
}
