#!/usr/bin/env node
/* eslint-disable no-console */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function readRequired(...parts) {
  const filePath = path.join(root, ...parts);
  if (!fs.existsSync(filePath)) {
    console.error(`x feynman-native: ${parts.join("/")} is missing`);
    process.exit(1);
  }
  return fs.readFileSync(filePath, "utf8");
}

function requireText(source, needle, label) {
  if (!source.includes(needle)) {
    console.error(`x feynman-native: ${label} is missing ${needle}`);
    process.exit(1);
  }
}

const engine = readRequired("lib", "feynmanResearch.ts");
const tools = readRequired("app", "api", "tools", "route.ts");
const agent = readRequired("lib", "agent.ts");
const commands = readRequired("components", "home", "office", "workflowCommands.ts");
const postRun = readRequired("components", "home", "office", "officeCommandCenterPostRun.ts");
const memoryPages = readRequired("lib", "memoryPagesStore.ts");
const memoryPagesRoute = readRequired("app", "api", "memory", "pages", "route.ts");
const toolPolicy = readRequired("lib", "security", "toolCapabilityPolicy.ts");
const packageJson = JSON.parse(readRequired("package.json"));
const spec = readRequired("specs", "features", "feynman-native-assimilation.md");

for (const needle of [
  "FeynmanWorkflowId",
  "FeynmanClaimVerdict",
  "FeynmanReviewSeverity",
  "runFeynmanResearch",
  "buildFeynmanSynthesisPrompt",
  "buildFeynmanVerificationPrompt",
  "buildFeynmanReviewPrompt",
  "formatFeynmanReport",
  "supported",
  "partial",
  "conflicting",
  "unsupported",
  "unverifiable",
  "Explicit operator approval required",
]) {
  requireText(engine, needle, "engine");
}

for (const workflow of [
  "deepresearch",
  "lit-review",
  "review",
  "audit",
  "replicate",
  "recipe",
  "compare",
  "draft",
  "autoresearch",
  "watch",
  "outputs",
]) {
  requireText(commands, `id: "${workflow}"`, `workflow ${workflow}`);
}

requireText(tools, "feynman_research", "tools route");
requireText(tools, "feynman_outputs", "tools route");
requireText(tools, "runFeynmanResearch", "tools route engine wiring");
requireText(agent, 'feynman_research: "tier0"', "agent risk map");
requireText(agent, 'feynman_outputs: "tier0"', "agent risk map");
requireText(agent, 'name: "feynman_research"', "agent tool catalog");
requireText(agent, 'name: "feynman_outputs"', "agent tool catalog");
requireText(postRun, "claim-audit", "durable artifact tags");
requireText(memoryPages, 'workflowId === "audit"', "memory knowledge layer");
requireText(memoryPagesRoute, "listCompiledMemoryPages", "compiled pages API read");
requireText(memoryPagesRoute, "createCompiledMemoryPage", "compiled pages API write");
requireText(memoryPagesRoute, "toCompiledMemoryPageSummary", "compiled pages API visibility");
requireText(toolPolicy, 'feynman_research: "networked"', "network policy");
requireText(toolPolicy, 'feynman_outputs: "read"', "local output policy");
requireText(spec, "No silent execution", "feature guardrail");

if (
  packageJson.scripts?.["feynman:check"] !==
  "node scripts/validate-feynman-native-assimilation.mjs && npm run feynman:runtime:check"
) {
  console.error("x feynman-native: package.json is missing feynman:check");
  process.exit(1);
}
if (
  packageJson.scripts?.["feynman:runtime:check"] !==
  "node --no-warnings --experimental-strip-types scripts/check-feynman-runtime.mjs"
) {
  console.error("x feynman-native: package.json is missing feynman:runtime:check");
  process.exit(1);
}
requireText(packageJson.scripts?.verify ?? "", "npm run feynman:check", "verify wiring");

console.log("ok feynman-native (full workflow family, audit contract, tool and Vault wiring)");
