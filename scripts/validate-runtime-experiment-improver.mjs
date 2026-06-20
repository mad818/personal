#!/usr/bin/env node
/* eslint-disable no-console */

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function fail(message) {
  console.error(`x runtime-experiment-improver: ${message}`);
  process.exit(1);
}

function readRequired(...parts) {
  const filePath = path.join(root, ...parts);
  if (!fs.existsSync(filePath)) {
    fail(`${parts.join("/")} is missing`);
  }
  return fs.readFileSync(filePath, "utf8");
}

function assertIncludes(source, needle, label) {
  if (!source.includes(needle)) {
    fail(`${label} is missing "${needle}"`);
  }
}

function assertExcludes(source, needle, label) {
  if (source.includes(needle)) {
    fail(`${label} must not include "${needle}"`);
  }
}

// scripts/eval-runtime-experiment.js must exist
const evalScript = readRequired("scripts", "eval-runtime-experiment.js");
assertIncludes(evalScript, "experiment", "scripts/eval-runtime-experiment.js");

// docs/metrics/runtime-experiment-definitions.json must exist and be valid
const definitionsText = readRequired("docs", "metrics", "runtime-experiment-definitions.json");
let definitions;
try {
  definitions = JSON.parse(definitionsText);
} catch {
  fail("docs/metrics/runtime-experiment-definitions.json is not valid JSON");
}
if (!definitions || typeof definitions !== "object") {
  fail("docs/metrics/runtime-experiment-definitions.json must be a JSON object");
}

// No autonomous production mutation language in the eval script
for (const forbidden of [
  "auto-deploy",
  "autonomous push",
  "git push",
  "self-modify production",
  "mutate production",
  "deploy without approval",
]) {
  assertExcludes(evalScript, forbidden, "scripts/eval-runtime-experiment.js");
}

// Verify package.json wires the script
const packageJsonText = readRequired("package.json");
const packageJson = JSON.parse(packageJsonText);

if (!packageJson.scripts?.["eval:runtime-experiment"]) {
  fail("package.json is missing eval:runtime-experiment script");
}
if (!packageJson.scripts?.["runtime:experiment:check"]) {
  fail("package.json is missing runtime:experiment:check script");
}

console.log("ok runtime-experiment-improver");
