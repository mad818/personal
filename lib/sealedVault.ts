export const SEALED_VAULT_STORAGE_KEY = "nexus.sealed-vault.envelope.v1";
export const SEALED_VAULT_KDF_ITERATIONS = 600_000;
export const SEALED_VAULT_AUTO_LOCK_MS = 5 * 60 * 1_000;
export const SEALED_VAULT_MAX_RECORDS = 100;

const SEALED_VAULT_ADDITIONAL_DATA = "nexus-sealed-vault-envelope:v1";
const MAX_PLAINTEXT_BYTES = 256 * 1024;
const MAX_ENVELOPE_JSON_BYTES = 800 * 1024;
const ID_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,95}$/;

export interface SealedVaultRecord {
  id: string;
  title: string;
  body: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface SealedVaultPayload {
  schemaVersion: 1;
  updatedAt: string;
  records: SealedVaultRecord[];
}

export interface SealedVaultEnvelope {
  schemaVersion: 1;
  sealedAt: string;
  kdf: {
    name: "PBKDF2-SHA256";
    iterations: number;
    salt: string;
  };
  cipher: {
    name: "AES-GCM-256";
    iv: string;
  };
  ciphertext: string;
}

export interface SealedVaultRecordInput {
  id?: string;
  title: string;
  body: string;
  tags: string[];
}

type VaultCrypto = Pick<Crypto, "getRandomValues" | "randomUUID" | "subtle">;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isoTimestamp(value: unknown, label: string): string {
  if (
    typeof value !== "string" ||
    !Number.isFinite(Date.parse(value)) ||
    value.length > 40
  ) {
    throw new Error(`${label} is invalid.`);
  }
  return value;
}

function boundedText(
  value: unknown,
  label: string,
  min: number,
  max: number,
): string {
  if (typeof value !== "string") throw new Error(`${label} must be text.`);
  const trimmed = value.trim();
  if (trimmed.length < min || trimmed.length > max) {
    throw new Error(`${label} must be ${min}-${max} characters.`);
  }
  return trimmed;
}

function boundedId(value: unknown, label: string): string {
  const id = boundedText(value, label, 1, 96);
  if (!ID_PATTERN.test(id)) {
    throw new Error(`${label} contains unsupported characters.`);
  }
  return id;
}

function assertPassphrase(passphrase: string) {
  if (passphrase.length < 12 || passphrase.length > 256) {
    throw new Error("Passphrase must be 12-256 characters.");
  }
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

function base64ToBytes(
  value: unknown,
  label: string,
  expectedLength?: number,
): Uint8Array {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > MAX_ENVELOPE_JSON_BYTES ||
    !/^[A-Za-z0-9+/]+={0,2}$/.test(value)
  ) {
    throw new Error(`${label} is invalid.`);
  }
  let binary: string;
  try {
    binary = atob(value);
  } catch {
    throw new Error(`${label} is invalid.`);
  }
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  if (expectedLength !== undefined && bytes.length !== expectedLength) {
    throw new Error(`${label} has an invalid length.`);
  }
  return bytes;
}

function parseRecord(value: unknown, index: number): SealedVaultRecord {
  if (!isRecord(value)) {
    throw new Error(`Sealed record ${index + 1} is invalid.`);
  }
  if (!Array.isArray(value.tags) || value.tags.length > 12) {
    throw new Error(`Sealed record ${index + 1} has invalid tags.`);
  }
  const tags = value.tags.map((tag, tagIndex) =>
    boundedText(tag, `Sealed record ${index + 1} tag ${tagIndex + 1}`, 1, 40),
  );
  if (new Set(tags).size !== tags.length) {
    throw new Error(`Sealed record ${index + 1} tags must be unique.`);
  }
  return {
    id: boundedId(value.id, `Sealed record ${index + 1} id`),
    title: boundedText(value.title, `Sealed record ${index + 1} title`, 1, 120),
    body: boundedText(value.body, `Sealed record ${index + 1} body`, 1, 10_000),
    tags,
    createdAt: isoTimestamp(
      value.createdAt,
      `Sealed record ${index + 1} created timestamp`,
    ),
    updatedAt: isoTimestamp(
      value.updatedAt,
      `Sealed record ${index + 1} updated timestamp`,
    ),
  };
}

function requireCrypto(provider?: VaultCrypto): VaultCrypto {
  const resolved = provider ?? globalThis.crypto;
  if (!resolved?.subtle || !resolved.getRandomValues) {
    throw new Error("Web Crypto is unavailable in this browser context.");
  }
  return resolved;
}

async function deriveKey(
  passphrase: string,
  salt: Uint8Array,
  provider: VaultCrypto,
): Promise<CryptoKey> {
  const encodedPassphrase = new TextEncoder().encode(passphrase);
  const material = await provider.subtle.importKey(
    "raw",
    encodedPassphrase,
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return provider.subtle.deriveKey(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: toArrayBuffer(salt),
      iterations: SEALED_VAULT_KDF_ITERATIONS,
    },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export function createSealedVaultPayload(
  now = new Date().toISOString(),
): SealedVaultPayload {
  return {
    schemaVersion: 1,
    updatedAt: isoTimestamp(now, "Vault timestamp"),
    records: [],
  };
}

export function validateSealedVaultPayload(input: unknown): SealedVaultPayload {
  if (!isRecord(input) || input.schemaVersion !== 1) {
    throw new Error("Sealed vault payload version is unsupported.");
  }
  if (
    !Array.isArray(input.records) ||
    input.records.length > SEALED_VAULT_MAX_RECORDS
  ) {
    throw new Error(
      `Sealed vault must contain 0-${SEALED_VAULT_MAX_RECORDS} records.`,
    );
  }
  const records = input.records.map(parseRecord);
  if (new Set(records.map((record) => record.id)).size !== records.length) {
    throw new Error("Sealed vault record IDs must be unique.");
  }
  return {
    schemaVersion: 1,
    updatedAt: isoTimestamp(input.updatedAt, "Vault updated timestamp"),
    records,
  };
}

export function parseSealedVaultEnvelope(input: unknown): SealedVaultEnvelope {
  if (!isRecord(input) || input.schemaVersion !== 1) {
    throw new Error("Sealed vault envelope version is unsupported.");
  }
  if (
    !isRecord(input.kdf) ||
    input.kdf.name !== "PBKDF2-SHA256" ||
    input.kdf.iterations !== SEALED_VAULT_KDF_ITERATIONS
  ) {
    throw new Error("Sealed vault KDF parameters are unsupported.");
  }
  if (!isRecord(input.cipher) || input.cipher.name !== "AES-GCM-256") {
    throw new Error("Sealed vault cipher is unsupported.");
  }
  const salt = base64ToBytes(input.kdf.salt, "Sealed vault salt", 16);
  const iv = base64ToBytes(input.cipher.iv, "Sealed vault IV", 12);
  const ciphertext = base64ToBytes(input.ciphertext, "Sealed vault ciphertext");
  if (ciphertext.length < 17 || ciphertext.length > MAX_PLAINTEXT_BYTES + 32) {
    throw new Error("Sealed vault ciphertext size is invalid.");
  }
  return {
    schemaVersion: 1,
    sealedAt: isoTimestamp(input.sealedAt, "Envelope sealed timestamp"),
    kdf: {
      name: "PBKDF2-SHA256",
      iterations: SEALED_VAULT_KDF_ITERATIONS,
      salt: bytesToBase64(salt),
    },
    cipher: {
      name: "AES-GCM-256",
      iv: bytesToBase64(iv),
    },
    ciphertext: bytesToBase64(ciphertext),
  };
}

export function parseSealedVaultEnvelopeJson(
  text: string,
): SealedVaultEnvelope {
  if (
    typeof text !== "string" ||
    new TextEncoder().encode(text).byteLength > MAX_ENVELOPE_JSON_BYTES
  ) {
    throw new Error("Sealed vault import is too large.");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Sealed vault import is not valid JSON.");
  }
  return parseSealedVaultEnvelope(parsed);
}

export function serializeSealedVaultEnvelope(
  envelope: SealedVaultEnvelope,
): string {
  return JSON.stringify(parseSealedVaultEnvelope(envelope), null, 2);
}

export async function sealVaultPayload(
  input: SealedVaultPayload,
  passphrase: string,
  options: { crypto?: VaultCrypto; now?: string } = {},
): Promise<SealedVaultEnvelope> {
  assertPassphrase(passphrase);
  const payload = validateSealedVaultPayload(input);
  const plaintext = new TextEncoder().encode(JSON.stringify(payload));
  if (plaintext.byteLength > MAX_PLAINTEXT_BYTES) {
    throw new Error("Sealed vault plaintext exceeds the local size limit.");
  }
  const provider = requireCrypto(options.crypto);
  const salt = provider.getRandomValues(new Uint8Array(16));
  const iv = provider.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt, provider);
  const ciphertext = await provider.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: toArrayBuffer(iv),
      additionalData: new TextEncoder().encode(SEALED_VAULT_ADDITIONAL_DATA),
      tagLength: 128,
    },
    key,
    plaintext,
  );
  return {
    schemaVersion: 1,
    sealedAt: isoTimestamp(
      options.now ?? new Date().toISOString(),
      "Envelope sealed timestamp",
    ),
    kdf: {
      name: "PBKDF2-SHA256",
      iterations: SEALED_VAULT_KDF_ITERATIONS,
      salt: bytesToBase64(salt),
    },
    cipher: {
      name: "AES-GCM-256",
      iv: bytesToBase64(iv),
    },
    ciphertext: bytesToBase64(new Uint8Array(ciphertext)),
  };
}

