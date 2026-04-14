function cleanInline(value: string, max = 120) {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= max) return normalized;
  return `${normalized.slice(0, max - 1).trimEnd()}…`;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function tokenize(value: string) {
  return Array.from(
    new Set(
      value
        .toLowerCase()
        .split(/[^a-z0-9]+/g)
        .map((token) => token.trim())
        .filter((token) => token.length >= 3),
    ),
  );
}

function countTokenMatches(haystack: string, tokens: string[]) {
  if (tokens.length === 0) return 0;
  const normalizedHaystack = haystack.toLowerCase();
  return tokens.reduce(
    (count, token) => (normalizedHaystack.includes(token) ? count + 1 : count),
    0,
  );
}

export interface XR1WorkflowPageLike {
  title: string;
  summary: string;
  workflowId?: string;
  tags: string[];
  updatedAt: number;
  continuity?: {
    continuityId?: string | null;
  };
}

export interface MarketReviewDraft {
  asset: string;
  thesis: string;
  setup: string;
  invalidation: string;
  result: string;
  emotionalPosture: string;
  operatorNotes: string;
}

export interface OsintCasefileDraft {
  subject: string;
  goal: string;
  passiveFindings: string;
  pivotOpportunities: string;
  evidenceGaps: string;
  nextReviewedMove: string;
  pivots: string[];
}

export const OSINT_CASEFLOW_PHASES = [
  "Intake",
  "Collect",
  "Pivot",
  "Package",
] as const;

export const OSINT_PIVOT_OPTIONS = [
  "identity",
  "social",
  "image / metadata",
  "infrastructure / headers / passive DNS",
] as const;

export const RADAR_READINESS_PHASES = [
  "capture",
  "preprocess",
  "detect",
  "track",
  "review",
] as const;

export function buildMarketReviewMarkdown(draft: MarketReviewDraft) {
  const sections: Array<[string, string]> = [
    ["Asset / market", draft.asset],
    ["Thesis", draft.thesis],
    ["Setup", draft.setup],
    ["Invalidation", draft.invalidation],
    ["Result", draft.result],
    ["Emotional posture", draft.emotionalPosture],
    ["Operator notes", draft.operatorNotes],
  ];

  return sections
    .map(([heading, value]) => `## ${heading}\n${value.trim() || "Pending input."}`)
    .join("\n\n");
}

export function buildMarketReviewTitle(draft: MarketReviewDraft) {
  const asset = cleanInline(draft.asset || "Unlabeled market", 48);
  return `Market review · ${asset}`;
}

export function buildMarketReviewSummary(draft: MarketReviewDraft) {
  return cleanInline(
    `${draft.thesis || "No thesis recorded yet."} ${draft.result ? `Result: ${draft.result}` : ""} ${draft.emotionalPosture ? `Emotional posture: ${draft.emotionalPosture}` : ""}`,
    220,
  );
}

export function buildMarketReviewTags(draft: MarketReviewDraft) {
  const assetSlug = slugify(draft.asset);
  const postureSlug = slugify(draft.emotionalPosture);
  return [
    "market-review",
    assetSlug ? `asset:${assetSlug}` : null,
    postureSlug ? `emotion:${postureSlug}` : null,
  ].filter((tag): tag is string => Boolean(tag));
}

export function rankMarketReviewPages<T extends XR1WorkflowPageLike>(
  pages: T[],
  assetQuery: string | null | undefined,
  continuityId?: string | null,
) {
  const assetTokens = tokenize(assetQuery ?? "");
  return [...pages].sort((left, right) => {
    const leftAssetMatch = assetTokens.some((token) =>
      left.tags.includes(`asset:${token}`),
    )
      ? 1
      : 0;
    const rightAssetMatch = assetTokens.some((token) =>
      right.tags.includes(`asset:${token}`),
    )
      ? 1
      : 0;
    if (leftAssetMatch !== rightAssetMatch) return rightAssetMatch - leftAssetMatch;

    const leftContinuityMatch =
      continuityId && left.continuity?.continuityId === continuityId ? 1 : 0;
    const rightContinuityMatch =
      continuityId && right.continuity?.continuityId === continuityId ? 1 : 0;
    if (leftContinuityMatch !== rightContinuityMatch) {
      return rightContinuityMatch - leftContinuityMatch;
    }

    const leftTopicMatches = countTokenMatches(
      `${left.title} ${left.summary} ${left.tags.join(" ")}`,
      assetTokens,
    );
    const rightTopicMatches = countTokenMatches(
      `${right.title} ${right.summary} ${right.tags.join(" ")}`,
      assetTokens,
    );
    if (leftTopicMatches !== rightTopicMatches) {
      return rightTopicMatches - leftTopicMatches;
    }

    return right.updatedAt - left.updatedAt;
  });
}

export function buildOsintCasefileMarkdown(draft: OsintCasefileDraft) {
  const sections: Array<[string, string]> = [
    ["Subject", draft.subject],
    ["Goal", draft.goal],
    ["Passive findings", draft.passiveFindings],
    ["Pivot opportunities", draft.pivotOpportunities],
    ["Evidence gaps", draft.evidenceGaps],
    ["Next reviewed move", draft.nextReviewedMove],
  ];

  return sections
    .map(([heading, value]) => `## ${heading}\n${value.trim() || "Pending input."}`)
    .join("\n\n");
}

export function buildOsintCasefileTitle(draft: OsintCasefileDraft) {
  return `OSINT casefile · ${cleanInline(draft.subject || "Unlabeled subject", 48)}`;
}

export function buildOsintCasefileSummary(draft: OsintCasefileDraft) {
  return cleanInline(
    `${draft.goal || "No goal recorded yet."} ${draft.nextReviewedMove ? `Next move: ${draft.nextReviewedMove}` : ""}`,
    220,
  );
}

export function buildOsintCasefileTags(draft: OsintCasefileDraft) {
  const subjectSlug = slugify(draft.subject);
  return [
    "osint-casefile",
    subjectSlug ? `subject:${subjectSlug}` : null,
    ...draft.pivots.map((pivot) => slugify(pivot)).filter(Boolean).map((pivot) => `pivot:${pivot}`),
  ].filter((tag): tag is string => Boolean(tag));
}

export function rankOsintCasefilePages<T extends XR1WorkflowPageLike>(
  pages: T[],
  subjectQuery: string | null | undefined,
  continuityId?: string | null,
) {
  const subjectTokens = tokenize(subjectQuery ?? "");
  return [...pages].sort((left, right) => {
    const leftContinuityMatch =
      continuityId && left.continuity?.continuityId === continuityId ? 1 : 0;
    const rightContinuityMatch =
      continuityId && right.continuity?.continuityId === continuityId ? 1 : 0;
    if (leftContinuityMatch !== rightContinuityMatch) {
      return rightContinuityMatch - leftContinuityMatch;
    }

    const leftTokenMatches = countTokenMatches(
      `${left.title} ${left.summary} ${left.tags.join(" ")}`,
      subjectTokens,
    );
    const rightTokenMatches = countTokenMatches(
      `${right.title} ${right.summary} ${right.tags.join(" ")}`,
      subjectTokens,
    );
    if (leftTokenMatches !== rightTokenMatches) {
      return rightTokenMatches - leftTokenMatches;
    }

    return right.updatedAt - left.updatedAt;
  });
}
