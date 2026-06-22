#!/usr/bin/env node
/* eslint-disable no-console */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function fail(message) {
  console.error(`x overall-quality-wave18: ${message}`);
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

// MCP gateway — bounded POST
const mcpRoute = readRequired("app", "api", "mcp", "gateway", "route.ts");
const mcpAdapter = readRequired("lib", "mcpGatewayAdapter.ts");

requireText(mcpRoute, "executeMcpGatewayTool", "app/api/mcp/gateway/route.ts");
requireText(mcpRoute, "stepUpToken", "app/api/mcp/gateway/route.ts");
requireText(mcpAdapter, "executeMcpGatewayTool", "lib/mcpGatewayAdapter.ts");
requireText(mcpAdapter, "validateMcpToolAllowlist", "lib/mcpGatewayAdapter.ts");
requireText(mcpAdapter, "MCP_TOOL_ALLOWLIST", "lib/mcpGatewayAdapter.ts");
requireText(mcpAdapter, "readMcpGatewayUrl", "lib/mcpGatewayAdapter.ts");
requireText(mcpAdapter, "NEXUS_MCP_GATEWAY_URL", "lib/mcpGatewayAdapter.ts");
requireText(mcpAdapter, "NEXUS_MCP_STEP_UP_TOKEN", "lib/mcpGatewayAdapter.ts");

// TimesFM Forecast Lab
const timesFm = readRequired("lib", "timesFmForecast.ts");

requireText(timesFm, "callTimesFmForecast", "lib/timesFmForecast.ts");
requireText(timesFm, "evaluateTimesFmReadiness", "lib/timesFmForecast.ts");
requireText(timesFm, "TIMESFM_ENDPOINT", "lib/timesFmForecast.ts");
requireText(timesFm, "advisoryOnly", "lib/timesFmForecast.ts");
requireText(timesFm, "buildTimesFmCapabilityBlock", "lib/timesFmForecast.ts");

// MarkItDown binary subprocess
const markitdown = readRequired("lib", "markitdownSubprocess.ts");

requireText(markitdown, "server-only", "lib/markitdownSubprocess.ts");
requireText(markitdown, "resolveMarkItDownBin", "lib/markitdownSubprocess.ts");
requireText(markitdown, "convertBinaryWithMarkItDown", "lib/markitdownSubprocess.ts");
requireText(markitdown, "MARKITDOWN_BIN", "lib/markitdownSubprocess.ts");
requireText(markitdown, "spawnSync", "lib/markitdownSubprocess.ts");

const liveContext = readRequired("lib", "liveContext.ts");
const toolsRoute = readRequired("app", "api", "tools", "route.ts");

requireText(liveContext, "buildTimesFmCapabilityBlock", "lib/liveContext.ts");
requireText(toolsRoute, "convertBinaryWithMarkItDown", "app/api/tools/route.ts");
requireText(toolsRoute, 'case "timesfm_forecast"', "app/api/tools/route.ts");

// Wave 18 plan
const plan = readRequired("docs", "plans", "overall-quality-wave18.md");

requireText(plan, "MCP Live Gateway POST", "docs/plans/overall-quality-wave18.md");
requireText(plan, "TimesFM", "docs/plans/overall-quality-wave18.md");
requireText(plan, "MarkItDown", "docs/plans/overall-quality-wave18.md");

// Package scripts
const pkg = readRequired("package.json");

requireText(pkg, "assimilation:wave18:check", "package.json");
requireText(pkg, "nexus:complete:check", "package.json");

console.log(
  "ok overall-quality-wave18 (MCP gateway POST + TimesFM Forecast Lab + MarkItDown subprocess)",
);
