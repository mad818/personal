import assert from "node:assert/strict";
import { buildCompanyMissionBrief, COMPANY_SKILL_SOURCES, getCompanyMapSummary, NEXUS_COMPANY_DEPARTMENTS } from "../lib/nexusCompanyMap.ts";

const departmentIds = new Set();
const sourceIds = new Set(COMPANY_SKILL_SOURCES.map((source) => source.id));
assert.equal(NEXUS_COMPANY_DEPARTMENTS.length, 7);
assert.ok(COMPANY_SKILL_SOURCES.length >= 10);

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

const summary = getCompanyMapSummary();
assert.equal(summary.departmentCount, NEXUS_COMPANY_DEPARTMENTS.length);
assert.equal(summary.sourceCount, COMPANY_SKILL_SOURCES.length);
console.log(`Nexus company map OK (${summary.departmentCount} departments, ${summary.sourceCount} sources, honest Codex/ChatGPT paths).`);
