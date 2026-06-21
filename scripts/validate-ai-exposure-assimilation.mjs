#!/usr/bin/env node
/* eslint-disable no-console */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function fail(message) {
  console.error(`x ai-exposure-assimilation: ${message}`);
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

const exposureLib = readRequired("lib", "aiExposureReview.ts");
const shieldLib = readRequired("lib", "agentShieldPosture.ts");
const autonomyLib = readRequired("lib", "agentAutonomyGovernance.ts");
const card = readRequired("components", "recon", "AiExposureReviewCard.tsx");
const governance = readRequired("components", "cyber", "CyberGovernanceCards.tsx");
const cyberPage = readRequired("app", "cyber", "page.tsx");
const vulnReview = readRequired("lib", "vulnerabilityReview.ts");
const packageJson = JSON.parse(readRequired("package.json"));

for (const needle of [
  "AI_EXPOSURE_PACKS",
  "llm-endpoint",
  "leaked-key",
  "vector-store",
  "mcp-exposure",
  "unsafe-agent",
  "buildAiExposureReviewMarkdown",
  "rankAiExposureReviewPages",
]) {
  requireText(exposureLib, needle, "lib/aiExposureReview.ts");
}

for (const needle of ["AGENT_SHIELD_CHECKS", "mcp-origin-trust", "summarizeAgentShieldPosture"]) {
  requireText(shieldLib, needle, "lib/agentShieldPosture.ts");
}

for (const needle of ["AGENT_AUTONOMY_REVIEW_DOMAINS", "scope-enforcement", "provider-trust"]) {
  requireText(autonomyLib, needle, "lib/agentAutonomyGovernance.ts");
}

requireText(card, 'workflowId: "ai-exposure-review"', "AiExposureReviewCard.tsx");
requireText(governance, "AgentShield posture", "CyberGovernanceCards.tsx");
requireText(governance, "APTS review vocabulary", "CyberGovernanceCards.tsx");
requireText(cyberPage, "LazyAiExposureReviewCard", "app/cyber/page.tsx");
requireText(cyberPage, "LazyCyberGovernanceCards", "app/cyber/page.tsx");
requireText(vulnReview, "ai-osint-taxonomy", "lib/vulnerabilityReview.ts");

const aiOsint = JSON.parse(readRequired("docs", "ideas", "source-parity", "ai-osint.json"));
const agentShield = JSON.parse(readRequired("docs", "ideas", "source-parity", "agentshield.json"));
const owaspApts = JSON.parse(readRequired("docs", "ideas", "source-parity", "owasp-apts.json"));

if (aiOsint.status !== "complete") {
  fail("ai-osint.json must be complete");
}
if (agentShield.status !== "complete") {
  fail("agentshield.json must be complete");
}
if (owaspApts.status !== "complete") {
  fail("owasp-apts.json must be complete");
}

if (
  packageJson.scripts?.["cyber:ai-exposure:check"] !==
  "node scripts/validate-ai-exposure-assimilation.mjs && npm run cyber:ai-exposure:runtime:check"
) {
  fail("package.json cyber:ai-exposure:check script is missing or wrong");
}

console.log(
  `ok ai-exposure-assimilation (${AI_EXPOSURE_PACK_COUNT(exposureLib)} packs, AgentShield + APTS governance wired)`,
);

function AI_EXPOSURE_PACK_COUNT(source) {
  const matches = source.match(/id: "(llm-endpoint|leaked-key|vector-store|mcp-exposure|unsafe-agent)"/g);
  return matches?.length ?? 0;
}
