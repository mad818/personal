import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const presentationPath = path.join(repoRoot, "lib", "arpgFirstTownPresentationContent.json");
const manifestPath = path.join(repoRoot, "lib", "arpgAssetManifestData.json");
const packagePath = path.join(repoRoot, "package.json");

const presentation = JSON.parse(fs.readFileSync(presentationPath, "utf8"));
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const packageJson = JSON.parse(fs.readFileSync(packagePath, "utf8"));
const errors = [];

function fail(owner, message) {
  errors.push(`${owner}: ${message}`);
}

function requireString(owner, field, value) {
  if (typeof value !== "string" || !value.trim()) {
    fail(owner, `missing ${field}`);
  }
}

function requireStringArray(owner, field, value, min = 1) {
  if (
    !Array.isArray(value) ||
    value.length < min ||
    value.some((item) => typeof item !== "string" || !item.trim())
  ) {
    fail(owner, `${field} must contain at least ${min} non-empty string value${min === 1 ? "" : "s"}`);
  }
}

const manifestAssets = Array.isArray(manifest) ? manifest : manifest.assets ?? [];
const manifestById = new Map(manifestAssets.map((asset) => [asset.id, asset]));
const allowedSurfaces = new Set(["adventure", "inventory", "map", "armory", "journal", "production"]);
const requiredDistricts = new Set([
  "bellroot-vestibule",
  "wardens-antechamber",
  "veyrhold",
  "veyrhold-oathmarket",
  "veyrhold-wardens-steps",
  "veyrhold-bellroot-commons",
]);
const rejectedAssetIds = new Set([
  "prologue-location-cards",
  "prologue-companion-portraits",
  "prologue-story-prop-icons",
]);

if (presentation.schemaVersion !== "mw6-first-town-presentation-v1") {
  fail("schemaVersion", "expected mw6-first-town-presentation-v1");
}

requireString("presentation", "title", presentation.title);
requireString("presentation", "summary", presentation.summary);
requireStringArray("presentation", "operatorRules", presentation.operatorRules, 5);

const cues = Array.isArray(presentation.cues) ? presentation.cues : [];
if (cues.length < 6) fail("cues", "expected at least six first-town presentation cues");

const cueIds = new Set();
for (const cue of cues) {
  const owner = cue?.id ?? "cue";
  if (cueIds.has(cue?.id)) fail(owner, "duplicate cue id");
  cueIds.add(cue?.id);

  for (const field of [
    "id",
    "label",
    "zone",
    "cityId",
    "districtId",
    "ambientCopy",
    "vfxIntent",
    "audioIntent",
    "reducedMotionAlternative",
    "uiProof",
  ]) {
    requireString(owner, field, cue?.[field]);
  }

  if (!["bellroot", "veyrhold"].includes(cue?.zone)) {
    fail(owner, "zone must be bellroot or veyrhold");
  }

  if (!Number.isInteger(cue?.locationFrame) || cue.locationFrame < 0) {
    fail(owner, "locationFrame must be a non-negative integer");
  }

  if (!Number.isInteger(cue?.vfxFrame) || cue.vfxFrame < 0 || cue.vfxFrame > 11) {
    fail(owner, "vfxFrame must be an integer between 0 and 11");
  }

  requireStringArray(owner, "surfaceTargets", cue?.surfaceTargets, 1);
  for (const target of cue?.surfaceTargets ?? []) {
    if (!allowedSurfaces.has(target)) fail(owner, `unknown surface target ${target}`);
  }

  requireStringArray(owner, "runtimeAssetIds", cue?.runtimeAssetIds, 2);
  for (const assetId of cue?.runtimeAssetIds ?? []) {
    if (rejectedAssetIds.has(assetId)) fail(owner, `must not use rejected prologue asset ${assetId}`);
    const asset = manifestById.get(assetId);
    if (!asset) {
      fail(owner, `unknown runtime asset ${assetId}`);
      continue;
    }
    if (!asset.localPath?.startsWith("public/arpg/")) {
      fail(owner, `${assetId} must point at a public ARPG runtime asset`);
    }
    if (asset.tags?.includes("style-rejected") || asset.tags?.includes("reference-only")) {
      fail(owner, `${assetId} is rejected/reference-only and cannot be a presentation cue asset`);
    }
  }
}

for (const districtId of requiredDistricts) {
  if (!cues.some((cue) => cue.districtId === districtId)) {
    fail("cues", `missing district cue ${districtId}`);
  }
}

if (!packageJson.scripts?.["arpg:presentation:check"]) {
  fail("package.scripts", "missing arpg:presentation:check");
}

if (errors.length) {
  console.error("ARPG presentation cue validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`ARPG first-town presentation cues OK (${cues.length} cues).`);
