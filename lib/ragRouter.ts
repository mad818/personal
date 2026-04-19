import { callAI } from "@/lib/ai";
import {
  findArticleReasoningMatches,
  getArticleReasoningEntities,
  type ArticleReasoningSource,
} from "@/lib/articleReasoning";

export type SourceCredibility = "HIGH" | "MEDIUM" | "LOW" | "STALE";
export type RagConfidencePosture = "high" | "medium" | "low";

export interface RagStrategy {
  domain: string;
  primaryTools: string[];
  fallbackTools: string[];
  credibility: SourceCredibility;
  rationale: string;
}

export interface RagRouteResult {
  strategy: RagStrategy;
  confidence: number;
  hitCount: number;
}

export interface RagReasoningDecision {
  strategies: RagStrategy[];
  confidencePosture: RagConfidencePosture;
  rationale: string;
  usedReasoningFallback: boolean;
}

export interface RagContextBuildOptions {
  savedArticles?: ArticleReasoningSource[];
}

interface RagReasoningCacheEntry {
  expiresAt: number;
  value: RagReasoningDecision;
}

interface RagReasoningPayload {
  domains?: unknown;
  confidence?: unknown;
  rationale?: unknown;
}

export const RAG_LOW_CONFIDENCE_THRESHOLD = 0.4;

const RAG_REASONING_CACHE_TTL_MS = 10 * 60 * 1000;
const RAG_REASONING_CACHE = new Map<string, RagReasoningCacheEntry>();

const ROUTING_RULES: { keywords: string[]; strategy: RagStrategy }[] = [
  {
    keywords: [
      "bitcoin",
      "btc",
      "ethereum",
      "eth",
      "solana",
      "sol",
      "crypto",
      "price",
      "market cap",
      "mempool",
      "defi",
      "yield",
      "fear greed",
      "fear & greed",
    ],
    strategy: {
      domain: "Markets / Crypto",
      primaryTools: ["web_search"],
      fallbackTools: ["fetch_url"],
      credibility: "HIGH",
      rationale:
        "Market queries: use web_search for live data. Cross-reference the NEXUS LIVE INTEL market block.",
    },
  },
  {
    keywords: [
      "cve",
      "exploit",
      "vulnerability",
      "zero-day",
      "zero day",
      "patch",
      "ransomware",
      "malware",
      "threat actor",
      "apt",
      "cvss",
      "nvd",
      "otx",
    ],
    strategy: {
      domain: "Cybersecurity / CVE",
      primaryTools: ["web_search"],
      fallbackTools: ["fetch_url"],
      credibility: "HIGH",
      rationale:
        "Security queries: cross-reference the live CVE feed in NEXUS LIVE INTEL, then web_search for exploit details.",
    },
  },
  {
    keywords: [
      "paper",
      "arxiv",
      "research",
      "llm",
      "transformer",
      "diffusion",
      "huggingface",
      "model",
      "benchmark",
      "dataset",
      "training",
    ],
    strategy: {
      domain: "AI / ML Research",
      primaryTools: ["hf_papers_search"],
      fallbackTools: ["web_search"],
      credibility: "HIGH",
      rationale:
        "Research queries: start with hf_papers_search for today's HuggingFace daily papers.",
    },
  },
  {
    keywords: [
      "sec",
      "filing",
      "edgar",
      "10-k",
      "10-q",
      "8-k",
      "earnings",
      "annual report",
      "quarterly report",
    ],
    strategy: {
      domain: "SEC Filings / EDGAR",
      primaryTools: ["sec_edgar_search"],
      fallbackTools: ["web_search"],
      credibility: "HIGH",
      rationale:
        "Filing queries: sec_edgar_search hits the SEC full-text index. Source credibility [HIGH].",
    },
  },
  {
    keywords: [
      "weather",
      "temperature",
      "forecast",
      "rain",
      "wind",
      "storm",
      "hurricane",
      "earthquake",
      "seismic",
    ],
    strategy: {
      domain: "Weather / Geophysical",
      primaryTools: ["open_meteo_weather"],
      fallbackTools: ["web_search"],
      credibility: "HIGH",
      rationale:
        "Weather queries: open_meteo_weather for current + 3-day forecast. No API key required.",
    },
  },
  {
    keywords: [
      "reddit",
      "community",
      "sentiment",
      "forum",
      "discussion",
      "opinion",
      "trending",
      "subreddit",
    ],
    strategy: {
      domain: "Social Sentiment / Reddit",
      primaryTools: ["reddit_search"],
      fallbackTools: ["web_search"],
      credibility: "MEDIUM",
      rationale:
        "Social sentiment: reddit_search for community discussion. Credibility [MEDIUM] — anecdotal.",
    },
  },
  {
    keywords: [
      "github",
      "repo",
      "repository",
      "open source",
      "stars",
      "fork",
      "trending",
      "library",
      "package",
      "npm",
      "pypi",
    ],
    strategy: {
      domain: "GitHub / Open Source",
      primaryTools: ["github_trending"],
      fallbackTools: ["web_search"],
      credibility: "HIGH",
      rationale:
        "GitHub queries: github_trending for today's trending repos. Fall back to web_search for specific repos.",
    },
  },
  {
    keywords: ["rss", "feed", "blog", "newsletter", "substack", "medium", "article"],
    strategy: {
      domain: "RSS / Blog Feed",
      primaryTools: ["rss_fetch"],
      fallbackTools: ["fetch_url", "web_search"],
      credibility: "MEDIUM",
      rationale:
        "RSS queries: rss_fetch parses the feed directly. Credibility depends on source.",
    },
  },
  {
    keywords: [
      "code",
      "codebase",
      "file",
      "component",
      "function",
      "bug",
      "error",
      "typescript",
      "react",
      "next.js",
      "route",
      "store",
      "hook",
    ],
    strategy: {
      domain: "Project Codebase",
      primaryTools: ["list_project_files", "read_project_file"],
      fallbackTools: ["web_search"],
      credibility: "HIGH",
      rationale:
        "Codebase queries: read the actual file before answering. Never answer from memory alone.",
    },
  },
  {
    keywords: [
      "war",
      "conflict",
      "invasion",
      "ceasefire",
      "sanctions",
      "diplomacy",
      "nato",
      "united nations",
      "un ",
      "geopolitics",
      "coup",
      "protest",
      "occupation",
      "treaty",
      "foreign policy",
      "regime",
    ],
    strategy: {
      domain: "Geopolitical / Conflict",
      primaryTools: ["web_search"],
      fallbackTools: ["fetch_url"],
      credibility: "MEDIUM",
      rationale:
        "Geopolitical queries: web_search for current situation. Cross-reference NEXUS OPS live intel layer for conflict zones. Tag source credibility — news sources vary widely on conflict topics.",
    },
  },
  {
    keywords: [
      "fda",
      "clinical trial",
      "pharma",
      "outbreak",
      "world health organization",
      "world health",
      "vaccine",
      "pandemic",
      "epidemic",
      "disease",
      "pathogen",
      "drug approval",
      "public health",
      "cdc",
      "nih",
    ],
    strategy: {
      domain: "Healthcare / Public Health",
      primaryTools: ["web_search"],
      fallbackTools: ["fetch_url"],
      credibility: "HIGH",
      rationale:
        "Health queries: web_search for current outbreaks or approvals. Prefer WHO, CDC, NIH as primary sources. Always cite the source URL.",
    },
  },
];

