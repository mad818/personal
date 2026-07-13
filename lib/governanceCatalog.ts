import type { WorkflowPackId } from "@/lib/researchSources";

export type GovernanceRiskTier = "tier0" | "tier1" | "tier2";
export type GovernanceContinuationMode =
  | "read_only_jump"
  | "reviewed_action"
  | "human_gated_workflow";

export type AssistantCapabilityId =
  | "conversation-general"
  | "guided-learning"
  | "prompt-optimization"
  | "memory-palace"
  | "product-navigation"
  | "repo-engineering"
  | "live-markets"
  | "live-news"
  | "live-cyber"
  | "archive-continuity"
  | "reverse-engineering"
  | "second-brain"
  | "scheduler-governance";

export type GovernanceSkillId =
  | "add-api"
  | "add-feature"
  | "add-tab"
  | "analyze-new-repo"
  | "fix-bug";

export interface GovernanceProfile {
  riskTier: GovernanceRiskTier;
  approvalRequired: boolean;
  domainTags: string[];
  operatorOnly: boolean;
  automationEligible: boolean;
  exactSessionTarget: string | null;
  surfaceIds: string[];
  nextMove: string;
  continuationMode: GovernanceContinuationMode;
}

export interface GovernedSkillDefinition extends GovernanceProfile {
  id: GovernanceSkillId;
  label: string;
  description: string;
}

export interface GovernanceInventorySummary {
  totalProfiles: number;
  approvalRequiredCount: number;
  operatorOnlyCount: number;
  automationEligibleCount: number;
  missingMetadataGaps: number;
  byRisk: Record<GovernanceRiskTier, number>;
  domainTags: Array<{ tag: string; count: number }>;
  baselinePackId: WorkflowPackId;
}

const GOVERNED_SKILLS: GovernedSkillDefinition[] = [
  {
    id: "add-api",
    label: "Add API",
    description: "Adds or modifies external data-source integrations.",
    riskTier: "tier1",
    approvalRequired: true,
    domainTags: ["runtime", "connectors", "deployment"],
    operatorOnly: true,
    automationEligible: false,
    exactSessionTarget: "hq-console-shell",
    surfaceIds: ["hq", "resources"],
    nextMove:
      "Stage the integration through a reviewed Resources or HQ execution lane before widening provider or connector writes.",
    continuationMode: "reviewed_action",
  },
  {
    id: "add-feature",
    label: "Add feature",
    description: "Implements a new feature or feature slice in the app.",
    riskTier: "tier1",
    approvalRequired: true,
    domainTags: ["product", "ui", "runtime"],
    operatorOnly: true,
    automationEligible: false,
    exactSessionTarget: "hq-console-shell",
    surfaceIds: ["hq", "resources"],
    nextMove:
      "Keep feature work inside a reviewed exact session with bounded blast-radius context before any write-capable follow-through.",
    continuationMode: "reviewed_action",
  },
  {
    id: "add-tab",
    label: "Add tab",
    description: "Adds or promotes a top-level app surface.",
    riskTier: "tier2",
    approvalRequired: true,
    domainTags: ["product", "navigation", "release-scope"],
    operatorOnly: true,
    automationEligible: false,
    exactSessionTarget: "hq-strategium",
    surfaceIds: ["hq", "resources"],
    nextMove:
      "Stage route or IA changes as a human-gated workflow and require explicit operator approval before widening public scope.",
    continuationMode: "human_gated_workflow",
  },
  {
    id: "analyze-new-repo",
    label: "Analyze new repo",
    description: "Explores and summarizes a new codebase or repo.",
    riskTier: "tier0",
    approvalRequired: false,
    domainTags: ["research", "architecture"],
    operatorOnly: false,
    automationEligible: true,
    exactSessionTarget: "skills-brain",
    surfaceIds: ["skills", "resources", "hq"],
    nextMove:
      "Jump read-only into the best-fit analysis surface and keep the first pass assistant-first before staging deeper workflow.",
    continuationMode: "read_only_jump",
  },
  {
    id: "fix-bug",
    label: "Fix bug",
    description: "Investigates and patches a bug in the active app.",
    riskTier: "tier1",
    approvalRequired: true,
    domainTags: ["runtime", "quality", "release-hardening"],
    operatorOnly: true,
    automationEligible: false,
    exactSessionTarget: "hq-console-shell",
    surfaceIds: ["hq", "command", "resources"],
    nextMove:
      "Use a reviewed execution lane with impact context before widening into write-capable code changes.",
    continuationMode: "reviewed_action",
  },
];

