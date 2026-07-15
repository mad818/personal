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
    reason:
      "File writes require explicit operator approval in skill definitions.",
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
    reason:
      "Arbitrary process execution is blocked; use approved npm scripts only.",
  },
  {
    capability: "secrets:read",
    riskLevel: "review",
    reason:
      "Secret reads must be scoped to named keys; wildcard reads are disallowed.",
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

/**
 * CSS-hidden prompt injection patterns — adversarial reference test.
 *
 * Source: dmore/agency-ai-agents-crafted-personali-danger-hidden-content-via-CSS
 * Nexus does NOT implement this technique; these patterns are used only as
 * adversarial test inputs to detect if third-party skill/agent markdown has
 * smuggled hidden instructions via CSS (display:none, visibility:hidden,
 * opacity:0, font-size:0, color:transparent, etc.).
 *
 * Nexus policy: any match is a BLOCKED finding — the skill must be rejected
 * and reviewed before it can be loaded into the agent runtime.
 */
export interface CssHiddenPromptFinding {
  line: number;
  pattern: string;
  excerpt: string;
}

const CSS_HIDDEN_PATTERNS: RegExp[] = [
  /display\s*:\s*none/i,
  /visibility\s*:\s*hidden/i,
  /opacity\s*:\s*0(?:\.0+)?\b/i,
  /font-size\s*:\s*0(?:px|em|rem|pt)?/i,
  /color\s*:\s*(?:transparent|#0{3,8}|rgba\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0\s*\))/i,
  /position\s*:\s*absolute[^}]*(?:left|top)\s*:\s*-\d{4,}/i,
  /height\s*:\s*0\s*;[^}]*overflow\s*:\s*hidden/i,
  /width\s*:\s*0\s*;[^}]*overflow\s*:\s*hidden/i,
];

/** Inline hidden HTML with substantial smuggled body text (not doc backtick examples). */
const CSS_HIDDEN_SMUGGLE_RE =
  /<(?:div|span|p|section)[^>]*style\s*=\s*["'][^"']*(?:display\s*:\s*none|visibility\s*:\s*hidden|opacity\s*:\s*0)[^"']*["'][^>]*>([^<]{40,})<\//i;

/**
 * Scan markdown/text content for CSS-hidden prompt injection patterns.
 * Returns an array of findings; an empty array means clean.
 *
 * Use this in CIPHER/SkillSpector review of any third-party skill or
 * agent markdown before loading it into the Nexus runtime.
 */
export function detectCssHiddenPromptPatterns(
  content: string,
): CssHiddenPromptFinding[] {
  const findings: CssHiddenPromptFinding[] = [];
  const lines = content.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const smuggle = line.match(CSS_HIDDEN_SMUGGLE_RE);
    if (smuggle) {
      findings.push({
        line: i + 1,
        pattern: "hidden-html-smuggle",
        excerpt: line.slice(0, 120),
      });
      continue;
    }
    if (line.includes("`")) continue;
    for (const re of CSS_HIDDEN_PATTERNS) {
      if (re.test(line)) {
        findings.push({
          line: i + 1,
          pattern: re.source,
          excerpt: line.slice(0, 120),
        });
        break;
      }
    }
  }
  return findings;
}

/**
 * Stricter smuggling scan for CI — flags hidden HTML bodies and style blocks only.
 */
export function detectCssHiddenPromptSmuggling(
  content: string,
): CssHiddenPromptFinding[] {
  const findings: CssHiddenPromptFinding[] = [];
  const styleBlocks = content.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi);
  for (const match of styleBlocks) {
    const body = match[1] ?? "";
    for (const re of CSS_HIDDEN_PATTERNS) {
      if (re.test(body)) {
        findings.push({
          line: 0,
          pattern: `style-block:${re.source}`,
          excerpt: body.slice(0, 120),
        });
        break;
      }
    }
  }
  const lines = content.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!CSS_HIDDEN_SMUGGLE_RE.test(line)) continue;
    findings.push({
      line: i + 1,
      pattern: "hidden-html-smuggle",
      excerpt: line.slice(0, 120),
    });
  }
  return findings;
}
