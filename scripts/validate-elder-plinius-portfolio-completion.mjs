#!/usr/bin/env node
/* eslint-disable no-console */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (relativePath) =>
  fs.readFileSync(path.join(root, relativePath), "utf8");
const readJson = (relativePath) => JSON.parse(read(relativePath));
const fail = (message) => {
  console.error(`elder-plinius portfolio validation failed: ${message}`);
  process.exit(1);
};
const requireText = (value, label) => {
  if (typeof value !== "string" || !value.trim()) fail(`${label} is required`);
  return value.trim();
};
const requireIncludes = (text, needle, label) => {
  if (!text.includes(needle)) fail(`${label} missing ${needle}`);
};

const expectedNames = [
  "CL4R1T4S",
  "L1B3RT4S",
  "G0DM0D3",
  "OBLITERATUS",
  "T3MP3ST",
  "ST3GG",
  "V3SP3R",
  "P4RS3LT0NGV3",
  "GLOSSOPETRAE",
  "CLAUDE-CODE-SYSTEM-PROMPT",
  "Google-Gemini-System-Prompt",
  "elder-plinius.github.io",
  "ENTHEA",
  "AutoTemp",
  "LEAKHUB",
  "ImageDefender",
  "Leda",
  "FABLE-SHOWCASE",
  "anthropic-quickstarts",
  "Grok-System-Prompt-Leak",
  "NATURALIS-FUTURA",
  "Misc.-Prompt-Hacks",
  "Gandalf-Solutions",
  "Dioscuri",
  "AutoRedTeam",
  "AutoStoryGen",
  "Bing-Prompt-Leak",
  "ourobopus",
  "R00TS",
  "I-LLM",
  "Eos",
  "GitGPT",
  "Mixtral-System-Prompt-Leak",
  "V3R1T4S",
  "binaural-beats-generator",
  "BasiliskToken",
  "AlmechE",
  "Gitty",
  "juice-69",
  "Google-Bard-System-Prompt",
  "Anomalous-Outputs",
  "new-repository",
  "goal-decomposition",
  "new-repository-1693784228",
  "new-repository-1693784186",
];
const allowedDispositions = new Set([
  "implemented",
  "adapted",
  "already_covered",
  "excluded",
  "insufficient_evidence",
]);

const inventory = readJson(
  "docs/ideas/repo-analysis/elder-plinius/portfolio-inventory.json",
);
const repositories = inventory.repositories;
if (!Array.isArray(repositories)) fail("repositories must be an array");
if (inventory.repositoryCount !== 45) fail("repositoryCount must equal 45");
if (repositories.length !== inventory.repositoryCount) {
  fail(
    `inventory declares ${inventory.repositoryCount} repositories but contains ${repositories.length}`,
  );
}

const names = new Set();
const urls = new Set();
for (const repository of repositories) {
  const name = requireText(repository.name, "repository name");
  const url = requireText(repository.url, `${name} url`);
  if (names.has(name)) fail(`duplicate repository name ${name}`);
  if (urls.has(url)) fail(`duplicate repository URL ${url}`);
  names.add(name);
  urls.add(url);
  if (url !== `https://github.com/elder-plinius/${name}`) {
    fail(`${name} has unexpected repository URL ${url}`);
  }
  const disposition = requireText(
    repository.disposition,
    `${name} disposition`,
  );
  if (!allowedDispositions.has(disposition)) {
    fail(`${name} has invalid disposition ${disposition}`);
  }
  requireText(repository.evidence, `${name} evidence`);
  requireText(repository.benefit, `${name} benefit`);
  requireText(repository.boundary, `${name} boundary`);
}
for (const expectedName of expectedNames) {
  if (!names.has(expectedName)) fail(`inventory missing ${expectedName}`);
}
if (names.size !== expectedNames.length) {
  fail(
    `expected ${expectedNames.length} unique repositories, found ${names.size}`,
  );
}

const naturalis = repositories.find(
  (repository) => repository.name === "NATURALIS-FUTURA",
);
if (naturalis?.disposition !== "adapted") {
  fail("NATURALIS-FUTURA must be adapted");
}
requireIncludes(naturalis.boundary, "no LICENSE file", "NATURALIS boundary");

for (const highRiskName of [
  "CL4R1T4S",
  "L1B3RT4S",
  "T3MP3ST",
  "V3SP3R",
  "ImageDefender",
  "AutoRedTeam",
  "BasiliskToken",
]) {
  const repository = repositories.find((item) => item.name === highRiskName);
  if (repository?.disposition !== "excluded") {
    fail(`${highRiskName} must remain excluded`);
  }
}

const matrix = readJson(
  "docs/ideas/source-parity/elder-plinius-portfolio.json",
);
if (matrix.status !== "complete") fail("source-parity matrix must be complete");
if (
  matrix.capabilities.some((capability) => capability.disposition === "pending")
) {
  fail("source-parity matrix still contains pending capability debt");
}
for (const capabilityId of [
  "explainable-ai-risk-countermeasures",
  "remaining-portfolio",
]) {
  const capability = matrix.capabilities.find(
    (item) => item.id === capabilityId,
  );
  if (
    !capability ||
    !["implemented", "adapted"].includes(capability.disposition)
  ) {
    fail(`${capabilityId} must be implemented or adapted`);
  }
}

const registry = read("lib/nexusCompanyMap.ts");
if (
  registry.split('id: "pliny-naturalis-futura"').length - 1 !== 1 ||
  registry.split("https://github.com/elder-plinius/NATURALIS-FUTURA").length -
    1 !==
    1
) {
  fail("Company Map must contain one NATURALIS FUTURA source");
}
for (const phrase of [
  "technical threat",
  "concrete mitigations",
  "verification evidence",
  "analogies are explanation aids",
  "no LICENSE file",
]) {
  requireIncludes(registry, phrase, "Company Map NATURALIS guidance");
}

const spec = read("specs/features/elder-plinius-portfolio-completion.md");
for (const phrase of [
  "exactly 45",
  "Research & Knowledge",
  "Legal & Trust",
  "No phone/PWA or private RPG path",
]) {
  requireIncludes(spec, phrase, "portfolio completion spec");
}

const packageJson = readJson("package.json");
requireIncludes(
  packageJson.scripts?.["elder-plinius:portfolio:check"] ?? "",
  "validate-elder-plinius-portfolio-completion",
  "focused package script",
);
requireIncludes(
  packageJson.scripts?.verify ?? "",
  "npm run elder-plinius:portfolio:check",
  "canonical verify wiring",
);

console.log(
  `Elder Plinius portfolio OK (${repositories.length} repositories, complete matrix, one bounded NATURALIS FUTURA adaptation).`,
);
