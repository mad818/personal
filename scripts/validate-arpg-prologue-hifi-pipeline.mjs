#!/usr/bin/env node
/* eslint-disable no-console */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];
const notes = [];

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

const packagePath = requireFile("package.json");
const packageJson = packagePath ? JSON.parse(fs.readFileSync(packagePath, "utf8")) : { scripts: {} };

for (const script of ["arpg:prologue-hifi:generate", "arpg:prologue-hifi:check"]) {
  if (!packageJson.scripts?.[script]) {
    fail(`package.json is missing ${script}`);
  }
}

requireFile("scripts/generate-arpg-prologue-hifi.mjs");
requireFile("lib/arpgVisualReplacementRuntime.ts");
requireFile("docs/game/aether-reliquary/generation-records/next-prologue-hifi-story-pack.md");

const runtimeModule = fs.readFileSync(
  path.join(repoRoot, "lib", "arpgVisualReplacementRuntime.ts"),
  "utf8",
);
for (const needle of [
  "resolveArpgVisualReplacementFrame",
  "prologueStepToVisualTargetId",
  "entityVisualTargetId",
  "PROLOGUE_HIFI_BATCH_ID",
  "getArpgVisualReplacementRuntimeSummary",
  "listArpgVisualReplacementTargetIds",
]) {
  if (!runtimeModule.includes(needle)) {
    fail(`arpgVisualReplacementRuntime.ts must export ${needle}`);
  }
}

const briefs = JSON.parse(
  fs.readFileSync(path.join(repoRoot, "lib", "arpgVisualAssetBriefs.json"), "utf8"),
);
const replacement = JSON.parse(
  fs.readFileSync(path.join(repoRoot, "lib", "arpgVisualReplacementContent.json"), "utf8"),
);

const brief = Array.isArray(briefs.briefs)
  ? briefs.briefs.find((entry) => entry.id === "prologue-hifi-story-pack")
  : null;
if (!brief) {
  fail("lib/arpgVisualAssetBriefs.json missing prologue-hifi-story-pack brief");
} else {
  if (brief.status !== "ready-for-generation") {
    fail("prologue-hifi-story-pack brief must stay ready-for-generation until runtime art ships");
  }
  if (!Array.isArray(brief.items) || brief.items.length !== 10) {
    fail("prologue-hifi-story-pack brief must define 10 frame items");
  }
  if (replacement.replacementBatchId !== "prologue-hifi-story-pack") {
    fail("arpgVisualReplacementContent.json must target prologue-hifi-story-pack");
  }
  const briefItemIds = new Set(brief.items.map((item) => item.id));
  for (const target of replacement.targets ?? []) {
    if (!briefItemIds.has(target.briefItemId)) {
      fail(`replacement target ${target.id} missing brief item ${target.briefItemId}`);
    }
  }
  if ((replacement.targets ?? []).length !== 10) {
    fail("arpgVisualReplacementContent.json must define 10 prologue replacement targets");
  }
}

const sourcePath = path.join(
  repoRoot,
  "assets",
  "arpg",
  "illustrated",
  "generated-source",
  "prologue-hifi-story-pack.png",
);
const runtimePath = path.join(
  repoRoot,
  "public",
  "arpg",
  "illustrated",
  "prologue-hifi-story-pack.png",
);

if (!fs.existsSync(sourcePath)) {
  notes.push("operator source pending at assets/arpg/illustrated/generated-source/prologue-hifi-story-pack.png");
}
if (!fs.existsSync(runtimePath)) {
  notes.push("runtime sheet pending at public/arpg/illustrated/prologue-hifi-story-pack.png");
}

if (errors.length) {
  console.error("x arpg-prologue-hifi-pipeline:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

const status = notes.length ? `code lane ready; ${notes.join("; ")}` : "source and runtime sheets present";
console.log(`ok arpg-prologue-hifi-pipeline (${status})`);
