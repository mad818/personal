#!/usr/bin/env node
/* eslint-disable no-console */

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function fail(message) {
  console.error(`x current-documentation-stack: ${message}`);
  process.exit(1);
}

function readRequired(relativePath) {
  const filePath = path.join(root, relativePath);
  if (!fs.existsSync(filePath)) fail(`${relativePath} is missing`);
  return fs.readFileSync(filePath, "utf8");
}

function requireText(source, needle, label) {
  if (!source.includes(needle)) fail(`${label} is missing ${needle}`);
}

function forbidText(source, needle, label) {
  if (source.includes(needle)) fail(`${label} must not include ${needle}`);
}

function major(version) {
  const match = String(version ?? "").match(/\d+/);
  return match ? Number.parseInt(match[0], 10) : null;
}

function markdownSection(source, heading) {
  const marker = `## ${heading}`;
  const markerIndex = source.indexOf(marker);
  if (markerIndex < 0) fail(`missing ${marker} section`);
  const contentStart = markerIndex + marker.length;
  const nextHeading = source.indexOf("\n## ", contentStart);
  return source.slice(
    contentStart,
    nextHeading < 0 ? source.length : nextHeading,
  );
}

function firstTopLevelCompletedTaskId(source) {
  return source.match(/^- \[x\] ([A-Z][A-Z0-9-]*)\s+—/m)?.[1] ?? null;
}

function firstShippedTaskId(source) {
  return source.match(/^- ([A-Z][A-Z0-9-]*)\b/m)?.[1] ?? null;
}

const packageJson = JSON.parse(readRequired("package.json"));
const releaseMatrix = JSON.parse(readRequired("lib/release-matrix.json"));
const readme = readRequired("README.md");
const architecture = readRequired("docs/architecture.md");
const figmaRules = readRequired("docs/NEXUS_FIGMA_IMPLEMENTATION_RULES.md");
const pmModel = readRequired("docs/pm-operator-model.md");
const docsIndex = readRequired("docs/README.md");
const systemState = readRequired("docs/SYSTEM_STATE.md");
const todo = readRequired("tasks/todo.md");
const visionSnapshot = readRequired("tasks/vision-roadmap.md");
const comprehensiveSnapshot = readRequired(
  "docs/plans/nexus-comprehensive-roadmap-2026.md",
);

if (major(packageJson.dependencies?.next) !== 15) {
  fail("package.json Next.js major changed; reconcile current documentation");
}
if (major(packageJson.dependencies?.react) !== 19) {
  fail("package.json React major changed; reconcile current documentation");
}

const svgPaths = [
  "public/banner.svg",
  "public/github-infographic-features.svg",
  "public/github-infographic-stack.svg",
  "public/github-section-stack-layers.svg",
  "public/github-social-card.svg",
];
const currentSurfaces = new Map([
  ["README.md", readme],
  ["docs/architecture.md", architecture],
  ["docs/NEXUS_FIGMA_IMPLEMENTATION_RULES.md", figmaRules],
  ["docs/pm-operator-model.md", pmModel],
  ["docs/README.md", docsIndex],
  ["docs/SYSTEM_STATE.md", systemState],
  ["tasks/todo.md", todo],
]);
for (const svgPath of svgPaths) {
  const svg = readRequired(svgPath);
  currentSurfaces.set(svgPath, svg);
  requireText(svg, "Next.js 15", svgPath);
}

for (const [label, source] of currentSurfaces) {
  forbidText(source, "Next.js 14", label);
  forbidText(source, "React 18", label);
}

for (const needle of [
  "Next.js-15-black",
  "Next.js 15 / React 19",
  "Next.js 15 App Router + React 19",
]) {
  requireText(readme, needle, "README.md");
}

requireText(
  architecture,
  "Next.js 15 / React 19 App Router application",
  "docs/architecture.md",
);
requireText(
  architecture,
  "legacy HTML app is archived under `archive/`",
  "docs/architecture.md",
);
const gaSurfaces = releaseMatrix.surfaces.filter(
  (surface) => surface.tier === "ga",
);
if (gaSurfaces.length !== 8) {
  fail(
    "release matrix GA surface count changed; reconcile current architecture",
  );
}
for (const surface of gaSurfaces) {
  requireText(
    architecture,
    `\`${surface.href}\` — ${surface.label}`,
    "docs/architecture.md GA surface list",
  );
}

