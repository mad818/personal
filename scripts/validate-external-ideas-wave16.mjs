#!/usr/bin/env node
/* eslint-disable no-console */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function fail(message) {
  console.error(`x external-ideas-wave16: ${message}`);
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

const workflow = readRequired("lib", "agentWorkflowBridgePatterns.ts");
const forensics = readRequired("lib", "forensicsAdvisoryChecklist.ts");
const deepResearch = readRequired("lib", "deepResearch.ts");
const liveContext = readRequired("lib", "liveContext.ts");
const mapping = readRequired("docs", "ideas", "external-links-mapping.md");
const ecosystem = readRequired("docs", "ideas", "assimilated-ecosystem.md");
const pkg = readRequired("package.json");

requireText(workflow, "bytedance/deer-flow", "agentWorkflowBridgePatterns.ts");
requireText(workflow, "resolveAgentPipelineFamily", "agentWorkflowBridgePatterns.ts");
requireText(workflow, "lsdefine/GenericAgent", "agentWorkflowBridgePatterns.ts");
requireText(forensics, "FORENSICS_ADVISORY_STEPS", "forensicsAdvisoryChecklist.ts");
requireText(forensics, "preserve", "forensicsAdvisoryChecklist.ts");
requireText(liveContext, "buildForensicsAdvisoryBlock", "liveContext.ts");
requireText(deepResearch, "hasDeepResearchIntent", "deepResearch.ts");
requireText(mapping, "nomad/tutor/agent", "external-links-mapping.md");
requireText(mapping, "project-nomad", "external-links-mapping.md");
requireText(mapping, "hackers-arise.com", "external-links-mapping.md");
requireText(ecosystem, "deer-flow", "assimilated-ecosystem.md");
requireText(ecosystem, "timesfm", "assimilated-ecosystem.md");
requireText(pkg, "assimilation:wave16:check", "package.json");

console.log(
  "ok external-ideas-wave16 (nomad/tutor/agent batch + forensics advisory wired)",
);
