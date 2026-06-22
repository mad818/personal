/**
 * Skill spectrum security policy for Nexus agent skills.
 *
 * Adapted from NVIDIA SkillSpector — a tool that scans LLM agent skill
 * definitions for security misconfigurations, over-privileged tool grants,
 * and unsafe capability combinations.
 *
 * Nexus adaptation: lightweight policy tables that skill runners and CYBER
 * governance checks can evaluate without bundling a scanner runtime.
 */

export type SkillRiskLevel = "safe" | "review" | "blocked";

export interface SkillCapabilityPolicy {
  capability: string;
  riskLevel: SkillRiskLevel;
  reason: string;
}

/**
 * Capability-level risk posture for skills declared in .claude/skills/.
 * Evaluated by CyberGovernanceCards and agent pre-tool-use hook.
 */
export const SKILL_CAPABILITY_POLICIES: SkillCapabilityPolicy[] = [
  {
    capability: "filesystem:write",
    riskLevel: "review",
    reason: "File writes require explicit operator approval in skill definitions.",
  },
  {
    capability: "filesystem:delete",
    riskLevel: "blocked",
    reason: "Destructive filesystem access is blocked in all skill contexts.",
  },
  {
    capability: "network:external",
    riskLevel: "review",
    reason: "Outbound calls from skills require declared endpoint allow-list.",
  },
  {
    capability: "process:exec",
    riskLevel: "blocked",
    reason: "Arbitrary process execution is blocked; use approved npm scripts only.",
  },
  {
    capability: "secrets:read",
    riskLevel: "review",
    reason: "Secret reads must be scoped to named keys; wildcard reads are disallowed.",
  },
  {
    capability: "agent:spawn",
    riskLevel: "review",
    reason: "Child agent spawning requires explicit orchestration approval.",
  },
  {
    capability: "memory:write",
    riskLevel: "safe",
    reason: "Bounded session memory writes are permitted for approved skills.",
  },
  {
    capability: "tool:web_search",
    riskLevel: "safe",
    reason: "Web search is an approved read-only capability.",
  },
];

/**
 * Evaluate a list of declared capabilities against the policy table.
 * Returns violations for 'blocked' policies and warnings for 'review' ones.
 */
export function evaluateSkillCapabilities(declared: string[]): {
  violations: SkillCapabilityPolicy[];
  warnings: SkillCapabilityPolicy[];
} {
  const violations: SkillCapabilityPolicy[] = [];
  const warnings: SkillCapabilityPolicy[] = [];

  for (const cap of declared) {
    const policy = SKILL_CAPABILITY_POLICIES.find((p) => p.capability === cap);
    if (!policy) continue;
    if (policy.riskLevel === "blocked") violations.push(policy);
    if (policy.riskLevel === "review") warnings.push(policy);
  }

  return { violations, warnings };
}
