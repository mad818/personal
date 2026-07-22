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
const rail = readRequired("components", "ui", "TrustOperationsRail.tsx");
const descriptor = readRequired("lib", "trustPostureDescriptor.ts");
const docs = readRequired("docs", "agents", "mcp-tools.md");
const parity = JSON.parse(
  readRequired("docs", "ideas", "source-parity", "mcporter.json"),
);

requireText(lib, "MCPORTER_BRIDGE_PATTERN_VERSION", "mcporterBridgePattern.ts");
requireText(
  lib,
  "buildMcporterBridgePatternSummary",
  "mcporterBridgePattern.ts",
);
requireText(rail, "buildTrustPostureRows", "TrustOperationsRail.tsx");
requireText(rail, 'row.label === "External tools"', "TrustOperationsRail.tsx");
requireText(descriptor, 'label: "MCP bridge"', "trustPostureDescriptor.ts");
requireText(docs, "descriptor-only", "mcp-tools.md");

if (parity.status !== "complete") {
  fail("mcporter.json status must be complete");
}

console.log(
  "ok mcporter-assimilation (descriptor-only MCP posture in trust rail)",
);
