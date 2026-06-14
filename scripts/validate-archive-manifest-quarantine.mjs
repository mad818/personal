#!/usr/bin/env node
/* eslint-disable no-console */

import { existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const forbiddenLiveManifests = [
  "archive/package.json",
  "archive/pnpm-lock.yaml",
  "archive/package-lock.json",
  "archive/yarn.lock",
];
const requiredArchivedFiles = [
  "archive/package.archived.json",
  "archive/pnpm-lock.archived.yaml",
  "archive/README.md",
];

function exists(relativePath) {
  return existsSync(join(root, relativePath));
}

const findings = [];

for (const file of forbiddenLiveManifests) {
  if (exists(file)) {
    findings.push(`${file} must stay quarantined with a non-manifest archival name.`);
  }
}

for (const file of requiredArchivedFiles) {
  if (!exists(file)) {
    findings.push(`${file} is required so retired dependency evidence is preserved.`);
  }
}

if (findings.length > 0) {
  console.log(`Archive manifest quarantine found ${findings.length} issue(s):`);
  for (const finding of findings) {
    console.log(`- ${finding}`);
  }
  process.exit(1);
}

console.log("Archive manifest quarantine OK.");
