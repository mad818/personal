#!/usr/bin/env node
/* eslint-disable no-console */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (relativePath) => {
  try {
    return fs.readFileSync(path.join(root, relativePath), "utf8");
  } catch {
    return "";
  }
};
const fail = (message) => {
  console.error(`ST3GG media-tail validation failed: ${message}`);
  process.exit(1);
};
const requireText = (value, needle, label) => {
  if (!value.includes(needle)) fail(`${label} missing ${needle}`);
};

const library = read("lib/binaryTriage.ts");
const panel = read("components/recon/BinaryTriagePanel.tsx");
const runtime = read("scripts/check-st3gg-media-tail-runtime.mjs");
const spec = read("specs/features/st3gg-media-tail-defense.md");
const context = read(
  "docs/ideas/repo-analysis/elder-plinius/st3gg/REPO_CONTEXT.md",
);
const parity = read("docs/ideas/source-parity/elder-plinius-portfolio.json");
const companyMap = read("lib/nexusCompanyMap.ts");
const packageJson = JSON.parse(read("package.json"));

for (const [value, label] of [
  [library, "binary triage library"],
  [panel, "RECON binary triage panel"],
  [runtime, "runtime fixtures"],
  [spec, "feature spec"],
  [context, "source analysis"],
]) {
  if (!value) fail(`${label} is missing`);
}

for (const needle of [
  "detectBinaryMediaTailIndicators",
  '"png_after_iend"',
  '"jpeg_after_eoi"',
  '"pdf_after_eof"',
  "chunkCount < 4096",
  "identifyNestedFormat",
  "review indicator, not proof",
  '"media-tail-indicator"',
]) {
  requireText(library, needle, "binary triage contract");
}

requireText(
  panel,
  "detectBinaryMediaTailIndicators(bytes)",
  "full local byte scan",
);
requireText(panel, "mediaTailIndicators,", "report integration");
requireText(panel, "Media-tail indicators:", "copy integration");
requireText(parity, '"media-tail-indicator-defense"', "source parity");
requireText(parity, '"steganography-creation-decoding-runtime"', "exclusion");
requireText(companyMap, 'id: "pliny-st3gg"', "Company Map source");
requireText(context, "must not install, copy, or expose", "AGPL boundary");
requireText(spec, "never return trailing bytes", "data-minimization boundary");

const scripts = packageJson.scripts ?? {};
requireText(
  String(scripts["st3gg:media-tail:runtime:check"] ?? ""),
  "check-st3gg-media-tail-runtime.mjs",
  "runtime script",
);
requireText(
  String(scripts["st3gg:media-tail:check"] ?? ""),
  "validate-st3gg-media-tail-defense.mjs",
  "focused script",
);
requireText(
  String(scripts["st3gg:media-tail:check"] ?? ""),
  "st3gg:media-tail:runtime:check",
  "focused runtime chain",
);
requireText(
  String(scripts.verify ?? ""),
  "npm run st3gg:media-tail:check",
  "canonical verify wiring",
);

for (const forbidden of ["from \"stegg\"", "from 'stegg'", "child_process"]) {
  if (library.includes(forbidden) || panel.includes(forbidden)) {
    fail(`active implementation contains forbidden upstream/runtime token ${forbidden}`);
  }
}

console.log(
  "ST3GG media-tail static validation OK (local-only report path, parity, Company Map, canonical wiring, and exclusions).",
);
