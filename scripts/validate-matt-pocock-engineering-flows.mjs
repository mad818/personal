#!/usr/bin/env node
/* eslint-disable no-console */

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const relativeSkillRoot = path.join(
  "docs",
  "ideas",
  "skills",
  "mattpocock-engineering",
);
const skillRoot = path.join(root, relativeSkillRoot);
const userInvokedSkills = [
  "ask-matt",
  "grill-me",
  "grill-with-docs",
  "handoff",
  "implement",
  "improve-codebase-architecture",
  "setup-matt-pocock-skills",
  "teach",
  "to-spec",
  "to-tickets",
  "triage",
  "wayfinder",
  "writing-great-skills",
].sort();
const modelInvokedSkills = [
  "domain-modeling",
  "prototype",
  "resolving-merge-conflicts",
].sort();
const expectedSkills = [...userInvokedSkills, ...modelInvokedSkills].sort();
const currentUpstreamSkills = [
  "ask-matt",
  "code-review",
  "codebase-design",
  "diagnosing-bugs",
  "domain-modeling",
  "grill-me",
  "grill-with-docs",
  "grilling",
  "handoff",
  "implement",
  "improve-codebase-architecture",
  "prototype",
  "research",
  "resolving-merge-conflicts",
  "setup-matt-pocock-skills",
  "tdd",
  "teach",
  "to-spec",
  "to-tickets",
  "triage",
  "wayfinder",
  "writing-great-skills",
].sort();

function fail(message) {
  console.error(`x mattpocock-engineering-flows: ${message}`);
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
  const match = source.match(
    new RegExp(`^\\s{2}${key}:\\s+"([^"]+)"\\s*$`, "m"),
  );
  if (!match) fail(`${label} is missing quoted interface.${key}`);
  return match[1];
}

function skillReferences(source) {
  return (
    source.match(
      /@docs\/ideas\/skills\/(?:mattpocock-engineering|production-engineering)\/[a-z0-9-]+\/SKILL\.md/g,
    ) ?? []
  );
}

function localTarget(reference) {
  const match = reference.match(
    /@docs\/ideas\/skills\/mattpocock-engineering\/([a-z0-9-]+)\/SKILL\.md/,
  );
  return match?.[1] ?? null;
}

function assertAcyclic(graph) {
  const visiting = new Set();
  const visited = new Set();

  function visit(node, trail) {
    if (visiting.has(node)) {
      fail(`skill dependency cycle detected: ${[...trail, node].join(" -> ")}`);
    }
    if (visited.has(node)) return;
    visiting.add(node);
    for (const target of graph.get(node) ?? []) {
      visit(target, [...trail, node]);
    }
    visiting.delete(node);
    visited.add(node);
  }

  for (const node of graph.keys()) visit(node, []);
}

if (!fs.existsSync(skillRoot)) fail("mattpocock-engineering skill root is missing");
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

