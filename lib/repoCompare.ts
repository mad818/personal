import { normalizeSessionHref } from "@/lib/exactSessionLinks";
import {
  inferEvidenceStrength,
  type EvidenceStrength,
  type ResearchSourceRef,
} from "@/lib/researchSources";
import {
  normalizeRepoIntelReference,
  type RepoIntelProfile,
} from "@/lib/repoIntel";
import { buildRepoAssimilationSourceRefs } from "@/lib/repoAssimilation";

export const REPO_COMPARE_SECTION_HEADINGS = [
  "Candidates",
  "Shared fit",
  "Key differences",
  "Recommended pick",
  "Boundaries and risks",
  "ORBIT handoff",
] as const;

const REPO_COMPARE_RE =
  /\b(?:compare|versus|vs|which repo fits|which should we adopt|compare these repos|repo compare|repo comparison)\b/i;
const OWNER_REPO_ANY_RE = /\b[A-Za-z0-9._-]{1,100}\/[A-Za-z0-9._-]{1,100}\b/g;
const GITHUB_URL_ANY_RE =
  /https?:\/\/(?:www\.)?github\.com\/[A-Za-z0-9._-]+\/[A-Za-z0-9._-]+/gi;
const LOCAL_PROJECT_PATH_RE =
  /\b(?:app|components|lib|store|hooks|scripts|tests|__tests__|docs)\/[A-Za-z0-9._/-]+\.(?:[cm]?tsx?|md|mjs|json)\b/i;

export interface RepoCompareSections {
  candidates: string;
  sharedFit: string;
  keyDifferences: string;
  recommendedPick: string;
  boundariesAndRisks: string;
  orbitHandoff: string;
}

export interface RepoCompareCandidate {
  profile: RepoIntelProfile;
  savedAssimilationBrief: string | null;
}

export interface RepoComparePipelineInput {
  candidates: RepoCompareCandidate[];
  normalizedRepoIds: string[];
  warnings: string[];
  failedRefs: string[];
}

export interface RepoCompareResult {
  brief: string;
  profiles: RepoIntelProfile[];
  normalizedRepoIds: string[];
  cacheHit: boolean;
  warnings: string[];
  failedRefs: string[];
}

export interface RepoCompareDeps {
  getProfile: (
    rawRepoReference: string,
  ) => Promise<{ profile: RepoIntelProfile; cacheHit: boolean }>;
  getSavedAssimilationBrief?: (normalizedRepoId: string) => Promise<string | null>;
  synthesize: (input: RepoComparePipelineInput) => Promise<string>;
}

export interface RepoCompareNormalizationSuccess {
  ok: true;
  normalizedRepoIds: string[];
  refs: Array<{ normalizedRepoId: string; sourceUrl: string }>;
}

export interface RepoCompareNormalizationFailure {
  ok: false;
  error: string;
}

export type RepoCompareNormalizationResult =
  | RepoCompareNormalizationSuccess
  | RepoCompareNormalizationFailure;

function cleanInline(value: string, max = 220) {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= max) return normalized;
  return `${normalized.slice(0, max - 1).trimEnd()}…`;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function uniqueStrings(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(
      values
        .map((value) => value?.trim() ?? "")
        .filter((value) => value.length > 0),
    ),
  );
}

function extractJsonObject(value: string) {
  const match = value.match(/\{[\s\S]*\}/);
  return match?.[0] ?? "";
}

