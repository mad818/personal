#!/usr/bin/env node
/* eslint-disable no-console */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function fail(message) {
  console.error(`x osint-source: ${message}`);
  process.exit(1);
}

function read(relativePath) {
  const fullPath = path.join(root, relativePath);
  if (!fs.existsSync(fullPath)) fail(`missing ${relativePath}`);
  return fs.readFileSync(fullPath, "utf8");
}

function requireAll(source, label, fragments) {
  for (const fragment of fragments) {
    if (!source.includes(fragment)) fail(`${label} is missing ${fragment}`);
  }
}

for (const relativePath of [
  "docs/ideas/source-parity/simplifaisoul-osiris.json",
  "docs/ideas/source-parity/soxoj-maigret.json",
]) {
  const matrix = JSON.parse(read(relativePath));
  if (matrix.status !== "complete") fail(`${matrix.id} must be complete`);
  if (matrix.source?.reviewedAt !== "2026-07-27") {
    fail(`${matrix.id} must record the current source review`);
  }
  if (
    matrix.capabilities.some(
      (capability) => capability.disposition === "pending",
    )
  ) {
    fail(`${matrix.id} retains pending capabilities`);
  }
}

requireAll(read("components/recon/OsintCasefileCard.tsx"), "casefile", [
  "Passive-first",
  'workflowId: "osint-casefile"',
  "sourceRefs",
  "buildOsintCasefileEvidenceStrength",
  "pivotOpportunities",
  "evidenceGaps",
]);
requireAll(read("lib/xr1Workflows.ts"), "casefile contract", [
  "buildOsintCasefileMarkdown",
  "buildOsintCasefileSummary",
  "buildOsintCasefileEvidenceStrength",
]);
requireAll(read("components/recon/ReconLookup.tsx"), "bounded profile lookup", [
  "fetchUsername",
  "GitHub",
  "Gravatar",
  "Profile discovery",
]);
requireAll(read("specs/features/osint-source-closure.md"), "spec", [
  "does not mass-enumerate accounts",
  "Reviewed pivots reduce false attribution.",
]);
requireAll(read("package.json"), "package wiring", [
  '"osint-source:check"',
  "npm run osint-source:check",
]);

console.log(
  "ok osint-source (workbench=adapted; identity-search=bounded; passive-first=true; pending=0)",
);
