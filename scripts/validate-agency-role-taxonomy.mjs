#!/usr/bin/env node
/* eslint-disable no-console */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(rel) {
  try {
    return fs.readFileSync(path.join(root, rel), "utf8");
  } catch {
    return "";
  }
}

function fail(message) {
  console.error(`agency-role-taxonomy validation failed: ${message}`);
  process.exit(1);
}

function assertIncludes(text, needle, label) {
  if (!text.includes(needle)) fail(`${label} missing ${needle}`);
}

const taxonomy = read("lib/agentRoleTaxonomy.ts");
const liveContext = read("lib/liveContext.ts");
const prompts = read("components/home/office/prompts.ts");
const skillsPage = read("app/skills/page.tsx");
const roleLibrary = read("components/skills/AgencyRoleLibrary.tsx");
const packageJson = read("package.json");
const spec = read("specs/features/agency-agents-native-role-taxonomy.md");
const externalMap = read("docs/ideas/external-links-mapping.md");
const assimilated = read("docs/ideas/assimilated-ecosystem.md");

if (!taxonomy) fail("missing lib/agentRoleTaxonomy.ts");

assertIncludes(taxonomy, "AGENCY_AGENT_SOURCE", "taxonomy source attribution");
assertIncludes(taxonomy, "AGENCY_AGENT_ROLE_PACKS", "taxonomy role pack export");
assertIncludes(taxonomy, "buildAgencyRoleTaxonomyBlock", "taxonomy prompt block builder");
assertIncludes(taxonomy, "getAgencyRoutingKeywords", "taxonomy routing keywords export");
assertIncludes(taxonomy, "matchAgencyRolePrompt", "taxonomy prompt matcher");
assertIncludes(taxonomy, "getAgencyRoleInventorySummary", "taxonomy inventory summary");
assertIncludes(taxonomy, "No upstream prompt bodies are copied", "taxonomy no-copy guardrail");

for (const agent of ["jansky", "orbit", "nova", "cipher", "flux"]) {
  assertIncludes(taxonomy, `agentId: "${agent}"`, `taxonomy agent ${agent}`);
}

for (const role of [
  "Codebase Onboarding",
  "Minimal Change",
  "Incident Response",
  "Threat Intelligence",
  "Trend Research",
  "Market Measurement",
]) {
  assertIncludes(taxonomy, role, `taxonomy role ${role}`);
}

assertIncludes(liveContext, "buildAgencyRoleTaxonomyBlock", "live context import/use");
assertIncludes(liveContext, "[AGENCY ROLE PACK", "live context role pack block");

assertIncludes(prompts, "getAgencyRoutingKeywords", "prompt routing import/use");
assertIncludes(prompts, "scoreAgencyRoleKeywords", "prompt routing scorer");

if (!roleLibrary) fail("missing components/skills/AgencyRoleLibrary.tsx");
assertIncludes(roleLibrary, "AGENCY_AGENT_ROLE_PACKS", "role library role packs");
assertIncludes(roleLibrary, "matchAgencyRolePrompt", "role library prompt preview");
assertIncludes(roleLibrary, "No copied prompt bodies", "role library no-copy guardrail");
assertIncludes(roleLibrary, "data-testid=\"agency-role-library\"", "role library test id");
assertIncludes(roleLibrary, "data-testid=\"agency-role-routing-preview\"", "routing preview test id");

assertIncludes(skillsPage, "AgencyRoleLibrary", "skills page role library import/mount");
assertIncludes(skillsPage, "Agency role library", "skills page role library section");

assertIncludes(packageJson, "\"agent:taxonomy:check\"", "package script");
const packageData = JSON.parse(packageJson);
const verifyScript = String(packageData.scripts?.verify ?? "");
assertIncludes(verifyScript, "npm run agent:taxonomy:check", "verify taxonomy wiring");
assertIncludes(verifyScript, "npm run type-check", "verify type-check wiring");
if (
  verifyScript.indexOf("npm run agent:taxonomy:check") >
  verifyScript.indexOf("npm run type-check")
) {
  fail("verify must run agent taxonomy before type-check");
}

assertIncludes(spec, "no-vendoring guardrails", "feature spec guardrails");
assertIncludes(externalMap, "msitarzewski/agency-agents", "external source map");
assertIncludes(assimilated, "agency-agents", "assimilated source map");

if (/developer_instructions|install\.sh|convert\.sh/.test(taxonomy)) {
  fail("taxonomy appears to vendor generated-agent implementation details");
}

console.log("Agency role taxonomy OK (curated role packs, prompt routing, live-context guardrails wired).");