export async function openSealedVault(
  input: unknown,
  passphrase: string,
  providerInput?: VaultCrypto,
): Promise<SealedVaultPayload> {
  assertPassphrase(passphrase);
  const envelope = parseSealedVaultEnvelope(input);
  const provider = requireCrypto(providerInput);
  const salt = base64ToBytes(envelope.kdf.salt, "Sealed vault salt", 16);
  const iv = base64ToBytes(envelope.cipher.iv, "Sealed vault IV", 12);
  const ciphertext = base64ToBytes(
    envelope.ciphertext,
    "Sealed vault ciphertext",
  );
  const key = await deriveKey(passphrase, salt, provider);
  let plaintext: ArrayBuffer;
  try {
    plaintext = await provider.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: toArrayBuffer(iv),
        additionalData: new TextEncoder().encode(SEALED_VAULT_ADDITIONAL_DATA),
        tagLength: 128,
      },
      key,
      toArrayBuffer(ciphertext),
    );
  } catch {
    throw new Error("Unable to unlock sealed vault.");
  }
  if (plaintext.byteLength > MAX_PLAINTEXT_BYTES) {
    throw new Error("Unable to unlock sealed vault.");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(
      new TextDecoder("utf-8", { fatal: true }).decode(plaintext),
    );
  } catch {
    throw new Error("Unable to unlock sealed vault.");
  }
  return validateSealedVaultPayload(parsed);
}

