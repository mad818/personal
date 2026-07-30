#!/usr/bin/env node
/* eslint-disable no-console */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function fail(message) {
  console.error(`x orchestration-source: ${message}`);
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

const matrixIds = ["mco-squad", "openai-symphony", "ruvnet-ruflo"];
for (const matrixId of matrixIds) {
  const matrix = JSON.parse(
    read(`docs/ideas/source-parity/${matrixId}.json`),
  );
  if (matrix.status !== "complete") fail(`${matrixId} must be complete`);
  if (matrix.source?.reviewedAt !== "2026-07-27") {
    fail(`${matrixId} must record the current source review`);
  }
  if (
    !Array.isArray(matrix.capabilities) ||
    matrix.capabilities.some((capability) => capability.disposition === "pending")
  ) {
    fail(`${matrixId} must contain no pending capabilities`);
  }
}

const symphony = JSON.parse(
  read("docs/ideas/source-parity/openai-symphony.json"),
);
if (symphony.source?.license !== "Apache-2.0") {
  fail("Symphony license must match the current upstream repository");
}

requireAll(read("lib/centralOrchestrator.ts"), "typed isolated handoffs", [
  "CENTRAL_ORCHESTRATOR_MAX_WORKERS = 3",
  "SpecialistHandoff",
  "You have no tools, live file access, browser access, durable memory, or authority to mutate anything.",
  "parseSpecialistHandoff",
]);
requireAll(read("lib/teamOrchestration.ts"), "deterministic plan", [
  'const lead: AgentId = "jansky"',
  ".slice(0, 3)",
  "Read typed handoffs, resolve conflicts, verify claims, and synthesize one answer.",
]);
requireAll(
  read("components/home/office/TeamOrchestrationStrip.tsx"),
  "visible orchestration phases",
  ["plan.phases.map", "Central orchestrator"],
);
requireAll(read("specs/features/orchestration-source-closure.md"), "spec", [
  "MAX remains the only operator-facing manager.",
  "Stale source claims no longer overstate Symphony",
]);
requireAll(read("package.json"), "package wiring", [
  '"orchestration-source:check"',
  "npm run orchestration-source:check",
]);

console.log(
  "ok orchestration-source (matrices=3; manager=MAX; workers<=3; pending=0)",
);
