#!/usr/bin/env node
/* eslint-disable no-console */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function fail(message) {
  console.error(`x assimilation-wave23: ${message}`);
  process.exit(1);
}

function readRequired(...parts) {
  const filePath = path.join(root, ...parts);
  if (!fs.existsSync(filePath)) fail(`${parts.join("/")} is missing`);
  return fs.readFileSync(filePath, "utf8");
}

function requireText(source, needle, label) {
  if (!source.includes(needle)) fail(`${label} is missing "${needle}"`);
}

const ai = readRequired("lib", "ai.ts");
const agent = readRequired("lib", "agent.ts");
const hook = readRequired(".claude", "hooks", "pre-tool-use.mjs");
const yagni = readRequired("lib", "agentYagniGuardrails.ts");
const spectrum = readRequired("lib", "skillSpectrumPolicy.ts");
const bridge = readRequired("lib", "assimilation", "reconCodeIntelBridge.ts");
const plan = readRequired("docs", "plans", "assimilation-wave23-all-repos.md");
const batch = JSON.parse(
  readRequired("docs", "ideas", "batches", "2026-06-21-mario-link-batch.json"),
);
const pkg = readRequired("package.json");

requireText(ai, "YAGNI_AGENT_DIRECTIVE", "lib/ai.ts");
requireText(agent, "YAGNI_AGENT_DIRECTIVE", "lib/agent.ts");
requireText(hook, "blockedSkillCapabilities", "pre-tool-use.mjs");
requireText(hook, "yagniViolationPatterns", "pre-tool-use.mjs");
requireText(yagni, "YAGNI_SELF_CHECK", "agentYagniGuardrails.ts");
requireText(spectrum, "evaluateSkillCapabilities", "skillSpectrumPolicy.ts");
requireText(bridge, "CODEGRAPH_NEXUS_ROUTES", "reconCodeIntelBridge.ts");
requireText(plan, "Wave 23", "assimilation-wave23-all-repos.md");
const episodic = readRequired("lib", "episodicMemoryStore.ts");
const codegraph = readRequired("lib", "codegraphIndex.ts");
const feynmanFilters = readRequired("lib", "feynmanAcademicFilters.ts");
const feynmanResearch = readRequired("lib", "feynmanResearch.ts");
const skillSummary = readRequired("lib", "skillSpectrumSummary.ts");
const cyber = readRequired("components", "cyber", "CyberGovernanceCards.tsx");
const officePostRun = readRequired(
  "components",
  "home",
  "office",
  "officeCommandCenterPostRun.ts",
);

requireText(episodic, "EPISODIC_MEMORY_MAX_ENTRIES", "episodicMemoryStore.ts");
requireText(episodic, "buildEpisodicMemoryPromptBlock", "episodicMemoryStore.ts");
requireText(codegraph, "buildCodegraphSnapshot", "codegraphIndex.ts");
requireText(feynmanFilters, "applyFeynmanPaperSearchFilters", "feynmanAcademicFilters.ts");
requireText(feynmanResearch, "feynmanAcademicFilters", "feynmanResearch.ts");
requireText(skillSummary, "summarizeSkillSpectrumPolicies", "skillSpectrumSummary.ts");
requireText(cyber, "SkillSpector policy", "CyberGovernanceCards.tsx");
requireText(officePostRun, "appendEpisodicMemory", "officeCommandCenterPostRun.ts");
requireText(agent, "YAGNI_MAX_TOOL_CALLS_PER_RUN", "lib/agent.ts");

for (const skill of ["review", "refactor", "optimize", "architect"]) {
  readRequired(".claude", "skills", skill, "SKILL.md");
}

requireText(pkg, "codegraph:build", "package.json");

if (!batch.assimilationStatus?.all_github_repos_triaged) {
  fail("batch manifest missing triaged github repos flag");
}

console.log("ok assimilation-wave23 (YAGNI + SkillSpector wiring + batch enriched)");
