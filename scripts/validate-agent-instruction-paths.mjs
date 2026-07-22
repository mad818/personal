#!/usr/bin/env node
/* eslint-disable no-console */

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function fail(message) {
  console.error(`x agent-instruction-paths: ${message}`);
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

function forbidText(source, needle, label) {
  if (source.includes(needle)) fail(`${label} must not include ${needle}`);
}

function major(version) {
  const match = String(version ?? "").match(/(\d+)/);
  return match ? Number.parseInt(match[1], 10) : null;
}

const agents = readRequired("AGENTS.md");
const claude = readRequired("CLAUDE.md");
const packageJson = JSON.parse(readRequired("package.json"));
const releaseMatrix = JSON.parse(readRequired("lib", "release-matrix.json"));
const secondBrain = readRequired("SECOND_BRAIN.md");
const handoff = readRequired("docs", "AGENT_HANDOFF.md");
const todo = readRequired("tasks", "todo.md");
const lessons = readRequired("tasks", "lessons.md");

if (major(packageJson.dependencies?.next) !== 15) {
  fail("package.json Next.js major changed; reconcile AGENTS.md and this gate");
}
if (major(packageJson.dependencies?.react) !== 19) {
  fail("package.json React major changed; reconcile AGENTS.md and this gate");
}
requireText(agents, "React 19 / Next.js 15", "AGENTS.md framework line");
requireText(
  agents,
  "package manifest is authoritative for exact patch versions",
  "AGENTS.md version boundary",
);
requireText(
  handoff,
  "Next.js 15 / React 19 is the active application stack",
  "canonical handoff framework line",
);
requireText(
  handoff,
  "legacy HTML app is archived under `archive/`",
  "canonical handoff active-app boundary",
);
forbidText(
  handoff,
  "Next.js 14 app is the active surface",
  "canonical handoff",
);
forbidText(
  handoff,
  "`nexus-final.html` remains as legacy reference",
  "canonical handoff",
);

const expectedSurfaces = new Map([
  ["/hq", "app/hq/page.tsx"],
  ["/command", "app/command/page.tsx"],
  ["/intel", "app/intel/page.tsx"],
  ["/alpha", "app/alpha/page.tsx"],
  ["/cyber", "app/cyber/page.tsx"],
  ["/recon", "app/recon/page.tsx"],
  ["/vault", "app/vault/page.tsx"],
  ["/resources", "app/resources/page.tsx"],
]);
const gaHrefs = releaseMatrix.surfaces
  .filter((surface) => surface.tier === "ga")
  .map((surface) => surface.href)
  .sort();
if (
  JSON.stringify(gaHrefs) !==
  JSON.stringify([...expectedSurfaces.keys()].sort())
) {
  fail("canonical GA route matrix changed; reconcile the AGENTS.md tab map");
}
for (const [href, pageFile] of expectedSurfaces) {
  requireText(agents, `\`${href}\``, "AGENTS.md tab map");
  requireText(agents, `\`${pageFile}\``, "AGENTS.md tab map");
  if (!fs.existsSync(path.join(root, pageFile))) fail(`${pageFile} is missing`);
}

const expectedSkills = [
  ".agents/skills/add-feature/SKILL.md",
  ".agents/skills/add-tab/SKILL.md",
  ".agents/skills/add-api/SKILL.md",
  ".agents/skills/fix-bug/SKILL.md",
];
for (const skillPath of expectedSkills) {
  requireText(agents, `\`${skillPath}\``, "AGENTS.md skill table");
  if (!fs.existsSync(path.join(root, skillPath)))
    fail(`${skillPath} is missing`);
  const guidePath = path.join(path.dirname(skillPath), "GUIDE.md");
  if (!fs.existsSync(path.join(root, guidePath)))
    fail(`${guidePath} is missing`);
}

for (const forbidden of [
  ".Codex/",
  "Next.js 14",
  "React 18",
  "| /home",
  "New feature in nexus-final.html",
  "Any bug in nexus-final.html",
]) {
  forbidText(agents, forbidden, "AGENTS.md");
}
requireText(agents, ".claude/rules/", "AGENTS.md legacy boundary");
requireText(
  agents,
  "legacy compatibility material",
  "AGENTS.md legacy boundary",
);
requireText(claude, "legacy compatibility pointer", "CLAUDE.md boundary");
requireText(claude, "AGENTS.md", "CLAUDE.md authority pointer");
requireText(claude, "Do not expand this file", "CLAUDE.md drift guard");
for (const forbidden of [
  "Next.js 14",
  "AgentOffice sub-components",
  "All async fetches: wrapped in `try/catch` with silent failure",
]) {
  forbidText(claude, forbidden, "CLAUDE.md");
}

for (const [source, needle, label] of [
  [secondBrain, "AGENTS.md", "SECOND_BRAIN.md"],
  [handoff, "docs/SYSTEM_STATE.md", "canonical handoff"],
  [todo, "AGENT-INSTRUCTION-PATH-TRUTH", "task queue"],
  [lessons, "Historical scripts, artifacts", "lessons"],
]) {
  requireText(source, needle, label);
}

if (
  packageJson.scripts?.["agent:instructions:check"] !==
  "node scripts/validate-agent-instruction-paths.mjs"
) {
  fail("package.json is missing agent:instructions:check");
}
requireText(
  packageJson.scripts?.verify ?? "",
  "npm run agent:instructions:check",
  "verify script",
);

console.log(
  "ok agent-instruction-paths (framework, handoff, GA routes, skills, and authority chain)",
);
