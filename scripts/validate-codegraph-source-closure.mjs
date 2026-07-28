#!/usr/bin/env node
/* eslint-disable no-console */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function fail(message) {
  console.error(`x codegraph-source: ${message}`);
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

for (const matrixId of ["colbymchenry-codegraph", "graphify"]) {
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

requireAll(read("lib/projectArchitecture.ts"), "project graph", [
  'provenance: "extracted"',
  "ProjectGraphCommunity",
  "buildGraphCommunities",
  "explainProjectGraphFile",
  "findProjectGraphPath",
]);
requireAll(read("app/api/project/route.ts"), "protected graph route", [
  "Graph path queries require both from and to file paths.",
  "explanation",
  "findProjectGraphPath",
]);
requireAll(read("scripts/build-codegraph.mjs"), "portable export", [
  '"graph.json"',
  '"GRAPH_REPORT.md"',
  '"graph.html"',
  "data",
  "exports",
]);
requireAll(read(".gitignore"), "local export policy", ["data/exports/"]);
requireAll(read("package.json"), "package wiring", [
  '"codegraph:source:check"',
  '"codegraph:source:runtime:check"',
  "npm run codegraph:source:check",
]);

console.log(
  "ok codegraph-source (matrices=2; provenance=extracted; queries=explain+path; exports=3; pending=0)",
);