const DEFAULT_STRATEGY: RagStrategy = {
  domain: "General",
  primaryTools: ["web_search"],
  fallbackTools: ["fetch_url"],
  credibility: "MEDIUM",
  rationale:
    "No specific domain detected — use web_search. Cite sources. Tag credibility per source.",
};

const STRATEGY_BY_DOMAIN = new Map<string, RagStrategy>(
  [DEFAULT_STRATEGY, ...ROUTING_RULES.map((rule) => rule.strategy)].map((strategy) => [
    strategy.domain.toLowerCase(),
    strategy,
  ]),
);

function calcConfidence(hits: number, total: number): number {
  if (total === 0 || hits === 0) return 0;
  return Math.min(1, (hits / total) * 3);
}

function confidenceToPosture(confidence: number): RagConfidencePosture {
  if (confidence >= 0.66) return "high";
  if (confidence >= RAG_LOW_CONFIDENCE_THRESHOLD) return "medium";
  return "low";
}

function trimReasoningRationale(value: string) {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (!normalized) return "";
  if (normalized.length <= 180) return normalized;
  return `${normalized.slice(0, 179).trimEnd()}…`;
}

function extractJsonObject(value: string) {
  const match = value.match(/\{[\s\S]*\}/);
  return match?.[0] ?? "";
}

function normalizeReasoningStrategies(
  domains: string[],
  fallback: RagStrategy[],
) {
  const normalized = Array.from(
    new Set(
      domains
        .map((domain) => STRATEGY_BY_DOMAIN.get(domain.trim().toLowerCase()))
        .filter((strategy): strategy is RagStrategy => Boolean(strategy)),
    ),
  ).slice(0, 2);
  return normalized.length > 0 ? normalized : fallback.slice(0, 2);
}

