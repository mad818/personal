#!/usr/bin/env node
/* eslint-disable no-console */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function fail(message) {
  console.error(`x nexus-closure-wave10: ${message}`);
  process.exit(1);
}

function readRequired(...parts) {
  const filePath = path.join(root, ...parts);
  if (!fs.existsSync(filePath)) {
    fail(`${parts.join("/")} is missing`);
  }
  return fs.readFileSync(filePath, "utf8");
}

function requireText(source, needle, label) {
  if (!source.includes(needle)) {
    fail(`${label} is missing "${needle}"`);
  }
}

// WAVE-1 sandbox adapter
const sandbox = readRequired("lib", "security", "sandboxAdapter.ts");
const toolsRoute = readRequired("app", "api", "tools", "route.ts");
requireText(sandbox, "executeSandboxedTool", "sandboxAdapter.ts");
requireText(sandbox, "dryRun", "sandboxAdapter.ts");
requireText(toolsRoute, "executeSandboxedTool", "tools route");

// WAVE-3 RAG depth
const ragPlanner = readRequired("lib", "ragRetrievalPlanner.ts");
const ragRouter = readRequired("lib", "ragRouter.ts");
requireText(ragPlanner, "buildRagRetrievalPlan", "ragRetrievalPlanner.ts");
requireText(ragRouter, "formatRagRetrievalPlanBlock", "ragRouter.ts");

// WAVE-4 H3 polish
const h3 = readRequired("lib", "opsH3Density.ts");
const opsMap = readRequired("components", "ops", "OpsMap.tsx");
requireText(h3, "buildDensityBins", "opsH3Density.ts");
requireText(h3, "designTokens", "opsH3Density.ts");
requireText(opsMap, "opsH3Density", "OpsMap.tsx");

// WAVE-5 VAULT memory ask
const memoryAsk = readRequired("lib", "memoryAsk.ts");
const vaultTags = readRequired("lib", "vaultTagRetrieval.ts");
const askRoute = readRequired("app", "api", "memory", "ask", "route.ts");
const memoryPanel = readRequired("components", "vault", "MemoryAskPanel.tsx");
requireText(memoryAsk, "buildMemoryAskResponse", "memoryAsk.ts");
requireText(vaultTags, "buildVaultTagBoosts", "vaultTagRetrieval.ts");
requireText(askRoute, "buildMemoryAskResponse", "memory ask route");
requireText(memoryPanel, "/api/memory/ask", "MemoryAskPanel.tsx");

// WAVE-6 MCP gateway
const mcpGateway = readRequired("lib", "mcpGatewayAdapter.ts");
const mcpRoute = readRequired("app", "api", "mcp", "gateway", "route.ts");
const mcpCard = readRequired("components", "command", "McpBridgeStatusCard.tsx");
const routePolicy = readRequired("lib", "security", "routePolicy.ts");
requireText(mcpGateway, "buildMcpGatewayDescriptor", "mcpGatewayAdapter.ts");
requireText(mcpRoute, "executeMcpGatewayTool", "mcp gateway route");
requireText(mcpGateway, "executeMcpGatewayTool", "mcpGatewayAdapter.ts");
requireText(mcpCard, "/api/mcp/gateway", "McpBridgeStatusCard.tsx");
requireText(routePolicy, "/api/mcp/gateway", "routePolicy.ts");

// Operational slices
requireText(readRequired("scripts", "dependabot-github-closure-guide.mjs"), "gh", "dependabot guide");
requireText(readRequired("scripts", "cp2-live-launch-preflight.mjs"), "cp2:local:launch-gate", "cp2 preflight");
requireText(readRequired("lib", "desktopSigningPosture.ts"), "readDesktopSigningPosture", "desktopSigningPosture.ts");

console.log("ok nexus-closure-wave10 (sandbox, RAG, H3, vault ask, MCP gateway, ops closure)");