function parseMarkdownSections(content: string) {
  const sections = new Map<string, string>();
  let currentHeading: string | null = null;
  let buffer: string[] = [];

  for (const line of content.split(/\r?\n/)) {
    const headingMatch = line.match(/^## ([^\n]+)$/);
    if (headingMatch) {
      if (currentHeading) {
        sections.set(currentHeading, buffer.join("\n").trim());
      }
      currentHeading = headingMatch[1]?.trim().toLowerCase() ?? null;
      buffer = [];
      continue;
    }
    if (currentHeading) {
      buffer.push(line);
    }
  }

  if (currentHeading) {
    sections.set(currentHeading, buffer.join("\n").trim());
  }
  return sections;
}

function firstMeaningfulLine(value: string) {
  return (
    value
      .split(/\r?\n/)
      .map((line) => line.replace(/^[-*]\s*/, "").trim())
      .find((line) => line.length > 0) ?? ""
  );
}

function describeStack(profile: RepoIntelProfile) {
  return (
    profile.inferredStack.join(", ") ||
    profile.languageHints.join(", ") ||
    "Unknown stack"
  );
}

function metadataCompletenessScore(profile: RepoIntelProfile, brief: string | null) {
  let score = 0;
  if (profile.description.trim()) score += 1;
  if (profile.readmeExcerpt.trim()) score += 2;
  if (profile.topics.length > 0) score += 1;
  if (profile.inferredStack.length > 0 || profile.languageHints.length > 0) score += 1;
  if (profile.topLevelTree.length > 0) score += 1;
  if (brief?.trim()) score += 2;
  return score;
}

function buildRepoCandidateLine(candidate: RepoCompareCandidate) {
  const { profile, savedAssimilationBrief } = candidate;
  const fitCue = savedAssimilationBrief
    ? "saved assimilation available"
    : profile.readmeExcerpt.trim()
      ? "README-backed metadata"
      : "metadata-only";
  return `- ${profile.normalizedRepoId}: ${cleanInline(profile.description || profile.implementationBrief, 150)} Stack: ${describeStack(profile)}. ${fitCue}.`;
}

function inferSharedFitLines(candidates: RepoCompareCandidate[]) {
  const commonStacks = candidates
    .map((candidate) =>
      candidate.profile.inferredStack.length > 0
        ? candidate.profile.inferredStack
        : candidate.profile.languageHints,
    )
    .reduce<string[]>((shared, current, index) => {
      if (index === 0) return current.map((value) => value.toLowerCase());
      const currentSet = new Set(current.map((value) => value.toLowerCase()));
      return shared.filter((value) => currentSet.has(value));
    }, []);

  return uniqueStrings([
    "- All candidates should stay metadata-first and public-safe until Nexus decides a local adaptation path.",
    commonStacks.length > 0
      ? `- Shared technical cues: ${commonStacks.slice(0, 3).join(", ")}.`
      : "- Shared technical cues are sparse, so fit depends more on README, topics, and top-level structure.",
    "- RECON remains the assessment front door, while VAULT stores the durable recommendation before ORBIT plans implementation.",
  ]).join("\n");
}

function inferDifferenceLines(candidates: RepoCompareCandidate[]) {
  return candidates
    .map(({ profile, savedAssimilationBrief }) => {
      const structuralSignal =
        profile.topLevelTree
          .slice(0, 3)
          .map((entry) => `${entry.type === "dir" ? "dir" : "file"}:${entry.name}`)
          .join(", ") || "minimal tree signal";
      return `- ${profile.normalizedRepoId}: ${describeStack(profile)}; structure ${structuralSignal}; ${savedAssimilationBrief ? "prior assimilation exists." : "no saved assimilation yet."}`;
    })
    .join("\n");
}

function chooseRecommendedCandidate(candidates: RepoCompareCandidate[]) {
  return [...candidates].sort((left, right) => {
    const leftScore = metadataCompletenessScore(
      left.profile,
      left.savedAssimilationBrief,
    );
    const rightScore = metadataCompletenessScore(
      right.profile,
      right.savedAssimilationBrief,
    );
    if (rightScore !== leftScore) return rightScore - leftScore;
    return right.profile.stars - left.profile.stars;
  })[0]!;
}

function buildFallbackRepoCompareSections(
  candidates: RepoCompareCandidate[],
  warnings: string[],
  failedRefs: string[],
): RepoCompareSections {
  const recommended = chooseRecommendedCandidate(candidates);
  const recommendedScore = metadataCompletenessScore(
    recommended.profile,
    recommended.savedAssimilationBrief,
  );

  return {
    candidates: candidates.map(buildRepoCandidateLine).join("\n"),
    sharedFit: inferSharedFitLines(candidates),
    keyDifferences: inferDifferenceLines(candidates),
    recommendedPick: [
      `- Pick: ${recommended.profile.normalizedRepoId}.`,
      `- Why: it has the strongest metadata coverage score (${recommendedScore}), ${recommended.savedAssimilationBrief ? "a saved assimilation brief," : "public README coverage,"} and the clearest current fit signals for a local Nexus translation.`,
      `- Operator note: treat this as the best current reference pattern, not as code to import directly.`,
    ].join("\n"),
    boundariesAndRisks: uniqueStrings([
      "- Keep the compare metadata-first and public-safe; do not fetch arbitrary source files, private repos, or GitHub write surfaces.",
      failedRefs.length > 0
        ? `- Partial comparison: these refs could not be fully assessed: ${failedRefs.join(", ")}.`
        : null,
      candidates.some((candidate) => !candidate.profile.readmeExcerpt.trim())
        ? "- At least one candidate lacks README coverage, so confidence is lower and the recommendation should stay reversible."
        : null,
      warnings.length > 0 ? `- Degraded signals: ${warnings.join(" ")}` : null,
      "- Use the recommendation as a bounded local planning input only, with explicit boundaries against direct upstream copying.",
    ]).join("\n"),
    orbitHandoff: [
      `- Plan local implementation around ${recommended.profile.normalizedRepoId}.`,
      "- Preserve the shared fit, the decisive differences, and the adoption boundaries from this compare brief.",
      "- Do not import or mirror upstream code directly; translate only the smallest justified local slice.",
    ].join("\n"),
  };
}

function toSectionString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function parseRepoCompareJson(value: string): RepoCompareSections | null {
  const payload = extractJsonObject(value);
  if (!payload) return null;

  try {
    const parsed = JSON.parse(payload) as Record<string, unknown>;
    return {
      candidates: toSectionString(parsed.candidates),
      sharedFit: toSectionString(parsed.sharedFit),
      keyDifferences: toSectionString(parsed.keyDifferences),
      recommendedPick: toSectionString(parsed.recommendedPick),
      boundariesAndRisks: toSectionString(parsed.boundariesAndRisks),
      orbitHandoff: toSectionString(parsed.orbitHandoff),
    };
  } catch {
    return null;
  }
}

function withFallbackSection(value: string, fallback: string) {
  return value.trim() || fallback;
}

export function buildRepoReferenceTag(normalizedRepoId: string) {
  return `repo:${slugify(normalizedRepoId)}`;
}

function parseRawRepoRefs(rawValue: string | string[]) {
  if (Array.isArray(rawValue)) {
    return rawValue.map((value) => value.trim()).filter(Boolean);
  }

  const raw = rawValue.trim();
  if (!raw) return [];

  const versusSplit = raw
    .split(/\s+\bvs\b\s+/i)
    .map((value) => value.trim())
    .filter(Boolean);
  if (versusSplit.length >= 2) return versusSplit;

  const commaSplit = raw
    .split(/[\n,]+/)
    .map((value) => value.trim())
    .filter(Boolean);
  return commaSplit;
}

function normalizeRepoCompareRef(
  rawRef: string,
): { normalizedRepoId: string; sourceUrl: string } | null {
  const result = normalizeRepoIntelReference(rawRef);
  if (!result.ok) return null;
  return {
    normalizedRepoId: result.normalizedRepoId,
    sourceUrl: result.sourceUrl,
  };
}

function extractUniqueRepoRefsFromText(input: string) {
  const rawCandidates = [
    ...(input.match(GITHUB_URL_ANY_RE) ?? []),
    ...(input.match(OWNER_REPO_ANY_RE) ?? []),
  ];

  return rawCandidates.reduce<Array<{ normalizedRepoId: string; sourceUrl: string }>>(
    (acc, candidate) => {
      const normalized = normalizeRepoCompareRef(candidate);
      if (!normalized) return acc;
      if (acc.some((entry) => entry.normalizedRepoId === normalized.normalizedRepoId)) {
        return acc;
      }
      acc.push(normalized);
      return acc;
    },
    [],
  );
}

export function normalizeRepoCompareReferences(
  rawValue: string | string[],
): RepoCompareNormalizationResult {
  const refs = parseRawRepoRefs(rawValue).reduce<
    Array<{ normalizedRepoId: string; sourceUrl: string }>
  >((acc, candidate) => {
    const normalized = normalizeRepoCompareRef(candidate);
    if (!normalized) {
      acc.push({
        normalizedRepoId: "__invalid__",
        sourceUrl: candidate,
      });
      return acc;
    }
    if (
      acc.some(
        (entry) => entry.normalizedRepoId === normalized.normalizedRepoId,
      )
    ) {
      return acc;
    }
    acc.push(normalized);
    return acc;
  }, []);

  if (refs.length < 2 || refs.length > 3) {
    return {
      ok: false,
      error:
        "Repo compare requires exactly 2 or 3 unique public GitHub repo refs.",
    };
  }

  if (refs.some((ref) => ref.normalizedRepoId === "__invalid__")) {
    return {
      ok: false,
      error:
        "Repo compare refs must be owner/repo or GitHub repo root URLs only.",
    };
  }

  return {
    ok: true,
    refs,
    normalizedRepoIds: refs.map((ref) => ref.normalizedRepoId),
  };
}

export function hasRepoCompareSignal(input: string) {
  if (LOCAL_PROJECT_PATH_RE.test(input)) return false;
  if (!REPO_COMPARE_RE.test(input)) return false;
  return extractUniqueRepoRefsFromText(input).length >= 2;
}

export function formatRepoCompareBrief(sections: RepoCompareSections) {
  const bodies = [
    sections.candidates,
    sections.sharedFit,
    sections.keyDifferences,
    sections.recommendedPick,
    sections.boundariesAndRisks,
    sections.orbitHandoff,
  ];

  return REPO_COMPARE_SECTION_HEADINGS.map((heading, index) => {
    const body = bodies[index]?.trim() || "No signal recorded.";
    return `## ${heading}\n${body}`;
  }).join("\n\n");
}

export function parseRepoCompareMarkdown(content: string): RepoCompareSections {
  const sections = parseMarkdownSections(content);
  return {
    candidates: sections.get("candidates") ?? "",
    sharedFit: sections.get("shared fit") ?? "",
    keyDifferences: sections.get("key differences") ?? "",
    recommendedPick: sections.get("recommended pick") ?? "",
    boundariesAndRisks: sections.get("boundaries and risks") ?? "",
    orbitHandoff: sections.get("orbit handoff") ?? "",
  };
}

export function buildRepoCompareTitle(profiles: RepoIntelProfile[]) {
  return `Repo compare · ${profiles
    .map((profile) => profile.normalizedRepoId)
    .join(" vs ")}`;
}

export function buildRepoCompareSummary(
  profiles: RepoIntelProfile[],
  brief: string,
) {
  const sections = parseRepoCompareMarkdown(brief);
  const recommended = firstMeaningfulLine(sections.recommendedPick);
  const boundary = firstMeaningfulLine(sections.boundariesAndRisks);
  return cleanInline(
    [
      `${profiles.map((profile) => profile.normalizedRepoId).join(" vs ")} compare.`,
      recommended,
      boundary,
    ]
      .filter(Boolean)
      .join(" "),
    220,
  );
}

export function buildRepoCompareTags(profiles: RepoIntelProfile[]) {
  return uniqueStrings([
    "repo-compare",
    ...profiles.map((profile) => buildRepoReferenceTag(profile.normalizedRepoId)),
    ...profiles.flatMap((profile) =>
      profile.inferredStack.slice(0, 2).map((stack) => `stack:${slugify(stack)}`),
    ),
  ]).slice(0, 10);
}

export function buildRepoCompareSourceRefs(
  profiles: RepoIntelProfile[],
): ResearchSourceRef[] {
  return profiles.flatMap((profile) =>
    buildRepoAssimilationSourceRefs(profile),
  );
}

export function buildRepoCompareEvidenceStrength(
  profiles: RepoIntelProfile[],
): EvidenceStrength {
  const sourceRefs = buildRepoCompareSourceRefs(profiles);
  const readmeCount = profiles.filter((profile) => profile.readmeExcerpt.trim()).length;
  const metadataCoverage = profiles.filter((profile) => {
    const signals = [
      profile.description.trim().length > 0,
      profile.topics.length > 0,
      profile.inferredStack.length > 0 || profile.languageHints.length > 0,
      profile.topLevelTree.length > 0,
    ].filter(Boolean).length;
    return signals >= 3;
  }).length;

  if (readmeCount === profiles.length && metadataCoverage === profiles.length) {
    return "synthesis-ready";
  }

  return inferEvidenceStrength({
    sourceType: "citation",
    sourceCount: sourceRefs.length,
    citationCount: sourceRefs.length,
  });
}

export function buildRepoComparePreparedWorkspace() {
  const href = normalizeSessionHref("/recon?view=osint&focus=recon-repo-intel");
  return {
    href,
    label: "Open RECON repo compare",
    detail:
      "Prepared the repo-intel lane so a compact 2–3 repo compare can run, file to VAULT, and hand ORBIT a saved recommendation instead of widening into a new route family.",
  };
}

export function buildRepoCompareOrbitPrompt(input: {
  brief: string;
  correctionConstraints?: string[];
}) {
  const sections = parseRepoCompareMarkdown(input.brief);
  const lines = [
    "Use the saved repo-compare brief as the planning constraint set for local Nexus work.",
    `Candidates: ${sections.candidates || "No candidates recorded."}`,
    `Shared fit: ${sections.sharedFit || "No shared fit recorded."}`,
    `Key differences: ${sections.keyDifferences || "No differences recorded."}`,
    `Recommended pick: ${sections.recommendedPick || "No recommendation recorded."}`,
    `Boundaries and risks: ${sections.boundariesAndRisks || "No boundaries recorded."}`,
    `ORBIT handoff: ${sections.orbitHandoff || "No ORBIT handoff recorded."}`,
  ];

  if (input.correctionConstraints && input.correctionConstraints.length > 0) {
    lines.push("Local correction-memory constraints:");
    lines.push(
      ...input.correctionConstraints.map((constraint) => `- ${constraint}`),
    );
  }

  lines.push(
    "Respond with: 1. confirm the recommended local reference, 2. safest first implementation slice, 3. exact Nexus files or seams to touch first, 4. explicit non-goals and upstream boundaries to preserve.",
  );
  lines.push("Do not import or mirror upstream code directly.");
  return lines.join("\n");
}

export function buildRepoCompareSynthesisPrompt(
  input: RepoComparePipelineInput,
) {
  const candidateBlock = input.candidates
    .map(({ profile, savedAssimilationBrief }, index) => {
      const treeBlock =
        profile.topLevelTree.length > 0
          ? profile.topLevelTree
              .slice(0, 8)
              .map(
                (entry, entryIndex) =>
                  `    ${entryIndex + 1}. ${entry.type === "dir" ? "dir" : "file"}:${entry.name}`,
              )
              .join("\n")
          : "    Top-level tree unavailable.";
      return [
        `CANDIDATE ${index + 1}: ${profile.normalizedRepoId}`,
        `- URL: ${profile.sourceUrl}`,
        `- Description: ${profile.description || "No GitHub description available."}`,
        `- Topics: ${profile.topics.join(", ") || "none"}`,
        `- Stack: ${describeStack(profile)}`,
        `- Stats: ${profile.stars} stars · ${profile.forks} forks · ${profile.watchers} watchers`,
        `- License: ${profile.license ?? "unknown"}`,
        `- Default branch: ${profile.defaultBranch ?? "unknown"}`,
        "- TOP-LEVEL TREE:",
        treeBlock,
        `- README EXCERPT: ${profile.readmeExcerpt || "README excerpt unavailable."}`,
        `- SAVED ASSIMILATION: ${savedAssimilationBrief ? cleanInline(savedAssimilationBrief, 420) : "none"}`,
        `- WARNINGS: ${profile.warnings.join(" | ") || "None."}`,
      ].join("\n");
    })
    .join("\n\n");

  return [
    "You are Homefront's public-safe repo-compare engine.",
    "Return JSON only.",
    "Use this exact shape:",
    "{",
    '  "candidates": "string",',
    '  "sharedFit": "string",',
    '  "keyDifferences": "string",',
    '  "recommendedPick": "string",',
    '  "boundariesAndRisks": "string",',
    '  "orbitHandoff": "string"',
    "}",
    "",
    "Rules:",
    "- Use only the supplied public GitHub metadata, top-level tree, README excerpt, and any saved repo-assimilation brief excerpts.",
    "- Keep the compare public-safe, metadata-first, operator-grade, and explicitly local-first.",
    "- Do not recommend direct code import, vendoring, GitHub write actions, private repo access, or arbitrary source ingestion.",
    "- In candidates, sharedFit, keyDifferences, boundariesAndRisks, and orbitHandoff, use short bullet-style lines separated by newlines.",
    "- In recommendedPick, explicitly name one recommended repo unless the metadata is too incomplete to justify a pick.",
    "- If metadata is sparse or one candidate degraded, say so in boundariesAndRisks instead of pretending certainty.",
    "",
    `REQUESTED REFS: ${input.normalizedRepoIds.join(" vs ")}`,
    input.failedRefs.length > 0
      ? `FAILED REFS: ${input.failedRefs.join(", ")}`
      : "FAILED REFS: none",
    input.warnings.length > 0
      ? `GLOBAL WARNINGS: ${input.warnings.join(" | ")}`
      : "GLOBAL WARNINGS: None.",
    "",
    candidateBlock,
  ].join("\n");
}

export function parseRepoCompareTopicReferences(topic: string) {
  return normalizeRepoCompareReferences(topic);
}

export async function runRepoCompare(
  rawRepoReferences: string | string[],
  deps: RepoCompareDeps,
): Promise<RepoCompareResult> {
  const normalized = normalizeRepoCompareReferences(rawRepoReferences);
  if (!normalized.ok) {
    throw new Error(normalized.error);
  }

  const warnings: string[] = [];
  const failedRefs: string[] = [];
  const profileResults = await Promise.all(
    normalized.refs.map(async (ref) => {
      try {
        const result = await deps.getProfile(ref.normalizedRepoId);
        return {
          ok: true as const,
          normalizedRepoId: ref.normalizedRepoId,
          profile: result.profile,
          cacheHit: result.cacheHit,
        };
      } catch (error) {
        failedRefs.push(ref.normalizedRepoId);
        warnings.push(
          error instanceof Error
            ? `${ref.normalizedRepoId}: ${error.message}`
            : `${ref.normalizedRepoId}: repo intel failed.`,
        );
        return { ok: false as const, normalizedRepoId: ref.normalizedRepoId };
      }
    }),
  );

  const usableProfiles = profileResults.filter(
    (result): result is Extract<(typeof profileResults)[number], { ok: true }> =>
      result.ok,
  );

  if (usableProfiles.length < 2) {
    throw new Error(
      failedRefs.length > 0
        ? `Repo compare needs at least 2 usable public repos. Failed refs: ${failedRefs.join(", ")}.`
        : "Repo compare needs at least 2 usable public repos.",
    );
  }

  const candidates = await Promise.all(
    usableProfiles.map(async (result) => ({
      profile: result.profile,
      savedAssimilationBrief:
        (await deps.getSavedAssimilationBrief?.(result.profile.normalizedRepoId)) ??
        null,
    })),
  );

  const fallback = buildFallbackRepoCompareSections(
    candidates,
    warnings,
    failedRefs,
  );

  try {
    const synthesized = await deps.synthesize({
      candidates,
      normalizedRepoIds: candidates.map(
        (candidate) => candidate.profile.normalizedRepoId,
      ),
      warnings,
      failedRefs,
    });
    const parsed = parseRepoCompareJson(synthesized);
    if (parsed) {
      return {
        profiles: candidates.map((candidate) => candidate.profile),
        normalizedRepoIds: candidates.map(
          (candidate) => candidate.profile.normalizedRepoId,
        ),
        cacheHit: usableProfiles.every((result) => result.cacheHit),
        warnings,
        failedRefs,
        brief: formatRepoCompareBrief({
          candidates: withFallbackSection(parsed.candidates, fallback.candidates),
          sharedFit: withFallbackSection(parsed.sharedFit, fallback.sharedFit),
          keyDifferences: withFallbackSection(
            parsed.keyDifferences,
            fallback.keyDifferences,
          ),
          recommendedPick: withFallbackSection(
            parsed.recommendedPick,
            fallback.recommendedPick,
          ),
          boundariesAndRisks: withFallbackSection(
            parsed.boundariesAndRisks,
            fallback.boundariesAndRisks,
          ),
          orbitHandoff: withFallbackSection(
            parsed.orbitHandoff,
            fallback.orbitHandoff,
          ),
        }),
      };
    }
    warnings.push("AI synthesis returned an invalid JSON payload.");
  } catch {
    warnings.push("AI synthesis failed.");
  }

  return {
    profiles: candidates.map((candidate) => candidate.profile),
    normalizedRepoIds: candidates.map((candidate) => candidate.profile.normalizedRepoId),
    cacheHit: usableProfiles.every((result) => result.cacheHit),
    warnings,
    failedRefs,
    brief: formatRepoCompareBrief(fallback),
  };
}
