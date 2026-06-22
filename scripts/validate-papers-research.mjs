#!/usr/bin/env node
/* eslint-disable no-console */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function fail(message) {
  console.error(`x papers-research: ${message}`);
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

const route = readRequired("app", "api", "papers", "route.ts");
const lib = readRequired("lib", "papersResearch.ts");
const panel = readRequired("components", "intel", "PapersResearchPanel.tsx");
const intel = readRequired("components", "intel", "IntelDeferredSegment.tsx");

requireText(route, "/api/papers", "papers route");
requireText(lib, "parseHuggingFaceDailyPapers", "papersResearch.ts");
requireText(panel, "/api/papers", "PapersResearchPanel.tsx");
requireText(intel, "PapersResearchPanel", "IntelDeferredSegment.tsx");

console.log("ok papers-research (INTEL papers lane wired)");
