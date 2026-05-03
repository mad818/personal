import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const readinessPath = path.join(repoRoot, "lib", "arpgProductionReadinessContent.json");
const saveEnvelopeSourcePath = path.join(repoRoot, "lib", "arpgSaveEnvelope.ts");
const storeSourcePath = path.join(repoRoot, "store", "useStore.ts");
const hqSourcePath = path.join(repoRoot, "components", "home", "arpg", "ArpgHud.tsx");
const readiness = JSON.parse(fs.readFileSync(readinessPath, "utf8"));
const saveEnvelopeSource = fs.readFileSync(saveEnvelopeSourcePath, "utf8");
const storeSource = fs.readFileSync(storeSourcePath, "utf8");
const hqSource = fs.readFileSync(hqSourcePath, "utf8");
const errors = [];

function fail(owner, message) {
  errors.push(`${owner}: ${message}`);
}

function requireString(owner, field, value) {
  if (typeof value !== "string" || !value.trim()) fail(owner, `missing ${field}`);
}

function requireArray(owner, field, value, min = 1) {
  if (!Array.isArray(value) || value.length < min) {
    fail(owner, `${field} must contain at least ${min} entries`);
    return [];
  }
  return value;
}

function parseJsonFile(owner, relativePath) {
  const absolutePath = path.join(repoRoot, relativePath);
  if (!fs.existsSync(absolutePath)) {
    fail(owner, `missing fixture ${relativePath}`);
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(absolutePath, "utf8"));
  } catch (error) {
    fail(owner, `fixture must parse as JSON (${error.message})`);
    return null;
  }
}

function requireSavePayload(owner, save, expectedVersion) {
  if (!save || typeof save !== "object" || Array.isArray(save)) {
    fail(owner, "save payload must be an object");
    return;
  }
  if (save.version !== expectedVersion) fail(owner, `expected save version ${expectedVersion}`);
  if (!save.player || typeof save.player !== "object") fail(owner, "player payload is required");
  if (!Array.isArray(save.storyFlags)) fail(owner, "storyFlags array is required");
  if (expectedVersion === 3) {
    for (const field of ["journey", "crafting", "endgame", "combat"]) {
      if (!save[field] || typeof save[field] !== "object") fail(owner, `${field} state is required for v3 fixture`);
    }
  }
}

const saveHardening = readiness.saveHardening ?? {};
if (saveHardening.envelopeVersion !== "aether-reliquary-save-envelope-v1") {
  fail("saveHardening.envelopeVersion", "expected aether-reliquary-save-envelope-v1");
}
if (saveHardening.activeSaveVersion !== 3) fail("saveHardening.activeSaveVersion", "expected v3");

const slotKinds = new Set(requireArray("saveHardening", "slotKinds", saveHardening.slotKinds, 3));
for (const kind of ["autosave", "manual", "checkpoint"]) {
  if (!slotKinds.has(kind)) fail("saveHardening.slotKinds", `missing ${kind}`);
}

const slotPolicies = requireArray("saveHardening", "slotPolicies", saveHardening.slotPolicies, 3);
for (const policy of slotPolicies) {
  if (!slotKinds.has(policy?.kind)) fail("saveHardening.slotPolicies", `unknown slot kind ${policy?.kind}`);
  requireString(`slotPolicy.${policy?.kind ?? "unknown"}`, "cadence", policy?.cadence);
  requireString(`slotPolicy.${policy?.kind ?? "unknown"}`, "recoveryUse", policy?.recoveryUse);
}

const fixturePaths = saveHardening.fixturePaths ?? {};
for (const field of ["legacyV2", "rawV3", "envelopeV1", "corrupted"]) {
  requireString("saveHardening.fixturePaths", field, fixturePaths[field]);
}

const legacyV2 = fixturePaths.legacyV2 ? parseJsonFile("legacyV2", fixturePaths.legacyV2) : null;
if (legacyV2) requireSavePayload("legacyV2", legacyV2, 2);

const rawV3 = fixturePaths.rawV3 ? parseJsonFile("rawV3", fixturePaths.rawV3) : null;
if (rawV3) requireSavePayload("rawV3", rawV3, 3);

