#!/usr/bin/env node
/* eslint-disable no-console */

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const skillRoot = path.join(
  root,
  "docs",
  "ideas",
  "skills",
  "production-engineering",
);
const expectedSkills = [
  "api-and-interface-design",
  "browser-testing-with-devtools",
  "ci-cd-and-automation",
  "code-review-and-quality",
  "code-simplification",
  "context-engineering",
  "debugging-and-error-recovery",
  "deprecation-and-migration",
  "documentation-and-adrs",
  "doubt-driven-development",
  "frontend-ui-engineering",
  "git-workflow-and-versioning",
  "idea-refine",
  "incremental-implementation",
  "interview-me",
  "observability-and-instrumentation",
  "performance-optimization",
  "planning-and-task-breakdown",
  "security-and-hardening",
  "shipping-and-launch",
  "source-driven-development",
  "spec-driven-development",
  "test-driven-development",
  "using-agent-skills",
].sort();

function fail(message) {
  console.error(`x production-skill-lifecycle: ${message}`);
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

function parseFrontmatter(source, label) {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!match) fail(`${label} has invalid frontmatter`);
  const fields = new Map();
  for (const line of match[1].split(/\r?\n/)) {
    const field = line.match(/^([a-z][a-z0-9_-]*):\s*(.+)$/);
    if (!field) fail(`${label} has malformed frontmatter line: ${line}`);
    if (fields.has(field[1])) fail(`${label} duplicates ${field[1]}`);
    fields.set(field[1], field[2].trim());
  }
  if (
    fields.size !== 2 ||
    !fields.has("name") ||
    !fields.has("description")
  ) {
    fail(`${label} frontmatter must contain only name and description`);
  }
  return fields;
}

function readQuotedYamlValue(source, key, label) {
  const match = source.match(new RegExp(`^\\s{2}${key}:\\s+\"([^\"]+)\"\\s*$`, "m"));
  if (!match) fail(`${label} is missing quoted interface.${key}`);
  return match[1];
}

if (!fs.existsSync(skillRoot)) fail("production-engineering skill root is missing");
const actualSkills = fs
  .readdirSync(skillRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();
if (JSON.stringify(actualSkills) !== JSON.stringify(expectedSkills)) {
  fail(
    `exact skill inventory drifted: expected ${expectedSkills.length}, found ${actualSkills.length}`,
  );
}

let dependencyCount = 0;
for (const skillName of expectedSkills) {
  const relativeRoot = path.join(
    "docs",
    "ideas",
    "skills",
    "production-engineering",
    skillName,
  );
  const skill = readRequired(relativeRoot, "SKILL.md");
  const label = `${skillName}/SKILL.md`;
  const fields = parseFrontmatter(skill, label);
  if (fields.get("name") !== skillName) {
    fail(`${label} name must match its directory`);
  }
  const description = fields.get("description") ?? "";
  if (!description.includes("Use when ")) {
    fail(`${label} description must include explicit Use when triggers`);
  }
  if (description.length > 1024) fail(`${label} description exceeds 1024 characters`);
  for (const needle of [
    "## Overview",
    "## Authority boundaries",
    "## Stop conditions",
    "## Verification",
    "- [ ]",
  ]) {
    requireText(skill, needle, label);
  }
  if (!skill.includes("## Workflow") && !skill.includes("## Routing workflow")) {
    fail(`${label} requires an ordered workflow`);
  }
  if (/\[TODO:|TODO items?|TODO placeholders?/i.test(skill)) {
    fail(`${label} still contains a template TODO`);
  }
  if (/^allowed-tools:/m.test(skill)) {
    fail(`${label} must not grant tools through frontmatter`);
  }

  const references =
    skill.match(
      /@docs\/ideas\/skills\/production-engineering\/[a-z0-9-]+\/SKILL\.md/g,
    ) ?? [];
  if (skillName === "using-agent-skills") {
    if (references.length !== expectedSkills.length - 1) {
      fail(`using-agent-skills must reference the other 23 workflows exactly once`);
    }
    const targets = references
      .map((reference) => reference.split("/").at(-2))
      .sort();
    const expectedTargets = expectedSkills
      .filter((candidate) => candidate !== "using-agent-skills")
      .sort();
    if (JSON.stringify(targets) !== JSON.stringify(expectedTargets)) {
      fail("using-agent-skills dependency inventory drifted");
    }
    dependencyCount += references.length;
  } else if (references.length > 0) {
    fail(`${label} must not create cross-skill dependency cycles`);
  }

  const metadata = readRequired(relativeRoot, "agents", "openai.yaml");
  requireText(metadata, "interface:", `${skillName}/agents/openai.yaml`);
  const displayName = readQuotedYamlValue(
    metadata,
    "display_name",
    `${skillName}/agents/openai.yaml`,
  );
  const shortDescription = readQuotedYamlValue(
    metadata,
    "short_description",
    `${skillName}/agents/openai.yaml`,
  );
  const defaultPrompt = readQuotedYamlValue(
    metadata,
    "default_prompt",
    `${skillName}/agents/openai.yaml`,
  );
  if (!displayName.trim()) fail(`${skillName} display name is empty`);
  if (shortDescription.length < 25 || shortDescription.length > 64) {
    fail(`${skillName} short description must be 25-64 characters`);
  }
  if (!defaultPrompt.includes(`$${skillName}`)) {
    fail(`${skillName} default prompt must name $${skillName}`);
  }
}

const agents = readRequired("AGENTS.md");
requireText(
  agents,
  "docs/ideas/skills/production-engineering/using-agent-skills/SKILL.md",
  "AGENTS.md routing",
);

const repoContext = readRequired(
  "docs",
  "ideas",
  "repo-analysis",
  "addyosmani-agent-skills",
  "REPO_CONTEXT.md",
);
const repoResponse = readRequired(
  "docs",
  "ideas",
  "repo-analysis",
  "addyosmani-agent-skills",
  "response.md",
);
requireText(repoContext, "24 skills", "repository analysis");
requireText(repoContext, "strategic remote review", "repository analysis");
requireText(repoResponse, "24-skill", "repository analysis response");

const matrix = JSON.parse(
  readRequired("docs", "ideas", "source-parity", "addyosmani-agent-skills.json"),
);
if (matrix.status !== "complete") fail("source-parity matrix must be complete");
if (matrix.source?.version !== "main-2026-07-26") {
  fail("source-parity matrix must use the current main review");
}
if (matrix.source?.license !== "MIT") fail("source-parity license must be MIT");
for (const skillName of expectedSkills) {
  const capability = matrix.capabilities?.find(
    (item) => item.id === `skill-${skillName}`,
  );
  if (capability?.disposition !== "adapted") {
    fail(`source parity must adapt skill-${skillName}`);
  }
  const proof = `docs/ideas/skills/production-engineering/${skillName}/SKILL.md`;
  if (!capability.proof?.includes(proof)) {
    fail(`skill-${skillName} must cite ${proof}`);
  }
}
if (matrix.capabilities?.some((item) => item.disposition === "pending")) {
  fail("source parity must not leave pending capabilities");
}

const packageJson = JSON.parse(readRequired("package.json"));
if (
  packageJson.scripts?.["production:skills:check"] !==
  "node scripts/validate-production-skill-lifecycle.mjs"
) {
  fail("package.json is missing production:skills:check");
}
requireText(
  packageJson.scripts?.verify ?? "",
  "npm run production:skills:check",
  "canonical verify",
);

console.log(
  `ok production-skill-lifecycle (${expectedSkills.length} workflows, ${dependencyCount} acyclic meta dependencies, complete metadata and parity)`,
);