function buildReasoningPrompt(query: string, candidates: RagStrategy[]) {
  const candidateBlock = candidates
    .map(
      (strategy, index) =>
        `${index + 1}. ${strategy.domain} | primary ${strategy.primaryTools.join(", ")} | fallback ${strategy.fallbackTools.join(", ")}`,
    )
    .join("\n");

  return [
    "Return JSON only.",
    'Shape: {"domains":[""], "confidence":"high|medium|low", "rationale":""}',
    "Pick the best Nexus retrieval lane for this query.",
    "Rules:",
    "- choose one domain unless the query clearly blends two domains",
    "- never return more than two domains",
    "- keep rationale under 160 chars",
    "- domains must match the candidate list exactly",
    "",
    `Query: ${query}`,
    "Candidates:",
    candidateBlock,
  ].join("\n");
}

function fallbackReasoningDecision(
  baseResult: RagRouteResult,
  multi: RagRouteResult[],
): RagReasoningDecision {
  if (baseResult.confidence >= RAG_LOW_CONFIDENCE_THRESHOLD) {
    return {
      strategies: [baseResult.strategy],
      confidencePosture: confidenceToPosture(baseResult.confidence),
      rationale: "Keyword routing matched strongly enough to stay on the fast path.",
      usedReasoningFallback: false,
    };
  }

  const fallbackStrategies =
    multi.length > 1
      ? multi.slice(0, 2).map((result) => result.strategy)
      : [baseResult.hitCount > 0 ? baseResult.strategy : DEFAULT_STRATEGY];

  return {
    strategies: fallbackStrategies,
    confidencePosture: "low",
    rationale:
      multi.length > 1
        ? "The query blends multiple weak keyword lanes, so HQ should triangulate across both."
        : "No strong keyword lane was detected, so HQ should stay on a general retrieval posture.",
    usedReasoningFallback: baseResult.hitCount === 0 || baseResult.confidence < RAG_LOW_CONFIDENCE_THRESHOLD,
  };
}

function getReasoningCacheKey(query: string) {
  return query.trim().toLowerCase().replace(/\s+/g, " ");
}

function formatLocalArchiveClues(savedArticles: ArticleReasoningSource[], query: string) {
  const matches = findArticleReasoningMatches(query, savedArticles, 2);
  if (matches.length === 0) return "";
  const lines = matches.map((match, index) => {
    const entities = getArticleReasoningEntities(match.article).slice(0, 3);
    const entityText = entities.length > 0 ? ` · entities: ${entities.join(", ")}` : "";
    return `${index + 1}. ${match.article.title} — ${match.cue}${entityText}`;
  });
  return `Local archive clues:\n${lines.join("\n")}\n`;
}

export function routeQuery(query: string): RagRouteResult {
  if (!query?.trim()) {
    return { strategy: DEFAULT_STRATEGY, confidence: 0, hitCount: 0 };
  }
  const q = query.toLowerCase();

  let bestHits = 0;
  let bestRule: (typeof ROUTING_RULES)[0] | null = null;

  for (const rule of ROUTING_RULES) {
    const hits = rule.keywords.filter((kw) => q.includes(kw)).length;
    if (hits > bestHits) {
      bestHits = hits;
      bestRule = rule;
    }
  }

  if (!bestRule || bestHits === 0) {
    return { strategy: DEFAULT_STRATEGY, confidence: 0, hitCount: 0 };
  }

  const confidence = calcConfidence(bestHits, bestRule.keywords.length);
  return { strategy: bestRule.strategy, confidence, hitCount: bestHits };
}

export function routeQueryMulti(query: string, topN = 3): RagRouteResult[] {
  if (!query?.trim()) return [];
  const q = query.toLowerCase();

  return ROUTING_RULES.map((rule) => {
    const hits = rule.keywords.filter((kw) => q.includes(kw)).length;
    return {
      strategy: rule.strategy,
      confidence: calcConfidence(hits, rule.keywords.length),
      hitCount: hits,
    };
  })
    .filter((result) => result.hitCount > 0)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, topN);
}

