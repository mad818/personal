import {
  inferEvidenceStrength,
  type EvidenceStrength,
  type ResearchSourceRef,
} from "@/lib/researchSources";

export type AiExposurePackId =
  | "llm-endpoint"
  | "leaked-key"
  | "vector-store"
  | "mcp-exposure"
  | "unsafe-agent";

export interface AiExposureReviewDraft {
  subject: string;
  exposureProfile: string;
  passiveEvidence: string;
  containmentGuidance: string;
  advisoryBoundaries: string;
  nextReviewedMove: string;
  packIds: AiExposurePackId[];
}

export interface AiExposurePackSpec {
  id: AiExposurePackId;
  label: string;
  shortLabel: string;
  summary: string;
  checklist: string[];
  safeFollowThrough: string[];
}

export interface AiExposureWorkflowPageLike {
  title: string;
  summary: string;
  route?: string | null;
  tags: string[];
  updatedAt: number;
  continuity?: {
    continuityId?: string | null;
  };
}

export const AI_EXPOSURE_PACKS: AiExposurePackSpec[] = [
  {
    id: "llm-endpoint",
    label: "Exposed LLM endpoint",
    shortLabel: "LLM endpoint",
    summary:
      "Use when a public model endpoint, playground, proxy, or hosted inference surface looks reachable without the intended boundary.",
    checklist: [
      "Confirm the exposed surface is observable through passive evidence only.",
      "Record auth posture, visible provider hints, and any rate-limit or tenancy clues.",
      "Stay advisory: no prompt fuzzing, bypass attempts, or active enumeration.",
    ],
    safeFollowThrough: [
      "Document the visible boundary and missing controls.",
      "Recommend boundary checks, key rotation, and staged internal validation.",
    ],
  },
  {
    id: "leaked-key",
    label: "Leaked key pattern",
    shortLabel: "Leaked key",
    summary:
      "Use when logs, screenshots, repos, or public notes suggest an API key, bearer token, or secret-like value may be exposed.",
    checklist: [
      "Record only the leak pattern and location class, never the raw secret value.",
      "Note whether the exposure is historical, current, or uncertain.",
      "Treat unresolved credential evidence as internal or restricted by default.",
    ],
    safeFollowThrough: [
      "Recommend rotation, inventory checks, and scope review.",
      "Point the operator to internal incident handling without replaying the secret.",
    ],
  },
  {
    id: "vector-store",
    label: "Vector-store exposure",
    shortLabel: "Vector store",
    summary:
      "Use when embeddings, retrieval indexes, or document-search surfaces appear reachable, mis-scoped, or weakly isolated.",
    checklist: [
      "Capture only visible dataset hints, tenancy cues, and retrieval posture.",
      "Note whether embeddings, chunk metadata, or document titles appear exposed.",
      "Do not widen into extraction, bulk pulls, or semantic probing.",
    ],
    safeFollowThrough: [
      "Recommend tenant scoping, auth review, and retrieval-guard validation.",
      "Suggest internal confirmation with known-safe sample content only.",
    ],
  },
  {
    id: "mcp-exposure",
    label: "MCP exposure",
    shortLabel: "MCP exposure",
    summary:
      "Use when a model-context-protocol server, connector bridge, or tool endpoint appears reachable without the intended operator controls.",
    checklist: [
      "Record visible tool categories, origin hints, and auth posture.",
      "Stay passive: no invocation of exposed tools beyond safe status inspection already captured elsewhere.",
      "Treat open connector metadata as posture evidence, not as a live target for use.",
    ],
    safeFollowThrough: [
      "Recommend connector allowlists, auth review, and trusted-origin checks.",
      "Point follow-through into trust posture and connector governance lanes.",
    ],
  },
  {
    id: "unsafe-agent",
    label: "Unsafe agent deployment",
    shortLabel: "Unsafe agent",
    summary:
      "Use when an agent system shows weak approval, unclear tool boundaries, missing privacy posture, or unsafe autonomous deployment claims.",
    checklist: [
      "Document visible autonomy claims, execution posture, and missing operator controls.",
      "Note whether sensitive data, mutation, or exec paths appear insufficiently governed.",
      "Keep the assessment taxonomy-first and advisory-only.",
    ],
    safeFollowThrough: [
      "Recommend approval gates, isolation, and privacy-shield review.",
      "Map the issue back to correction memory, eval, and tool-isolation posture where relevant.",
    ],
  },
];

