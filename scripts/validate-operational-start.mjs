#!/usr/bin/env node
/* eslint-disable no-console */

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function fail(message) {
  console.error(`x operational-start: ${message}`);
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
  if (source.includes(needle)) fail(`${label} must not contain ${needle}`);
}

const skillIds = [
  "concise-technical-output",
  "deterministic-media-production",
  "review-external-agent-skill",
  "run-status-summary",
];
const spec = readRequired(
  "specs/features/operational-startup-and-skill-linkage.md",
);
const runner = readRequired("scripts/operational-start.mjs");
const runtimeWrapper = readRequired("scripts/start-runtime.mjs");
const runtimeCheck = readRequired(
  "scripts/check-operational-start-runtime.mjs",
);
const registry = readRequired("lib/projectSkillRegistry.ts");
const liveContext = readRequired("lib/liveContext.ts");
const agents = readRequired("AGENTS.md");
const router = readRequired(
  "docs/ideas/skills/production-engineering/using-agent-skills/SKILL.md",
);
const companyMap = readRequired("lib/nexusCompanyMap.ts");
const readme = readRequired("README.md");
const batch = readRequired("NexusPrime.bat");
const packageJson = JSON.parse(readRequired("package.json"));

for (const needle of [
  "OPERATIONAL-STARTUP-AND-SKILL-LINKAGE",
  "never opens a dead page",
  "No phone/PWA acceptance work",
  "No claim that every future runtime error is impossible",
]) {
  requireText(spec, needle, "feature spec");
}

for (const needle of [
  "scripts/start-runtime.mjs",
  "/api/health",
  "nexus_healthy",
  "occupied_non_nexus",
  "DEFAULT_TIMEOUT_MS",
  "terminateOwnedChild",
  "NEXUS_MANAGED_PARENT",
  "NEXUS_SHUTDOWN",
  "--check",
  "--json",
  "--no-open",
  "--smoke",
  "Browser did not open",
]) {
  requireText(runner, needle, "operational runner");
}
for (const needle of [
  'process.env.NEXUS_MANAGED_PARENT === "operational-start"',
  "NEXUS_SHUTDOWN",
  "managed shutdown requested",
  '["ignore", "inherit", "inherit"]',
]) {
  requireText(runtimeWrapper, needle, "runtime managed-shutdown contract");
}
for (const unsafe of [
  "npm install --",
  "Invoke-WebRequest",
  "Opening the browser anyway",
  ["NEXUS_TO", "KEN=${"].join(""),
  "AZURE_OPENAI_API_KEY",
]) {
  forbidText(runner, unsafe, "operational runner");
}

for (const skillId of skillIds) {
  const skillPath = `docs/ideas/skills/${skillId}/SKILL.md`;
  requireText(registry, `id: "${skillId}"`, "project skill registry");
  requireText(registry, skillPath, "project skill registry");
  requireText(agents, skillPath, "root skill routing");
  requireText(router, `@${skillPath}`, "production skill routing");
  requireText(companyMap, skillPath, "Company Map project skill path");
  requireText(runtimeCheck, skillId, "runtime linkage fixture");
}
requireText(
  liveContext,
  'from "@/lib/projectSkillRegistry"',
  "live assistant context",
);
requireText(
  liveContext,
  "buildProjectSkillRoutingBlock(agentId)",
  "live assistant context",
);

requireText(batch, "call npm run operational:start", "Windows launcher");
for (const obsolete of [
  "npm install",
  'start "Nexus Prime Server"',
  "Invoke-WebRequest",
  "Opening the browser anyway",
  "ping -n",
]) {
  forbidText(batch, obsolete, "Windows launcher");
}
for (const needle of [
  "NexusPrime.bat",
  "npm run operational:start",
  "opens [HQ](http://localhost:3000/hq) only after `/api/health`",
  "npm run operational:start -- --check",
]) {
  requireText(readme, needle, "README operational quickstart");
}

if (
  packageJson.scripts?.["operational:start"] !==
  "node scripts/operational-start.mjs"
) {
  fail("package.json operational:start is missing or drifted");
}
if (
  packageJson.scripts?.["operational:start:runtime:check"] !==
  "node --no-warnings --experimental-strip-types scripts/check-operational-start-runtime.mjs"
) {
  fail("package.json operational:start:runtime:check is missing or drifted");
}
if (
  packageJson.scripts?.["operational:start:check"] !==
  "node scripts/validate-operational-start.mjs && npm run operational:start:runtime:check"
) {
  fail("package.json operational:start:check is missing or drifted");
}
requireText(
  packageJson.scripts?.verify ?? "",
  "npm run operational:start:check",
  "canonical verification",
);

console.log(
  "ok operational-start (health-gated launcher, bounded recovery, and 4 live-linked project skills)",
);