const WORKFLOW_PACK_GOVERNANCE: Record<WorkflowPackId, GovernanceProfile> = {
  "guided-learning": {
    riskTier: "tier0",
    approvalRequired: false,
    domainTags: ["learning", "study", "memory"],
    operatorOnly: false,
    automationEligible: false,
    exactSessionTarget: "skills-brain",
    surfaceIds: ["skills", "vault", "hq"],
    nextMove:
      "Keep tutoring assistant-first, then stage one compact study continuation only if it materially helps.",
    continuationMode: "read_only_jump",
  },
  "research-workflow": {
    riskTier: "tier1",
    approvalRequired: false,
    domainTags: ["research", "evidence", "synthesis"],
    operatorOnly: false,
    automationEligible: false,
    exactSessionTarget: "intel-sweeps",
    surfaceIds: ["intel", "vault", "resources", "hq"],
    nextMove:
      "Move into one evidence-analysis or synthesis lane at a time instead of opening multiple source-review surfaces.",
    continuationMode: "reviewed_action",
  },
  "reverse-engineering": {
    riskTier: "tier2",
    approvalRequired: true,
    domainTags: ["reverse-engineering", "binary", "malware", "evidence"],
    operatorOnly: true,
    automationEligible: false,
    exactSessionTarget: "recon-binary",
    surfaceIds: ["recon", "vault", "hq"],
    nextMove:
      "Stage binary triage or RE continuity explicitly and keep write or automation follow-through behind operator approval.",
    continuationMode: "human_gated_workflow",
  },
  "second-brain": {
    riskTier: "tier1",
    approvalRequired: false,
    domainTags: ["memory", "archive", "continuity", "export"],
    operatorOnly: false,
    automationEligible: false,
    exactSessionTarget: "vault-memory-spine",
    surfaceIds: ["vault", "hq", "resources"],
    nextMove:
      "Prefer one reopen, compact, or export lane before widening into parallel archive maintenance.",
    continuationMode: "reviewed_action",
  },
  "market-review": {
    riskTier: "tier1",
    approvalRequired: false,
    domainTags: ["markets", "review", "journaling", "continuity"],
    operatorOnly: false,
    automationEligible: false,
    exactSessionTarget: "alpha-market-review",
    surfaceIds: ["alpha", "vault", "hq", "resources"],
    nextMove:
      "Use one exact market-review lane to reopen thesis continuity or file a fresh review before widening back into broader market browsing.",
    continuationMode: "reviewed_action",
  },
  "release-ops": {
    riskTier: "tier2",
    approvalRequired: true,
    domainTags: ["release", "deployment", "rollback", "verification"],
    operatorOnly: true,
    automationEligible: false,
    exactSessionTarget: "command-runtime-efficiency",
    surfaceIds: ["command", "hq", "resources"],
    nextMove:
      "Advance the single blocking release gate and keep rollout or write-capable follow-through explicitly operator reviewed.",
    continuationMode: "human_gated_workflow",
  },
  "scheduler-governance": {
    riskTier: "tier1",
    approvalRequired: true,
    domainTags: ["scheduler", "automation", "ops", "governance"],
    operatorOnly: true,
    automationEligible: true,
    exactSessionTarget: "hq-scheduler-governance",
    surfaceIds: ["hq", "command", "skills", "resources"],
    nextMove:
      "Stage recurring-work changes through scheduler governance and keep risky automation changes behind explicit operator review.",
    continuationMode: "reviewed_action",
  },
  "cyber-triage": {
    riskTier: "tier2",
    approvalRequired: true,
    domainTags: ["cyber", "triage", "evidence", "containment"],
    operatorOnly: true,
    automationEligible: false,
    exactSessionTarget: "cyber-triage",
    surfaceIds: ["cyber", "recon", "vault", "hq"],
    nextMove:
      "Work from CYBER triage first, then carry approved follow-through into RECON OPSEC or VAULT evidence continuity one lane at a time.",
    continuationMode: "human_gated_workflow",
  },
};

