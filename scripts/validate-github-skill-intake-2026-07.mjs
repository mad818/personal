#!/usr/bin/env node
/* eslint-disable no-console */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (relativePath) =>
  fs.readFileSync(path.join(root, relativePath), "utf8");
const fail = (message) => {
  console.error(`x github-skill-intake: ${message}`);
  process.exit(1);
};
const requireText = (text, needle, label) => {
  if (!text.includes(needle)) fail(`${label} missing ${needle}`);
};

const matrixIds = [
  "garrytan-gstack",
  "juliusbrussee-caveman",
  "openai-codex-plugin-cc",
  "pbakaus-impeccable",
  "heygen-com-hyperframes",
  "greensock-gsap-skills",
  "vercel-labs-agent-browser",
  "vercel-labs-skills",
  "jarrodwatts-claude-hud",
  "scadastrangelove-awesome-ai-security-tools",
];
const skillIds = [
  "concise-technical-output",
  "deterministic-media-production",
  "review-external-agent-skill",
  "run-status-summary",
];
const existingSources = [
  "obra/superpowers",
  "DietrichGebert/ponytail",
  "ayghri/i-have-adhd",
  "nextlevelbuilder/ui-ux-pro-max-skill",
  "leonxlnx/taste-skill",
  "emilkowalski/skills",
  "anthropics/skills",
  "Graphify-Labs/graphify",
  "mvanhorn/last30days-skill",
];

for (const id of matrixIds) {
  const matrixPath = `docs/ideas/source-parity/${id}.json`;
  const analysisPath = `docs/ideas/repo-analysis/${id}/REPO_CONTEXT.md`;
  let matrix;
  try {
    matrix = JSON.parse(read(matrixPath));
  } catch (error) {
    fail(
      `${matrixPath} is missing or invalid: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  if (matrix.status !== "complete") fail(`${id} is not complete`);
  if (!Array.isArray(matrix.capabilities) || matrix.capabilities.length < 4) {
    fail(`${id} does not have a complete capability inventory`);
  }
  if (
    matrix.capabilities.some((capability) => capability.disposition === "pending")
  ) {
    fail(`${id} still has pending capability rows`);
  }
  const analysis = read(analysisPath);
  for (const heading of [
    "## Repository Thesis",
    "## Repository Shape",
    "## Execution Model",
    "## Nexus Adaptation",
    "## Quality Signals and Risks",
  ]) {
    requireText(analysis, heading, `${id} analysis`);
  }
}

for (const id of skillIds) {
  const skill = read(`docs/ideas/skills/${id}/SKILL.md`);
  const metadata = read(`docs/ideas/skills/${id}/agents/openai.yaml`);
  requireText(skill, `name: ${id}`, `${id} skill`);
  requireText(skill, "## Verification", `${id} skill`);
  if (skill.includes("[TODO")) fail(`${id} retains initializer TODO content`);
  requireText(metadata, `$${id}`, `${id} OpenAI metadata`);
}

const spec = read("specs/features/github-skill-intake-2026-07.md");
for (const source of existingSources) {
  requireText(spec, source, "already-adapted source inventory");
}

const companyMap = read("lib/nexusCompanyMap.ts");
for (const id of [
  "garrytan-gstack",
  "juliusbrussee-caveman",
  "openai-codex-plugin-cc",
  "pbakaus-impeccable",
  "heygen-hyperframes",
  "greensock-gsap-skills",
  "vercel-agent-browser",
  "vercel-skills",
  "jarrodwatts-claude-hud",
  "awesome-ai-security-tools",
]) {
  requireText(companyMap, `id: "${id}"`, "Company Map source");
  if (companyMap.split(`"${id}"`).length < 3) {
    fail(`Company Map source ${id} is not assigned to a department`);
  }
}

for (const [relativePath, needles] of [
  [
    "docs/ideas/skills/production-engineering/using-agent-skills/SKILL.md",
    ["## Product sprint route", "observability-and-instrumentation"],
  ],
  [
    "docs/ideas/skills/production-engineering/browser-testing-with-devtools/SKILL.md",
    ["semantic structure", "accessibility and performance"],
  ],
  [
    "docs/ideas/skills/production-engineering/frontend-ui-engineering/SKILL.md",
    ["Shape the interface", "when GSAP is"],
  ],
  [
    "docs/ideas/skills/production-engineering/security-and-hardening/SKILL.md",
    ["agent skills, plugins, MCP manifests", "invisible Unicode"],
  ],
  [
    "docs/ideas/skills/production-engineering/observability-and-instrumentation/SKILL.md",
    ["`Now`, `Done`", "never"],
  ],
]) {
  const text = read(relativePath);
  for (const needle of needles) requireText(text, needle, relativePath);
}

const scripts = JSON.parse(read("package.json")).scripts ?? {};
requireText(
  String(scripts["github-skill-intake:check"] ?? ""),
  "validate-github-skill-intake-2026-07.mjs",
  "focused package command",
);
requireText(
  String(scripts.verify ?? ""),
  "npm run github-skill-intake:check",
  "canonical verification",
);

console.log(
  `ok github-skill-intake (${existingSources.length} existing, ${matrixIds.length} reviewed, ${skillIds.length} new project skills, zero pending)`,
);
