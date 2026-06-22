#!/usr/bin/env node
/* eslint-disable no-console */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function fail(message) {
  console.error(`x mcporter-assimilation: ${message}`);
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

const lib = readRequired("lib", "mcporterBridgePattern.ts");
const card = readRequired("components", "command", "McpBridgeStatusCard.tsx");
const docs = readRequired("docs", "agents", "mcp-tools.md");
const parity = JSON.parse(readRequired("docs", "ideas", "source-parity", "mcporter.json"));

requireText(lib, "MCPORTER_BRIDGE_PATTERN_VERSION", "mcporterBridgePattern.ts");
requireText(lib, "buildMcporterBridgePatternSummary", "mcporterBridgePattern.ts");
requireText(card, "MCP bridge posture", "McpBridgeStatusCard.tsx");
requireText(docs, "mcporter alignment", "mcp-tools.md");

if (parity.status !== "complete") {
  fail("mcporter.json status must be complete");
}

console.log("ok mcporter-assimilation (descriptor-only MCP bridge wired)");
