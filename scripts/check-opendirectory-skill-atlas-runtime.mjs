#!/usr/bin/env node
/* eslint-disable no-console */

import assert from "node:assert/strict";
import {
  EXCLUDED_GO_TO_MARKET_SKILLS,
  GO_TO_MARKET_AVAILABILITY,
  GO_TO_MARKET_FAMILY_IDS,
  GO_TO_MARKET_SKILLS,
  GO_TO_MARKET_SOURCE_CATEGORIES,
  formatGoToMarketSkillContract,
  formatGoToMarketSkillList,
  listGoToMarketSkills,
  resolveGoToMarketSkill,
} from "../lib/goToMarketSkillAtlas.ts";

const expectedCategoryCounts = {
  "visual-media": 10,
  content: 10,
  launch: 5,
  "gtm-intelligence": 14,
  outreach: 1,
  research: 9,
  "developer-tools": 8,
  other: 1,
};
const expectedExcluded = [
  "claude-md-generator",
  "cold-email-verifier",
  "npm-downloads-to-leads",
  "yc-intent-radar-skill",
].sort();

assert.equal(GO_TO_MARKET_SKILLS.length, 58);
assert.equal(EXCLUDED_GO_TO_MARKET_SKILLS.length, 4);
assert.equal(
  new Set(GO_TO_MARKET_SKILLS.map((skill) => skill.id)).size,
  GO_TO_MARKET_SKILLS.length,
);
assert.deepEqual(
  EXCLUDED_GO_TO_MARKET_SKILLS.map((skill) => skill.id).sort(),
  expectedExcluded,
);

for (const category of GO_TO_MARKET_SOURCE_CATEGORIES) {
  assert.equal(
    GO_TO_MARKET_SKILLS.filter((skill) => skill.sourceCategory === category)
      .length,
    expectedCategoryCounts[category],
    `category count drifted for ${category}`,
  );
}

for (const skill of GO_TO_MARKET_SKILLS) {
  assert.ok(GO_TO_MARKET_FAMILY_IDS.includes(skill.family));
  assert.ok(GO_TO_MARKET_AVAILABILITY.includes(skill.availability));
  assert.ok(skill.purpose.length >= 60);
  assert.ok(skill.requirements.length >= 2);
  assert.equal(
    skill.sourceUrl,
    `https://github.com/Varnan-Tech/OpenDirectory/blob/main/skills/${skill.id}/SKILL.md`,
  );
  assert.ok(!expectedExcluded.includes(skill.id));

  const resolved = resolveGoToMarketSkill(skill.id);
  assert.ok(resolved);
  assert.ok(resolved.inputs.length >= 3);
  assert.ok(resolved.workflow.length >= 6);
  assert.ok(resolved.guardrails.length >= 4);
  assert.ok(resolved.acceptanceChecks.length >= 4);
}

const all = listGoToMarketSkills({ limit: 62 });
assert.equal(all.total, 58);
assert.equal(all.matched, 58);
assert.equal(all.returned, 58);
assert.equal(all.excludedCount, 4);

const pricing = listGoToMarketSkills({ query: "pricing", limit: 62 });
assert.ok(pricing.matched >= 2);
assert.ok(pricing.skills.some((skill) => skill.id === "pricing-finder"));
const launch = listGoToMarketSkills({
  sourceCategory: "launch",
  limit: 62,
});
assert.equal(launch.matched, 5);
const connector = listGoToMarketSkills({
  availability: "connector_required",
  limit: 62,
});
assert.ok(connector.matched >= 20);
const bounded = listGoToMarketSkills({ limit: 2 });
assert.equal(bounded.returned, 2);

assert.equal(resolveGoToMarketSkill("unknown"), null);
assert.equal(resolveGoToMarketSkill(" COLD-EMAIL-VERIFIER "), null);
assert.equal(
  resolveGoToMarketSkill(" PRODUCTHUNT-LAUNCH-KIT ")?.id,
  "producthunt-launch-kit",
);

const listText = formatGoToMarketSkillList({ query: "launch", limit: 3 });
assert.match(listText, /Go-to-market skill atlas:/);
assert.match(listText, /resolve_go_to_market_skill/);
assert.doesNotMatch(listText, /cold-email-verifier/);

const contract = formatGoToMarketSkillContract("reddit-post-engine");
assert.match(contract, /Availability: connector_required/);
assert.match(contract, /Requirements:/);
assert.match(contract, /Workflow:/);
assert.match(contract, /Guardrails:/);
assert.match(contract, /Acceptance checks:/);
assert.match(contract, /Execution boundary:/);
assert.match(contract, /does not authorize/);
assert.match(
  formatGoToMarketSkillContract("missing"),
  /Unknown go-to-market skill/,
);

console.log(
  "ok opendirectory-skill-atlas-runtime (58 active, 4 excluded, categories, filters, resolution, bounded formatting)",
);
