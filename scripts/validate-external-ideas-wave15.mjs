#!/usr/bin/env node
/* eslint-disable no-console */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function fail(message) {
  console.error(`x external-ideas-wave15: ${message}`);
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

const team = readRequired("lib", "teamOrchestration.ts");
const thesis = readRequired("lib", "alphaTradeThesis.ts");
const cyber = readRequired("lib", "cybersecuritySkillTaxonomy.ts");
const ragEval = readRequired("lib", "ragEvalScoring.ts");
const recipes = readRequired("lib", "promptRecipes.ts");
const projectImpact = readRequired("lib", "projectImpact.ts");
const crawl = readRequired("lib", "crawlScrapeBridgePatterns.ts");
const docMd = readRequired("lib", "documentMarkdownIntake.ts");
const agent = readRequired("lib", "agent.ts");
const dispatch = readRequired("lib", "assistantDispatch.ts");
const route = readRequired("app", "api", "tools", "route.ts");
const hq = readRequired("components", "home", "office", "HQTerminalSection.tsx");
const momentum = readRequired("components", "alpha", "MomentumScanner.tsx");
const mapping = readRequired("docs", "ideas", "external-links-mapping.md");
const pkg = readRequired("package.json");

requireText(team, "buildTeamOrchestrationPlan", "teamOrchestration.ts");
requireText(thesis, "parseTradeThesisResponse", "alphaTradeThesis.ts");
requireText(cyber, "buildCybersecuritySkillTaxonomyBlock", "cybersecuritySkillTaxonomy.ts");
requireText(ragEval, "buildRagEvalRequirementsBlock", "ragEvalScoring.ts");
requireText(recipes, "PROMPT_RECIPES", "promptRecipes.ts");
requireText(agent, "project_impact", "agent.ts");
requireText(dispatch, "formatTeamOrchestrationBlock", "assistantDispatch.ts");
requireText(route, 'case "project_impact"', "tools/route.ts");
requireText(hq, "TeamOrchestrationStrip", "HQTerminalSection.tsx");
requireText(momentum, "TradeThesisPanel", "MomentumScanner.tsx");
requireText(crawl, "firecrawl/firecrawl", "crawlScrapeBridgePatterns.ts");
requireText(docMd, "markitdown", "documentMarkdownIntake.ts");
requireText(mapping, "GitHub batch intake — 2026-06-20 (crawl/scrape/browser)", "external-links-mapping.md");
requireText(pkg, "assimilation:wave15:check", "package.json");

console.log("ok external-ideas-wave15 (orchestration, thesis, impact, crawl batch documented)");
