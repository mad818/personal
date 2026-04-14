import {
  inferEvidenceStrength,
  type EvidenceStrength,
  type ResearchSourceRef,
} from "@/lib/researchSources";

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

function normalizeDraftValue(value: string | undefined) {
  const trimmed = value?.trim() ?? "";
  return trimmed === "Pending input." ? "" : trimmed;
}

function parseMarkdownSections(content: string) {
  const sections = new Map<string, string>();
  const matches = Array.from(
    content.matchAll(/^## ([^\n]+)\n([\s\S]*?)(?=^## |\s*$)/gm),
  );
  for (const match of matches) {
    const heading = match[1]?.trim().toLowerCase();
    if (!heading) continue;
    sections.set(heading, normalizeDraftValue(match[2]));
  }
  return sections;
}

function uniqueSourceRefs(sourceRefs: ResearchSourceRef[]) {
  const deduped = new Map<string, ResearchSourceRef>();
  for (const sourceRef of sourceRefs) {
    const key = sourceRef.id || sourceRef.href || sourceRef.title;
    if (!key) continue;
    if (!deduped.has(key)) {
      deduped.set(key, sourceRef);
    }
  }
  return Array.from(deduped.values());
}

function extractUrls(value: string) {
  return Array.from(
    new Set(value.match(/https?:\/\/[^\s)\]}>"']+/g) ?? []),
  );
}

function describeCitation(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return cleanInline(url, 72);
  }
}

export interface XR1WorkflowPageLike {
  title: string;
  summary: string;
  workflowId?: string;
  route?: string | null;
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

export interface XR1SourcePageLike extends XR1WorkflowPageLike {
  id: string;
  route?: string | null;
  content?: string;
  continuity?: {
    continuityId?: string | null;
    sourceRefs?: ResearchSourceRef[];
    evidenceStrength?: EvidenceStrength | null;
  };
}

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

export function parseMarketReviewMarkdown(content: string): MarketReviewDraft {
  const sections = parseMarkdownSections(content);
  return {
    asset: sections.get("asset / market") ?? "",
    thesis: sections.get("thesis") ?? "",
    setup: sections.get("setup") ?? "",
    invalidation: sections.get("invalidation") ?? "",
    result: sections.get("result") ?? "",
    emotionalPosture: sections.get("emotional posture") ?? "",
    operatorNotes: sections.get("operator notes") ?? "",
  };
}

export function buildWorkflowSourceRefs(page: XR1SourcePageLike | null | undefined) {
  if (!page) return [];
  return uniqueSourceRefs([
    {
      id: `compiled-memory:${page.id}`,
      title: page.title,
      sourceType: "vault-artifact",
      evidenceStrength: page.continuity?.evidenceStrength ?? "contextual",
      href: page.workflowId
        ? `/vault?focus=vault-compiled-pages&workflowId=${encodeURIComponent(page.workflowId)}`
        : "/vault?focus=vault-compiled-pages",
      inferred: false,
    },
    ...(page.continuity?.sourceRefs ?? []),
  ]);
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

export function parseOsintCasefileMarkdown(content: string): OsintCasefileDraft {
  const sections = parseMarkdownSections(content);
  return {
    subject: sections.get("subject") ?? "",
    goal: sections.get("goal") ?? "",
    passiveFindings: sections.get("passive findings") ?? "",
    pivotOpportunities: sections.get("pivot opportunities") ?? "",
    evidenceGaps: sections.get("evidence gaps") ?? "",
    nextReviewedMove: sections.get("next reviewed move") ?? "",
    pivots: [],
  };
}

export function extractOsintPivotsFromTags(tags: string[]) {
  return OSINT_PIVOT_OPTIONS.filter((option) =>
    tags.includes(`pivot:${slugify(option)}`),
  );
}

export function buildCitationSourceRefs(values: string[]) {
  return uniqueSourceRefs(
    values
      .flatMap((value) => extractUrls(value))
      .map((url) => ({
        id: url,
        title: describeCitation(url),
        href: url,
        sourceType: "citation" as const,
        evidenceStrength: "source-backed" as const,
        inferred: false,
      })),
  );
}

export function mergeSourceRefs(...groups: Array<ResearchSourceRef[] | null | undefined>) {
  return uniqueSourceRefs(groups.flatMap((group) => group ?? []));
}

export function buildOsintCasefileEvidenceStrength(
  sourceRefs: ResearchSourceRef[],
): EvidenceStrength {
  return inferEvidenceStrength({
    sourceType: "vault-artifact",
    sourceCount: sourceRefs.length,
    citationCount: sourceRefs.filter((sourceRef) => sourceRef.sourceType === "citation").length,
  });
}

export function rankOsintCasefilePages<T extends XR1WorkflowPageLike>(
  pages: T[],
  subjectQuery: string | null | undefined,
  continuityId?: string | null,
  routeHint?: string | null,
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

    const leftRouteMatch = routeHint && left.route === routeHint ? 1 : 0;
    const rightRouteMatch = routeHint && right.route === routeHint ? 1 : 0;
    if (leftRouteMatch !== rightRouteMatch) {
      return rightRouteMatch - leftRouteMatch;
    }

    return right.updatedAt - left.updatedAt;
  });
}
