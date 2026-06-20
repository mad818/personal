#!/usr/bin/env node
/* eslint-disable no-console */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function readRequired(...parts) {
  const filePath = path.join(root, ...parts);
  if (!fs.existsSync(filePath)) {
    console.error(`x feynman-watch: ${parts.join("/")} is missing`);
    process.exit(1);
  }
  return fs.readFileSync(filePath, "utf8");
}

function requireText(source, needle, label) {
  if (!source.includes(needle)) {
    console.error(`x feynman-watch: ${label} is missing "${needle}"`);
    process.exit(1);
  }
}

const watchLib = readRequired("lib", "feynmanResearchWatch.ts");
const tools = readRequired("app", "api", "tools", "route.ts");
const agent = readRequired("lib", "agent.ts");
const policy = readRequired("lib", "security", "toolCapabilityPolicy.ts");
const parity = JSON.parse(readRequired("docs", "ideas", "source-parity", "feynman.json"));
const packageJson = JSON.parse(readRequired("package.json"));
const spec = readRequired("specs", "features", "feynman-research-watch.md");

for (const needle of [
  "FEYNMAN_WATCH_LIMITS",
  "normalizeWatchTopic",
  "normalizeWatchLabel",
  "normalizeWatchId",
  "sanitizeSnapshot",
  "hashSnapshot",
  "buildFixtureSnapshot",
  "createResearchWatch",
  "listResearchWatches",
  "setResearchWatchStatus",
  "runResearchWatchCheck",
  "formatWatchList",
  "formatWatchCheckResult",
  "maximumWatches",
]) {
  requireText(watchLib, needle, "research-watch lib");
}

requireText(tools, 'case "feynman_watch"', "tools route");
requireText(agent, 'name: "feynman_watch"', "agent tool catalog");
requireText(agent, 'feynman_watch: "tier1"', "agent risk map");
requireText(policy, 'feynman_watch: "mutate"', "network policy");
requireText(spec, "No authentication, paid APIs, or scheduled execution", "feature guardrail");

const capability = parity.capabilities?.find(
  (entry) => entry.id === "recurring-research-watch",
);
if (capability?.disposition !== "adapted") {
  console.error("x feynman-watch: parity row must be adapted");
  process.exit(1);
}

if (
  packageJson.scripts?.["feynman:watch:runtime:check"] !==
  "node --no-warnings --experimental-strip-types scripts/check-feynman-research-watch-runtime.mjs"
) {
  console.error("x feynman-watch: runtime package script is missing");
  process.exit(1);
}
if (
  packageJson.scripts?.["feynman:watch:check"] !==
  "node scripts/validate-feynman-research-watch.mjs && npm run feynman:watch:runtime:check"
) {
  console.error("x feynman-watch: package check script is missing");
  process.exit(1);
}

console.log(
  "ok feynman-research-watch (create/list/enable/disable/run_check, snapshot hashing, no-cron, protected tool, parity)",
);
