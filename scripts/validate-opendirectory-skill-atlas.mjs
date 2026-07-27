#!/usr/bin/env node
/* eslint-disable no-console */

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const expectedActive = [
  "app-store-review-arbitrage",
  "blog-cover-image-cli",
  "brand-alchemy",
  "company-radar",
  "competitor-pr-finder",
  "cook-the-blog",
  "dependency-update-bot",
  "docs-from-code",
  "domain-expired-opportunity-finder",
  "dx-roaster",
  "email-newsletter",
  "explain-this-pr",
  "geo-gap-fixer",
  "gh-issue-to-demand-signal",
  "github-discussion-to-devrel-content",
  "google-trends-api-skills",
  "graphic-case-study",
  "graphic-chart",
  "graphic-ebook",
  "graphic-gif",
  "graphic-slide-deck",
  "hackernews-intel",
  "human-tone",
  "hyperframes-product-launch-video",
  "kill-the-standup",
  "linkedin-job-post-to-buyer-pain-map",
  "linkedin-post-generator",
  "llms-txt-generator",
  "map-your-market",
  "meeting-brief-generator",
  "meta-ads-skill",
  "meta-tribeV2-skill",
  "newsletter-digest",
  "noise-to-linkedin-carousel",
  "noise2blog",
  "oss-launch-kit",
  "outreach-sequence-builder",
  "podcast-transcript-fetcher",
  "position-me",
  "pr-description-writer",
  "pricing-finder",
  "pricing-page-psychology-audit",
  "product-update-logger",
  "producthunt-launch-kit",
  "reddit-icp-monitor",
  "reddit-post-engine",
  "schema-markup-generator",
  "sdk-adoption-tracker",
  "show-hn-writer",
  "store-listing-optimizer",
  "tweet-thread-from-blog",
  "twitter-GTM-find-skill",
  "vc-curated-match",
  "vc-finder",
  "vid-motion-graphics",
  "vid-product-launch",
  "vid-sizzle-reel",
  "where-your-customer-lives",
].sort();
const expectedExcluded = [
  "claude-md-generator",
  "cold-email-verifier",
  "npm-downloads-to-leads",
  "yc-intent-radar-skill",
].sort();

function fail(message) {
  console.error(`x opendirectory-skill-atlas: ${message}`);
  process.exit(1);
}

function readRequired(...parts) {
  const filePath = path.join(root, ...parts);
  if (!fs.existsSync(filePath)) fail(`${parts.join("/")} is missing`);
  return fs.readFileSync(filePath, "utf8");
}

function requireAll(source, label, needles) {
  for (const needle of needles) {
    if (!source.includes(needle)) fail(`${label} is missing ${needle}`);
  }
}

const atlas = readRequired("lib", "goToMarketSkillAtlas.ts");
const component = readRequired(
  "components",
  "skills",
  "GoToMarketSkillAtlas.tsx",
);
const page = readRequired("app", "skills", "page.tsx");
const agent = readRequired("lib", "agent.ts");
const toolsRoute = readRequired("app", "api", "tools", "route.ts");
const toolPolicy = readRequired("lib", "security", "toolCapabilityPolicy.ts");
const chatRouting = readRequired("lib", "chatCapabilityRouting.ts");
const ai = readRequired("lib", "ai.ts");
const spec = readRequired(
  "specs",
  "features",
  "opendirectory-go-to-market-skill-atlas.md",
);
const repoContext = readRequired(
  "docs",
  "ideas",
  "repo-analysis",
  "varnan-tech-opendirectory",
  "REPO_CONTEXT.md",
);
const repoResponse = readRequired(
  "docs",
  "ideas",
  "repo-analysis",
  "varnan-tech-opendirectory",
  "response.md",
);
const ecosystem = readRequired("docs", "ideas", "assimilated-ecosystem.md");
const companyMap = readRequired("lib", "nexusCompanyMap.ts");
const tasks = readRequired("tasks", "todo.md");
const packageJson = JSON.parse(readRequired("package.json"));
const matrix = JSON.parse(
  readRequired(
    "docs",
    "ideas",
    "source-parity",
    "varnan-tech-opendirectory.json",
  ),
);

requireAll(atlas, "atlas", [
  'id: "varnan-tech-opendirectory"',
  'readmeBlobSha: "f5101cf2b986f13172b15a5280c947e13f1d2bf2"',
  "GO_TO_MARKET_SKILLS",
  "EXCLUDED_GO_TO_MARKET_SKILLS",
  "listGoToMarketSkills",
  "resolveGoToMarketSkill",
  "formatGoToMarketSkillList",
  "formatGoToMarketSkillContract",
  "Execution boundary:",
]);
for (const id of [...expectedActive, ...expectedExcluded]) {
  if (!atlas.includes(`"${id}"`)) fail(`atlas inventory is missing ${id}`);
}

