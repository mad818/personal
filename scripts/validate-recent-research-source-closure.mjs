#!/usr/bin/env node
/* eslint-disable no-console */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function fail(message) {
  console.error(`x recent-research-source: ${message}`);
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

const matrix = JSON.parse(
  read("docs/ideas/source-parity/last30days-skill.json"),
);
if (matrix.status !== "complete") fail("source matrix must be complete");
if (matrix.source?.reviewedAt !== "2026-07-27") {
  fail("source matrix must record the current source review");
}
if (
  matrix.capabilities.some(
    (capability) => capability.disposition === "pending",
  )
) {
  fail("source matrix retains pending capabilities");
}

requireAll(read("lib/feynmanProgressiveResearch.ts"), "recent collection", [
  "isFastMovingWorkflow",
  "? 30 : undefined",
  "Promise.allSettled",
  "maximumQueryWaves: 2",
  "maximumDirectReads: 8",
]);
requireAll(read("lib/feynmanResearch.ts"), "grounded brief", [
  '"writer"',
  '"verifier"',
  '"reviewer"',
  "integrityPassport",
]);
for (const route of [
  "app/api/hacker-news/route.ts",
  "app/api/polymarket/route.ts",
  "app/api/papers/route.ts",
]) {
  read(route);
}
requireAll(read("specs/features/recent-research-source-closure.md"), "spec", [
  "does not scrape browser sessions",
  "Popularity cannot silently masquerade as factual confidence.",
]);
requireAll(read("package.json"), "package wiring", [
  '"recent-research:source:check"',
  "npm run recent-research:source:check",
]);

console.log(
  "ok recent-research-source (window=30d; parallel=bounded; keyless=reviewed; pending=0)",
);
