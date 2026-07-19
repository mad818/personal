import assert from "node:assert/strict";
import { buildCompanyMissionBrief, COMPANY_SKILL_SOURCES, getCompanyMapSummary, NEXUS_COMPANY_DEPARTMENTS } from "../lib/nexusCompanyMap.ts";

const departmentIds = new Set();
const sourceIds = new Set(COMPANY_SKILL_SOURCES.map((source) => source.id));
const sourceUrls = new Set(COMPANY_SKILL_SOURCES.map((source) => source.url));
assert.equal(NEXUS_COMPANY_DEPARTMENTS.length, 7);
assert.ok(COMPANY_SKILL_SOURCES.length >= 10);
assert.equal(sourceIds.size, COMPANY_SKILL_SOURCES.length, "duplicate source id");
assert.equal(sourceUrls.size, COMPANY_SKILL_SOURCES.length, "duplicate source URL");

for (const department of NEXUS_COMPANY_DEPARTMENTS) {
  assert.ok(!departmentIds.has(department.id), `duplicate department ${department.id}`);
  departmentIds.add(department.id);
  assert.ok(department.sourceIds.length > 0, `${department.id} needs sources`);
  for (const sourceId of department.sourceIds) assert.ok(sourceIds.has(sourceId), `${department.id} has missing source ${sourceId}`);
  const brief = buildCompanyMissionBrief(department.id);
  assert.match(brief, /MAX coordinates/);
  assert.match(brief, /Required deliverables:/);
  assert.match(brief, /Boundary:/);
  assert.match(brief, /verified/i);
}

const graphify = COMPANY_SKILL_SOURCES.find((source) => source.id === "graphify");
assert.ok(graphify);
assert.match(graphify.purpose, /not the company org chart/i);
assert.equal(COMPANY_SKILL_SOURCES.find((source) => source.id === "claude-business-plugins")?.posture, "translation_required");

const last30days = COMPANY_SKILL_SOURCES.find((source) => source.id === "last30days-skill");
assert.ok(last30days);
assert.equal(last30days.posture, "review_first");
assert.match(last30days.codexPath, /preflight/i);
assert.ok(NEXUS_COMPANY_DEPARTMENTS.find((department) => department.id === "research-knowledge")?.sourceIds.includes(last30days.id));
assert.ok(NEXUS_COMPANY_DEPARTMENTS.find((department) => department.id === "marketing-social")?.sourceIds.includes(last30days.id));

const emilDesignSkills = COMPANY_SKILL_SOURCES.find((source) => source.id === "emilkowalski-skills");
assert.ok(emilDesignSkills);
assert.equal(emilDesignSkills.posture, "review_first");
assert.match(emilDesignSkills.codexPath, /Nexus taste contract/i);
assert.ok(NEXUS_COMPANY_DEPARTMENTS.find((department) => department.id === "design")?.sourceIds.includes(emilDesignSkills.id));
assert.equal(COMPANY_SKILL_SOURCES.filter((source) => source.url === "https://github.com/emilkowalski/skills").length, 1);

const frontendSlides = COMPANY_SKILL_SOURCES.find((source) => source.id === "frontend-slides");
assert.ok(frontendSlides);
assert.equal(frontendSlides.posture, "review_first");
assert.match(frontendSlides.codexPath, /approval/i);
assert.ok(NEXUS_COMPANY_DEPARTMENTS.find((department) => department.id === "design")?.sourceIds.includes(frontendSlides.id));
assert.ok(NEXUS_COMPANY_DEPARTMENTS.find((department) => department.id === "marketing-social")?.sourceIds.includes(frontendSlides.id));

const mattSkills = COMPANY_SKILL_SOURCES.find((source) => source.id === "mattpocock-skills");
assert.ok(mattSkills);
assert.equal(mattSkills.posture, "review_first");
assert.ok(NEXUS_COMPANY_DEPARTMENTS.find((department) => department.id === "command-operations")?.sourceIds.includes(mattSkills.id));
assert.ok(NEXUS_COMPANY_DEPARTMENTS.find((department) => department.id === "engineering")?.sourceIds.includes(mattSkills.id));

const deepModules = COMPANY_SKILL_SOURCES.find((source) => source.id === "mattpocock-deep-modules-pr");
assert.ok(deepModules);
assert.equal(deepModules.kind, "reference");
assert.match(deepModules.purpose, /in-progress/i);
assert.ok(NEXUS_COMPANY_DEPARTMENTS.find((department) => department.id === "engineering")?.sourceIds.includes(deepModules.id));

const davidSkills = COMPANY_SKILL_SOURCES.find((source) => source.id === "davidondrej-skills");
assert.ok(davidSkills);
assert.equal(davidSkills.posture, "review_first");
assert.match(davidSkills.codexPath, /never inherit/i);
assert.ok(NEXUS_COMPANY_DEPARTMENTS.find((department) => department.id === "research-knowledge")?.sourceIds.includes(davidSkills.id));

const plinySources = COMPANY_SKILL_SOURCES.filter((source) => source.id.startsWith("pliny-"));
assert.equal(plinySources.length, 6);
assert.ok(plinySources.every((source) => source.kind === "reference"));
assert.match(COMPANY_SKILL_SOURCES.find((source) => source.id === "pliny-autotemp")?.codexPath ?? "", /existing AI and eval gates/i);
assert.match(COMPANY_SKILL_SOURCES.find((source) => source.id === "pliny-leakhub")?.codexPath ?? "", /never solicit, publish, or reward stolen prompts/i);
assert.match(COMPANY_SKILL_SOURCES.find((source) => source.id === "pliny-parseltongue")?.codexPath ?? "", /AGPL/i);
assert.match(COMPANY_SKILL_SOURCES.find((source) => source.id === "pliny-glossopetrae")?.codexPath ?? "", /read-only skill scanner/i);
assert.match(COMPANY_SKILL_SOURCES.find((source) => source.id === "pliny-ourobopus")?.codexPath ?? "", /no autonomous self-modification/i);
assert.ok(NEXUS_COMPANY_DEPARTMENTS.find((department) => department.id === "marketing-social")?.sourceIds.includes("pliny-autostorygen"));
assert.ok(NEXUS_COMPANY_DEPARTMENTS.find((department) => department.id === "legal-trust")?.sourceIds.includes("pliny-leakhub"));
assert.ok(NEXUS_COMPANY_DEPARTMENTS.find((department) => department.id === "legal-trust")?.sourceIds.includes("pliny-glossopetrae"));

const summary = getCompanyMapSummary();
assert.equal(summary.departmentCount, NEXUS_COMPANY_DEPARTMENTS.length);
assert.equal(summary.sourceCount, COMPANY_SKILL_SOURCES.length);
console.log(`Nexus company map OK (${summary.departmentCount} departments, ${summary.sourceCount} sources, honest Codex/ChatGPT paths).`);
