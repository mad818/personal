import {
  getGovernedSkills,
  type GovernanceRiskTier,
} from "@/lib/governanceCatalog";

export type SkillRiskTier = GovernanceRiskTier;
export type SkillMetadata = ReturnType<typeof getGovernedSkills>[number];

export const SKILL_CATALOG = getGovernedSkills();

export function summarizeSkillGovernance() {
  return {
    total: SKILL_CATALOG.length,
    approvalRequired: SKILL_CATALOG.filter((skill) => skill.approvalRequired).length,
    byRisk: {
      tier0: SKILL_CATALOG.filter((skill) => skill.riskTier === "tier0").length,
      tier1: SKILL_CATALOG.filter((skill) => skill.riskTier === "tier1").length,
      tier2: SKILL_CATALOG.filter((skill) => skill.riskTier === "tier2").length,
    },
    skills: SKILL_CATALOG,
  };
}