const dependencyGraph = new Map();
let dependencyCount = 0;
for (const skillName of expectedSkills) {
  const relativeRoot = path.join(relativeSkillRoot, skillName);
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
  if (description.length > 1024) {
    fail(`${label} description exceeds 1024 characters`);
  }
  for (const needle of [
    "## Overview",
    "## Authority boundaries",
    "## Workflow",
    "## Stop conditions",
    "## Verification",
    "- [ ]",
  ]) {
    requireText(skill, needle, label);
  }
  if (/\[TODO:|TODO items?|TODO placeholders?/i.test(skill)) {
    fail(`${label} still contains a template TODO`);
  }
  if (/^allowed-tools:/m.test(skill)) {
    fail(`${label} must not grant tools through frontmatter`);
  }

  const references = skillReferences(skill);
  if (new Set(references).size !== references.length) {
    fail(`${label} duplicates a skill dependency`);
  }
  const localTargets = references.map(localTarget).filter(Boolean);
  dependencyGraph.set(skillName, localTargets);
  dependencyCount += references.length;

  if (skillName === "ask-matt") {
    const expectedTargets = userInvokedSkills.filter(
      (candidate) => candidate !== "ask-matt",
    );
    if (
      JSON.stringify([...localTargets].sort()) !==
      JSON.stringify(expectedTargets)
    ) {
      fail("ask-matt must reference the other 12 user-invoked flows exactly");
    }
  }

  const metadata = readRequired(relativeRoot, "agents", "openai.yaml");
  const metadataLabel = `${skillName}/agents/openai.yaml`;
  requireText(metadata, "interface:", metadataLabel);
  const displayName = readQuotedYamlValue(metadata, "display_name", metadataLabel);
  const shortDescription = readQuotedYamlValue(
    metadata,
    "short_description",
    metadataLabel,
  );
  const defaultPrompt = readQuotedYamlValue(
    metadata,
    "default_prompt",
    metadataLabel,
  );
  if (!displayName.trim()) fail(`${skillName} display name is empty`);
  if (shortDescription.length < 25 || shortDescription.length > 64) {
    fail(`${skillName} short description must be 25-64 characters`);
  }
  if (!defaultPrompt.includes(`$${skillName}`)) {
    fail(`${skillName} default prompt must name $${skillName}`);
  }

  const disablesImplicit =
    /policy:\r?\n\s{2}allow_implicit_invocation:\s+false\s*$/m.test(metadata);
  if (userInvokedSkills.includes(skillName) && !disablesImplicit) {
    fail(`${metadataLabel} must disable implicit invocation`);
  }
  if (modelInvokedSkills.includes(skillName) && disablesImplicit) {
    fail(`${metadataLabel} must remain model-invokable`);
  }
}
assertAcyclic(dependencyGraph);

const agents = readRequired("AGENTS.md");
requireText(
  agents,
  "docs/ideas/skills/mattpocock-engineering/ask-matt/SKILL.md",
  "AGENTS.md routing",
);

const repoContext = readRequired(
  "docs",
  "ideas",
  "repo-analysis",
  "mattpocock-skills",
  "REPO_CONTEXT.md",
);
const repoResponse = readRequired(
  "docs",
  "ideas",
  "repo-analysis",
  "mattpocock-skills",
  "response.md",
);
requireText(repoContext, "22 skills", "repository analysis");
requireText(repoContext, "13 explicit", "repository analysis");
requireText(repoContext, "user-invoked", "repository analysis");
requireText(repoContext, "strategic remote review", "repository analysis");
requireText(repoResponse, "22-skill", "repository analysis response");

const matrix = JSON.parse(
  readRequired("docs", "ideas", "source-parity", "mattpocock-skills.json"),
);
if (matrix.status !== "complete") fail("source-parity matrix must be complete");
if (matrix.source?.version !== "main-1.1.0-2026-07-26") {
  fail("source-parity matrix must use the current main review");
}
if (matrix.source?.license !== "MIT") fail("source-parity license must be MIT");
for (const skillName of currentUpstreamSkills) {
  const capability = matrix.capabilities?.find(
    (item) => item.id === `skill-${skillName}`,
  );
  if (capability?.disposition !== "adapted") {
    fail(`source parity must adapt skill-${skillName}`);
  }
  if (!Array.isArray(capability.proof) || capability.proof.length === 0) {
    fail(`skill-${skillName} requires project proof`);
  }
}
for (const capabilityId of [
  "cross-host-installer",
  "claude-plugin-distribution",
  "historical-setup-ts-deep-modules",
]) {
  const capability = matrix.capabilities?.find(
    (item) => item.id === capabilityId,
  );
  if (
    capability?.disposition !== "excluded" ||
    capability.conflict !== "product_purpose"
  ) {
    fail(`${capabilityId} must remain an explicit product-purpose exclusion`);
  }
}
const invocationContract = matrix.capabilities?.find(
  (item) => item.id === "user-and-model-invocation-layers",
);
if (invocationContract?.disposition !== "adapted") {
  fail("source parity must adapt the user/model invocation contract");
}
if (matrix.capabilities?.some((item) => item.disposition === "pending")) {
  fail("source parity must not leave pending capabilities");
}

const packageJson = JSON.parse(readRequired("package.json"));
if (
  packageJson.scripts?.["mattpocock:skills:check"] !==
  "node scripts/validate-matt-pocock-engineering-flows.mjs"
) {
  fail("package.json is missing mattpocock:skills:check");
}
requireText(
  packageJson.scripts?.verify ?? "",
  "npm run mattpocock:skills:check",
  "canonical verify",
);

console.log(
  `ok mattpocock-engineering-flows (${userInvokedSkills.length} explicit, ${modelInvokedSkills.length} reusable, ${dependencyCount} acyclic dependencies, 22 current upstream workflows reconciled)`,
);
