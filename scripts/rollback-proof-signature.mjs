import { createHmac, timingSafeEqual } from "node:crypto";

export const ROLLBACK_PROOF_ENVELOPE_VERSION =
  "nexus-rollback-proof-envelope.v1";
export const KNOWN_GOOD_ENVELOPE_VERSION =
  "nexus-known-good-deployment-envelope.v1";

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, canonicalize(value[key])]),
  );
}

function envelopePayload(version, proof) {
  const unsignedProof = Object.fromEntries(
    Object.entries(proof ?? {}).filter(([key]) => key !== "envelopeSignature"),
  );
  return `${version}\n${JSON.stringify(canonicalize(unsignedProof))}`;
}

export function rollbackProofEnvelopePayload(proof) {
  return envelopePayload(ROLLBACK_PROOF_ENVELOPE_VERSION, proof);
}

export function knownGoodEnvelopePayload(proof) {
  return envelopePayload(KNOWN_GOOD_ENVELOPE_VERSION, proof);
}

export function signRollbackProofEnvelope(proof, evidenceKey) {
  if (typeof evidenceKey !== "string" || evidenceKey.length < 16) {
    throw new Error(
      "A private evidence key is required to sign rollback evidence.",
    );
  }
  return createHmac("sha256", evidenceKey)
    .update(rollbackProofEnvelopePayload(proof))
    .digest("hex");
}

export function verifyRollbackProofEnvelope(proof, evidenceKey) {
  const signature = proof?.envelopeSignature;
  if (
    typeof signature !== "string" ||
    !/^[a-f0-9]{64}$/.test(signature) ||
    typeof evidenceKey !== "string" ||
    evidenceKey.length < 16
  ) {
    return false;
  }
  const expected = signRollbackProofEnvelope(proof, evidenceKey);
  return timingSafeEqual(
    Buffer.from(signature, "hex"),
    Buffer.from(expected, "hex"),
  );
}

export function signKnownGoodEnvelope(proof, evidenceKey) {
  if (typeof evidenceKey !== "string" || evidenceKey.length < 16) {
    throw new Error(
      "A private evidence key is required to sign known-good evidence.",
    );
  }
  return createHmac("sha256", evidenceKey)
    .update(knownGoodEnvelopePayload(proof))
    .digest("hex");
}

export function verifyKnownGoodEnvelope(proof, evidenceKey) {
  const signature = proof?.envelopeSignature;
  if (
    typeof signature !== "string" ||
    !/^[a-f0-9]{64}$/.test(signature) ||
    typeof evidenceKey !== "string" ||
    evidenceKey.length < 16
  ) {
    return false;
  }
  const expected = signKnownGoodEnvelope(proof, evidenceKey);
  return timingSafeEqual(
    Buffer.from(signature, "hex"),
    Buffer.from(expected, "hex"),
  );
}
