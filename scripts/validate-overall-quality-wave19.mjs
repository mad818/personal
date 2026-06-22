#!/usr/bin/env node
/* eslint-disable no-console */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function fail(message) {
  console.error(`x overall-quality-wave19: ${message}`);
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

const agent = readRequired("lib", "agent.ts");
const liveContext = readRequired("lib", "liveContext.ts");
const repoAssimilation = readRequired("lib", "repoAssimilation.ts");
const toolsRoute = readRequired("app", "api", "tools", "route.ts");
const plan = readRequired("docs", "plans", "overall-quality-wave19.md");
const pkg = readRequired("package.json");

const ragTools = [
  "open_meteo_weather",
  "sec_edgar_search",
  "hf_papers_search",
  "reddit_search",
  "github_trending",
  "rss_fetch",
];

for (const tool of ragTools) {
  requireText(agent, `name: "${tool}"`, "agent.ts");
  requireText(agent, `${tool}: "tier0"`, "agent.ts");
}

requireText(liveContext, "buildCrawlScrapeBridgeBrief", "liveContext.ts");
requireText(repoAssimilation, "correctionConstraints", "repoAssimilation.ts");
requireText(toolsRoute, "correction_hints", "tools/route.ts");
requireText(agent, "correction_hints", "agent.ts");
requireText(plan, "RAG tool parity", "overall-quality-wave19.md");
requireText(pkg, "assimilation:wave19:check", "package.json");
requireText(pkg, "prompt-recipes:check", "package.json");

console.log(
  "ok overall-quality-wave19 (RAG tool parity + crawl/scrape context + repo assimilation correction hints)",
);
