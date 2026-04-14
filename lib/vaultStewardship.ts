import type { VaultGraphData, VaultLintResult } from "@/components/home/office/types";
import type { CompiledMemoryPageSummary } from "@/components/vault/vaultGraphPageUtils";
import {
  isBinaryTriageMemoryArtifact,
  isReverseEngineeringBriefArtifact,
  isReverseEngineeringMemoryArtifact,
} from "@/lib/binaryTriage";
import type { Article } from "@/store/useStore";

const STALE_SOON_MS = 30 * 24 * 60 * 60 * 1000;

export interface VaultStewardshipSnapshot {
  totalArtifacts: number;
  articleCount: number;
  compiledPageCount: number;
  linkedCoverage: number;
  taggedCoverage: number;
  routeCoverage: number;
  orphanCount: number;
  staleCount: number;
  staleSoonCount: number;
  gapTopicCount: number;
  untaggedCount: number;
  routeLessCompiledCount: number;
  reverseEngineeringPrepCount: number;
  reverseEngineeringBriefCount: number;
  reverseEngineeringRouteLessCount: number;
  reverseEngineeringUntaggedCount: number;
  restrictedCompiledCount: number;
  topOrphanTitles: string[];
  topRouteLessTitles: string[];
  topReverseEngineeringTitles: string[];
  topGapTopics: string[];
  priorities: string[];
  summary: string;
  detail: string;
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function coveragePercent(numerator: number, denominator: number) {
  if (denominator <= 0) return 100;
  return clampPercent((numerator / denominator) * 100);
}

function ageMsFromDateString(value: string) {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? Date.now() - timestamp : 0;
}

export function buildVaultStewardshipSnapshot(input: {
  savedArticles: Article[];
  compiledPages: CompiledMemoryPageSummary[];
  graph: VaultGraphData | null;
  lint: VaultLintResult | null;
}): VaultStewardshipSnapshot {
  const { savedArticles, compiledPages, graph, lint } = input;

  const totalArtifacts = savedArticles.length + compiledPages.length;
  const taggedSavedCount = savedArticles.filter((article) => (article.tags?.length ?? 0) > 0).length;
  const taggedCompiledCount = compiledPages.filter((page) => page.tags.length > 0).length;
  const taggedCoverage = coveragePercent(
    taggedSavedCount + taggedCompiledCount,
    totalArtifacts,
  );
  const linkedCoverage = coveragePercent(
    totalArtifacts - (graph?.orphans.length ?? 0),
    totalArtifacts,
  );
  const routeCoverage = coveragePercent(
    compiledPages.filter((page) => Boolean(page.route?.trim())).length,
    compiledPages.length,
  );
  const staleSoonCount = savedArticles.filter(
    (article) => ageMsFromDateString(article.date) > STALE_SOON_MS,
  ).length;
  const orphanCount = lint?.orphanPages.length ?? graph?.orphans.length ?? 0;
  const staleCount = lint?.staleClaims.length ?? 0;
  const gapTopicCount = lint?.gapTopics.length ?? 0;
  const untaggedCount = totalArtifacts - (taggedSavedCount + taggedCompiledCount);
  const routeLessCompiledCount = compiledPages.filter((page) => !page.route?.trim()).length;
  const reverseEngineeringPrepPages = compiledPages.filter((page) =>
    isBinaryTriageMemoryArtifact(page),
  );
  const reverseEngineeringBriefPages = compiledPages.filter((page) =>
    isReverseEngineeringBriefArtifact(page),
  );
  const reverseEngineeringPages = compiledPages.filter((page) =>
    isReverseEngineeringMemoryArtifact(page),
  );
  const reverseEngineeringPrepCount = reverseEngineeringPrepPages.length;
  const reverseEngineeringBriefCount = reverseEngineeringBriefPages.length;
  const reverseEngineeringRouteLessCount = reverseEngineeringPrepPages.filter(
    (page) => !page.route?.trim(),
  ).length;
  const reverseEngineeringUntaggedCount = reverseEngineeringPrepPages.filter(
    (page) => page.tags.length === 0,
  ).length;
  const restrictedCompiledCount = compiledPages.filter(
    (page) => page.visibility === "restricted",
  ).length;

  const nodeTitleMap = new Map<string, string>(
    (graph?.nodes ?? []).map((node) => [node.id, node.title]),
  );
  const topOrphanTitles = (lint?.orphanPages ?? graph?.orphans ?? [])
    .slice(0, 3)
    .map((id) => nodeTitleMap.get(id) ?? id);
  const topRouteLessTitles = compiledPages
    .filter((page) => !page.route?.trim())
    .slice(0, 3)
    .map((page) => page.title);
  const topReverseEngineeringTitles = reverseEngineeringPages
    .slice(0, 3)
    .map((page) => page.title);
  const topGapTopics = (lint?.gapTopics ?? []).slice(0, 4);

  const priorities: string[] = [];
  if (orphanCount > 0) {
    priorities.push(`Reconnect ${orphanCount} orphan artifact${orphanCount === 1 ? "" : "s"}.`);
  }
  if (routeLessCompiledCount > 0) {
    priorities.push(
      `Add route context to ${routeLessCompiledCount} compiled page${routeLessCompiledCount === 1 ? "" : "s"} so continuation stays strong.`,
    );
  }
  if (untaggedCount > 0) {
    priorities.push(`Tag ${untaggedCount} archive item${untaggedCount === 1 ? "" : "s"} to keep retrieval sharp.`);
  }
  if (reverseEngineeringPrepCount > 0) {
    priorities.push(
      `Review ${reverseEngineeringPrepCount} reverse-engineering prep note${reverseEngineeringPrepCount === 1 ? "" : "s"} so hashes, routes, and tags stay reusable after the initial triage session.`,
    );
  }
  if (reverseEngineeringBriefCount > 0) {
    priorities.push(
      `Keep ${reverseEngineeringBriefCount} promoted reverse-engineering brief${reverseEngineeringBriefCount === 1 ? "" : "s"} linked to the underlying prep notes so the second brain retains both evidence and synthesis.`,
    );
  }
  if (staleCount > 0 || staleSoonCount > 0) {
    const count = staleCount > 0 ? staleCount : staleSoonCount;
    priorities.push(`Review ${count} stale archive artifact${count === 1 ? "" : "s"} before they drift further.`);
  }
  if (gapTopicCount > 0) {
    priorities.push(`Strengthen ${gapTopicCount} thin topic area${gapTopicCount === 1 ? "" : "s"} with more than one supporting artifact.`);
  }
  if (priorities.length === 0) {
    priorities.push("Archive posture is clean. Keep filing with tags, routes, and durable summaries so it stays that way.");
  }

  const summary =
    totalArtifacts === 0
      ? "The archive is empty. Stewardship wakes up once clips, compiled pages, or session artifacts exist."
      : `Treat the vault like a maintained graph. ${linkedCoverage}% of artifacts are connected, ${taggedCoverage}% are tagged, ${routeCoverage}% of compiled pages carry route context, and the archive currently includes ${reverseEngineeringPrepCount} reverse-engineering prep note${reverseEngineeringPrepCount === 1 ? "" : "s"} plus ${reverseEngineeringBriefCount} promoted brief${reverseEngineeringBriefCount === 1 ? "" : "s"}.`;

  const detail =
    totalArtifacts === 0
      ? "Once the archive starts accumulating material, use stewardship to catch orphans, stale context, missing routes, and thin topic coverage before retrieval quality drifts."
      : `Orphans, stale items, and thin topics are archive-health issues, not cosmetic ones. Reverse-engineering prep notes and promoted analyst briefs deserve the same upkeep as any other durable artifact, while restricted compiled pages still count for posture even when their bodies stay protected.`;

  return {
    totalArtifacts,
    articleCount: savedArticles.length,
    compiledPageCount: compiledPages.length,
    linkedCoverage,
    taggedCoverage,
    routeCoverage,
    orphanCount,
    staleCount,
    staleSoonCount,
    gapTopicCount,
    untaggedCount,
    routeLessCompiledCount,
    reverseEngineeringPrepCount,
    reverseEngineeringBriefCount,
    reverseEngineeringRouteLessCount,
    reverseEngineeringUntaggedCount,
    restrictedCompiledCount,
    topOrphanTitles,
    topRouteLessTitles,
    topReverseEngineeringTitles,
    topGapTopics,
    priorities,
    summary,
    detail,
  };
}