requireAll(component, "Skill Library component", [
  'data-testid="go-to-market-skill-atlas"',
  "Go-to-market procedure atlas",
  "GO_TO_MARKET_SOURCE_CATEGORIES",
  "GO_TO_MARKET_FAMILY_IDS",
  "GO_TO_MARKET_AVAILABILITY",
  "resolveGoToMarketSkill",
  "Read-only contract.",
]);
requireAll(page, "Skill Library reachability", [
  'import("@/components/skills/GoToMarketSkillAtlas")',
  'title="Go-to-market procedure atlas"',
  "<GoToMarketSkillAtlas />",
]);
requireAll(agent, "agent tools", [
  'list_go_to_market_skills: "tier0"',
  'resolve_go_to_market_skill: "tier0"',
  'name: "list_go_to_market_skills"',
  'name: "resolve_go_to_market_skill"',
  "GO_TO_MARKET_SKILL_INTENT_RE",
  'names.add("list_go_to_market_skills")',
  'names.add("resolve_go_to_market_skill")',
]);
requireAll(toolsRoute, "protected tools route", [
  "formatGoToMarketSkillList",
  "formatGoToMarketSkillContract",
  'case "list_go_to_market_skills":',
  'case "resolve_go_to_market_skill":',
]);
requireAll(toolPolicy, "tool capability policy", [
  'list_go_to_market_skills: "read"',
  'resolve_go_to_market_skill: "read"',
]);
requireAll(chatRouting, "tool route mapping", [
  'list_go_to_market_skills: "/internal/skills"',
  'resolve_go_to_market_skill: "/internal/skills"',
]);
requireAll(ai, "assistant prompt", [
  "list_go_to_market_skills(query?, category?, family?, availability?, limit?)",
  "resolve_go_to_market_skill(skill)",
  "complete read-only requirements",
]);
requireAll(spec, "feature spec", [
  "Current README inventory: 62 skills",
  "58 active procedures",
  "four exact exclusions",
]);
requireAll(repoContext, "repository analysis", [
  "62 skills",
  "strategic remote review",
  "No clone",
  "To exclude",
]);
requireAll(repoResponse, "repository analysis response", [
  "62-skill",
  "58 guarded project-owned procedures",
  "four explicit boundary exclusions",
]);
requireAll(ecosystem, "ecosystem benefits", [
  "[Varnan-Tech/OpenDirectory](https://github.com/Varnan-Tech/OpenDirectory)",
  "Complete guarded GTM atlas",
  "no contact harvesting",
]);
requireAll(companyMap, "Company Map source", [
  'id: "opendirectory-gtm-skills"',
  'label: "OpenDirectory GTM Skill Atlas"',
  "list_go_to_market_skills then resolve_go_to_market_skill",
]);
requireAll(tasks, "task plan", [
  "OPENDIRECTORY-GO-TO-MARKET-SKILL-ATLAS",
  "exact 62-row category inventory",
  "four explicit boundary exclusions",
]);

if (matrix.status !== "complete") fail("source-parity matrix must be complete");
if (matrix.source?.version !== "main-1.0.1-2026-07-26") {
  fail("source-parity matrix must use the current package/main review");
}
if (matrix.source?.license !== "MIT") fail("source-parity license must be MIT");
const skillCapabilities = matrix.capabilities.filter((capability) =>
  capability.id.startsWith("skill-"),
);
if (skillCapabilities.length !== 62) {
  fail(
    `source parity must contain 62 skill rows, found ${skillCapabilities.length}`,
  );
}
const actualSkillIds = skillCapabilities
  .map((capability) => capability.id.slice("skill-".length))
  .sort();
const expectedSkillIds = [...expectedActive, ...expectedExcluded].sort();
if (JSON.stringify(actualSkillIds) !== JSON.stringify(expectedSkillIds)) {
  fail("source-parity skill inventory drifted");
}
for (const id of expectedActive) {
  const capability = skillCapabilities.find(
    (candidate) => candidate.id === `skill-${id}`,
  );
  if (capability?.disposition !== "adapted") {
    fail(`source parity must adapt ${id}`);
  }
  if (!capability.proof?.includes("lib/goToMarketSkillAtlas.ts")) {
    fail(`${id} must cite the active atlas`);
  }
}
for (const id of expectedExcluded) {
  const capability = skillCapabilities.find(
    (candidate) => candidate.id === `skill-${id}`,
  );
  if (capability?.disposition !== "excluded") {
    fail(`source parity must exclude ${id}`);
  }
  if (!["security", "product_purpose"].includes(capability.conflict)) {
    fail(`${id} must have a security or product-purpose conflict`);
  }
}
for (const id of [
  "category-browser-and-search",
  "multi-host-installer",
  "plugin-and-desktop-distribution",
]) {
  if (!matrix.capabilities.some((capability) => capability.id === id)) {
    fail(`source parity is missing ${id}`);
  }
}
if (
  matrix.capabilities.some((capability) => capability.disposition === "pending")
) {
  fail("source parity must not leave pending capabilities");
}

if (
  packageJson.scripts?.["opendirectory:skills:runtime:check"] !==
  "node --no-warnings --experimental-strip-types scripts/check-opendirectory-skill-atlas-runtime.mjs"
) {
  fail("package.json is missing opendirectory:skills:runtime:check");
}
if (
  packageJson.scripts?.["opendirectory:skills:check"] !==
  "node scripts/validate-opendirectory-skill-atlas.mjs && npm run opendirectory:skills:runtime:check"
) {
  fail("package.json is missing opendirectory:skills:check");
}
if (
  !packageJson.scripts?.verify?.includes("npm run opendirectory:skills:check")
) {
  fail("canonical verify must include opendirectory:skills:check");
}

console.log(
  `ok opendirectory-skill-atlas (${expectedActive.length} active, ${expectedExcluded.length} excluded, 62 current skills, protected UI and tools)`,
);
