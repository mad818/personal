#!/usr/bin/env node
/* eslint-disable no-console */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function fail(message) {
  console.error(`x openevolve-assimilation: ${message}`);
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

const lib = readRequired("lib", "evolutionImprover.ts");
const actions = readRequired("components", "ui", "EvolutionImproverActions.tsx");
const trend = readRequired("components", "ui", "RuntimeEvalTrend.tsx");
const parity = JSON.parse(readRequired("docs", "ideas", "source-parity", "openevolve.json"));

requireText(lib, "suggestEvolutionOperatorDecision", "evolutionImprover.ts");
requireText(lib, "writeEvolutionOperatorRecord", "evolutionImprover.ts");
requireText(actions, "keep", "EvolutionImproverActions.tsx");
requireText(trend, "EvolutionImproverActions", "RuntimeEvalTrend.tsx");

if (parity.status !== "complete") {
  fail("openevolve.json status must be complete");
}

console.log("ok openevolve-assimilation (bounded evolution improver UX wired)");