const ASSISTANT_CAPABILITY_GOVERNANCE: Record<AssistantCapabilityId, GovernanceProfile> =
  {
    "conversation-general": {
      riskTier: "tier0",
      approvalRequired: false,
      domainTags: ["conversation", "assistant-first"],
      operatorOnly: false,
      automationEligible: true,
      exactSessionTarget: "hq-chronicle",
      surfaceIds: ["hq"],
      nextMove:
        "Answer directly and keep route changes optional unless the user explicitly wants a workspace.",
      continuationMode: "read_only_jump",
    },
    "guided-learning": {
      riskTier: "tier0",
      approvalRequired: false,
      domainTags: ["learning", "study", "memory"],
      operatorOnly: false,
      automationEligible: false,
      exactSessionTarget: "skills-brain",
      surfaceIds: ["skills", "vault", "hq"],
      nextMove:
        "Teach first, then offer one compact checkpoint or study continuation only if it helps.",
      continuationMode: "read_only_jump",
    },
    "prompt-optimization": {
      riskTier: "tier0",
      approvalRequired: false,
      domainTags: ["prompts", "writing", "skills", "transformation", "session-only"],
      operatorOnly: false,
      automationEligible: false,
      exactSessionTarget: "skills-prompt-forge",
      surfaceIds: ["skills", "hq"],
      nextMove:
        "Open the Human Editor or LYRA workbench and keep source text transient, copy-only, and separate from execution.",
      continuationMode: "read_only_jump",
    },
    "memory-palace": {
      riskTier: "tier1",
      approvalRequired: false,
      domainTags: ["memory", "archive", "continuity"],
      operatorOnly: false,
      automationEligible: false,
      exactSessionTarget: "vault-memory-conversation",
      surfaceIds: ["vault", "command", "hq"],
      nextMove:
        "Use bounded recall and reopen the best-fit archive lane instead of widening into ambient context injection.",
      continuationMode: "reviewed_action",
    },
    "product-navigation": {
      riskTier: "tier0",
      approvalRequired: false,
      domainTags: ["product", "navigation", "help"],
      operatorOnly: false,
      automationEligible: true,
      exactSessionTarget: "hq-strategium",
      surfaceIds: ["hq", "resources"],
      nextMove:
        "Keep navigation help read-only and stage only one strongest exact workspace when the operator wants it.",
      continuationMode: "read_only_jump",
    },
    "repo-engineering": {
      riskTier: "tier2",
      approvalRequired: true,
      domainTags: ["repo", "engineering", "blast-radius", "review"],
      operatorOnly: true,
      automationEligible: false,
      exactSessionTarget: "hq-console-shell",
      surfaceIds: ["hq", "command", "resources"],
      nextMove:
        "Stay assistant-first, attach bounded execution context, and keep write-capable follow-through explicitly reviewed.",
      continuationMode: "human_gated_workflow",
    },
    "live-markets": {
      riskTier: "tier1",
      approvalRequired: false,
      domainTags: ["markets", "prices", "analysis"],
      operatorOnly: false,
      automationEligible: true,
      exactSessionTarget: "alpha-prices",
      surfaceIds: ["alpha", "hq", "command"],
      nextMove:
        "Jump into the ALPHA tape read-only and keep the assistant anchored to verified freshness before widening analysis.",
      continuationMode: "read_only_jump",
    },
    "live-news": {
      riskTier: "tier1",
      approvalRequired: false,
      domainTags: ["news", "intel", "verification"],
      operatorOnly: false,
      automationEligible: true,
      exactSessionTarget: "intel-news",
      surfaceIds: ["intel", "hq", "command"],
      nextMove:
        "Prefer one verified INTEL lane at a time and keep the assistant explicit about freshness and uncertainty.",
      continuationMode: "read_only_jump",
    },
    "live-cyber": {
      riskTier: "tier2",
      approvalRequired: true,
      domainTags: ["cyber", "triage", "evidence", "threats"],
      operatorOnly: true,
      automationEligible: false,
      exactSessionTarget: "cyber-triage",
      surfaceIds: ["cyber", "recon", "vault", "hq"],
      nextMove:
        "Stage CYBER triage explicitly, then move into reviewed RECON or VAULT evidence follow-through only after operator approval.",
      continuationMode: "human_gated_workflow",
    },
    "archive-continuity": {
      riskTier: "tier1",
      approvalRequired: false,
      domainTags: ["archive", "continuity", "memory"],
      operatorOnly: false,
      automationEligible: false,
      exactSessionTarget: "vault-memory-spine",
      surfaceIds: ["vault", "command", "hq"],
      nextMove:
        "Reopen the strongest continuity lane first and keep new archive actions compact and deliberate.",
      continuationMode: "reviewed_action",
    },
    "reverse-engineering": {
      riskTier: "tier2",
      approvalRequired: true,
      domainTags: ["reverse-engineering", "binary", "ioc", "evidence"],
      operatorOnly: true,
      automationEligible: false,
      exactSessionTarget: "recon-binary",
      surfaceIds: ["recon", "vault", "hq"],
      nextMove:
        "Keep reverse-engineering assistant-first, then stage binary or OPSEC continuations clearly instead of widening silently.",
      continuationMode: "human_gated_workflow",
    },
    "second-brain": {
      riskTier: "tier1",
      approvalRequired: false,
      domainTags: ["memory", "export", "archive"],
      operatorOnly: false,
      automationEligible: false,
      exactSessionTarget: "vault-export-second-brain",
      surfaceIds: ["vault", "resources", "hq"],
      nextMove:
        "Use the export or archive lane only when the operator wants durable shaping, not as ambient background work.",
      continuationMode: "reviewed_action",
    },
    "scheduler-governance": {
      riskTier: "tier1",
      approvalRequired: true,
      domainTags: ["scheduler", "automation", "governance", "ops"],
      operatorOnly: true,
      automationEligible: true,
      exactSessionTarget: "hq-scheduler-governance",
      surfaceIds: ["hq", "command", "skills", "resources"],
      nextMove:
        "Stage recurring-work continuations clearly and require explicit operator approval before risky automation or write follow-through.",
      continuationMode: "reviewed_action",
    },
  };

