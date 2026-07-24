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
  if (!fs.existsSync(filePath)) fail(`${parts.join("/")} is missing`);
  return fs.readFileSync(filePath, "utf8");
}

function requireText(source, needle, label) {
  if (!source.includes(needle)) fail(`${label} is missing ${needle}`);
}

const spec = readRequired(
  "specs",
  "features",
  "feynman-workflow-output-contracts.md",
);
const gapSpec = readRequired(
  "specs",
  "features",
  "feynman-literature-gap-map.md",
);
const contracts = readRequired("lib", "feynmanWorkflowContracts.ts");
const research = readRequired("lib", "feynmanResearch.ts");
const runtime = readRequired(
  "scripts",
  "check-feynman-workflow-contracts-runtime.mjs",
);
const packageJson = JSON.parse(readRequired("package.json"));
const parity = JSON.parse(
  readRequired("docs", "ideas", "source-parity", "feynman.json"),
);
const academicParity = JSON.parse(
  readRequired(
    "docs",
    "ideas",
    "source-parity",
    "imbad0202-academic-research-skills.json",
  ),
);

for (const needle of [
  "Feynman workflow output contracts",
  "No execution",
  "ten research workflows",
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
  "writerInstructions",
  "verifierChecks",
  "reviewerChecks",
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
  requireText(contracts, `workflow: "${workflow}"`, `contract ${workflow}`);
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
  "Explicit operator approval is required",
  "Literature gap map",
  "observed coverage gap or possible research opportunity",
  "directly read source cluster",
  "novelty overreach",
  "competing explanation",
]) {
  requireText(contracts, phrase, "contract section vocabulary");
}

for (const phrase of [
  "Feynman literature gap map",
  "CC BY-NC 4.0",
  "No upstream prompt",
  "No autonomous novelty determination",
]) {
  requireText(gapSpec, phrase, "literature gap-map spec");
}

for (const needle of [
  "getFeynmanWorkflowContract",
  "renderFeynmanWorkflowContractForPrompt",
  "renderFeynmanWorkflowContractForReport",
  "WORKFLOW OUTPUT CONTRACT",
  "## Workflow Contract",
  "buildFeynmanVerificationPrompt(workflow",
]) {
  requireText(research, needle, "research runtime");
}

for (const forbidden of ["fetch(", "callAI", "writeFile", "node:fs"]) {
  if (contracts.includes(forbidden)) {
    fail(`contract registry contains forbidden runtime behavior ${forbidden}`);
  }
}

requireText(runtime, "getFeynmanWorkflowContract", "runtime check");
requireText(runtime, "runFeynmanResearch", "runtime check");
requireText(runtime, "seenWriterContracts", "three-stage runtime proof");
requireText(runtime, "degraded.report", "degraded fallback proof");
requireText(runtime, "degradedGapMap.report", "gap-map fallback proof");

const contractCapability = parity.capabilities?.find(
  (capability) => capability.id === "workflow-specific-output-contracts",
);
if (!contractCapability)
  fail("source parity row workflow-specific-output-contracts is missing");
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
if (parity.status !== "in_progress") {
  fail("broader Feynman source parity must remain in_progress");
}

if (
  academicParity.source?.version !==
    "v3.19.0 at 1788e08155d24da729233e3e4b480ffb53d799c6" ||
  academicParity.source?.license !== "CC-BY-NC-4.0"
) {
  fail(
    "academic-research-skills source version and license evidence are stale",
  );
}
const gapCapability = academicParity.capabilities?.find(
  (capability) => capability.id === "literature-gap-analysis-skill",
);
if (gapCapability?.disposition !== "adapted") {
  fail("literature-gap-analysis-skill must be adapted");
}
for (const proof of [
  "lib/feynmanWorkflowContracts.ts",
  "lib/feynmanResearch.ts",
  "scripts/check-feynman-workflow-contracts-runtime.mjs",
  "specs/features/feynman-literature-gap-map.md",
]) {
  if (!gapCapability.proof?.includes(proof)) {
    fail(`literature gap-map proof is missing ${proof}`);
  }
}
const suiteReview = academicParity.capabilities?.find(
  (capability) => capability.id === "current-suite-expansion-review",
);
if (
  academicParity.status !== "in_progress" ||
  suiteReview?.disposition !== "pending"
) {
  fail("current academic-research-skills suite expansion must remain pending");
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
  "Feynman check wiring",
);
requireText(
  packageJson.scripts?.verify ?? "",
  "npm run feynman:check",
  "verify script",
);

console.log(
  "ok feynman-workflow-output-contracts (typed registry, three-stage prompt contract, report receipt, parity wiring)",
);
