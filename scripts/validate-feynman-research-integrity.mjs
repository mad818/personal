#!/usr/bin/env node
/* eslint-disable no-console */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function fail(message) {
  console.error(`x feynman-research-integrity: ${message}`);
  process.exit(1);
}

function readRequired(...parts) {
  const filePath = path.join(root, ...parts);
  if (!fs.existsSync(filePath)) fail(`${parts.join("/")} is missing`);
  return fs.readFileSync(filePath, "utf8");
}

function requireAll(source, label, values) {
  for (const value of values) {
    if (!source.includes(value)) fail(`${label} is missing ${value}`);
  }
}

const integrity = readRequired("lib", "feynmanResearchIntegrity.ts");
const engine = readRequired("lib", "feynmanResearch.ts");
const tools = readRequired("app", "api", "tools", "route.ts");
const agent = readRequired("lib", "agent.ts");
const continuity = readRequired("lib", "feynmanContinuityStore.ts");
const commands = readRequired(
  "components",
  "home",
  "office",
  "workflowCommands.ts",
);
const spec = readRequired(
  "specs",
  "features",
  "feynman-research-integrity-passport.md",
);
const analysis = readRequired(
  "docs",
  "ideas",
  "repo-analysis",
  "imbad0202-academic-research-skills",
  "REPO_CONTEXT.md",
);
const parity = JSON.parse(
  readRequired(
    "docs",
    "ideas",
    "source-parity",
    "imbad0202-academic-research-skills.json",
  ),
);
const packageJson = JSON.parse(readRequired("package.json"));

requireAll(integrity, "integrity module", [
  "FeynmanResearchIntegrityPassport",
  "parseFeynmanResearchIntegrityInput",
  "enforceFeynmanClaimEvidence",
  "enforceFeynmanExperimentProvenance",
  "buildFeynmanResearchIntegrityPassport",
  "formatFeynmanResearchIntegrityPassport",
  "no_experiments_declared",
  "experiments_declared",
  "recorded_not_replay_proof",
  "independentVerification: false",
  "experiment_provenance_unknown_id",
]);
requireAll(engine, "Feynman engine", [
  "integrityPassport",
  "experimentIds",
  "## Research Integrity Passport",
  "enforceFeynmanClaimEvidence",
  "enforceFeynmanExperimentProvenance",
]);
requireAll(tools, "protected tool", [
  "parseFeynmanResearchIntegrityInput",
  "experiment_intake_declaration",
  "experiment_provenance_json",
  "experiment integrity input is invalid",
]);
requireAll(agent, "agent tool schema", [
  "experiment_intake_declaration",
  "experiment_provenance_json",
  "Omit when the operator has not declared it.",
]);
requireAll(continuity, "continuity provenance", ["integrityPassport"]);
requireAll(commands, "workflow directive", [
  "deterministic research-integrity passport",
  "only when the operator explicitly supplied them",
]);
requireAll(spec, "feature spec", [
  "fail-closed",
  "replay proof",
  "CC BY-NC",
  "No new route",
]);
requireAll(analysis, "upstream analysis", [
  "1faf13affb74fb9b1c8598b0ad0cf3a2d7fc4279",
  "CC BY-NC",
  "Material Passport",
  "cross-model handoff",
]);

const capabilities = new Map(
  parity.capabilities.map((capability) => [capability.id, capability]),
);
for (const id of [
  "research-integrity-passport",
  "experiment-provenance-intake",
  "reproducibility-metadata",
  "data-access-and-task-type",
  "cross-model-posture-receipt",
]) {
  const capability = capabilities.get(id);
  if (
    !capability ||
    !["implemented", "adapted"].includes(capability.disposition)
  ) {
    fail(`source parity is missing adapted capability ${id}`);
  }
  if (!Array.isArray(capability.proof) || capability.proof.length === 0) {
    fail(`source parity capability ${id} is missing proof`);
  }
}
if (capabilities.has("current-suite-expansion-review")) {
  fail("broad current-suite-expansion-review placeholder must be replaced");
}
for (const id of [
  "prisma-systematic-review",
  "reviewer-panel-calibration-rereview",
  "citation-locator-faithfulness-audit",
  "ten-stage-publication-pipeline",
  "cross-model-blind-handoff-envelope",
]) {
  if (capabilities.get(id)?.disposition !== "excluded") {
    fail(`source parity must retain an explicit exclusion for ${id}`);
  }
}
if (parity.status !== "complete") {
  fail("source parity must be complete");
}

if (
  packageJson.scripts?.["feynman:integrity:runtime:check"] !==
  "node --no-warnings --experimental-strip-types scripts/check-feynman-research-integrity-runtime.mjs"
) {
  fail("package.json is missing feynman:integrity:runtime:check");
}
if (
  packageJson.scripts?.["feynman:integrity:check"] !==
  "node scripts/validate-feynman-research-integrity.mjs && npm run feynman:integrity:runtime:check"
) {
  fail("package.json is missing feynman:integrity:check");
}
if (
  !packageJson.scripts?.["feynman:check"]?.includes(
    "npm run feynman:integrity:check",
  )
) {
  fail("feynman:check is missing the integrity gate");
}

console.log(
  "ok feynman-research-integrity (typed passport, fail-closed experiment intake, continuity, and source proof)",
);
