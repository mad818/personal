#!/usr/bin/env node
/* eslint-disable no-console */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function fail(message) {
  console.error(`x academic-research-source: ${message}`);
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

for (const matrixId of ["feynman", "imbad0202-academic-research-skills"]) {
  const matrix = JSON.parse(
    read(`docs/ideas/source-parity/${matrixId}.json`),
  );
  if (matrix.status !== "complete") fail(`${matrixId} must be complete`);
  if (matrix.source?.reviewedAt !== "2026-07-27") {
    fail(`${matrixId} must record the current source review`);
  }
  if (
    matrix.capabilities.some(
      (capability) => capability.disposition === "pending",
    )
  ) {
    fail(`${matrixId} retains pending capabilities`);
  }
}

requireAll(read("lib/feynmanResearch.ts"), "four-stage research", [
  '"researcher"',
  '"writer"',
  '"verifier"',
  '"reviewer"',
  "EXECUTION_GATED_WORKFLOWS",
  "approvalRequired",
]);
requireAll(read("lib/feynmanWorkflowContracts.ts"), "approval contracts", [
  "Explicit operator approval is required before installs, scripts, training, paid compute, Docker, or local execution.",
  "Explicit operator approval is required before enabling loops, execution, external writes, or training.",
]);
requireAll(read("lib/feynmanResearchIntegrity.ts"), "integrity truth", [
  'posture: "not_run"',
  "independentVerification: false",
  'posture: "recorded_not_replay_proof"',
]);
requireAll(
  read("specs/features/academic-research-source-closure.md"),
  "closure spec",
  [
    "CC-BY-NC source expression is not copied",
    "Research cannot quietly become arbitrary code execution.",
  ],
);
requireAll(read("package.json"), "package wiring", [
  '"academic-research:source:check"',
  "npm run academic-research:source:check",
]);

console.log(
  "ok academic-research-source (matrices=2; four-stage=true; execution=plan-only; pending=0)",
);
