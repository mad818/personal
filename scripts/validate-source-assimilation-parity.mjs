#!/usr/bin/env node
/* eslint-disable no-console */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const parityDir = path.join(root, "docs", "ideas", "source-parity");
const allowedStatuses = new Set(["foundation", "in_progress", "complete"]);
const allowedDispositions = new Set(["implemented", "adapted", "excluded", "pending"]);
const allowedConflicts = new Set([
  "security",
  "legal",
  "license",
  "free_local",
  "product_purpose",
]);

function fail(message) {
  console.error(`x source-parity: ${message}`);
  process.exit(1);
}

function requireText(value, label) {
  if (typeof value !== "string" || !value.trim()) fail(`${label} is required`);
  return value.trim();
}

function validateProof(matrixId, capability) {
  if (!Array.isArray(capability.proof) || capability.proof.length === 0) {
    fail(`${matrixId}/${capability.id} ${capability.disposition} requires proof`);
  }
  for (const proof of capability.proof) {
    const relativePath = requireText(proof, `${matrixId}/${capability.id} proof`);
    if (/^https?:\/\//i.test(relativePath) || relativePath.startsWith("npm run ")) continue;
    const fullPath = path.join(root, relativePath);
    if (!fs.existsSync(fullPath)) {
      fail(`${matrixId}/${capability.id} proof path does not exist: ${relativePath}`);
    }
  }
}

if (!fs.existsSync(parityDir)) fail("docs/ideas/source-parity is missing");

const files = fs
  .readdirSync(parityDir)
  .filter((file) => file.endsWith(".json"))
  .sort();
if (files.length === 0) fail("no source parity matrices exist");

let pendingTotal = 0;
let implementedTotal = 0;
let excludedTotal = 0;

for (const file of files) {
  const filePath = path.join(parityDir, file);
  let matrix;
  try {
    matrix = JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    fail(`${file} is invalid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }

  const matrixId = requireText(matrix.id, `${file} id`);
  const status = requireText(matrix.status, `${matrixId} status`);
  if (!allowedStatuses.has(status)) fail(`${matrixId} has invalid status ${status}`);

  const source = matrix.source ?? {};
  requireText(source.url, `${matrixId} source.url`);
  requireText(source.version, `${matrixId} source.version`);
  requireText(source.reviewedAt, `${matrixId} source.reviewedAt`);
  requireText(source.license, `${matrixId} source.license`);
  if (!Array.isArray(source.primaryEvidence) || source.primaryEvidence.length === 0) {
    fail(`${matrixId} requires primary source evidence`);
  }

  if (!Array.isArray(matrix.capabilities) || matrix.capabilities.length === 0) {
    fail(`${matrixId} requires an exhaustive capability inventory`);
  }

  const ids = new Set();
  let pending = 0;
  for (const capability of matrix.capabilities) {
    const id = requireText(capability.id, `${matrixId} capability id`);
    if (ids.has(id)) fail(`${matrixId} duplicates capability id ${id}`);
    ids.add(id);
    requireText(capability.title, `${matrixId}/${id} title`);
    requireText(capability.sourceEvidence, `${matrixId}/${id} sourceEvidence`);
    const disposition = requireText(capability.disposition, `${matrixId}/${id} disposition`);
    if (!allowedDispositions.has(disposition)) {
      fail(`${matrixId}/${id} has invalid disposition ${disposition}`);
    }

    if (disposition === "implemented" || disposition === "adapted") {
      validateProof(matrixId, capability);
      implementedTotal += 1;
    } else if (disposition === "excluded") {
      const conflict = requireText(capability.conflict, `${matrixId}/${id} conflict`);
      if (!allowedConflicts.has(conflict)) {
        fail(`${matrixId}/${id} has invalid exclusion conflict ${conflict}`);
      }
      requireText(capability.reason, `${matrixId}/${id} exclusion reason`);
      excludedTotal += 1;
    } else {
      requireText(capability.reason, `${matrixId}/${id} pending reason`);
      pending += 1;
      pendingTotal += 1;
    }
  }

  if (status === "complete" && pending > 0) {
    fail(`${matrixId} is complete but still has ${pending} pending capabilities`);
  }
  if (status !== "complete" && pending === 0) {
    fail(`${matrixId} has no pending capabilities and must be reviewed for complete status`);
  }
}

console.log(
  `ok source-parity (${files.length} matrices, ${implementedTotal} implemented/adapted, ${excludedTotal} excluded, ${pendingTotal} pending)`,
);
