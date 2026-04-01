export type SkillRiskTier = "tier0" | "tier1" | "tier2";

export interface SkillMetadata {
  id: string;
  label: string;
  domainTags: string[];
  riskTier: SkillRiskTier;
  approvalRequired: boolean;
  description: string;
}

export const SKILL_CATALOG: SkillMetadata[] = [
  {
    id: "add-api",
    label: "Add API",
    domainTags: ["runtime", "connectors", "deployment"],
    riskTier: "tier1",
    approvalRequired: true,
    description: "Adds or modifies external data-source integrations.",
  },
  {
    id: "add-feature",
    label: "Add Feature",
    domainTags: ["product", "ui", "runtime"],
    riskTier: "tier1",
    approvalRequired: true,
    description: "Implements a new feature or feature slice in the app.",
  },
  {
    id: "add-tab",
    label: "Add Tab",
    domainTags: ["product", "navigation", "release-scope"],
    riskTier: "tier2",
    approvalRequired: true,
    description: "Adds or promotes a top-level app surface.",
  },
  {
    id: "analyze-new-repo",
    label: "Analyze New Repo",
    domainTags: ["research", "architecture"],
    riskTier: "tier0",
    approvalRequired: false,
    description: "Explores and summarizes a new codebase or repo.",
  },
  {
    id: "fix-bug",
    label: "Fix Bug",
    domainTags: ["runtime", "quality", "release-hardening"],
    riskTier: "tier1",
    approvalRequired: true,
    description: "Investigates and patches a bug in the active app.",
  },
];

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