export async function reasoningRoute(
  query: string,
): Promise<RagReasoningDecision> {
  const baseResult = routeQuery(query);
  const multi = routeQueryMulti(query, 3);
  if (baseResult.confidence >= RAG_LOW_CONFIDENCE_THRESHOLD) {
    return fallbackReasoningDecision(baseResult, multi);
  }

  const cacheKey = getReasoningCacheKey(query);
  const cached = RAG_REASONING_CACHE.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const candidates =
    multi.length > 0
      ? multi.map((result) => result.strategy)
      : [DEFAULT_STRATEGY, ...ROUTING_RULES.slice(0, 5).map((rule) => rule.strategy)];
  const fallback = fallbackReasoningDecision(baseResult, multi);

  try {
    const raw = await callAI(buildReasoningPrompt(query, candidates), 220, "reasoning");
    const payload = extractJsonObject(raw);
    if (!payload) {
      RAG_REASONING_CACHE.set(cacheKey, {
        expiresAt: Date.now() + RAG_REASONING_CACHE_TTL_MS,
        value: fallback,
      });
      return fallback;
    }
    const parsed = JSON.parse(payload) as RagReasoningPayload;
    const domains = Array.isArray(parsed.domains)
      ? parsed.domains.filter((value): value is string => typeof value === "string")
      : [];
    const confidence =
      parsed.confidence === "high" || parsed.confidence === "medium" || parsed.confidence === "low"
        ? parsed.confidence
        : "low";
    const value: RagReasoningDecision = {
      strategies: normalizeReasoningStrategies(domains, fallback.strategies),
      confidencePosture: confidence,
      rationale:
        trimReasoningRationale(
          typeof parsed.rationale === "string" ? parsed.rationale : "",
        ) || fallback.rationale,
      usedReasoningFallback: true,
    };
    RAG_REASONING_CACHE.set(cacheKey, {
      expiresAt: Date.now() + RAG_REASONING_CACHE_TTL_MS,
      value,
    });
    return value;
  } catch {
    RAG_REASONING_CACHE.set(cacheKey, {
      expiresAt: Date.now() + RAG_REASONING_CACHE_TTL_MS,
      value: fallback,
    });
    return fallback;
  }
}

export function buildRagContextBlock(query: string): string {
  const result = routeQuery(query);
  const wordCount = query.trim().split(/\s+/).length;

  if (
    result.confidence < RAG_LOW_CONFIDENCE_THRESHOLD &&
    result.confidence > 0
  ) {
    const multi = routeQueryMulti(query, 2);
    if (multi.length > 1) {
      const lines = multi.map(
        (route, index) =>
          `${index + 1}. [${route.strategy.domain}] (confidence ${Math.round(route.confidence * 100)}%) — use ${route.strategy.primaryTools[0]}`,
      );
      return (
        `\n\n[RAG ROUTING — MULTI-DOMAIN (low confidence)]\n` +
        lines.join("\n") +
        `\nCross-reference both domains. Cite sources.\n[END RAG ROUTING]\n`
      );
    }
  }

  const strategy = result.strategy;
  const confidence = Math.round(result.confidence * 100);

  if (wordCount < 8) {
    return `\n[RAG: ${strategy.domain} — use ${strategy.primaryTools[0]}. Credibility: ${strategy.credibility} · confidence ${confidence}%]\n`;
  }

  return (
    `\n\n[RAG ROUTING — ${strategy.domain}]\n` +
    `Confidence: ${confidence}%\n` +
    `Primary tools: ${strategy.primaryTools.join(", ")}\n` +
    `Fallback tools: ${strategy.fallbackTools.join(", ")}\n` +
    `Source credibility expectation: [${strategy.credibility}]\n` +
    `Rationale: ${strategy.rationale}\n` +
    `[END RAG ROUTING]\n`
  );
}

export async function buildRagContextBlockAsync(
  query: string,
  options: RagContextBuildOptions = {},
): Promise<string> {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) return "";

  const baseResult = routeQuery(normalizedQuery);
  const decision = await reasoningRoute(normalizedQuery);
  const articleClues = formatLocalArchiveClues(
    options.savedArticles ?? [],
    normalizedQuery,
  );
  const wordCount = normalizedQuery.split(/\s+/).length;

  if (
    wordCount < 8 &&
    !decision.usedReasoningFallback &&
    decision.strategies.length === 1 &&
    !articleClues
  ) {
    return `\n[RAG: ${decision.strategies[0].domain} — use ${decision.strategies[0].primaryTools[0]}. Credibility: ${decision.strategies[0].credibility} · confidence ${decision.confidencePosture}]\n`;
  }

  const multiDomain = decision.strategies.length > 1;
  const domainLines = decision.strategies
    .map(
      (strategy, index) =>
        `${multiDomain ? `${index + 1}. ` : ""}${strategy.domain} — primary ${strategy.primaryTools.join(", ")}; fallback ${strategy.fallbackTools.join(", ")}`,
    )
    .join("\n");

  const confidenceDetail = !decision.usedReasoningFallback
    ? `Keyword confidence: ${Math.round(baseResult.confidence * 100)}%`
    : "Reasoning fallback engaged: yes";

  return (
    `\n\n[RAG ROUTING — ${multiDomain ? "REASONED BLEND" : decision.strategies[0]?.domain ?? DEFAULT_STRATEGY.domain}]\n` +
    `${multiDomain ? `Domains:\n${domainLines}\n` : `Domain: ${domainLines}\n`}` +
    `Confidence posture: ${decision.confidencePosture}\n` +
    `${confidenceDetail}\n` +
    `Rationale: ${decision.rationale}\n` +
    (articleClues ? `${articleClues}` : "") +
    `[END RAG ROUTING]\n`
  );
}
