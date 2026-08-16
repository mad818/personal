import { createHmac, timingSafeEqual } from "node:crypto";

export const CAPABILITY_PROTECTED_ACTION_RECEIPT_VERSION =
  "nexus-protected-action-receipt.v1";
export const CAPABILITY_PROTECTED_ACTION_CAPABILITY_ID = "archive-continuity";
export const CAPABILITY_PROTECTED_ACTION_ID = "remove-temporary-qa-evidence";

function canonicalValue(value) {
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return typeof value === "string" ? value : "";
}

function canonicalFinishedAt(value) {
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) return String(parsed);
  }
  return "";
}

export function capabilityProtectedActionReceiptPayload(receipt) {
  return [
    CAPABILITY_PROTECTED_ACTION_RECEIPT_VERSION,
    receipt?.schemaVersion,
    receipt?.id,
    receipt?.runId,
    receipt?.capabilityId,
    receipt?.actionId,
    canonicalFinishedAt(receipt?.finishedAt),
    receipt?.mode,
    receipt?.status,
    receipt?.verificationRequired,
    receipt?.verificationPassed,
    receipt?.provenance,
    receipt?.approvalGranted,
  ]
    .map(canonicalValue)
    .join("\n");
}

export function signCapabilityProtectedActionReceipt(receipt, evidenceKey) {
  if (typeof evidenceKey !== "string" || evidenceKey.length < 16) {
    throw new Error("A private evidence key is required to sign action proof.");
  }
  return createHmac("sha256", evidenceKey)
    .update(capabilityProtectedActionReceiptPayload(receipt))
    .digest("hex");
}

export function verifyCapabilityProtectedActionReceipt(receipt, evidenceKey) {
  const signature = receipt?.proofSignature;
  if (
    receipt?.provenance !== "server_protected_action" ||
    receipt?.approvalGranted !== true ||
    receipt?.capabilityId !== CAPABILITY_PROTECTED_ACTION_CAPABILITY_ID ||
    receipt?.actionId !== CAPABILITY_PROTECTED_ACTION_ID ||
    typeof signature !== "string" ||
    !/^[a-f0-9]{64}$/.test(signature) ||
    typeof evidenceKey !== "string" ||
    evidenceKey.length < 16
  ) {
    return false;
  }
  const expected = signCapabilityProtectedActionReceipt(receipt, evidenceKey);
  return timingSafeEqual(
    Buffer.from(signature, "hex"),
    Buffer.from(expected, "hex"),
  );
}
