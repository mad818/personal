#!/usr/bin/env node
/* eslint-disable no-console */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (...parts) => {
  const relativePath = parts.join("/");
  const filePath = path.join(root, ...parts);
  if (!fs.existsSync(filePath)) {
    console.error(`x agent-12-factor: missing ${relativePath}`);
    process.exit(1);
  }
  return fs.readFileSync(filePath, "utf8");
};
const fail = (message) => {
  console.error(`x agent-12-factor: ${message}`);
  process.exit(1);
};
const requireText = (text, needle, label) => {
  if (!text.includes(needle)) fail(`${label} missing ${needle}`);
};
const forbidText = (text, needle, label) => {
  if (text.includes(needle)) fail(`${label} must not contain ${needle}`);
};

const contract = read("lib", "agentExecutionContract.ts");
const agent = read("lib", "agent.ts");
const store = read("store", "useStore.ts");
const matrix = JSON.parse(
  read("docs", "ideas", "source-parity", "humanlayer-12-factor-agents.json"),
);
const analysis = read(
  "docs",
  "ideas",
  "repo-analysis",
  "humanlayer-12-factor-agents",
  "REPO_CONTEXT.md",
);
const ecosystem = read("docs", "ideas", "assimilated-ecosystem.md");
const companyMap = read("lib", "nexusCompanyMap.ts");
const spec = read("specs", "features", "humanlayer-12-factor-agent-runtime.md");
const packageJson = JSON.parse(read("package.json"));

for (const needle of [
  "AGENT_CONTEXT_MAX_CHARS = 64_000",
  "AGENT_CONTEXT_SYSTEM_MAX_CHARS = 38_000",
  "AGENT_TOOL_RESULT_MAX_CHARS = 8_000",
  "AGENT_EXECUTION_EVENT_LIMIT = 48",
  "prepareAgentContext",
  "validateAgentToolInput",
  "normalizeAgentToolInputForTransport",
  "compactAgentToolResult",
  "reduceAgentExecutionState",
  "summarizeAgentExecutionState",
  '"waiting_for_human"',
  '"human_wait"',
  '"resume"',
])
  requireText(contract, needle, "execution contract");

for (const needle of [
  "prepareAgentContext({",
  "validateAgentToolInput(AGENT_TOOLS",
  "normalizeAgentToolInputForTransport(input)",
  "compactAgentToolResult(result).content",
  "reduceAgentExecutionState(createAgentExecutionState()",
  "executionContract: summarizeAgentExecutionState(executionState)",
  'name === "propose_project_edit"',
])
  requireText(agent, needle, "active agent integration");

requireText(
  store,
  "executionContract?: AgentExecutionSummary",
  "persisted run summary",
);
for (const forbidden of [
  "humanlayer/",
  "create-12-factor-agent",
  "slack.com/api",
  "api.telegram.org",
]) {
  forbidText(contract, forbidden, "project-owned runtime");
}

if (matrix.status !== "complete") fail("source matrix must be complete");
if (matrix.source.version !== "main-273-commits-2026-07-26")
  fail("source revision is stale");
if (matrix.source.license !== "CC-BY-SA-4.0-content+Apache-2.0-code")
  fail("source license boundary is stale");
if (matrix.capabilities.length !== 12) fail("expected twelve current factors");
if (
  !matrix.capabilities.every(
    (capability) => capability.disposition === "adapted",
  )
)
  fail("all twelve current factors must be adapted");
const expectedIds = [
  "natural-language-to-tool-calls",
  "own-your-prompts",
  "own-your-context-window",
  "tools-are-structured-outputs",
  "unify-execution-and-business-state",
  "launch-pause-resume-simple-apis",
  "contact-humans-with-tool-calls",
  "own-your-control-flow",
  "compact-errors-into-context",
  "small-focused-agents",
  "trigger-and-deliver-on-owned-surfaces",
  "stateless-agent-reducer",
];
if (
  JSON.stringify(matrix.capabilities.map((capability) => capability.id)) !==
  JSON.stringify(expectedIds)
) {
  fail("factor order or names are stale");
}

requireText(
  analysis,
  "mostly deterministic software",
  "source architecture correction",
);
requireText(
  ecosystem,
  "[humanlayer/12-factor-agents](https://github.com/humanlayer/12-factor-agents)",
  "benefits ledger",
);
requireText(
  companyMap,
  'id: "humanlayer-12-factor-runtime"',
  "Company Map source",
);
requireText(spec, "Twelve-factor proof map", "feature proof contract");

if (
  packageJson.scripts?.["agent:12-factor:runtime:check"] !==
  "node --no-warnings --experimental-strip-types scripts/check-agent-12-factor-runtime.mjs"
)
  fail("runtime command is missing");
if (
  packageJson.scripts?.["agent:12-factor:check"] !==
  "node scripts/validate-agent-12-factor-runtime.mjs && npm run agent:12-factor:runtime:check"
)
  fail("focused command is missing");
requireText(
  String(packageJson.scripts?.verify ?? ""),
  "npm run agent:12-factor:check",
  "canonical verify wiring",
);

console.log(
  "ok agent-12-factor (current factor order, hard context/tool/result/state contracts, active loop integration, honest owned-surface boundary)",
);
