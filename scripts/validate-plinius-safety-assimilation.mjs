#!/usr/bin/env node
/* eslint-disable no-console */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function fail(message) {
  console.error(`x plinius-safety: ${message}`);
  process.exit(1);
}

function read(relativePath) {
  const fullPath = path.join(root, relativePath);
  if (!fs.existsSync(fullPath)) fail(`${relativePath} is missing`);
  return fs.readFileSync(fullPath, "utf8");
}

function assertIncludes(text, needle, label) {
  if (!text.includes(needle)) fail(`${label} must include ${needle}`);
}

function readJson(relativePath) {
  try {
    return JSON.parse(read(relativePath));
  } catch (error) {
    fail(`${relativePath} is invalid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
}

const packageJson = readJson("package.json");
const scripts = packageJson.scripts ?? {};
if (scripts["plinius:safety:check"] !== "node scripts/validate-plinius-safety-assimilation.mjs && npm run plinius:safety:runtime:check") {
  fail("package.json must expose plinius:safety:check");
}
if (scripts["plinius:safety:runtime:check"] !== "node --no-warnings --experimental-strip-types scripts/check-plinius-safety-runtime.mjs") {
  fail("package.json must expose plinius:safety:runtime:check");
}
assertIncludes(scripts.verify ?? "", "npm run plinius:safety:check", "verify script");

const taxonomy = read("lib/promptThreatTaxonomy.ts");
[
  "PromptThreatFamily",
  "PromptThreatAssessment",
  "assessPromptThreat",
  "normalizePromptThreatInput",
  "buildPromptThreatSummary",
  "system_prompt_extraction",
  "authority_spoofing",
  "context_reset",
  "boundary_inversion",
  "obfuscated_text",
  "invisible_unicode",
  "multi_model_jailbreak_racing",
  "unsafe_hardware_tool_control",
].forEach((needle) => assertIncludes(taxonomy, needle, "prompt threat taxonomy"));

const prompts = read("components/home/office/prompts.ts");
assertIncludes(prompts, "buildPromptThreatSummary", "Home office prompts");
assertIncludes(prompts, "${buildPromptThreatSummary()}", "Home office injection guard");

const contracts = read("lib/assimilation/contracts.ts");
assertIncludes(contracts, "sourceFamilies", "Model Lab request contract");
assertIncludes(contracts, "threatProbe", "Model Lab request contract");

const types = read("lib/assimilation/types.ts");
assertIncludes(types, "sourceFamilies?: string[]", "Model Lab run type");
assertIncludes(types, "threatAssessment?: PromptThreatAssessment", "Model Lab manifest type");

const modelSafety = read("lib/modelSafetyEvaluation.ts");
[
  "assessPromptThreat",
  "sourceFamilies",
  "threatAssessment",
  "localOnly: true",
  "evidenceOnly: true",
  "telemetry: \"disabled\"",
  "modelMutation: \"disabled\"",
  "steeringVectors: \"disabled\"",
].forEach((needle) => assertIncludes(modelSafety, needle, "Model safety evaluation"));

const route = read("app/api/model-lab/route.ts");
assertIncludes(route, "sourceFamilies: parsed.data.sourceFamilies", "Model Lab route");
assertIncludes(route, "threatProbe: parsed.data.threatProbe", "Model Lab route");
assertIncludes(route, "No raw jailbreak prompts", "Model Lab route warning");

const blacksite = read("components/skills/BlacksiteLab.tsx");
assertIncludes(blacksite, "SOURCE_FAMILIES", "Blacksite Lab UI");
assertIncludes(blacksite, "threatProbe", "Blacksite Lab UI");
assertIncludes(blacksite, "sourceFamilies: selectedSourceFamilies", "Blacksite Lab UI");

const requiredMatrices = [
  "cl4r1t4s",
  "l1b3rt4s",
  "g0dm0d3",
  "v3sp3r",
  "obliteratus",
];

for (const id of requiredMatrices) {
  const relativePath = `docs/ideas/source-parity/${id}.json`;
  const matrix = readJson(relativePath);
  if (matrix.id !== id) fail(`${relativePath} must use id ${id}`);
  if (matrix.status !== "complete") fail(`${relativePath} must be complete`);
  if (!matrix.source?.reviewedAt?.startsWith("2026-06-16")) {
    fail(`${relativePath} must be reviewed on 2026-06-16`);
  }
  if (!Array.isArray(matrix.source?.primaryEvidence) || matrix.source.primaryEvidence.length === 0) {
    fail(`${relativePath} requires primary evidence`);
  }
  if (!Array.isArray(matrix.capabilities) || matrix.capabilities.length < 4) {
    fail(`${relativePath} requires an exhaustive capability set`);
  }
  const pending = matrix.capabilities.filter((capability) => capability.disposition === "pending");
  if (pending.length) fail(`${relativePath} still has pending capabilities`);
}

const dangerousCapabilityIds = new Map([
  ["cl4r1t4s", ["raw-leaked-system-prompts"]],
  ["l1b3rt4s", ["raw-jailbreak-prompt-corpus"]],
  ["g0dm0d3", ["openrouter-remote-runtime", "public-dataset-telemetry"]],
  ["v3sp3r", ["flipper-hardware-control", "payload-generation-and-execution"]],
  ["obliteratus", ["weight-projection", "steering-vectors", "modified-model-export"]],
]);

for (const [id, capabilityIds] of dangerousCapabilityIds) {
  const matrix = readJson(`docs/ideas/source-parity/${id}.json`);
  for (const capabilityId of capabilityIds) {
    const capability = matrix.capabilities.find((item) => item.id === capabilityId);
    if (!capability) fail(`${id} must account for ${capabilityId}`);
    if (capability.disposition !== "excluded") {
      fail(`${id}/${capabilityId} must remain excluded`);
    }
  }
}

console.log("ok plinius-safety static assimilation checks");
