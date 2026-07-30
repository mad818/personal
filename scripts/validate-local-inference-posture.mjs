#!/usr/bin/env node
/* eslint-disable no-console */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function readRequired(...segments) {
  const fullPath = path.join(repoRoot, ...segments);
  if (!fs.existsSync(fullPath)) {
    console.error(`❌ local-inference: missing ${segments.join("/")}`);
    process.exit(1);
  }
  return fs.readFileSync(fullPath, "utf8");
}

function requireText(source, needle, label) {
  if (!source.includes(needle)) {
    console.error(`❌ local-inference: ${label} is missing ${needle}`);
    process.exit(1);
  }
}

const packageJson = JSON.parse(readRequired("package.json"));
const agent = readRequired("lib", "agent.ts");
const aiRoute = readRequired("app", "api", "ai", "route.ts");
const posture = readRequired("lib", "localInferencePosture.ts");
const intelOnly = readRequired("lib", "intelOnlyDegradedMode.ts");
const routePolicy = readRequired("lib", "security", "routePolicy.ts");
const toolsRoute = readRequired("app", "api", "tools", "route.ts");
const toolsSchema = readRequired("lib", "toolsRequestSchema.ts");
const hqTerminal = readRequired(
  "components",
  "home",
  "office",
  "HQTerminalSection.tsx",
);
const commandBar = readRequired("components", "ui", "CommandBar.tsx");
const gate = readRequired("components", "ui", "IntelOnlyAgentGate.tsx");
const workflow = readRequired("lib", "assistantOperatorWorkflow.ts");
const ollamaDoc = readRequired(
  "docs",
  "deployment",
  "ollama-huggingface-local.md",
);
const readme = readRequired("README.md");
const envExample = readRequired(".env.example");

requireText(posture, "shouldAllowCloudEscalation", "localInferencePosture");
requireText(posture, "validateOllamaEndpoint", "localInferencePosture");
requireText(posture, "resolveProviderChainForTask", "localInferencePosture");
requireText(agent, "shouldAllowCloudEscalation", "agent.ts");
requireText(agent, "buildLocalInferenceRecoveryMessage", "agent.ts");
requireText(aiRoute, "normalizeOllamaEndpoint", "ai route");
requireText(aiRoute, "resolveProviderChainForTask", "ai route");
requireText(intelOnly, "deriveIntelOnlyPosture", "intelOnlyDegradedMode");
requireText(hqTerminal, "IntelOnlyAgentGate", "HQ terminal");
requireText(commandBar, "IntelOnlyAgentGate", "CommandBar");
requireText(gate, 'data-testid="intel-only-agent-gate"', "IntelOnlyAgentGate");
requireText(workflow, '"recovery"', "assistant workflow recovery phase");
requireText(routePolicy, '"/api/geocode"', "route policy geocode");
requireText(routePolicy, '"/api/papers"', "route policy papers");
requireText(routePolicy, '"/api/mcp/gateway"', "route policy mcp gateway");
requireText(routePolicy, '"/api/ideas/intake"', "route policy ideas intake");
requireText(toolsRoute, "parseToolsPostBody", "tools route schema");
requireText(toolsSchema, "toolsPostBodySchema", "toolsRequestSchema");
requireText(ollamaDoc, "ollama pull", "ollama HF doc");
requireText(readme, "ollama-huggingface-local.md", "README local AI link");
requireText(envExample, "NEXUS_LOCAL_INFERENCE_STRICT", "env example");

if (!packageJson.scripts?.["local-inference:check"]) {
  console.error("❌ local-inference: package.json missing local-inference:check");
  process.exit(1);
}

if (agent.includes("Trying free cloud providers")) {
  console.error("❌ local-inference: agent.ts still mentions unguarded cloud fallback copy");
  process.exit(1);
}

console.log(
  "Local inference posture OK (posture contract, SSRF guard, intel-only gate, route policy, tools schema, and Ollama HF runbook wired).",
);