export function createSealedVaultRecordId(providerInput?: VaultCrypto): string {
  const provider = requireCrypto(providerInput);
  return `sealed-${provider.randomUUID()}`;
}

export function upsertSealedVaultRecord(
  input: SealedVaultPayload,
  recordInput: SealedVaultRecordInput,
  now = new Date().toISOString(),
  providerInput?: VaultCrypto,
): SealedVaultPayload {
  const payload = validateSealedVaultPayload(input);
  const updatedAt = isoTimestamp(now, "Record updated timestamp");
  const existing = recordInput.id
    ? payload.records.find((record) => record.id === recordInput.id)
    : null;
  const record: SealedVaultRecord = {
    id: recordInput.id
      ? boundedId(recordInput.id, "Sealed record id")
      : createSealedVaultRecordId(providerInput),
    title: boundedText(recordInput.title, "Sealed record title", 1, 120),
    body: boundedText(recordInput.body, "Sealed record body", 1, 10_000),
    tags: recordInput.tags.map((tag, index) =>
      boundedText(tag, `Sealed record tag ${index + 1}`, 1, 40),
    ),
    createdAt: existing?.createdAt ?? updatedAt,
    updatedAt,
  };
  if (
    record.tags.length > 12 ||
    new Set(record.tags).size !== record.tags.length
  ) {
    throw new Error("Sealed record tags must contain 0-12 unique entries.");
  }
  const records = existing
    ? payload.records.map((entry) => (entry.id === record.id ? record : entry))
    : [record, ...payload.records];
  if (records.length > SEALED_VAULT_MAX_RECORDS) {
    throw new Error(
      `Sealed vault supports at most ${SEALED_VAULT_MAX_RECORDS} records.`,
    );
  }
  return validateSealedVaultPayload({
    schemaVersion: 1,
    updatedAt,
    records,
  });
}

export function deleteSealedVaultRecord(
  input: SealedVaultPayload,
  recordId: string,
  now = new Date().toISOString(),
): SealedVaultPayload {
  const payload = validateSealedVaultPayload(input);
  const id = boundedId(recordId, "Sealed record id");
  if (!payload.records.some((record) => record.id === id)) {
    throw new Error("Sealed record was not found.");
  }
  return {
    schemaVersion: 1,
    updatedAt: isoTimestamp(now, "Vault updated timestamp"),
    records: payload.records.filter((record) => record.id !== id),
  };
}
