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
requireText(toolsRoute, "runToolInIsolation", "tools route");
requireText(toolsRoute, "resolveToolIsolationDescriptor", "tools route");

// WAVE-3 RAG depth
const ragPlanner = readRequired("lib", "ragRetrievalPlanner.ts");
const ragRouter = readRequired("lib", "ragRouter.ts");
requireText(ragPlanner, "buildRagRetrievalPlan", "ragRetrievalPlanner.ts");
requireText(
  ragPlanner,
  "formatRagRetrievalPlanBlock",
  "ragRetrievalPlanner.ts",
);
requireText(ragRouter, "buildRagContextBlock", "ragRouter.ts");

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
const trustRail = readRequired("components", "ui", "TrustOperationsRail.tsx");
const trustDescriptor = readRequired("lib", "trustPostureDescriptor.ts");
const routePolicy = readRequired("lib", "security", "routePolicy.ts");
requireText(mcpGateway, "buildMcpGatewayDescriptor", "mcpGatewayAdapter.ts");
requireText(mcpRoute, "executeMcpGatewayTool", "mcp gateway route");
requireText(mcpGateway, "executeMcpGatewayTool", "mcpGatewayAdapter.ts");
requireText(trustRail, "buildTrustPostureRows", "TrustOperationsRail.tsx");
requireText(
  trustDescriptor,
  'label: "MCP bridge"',
  "trustPostureDescriptor.ts",
);
requireText(routePolicy, "/api/mcp/gateway", "routePolicy.ts");

// Operational slices
requireText(
  readRequired("scripts", "dependabot-github-closure-guide.mjs"),
  "gh",
  "dependabot guide",
);
requireText(
  readRequired("scripts", "cp2-live-launch-preflight.mjs"),
  "cp2:local:launch-gate",
  "cp2 preflight",
);
requireText(
  readRequired("lib", "desktopSigningPosture.ts"),
  "readDesktopSigningPosture",
  "desktopSigningPosture.ts",
);

console.log(
  "ok nexus-closure-wave10 (sandbox, RAG, vault ask, MCP gateway, ops closure)",
);