export const AI_EXPOSURE_PACK_LOOKUP = Object.fromEntries(
  AI_EXPOSURE_PACKS.map((pack) => [pack.id, pack]),
) as Record<AiExposurePackId, AiExposurePackSpec>;

const EMPTY_SECTION = "Pending input.";

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
  return trimmed === EMPTY_SECTION ? "" : trimmed;
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
  return Array.from(new Set(value.match(/https?:\/\/[^\s)\]}>"']+/g) ?? []));
}

function describeCitation(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return cleanInline(url, 72);
  }
}

export function buildAiExposureReviewMarkdown(draft: AiExposureReviewDraft) {
  const sections: Array<[string, string]> = [
    ["Subject", draft.subject],
    ["Exposure profile", draft.exposureProfile],
    ["Passive evidence", draft.passiveEvidence],
    ["Containment guidance", draft.containmentGuidance],
    ["Advisory boundaries", draft.advisoryBoundaries],
    ["Next reviewed move", draft.nextReviewedMove],
  ];

  return sections
    .map(
      ([heading, value]) => `## ${heading}\n${value.trim() || EMPTY_SECTION}`,
    )
    .join("\n\n");
}

export function buildAiExposureReviewTitle(draft: AiExposureReviewDraft) {
  return `AI exposure review · ${cleanInline(draft.subject || "Unlabeled surface", 48)}`;
}

export function buildAiExposureReviewSummary(draft: AiExposureReviewDraft) {
  const packSummary = draft.packIds
    .map((packId) => AI_EXPOSURE_PACK_LOOKUP[packId]?.shortLabel)
    .filter(Boolean)
    .slice(0, 2)
    .join(", ");
  return cleanInline(
    [
      draft.exposureProfile || "No exposure profile recorded yet.",
      packSummary ? `Pack: ${packSummary}.` : "",
      draft.nextReviewedMove ? `Next move: ${draft.nextReviewedMove}` : "",
    ]
      .filter(Boolean)
      .join(" "),
    220,
  );
}

export function buildAiExposureReviewTags(draft: AiExposureReviewDraft) {
  const subjectSlug = slugify(draft.subject);
  return [
    "ai-exposure-review",
    subjectSlug ? `subject:${subjectSlug}` : null,
    ...draft.packIds.map((packId) => `pack:${packId}`),
  ].filter((tag): tag is string => Boolean(tag));
}

export function parseAiExposureReviewMarkdown(
  content: string,
): AiExposureReviewDraft {
  const sections = parseMarkdownSections(content);
  return {
    subject: sections.get("subject") ?? "",
    exposureProfile: sections.get("exposure profile") ?? "",
    passiveEvidence: sections.get("passive evidence") ?? "",
    containmentGuidance: sections.get("containment guidance") ?? "",
    advisoryBoundaries: sections.get("advisory boundaries") ?? "",
    nextReviewedMove: sections.get("next reviewed move") ?? "",
    packIds: [],
  };
}

export function extractAiExposurePackIdsFromTags(tags: string[]) {
  return AI_EXPOSURE_PACKS.map((pack) => pack.id).filter((packId) =>
    tags.includes(`pack:${packId}`),
  );
}

export function buildAiExposureCitationSourceRefs(values: string[]) {
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

export function mergeAiExposureSourceRefs(
  ...groups: Array<ResearchSourceRef[] | null | undefined>
) {
  return uniqueSourceRefs(groups.flatMap((group) => group ?? []));
}

export function buildAiExposureEvidenceStrength(
  sourceRefs: ResearchSourceRef[],
): EvidenceStrength {
  return inferEvidenceStrength({
    sourceType: "vault-artifact",
    sourceCount: sourceRefs.length,
    citationCount: sourceRefs.filter(
      (sourceRef) => sourceRef.sourceType === "citation",
    ).length,
  });
}

export function rankAiExposureReviewPages<T extends AiExposureWorkflowPageLike>(
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
