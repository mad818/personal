import type {
  VaultArchiveLink,
  VaultArchiveLinkKind,
  VaultEdge,
} from "@/components/home/office/types";
import type { CompiledMemoryPageSummary } from "@/components/vault/vaultGraphPageUtils";
import {
  getArticleReasoningDomainHints,
  getArticleReasoningEntities,
  getArticleReasoningSummary,
} from "@/lib/articleReasoning";
import type { Article } from "@/store/useStore";

interface ArchiveTargetSignals {
  id: string;
  title: string;
  tags: string[];
  summary: string;
  entities: string[];
  domainHints: string[];
  route?: string | null;
  workflowId?: string | null;
  visibility?: "safe" | "internal" | "restricted";
}

export interface VaultArchiveBacklink {
  sourceId: string;
  sourceTitle: string;
  state: VaultArchiveLink["state"];
  strength: number;
  reason: string;
}

function normalizeList(values: Array<string | null | undefined>, max = 8) {
  return Array.from(
    new Set(
      values
        .map((value) => value?.trim().toLowerCase() ?? "")
        .filter(Boolean),
    ),
  ).slice(0, max);
}

function clamp(value: number, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value));
}

function summarizeRoute(route?: string | null) {
  if (!route) return null;
  return route.replace(/^\//, "").trim().toLowerCase() || null;
}

function scoreSharedStrings(left: string[], right: string[]) {
  const leftSet = new Set(left);
  return right.filter((value) => leftSet.has(value));
}

function toArticleSignals(article: Article): ArchiveTargetSignals {
  return {
    id: article.id,
    title: article.title,
    tags: normalizeList(article.tags ?? [], 10),
    summary: getArticleReasoningSummary(article),
    entities: normalizeList(getArticleReasoningEntities(article), 8),
    domainHints: normalizeList(getArticleReasoningDomainHints(article), 4),
    visibility: "safe",
  };
}

function toCompiledSignals(page: CompiledMemoryPageSummary): ArchiveTargetSignals {
  return {
    id: `page:${page.id}`,
    title: page.title,
    tags:
      page.visibility === "restricted"
        ? []
        : normalizeList(page.tags ?? [], 10),
    summary: page.summary,
    entities:
      page.visibility === "restricted"
        ? []
        : normalizeList(
            [
              ...(page.researchSignals.sectionHeadings ?? []),
              ...(page.researchSignals.referencedDomains ?? []),
              page.topic ?? "",
            ],
            6,
          ),
    domainHints: normalizeList(
      [
        page.domain,
        summarizeRoute(page.route) ?? "",
        page.workflowId ?? "",
      ],
      5,
    ),
    route: page.route,
    workflowId: page.workflowId,
    visibility: page.visibility,
  };
}

function classifyLinkKind(input: {
  sharedTags: string[];
  sharedEntities: string[];
  sharedDomains: string[];
  sameWorkflow: boolean;
  sameRoute: boolean;
}): VaultArchiveLinkKind {
  if (input.sameWorkflow || input.sameRoute) return "workflow";
  if (input.sharedTags.length > 0 || input.sharedDomains.length > 0) return "topic";
  return "semantic";
}

function scoreArchiveLink(
  source: ArchiveTargetSignals,
  target: ArchiveTargetSignals,
) {
  const sharedTags = scoreSharedStrings(source.tags, target.tags).slice(0, 3);
  const sharedEntities = scoreSharedStrings(source.entities, target.entities).slice(0, 3);
  const sharedDomains = scoreSharedStrings(
    source.domainHints,
    target.domainHints,
  ).slice(0, 2);
  const sameRoute =
    Boolean(source.route) &&
    Boolean(target.route) &&
    summarizeRoute(source.route) === summarizeRoute(target.route);
  const sameWorkflow =
    Boolean(source.workflowId) &&
    Boolean(target.workflowId) &&
    source.workflowId === target.workflowId;

  let score = 0;
  if (sharedTags.length > 0) score += Math.min(0.36, sharedTags.length * 0.12);
  if (sharedEntities.length > 0) score += Math.min(0.36, sharedEntities.length * 0.12);
  if (sharedDomains.length > 0) score += Math.min(0.18, sharedDomains.length * 0.09);
  if (sameWorkflow) score += 0.14;
  if (sameRoute) score += 0.12;

  if (score < 0.18) return null;

  const protectedTarget = target.visibility === "restricted";
  const reason = protectedTarget
    ? "Protected archive affinity"
    : sharedTags.length > 0
      ? `shared tag: ${sharedTags.join(", ")}`
      : sharedEntities.length > 0
        ? `entity overlap: ${sharedEntities.join(", ")}`
        : sameWorkflow
          ? `shared workflow: ${target.workflowId}`
          : sameRoute
            ? `shared route: ${target.route}`
            : sharedDomains.length > 0
              ? `shared domain: ${sharedDomains.join(", ")}`
              : "archive affinity";

  return {
    strength: clamp(score, 0.18, 0.92),
    reason,
    kind: classifyLinkKind({
      sharedTags,
      sharedEntities,
      sharedDomains,
      sameWorkflow,
      sameRoute,
    }),
  };
}

function isExistingTargetActive(
  targetId: string,
  savedArticles: Article[],
  compiledPages: CompiledMemoryPageSummary[],
) {
  return (
    savedArticles.some((article) => article.id === targetId) ||
    compiledPages.some((page) => `page:${page.id}` === targetId)
  );
}

export function deriveVaultArchiveLinks(input: {
  article: Article;
  savedArticles: Article[];
  compiledPages: CompiledMemoryPageSummary[];
  limit?: number;
}): VaultArchiveLink[] {
  const { article, savedArticles, compiledPages, limit = 4 } = input;
  const source = toArticleSignals(article);
  const existingByTarget = new Map(
    (article.archiveLinks ?? []).map((link) => [link.targetId, link]),
  );

  const candidates = [
    ...savedArticles
      .filter((candidate) => candidate.id !== article.id)
      .map((candidate) => toArticleSignals(candidate)),
    ...compiledPages.map((page) => toCompiledSignals(page)),
  ]
    .map((target) => {
      const scored = scoreArchiveLink(source, target);
      if (!scored) return null;
      const existing = existingByTarget.get(target.id);
      return {
        targetId: target.id,
        reason: existing?.state === "confirmed" ? existing.reason : scored.reason,
        strength: clamp(
          existing?.state === "confirmed"
            ? Math.max(existing.strength, scored.strength)
            : scored.strength,
          0.18,
          0.98,
        ),
        kind: existing?.state === "confirmed" ? existing.kind : scored.kind,
        state: existing?.state ?? "suggested",
      } satisfies VaultArchiveLink;
    })
    .filter((candidate): candidate is VaultArchiveLink => Boolean(candidate))
    .sort((left, right) => {
      if (left.state !== right.state) {
        return left.state === "confirmed" ? -1 : 1;
      }
      return right.strength - left.strength;
    })
    .slice(0, limit);

  const preservedConfirmed = (article.archiveLinks ?? []).filter(
    (link) =>
      link.state === "confirmed" &&
      isExistingTargetActive(link.targetId, savedArticles, compiledPages) &&
      !candidates.some((candidate) => candidate.targetId === link.targetId),
  );

  return [...preservedConfirmed, ...candidates]
    .sort((left, right) => {
      if (left.state !== right.state) {
        return left.state === "confirmed" ? -1 : 1;
      }
      return right.strength - left.strength;
    })
    .slice(0, Math.max(limit, preservedConfirmed.length));
}

export function deriveVaultArchiveBacklinks(
  targetId: string,
  savedArticles: Article[],
): VaultArchiveBacklink[] {
  return savedArticles
    .flatMap((article) =>
      (article.archiveLinks ?? [])
        .filter((link) => link.targetId === targetId)
        .map((link) => ({
          sourceId: article.id,
          sourceTitle: article.title,
          state: link.state,
          strength: link.strength,
          reason: link.reason,
        })),
    )
    .sort((left, right) => {
      if (left.state !== right.state) {
        return left.state === "confirmed" ? -1 : 1;
      }
      return right.strength - left.strength;
    });
}

export function countVaultArchiveBacklinks(
  targetId: string,
  savedArticles: Article[],
) {
  return deriveVaultArchiveBacklinks(targetId, savedArticles).length;
}

export function buildVaultArchiveLinkGraphEdges(input: {
  savedArticles: Article[];
  compiledPages: CompiledMemoryPageSummary[];
}): VaultEdge[] {
  const { savedArticles, compiledPages } = input;
  const validIds = new Set<string>([
    ...savedArticles.map((article) => article.id),
    ...compiledPages.map((page) => `page:${page.id}`),
  ]);
  const restrictedTargets = new Set(
    compiledPages
      .filter((page) => page.visibility === "restricted")
      .map((page) => `page:${page.id}`),
  );
  const deduped = new Map<string, VaultEdge>();

  for (const article of savedArticles) {
    for (const link of article.archiveLinks ?? []) {
      if (!validIds.has(link.targetId) || link.targetId === article.id) continue;
      const key = `${article.id}->${link.targetId}`;
      const next: VaultEdge = {
        source: article.id,
        target: link.targetId,
        weight: clamp(
          link.state === "confirmed" ? Math.max(link.strength, 0.45) : link.strength,
          0.18,
          0.98,
        ),
        reason: restrictedTargets.has(link.targetId)
          ? "Protected archive linkage"
          : link.reason,
        kind: "archive_link",
        directed: true,
      };
      const current = deduped.get(key);
      if (!current || next.weight > current.weight) {
        deduped.set(key, next);
      }
    }
  }

  return Array.from(deduped.values());
}