requireText(figmaRules, "Next.js 15 App Router", "Figma implementation rules");
requireText(figmaRules, "React 19", "Figma implementation rules");

for (const agent of ["JANSKY", "ORBIT", "NOVA", "CIPHER", "FLUX"]) {
  requireText(pmModel, agent, "PM operator model agent roster");
}
for (const staleIdentity of ["You (Max)", "EL (orbit)", "[assigned:EL]"]) {
  forbidText(pmModel, staleIdentity, "PM operator model identity guidance");
}
requireText(pmModel, "You (Mario)", "PM operator model owner");
requireText(pmModel, "ORBIT (EL)", "PM operator model builder identity");
requireText(pmModel, "JANSKY (MAX)", "PM operator model reviewer identity");
for (const authority of [
  "tasks/todo.md",
  "docs/SYSTEM_STATE.md",
  "specs/features/",
  "root `AGENTS.md`",
  "tasks/lessons.md",
]) {
  requireText(pmModel, authority, "PM operator model authority chain");
}
forbidText(pmModel, "tasks/vision-roadmap.md", "PM operator model");
forbidText(pmModel, ".claude/rules/agents.md", "PM operator model");

requireText(
  visionSnapshot,
  "Status: historical snapshot",
  "tasks/vision-roadmap.md",
);
requireText(
  comprehensiveSnapshot,
  "Status:** historical planning snapshot",
  "comprehensive roadmap",
);
forbidText(
  comprehensiveSnapshot,
  "Status:** living document",
  "comprehensive roadmap",
);
requireText(
  docsIndex,
  "historical planning snapshot",
  "docs index roadmap label",
);

const fixtureTaskId = firstTopLevelCompletedTaskId(`
- [ ] NOT-SHIPPED — unchecked work
  - [x] NESTED-SUBTASK — nested proof is not a shipment
- [x] FIXTURE-SHIPPED — newest completed top-level work
`);
if (fixtureTaskId !== "FIXTURE-SHIPPED") {
  fail("top-level completed-task selection fixture drifted");
}

const newestCompletedTaskId = firstTopLevelCompletedTaskId(
  markdownSection(todo, "Next Up"),
);
if (!newestCompletedTaskId) {
  fail("tasks/todo.md Next Up has no completed top-level shipment");
}
const latestShippedSection = markdownSection(systemState, "Latest Shipped");
const latestShippedTaskIds = Array.from(
  latestShippedSection.matchAll(/^- ([A-Z][A-Z0-9-]*)\b/gm),
  (match) => match[1],
);
const latestShippedTaskId = firstShippedTaskId(latestShippedSection);
if (!latestShippedTaskId) {
  fail("docs/SYSTEM_STATE.md Latest Shipped has no task bullet");
}
const latestShippedEntryLimit = 12;
const latestShippedCharacterLimit = 24_000;
if (latestShippedTaskIds.length > latestShippedEntryLimit) {
  fail(
    `docs/SYSTEM_STATE.md Latest Shipped has ${latestShippedTaskIds.length} entries; limit is ${latestShippedEntryLimit}`,
  );
}
if (latestShippedSection.length > latestShippedCharacterLimit) {
  fail(
    `docs/SYSTEM_STATE.md Latest Shipped has ${latestShippedSection.length} characters; limit is ${latestShippedCharacterLimit}`,
  );
}
if (latestShippedTaskId !== newestCompletedTaskId) {
  fail(
    `latest shipped task ${latestShippedTaskId} does not match newest completed Next Up task ${newestCompletedTaskId}`,
  );
}

if (
  packageJson.scripts?.["docs:stack:check"] !==
  "node scripts/validate-current-documentation-stack.mjs"
) {
  fail("package.json is missing docs:stack:check");
}
requireText(
  packageJson.scripts?.verify ?? "",
  "npm run docs:stack:check",
  "canonical verify script",
);

console.log(
  `ok current-documentation-stack (latest=${latestShippedTaskId}; ${latestShippedTaskIds.length} shipped entries; ${latestShippedSection.length} chars; manifest, README/SVGs, system state, architecture, design, operator, and historical boundaries)`,
);