const envelopeV1 = fixturePaths.envelopeV1 ? parseJsonFile("envelopeV1", fixturePaths.envelopeV1) : null;
if (envelopeV1) {
  if (envelopeV1.schemaVersion !== saveHardening.envelopeVersion) {
    fail("envelopeV1.schemaVersion", "must match readiness envelope version");
  }
  requireString("envelopeV1", "activeSlotId", envelopeV1.activeSlotId);
  const slots = requireArray("envelopeV1", "slots", envelopeV1.slots, 3);
  const envelopeKinds = new Set();
  for (const slot of slots) {
    requireString(`envelopeSlot.${slot?.id ?? "unknown"}`, "id", slot?.id);
    requireString(`envelopeSlot.${slot?.id ?? "unknown"}`, "label", slot?.label);
    if (!slotKinds.has(slot?.kind)) fail(`envelopeSlot.${slot?.id ?? "unknown"}`, `unknown kind ${slot?.kind}`);
    envelopeKinds.add(slot?.kind);
    requireSavePayload(`envelopeSlot.${slot?.id ?? "unknown"}`, slot?.save, 3);
  }
  for (const kind of ["autosave", "manual", "checkpoint"]) {
    if (!envelopeKinds.has(kind)) fail("envelopeV1.slots", `missing ${kind} slot fixture`);
  }
}

if (fixturePaths.corrupted) {
  const corruptedPath = path.join(repoRoot, fixturePaths.corrupted);
  if (!fs.existsSync(corruptedPath)) {
    fail("corrupted", `missing fixture ${fixturePaths.corrupted}`);
  } else {
    try {
      JSON.parse(fs.readFileSync(corruptedPath, "utf8"));
      fail("corrupted", "fixture must intentionally fail JSON parsing");
    } catch {
      // Expected: the fixture proves the corrupted-import path is represented.
    }
  }
}

for (const source of ["mw5-v2", "mw6-v3-raw-save", "mw6-envelope-v1"]) {
  if (!saveHardening.migrationSources?.includes(source)) {
    fail("saveHardening.migrationSources", `missing ${source}`);
  }
}

for (const scenario of [
  "valid-envelope-import",
  "raw-v3-import",
  "legacy-v2-import",
  "corrupted-json-blocked",
  "checkpoint-recovery",
]) {
  if (!saveHardening.recoveryScenarios?.includes(scenario)) {
    fail("saveHardening.recoveryScenarios", `missing ${scenario}`);
  }
}

if (!saveEnvelopeSource.includes("normalizeArpgSaveImport")) {
  fail("lib/arpgSaveEnvelope.ts", "normalizeArpgSaveImport must stay available");
}
if (!saveEnvelopeSource.includes("createArpgSaveEnvelope")) {
  fail("lib/arpgSaveEnvelope.ts", "createArpgSaveEnvelope must stay available");
}
if (!saveEnvelopeSource.includes("createArpgSaveSlotSet")) {
  fail("lib/arpgSaveEnvelope.ts", "createArpgSaveSlotSet must represent autosave/manual/checkpoint together");
}
if (!saveEnvelopeSource.includes("getArpgSaveSlotSummary")) {
  fail("lib/arpgSaveEnvelope.ts", "getArpgSaveSlotSummary must support compact runtime slot UI");
}
for (const signal of ["normalizeArpgSaveSlots", "syncArpgAutosaveSlot", "upsertArpgSaveSlot"]) {
  if (!saveEnvelopeSource.includes(signal)) fail("lib/arpgSaveEnvelope.ts", `missing ${signal}`);
}
for (const signal of [
  "arpgSaveSlots",
  "arpgActiveSaveSlotId",
  "saveArpgManualSlot",
  "saveArpgCheckpointSlot",
  "loadArpgSaveSlot",
  "confirmResetArpgSave",
]) {
  if (!storeSource.includes(signal)) fail("store/useStore.ts", `missing persisted save action ${signal}`);
}
for (const signal of [
  "arpg-save-continue",
  "arpg-save-manual",
  "arpg-save-checkpoint",
  "arpg-load-slot-manual",
  "arpg-reset-confirm-message",
]) {
  if (!hqSource.includes(signal)) fail("components/home/arpg/ArpgHud.tsx", `missing save UI signal ${signal}`);
}

if (errors.length > 0) {
  console.error("ARPG save readiness validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(
  `ARPG save readiness OK (${slotKinds.size} slot kinds, ${Object.keys(fixturePaths).length} fixtures, ${saveHardening.recoveryScenarios.length} recovery scenarios).`,
);