const EXACT_SESSION_GOVERNANCE: Record<string, GovernanceProfile> = {
  "cyber-triage": {
    riskTier: "tier2",
    approvalRequired: true,
    domainTags: ["cyber", "triage", "containment", "evidence"],
    operatorOnly: true,
    automationEligible: false,
    exactSessionTarget: "cyber-triage",
    surfaceIds: ["cyber", "recon", "vault"],
    nextMove:
      "Use CYBER triage as the governed baseline, then stage RECON or VAULT follow-through only after explicit operator approval.",
    continuationMode: "human_gated_workflow",
  },
  "cyber-drone": {
    riskTier: "tier1",
    approvalRequired: true,
    domainTags: ["cyber", "drone", "compliance", "review"],
    operatorOnly: true,
    automationEligible: false,
    exactSessionTarget: "cyber-drone",
    surfaceIds: ["cyber"],
    nextMove:
      "Keep compliance review operator-led and stage any write-capable or escalation work explicitly.",
    continuationMode: "reviewed_action",
  },
  "recon-binary": {
    riskTier: "tier2",
    approvalRequired: true,
    domainTags: ["recon", "binary", "reverse-engineering", "ioc"],
    operatorOnly: true,
    automationEligible: false,
    exactSessionTarget: "recon-binary",
    surfaceIds: ["recon", "vault", "cyber"],
    nextMove:
      "Keep binary triage local-first and operator gated before deeper reverse-engineering or evidence export.",
    continuationMode: "human_gated_workflow",
  },
  "recon-opsec": {
    riskTier: "tier1",
    approvalRequired: true,
    domainTags: ["recon", "opsec", "boundary", "validation"],
    operatorOnly: true,
    automationEligible: false,
    exactSessionTarget: "recon-opsec",
    surfaceIds: ["recon", "cyber"],
    nextMove:
      "Review OPSEC follow-through deliberately before widening exposure or browser-assisted investigation.",
    continuationMode: "reviewed_action",
  },
  "recon-repo-intel": {
    riskTier: "tier0",
    approvalRequired: false,
    domainTags: ["recon", "repo-intel", "github", "assessment"],
    operatorOnly: false,
    automationEligible: true,
    exactSessionTarget: "recon-repo-intel",
    surfaceIds: ["recon", "hq", "resources"],
    nextMove:
      "Keep repo assessment metadata-only, then hand the brief to ORBIT or the operator before any local implementation work widens.",
    continuationMode: "read_only_jump",
  },
  "vault-memory-spine": {
    riskTier: "tier1",
    approvalRequired: false,
    domainTags: ["vault", "memory", "continuity", "citations"],
    operatorOnly: false,
    automationEligible: false,
    exactSessionTarget: "vault-memory-spine",
    surfaceIds: ["vault", "hq", "command"],
    nextMove:
      "Use the archive lane to reopen or compact continuity deliberately instead of spawning duplicate memory artifacts.",
    continuationMode: "reviewed_action",
  },
  "vault-compiled-pages": {
    riskTier: "tier1",
    approvalRequired: false,
    domainTags: ["vault", "evidence", "compiled-pages", "continuity"],
    operatorOnly: false,
    automationEligible: false,
    exactSessionTarget: "vault-compiled-pages",
    surfaceIds: ["vault", "cyber", "recon"],
    nextMove:
      "Land evidence in one compiled continuity lane before widening archive or export work.",
    continuationMode: "reviewed_action",
  },
  "alpha-market-review": {
    riskTier: "tier1",
    approvalRequired: false,
    domainTags: ["markets", "review", "continuity", "journaling"],
    operatorOnly: false,
    automationEligible: false,
    exactSessionTarget: "alpha-market-review",
    surfaceIds: ["alpha", "vault", "hq"],
    nextMove:
      "Keep market-review work decision-support only and reopen the strongest prior thesis note before adding another durable page.",
    continuationMode: "reviewed_action",
  },
  "skills-prompt-forge": {
    riskTier: "tier0",
    approvalRequired: false,
    domainTags: ["skills", "prompts", "session-only", "transformation"],
    operatorOnly: false,
    automationEligible: false,
    exactSessionTarget: "skills-prompt-forge",
    surfaceIds: ["skills", "hq"],
    nextMove:
      "Optimize and copy the prompt without saving or automatically executing it.",
    continuationMode: "read_only_jump",
  },
  "hq-scheduler-governance": {
    riskTier: "tier1",
    approvalRequired: true,
    domainTags: ["hq", "scheduler", "automation", "governance"],
    operatorOnly: true,
    automationEligible: true,
    exactSessionTarget: "hq-scheduler-governance",
    surfaceIds: ["hq", "command", "skills"],
    nextMove:
      "Use the scheduler lane to stage reviewed automation changes instead of silently widening into write-capable operations.",
    continuationMode: "reviewed_action",
  },
};

