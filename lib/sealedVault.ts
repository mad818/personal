export const SEALED_VAULT_STORAGE_KEY = "nexus.sealed-vault.envelope.v1";
export const SEALED_VAULT_KDF_ITERATIONS = 600_000;
export const SEALED_VAULT_AUTO_LOCK_MS = 5 * 60 * 1_000;
export const SEALED_VAULT_MAX_RECORDS = 100;
export const SEALED_VAULT_MAX_RECORD_HISTORY = 12;
export const SEALED_VAULT_MAX_EVENTS = 200;

const SEALED_VAULT_ADDITIONAL_DATA = "nexus-sealed-vault-envelope:v1";
const MAX_PLAINTEXT_BYTES = 256 * 1024;
const MAX_ENVELOPE_JSON_BYTES = 800 * 1024;
const ID_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,95}$/;

export interface SealedVaultRecord {
  id: string;
  title: string;
  body: string;
  tags: string[];
  path: string;
  history: SealedVaultRecordRevision[];
  createdAt: string;
  updatedAt: string;
}

export interface SealedVaultRecordRevision {
  title: string;
  body: string;
  tags: string[];
  path: string;
  savedAt: string;
}

export type SealedVaultEventAction =
  | "create"
  | "update"
  | "undo"
  | "delete"
  | "rekey";

export interface SealedVaultEvent {
  id: string;
  action: SealedVaultEventAction;
  recordId?: string;
  at: string;
}

