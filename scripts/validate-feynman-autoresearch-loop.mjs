#!/usr/bin/env node
/* eslint-disable no-console */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function readRequired(...parts) {
  const filePath = path.join(root, ...parts);
  if (!fs.existsSync(filePath)) {
    console.error(`x feynman-autoresearch: ${parts.join("/")} is missing`);
    process.exit(1);
  }
  return fs.readFileSync(filePath, "utf8");
}

function requireText(source, needle, label) {
  if (!source.includes(needle)) {
    console.error(`x feynman-autoresearch: ${label} is missing "${needle}"`);
    process.exit(1);
  }
}

const loop = readRequired("lib", "feynmanAutoresearchLoop.ts");
const tools = readRequired("app", "api", "tools", "route.ts");
const agent = readRequired("lib", "agent.ts");
const policy = readRequired("lib", "security", "toolCapabilityPolicy.ts");
const parity = JSON.parse(readRequired("docs", "ideas", "source-parity", "feynman.json"));
const packageJson = JSON.parse(readRequired("package.json"));
const spec = readRequired("specs", "features", "feynman-autoresearch-loop.md");

for (const needle of [
  "FEYNMAN_AUTORESEARCH_LIMITS",
  "normalizeVariantDefinitions",
  "normalizeTopic",
  "fixtureScorer",
  "formatAutoresearchReceipt",
  "runAutoresearchLoop",
  "maximumVariantsPerRun",
  "maximumFormattedChars",
]) {
  requireText(loop, needle, "autoresearch-loop lib");
}

requireText(tools, 'case "feynman_autoresearch"', "tools route");
requireText(agent, 'name: "feynman_autoresearch"', "agent tool catalog");
requireText(agent, 'feynman_autoresearch: "tier1"', "agent risk map");
requireText(policy, 'feynman_autoresearch: "mutate"', "network policy");
requireText(spec, "No paid APIs, no background cron", "feature guardrail");

const capability = parity.capabilities?.find(
  (entry) => entry.id === "autoresearch-loop",
);
if (capability?.disposition !== "adapted") {
  console.error("x feynman-autoresearch: parity row must be adapted");
  process.exit(1);
}

if (
  packageJson.scripts?.["feynman:autoresearch:runtime:check"] !==
  "node --no-warnings --experimental-strip-types scripts/check-feynman-autoresearch-loop-runtime.mjs"
) {
  console.error("x feynman-autoresearch: runtime package script is missing");
  process.exit(1);
}
if (
  packageJson.scripts?.["feynman:autoresearch:check"] !==
  "node scripts/validate-feynman-autoresearch-loop.mjs && npm run feynman:autoresearch:runtime:check"
) {
  console.error("x feynman-autoresearch: package check script is missing");
  process.exit(1);
}

console.log(
  "ok feynman-autoresearch-loop (bounded experiment loop, protected tool, Feynman integration, parity)",
);
