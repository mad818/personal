#!/usr/bin/env node
/* eslint-disable no-console */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function fail(message) {
  console.error(`x overall-quality-wave20: ${message}`);
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

const readiness = readRequired("lib", "agentPlatformReadiness.ts");
const statusRoute = readRequired("app", "api", "status", "route.ts");
const bridge = readRequired("lib", "externalToolBridge.ts");
const gateway = readRequired("lib", "mcpGatewayAdapter.ts");
const wave10 = readRequired("scripts", "validate-nexus-closure-wave10.mjs");
const intel = readRequired("components", "intel", "ForecastLabReadinessPanel.tsx");
const badges = readRequired("components", "ui", "AgentPlatformReadinessBadges.tsx");
const liveContext = readRequired("lib", "liveContext.ts");
const firecrawl = readRequired("lib", "firecrawlScrape.ts");
const toolsRoute = readRequired("app", "api", "tools", "route.ts");
const plan = readRequired("docs", "plans", "overall-quality-wave20.md");
const pkg = readRequired("package.json");

requireText(readiness, "readAgentPlatformReadiness", "agentPlatformReadiness.ts");
requireText(statusRoute, "readAgentPlatformReadiness", "status route");
requireText(statusRoute, "agentPlatform", "status route");
requireText(bridge, "liveReady", "externalToolBridge.ts");
requireText(gateway, "liveExecutionReady", "mcpGatewayAdapter.ts");
requireText(wave10, "executeMcpGatewayTool", "validate-nexus-closure-wave10.mjs");
requireText(intel, "AgentPlatformReadinessBadges", "ForecastLabReadinessPanel.tsx");
requireText(badges, "TimesFM", "AgentPlatformReadinessBadges.tsx");
requireText(liveContext, "buildFirecrawlCapabilityBlock", "liveContext.ts");
requireText(firecrawl, "buildFirecrawlCapabilityBlock", "firecrawlScrape.ts");
requireText(toolsRoute, "buildMarkItDownIntakeNote", "tools/route.ts");
requireText(plan, "ForecastLabReadinessPanel", "overall-quality-wave20.md");
requireText(pkg, "assimilation:wave20:check", "package.json");

console.log(
  "ok overall-quality-wave20 (platform readiness + MCP truth + INTEL Forecast Lab panel)",
);
