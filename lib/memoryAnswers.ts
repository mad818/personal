import type { MemoryLayer, MemorySpineItem } from "@/lib/memorySpine";

export interface MemoryAskSource {
  id: string;
  title: string;
  sourceLabel: string;
  layer: MemoryLayer;
  domain: string;
  timestamp: number;
}

export interface MemoryAskRelatedItem extends MemoryAskSource {
  summary: string;
}

export interface MemoryAskResult {
  answer: string;
  confidence: number;
  sources: MemoryAskSource[];
  relatedItems: MemoryAskRelatedItem[];
  gaps: string[];
  synthesisMode: "deterministic_local";
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function roundConfidence(value: number) {
  return Math.round(value * 100) / 100;
}

function formatRelativeFreshness(timestamp: number) {
  const ageDays = Math.max(0, (Date.now() - timestamp) / 86_400_000);
  if (ageDays < 2) return "fresh";
  if (ageDays < 14) return "recent";
  if (ageDays < 60) return "established";
  return "older";
}

function buildSource(item: MemorySpineItem): MemoryAskSource {
  return {
    id: item.id,
    title: item.title,
    sourceLabel: item.sourceLabel,
    layer: item.layer,
    domain: item.domain,
    timestamp: item.timestamp,
  };
}

function buildRelatedItem(item: MemorySpineItem): MemoryAskRelatedItem {
  return {
    ...buildSource(item),
    summary: item.summary,
  };
}

function summarizeCorroboration(items: MemorySpineItem[]) {
  const layers = Array.from(new Set(items.map((item) => item.layer)));
  const domains = Array.from(new Set(items.map((item) => item.domain)));
  const sources = Array.from(new Set(items.map((item) => item.sourceLabel)));

  return {
    layers,
    domains,
    sources,
  };
}

function scoreMemoryConfidence(query: string, items: MemorySpineItem[]) {
  if (items.length === 0) return 0;

  const top = items[0];
  const queryTerms = query
    .toLowerCase()
    .split(/\s+/)
    .map((term) => term.trim())
    .filter(Boolean);
  const corroboration = summarizeCorroboration(items);
  const freshness = formatRelativeFreshness(top.timestamp);
  const haystack = items
    .slice(0, 3)
    .map((item) => `${item.title} ${item.summary} ${item.tags.join(" ")}`.toLowerCase())
    .join(" ");
  const queryHits = queryTerms.filter((term) => haystack.includes(term)).length;

  let score = 0.2;
  score += Math.min(0.36, items.length * 0.12);
  score += corroboration.layers.length > 1 ? 0.14 : 0.06;
  score += corroboration.sources.length > 1 ? 0.1 : 0.04;
  score += corroboration.domains.length > 1 ? 0.06 : 0.03;
  score += freshness === "fresh" ? 0.08 : freshness === "recent" ? 0.05 : 0.02;
  if (queryTerms.length > 0) {
    score += (queryHits / queryTerms.length) * 0.12;
  }

  return roundConfidence(clamp(score, 0, 0.95));
}

export function buildMemoryAskResult(
  query: string,
  items: MemorySpineItem[],
): MemoryAskResult {
  if (items.length === 0) {
    return {
      answer: `No strong local-memory match was found for "${query}". The current Nexus memory spine does not have enough matching safe or internal artifacts to answer confidently yet.`,
      confidence: 0,
      sources: [],
      relatedItems: [],
      gaps: [
        "No matching safe/internal memory artifacts were retrieved.",
        "Try a broader query or use explicit compare mode if a local sidecar is enabled.",
      ],
      synthesisMode: "deterministic_local",
    };
  }

  const top = items[0];
  const corroboration = summarizeCorroboration(items);
  const corroboratingItems = items.slice(1, 3).map((item) => item.title);
  const freshness = formatRelativeFreshness(top.timestamp);
  const confidence = scoreMemoryConfidence(query, items);

  const corroborationLine =
    items.length > 1
      ? `Local memory corroborates this with ${items.length - 1} additional item${items.length - 1 === 1 ? "" : "s"} across ${corroboration.layers.length} layer${corroboration.layers.length === 1 ? "" : "s"}, including ${corroboratingItems.join(" and ")}.`
      : `This answer currently rests on one ${freshness} ${top.layer} artifact in the local memory spine.`;

  const domainLine =
    corroboration.domains.length > 1
      ? `The evidence spans ${corroboration.domains.join(", ")} domains, which raises confidence but still stays inside local memory only.`
      : `The strongest signal is in the ${top.domain} domain and comes from the ${top.layer} layer.`;

  return {
    answer: `${top.summary} ${corroborationLine} ${domainLine}`.trim(),
    confidence,
    sources: items.slice(0, 3).map(buildSource),
    relatedItems: items.slice(0, 5).map(buildRelatedItem),
    gaps:
      items.length >= 3
        ? []
        : [
            "Local memory coverage is still thin for this question.",
            "Use workflow writeback or scheduler synthesis to deepen the compiled memory layer.",
          ],
    synthesisMode: "deterministic_local",
  };
}
