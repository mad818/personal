#!/usr/bin/env node
/* eslint-disable no-console */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function fail(message) {
  console.error(`x artifact-classification: ${message}`);
  process.exit(1);
}

function readRequired(...parts) {
  const filePath = path.join(root, ...parts);
  if (!fs.existsSync(filePath)) {
    fail(`${parts.join("/")} is missing`);
  }
  return fs.readFileSync(filePath, "utf8");
}

function requireText(source, needle, label) {
  if (!source.includes(needle)) {
    fail(`${label} is missing "${needle}"`);
  }
}

const classifier = readRequired("lib", "artifactClassification.ts");
const memoryStore = readRequired("lib", "memoryPagesStore.ts");
const vaultPanel = readRequired("components", "vault", "CompiledMemoryPagesPanel.tsx");
const magikaParity = JSON.parse(readRequired("docs", "ideas", "source-parity", "magika.json"));

for (const needle of [
  "ArtifactClassification",
  "classifyMemoryArtifact",
  "classifyProjectArtifact",
  "artifactType",
  "confidence",
  "sensitive",
  "formatArtifactTypeLabel",
]) {
  requireText(classifier, needle, "lib/artifactClassification.ts");
}

requireText(memoryStore, "artifactClassification", "lib/memoryPagesStore.ts");
requireText(vaultPanel, "artifactClassification", "CompiledMemoryPagesPanel.tsx");

if (magikaParity.status !== "complete") {
  fail("magika.json must be complete");
}

console.log("ok artifact-classification (magika-pattern native classifier wired)");
