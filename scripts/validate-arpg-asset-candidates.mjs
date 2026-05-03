import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const candidatesPath = path.join(repoRoot, "lib", "arpgAssetCandidateSources.json");
const toolCandidatesPath = path.join(repoRoot, "lib", "arpgAssetToolCandidateSources.json");
const candidates = JSON.parse(fs.readFileSync(candidatesPath, "utf8"));
const toolCandidates = JSON.parse(fs.readFileSync(toolCandidatesPath, "utf8"));
const errors = [];

const allowedLicenses = new Set([
  "CC0-1.0",
  "CC-BY-4.0",
  "commercial-license",
  "per-asset-review-required",
]);
const allowedPriorities = new Set(["critical", "high", "medium", "guarded"]);
const allowedFormats = new Set([
  "Blend",
  "EXR",
  "FBX",
  "glTF",
  "GLB",
  "HDRI",
  "JPG",
  "OBJ",
  "OGG",
  "PNG",
  "SBSAR",
]);
const allowedToolLicenses = new Set(["MIT"]);
const allowedToolKinds = new Set([
  "codex-skill-pipeline",
  "sprite-normalization-tool",
]);
const allowedToolFormats = new Set([
  "GIF",
  "JSON",
  "PNG",
  "Python",
  "Rust",
  "WASM",
]);
const blockedTerms =
  /\b(?:warhammer|space marine|games workshop|ripped|marketplace preview|editorial|cc-by-nc|cc-by-nd|cc-by-sa|noncommercial|no derivatives|share alike)\b/i;

function fail(id, message) {
  errors.push(`${id || "unknown"}: ${message}`);
}

if (!Array.isArray(candidates)) {
  fail("manifest", "candidate source file must be an array");
} else {
  const ids = new Set();
  for (const candidate of candidates) {
    const id = typeof candidate.id === "string" ? candidate.id : "";
    if (!id) fail(id, "missing id");
    if (ids.has(id)) fail(id, "duplicate id");
    ids.add(id);

    for (const field of ["label", "provider", "url", "license", "priority", "qualityReason", "intakeNotes"]) {
      if (typeof candidate[field] !== "string" || !candidate[field].trim()) {
        fail(id, `missing ${field}`);
      }
    }

    if (!/^https:\/\/.+/i.test(candidate.url || "")) {
      fail(id, "url must be an https URL");
    }

    if (!allowedLicenses.has(candidate.license)) {
      fail(id, `unsupported license posture ${candidate.license}`);
    }

    if (!allowedPriorities.has(candidate.priority)) {
      fail(id, `unsupported priority ${candidate.priority}`);
    }

    if (!Array.isArray(candidate.formats) || candidate.formats.length === 0) {
      fail(id, "formats must be a non-empty array");
    } else {
      for (const format of candidate.formats) {
        if (!allowedFormats.has(format)) fail(id, `unsupported format ${format}`);
      }
    }

    if (!Array.isArray(candidate.targetRoles) || candidate.targetRoles.length === 0) {
      fail(id, "targetRoles must be a non-empty array");
    }

    const searchable = JSON.stringify(candidate);
    if (blockedTerms.test(searchable)) {
      fail(id, "candidate includes a blocked license/provenance/franchise term");
    }

    if (
      (candidate.license === "per-asset-review-required" ||
        candidate.license === "commercial-license") &&
      candidate.priority !== "guarded"
    ) {
      fail(id, "per-asset review and commercial sources must use guarded priority");
    }

    if (candidate.license === "commercial-license" && !/proof|license|operator|purchase|commercial/i.test(candidate.intakeNotes || "")) {
      fail(id, "commercial sources must describe proof/license/operator approval requirements");
    }
  }
}

if (!Array.isArray(toolCandidates)) {
  fail("toolCandidates", "tool candidate source file must be an array");
} else {
  const ids = new Set();
  for (const candidate of toolCandidates) {
    const id = typeof candidate.id === "string" ? candidate.id : "";
    if (!id) fail(id, "missing id");
    if (ids.has(id)) fail(id, "duplicate tool candidate id");
    ids.add(id);

    for (const field of [
      "label",
      "provider",
      "url",
      "license",
      "licenseProofUrl",
      "toolKind",
      "priority",
      "qualityReason",
      "intakeNotes",
      "shippingPosture",
    ]) {
      if (typeof candidate[field] !== "string" || !candidate[field].trim()) {
        fail(id, `missing ${field}`);
      }
    }

    if (!/^https:\/\/.+/i.test(candidate.url || "")) {
      fail(id, "tool url must be an https URL");
    }

    if (!/^https:\/\/.+/i.test(candidate.licenseProofUrl || "")) {
      fail(id, "tool licenseProofUrl must be an https URL");
    }

    if (!allowedToolLicenses.has(candidate.license)) {
      fail(id, `unsupported tool license posture ${candidate.license}`);
    }

    if (!allowedToolKinds.has(candidate.toolKind)) {
      fail(id, `unsupported tool kind ${candidate.toolKind}`);
    }

    if (candidate.priority !== "guarded") {
      fail(id, "tool candidates must use guarded priority");
    }

    if (!Array.isArray(candidate.formats) || candidate.formats.length === 0) {
      fail(id, "tool formats must be a non-empty array");
    } else {
      for (const format of candidate.formats) {
        if (!allowedToolFormats.has(format)) fail(id, `unsupported tool format ${format}`);
      }
    }

    if (!Array.isArray(candidate.targetRoles) || candidate.targetRoles.length < 2) {
      fail(id, "tool targetRoles must include at least two roles");
    }

    const searchable = JSON.stringify(candidate);
    if (blockedTerms.test(searchable)) {
      fail(id, "tool candidate includes a blocked license/provenance/franchise term");
    }

    if (!/tooling reference only|optional/i.test(candidate.shippingPosture || "")) {
      fail(id, "tool shippingPosture must keep the tool optional/reference-only");
    }

    if (!/manifest|provenance|rights|prompt|source/i.test(candidate.intakeNotes || "")) {
      fail(id, "tool intakeNotes must preserve provenance/rights/manifest guardrails");
    }
  }
}

if (errors.length > 0) {
  console.error("ARPG asset candidate validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(
  `ARPG asset candidate sources OK (${candidates.length} asset candidates, ${toolCandidates.length} tool candidates).`,
);
