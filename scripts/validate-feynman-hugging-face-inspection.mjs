#!/usr/bin/env node
/* eslint-disable no-console */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function readRequired(...parts) {
  const filePath = path.join(root, ...parts);
  if (!fs.existsSync(filePath)) {
    console.error(`x feynman-hugging-face: ${parts.join("/")} is missing`);
    process.exit(1);
  }
  return fs.readFileSync(filePath, "utf8");
}

function requireText(source, needle, label) {
  if (!source.includes(needle)) {
    console.error(`x feynman-hugging-face: ${label} is missing ${needle}`);
    process.exit(1);
  }
}

const inspector = readRequired("lib", "huggingFaceInspection.ts");
const progressive = readRequired("lib", "feynmanProgressiveResearch.ts");
const tools = readRequired("app", "api", "tools", "route.ts");
const agent = readRequired("lib", "agent.ts");
const policy = readRequired("lib", "security", "toolCapabilityPolicy.ts");
const parity = JSON.parse(readRequired("docs", "ideas", "source-parity", "feynman.json"));
const packageJson = JSON.parse(readRequired("package.json"));
const spec = readRequired("specs", "features", "feynman-hugging-face-inspection.md");

for (const needle of [
  "normalizeHuggingFaceReference",
  "inspectHuggingFaceRepository",
  "readHuggingFaceTextFile",
  "formatHuggingFaceInspection",
  "maximumTextFileBytes",
  "maximumFormattedChars",
  "maximumFiles",
]) {
  requireText(inspector, needle, "inspector");
}
requireText(progressive, "inspectHuggingFace", "progressive integration");
requireText(tools, 'case "huggingface_inspect"', "tools route");
requireText(agent, 'name: "huggingface_inspect"', "agent tool catalog");
requireText(agent, 'huggingface_inspect: "tier0"', "agent risk map");
requireText(policy, 'huggingface_inspect: "networked"', "network policy");
requireText(spec, "No Hugging Face token", "feature guardrail");

const capability = parity.capabilities?.find(
  (entry) => entry.id === "hugging-face-inspection",
);
if (capability?.disposition !== "adapted") {
  console.error("x feynman-hugging-face: parity row must be adapted");
  process.exit(1);
}
if (
  packageJson.scripts?.["feynman:huggingface:runtime:check"] !==
  "node --no-warnings --experimental-strip-types scripts/check-feynman-hugging-face-runtime.mjs"
) {
  console.error("x feynman-hugging-face: runtime package script is missing");
  process.exit(1);
}
if (
  packageJson.scripts?.["feynman:huggingface:check"] !==
  "node scripts/validate-feynman-hugging-face-inspection.mjs && npm run feynman:huggingface:runtime:check"
) {
  console.error("x feynman-hugging-face: package check script is missing");
  process.exit(1);
}

console.log("ok feynman-hugging-face-inspection (bounded public Hub inspection, protected tool, Feynman integration, parity)");
