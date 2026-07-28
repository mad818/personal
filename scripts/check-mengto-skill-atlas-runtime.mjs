#!/usr/bin/env node
import assert from "node:assert/strict";
import {
  DESIGN_SKILL_AVAILABILITY,
  DESIGN_SKILL_FAMILY_IDS,
  DESIGN_SKILL_SOURCE_CATEGORIES,
  DESIGN_SKILLS,
  formatDesignSkillContract,
  formatDesignSkillList,
  listDesignSkills,
  resolveDesignSkill,
} from "../lib/designSkillAtlas.ts";

assert.equal(DESIGN_SKILLS.length, 101);
assert.equal(new Set(DESIGN_SKILLS.map((skill) => skill.id)).size, 101);

const categoryCounts = Object.fromEntries(
  DESIGN_SKILL_SOURCE_CATEGORIES.map((category) => [
    category,
    DESIGN_SKILLS.filter((skill) => skill.sourceCategory === category).length,
  ]),
);
assert.deepEqual(categoryCounts, {
  codex: 17,
  "customer-support": 2,
  media: 2,
  ui: 1,
  "web-design": 79,
});

for (const family of DESIGN_SKILL_FAMILY_IDS) {
  assert.ok(
    DESIGN_SKILLS.some((skill) => skill.family === family),
    `${family} needs an active procedure`,
  );
}
for (const availability of DESIGN_SKILL_AVAILABILITY) {
  assert.ok(
    DESIGN_SKILLS.some((skill) => skill.availability === availability),
    `${availability} needs a truthful example`,
  );
}

for (const definition of DESIGN_SKILLS) {
  const resolved = resolveDesignSkill(definition.id);
  assert.ok(resolved, `${definition.id} must resolve`);
  assert.equal(resolved.id, definition.id);
  assert.ok(resolved.requirements.length >= 1);
  assert.ok(resolved.inputs.length >= 3);
  assert.ok(resolved.workflow.length >= 6);
  assert.ok(resolved.guardrails.length >= 4);
  assert.ok(resolved.acceptanceChecks.length >= 4);
  assert.match(
    resolved.sourceUrl,
    new RegExp(
      `^https://github\\.com/MengTo/Skills/blob/main/agent-skills/${definition.sourceCategory}/${definition.id}/SKILL\\.md$`,
    ),
  );
}

const pricing = listDesignSkills({ query: "pricing" });
assert.ok(pricing.skills.some((skill) => skill.id === "pricing-page"));
assert.equal(pricing.total, 101);

const connectorSupport = listDesignSkills({
  family: "support",
  availability: "connector_required",
  limit: 100,
});
assert.equal(connectorSupport.matched, 3);
assert.ok(
  connectorSupport.skills.every(
    (skill) => skill.availability === "connector_required",
  ),
);

const bounded = listDesignSkills({ limit: 500 });
assert.equal(bounded.returned, 100);
assert.equal(bounded.skills.length, 100);

const listText = formatDesignSkillList({ query: "webgl", limit: 3 });
assert.match(listText, /101 active project-owned procedures/);
assert.match(listText, /resolve_design_skill/);

const pricingContract = formatDesignSkillContract("pricing-page");
assert.match(pricingContract, /Pricing Page/);
assert.match(pricingContract, /Requirements:/);
assert.match(pricingContract, /Inputs:/);
assert.match(pricingContract, /Workflow:/);
assert.match(pricingContract, /Guardrails:/);
assert.match(pricingContract, /Acceptance checks:/);
assert.match(pricingContract, /does not authorize installs/i);

assert.match(
  formatDesignSkillContract("source-only-capability"),
  /Unknown design skill/,
);
assert.equal(resolveDesignSkill("missing-skill"), null);

console.log(
  `ok mengto-skill-atlas-runtime (active=${DESIGN_SKILLS.length}; families=${DESIGN_SKILL_FAMILY_IDS.length})`,
);
