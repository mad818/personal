#!/usr/bin/env node
/* eslint-disable no-console */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];

function fail(message) {
  errors.push(message);
}

function requireFile(relativePath) {
  const filePath = path.join(repoRoot, relativePath);
  if (!fs.existsSync(filePath)) {
    fail(`missing ${relativePath}`);
    return null;
  }
  return filePath;
}

function requireIncludes(relativePath, needle, label) {
  const filePath = requireFile(relativePath);
  if (!filePath) return;
  const source = fs.readFileSync(filePath, "utf8");
  if (!source.includes(needle)) {
    fail(`${label || relativePath} must mention ${needle}`);
  }
}

const packagePath = requireFile("package.json");
const packageJson = packagePath ? JSON.parse(fs.readFileSync(packagePath, "utf8")) : { scripts: {} };

for (const script of [
  "arpg:art:generate",
  "arpg:illustrated:generate",
  "arpg:assets:check",
  "arpg:assets:import",
  "arpg:asset-candidates:check",
  "arpg:production:check",
  "arpg:pipeline:check",
]) {
  if (!packageJson.scripts?.[script]) {
    fail(`package.json is missing ${script}`);
  }
}

for (const relativePath of [
  "docs/assets/arpg-asset-ledger.md",
  "docs/game/aether-reliquary/generator-assisted-art-pipeline.md",
  "docs/game/aether-reliquary/illustrated-2d-asset-bench.md",
  "docs/game/aether-reliquary/real-asset-acquisition.md",
  "lib/arpgAssetManifest.ts",
  "lib/arpgAssetManifestData.json",
  "lib/arpgIllustratedAssetBenchContent.json",
  "lib/arpgAssetCandidateSources.json",
  "scripts/generate-arpg-original-art.mjs",
  "scripts/generate-arpg-illustrated-assets.mjs",
  "scripts/import-arpg-real-assets.mjs",
  "scripts/validate-arpg-assets.mjs",
  "assets/arpg/intake/README.md",
]) {
  requireFile(relativePath);
}

requireIncludes(
  "docs/assets/arpg-asset-ledger.md",
  "bottom-center character anchors",
  "asset ledger",
);
requireIncludes(
  "docs/assets/arpg-asset-ledger.md",
  "lib/arpgAssetManifestData.json",
  "asset ledger",
);
requireIncludes(
  "docs/assets/arpg-asset-ledger.md",
  "npm run arpg:assets:check",
  "asset ledger",
);

const generationRecordsDir = path.join(
  repoRoot,
  "docs",
  "game",
  "aether-reliquary",
  "generation-records",
);
if (!fs.existsSync(generationRecordsDir)) {
  fail("missing docs/game/aether-reliquary/generation-records/");
} else {
  const records = fs.readdirSync(generationRecordsDir).filter((name) => name.endsWith(".md"));
  if (records.length < 3) {
    fail("generation-records must contain at least three prompt/provenance records");
  }
}

const manifest = JSON.parse(
  fs.readFileSync(path.join(repoRoot, "lib", "arpgAssetManifestData.json"), "utf8"),
);
if (!Array.isArray(manifest) || manifest.length < 10) {
  fail("lib/arpgAssetManifestData.json must track a production-scale manifest");
}

const bench = JSON.parse(
  fs.readFileSync(path.join(repoRoot, "lib", "arpgIllustratedAssetBenchContent.json"), "utf8"),
);
if (!Array.isArray(bench.batches) || bench.batches.length < 5) {
  fail("lib/arpgIllustratedAssetBenchContent.json must define the illustrated bench batches");
}

const readinessPath = path.join(repoRoot, "lib", "arpgProductionReadinessContent.json");
if (fs.existsSync(readinessPath)) {
  const readiness = JSON.parse(fs.readFileSync(readinessPath, "utf8"));
  const licenses = readiness.assetPipeline?.acceptedLicenses ?? [];
  for (const license of ["project-original", "CC0-1.0", "CC-BY-4.0", "commercial-license"]) {
    if (!licenses.includes(license)) {
      fail(`arpgProductionReadinessContent.json missing accepted license ${license}`);
    }
  }
}

if (errors.length) {
  console.error("x arpg-asset-pipeline:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(
  `ok arpg-asset-pipeline (${manifest.length} manifest entries, ${bench.batches.length} illustrated batches)`,
);
