import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const briefsPath = path.join(repoRoot, "lib", "arpgVisualAssetBriefs.json");
const directionPath = path.join(repoRoot, "lib", "arpgVisualDirectionContent.json");
const manifestPath = path.join(repoRoot, "lib", "arpgAssetManifestData.json");

const briefsContent = JSON.parse(fs.readFileSync(briefsPath, "utf8"));
const visualDirection = JSON.parse(fs.readFileSync(directionPath, "utf8"));
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const errors = [];

function fail(owner, message) {
  errors.push(`${owner}: ${message}`);
}

function requireString(owner, field, value) {
  if (typeof value !== "string" || !value.trim()) {
    fail(owner, `${field} must be a non-empty string`);
  }
}

function requireSafeRepoPath(owner, field, value) {
  requireString(owner, field, value);
  if (typeof value !== "string") return;
  if (path.isAbsolute(value) || value.split(/[\\/]/).includes("..")) {
    fail(owner, `${field} must be a safe repo-relative path`);
  }
}

if (briefsContent.schemaVersion !== "mw6-visual-asset-briefs-v1") {
  fail("schemaVersion", "expected mw6-visual-asset-briefs-v1");
}

for (const field of ["title", "summary", "styleTargetId"]) {
  requireString("briefs", field, briefsContent[field]);
}

const manifestById = new Map(Array.isArray(manifest) ? manifest.map((asset) => [asset.id, asset]) : []);
if (!Array.isArray(briefsContent.styleReferenceAssetIds) || briefsContent.styleReferenceAssetIds.length < 4) {
  fail("styleReferenceAssetIds", "expected at least four style references");
} else {
  for (const assetId of briefsContent.styleReferenceAssetIds) {
    const asset = manifestById.get(assetId);
    if (!asset) {
      fail("styleReferenceAssetIds", `missing manifest asset ${assetId}`);
    } else if (!asset.tags?.includes("hero-kit")) {
      fail(assetId, "style reference assets must be Hero Kit assets");
    }
  }
}

for (const field of ["globalPromptRules", "outputPolicies"]) {
  if (!Array.isArray(briefsContent[field]) || briefsContent[field].length < 4) {
    fail(field, "expected at least four entries");
  }
}

const visualBatchIds = new Set(
  Array.isArray(visualDirection.nextProductionBatches)
    ? visualDirection.nextProductionBatches.map((batch) => batch.id)
    : [],
);
const allowedKinds = new Set(["enemy-card", "location-card", "character-portrait", "gear-icon", "outfit-card"]);
const allowedStatuses = new Set(["ready-for-generation", "draft", "blocked", "approved"]);
const briefIds = new Set();
const itemIds = new Set();
let totalItems = 0;

if (!Array.isArray(briefsContent.briefs) || briefsContent.briefs.length < 4) {
  fail("briefs", "expected at least four visual asset briefs");
} else {
  for (const brief of briefsContent.briefs) {
    const owner = brief?.id ?? "brief";
    for (const field of ["id", "label", "status", "linkedVisualBatchId", "targetRuntimePath", "targetRecordPath"]) {
      requireString(owner, field, brief?.[field]);
    }
    if (briefIds.has(brief.id)) fail(owner, "duplicate brief id");
    briefIds.add(brief.id);
    if (!allowedStatuses.has(brief.status)) fail(owner, `unsupported status ${brief.status}`);
    if (!visualBatchIds.has(brief.linkedVisualBatchId)) {
      fail(owner, `linkedVisualBatchId does not match visual direction: ${brief.linkedVisualBatchId}`);
    }
    if (!Number.isInteger(brief.priority) || brief.priority <= 0) fail(owner, "priority must be positive integer");
    requireSafeRepoPath(owner, "targetRuntimePath", brief.targetRuntimePath);
    requireSafeRepoPath(owner, "targetRecordPath", brief.targetRecordPath);

    const sheet = brief.recommendedSheet;
    if (!sheet || typeof sheet !== "object") {
      fail(owner, "recommendedSheet is required");
    } else {
      for (const field of ["frameWidth", "frameHeight", "frameCount", "columns", "rows"]) {
        if (!Number.isInteger(sheet[field]) || sheet[field] <= 0) {
          fail(owner, `recommendedSheet.${field} must be positive integer`);
        }
      }
      if (Number.isInteger(sheet.columns) && Number.isInteger(sheet.rows) && Number.isInteger(sheet.frameCount)) {
        if (sheet.columns * sheet.rows < sheet.frameCount) {
          fail(owner, "recommendedSheet grid cannot fit frameCount");
        }
      }
    }

    if (!Array.isArray(brief.items) || brief.items.length === 0) {
      fail(owner, "items must be non-empty");
      continue;
    }
    if (sheet?.frameCount !== brief.items.length) {
      fail(owner, "recommendedSheet.frameCount must match items length");
    }
    totalItems += brief.items.length;

    for (const item of brief.items) {
      const itemOwner = `${owner}.${item?.id ?? "item"}`;
      for (const field of ["id", "kind", "name", "prompt", "acceptance"]) {
        requireString(itemOwner, field, item?.[field]);
      }
      if (itemIds.has(item.id)) fail(itemOwner, "duplicate item id");
      itemIds.add(item.id);
      if (!allowedKinds.has(item.kind)) fail(itemOwner, `unsupported kind ${item.kind}`);
      const prompt = String(item.prompt ?? "").toLowerCase();
      for (const required of ["high-fidelity illustrated 2d", "rpg", "no text", "no logo", "no flat vector glyphs"]) {
        if (!prompt.includes(required)) {
          fail(itemOwner, `prompt must include "${required}"`);
        }
      }
      for (const blocked of ["warhammer", "space marine", "titus"]) {
        if (prompt.includes(blocked)) {
          fail(itemOwner, `prompt contains blocked franchise/modern cue: ${blocked}`);
        }
      }
    }
  }
}

if (totalItems < 40) {
  fail("briefs", `expected at least 40 briefed visual assets, found ${totalItems}`);
}

if (errors.length > 0) {
  console.error("ARPG visual asset briefs validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`ARPG visual asset briefs OK (${briefsContent.briefs.length} briefs, ${totalItems} assets).`);
