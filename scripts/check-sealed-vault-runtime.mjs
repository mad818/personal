import assert from "node:assert/strict";
import {
  createSealedVaultPayload,
  deleteSealedVaultRecord,
  openSealedVault,
  parseSealedVaultEnvelope,
  parseSealedVaultEnvelopeJson,
  sealVaultPayload,
  SEALED_VAULT_AUTO_LOCK_MS,
  SEALED_VAULT_MAX_EVENTS,
  SEALED_VAULT_MAX_RECORD_HISTORY,
  SEALED_VAULT_KDF_ITERATIONS,
  SEALED_VAULT_MAX_RECORDS,
  serializeSealedVaultEnvelope,
  undoSealedVaultRecord,
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
    path: "Work/Launch",
  },
  updatedAt,
);
assert.equal(withRecord.records.length, 1);
assert.equal(withRecord.records[0].path, "Work/Launch");
assert.equal(withRecord.records[0].history.length, 0);
assert.equal(withRecord.events[0].action, "create");
assert.equal(withRecord.events[0].recordId, recordId);

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
  "Work/Launch",
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
    path: "Work/Archive",
  },
  "2026-07-26T12:10:00.000Z",
);
assert.equal(changed.records[0].createdAt, updatedAt);
assert.equal(changed.records[0].updatedAt, "2026-07-26T12:10:00.000Z");
assert.equal(changed.records[0].path, "Work/Archive");
assert.equal(changed.records[0].history.length, 1);
assert.equal(changed.records[0].history[0].title, "Private launch constraints");
assert.equal(changed.events[0].action, "update");

const restored = undoSealedVaultRecord(
  changed,
  recordId,
  "2026-07-26T12:10:30.000Z",
);
assert.equal(restored.records[0].title, "Private launch constraints");
assert.equal(restored.records[0].path, "Work/Launch");
assert.equal(restored.records[0].history.length, 0);
assert.equal(restored.events[0].action, "undo");

const deleted = deleteSealedVaultRecord(
  restored,
  recordId,
  "2026-07-26T12:11:00.000Z",
);
assert.equal(deleted.records.length, 0);
assert.equal(deleted.events[0].action, "delete");
assert.equal(deleted.events[0].recordId, recordId);

const migrated = validateSealedVaultPayload({
  schemaVersion: 1,
  updatedAt,
  records: [
    {
      id: "sealed-legacy",
      title: "Legacy private note",
      body: "Old inner payloads remain readable.",
      tags: ["legacy"],
      createdAt,
      updatedAt,
    },
  ],
});
assert.equal(migrated.schemaVersion, 2);
assert.equal(migrated.records[0].path, "General");
assert.deepEqual(migrated.records[0].history, []);
assert.deepEqual(migrated.events, []);

let bounded = withRecord;
for (let index = 0; index < SEALED_VAULT_MAX_EVENTS + 5; index += 1) {
  bounded = upsertSealedVaultRecord(
    bounded,
    {
      id: recordId,
      title: `Private revision ${index}`,
      body: `Bounded encrypted revision body ${index}.`,
      tags: ["private"],
      path: "Work/History",
    },
    new Date(Date.parse(updatedAt) + (index + 1) * 1_000).toISOString(),
  );
}
assert.equal(
  bounded.records[0].history.length,
  SEALED_VAULT_MAX_RECORD_HISTORY,
);
assert.equal(bounded.events.length, SEALED_VAULT_MAX_EVENTS);

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
assert.equal(SEALED_VAULT_MAX_RECORD_HISTORY, 12);
assert.equal(SEALED_VAULT_MAX_EVENTS, 200);

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
  "ok sealed-vault-runtime (real Web Crypto round-trip, legacy migration, encrypted hierarchy, bounded revisions/undo, mutation receipts, tamper/wrong-passphrase rejection, deletion, import/export)",
);
