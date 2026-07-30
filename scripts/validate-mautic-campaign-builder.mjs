#!/usr/bin/env node
/* eslint-disable no-console */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (...parts) => {
  const filePath = path.join(root, ...parts);
  if (!fs.existsSync(filePath)) {
    console.error(`x mautic-campaign-builder: missing ${parts.join("/")}`);
    process.exit(1);
  }
  return fs.readFileSync(filePath, "utf8");
};
const fail = (message) => {
  console.error(`x mautic-campaign-builder: ${message}`);
  process.exit(1);
};
const requireText = (text, needle, label) => {
  if (!text.includes(needle)) fail(`${label} missing ${needle}`);
};

const component = read("components", "skills", "WorkflowForge.tsx");
const workflowLibrary = read("lib", "workflowDefinition.ts");
const seeds = read("lib", "assimilation", "seeds.ts");
const campaignSeed = read("lib", "campaignDraftWorkflow.ts");
const storage = read("lib", "assimilation", "storage.ts");
const route = read("app", "api", "workflows", "route.ts");
const companyMap = read("lib", "nexusCompanyMap.ts");
const matrix = JSON.parse(
  read("docs", "ideas", "source-parity", "mautic-mautic.json"),
);
const analysis = read(
  "docs",
  "ideas",
  "repo-analysis",
  "mautic-mautic",
  "REPO_CONTEXT.md",
);
const spec = read("specs", "features", "mautic-campaign-draft-builder.md");
const ecosystem = read("docs", "ideas", "assimilated-ecosystem.md");
const packageJson = JSON.parse(read("package.json"));

for (const needle of [
  "draftNodes",
  "draftEdges",
  "hasUnsavedChanges",
  "applyStructuralNodes",
  "addNode",
  "duplicateNode",
  "removeNode",
  "draggable",
  "onDragStart",
  "onDrop",
  "Move ${node.title} left",
  "Move ${node.title} right",
  "Add step",
  "Unsaved draft",
  "Save the current graph before staging a local run",
  "JSON.stringify(draftWorkflow, null, 2)",
  "...draftWorkflow",
])
  requireText(component, needle, "complete editor");

for (const needle of [
  "MAX_NODES = 24",
  "MAX_EDGES = 48",
  "normalizeWorkflowNodeOrder",
  "buildLinearWorkflowEdges",
  "moveWorkflowNode",
  "moveWorkflowNodeTo",
  "parseWorkflowDefinition",
  "Human-gated campaign workflows need an approval node.",
])
  requireText(workflowLibrary, needle, "workflow schema");

requireText(seeds, "CAMPAIGN_DRAFT_WORKFLOW", "campaign default registration");
requireText(campaignSeed, 'id: "wf-campaign-draft"', "campaign seed");
requireText(campaignSeed, 'name: "Campaign Draft Studio"', "campaign seed");
requireText(
  campaignSeed,
  'tags: ["campaign", "draft-only", "review"]',
  "campaign seed",
);
requireText(
  storage,
  "mergeMissingDefaultWorkflows",
  "non-destructive default merge",
);
requireText(route, "parseWorkflowDefinition", "protected save validation");
requireText(route, "{ status: 400 }", "invalid-save response");
requireText(companyMap, 'id: "mautic-campaign-builder"', "Company Map source");
requireText(
  analysis,
  "not into a marketing automation service",
  "source boundary",
);
requireText(spec, "whole Nexus editing lifecycle", "feature contract");
requireText(
  ecosystem,
  "[mautic/mautic](https://github.com/mautic/mautic)",
  "benefits ledger",
);

if (matrix.status !== "complete") fail("source matrix must be complete");
if (
  matrix.source.version !==
  "7.x-readme-5bdf397ee9bb394b70590369b9e757fdd681f8a0"
)
  fail("source version is stale");
if (matrix.source.license !== "GPL-3.0") fail("source license is stale");
if (matrix.capabilities.length !== 4)
  fail("expected four capability decisions");
const dispositions = Object.fromEntries(
  matrix.capabilities.map((capability) => [
    capability.id,
    capability.disposition,
  ]),
);
if (dispositions["campaign-workflow-builder"] !== "adapted")
  fail("campaign builder must be adapted");
for (const excluded of [
  "marketing-automation-platform",
  "contact-segmentation",
  "php-symfony-architecture",
]) {
  if (dispositions[excluded] !== "excluded")
    fail(`${excluded} must remain excluded`);
}

if (
  packageJson.scripts?.["mautic:campaign-builder:runtime:check"] !==
  "node --no-warnings --experimental-strip-types scripts/check-mautic-campaign-builder-runtime.mjs"
)
  fail("runtime command is missing");
if (
  packageJson.scripts?.["mautic:campaign-builder:check"] !==
  "node scripts/validate-mautic-campaign-builder.mjs && npm run mautic:campaign-builder:runtime:check"
)
  fail("focused check command is missing");
requireText(
  String(packageJson.scripts?.verify ?? ""),
  "npm run mautic:campaign-builder:check",
  "canonical verify wiring",
);

console.log(
  "ok mautic-campaign-builder (complete local editor, safe seed migration, server validation, human-gated draft boundary)",
);
