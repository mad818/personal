#!/usr/bin/env node
/* eslint-disable no-console */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function fail(message) {
  console.error(`x correction-memory-provenance: ${message}`);
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

const lib = readRequired("lib", "correctionMemoryProvenance.ts");
const strip = readRequired(
  "components",
  "home",
  "office",
  "CorrectionMemoryProvenanceStrip.tsx",
);
const hq = readRequired("components", "home", "office", "HQTerminalSection.tsx");

requireText(lib, "buildCorrectionProvenanceLine", "correctionMemoryProvenance.ts");
requireText(strip, "Correction provenance", "CorrectionMemoryProvenanceStrip.tsx");
requireText(hq, "CorrectionMemoryProvenanceStrip", "HQTerminalSection.tsx");

console.log("ok correction-memory-provenance (HQ provenance strip wired)");
