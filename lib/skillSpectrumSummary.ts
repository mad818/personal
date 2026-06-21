import {
  SKILL_CAPABILITY_POLICIES,
  type SkillRiskLevel,
} from "@/lib/skillSpectrumPolicy";

export function summarizeSkillSpectrumPolicies(): string {
  const counts: Record<SkillRiskLevel, number> = {
    safe: 0,
    review: 0,
    blocked: 0,
  };
  for (const policy of SKILL_CAPABILITY_POLICIES) {
    counts[policy.riskLevel] += 1;
  }
  return (
    `SkillSpector policy: ${counts.safe} safe · ${counts.review} review · ` +
    `${counts.blocked} blocked capabilities. CI scans .claude/skills; ` +
    `pre-tool-use hook blocks destructive commands and blocked capability tokens.`
  );
}

export function listBlockedSkillCapabilities(): string[] {
  return SKILL_CAPABILITY_POLICIES.filter((p) => p.riskLevel === "blocked").map(
    (p) => p.capability,
  );
}
