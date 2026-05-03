import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const replacementPath = path.join(repoRoot, "lib", "arpgVisualReplacementContent.json");
const manifestPath = path.join(repoRoot, "lib", "arpgAssetManifestData.json");
const benchPath = path.join(repoRoot, "lib", "arpgIllustratedAssetBenchContent.json");
const briefsPath = path.join(repoRoot, "lib", "arpgVisualAssetBriefs.json");
const directionPath = path.join(repoRoot, "lib", "arpgVisualDirectionContent.json");

const replacement = JSON.parse(fs.readFileSync(replacementPath, "utf8"));
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const bench = JSON.parse(fs.readFileSync(benchPath, "utf8"));
const briefs = JSON.parse(fs.readFileSync(briefsPath, "utf8"));
const direction = JSON.parse(fs.readFileSync(directionPath, "utf8"));
const errors = [];

function fail(owner, message) {
  errors.push(`${owner}: ${message}`);
}

function requireString(owner, field, value) {
  if (typeof value !== "string" || !value.trim()) {
    fail(owner, `${field} must be a non-empty string`);
  }
}

function requireStringArray(owner, field, value, minLength = 1) {
  if (!Array.isArray(value) || value.length < minLength) {
    fail(owner, `${field} must contain at least ${minLength} item(s)`);
    return;
  }
  value.forEach((item, index) => {
    if (typeof item !== "string" || !item.trim()) {
      fail(owner, `${field}[${index}] must be a non-empty string`);
    }
  });
}

if (replacement.schemaVersion !== "mw6-arpg-visual-replacements-v1") {
  fail("schemaVersion", "expected mw6-arpg-visual-replacements-v1");
}

for (const field of ["title", "summary", "replacementBatchId"]) {
  requireString("replacement", field, replacement[field]);
}

const manifestById = new Map(Array.isArray(manifest) ? manifest.map((asset) => [asset.id, asset]) : []);
const benchById = new Map(Array.isArray(bench.batches) ? bench.batches.map((batch) => [batch.id, batch]) : []);
const briefById = new Map(Array.isArray(briefs.briefs) ? briefs.briefs.map((brief) => [brief.id, brief]) : []);
const replacementBrief = briefById.get(replacement.replacementBatchId);
const rejectedDirectionIds = new Set(
  Array.isArray(direction.rejectedBatchIds) ? direction.rejectedBatchIds : [],
);
const allowedKinds = new Set(["location-card", "character-portrait", "gear-icon"]);

if (!replacementBrief) {
  fail("replacementBatchId", `missing visual brief ${replacement.replacementBatchId}`);
} else if (replacementBrief.status !== "ready-for-generation") {
  fail("replacementBatchId", "replacement brief should remain ready-for-generation until approved runtime art exists");
}

for (const field of ["targetStyleAssetIds", "retiredAssetIds", "approvedFallbackAssetIds", "policies"]) {
  requireStringArray("replacement", field, replacement[field], field === "policies" ? 4 : 1);
}

for (const assetId of replacement.targetStyleAssetIds ?? []) {
  const asset = manifestById.get(assetId);
  if (!asset) {
    fail(assetId, "missing target style manifest asset");
    continue;
  }
  if (asset.tags?.includes("style-rejected") || asset.tags?.includes("reference-only")) {
    fail(assetId, "target style assets must not be rejected/reference-only");
  }
  if (!asset.tags?.includes("hero-kit") && assetId !== "enemy-boss-hifi-cards") {
    fail(assetId, "target style assets must be Hero Kit or approved high-fidelity enemy/boss cards");
  }
}

for (const assetId of replacement.retiredAssetIds ?? []) {
  const asset = manifestById.get(assetId);
  const batch = benchById.get(assetId);
  if (!asset) fail(assetId, "missing retired manifest asset");
  if (!batch) fail(assetId, "missing retired illustrated bench batch");
  if (!rejectedDirectionIds.has(assetId)) {
    fail(assetId, "retired asset must be listed in visual direction rejectedBatchIds");
  }
  if (asset && (!asset.tags?.includes("style-rejected") || !asset.tags?.includes("reference-only"))) {
    fail(assetId, "retired asset manifest must be style-rejected and reference-only");
  }
  if (batch && batch.status !== "rejected") {
    fail(assetId, "retired bench batch must be rejected");
  }
}

for (const assetId of replacement.approvedFallbackAssetIds ?? []) {
  const asset = manifestById.get(assetId);
  if (!asset) {
    fail(assetId, "missing fallback manifest asset");
    continue;
  }
  if (asset.tags?.includes("style-rejected") || asset.tags?.includes("reference-only")) {
    fail(assetId, "fallback assets must not be rejected/reference-only");
  }
}

const replacementBriefItems = new Map(
  Array.isArray(replacementBrief?.items)
    ? replacementBrief.items.map((item) => [item.id, item])
    : [],
);
const targetIds = new Set();
const fallbackAllowList = new Set(replacement.approvedFallbackAssetIds ?? []);
const retiredAllowList = new Set(replacement.retiredAssetIds ?? []);

if (!Array.isArray(replacement.targets) || replacement.targets.length < 10) {
  fail("targets", "expected at least ten visual replacement targets");
} else {
  for (const target of replacement.targets) {
    const owner = target?.id ?? "target";
    for (const field of ["id", "label", "kind", "briefItemId", "acceptance"]) {
      requireString(owner, field, target?.[field]);
    }
    if (targetIds.has(target.id)) fail(owner, "duplicate target id");
    targetIds.add(target.id);
    if (!allowedKinds.has(target.kind)) fail(owner, `unsupported kind ${target.kind}`);
    if (!Number.isInteger(target.priority) || target.priority <= 0) {
      fail(owner, "priority must be a positive integer");
    }
    requireStringArray(owner, "replacesAssetIds", target.replacesAssetIds);
    requireStringArray(owner, "fallbackAssetIds", target.fallbackAssetIds);
    requireStringArray(owner, "surfaceTargets", target.surfaceTargets, 2);

    const briefItem = replacementBriefItems.get(target.briefItemId);
    if (!briefItem) {
      fail(owner, `brief item ${target.briefItemId} missing from ${replacement.replacementBatchId}`);
    } else if (briefItem.kind !== target.kind) {
      fail(owner, `kind ${target.kind} does not match brief item kind ${briefItem.kind}`);
    }

    for (const assetId of target.replacesAssetIds ?? []) {
      if (!retiredAllowList.has(assetId)) {
        fail(owner, `replacesAssetIds contains unretired asset ${assetId}`);
      }
    }
    for (const assetId of target.fallbackAssetIds ?? []) {
      if (!fallbackAllowList.has(assetId)) {
        fail(owner, `fallbackAssetIds contains unapproved fallback ${assetId}`);
      }
    }
  }
}

if (errors.length > 0) {
  console.error("ARPG visual replacement validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(
  `ARPG visual replacements OK (${replacement.targets.length} targets, ${replacement.retiredAssetIds.length} retired assets, ${replacement.approvedFallbackAssetIds.length} approved fallbacks).`,
);
