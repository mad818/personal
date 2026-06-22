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
  "arpg:visual-replacement-runtime:check",
  "arpg:prologue-hifi:generate",
  "arpg:prologue-hifi:check",
]) {
  if (!packageJson.scripts?.[script]) {
    fail(`package.json is missing ${script}`);
  }
}

requireFile("lib/arpgVisualReplacementRuntime.ts");
requireIncludes("lib/arpgVisualReplacementRuntime.ts", "entityVisualTargetId", "runtime module");
requireIncludes("lib/arpgVisualReplacementRuntime.ts", "resolveArpgVisualReplacementFrame", "runtime module");
requireIncludes("lib/arpgVisualReplacementRuntime.ts", "regionVisualTargetId", "runtime module");
requireIncludes("components/home/arpg/ArpgHud.tsx", "mapRegionArtStyle", "ArpgHud");
requireIncludes("components/home/arpg/ArpgHud.tsx", "arpg-map-location-art", "ArpgHud");

requireIncludes("components/home/arpg/ArpgHud.tsx", "entityPortraitStyle", "ArpgHud");
requireIncludes("components/home/arpg/ArpgHud.tsx", "arpg-journal-prologue-visual-", "ArpgHud");
requireIncludes("components/home/arpg/ArpgHud.tsx", "arpg-prologue-visual-", "ArpgHud");
requireIncludes("components/home/arpg/ArpgHud.tsx", "entityVisualTargetId", "ArpgHud");

requireIncludes("tests/e2e/hq-shell.spec.ts", "arpg-visual-replacement-readiness", "hq-shell e2e");
requireIncludes("tests/e2e/hq-shell.spec.ts", "fallback lane", "hq-shell e2e");

const replacement = JSON.parse(
  fs.readFileSync(path.join(repoRoot, "lib", "arpgVisualReplacementContent.json"), "utf8"),
);
if (!Array.isArray(replacement.targets) || replacement.targets.length !== 10) {
  fail("arpgVisualReplacementContent.json must define 10 replacement targets");
}

if (errors.length) {
  console.error("x arpg-visual-replacement-runtime:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(
  `ok arpg-visual-replacement-runtime (${replacement.targets.length} targets wired for Adventure/Map/Journal/People fallback lane)`,
);