function profileDomainCounts(profiles: GovernanceProfile[]) {
  const counts = new Map<string, number>();
  for (const profile of profiles) {
    for (const tag of profile.domainTags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((left, right) =>
      right.count === left.count
        ? left.tag.localeCompare(right.tag)
        : right.count - left.count,
    );
}

export function getGovernedSkills() {
  return GOVERNED_SKILLS;
}

export function getSkillGovernanceProfile(id: GovernanceSkillId) {
  return GOVERNED_SKILLS.find((skill) => skill.id === id) ?? GOVERNED_SKILLS[0];
}

export function getWorkflowPackGovernanceProfile(id: WorkflowPackId) {
  return WORKFLOW_PACK_GOVERNANCE[id];
}

export function getAssistantCapabilityGovernanceProfile(id: AssistantCapabilityId) {
  return ASSISTANT_CAPABILITY_GOVERNANCE[id];
}

export function getExactSessionGovernanceProfile(id: string | null | undefined) {
  if (!id) return null;
  return EXACT_SESSION_GOVERNANCE[id] ?? null;
}

export function governanceRiskTierToAssistantRisk(
  tier: GovernanceRiskTier,
): "low" | "moderate" | "high" {
  if (tier === "tier2") return "high";
  if (tier === "tier1") return "moderate";
  return "low";
}

export function governanceRiskLabel(tier: GovernanceRiskTier) {
  if (tier === "tier2") return "Tier 2";
  if (tier === "tier1") return "Tier 1";
  return "Tier 0";
}

export function governanceApprovalLabel(profile: GovernanceProfile) {
  if (profile.continuationMode === "human_gated_workflow") {
    return "Human-gated workflow";
  }
  if (profile.continuationMode === "reviewed_action") {
    return "Reviewed action";
  }
  return "Read-only jump";
}

export function summarizeGovernanceInventory(): GovernanceInventorySummary {
  const profiles: GovernanceProfile[] = [
    ...GOVERNED_SKILLS,
    ...Object.values(WORKFLOW_PACK_GOVERNANCE),
    ...Object.values(ASSISTANT_CAPABILITY_GOVERNANCE),
    ...Object.values(EXACT_SESSION_GOVERNANCE),
  ];

  return {
    totalProfiles: profiles.length,
    approvalRequiredCount: profiles.filter((profile) => profile.approvalRequired)
      .length,
    operatorOnlyCount: profiles.filter((profile) => profile.operatorOnly).length,
    automationEligibleCount: profiles.filter(
      (profile) => profile.automationEligible,
    ).length,
    missingMetadataGaps: profiles.filter(
      (profile) =>
        profile.domainTags.length === 0 ||
        profile.surfaceIds.length === 0 ||
        !profile.nextMove.trim(),
    ).length,
    byRisk: {
      tier0: profiles.filter((profile) => profile.riskTier === "tier0").length,
      tier1: profiles.filter((profile) => profile.riskTier === "tier1").length,
      tier2: profiles.filter((profile) => profile.riskTier === "tier2").length,
    },
    domainTags: profileDomainCounts(profiles),
    baselinePackId: "cyber-triage",
  };
}

export function isGovernanceAutoStageSafe(profile: GovernanceProfile) {
  return !profile.approvalRequired && profile.continuationMode === "read_only_jump";
}