export interface SealedVaultPayload {
  schemaVersion: 2;
  updatedAt: string;
  records: SealedVaultRecord[];
  events: SealedVaultEvent[];
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
  path?: string;
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

function boundedPath(value: unknown, label: string): string {
  const path = boundedText(value, label, 1, 160);
  const segments = path.split("/").map((segment) => segment.trim());
  if (
    segments.length > 8 ||
    segments.some(
      (segment) =>
        segment.length === 0 ||
        segment.length > 60 ||
        segment === "." ||
        segment === ".." ||
        /[\u0000-\u001f\u007f]/.test(segment),
    )
  ) {
    throw new Error(`${label} must contain 1-8 safe slash-separated segments.`);
  }
  return segments.join("/");
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

function parseTags(value: unknown, label: string): string[] {
  if (!Array.isArray(value) || value.length > 12) {
    throw new Error(`${label} has invalid tags.`);
  }
  const tags = value.map((tag, tagIndex) =>
    boundedText(tag, `${label} tag ${tagIndex + 1}`, 1, 40),
  );
  if (new Set(tags).size !== tags.length) {
    throw new Error(`${label} tags must be unique.`);
  }
  return tags;
}

function parseRevision(
  value: unknown,
  recordIndex: number,
  revisionIndex: number,
): SealedVaultRecordRevision {
  const label = `Sealed record ${recordIndex + 1} revision ${revisionIndex + 1}`;
  if (!isRecord(value)) throw new Error(`${label} is invalid.`);
  return {
    title: boundedText(value.title, `${label} title`, 1, 120),
    body: boundedText(value.body, `${label} body`, 1, 10_000),
    tags: parseTags(value.tags, label),
    path: boundedPath(value.path, `${label} path`),
    savedAt: isoTimestamp(value.savedAt, `${label} saved timestamp`),
  };
}

function parseRecord(
  value: unknown,
  index: number,
  schemaVersion: 1 | 2,
): SealedVaultRecord {
  if (!isRecord(value)) {
    throw new Error(`Sealed record ${index + 1} is invalid.`);
  }
  const historyValue = schemaVersion === 2 ? value.history : [];
  if (
    !Array.isArray(historyValue) ||
    historyValue.length > SEALED_VAULT_MAX_RECORD_HISTORY
  ) {
    throw new Error(
      `Sealed record ${index + 1} must contain 0-${SEALED_VAULT_MAX_RECORD_HISTORY} revisions.`,
    );
  }
  return {
    id: boundedId(value.id, `Sealed record ${index + 1} id`),
    title: boundedText(value.title, `Sealed record ${index + 1} title`, 1, 120),
    body: boundedText(value.body, `Sealed record ${index + 1} body`, 1, 10_000),
    tags: parseTags(value.tags, `Sealed record ${index + 1}`),
    path: boundedPath(
      schemaVersion === 2 ? value.path : "General",
      `Sealed record ${index + 1} path`,
    ),
    history: historyValue.map((revision, revisionIndex) =>
      parseRevision(revision, index, revisionIndex),
    ),
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

const SEALED_VAULT_EVENT_ACTIONS = new Set<SealedVaultEventAction>([
  "create",
  "update",
  "undo",
  "delete",
  "rekey",
]);

function parseEvent(value: unknown, index: number): SealedVaultEvent {
  const label = `Sealed vault event ${index + 1}`;
  if (!isRecord(value)) throw new Error(`${label} is invalid.`);
  if (
    typeof value.action !== "string" ||
    !SEALED_VAULT_EVENT_ACTIONS.has(value.action as SealedVaultEventAction)
  ) {
    throw new Error(`${label} action is unsupported.`);
  }
  const event: SealedVaultEvent = {
    id: boundedId(value.id, `${label} id`),
    action: value.action as SealedVaultEventAction,
    at: isoTimestamp(value.at, `${label} timestamp`),
  };
  if (value.recordId !== undefined) {
    event.recordId = boundedId(value.recordId, `${label} record id`);
  }
  if (event.action !== "rekey" && !event.recordId) {
    throw new Error(`${label} must reference a record.`);
  }
  if (event.action === "rekey" && event.recordId) {
    throw new Error(`${label} rekey action cannot reference a record.`);
  }
  return event;
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
    schemaVersion: 2,
    updatedAt: isoTimestamp(now, "Vault timestamp"),
    records: [],
    events: [],
  };
}

export function validateSealedVaultPayload(input: unknown): SealedVaultPayload {
  if (
    !isRecord(input) ||
    (input.schemaVersion !== 1 && input.schemaVersion !== 2)
  ) {
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
  const schemaVersion = input.schemaVersion;
  const records = input.records.map((record, index) =>
    parseRecord(record, index, schemaVersion),
  );
  if (new Set(records.map((record) => record.id)).size !== records.length) {
    throw new Error("Sealed vault record IDs must be unique.");
  }
  const eventValues = schemaVersion === 2 ? input.events : [];
  if (
    !Array.isArray(eventValues) ||
    eventValues.length > SEALED_VAULT_MAX_EVENTS
  ) {
    throw new Error(
      `Sealed vault must contain 0-${SEALED_VAULT_MAX_EVENTS} events.`,
    );
  }
  const events = eventValues.map(parseEvent);
  if (new Set(events.map((event) => event.id)).size !== events.length) {
    throw new Error("Sealed vault event IDs must be unique.");
  }
  return {
    schemaVersion: 2,
    updatedAt: isoTimestamp(input.updatedAt, "Vault updated timestamp"),
    records,
    events,
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

export function createSealedVaultEventId(providerInput?: VaultCrypto): string {
  const provider = requireCrypto(providerInput);
  return `event-${provider.randomUUID()}`;
}

function createSealedVaultEvent(
  action: SealedVaultEventAction,
  at: string,
  recordId?: string,
  providerInput?: VaultCrypto,
): SealedVaultEvent {
  const event: SealedVaultEvent = {
    id: createSealedVaultEventId(providerInput),
    action,
    at: isoTimestamp(at, "Vault event timestamp"),
  };
  if (recordId) event.recordId = boundedId(recordId, "Vault event record id");
  return parseEvent(event, 0);
}

export function appendSealedVaultEvent(
  input: SealedVaultPayload,
  action: SealedVaultEventAction,
  now = new Date().toISOString(),
  recordId?: string,
  providerInput?: VaultCrypto,
): SealedVaultPayload {
  const payload = validateSealedVaultPayload(input);
  const updatedAt = isoTimestamp(now, "Vault updated timestamp");
  const event = createSealedVaultEvent(
    action,
    updatedAt,
    recordId,
    providerInput,
  );
  return validateSealedVaultPayload({
    schemaVersion: 2,
    updatedAt,
    records: payload.records,
    events: [event, ...payload.events].slice(0, SEALED_VAULT_MAX_EVENTS),
  });
}

function revisionFromRecord(
  record: SealedVaultRecord,
): SealedVaultRecordRevision {
  return {
    title: record.title,
    body: record.body,
    tags: record.tags,
    path: record.path,
    savedAt: record.updatedAt,
  };
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
    path: boundedPath(recordInput.path ?? "General", "Sealed record path"),
    history: existing
      ? [revisionFromRecord(existing), ...existing.history].slice(
          0,
          SEALED_VAULT_MAX_RECORD_HISTORY,
        )
      : [],
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
  return appendSealedVaultEvent(
    validateSealedVaultPayload({
      schemaVersion: 2,
      updatedAt,
      records,
      events: payload.events,
    }),
    existing ? "update" : "create",
    updatedAt,
    record.id,
    providerInput,
  );
}

export function undoSealedVaultRecord(
  input: SealedVaultPayload,
  recordId: string,
  now = new Date().toISOString(),
  providerInput?: VaultCrypto,
): SealedVaultPayload {
  const payload = validateSealedVaultPayload(input);
  const id = boundedId(recordId, "Sealed record id");
  const existing = payload.records.find((record) => record.id === id);
  const revision = existing?.history[0];
  if (!existing || !revision) {
    throw new Error("Sealed record has no revision to restore.");
  }
  const updatedAt = isoTimestamp(now, "Record restored timestamp");
  const restored: SealedVaultRecord = {
    ...existing,
    title: revision.title,
    body: revision.body,
    tags: revision.tags,
    path: revision.path,
    history: existing.history.slice(1),
    updatedAt,
  };
  return appendSealedVaultEvent(
    validateSealedVaultPayload({
      schemaVersion: 2,
      updatedAt,
      records: payload.records.map((record) =>
        record.id === id ? restored : record,
      ),
      events: payload.events,
    }),
    "undo",
    updatedAt,
    id,
    providerInput,
  );
}

export function deleteSealedVaultRecord(
  input: SealedVaultPayload,
  recordId: string,
  now = new Date().toISOString(),
  providerInput?: VaultCrypto,
): SealedVaultPayload {
  const payload = validateSealedVaultPayload(input);
  const id = boundedId(recordId, "Sealed record id");
  if (!payload.records.some((record) => record.id === id)) {
    throw new Error("Sealed record was not found.");
  }
  const updatedAt = isoTimestamp(now, "Vault updated timestamp");
  return appendSealedVaultEvent(
    validateSealedVaultPayload({
      schemaVersion: 2,
      updatedAt,
      records: payload.records.filter((record) => record.id !== id),
      events: payload.events,
    }),
    "delete",
    updatedAt,
    id,
    providerInput,
  );
}
