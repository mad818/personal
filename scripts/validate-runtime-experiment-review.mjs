#!/usr/bin/env node
/* eslint-disable no-console */

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function fail(message) {
  console.error(`x runtime-experiment-review: ${message}`);
  process.exit(1);
}

function readRequired(...parts) {
  const relative = parts.join("/");
  const filePath = path.join(root, ...parts);
  if (!fs.existsSync(filePath)) fail(`${relative} is missing`);
  return fs.readFileSync(filePath, "utf8");
}

function requireAll(source, label, needles) {
  for (const needle of needles) {
    if (!source.includes(needle)) fail(`${label} is missing ${needle}`);
  }
}

function excludeAll(source, label, needles) {
  for (const needle of needles) {
    if (source.includes(needle)) fail(`${label} must not include ${needle}`);
  }
}

const spec = readRequired(
  "specs",
  "features",
  "runtime-experiment-operator-review.md",
);
const contracts = readRequired("lib", "runtimeExperimentContracts.ts");
const ledger = readRequired("lib", "runtimeExperimentLedger.ts");
const route = readRequired(
  "app",
  "api",
  "metrics",
  "runtime-experiments",
  "route.ts",
);
const lab = readRequired("components", "skills", "BlacksiteLab.tsx");
const routePolicy = readRequired("lib", "security", "routePolicy.ts");
const parity = JSON.parse(
  readRequired("docs", "ideas", "source-parity", "openevolve.json"),
);
const packageJson = JSON.parse(readRequired("package.json"));

requireAll(spec, "feature spec", [
  "keep/reject/defer",
  "append-only local audit evidence",
  "never mutate prompts",
]);
requireAll(contracts, "decision contracts", [
  "runtimeExperimentDecisionInputSchema",
  "runtimeExperimentDecisionSchema",
  "evaluateRuntimeExperimentKeepGate",
  "buildRuntimeExperimentDecision",
  '"candidate_win"',
  "newFailures.length",
  "failedChecks.length",
  "failedCategories.length",
]);
requireAll(ledger, "decision ledger", [
  "runtime-experiment-decisions.jsonl",
  "readRuntimeExperimentDecisions",
  "findRuntimeExperimentRun",
  "recordRuntimeExperimentDecision",
  "appendFile(",
]);
requireAll(route, "protected decision route", [
  "runtimeExperimentDecisionInputSchema.safeParse",
  "recordRuntimeExperimentDecision",
  "flattenZodIssues",
  "status: result.status",
]);
requireAll(lab, "reachable Blacksite review", [
  "Operator disposition",
  "Keep candidate",
  "Reject",
  "Defer",
  "Decision rationale",
  "The live runtime was not changed.",
  "evaluateRuntimeExperimentKeepGate",
]);
requireAll(routePolicy, "route policy", [
  'prefix: "/api/metrics/runtime-experiments"',
  'routeClass: "local_only"',
]);
excludeAll(route, "decision route", [
  "child_process",
  "spawn(",
  "exec(",
  "fetch(",
]);

if (parity.status !== "complete") fail("OpenEvolve parity must be complete");
if (
  parity.capabilities.some((capability) => capability.disposition === "pending")
) {
  fail("OpenEvolve parity still has pending capabilities");
}
const reviewCapability = parity.capabilities.find(
  (capability) => capability.id === "benchmark-gated-variant-review",
);
if (reviewCapability?.disposition !== "adapted") {
  fail("benchmark-gated-variant-review must be adapted");
}

if (
  packageJson.scripts?.["runtime-experiment:review:runtime:check"] !==
  "node --no-warnings --experimental-strip-types scripts/check-runtime-experiment-review-runtime.mjs"
) {
  fail("package.json is missing runtime-experiment:review:runtime:check");
}
if (
  packageJson.scripts?.["runtime-experiment:review:check"] !==
  "node scripts/validate-runtime-experiment-review.mjs && npm run runtime-experiment:review:runtime:check"
) {
  fail("package.json is missing runtime-experiment:review:check");
}
if (
  !(packageJson.scripts?.verify ?? "").includes(
    "npm run runtime-experiment:review:check",
  )
) {
  fail("verify is missing runtime-experiment:review:check");
}

console.log("ok runtime-experiment-review");
