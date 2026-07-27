import assert from "node:assert/strict";
import {
  createSealedVaultPayload,
  deleteSealedVaultRecord,
  openSealedVault,
  parseSealedVaultEnvelope,
  parseSealedVaultEnvelopeJson,
  sealVaultPayload,
  SEALED_VAULT_AUTO_LOCK_MS,
  SEALED_VAULT_KDF_ITERATIONS,
  SEALED_VAULT_MAX_RECORDS,
  serializeSealedVaultEnvelope,
  upsertSealedVaultRecord,
  validateSealedVaultPayload,
} from "../lib/sealedVault.ts";
import {
  COMPANY_SKILL_SOURCES,
  NEXUS_COMPANY_DEPARTMENTS,
} from "../lib/nexusCompanyMap.ts";

const passphrase = "correct horse battery staple";
const createdAt = "2026-07-26T12:00:00.000Z";
const updatedAt = "2026-07-26T12:05:00.000Z";
const recordId = "sealed-runtime-record";

const empty = createSealedVaultPayload(createdAt);
const withRecord = upsertSealedVaultRecord(
  empty,
  {
    id: recordId,
    title: "Private launch constraints",
    body: "Evidence and operator-only constraints stay inside this envelope.",
    tags: ["private", "launch"],
  },
  updatedAt,
);
assert.equal(withRecord.records.length, 1);

const firstEnvelope = await sealVaultPayload(withRecord, passphrase, {
  now: "2026-07-26T12:06:00.000Z",
});
const secondEnvelope = await sealVaultPayload(withRecord, passphrase, {
  now: "2026-07-26T12:07:00.000Z",
});
assert.equal(firstEnvelope.kdf.name, "PBKDF2-SHA256");
assert.equal(firstEnvelope.kdf.iterations, 600_000);
assert.equal(firstEnvelope.cipher.name, "AES-GCM-256");
assert.notEqual(firstEnvelope.kdf.salt, secondEnvelope.kdf.salt);
assert.notEqual(firstEnvelope.cipher.iv, secondEnvelope.cipher.iv);
assert.notEqual(firstEnvelope.ciphertext, secondEnvelope.ciphertext);

const serialized = serializeSealedVaultEnvelope(firstEnvelope);
for (const secret of [
  passphrase,
  "Private launch constraints",
  "Evidence and operator-only constraints",
]) {
  assert.ok(
    !serialized.includes(secret),
    `serialized secret leaked: ${secret}`,
  );
}
assert.deepEqual(parseSealedVaultEnvelopeJson(serialized), firstEnvelope);
assert.deepEqual(await openSealedVault(firstEnvelope, passphrase), withRecord);

await assert.rejects(
  () => openSealedVault(firstEnvelope, "wrong passphrase value"),
  /Unable to unlock/i,
);
const tamperedBytes = Uint8Array.from(atob(firstEnvelope.ciphertext), (value) =>
  value.charCodeAt(0),
);
tamperedBytes[0] ^= 1;
const tampered = {
  ...firstEnvelope,
  ciphertext: btoa(
    Array.from(tamperedBytes, (value) => String.fromCharCode(value)).join(""),
  ),
};
await assert.rejects(
  () => openSealedVault(tampered, passphrase),
  /Unable to unlock/i,
);

const changed = upsertSealedVaultRecord(
  withRecord,
  {
    id: recordId,
    title: "Updated private launch constraints",
    body: "Updated evidence remains sealed.",
    tags: ["private"],
  },
  "2026-07-26T12:10:00.000Z",
);
assert.equal(changed.records[0].createdAt, updatedAt);
assert.equal(changed.records[0].updatedAt, "2026-07-26T12:10:00.000Z");
const deleted = deleteSealedVaultRecord(
  changed,
  recordId,
  "2026-07-26T12:11:00.000Z",
);
assert.equal(deleted.records.length, 0);

assert.throws(
  () =>
    parseSealedVaultEnvelope({
      ...firstEnvelope,
      kdf: { ...firstEnvelope.kdf, iterations: 599_999 },
    }),
  /KDF parameters/i,
);
assert.throws(
  () =>
    parseSealedVaultEnvelope({
      ...firstEnvelope,
      cipher: { ...firstEnvelope.cipher, name: "AES-CBC-256" },
    }),
  /cipher/i,
);
assert.throws(
  () =>
    parseSealedVaultEnvelope({
      ...firstEnvelope,
      cipher: { ...firstEnvelope.cipher, iv: "aXY=" },
    }),
  /length/i,
);
assert.throws(
  () =>
    validateSealedVaultPayload({
      ...withRecord,
      records: [...withRecord.records, { ...withRecord.records[0] }],
    }),
  /unique/i,
);
assert.throws(
  () =>
    validateSealedVaultPayload({
      ...withRecord,
      records: Array.from({ length: 101 }, (_, index) => ({
        ...withRecord.records[0],
        id: `sealed-${index}`,
      })),
    }),
  /0-100/i,
);
assert.throws(
  () =>
    upsertSealedVaultRecord(withRecord, {
      id: "bad id with spaces",
      title: "Invalid",
      body: "This should not enter the encrypted payload.",
      tags: [],
    }),
  /unsupported characters/i,
);
assert.throws(
  () =>
    parseSealedVaultEnvelopeJson(
      JSON.stringify({ ...firstEnvelope, sealedAt: "not-a-date" }),
    ),
  /timestamp/i,
);

assert.equal(SEALED_VAULT_KDF_ITERATIONS, 600_000);
assert.equal(SEALED_VAULT_AUTO_LOCK_MS, 300_000);
assert.equal(SEALED_VAULT_MAX_RECORDS, 100);

const companySource = COMPANY_SKILL_SOURCES.find(
  (source) => source.id === "vaultwarden-sealed-vault",
);
assert.ok(companySource);
assert.equal(companySource.posture, "adapted");
assert.match(companySource.codexPath, /vault-sealed/i);
assert.ok(
  NEXUS_COMPANY_DEPARTMENTS.find(
    (department) => department.id === "legal-trust",
  )?.sourceIds.includes(companySource.id),
);

console.log(
  "ok sealed-vault-runtime (real Web Crypto round-trip, random reseal, tamper/wrong-passphrase rejection, bounded payload, mutation, deletion, import/export)",
);
