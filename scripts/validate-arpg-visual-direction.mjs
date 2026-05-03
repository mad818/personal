import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const visualPath = path.join(repoRoot, "lib", "arpgVisualDirectionContent.json");
const manifestPath = path.join(repoRoot, "lib", "arpgAssetManifestData.json");
const benchPath = path.join(repoRoot, "lib", "arpgIllustratedAssetBenchContent.json");

const visual = JSON.parse(fs.readFileSync(visualPath, "utf8"));
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const bench = JSON.parse(fs.readFileSync(benchPath, "utf8"));
const errors = [];

function fail(owner, message) {
  errors.push(`${owner}: ${message}`);
}

function requireString(owner, field, value) {
  if (typeof value !== "string" || !value.trim()) {
    fail(owner, `${field} must be a non-empty string`);
  }
}

if (visual.schemaVersion !== "mw6-visual-direction-v1") {
  fail("visual.schemaVersion", "expected mw6-visual-direction-v1");
}

for (const field of ["title", "summary", "primaryRenderer"]) {
  requireString("visual", field, visual[field]);
}

const manifestById = new Map(Array.isArray(manifest) ? manifest.map((asset) => [asset.id, asset]) : []);
const benchById = new Map(Array.isArray(bench.batches) ? bench.batches.map((batch) => [batch.id, batch]) : []);

const target = visual.approvedStyleTarget;
if (!target || typeof target !== "object") {
  fail("approvedStyleTarget", "must exist");
} else {
  requireString("approvedStyleTarget", "label", target.label);
  requireString("approvedStyleTarget", "description", target.description);
  if (!Array.isArray(target.assetIds) || target.assetIds.length < 4) {
    fail("approvedStyleTarget.assetIds", "expected at least four approved Hero Kit asset ids");
  } else {
    for (const assetId of target.assetIds) {
      const asset = manifestById.get(assetId);
      if (!asset) {
        fail("approvedStyleTarget.assetIds", `missing manifest asset ${assetId}`);
        continue;
      }
      if (!asset.tags?.includes("hero-kit")) {
        fail(assetId, "approved style target assets must include hero-kit tag");
      }
      if (asset.tags?.includes("style-rejected") || asset.tags?.includes("reference-only")) {
        fail(assetId, "approved style target assets must not be rejected/reference-only");
      }
      if (asset.generation?.operatorApproved !== true) {
        fail(assetId, "approved style target asset requires operator-approved generation metadata");
      }
    }
  }
  if (!Array.isArray(target.requiredTraits) || target.requiredTraits.length < 5) {
    fail("approvedStyleTarget.requiredTraits", "expected at least five style traits");
  }
}

if (!Array.isArray(visual.rejectedStyleSignals) || visual.rejectedStyleSignals.length < 5) {
  fail("rejectedStyleSignals", "expected at least five rejected style signals");
}

if (!Array.isArray(visual.rejectedBatchIds) || visual.rejectedBatchIds.length < 1) {
  fail("rejectedBatchIds", "expected at least one rejected batch id");
} else {
  for (const batchId of visual.rejectedBatchIds) {
    const batch = benchById.get(batchId);
    const asset = manifestById.get(batchId);
    if (!batch) fail(batchId, "missing illustrated bench batch");
    if (!asset) fail(batchId, "missing manifest asset");
    if (batch && batch.status !== "rejected") {
      fail(batchId, "rejected visual batches must be marked status rejected");
    }
    if (asset && !asset.tags?.includes("style-rejected")) {
      fail(batchId, "rejected visual manifest assets must include style-rejected tag");
    }
  }
}

if (!Array.isArray(visual.nextProductionBatches) || visual.nextProductionBatches.length < 4) {
  fail("nextProductionBatches", "expected at least four next production batches");
} else {
  const ids = new Set();
  for (const batch of visual.nextProductionBatches) {
    const owner = batch?.id ?? "nextProductionBatch";
    for (const field of ["id", "label", "acceptance"]) requireString(owner, field, batch?.[field]);
    if (ids.has(batch.id)) fail(owner, "duplicate next production batch id");
    ids.add(batch.id);
    if (!Number.isInteger(batch.count) || batch.count <= 0) {
      fail(owner, "count must be a positive integer");
    }
    if (!Array.isArray(batch.assetKinds) || batch.assetKinds.length === 0) {
      fail(owner, "assetKinds must be non-empty");
    }
    if (!Array.isArray(batch.targets) || batch.targets.length === 0) {
      fail(owner, "targets must be non-empty");
    }
  }
}

if (!Array.isArray(visual.promptStyleRules) || visual.promptStyleRules.length < 5) {
  fail("promptStyleRules", "expected at least five prompt style rules");
}

if (errors.length > 0) {
  console.error("ARPG visual direction validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(
  `ARPG visual direction OK (${target.assetIds.length} approved style assets, ${visual.nextProductionBatches.length} next batches).`,
);
