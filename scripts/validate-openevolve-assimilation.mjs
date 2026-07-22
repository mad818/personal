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

const trend = readRequired("components", "ui", "RuntimeEvalTrend.tsx");
const contracts = readRequired("lib", "runtimeExperimentContracts.ts");
const ledger = readRequired("lib", "runtimeExperimentLedger.ts");
const parity = JSON.parse(
  readRequired("docs", "ideas", "source-parity", "openevolve.json"),
);

requireText(trend, "latestExperiment.recommendation", "RuntimeEvalTrend.tsx");
requireText(trend, "latestExperiment.scoreDelta", "RuntimeEvalTrend.tsx");
requireText(
  contracts,
  "runtimeExperimentComparisonSchema",
  "runtimeExperimentContracts.ts",
);
requireText(contracts, "recommendation", "runtimeExperimentContracts.ts");
requireText(
  ledger,
  "Derived baseline-vs-variant scoring",
  "runtimeExperimentLedger.ts",
);

if (parity.status !== "in_progress") {
  fail("openevolve.json status must be in_progress");
}
if (
  parity.capabilities?.find(
    (item) => item.id === "benchmark-gated-variant-review",
  )?.disposition !== "pending"
) {
  fail("openevolve operator-gated evolution must remain pending");
}

console.log(
  "ok openevolve-assimilation (comparison retained; operator decision gate pending)",
);
