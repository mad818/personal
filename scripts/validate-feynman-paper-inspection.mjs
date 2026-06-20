#!/usr/bin/env node
/* eslint-disable no-console */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function readRequired(...parts) {
  const filePath = path.join(root, ...parts);
  if (!fs.existsSync(filePath)) {
    console.error(`x feynman-paper: ${parts.join("/")} is missing`);
    process.exit(1);
  }
  return fs.readFileSync(filePath, "utf8");
}

function requireText(source, needle, label) {
  if (!source.includes(needle)) {
    console.error(`x feynman-paper: ${label} is missing ${needle}`);
    process.exit(1);
  }
}

const inspector = readRequired("lib", "feynmanPaperInspection.ts");
const progressive = readRequired("lib", "feynmanProgressiveResearch.ts");
const tools = readRequired("app", "api", "tools", "route.ts");
const agent = readRequired("lib", "agent.ts");
const policy = readRequired("lib", "security", "toolCapabilityPolicy.ts");
const parity = JSON.parse(readRequired("docs", "ideas", "source-parity", "feynman.json"));
const packageJson = JSON.parse(readRequired("package.json"));
const spec = readRequired("specs", "features", "feynman-paper-inspection.md");

for (const needle of [
  "normalizePaperReference",
  "searchPapers",
  "fetchPaperMetadata",
  "readPaperSection",
  "formatPaperInspection",
  "FEYNMAN_PAPER_INSPECTION_LIMITS",
  "askPaperQuestion",
  "annotatePaper",
  "extractPaperCodeReferences",
  "maximumFormattedChars",
  "maximumSearchResults",
]) {
  requireText(inspector, needle, "inspector");
}
requireText(progressive, "inspectPaper", "progressive integration");
requireText(tools, 'case "paper_inspect"', "tools route");
requireText(agent, 'name: "paper_inspect"', "agent tool catalog");
requireText(agent, 'paper_inspect: "tier0"', "agent risk map");
requireText(policy, 'paper_inspect: "networked"', "network policy");
requireText(spec, "No authentication, paid APIs", "feature guardrail");

const capability = parity.capabilities?.find(
  (entry) => entry.id === "paper-search-read-ask-annotate-code",
);
if (capability?.disposition !== "adapted") {
  console.error("x feynman-paper: parity row must be adapted");
  process.exit(1);
}
if (
  packageJson.scripts?.["feynman:paper:runtime:check"] !==
  "node --no-warnings --experimental-strip-types scripts/check-feynman-paper-inspection-runtime.mjs"
) {
  console.error("x feynman-paper: runtime package script is missing");
  process.exit(1);
}
if (
  packageJson.scripts?.["feynman:paper:check"] !==
  "node scripts/validate-feynman-paper-inspection.mjs && npm run feynman:paper:runtime:check"
) {
  console.error("x feynman-paper: package check script is missing");
  process.exit(1);
}

console.log("ok feynman-paper-inspection (bounded public arxiv inspection, protected tool, Feynman integration, parity)");
