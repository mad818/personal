#!/usr/bin/env node
/* eslint-disable no-console */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function fail(message) {
  console.error(`x overall-quality-wave17: ${message}`);
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

const firecrawl = readRequired("lib", "firecrawlScrape.ts");
const worldBank = readRequired("lib", "worldBankMacro.ts");
const toolsRoute = readRequired("app", "api", "tools", "route.ts");
const agent = readRequired("lib", "agent.ts");
const ragRouter = readRequired("lib", "ragRouter.ts");
const toolPolicy = readRequired("lib", "security", "toolCapabilityPolicy.ts");
const plan = readRequired("docs", "plans", "overall-quality-wave17.md");
const pkg = readRequired("package.json");

requireText(firecrawl, "scrapeUrlWithFirecrawl", "firecrawlScrape.ts");
requireText(firecrawl, "FIRECRAWL_KEY", "firecrawlScrape.ts");
requireText(worldBank, "fetchWorldBankMacro", "worldBankMacro.ts");
requireText(worldBank, "formatWorldBankMacroResult", "worldBankMacro.ts");
requireText(toolsRoute, "scrapeUrlWithFirecrawl", "tools/route.ts");
requireText(toolsRoute, 'case "world_bank_macro"', "tools/route.ts");
requireText(toolsRoute, "worldBankMacro", "tools/route.ts");
requireText(agent, 'name: "world_bank_macro"', "agent.ts");
requireText(agent, "world_bank_macro: \"tier0\"", "agent.ts");
requireText(ragRouter, "world_bank_macro", "ragRouter.ts");
requireText(ragRouter, "Macro / World Bank", "ragRouter.ts");
requireText(toolPolicy, "world_bank_macro: \"networked\"", "toolCapabilityPolicy.ts");
requireText(plan, "Firecrawl BYOK", "overall-quality-wave17.md");
requireText(plan, "world_bank_macro", "overall-quality-wave17.md");
requireText(pkg, "assimilation:wave17:check", "package.json");
requireText(pkg, "nexus:overall:check", "package.json");

console.log(
  "ok overall-quality-wave17 (Firecrawl BYOK fetch_url + world_bank_macro tool + RAG routing)",
);
