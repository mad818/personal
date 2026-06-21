#!/usr/bin/env node
/* eslint-disable no-console */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function fail(message) {
  console.error(`x dynamic-context-assembly: ${message}`);
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

const liveContext = readRequired("lib", "liveContext.ts");
const office = readRequired("components", "home", "office", "OfficeCommandCenter.tsx");

requireText(liveContext, "AGENT_SECTIONS", "lib/liveContext.ts");
requireText(liveContext, "buildFilteredLiveContext", "lib/liveContext.ts");
requireText(liveContext, "queryText", "lib/liveContext.ts");
requireText(liveContext, "allowByQuery", "lib/liveContext.ts");
requireText(office, "buildFilteredLiveContextBundle", "OfficeCommandCenter.tsx");
requireText(office, "queryText: agentInput", "OfficeCommandCenter.tsx");

console.log("ok dynamic-context-assembly (agent + query-aware pruning wired)");
