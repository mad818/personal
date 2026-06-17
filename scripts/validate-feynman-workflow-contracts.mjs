#!/usr/bin/env node
/* eslint-disable no-console */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function fail(message) {
  console.error(`x feynman-workflow-contracts: ${message}`);
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
    fail(`${label} is missing ${needle}`);
  }
}

const spec = readRequired("specs", "features", "feynman-workflow-output-contracts.md");
const contracts = readRequired("lib", "feynmanWorkflowContracts.ts");
const research = readRequired("lib", "feynmanResearch.ts");
const runtime = readRequired("scripts", "check-feynman-workflow-contracts-runtime.mjs");
const packageJson = JSON.parse(readRequired("package.json"));
const parity = JSON.parse(readRequired("docs", "ideas", "source-parity", "feynman.json"));

for (const needle of [
  "FEYNMAN-WORKFLOW-OUTPUT-CONTRACTS",
  "No execution",
  "workflow-specific-output-contracts",
]) {
  requireText(spec, needle, "feature spec");
}

for (const needle of [
  "FeynmanWorkflowContract",
  "FEYNMAN_WORKFLOW_CONTRACTS",
  "getFeynmanWorkflowContract",
  "renderFeynmanWorkflowContractForPrompt",
  "renderFeynmanWorkflowContractForReport",
  "requiredSections",
  "acceptanceChecks",
  "approvalBoundary",
]) {
  requireText(contracts, needle, "contract registry");
}

for (const workflow of [
  "deepresearch",
  "lit-review",
  "review",
  "audit",
  "replicate",
  "recipe",
  "compare",
  "draft",
  "autoresearch",
  "watch",
]) {
  requireText(contracts, `"${workflow}"`, `contract ${workflow}`);
}

for (const phrase of [
  "Literature evidence map",
  "Peer review verdict",
  "Claim-to-code trace",
  "Replication readiness",
  "Implementation recipe",
  "Decision matrix",
  "Draft scaffold",
  "Experiment loop proposal",
  "Watch cadence",
]) {
  requireText(contracts, phrase, "contract section vocabulary");
}

for (const needle of [
  "getFeynmanWorkflowContract",
  "renderFeynmanWorkflowContractForPrompt",
  "renderFeynmanWorkflowContractForReport",
  "## Workflow Contract",
]) {
  requireText(research, needle, "research runtime");
}

requireText(runtime, "getFeynmanWorkflowContract", "runtime check");
requireText(runtime, "runFeynmanResearch", "runtime check");
requireText(runtime, "Workflow Contract", "runtime check");

const contractCapability = parity.capabilities?.find(
  (capability) => capability.id === "workflow-specific-output-contracts",
);
if (!contractCapability) fail("source parity row workflow-specific-output-contracts is missing");
if (contractCapability.disposition !== "adapted") {
  fail("source parity row workflow-specific-output-contracts must be adapted");
}
for (const proof of [
  "lib/feynmanWorkflowContracts.ts",
  "lib/feynmanResearch.ts",
  "scripts/check-feynman-workflow-contracts-runtime.mjs",
]) {
  if (!contractCapability.proof?.includes(proof)) {
    fail(`source parity proof is missing ${proof}`);
  }
}

if (
  packageJson.scripts?.["feynman:workflow-contracts:runtime:check"] !==
  "node --no-warnings --experimental-strip-types scripts/check-feynman-workflow-contracts-runtime.mjs"
) {
  fail("package.json is missing feynman:workflow-contracts:runtime:check");
}
if (
  packageJson.scripts?.["feynman:workflow-contracts:check"] !==
  "node scripts/validate-feynman-workflow-contracts.mjs && npm run feynman:workflow-contracts:runtime:check"
) {
  fail("package.json is missing feynman:workflow-contracts:check");
}
requireText(
  packageJson.scripts?.["feynman:check"] ?? "",
  "npm run feynman:workflow-contracts:check",
  "feynman check wiring",
);
requireText(packageJson.scripts?.verify ?? "", "npm run feynman:check", "verify script");

console.log("ok feynman-workflow-output-contracts");
