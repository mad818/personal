import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifestPath = path.join(repoRoot, "lib", "arpgAssetManifestData.json");
const illustratedBenchPath = path.join(repoRoot, "lib", "arpgIllustratedAssetBenchContent.json");
const candidateSourcesPath = path.join(repoRoot, "lib", "arpgAssetCandidateSources.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const illustratedBench = JSON.parse(fs.readFileSync(illustratedBenchPath, "utf8"));
const candidateSources = JSON.parse(fs.readFileSync(candidateSourcesPath, "utf8"));
const candidateSourceIds = new Set(
  Array.isArray(candidateSources) ? candidateSources.map((candidate) => candidate.id) : [],
);
const sharp = await import("sharp")
  .then((module) => module.default ?? module)
  .catch(() => null);

const allowedLicenses = new Set(["project-original", "CC0-1.0", "CC-BY-4.0", "commercial-license"]);
const allowedExternalLicenses = new Set(["CC0-1.0", "CC-BY-4.0", "commercial-license"]);
const allowedAssetKinds = new Set([
  "audio",
  "character-portrait",
  "concept-preview",
  "enemy-card",
  "fx-sheet",
  "gear-icon",
  "glb-model",
  "gltf-model",
  "hdri",
  "location-card",
  "outfit-card",
  "procedural-model",
  "skill-icon",
  "sprite-sheet",
  "texture",
  "tilemap",
  "tileset",
  "ui-icon",
  "ui-preview",
  "vfx-reference",
]);
const frameBoundKinds = new Set([
  "character-portrait",
  "enemy-card",
  "gear-icon",
  "outfit-card",
  "location-card",
  "skill-icon",
  "sprite-sheet",
  "tilemap",
  "tileset",
  "ui-icon",
  "fx-sheet",
  "vfx-reference",
]);
const gltfKinds = new Set(["glb-model", "gltf-model"]);
const rasterImageKinds = new Set(["concept-preview", "ui-preview"]);
const allowedAnchors = new Set(["bottom-center", "center", "tile-origin", "not-applicable"]);
const allowedGenerationToolIds = new Set(["gpt-image-2", "seedance-2.0", "other-operator-approved"]);
const allowedGeneratedUses = new Set([
  "character-portrait",
  "enemy-card",
  "gear-icon",
  "location-card",
  "outfit-card",
  "sprite-seed",
  "sprite-sheet",
  "skill-icon",
  "item-icon",
  "tileset-reference",
  "fx-reference",
  "animation-reference",
  "motion-study",
]);
const allowedGeneratedRightsPostures = new Set([
  "operator-verified-commercial-use",
  "internal-prototype-only",
]);
const allowedGeneratedCostPostures = new Set([
  "free-tier-or-existing-access",
  "optional-paid-operator-choice",
  "forced-paid-dependency",
]);
const errors = [];

function fail(id, message) {
  errors.push(`${id || "unknown"}: ${message}`);
}

function repoPathFromUrl(value) {
  if (typeof value !== "string" || !value.startsWith("repo://")) return null;
  return value.slice("repo://".length).replace(/^\/+/, "");
}

function requireRepoRelativeRecord(id, label, value, { mustExist = true } = {}) {
  if (typeof value !== "string" || !value.trim()) {
    fail(id, `generation.${label} is required`);
    return;
  }
  if (/^https?:\/\//i.test(value) || value.startsWith("repo://")) {
    fail(id, `generation.${label} must be a repo-relative record path`);
    return;
  }
  if (path.isAbsolute(value)) {
    fail(id, `generation.${label} must not be absolute`);
    return;
  }
  if (value.split(/[\\/]/).includes("..")) {
    fail(id, `generation.${label} must not traverse outside the repo`);
    return;
  }
  if (mustExist && !fs.existsSync(path.join(repoRoot, value))) {
    fail(id, `generation.${label} does not exist: ${value}`);
  }
}

function validateGltfModel(asset, id) {
  if (typeof asset.localPath !== "string" || !asset.localPath.trim()) {
    fail(id, "model assets require localPath");
    return;
  }

  if (!/\.(gltf|glb)$/i.test(asset.localPath)) {
    fail(id, "model assets must use .gltf or .glb files");
    return;
  }

  const localPath = path.join(repoRoot, asset.localPath);
  if (!fs.existsSync(localPath)) {
    fail(id, `model localPath does not exist: ${asset.localPath}`);
    return;
  }

  let gltf;
  try {
    if (/\.glb$/i.test(asset.localPath)) {
      const buffer = fs.readFileSync(localPath);
      const magic = buffer.subarray(0, 4).toString("utf8");
      if (magic !== "glTF") {
        fail(id, "glb file is missing the glTF binary magic header");
        return;
      }
      if (buffer.readUInt32LE(4) !== 2) {
        fail(id, "glb file must use glTF version 2");
        return;
      }
      const jsonChunkLength = buffer.readUInt32LE(12);
      const jsonChunkType = buffer.subarray(16, 20).toString("utf8");
      if (jsonChunkType !== "JSON") {
        fail(id, "glb file must start with a JSON chunk");
        return;
      }
      const jsonChunk = buffer
        .subarray(20, 20 + jsonChunkLength)
        .toString("utf8")
        .replace(/\0+$/g, "")
        .trim();
      gltf = JSON.parse(jsonChunk);
    } else {
      gltf = JSON.parse(fs.readFileSync(localPath, "utf8"));
    }
  } catch (error) {
    fail(id, `model JSON could not be parsed: ${error instanceof Error ? error.message : String(error)}`);
    return;
  }

  if (!gltf.asset || gltf.asset.version !== "2.0") {
    fail(id, "model must declare asset.version 2.0");
  }

  for (const field of ["scenes", "nodes", "meshes", "materials"]) {
    if (!Array.isArray(gltf[field]) || gltf[field].length === 0) {
      fail(id, `model must include non-empty ${field}`);
    }
  }

  if (!Number.isInteger(gltf.scene)) {
    fail(id, "model must declare a default scene index");
  }
}

async function validateRasterImage(asset, id) {
  if (typeof asset.localPath !== "string" || !asset.localPath.trim()) {
    fail(id, "preview image assets require localPath");
    return;
  }

  if (!/\.(png|webp|jpg|jpeg)$/i.test(asset.localPath)) {
    fail(id, "preview image assets must use png, webp, jpg, or jpeg files");
    return;
  }

  const localPath = path.join(repoRoot, asset.localPath);
  if (!fs.existsSync(localPath)) {
    fail(id, `preview image localPath does not exist: ${asset.localPath}`);
    return;
  }

  if (!sharp) {
    fail(id, "preview image metadata validation requires sharp");
    return;
  }

  const metadata = await sharp(localPath).metadata();
  if (!Number.isInteger(metadata.width) || !Number.isInteger(metadata.height)) {
    fail(id, "preview image metadata must include width and height");
  } else if (metadata.width < 512 || metadata.height < 512) {
    fail(id, `preview image is too small: ${metadata.width}x${metadata.height}`);
  }
}

if (!Array.isArray(manifest)) {
  fail("manifest", "asset manifest must be an array");
} else {
  const ids = new Set();
  for (const asset of manifest) {
    const id = typeof asset.id === "string" ? asset.id : "";
    if (!id) fail(id, "missing id");
    if (ids.has(id)) fail(id, "duplicate id");
    ids.add(id);

    for (const field of [
      "label",
      "kind",
      "role",
      "localPath",
      "sourceUrl",
      "licenseProofUrl",
      "author",
      "license",
      "attribution",
    ]) {
      if (typeof asset[field] !== "string" || !asset[field].trim()) {
        fail(id, `missing ${field}`);
      }
    }

    if (!allowedLicenses.has(asset.license)) {
      fail(id, `unsupported license ${asset.license}`);
    }

    if (!allowedAssetKinds.has(asset.kind)) {
      fail(id, `unsupported asset kind ${asset.kind}`);
    }

    if (!Array.isArray(asset.tags) || asset.tags.length === 0) {
      fail(id, "tags must be a non-empty array");
    }

    if (typeof asset.optimized !== "boolean") {
      fail(id, "optimized must be boolean");
    }

    if (typeof asset.visibleCreditRequired !== "boolean") {
      fail(id, "visibleCreditRequired must be boolean");
    }

    if (typeof asset.localPath === "string" && path.isAbsolute(asset.localPath)) {
      fail(id, "localPath must be repo-relative, not absolute");
    }

    if (typeof asset.localPath === "string" && asset.localPath.startsWith("public/arpg/imported/")) {
      if (!asset.tags?.includes("imported-real-asset")) {
        fail(id, "imported runtime assets must include the imported-real-asset tag");
      }
      if (!allowedExternalLicenses.has(asset.license)) {
        fail(id, "imported runtime assets must use CC0-1.0, CC-BY-4.0, or commercial-license");
      }
      if (!/^https:\/\/.+/i.test(asset.sourceUrl || "")) {
        fail(id, "imported runtime assets require an official https sourceUrl");
      }
      if (typeof asset.importCandidateId !== "string" || !asset.importCandidateId.trim()) {
        fail(id, "imported runtime assets require importCandidateId");
      } else if (!candidateSourceIds.has(asset.importCandidateId)) {
        fail(id, `importCandidateId does not match a known candidate source: ${asset.importCandidateId}`);
      }
      if (asset.optimized !== true) {
        fail(id, "imported runtime assets must be optimized before manifest intake");
      }
    }

    if (typeof asset.licenseProofUrl === "string" && path.isAbsolute(asset.licenseProofUrl)) {
      fail(id, "licenseProofUrl must be repo-relative or a URL, not absolute");
    }

    if (asset.license === "CC-BY-4.0" && !asset.visibleCreditRequired) {
      fail(id, "CC-BY assets must be visible in credits");
    }

    if (asset.license === "CC-BY-4.0" && !/https?:\/\//.test(asset.sourceUrl)) {
      fail(id, "CC-BY assets require an external source URL");
    }

    if (asset.license === "CC-BY-4.0" && asset.attribution.length < 12) {
      fail(id, "CC-BY assets require attribution text");
    }

    if (asset.license === "commercial-license") {
      if (!asset.tags.includes("commercial-license-approved")) {
        fail(id, "commercial assets must include the commercial-license-approved tag");
      }
      const proofPath = repoPathFromUrl(asset.licenseProofUrl);
      if (!proofPath || !proofPath.startsWith("assets/arpg/intake/approved/")) {
        fail(id, "commercial assets require a repo://assets/arpg/intake/approved/ proof record");
      } else if (!fs.existsSync(path.join(repoRoot, proofPath))) {
        fail(id, `commercial license proof record does not exist: ${asset.licenseProofUrl}`);
      }
      if (!/^https:\/\/.+/i.test(asset.sourceUrl || "")) {
        fail(id, "commercial assets require an official https sourceUrl");
      }
      if (/preview|sample|trial|editorial|personal use only/i.test(JSON.stringify(asset))) {
        fail(id, "commercial assets must not be marketplace previews, samples, trial-only, editorial, or personal-use-only");
      }
    }

    const sourceRepoPath = repoPathFromUrl(asset.sourceUrl);
    if (sourceRepoPath) {
      if (asset.license !== "project-original") {
        fail(id, "repo-authored assets should use project-original");
      }
      const sourcePath = path.join(repoRoot, sourceRepoPath);
      if (!fs.existsSync(sourcePath)) {
        fail(id, `sourceUrl does not exist: ${asset.sourceUrl}`);
      }
      const localPath = path.join(repoRoot, asset.localPath || "");
      if (!fs.existsSync(localPath)) {
        fail(id, `localPath does not exist: ${asset.localPath}`);
      }
    } else if (!allowedExternalLicenses.has(asset.license)) {
      fail(id, "external assets must be CC0-1.0, CC-BY-4.0, or commercial-license");
    }

    if (/cc-by-nc|cc-by-nd|cc-by-sa|unknown|editorial|marketplace/i.test(asset.license)) {
      fail(id, "restricted or unknown license is not allowed");
    }

    if (frameBoundKinds.has(asset.kind)) {
      for (const field of ["frameWidth", "frameHeight", "frameCount"]) {
        if (!Number.isInteger(asset[field]) || asset[field] <= 0) {
          fail(id, `${asset.kind} assets require positive integer ${field}`);
        }
      }

      if (!allowedAnchors.has(asset.anchor)) {
        fail(id, `${asset.kind} assets require a valid anchor`);
      }

      const localPath = path.join(repoRoot, asset.localPath || "");
      if (typeof asset.localPath === "string" && /\.(png|webp|jpg|jpeg)$/i.test(asset.localPath)) {
        if (!sharp) {
          fail(id, "image metadata validation requires sharp");
        } else if (fs.existsSync(localPath)) {
          const metadata = await sharp(localPath).metadata();
          if (!Number.isInteger(metadata.width) || !Number.isInteger(metadata.height)) {
            fail(id, "image metadata must include width and height");
          } else {
            if (metadata.width % asset.frameWidth !== 0) {
              fail(id, `image width ${metadata.width} is not divisible by frameWidth ${asset.frameWidth}`);
            }
            if (metadata.height % asset.frameHeight !== 0) {
              fail(id, `image height ${metadata.height} is not divisible by frameHeight ${asset.frameHeight}`);
            }
            const frameCapacity = Math.floor(metadata.width / asset.frameWidth) * Math.floor(metadata.height / asset.frameHeight);
            if (frameCapacity < asset.frameCount) {
              fail(id, `image grid has ${frameCapacity} frames but manifest requires ${asset.frameCount}`);
            }
          }
        }
      }
    }

    if (gltfKinds.has(asset.kind)) {
      validateGltfModel(asset, id);
    }

    if (rasterImageKinds.has(asset.kind)) {
      await validateRasterImage(asset, id);
    }

    if (asset.generation !== undefined) {
      const generation = asset.generation;
      if (!generation || typeof generation !== "object" || Array.isArray(generation)) {
        fail(id, "generation metadata must be an object");
        continue;
      }

      for (const field of ["toolName", "modelName", "transformation", "termsReviewedAt"]) {
        if (typeof generation[field] !== "string" || !generation[field].trim()) {
          fail(id, `generation.${field} is required`);
        }
      }

      if (!allowedGenerationToolIds.has(generation.toolId)) {
        fail(id, `unsupported generation.toolId ${generation.toolId}`);
      }

      if (!allowedGeneratedUses.has(generation.use)) {
        fail(id, `unsupported generation.use ${generation.use}`);
      }

      if (!allowedGeneratedRightsPostures.has(generation.rightsPosture)) {
        fail(id, `unsupported generation.rightsPosture ${generation.rightsPosture}`);
      }

      if (!allowedGeneratedCostPostures.has(generation.costPosture)) {
        fail(id, `unsupported generation.costPosture ${generation.costPosture}`);
      }

      if (generation.costPosture === "forced-paid-dependency") {
        fail(id, "generated assets must not create a forced paid dependency");
      }

      if (generation.rightsPosture !== "operator-verified-commercial-use") {
        fail(id, "runtime assets require operator-verified commercial-use posture");
      }

      if (generation.operatorApproved !== true) {
        fail(id, "generated assets require explicit operator approval");
      }

      if (!/^\d{4}-\d{2}-\d{2}$/.test(generation.termsReviewedAt || "")) {
        fail(id, "generation.termsReviewedAt must be YYYY-MM-DD");
      }

      if (asset.license !== "project-original") {
        fail(id, "generator-assisted committed assets must use project-original after rights review");
      }

      if (!asset.tags.includes("generator-assisted")) {
        fail(id, "generator-assisted assets must include the generator-assisted tag");
      }

      requireRepoRelativeRecord(id, "promptRecordPath", generation.promptRecordPath);
      if (generation.sourceFramePath !== undefined) {
        requireRepoRelativeRecord(id, "sourceFramePath", generation.sourceFramePath);
      }
      if (generation.outputReviewPath !== undefined) {
        requireRepoRelativeRecord(id, "outputReviewPath", generation.outputReviewPath);
      }
    }
  }
}

if (illustratedBench?.schemaVersion !== "mw6-illustrated-asset-bench-v1") {
  fail("illustratedBench.schemaVersion", "expected mw6-illustrated-asset-bench-v1");
} else {
  const batches = illustratedBench.batches ?? [];
  if (!Array.isArray(batches) || batches.length < 5) {
    fail("illustratedBench.batches", "expected at least five illustrated asset bench batches");
  } else {
    const manifestById = new Map(manifest.map((asset) => [asset.id, asset]));
    const kindCounts = new Map();
    for (const batch of batches) {
      const owner = batch?.id ?? "illustratedBatch";
      for (const field of [
        "id",
        "label",
        "manifestAssetId",
        "kind",
        "role",
        "sourceMode",
        "sourcePath",
        "runtimePath",
      ]) {
        if (typeof batch?.[field] !== "string" || !batch[field].trim()) {
          fail(owner, `missing ${field}`);
        }
      }
      if (!["project-original-seed", "operator-approved-generated", "approved-external-2d-pack"].includes(batch?.sourceMode)) {
        fail(owner, `unsupported sourceMode ${batch?.sourceMode}`);
      }
      const batchStatus = batch?.status ?? "approved";
      if (!["approved", "reference-only", "rejected"].includes(batchStatus)) {
        fail(owner, `unsupported status ${batchStatus}`);
      }
      if (batchStatus === "rejected" && (typeof batch?.rejectionReason !== "string" || batch.rejectionReason.trim().length < 12)) {
        fail(owner, "rejected batches require a rejectionReason");
      }
      for (const field of ["frameWidth", "frameHeight", "frameCount"]) {
        if (!Number.isInteger(batch?.[field]) || batch[field] <= 0) {
          fail(owner, `${field} must be a positive integer`);
        }
      }
      if (!Array.isArray(batch?.requiredTags) || batch.requiredTags.length < 3) {
        fail(owner, "requiredTags must include at least three tags");
      }
      if (!Array.isArray(batch?.previewLabels) || batch.previewLabels.length !== batch.frameCount) {
        fail(owner, "previewLabels must match frameCount");
      }
      for (const relativePath of [batch?.sourcePath, batch?.runtimePath]) {
        if (typeof relativePath !== "string" || path.isAbsolute(relativePath) || relativePath.split(/[\\/]/).includes("..")) {
          fail(owner, `path must be repo-relative and safe: ${relativePath}`);
        } else if (!fs.existsSync(path.join(repoRoot, relativePath))) {
          fail(owner, `path does not exist: ${relativePath}`);
        }
      }
      const manifestAsset = manifestById.get(batch?.manifestAssetId);
      if (!manifestAsset) {
        fail(owner, `manifestAssetId not found: ${batch?.manifestAssetId}`);
      } else {
        if (manifestAsset.kind !== batch.kind) fail(owner, "manifest kind must match bench kind");
        if (manifestAsset.localPath !== batch.runtimePath) fail(owner, "manifest localPath must match bench runtimePath");
        if (manifestAsset.frameWidth !== batch.frameWidth) fail(owner, "manifest frameWidth must match bench");
        if (manifestAsset.frameHeight !== batch.frameHeight) fail(owner, "manifest frameHeight must match bench");
        if (manifestAsset.frameCount !== batch.frameCount) fail(owner, "manifest frameCount must match bench");
        for (const tag of batch.requiredTags ?? []) {
          if (!manifestAsset.tags?.includes(tag)) fail(owner, `manifest is missing required tag ${tag}`);
        }
        if (!manifestAsset.generation) {
          fail(owner, "illustrated bench manifest asset requires generation/provenance metadata");
        } else if (manifestAsset.generation.promptRecordPath !== (batch.promptRecordPath ?? illustratedBench.promptRecordPath)) {
          fail(owner, "generation promptRecordPath must match illustrated bench promptRecordPath");
        }
      }
      if (batchStatus === "approved") {
        kindCounts.set(batch.kind, (kindCounts.get(batch.kind) ?? 0) + batch.frameCount);
      }
    }

    const requiredKindCounts = {
      "character-portrait": 3,
      "enemy-card": 4,
      "gear-icon": 8,
      "location-card": 3,
      "outfit-card": 3,
      "skill-icon": 6,
    };
    for (const [kind, count] of Object.entries(requiredKindCounts)) {
      if ((kindCounts.get(kind) ?? 0) < count) {
        fail("illustratedBench.batches", `expected at least ${count} ${kind} frames`);
      }
    }
  }
}

if (errors.length > 0) {
  console.error("ARPG asset manifest validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`ARPG asset manifest OK (${manifest.length} entries).`);
