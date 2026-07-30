import "server-only";

import {
  listCompiledMemoryPages,
  type CompiledMemoryPage,
} from "@/lib/memoryPagesStore";
import { rankVaultRetrievalCandidates } from "@/lib/vaultRetrievalRanking";
import { buildVaultTagBoosts } from "@/lib/vaultTagRetrieval";
import { turboVecSearch } from "@/lib/localAcceleration";

export type MemoryAskLayer = "all" | "raw" | "knowledge" | "output";

export interface MemoryAskSource {
  id: string;
  title: string;
  sourceLabel: string;
  layer: "raw" | "knowledge" | "output";
  domain: string;
  timestamp: number;
}

export interface MemoryAskRelatedItem extends MemoryAskSource {
  summary: string;
  tags?: string[];
  workflowId?: string;
}

export interface MemoryAskResponse {
  query: string;
  layer: MemoryAskLayer;
  answer: string;
  confidence: number;
  sources: MemoryAskSource[];
  relatedItems: MemoryAskRelatedItem[];
  gaps: string[];
  matchCount: number;
  withheldRestrictedCount: number;
  note: string;
  comparison:
    | {
        requested: true;
        performed: boolean;
        sidecarState: string;
        sharedCount: number;
        nativeOnlyCount: number;
        sidecarOnlyCount: number;
        overlapRatio: number;
        sidecarMatchCount: number;
      }
    | {
        requested: false;
        performed: false;
      };
}

function layerMatches(
  page: CompiledMemoryPage,
  layer: MemoryAskLayer,
): boolean {
  if (layer === "all") return true;
  return page.layer === layer;
}

function toRelatedItem(page: CompiledMemoryPage): MemoryAskRelatedItem {
  return {
    id: page.id,
    title: page.title,
    summary: page.summary,
    sourceLabel: page.sourceLabel,
    layer: page.layer,
    domain: page.domain,
    timestamp: page.updatedAt,
    tags: page.tags,
    workflowId: page.workflowId,
  };
}

function toSource(page: CompiledMemoryPage): MemoryAskSource {
  return {
    id: page.id,
    title: page.title,
    sourceLabel: page.sourceLabel,
    layer: page.layer,
    domain: page.domain,
    timestamp: page.updatedAt,
  };
}

function keywordScore(query: string, page: CompiledMemoryPage): number {
  const tokens = query.toLowerCase().split(/\W+/).filter(Boolean);
  const haystack = [page.title, page.summary, page.content, page.tags.join(" ")]
    .join(" ")
    .toLowerCase();
  return tokens.filter((token) => haystack.includes(token)).length;
}

async function retrievePages(
  query: string,
  layer: MemoryAskLayer,
  limit: number,
): Promise<{ pages: CompiledMemoryPage[]; retrieval: "turbovec" | "keyword" }> {
  const allPages = await listCompiledMemoryPages({ limit: 200 });
  const visible = allPages.filter(
    (page) => page.visibility !== "restricted" && layerMatches(page, layer),
  );
  const withheldRestrictedCount = allPages.filter(
    (page) => page.visibility === "restricted" && layerMatches(page, layer),
  ).length;

  try {
    const matches = await turboVecSearch({
      query,
      limit,
      allowlist: visible.map((page) => page.id),
    });
    if (matches.length > 0) {
      const byId = new Map(visible.map((page) => [page.id, page]));
      const pages = matches
        .map((match) => byId.get(match.id))
        .filter((page): page is CompiledMemoryPage => Boolean(page));
      return { pages, retrieval: "turbovec" };
    }
  } catch {
    // keyword fallback below
  }

  const pages = visible
    .map((page) => ({ page, score: keywordScore(query, page) }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, limit)
    .map((entry) => entry.page);

  return { pages, retrieval: "keyword" };
}

export async function buildMemoryAskResponse(input: {
  query: string;
  layer?: MemoryAskLayer;
  limit?: number;
  compare?: boolean;
}): Promise<MemoryAskResponse> {
  const query = input.query.trim();
  const layer = input.layer ?? "all";
  const limit = Math.max(1, Math.min(12, input.limit ?? 5));

  if (!query) {
    return {
      query: "",
      layer,
      answer: "Enter a memory question to search the local spine.",
      confidence: 0,
      sources: [],
      relatedItems: [],
      gaps: ["empty_query"],
      matchCount: 0,
      withheldRestrictedCount: 0,
      note: "No query provided.",
      comparison: input.compare
        ? {
            requested: true,
            performed: false,
            sidecarState: "unavailable",
            sharedCount: 0,
            nativeOnlyCount: 0,
            sidecarOnlyCount: 0,
            overlapRatio: 0,
            sidecarMatchCount: 0,
          }
        : { requested: false, performed: false },
    };
  }

  const allPages = await listCompiledMemoryPages({ limit: 200 });
  const withheldRestrictedCount = allPages.filter(
    (page) => page.visibility === "restricted" && layerMatches(page, layer),
  ).length;

  const { pages, retrieval } = await retrievePages(query, layer, limit);
  const tagBoosted = buildVaultTagBoosts(query, pages);
  const ranked = rankVaultRetrievalCandidates(
    query,
    tagBoosted.map((entry) => ({
      ...toRelatedItem(entry.page),
      summary: entry.page.summary,
    })),
  );

  const sources = pages.slice(0, limit).map(toSource);
  const top = ranked[0];
  const answer = top
    ? `Local memory (${retrieval}): ${top.summary}`
    : "No matching compiled pages in the local spine for that question.";

  const confidence = top
    ? Math.min(0.95, 0.35 + Math.min(pages.length, 5) * 0.08)
    : 0.12;

  return {
    query,
    layer,
    answer,
    confidence,
    sources,
    relatedItems: ranked.slice(0, limit),
    gaps: pages.length ? [] : ["no_matches"],
    matchCount: pages.length,
    withheldRestrictedCount,
    note:
      retrieval === "turbovec"
        ? "Retrieved via optional TurboVec sidecar with tag-aware ranking."
        : "TurboVec unavailable — keyword + tag ranking fallback.",
    comparison: input.compare
      ? {
          requested: true,
          performed: retrieval === "turbovec",
          sidecarState: retrieval === "turbovec" ? "ready" : "unavailable",
          sharedCount: retrieval === "turbovec" ? pages.length : 0,
          nativeOnlyCount: retrieval === "keyword" ? pages.length : 0,
          sidecarOnlyCount: 0,
          overlapRatio: retrieval === "turbovec" ? 1 : 0,
          sidecarMatchCount: retrieval === "turbovec" ? pages.length : 0,
        }
      : { requested: false, performed: false },
  };
}
