#!/usr/bin/env node
/* eslint-disable no-console */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function fail(message) {
  console.error(`x mengto-skill-atlas: ${message}`);
  process.exit(1);
}

function read(relativePath) {
  const fullPath = path.join(root, relativePath);
  if (!fs.existsSync(fullPath)) fail(`missing ${relativePath}`);
  return fs.readFileSync(fullPath, "utf8");
}

function requireAll(text, label, needles) {
  for (const needle of needles) {
    if (!text.includes(needle)) fail(`${label} is missing ${needle}`);
  }
}

const atlas = read("lib/designSkillAtlas.ts");
const component = read("components/skills/DesignSkillAtlas.tsx");
const page = read("app/skills/page.tsx");
const agent = read("lib/agent.ts");
const toolsRoute = read("app/api/tools/route.ts");
const toolPolicy = read("lib/security/toolCapabilityPolicy.ts");
const chatRouting = read("lib/chatCapabilityRouting.ts");
const ai = read("lib/ai.ts");
const companyMap = read("lib/nexusCompanyMap.ts");
const ecosystem = read("docs/ideas/assimilated-ecosystem.md");
const spec = read("specs/features/mengto-skill-atlas.md");
const tasks = read("tasks/todo.md");
const packageJson = read("package.json");

for (const relativePath of [
  "docs/ideas/repo-analysis/mengto-skills/REPO_CONTEXT.md",
  "docs/ideas/repo-analysis/mengto-skills/AGENTS.md",
  "docs/ideas/repo-analysis/mengto-skills/.cursorrules",
  "docs/ideas/repo-analysis/mengto-skills/response.md",
]) {
  read(relativePath);
}

requireAll(atlas, "atlas", [
  "DESIGN_SKILLS",
  "listDesignSkills",
  "resolveDesignSkill",
  "formatDesignSkillList",
  "formatDesignSkillContract",
  "connector_required",
  "host_required",
  "dependency_review",
  "does not authorize installs",
]);
requireAll(component, "Skill Library atlas", [
  'data-testid="design-skill-atlas"',
  "Builder procedure atlas",
  "project-owned procedures",
  "Requirements",
  "Inputs",
  "Workflow",
  "Guardrails",
  "Acceptance checks",
  "Open primary source",
]);
requireAll(page, "Skills route", [
  'import("@/components/skills/DesignSkillAtlas")',
  "<DesignSkillAtlas />",
  'title="Builder procedure atlas"',
]);
requireAll(agent, "agent catalog", [
  'name: "list_design_skills"',
  'name: "resolve_design_skill"',
  'names.add("list_design_skills")',
  'names.add("resolve_design_skill")',
  "DESIGN_SKILL_INTENT_RE",
  "complete project-owned builder procedure atlas",
]);
requireAll(toolsRoute, "protected tools route", [
  "formatDesignSkillList",
  "formatDesignSkillContract",
  'case "list_design_skills":',
  'case "resolve_design_skill":',
]);
requireAll(toolPolicy, "tool capability policy", [
  'list_design_skills: "read"',
  'resolve_design_skill: "read"',
]);
requireAll(chatRouting, "tool route mapping", [
  'list_design_skills: "/internal/skills"',
  'resolve_design_skill: "/internal/skills"',
]);
requireAll(ai, "assistant prompt", [
  "list_design_skills(query?, category?, family?, availability?, limit?)",
  "resolve_design_skill(skill)",
  "active project-owned builder procedure",
]);
requireAll(companyMap, "Company Map", [
  'id: "mengto-skills"',
  'label: "MengTo Builder Skills"',
  "complete 101-procedure builder atlas",
  "list_design_skills then resolve_design_skill",
]);
requireAll(ecosystem, "ecosystem benefits", [
  "[MengTo/Skills](https://github.com/MengTo/Skills)",
  "101 complete project-owned operating contracts",
  "20 source-specific capabilities remain evidence-only",
]);
requireAll(spec, "feature spec", [
  "Current folder inventory: 121 source skills",
  "Active project target: 101",
  "Evidence-only source target: 20",
  "External-account and platform-specific workflows",
]);
requireAll(tasks, "task plan", [
  "MENGTO-SKILL-ATLAS",
  "Inventory all 121 current upstream skill folders",
  "Keep all 20 source-specific capabilities evidence-only",
]);
requireAll(packageJson, "package wiring", [
  '"mengto:skills:runtime:check"',
  '"mengto:skills:check"',
  "npm run mengto:skills:check",
]);

const parity = JSON.parse(read("docs/ideas/source-parity/mengto-skills.json"));
if (parity.status !== "complete") fail("source parity must be complete");
if (parity.source?.license !== "MIT") fail("source parity license must be MIT");
if (!Array.isArray(parity.capabilities) || parity.capabilities.length !== 121) {
  fail("source parity must contain exactly 121 capability rows");
}
const ids = parity.capabilities.map((capability) => capability.id);
if (new Set(ids).size !== 121) fail("source parity IDs must be unique");
const adapted = parity.capabilities.filter(
  (capability) => capability.disposition === "adapted",
);
const excluded = parity.capabilities.filter(
  (capability) => capability.disposition === "excluded",
);
const pending = parity.capabilities.filter(
  (capability) => capability.disposition === "pending",
);
if (adapted.length !== 101) fail("source parity must adapt exactly 101 rows");
if (excluded.length !== 20) fail("source parity must exclude exactly 20 rows");
if (pending.length !== 0) fail("source parity must have zero pending rows");
if (excluded.some((capability) => capability.conflict !== "product_purpose")) {
  fail("every evidence-only source row must use product_purpose");
}
if (
  adapted.some((capability) =>
    /(?:^|-)game(?:-|$)|arpg|fog-of-war/i.test(capability.id),
  )
) {
  fail("product-purpose source IDs must remain evidence-only");
}

console.log(
  `ok mengto-skill-atlas-static (source=${parity.capabilities.length}; adapted=${adapted.length}; evidence-only=${excluded.length})`,
);
