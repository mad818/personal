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
 * Evaluated by AiExposureReviewCard and the agent pre-tool-use hook.
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

export type UnicodeHiddenPromptCategory =
  | "unicode_tag"
  | "bidi_control"
  | "zero_width_format"
  | "private_use";

export interface UnicodeHiddenPromptFinding {
  line: number;
  column: number;
  codePoint: string;
  category: UnicodeHiddenPromptCategory;
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

const MAX_UNICODE_HIDDEN_FINDINGS = 50;

function classifyHiddenCodePoint(
  codePoint: number,
): UnicodeHiddenPromptCategory | null {
  if (codePoint >= 0xe0000 && codePoint <= 0xe007f) {
    return "unicode_tag";
  }
  if (
    codePoint === 0x061c ||
    codePoint === 0x200e ||
    codePoint === 0x200f ||
    (codePoint >= 0x202a && codePoint <= 0x202e) ||
    (codePoint >= 0x2066 && codePoint <= 0x2069)
  ) {
    return "bidi_control";
  }
  if (
    codePoint === 0x00ad ||
    codePoint === 0x034f ||
    codePoint === 0x115f ||
    codePoint === 0x1160 ||
    codePoint === 0x200b ||
    (codePoint >= 0x2060 && codePoint <= 0x2064) ||
    codePoint === 0x3164 ||
    codePoint === 0xfeff ||
    codePoint === 0xffa0
  ) {
    return "zero_width_format";
  }
  if (
    (codePoint >= 0xe000 && codePoint <= 0xf8ff) ||
    (codePoint >= 0xf0000 && codePoint <= 0xffffd) ||
    (codePoint >= 0x100000 && codePoint <= 0x10fffd)
  ) {
    return "private_use";
  }
  return null;
}

function formatCodePoint(codePoint: number): string {
  return `U+${codePoint.toString(16).toUpperCase().padStart(4, "0")}`;
}

function buildUnicodeFindingExcerpt(line: string): string {
  const printable = Array.from(line, (character) => {
    const codePoint = character.codePointAt(0) ?? 0;
    return classifyHiddenCodePoint(codePoint)
      ? `<${formatCodePoint(codePoint)}>`
      : character;
  }).join("");
  return printable.slice(0, 120);
}

/**
 * Detect Unicode channels that can hide or reorder prompt content before a
 * model or monitor sees it. This is a read-only defensive adaptation of the
 * visibility-gap lesson documented by elder-plinius/GLOSSOPETRAE.
 *
 * Normal multilingual text, combining marks, variation selectors, and emoji
 * joiners remain allowed. A single leading UTF-8 BOM is also accepted.
 */
export function detectUnicodeHiddenPromptSmuggling(
  content: string,
): UnicodeHiddenPromptFinding[] {
  const findings: UnicodeHiddenPromptFinding[] = [];
  const lines = content.split(/\r?\n/);

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const line = lines[lineIndex] ?? "";
    const characters = Array.from(line);
    for (
      let columnIndex = 0;
      columnIndex < characters.length;
      columnIndex += 1
    ) {
      const codePoint = characters[columnIndex]?.codePointAt(0) ?? 0;
      if (lineIndex === 0 && columnIndex === 0 && codePoint === 0xfeff)
        continue;
      const category = classifyHiddenCodePoint(codePoint);
      if (!category) continue;
      findings.push({
        line: lineIndex + 1,
        column: columnIndex + 1,
        codePoint: formatCodePoint(codePoint),
        category,
        excerpt: buildUnicodeFindingExcerpt(line),
      });
      if (findings.length >= MAX_UNICODE_HIDDEN_FINDINGS) return findings;
    }
  }

  return findings;
}
