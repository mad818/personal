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

if (!packageJson.scripts?.["arpg:assets:import"]) {
  fail("package.json is missing arpg:assets:import");
}
if (!packageJson.scripts?.["arpg:intake:check"]) {
  fail("package.json is missing arpg:intake:check");
}

for (const relativePath of [
  "assets/arpg/intake/README.md",
  "assets/arpg/intake/approved/.gitkeep",
  "assets/arpg/intake/approved/commercial-license.example.json",
  "docs/game/aether-reliquary/real-asset-acquisition.md",
  "lib/arpgAssetIntake.ts",
  "lib/arpgAssetCandidateSources.json",
  "scripts/import-arpg-real-assets.mjs",
]) {
  requireFile(relativePath);
}

requireIncludes("assets/arpg/intake/README.md", "`raw/`", "intake README");
requireIncludes("assets/arpg/intake/README.md", "npm run arpg:assets:import", "intake README");
requireIncludes(
  "docs/game/aether-reliquary/real-asset-acquisition.md",
  "assets/arpg/intake/work/",
  "real asset acquisition guide",
);
requireIncludes("lib/arpgAssetIntake.ts", "getArpgRealAssetIntakeSummary", "arpgAssetIntake");
requireIncludes("lib/arpgAssetIntake.ts", "public/arpg/imported/", "arpgAssetIntake");

const hqSpecPath = requireFile("tests/e2e/hq-shell.spec.ts");
if (hqSpecPath) {
  const hqSpec = fs.readFileSync(hqSpecPath, "utf8");
  if (!hqSpec.includes("arpg-real-asset-intake")) {
    fail("tests/e2e/hq-shell.spec.ts must assert arpg-real-asset-intake");
  }
}

const importScript = fs.readFileSync(
  path.join(repoRoot, "scripts", "import-arpg-real-assets.mjs"),
  "utf8",
);
for (const needle of [
  "assets/arpg/intake/work",
  "public/arpg/imported",
  "arpgAssetCandidateSources.json",
  ".glb",
  ".gltf",
]) {
  if (!importScript.includes(needle)) {
    fail(`import-arpg-real-assets.mjs must handle ${needle}`);
  }
}

const gitignorePath = requireFile(".gitignore");
if (gitignorePath) {
  const gitignore = fs.readFileSync(gitignorePath, "utf8");
  for (const pattern of ["assets/arpg/intake/raw/", "assets/arpg/intake/work/"]) {
    if (!gitignore.includes(pattern)) {
      fail(`.gitignore must ignore ${pattern}`);
    }
  }
}

const candidates = JSON.parse(
  fs.readFileSync(path.join(repoRoot, "lib", "arpgAssetCandidateSources.json"), "utf8"),
);
if (!Array.isArray(candidates) || candidates.length < 5) {
  fail("lib/arpgAssetCandidateSources.json must list real pack candidates");
}

if (errors.length) {
  console.error("x arpg-intake-bridge:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(
  `ok arpg-intake-bridge (${candidates.length} candidate sources; runtime import blocked until work files exist)`,
);
