// ── lib/ragRouter.ts ──────────────────────────────────────────────────────────
// Keyword-first RAG router for Nexus Prime agent queries.
//
// v2 additions:
//   - confidence score per route result (0–1 based on keyword hit density)
//   - multi-domain retrieval when top route confidence < 0.4
//   - two new domain routes: geopolitical + healthcare
//
// Usage (in OfficeCommandCenter send flow):
//   import { routeQuery, buildRagContextBlock } from '@/lib/ragRouter'
//   const block = buildRagContextBlock(userMessage)
//   // inject block into agent system prompt

export type SourceCredibility = "HIGH" | "MEDIUM" | "LOW" | "STALE";

export interface RagStrategy {
  domain: string;
  primaryTools: string[];
  fallbackTools: string[];
  credibility: SourceCredibility;
  rationale: string;
}

export interface RagRouteResult {
  strategy: RagStrategy;
  /** Hit count ÷ total keywords, clamped 0–1. ≥ 0.4 = confident single-domain pick. */
  confidence: number;
  /** How many keywords in the rule matched the query. */
  hitCount: number;
}

// ── Routing table ─────────────────────────────────────────────────────────────
const ROUTING_RULES: { keywords: string[]; strategy: RagStrategy }[] = [
  {
    keywords: [
      "bitcoin", "btc", "ethereum", "eth", "solana", "sol", "crypto",
      "price", "market cap", "mempool", "defi", "yield", "fear greed",
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
      "cve", "exploit", "vulnerability", "zero-day", "zero day", "patch",
      "ransomware", "malware", "threat actor", "apt", "cvss", "nvd", "otx",
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
      "paper", "arxiv", "research", "llm", "transformer", "diffusion",
      "huggingface", "model", "benchmark", "dataset", "training",
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
      "sec", "filing", "edgar", "10-k", "10-q", "8-k", "earnings",
      "annual report", "quarterly report",
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
      "weather", "temperature", "forecast", "rain", "wind", "storm",
      "hurricane", "earthquake", "seismic",
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
      "reddit", "community", "sentiment", "forum", "discussion", "opinion",
      "trending", "subreddit",
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
      "github", "repo", "repository", "open source", "stars", "fork",
      "trending", "library", "package", "npm", "pypi",
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
      "code", "codebase", "file", "component", "function", "bug", "error",
      "typescript", "react", "next.js", "route", "store", "hook",
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
  // ── New routes (Block 3.6b) ──────────────────────────────────────────────────
  {
    keywords: [
      "war", "conflict", "invasion", "ceasefire", "sanctions", "diplomacy",
      "nato", "united nations", "un ", "geopolitics", "coup", "protest",
      "occupation", "treaty", "foreign policy", "regime",
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
      "fda", "clinical trial", "pharma", "outbreak", "who ", "world health",
      "vaccine", "pandemic", "epidemic", "disease", "pathogen", "drug approval",
      "public health", "cdc", "nih",
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

// ── Confidence scoring ────────────────────────────────────────────────────────
// confidence = matched keywords / total rule keywords, clamped to 1.
// We scale by 3× so that even a single strong hit can hit ~0.4.
function calcConfidence(hits: number, total: number): number {
  if (total === 0 || hits === 0) return 0;
  return Math.min(1, (hits / total) * 3);
}

// ── routeQuery ────────────────────────────────────────────────────────────────
/**
 * Returns the best-matched strategy plus a confidence score.
 * When confidence < 0.4, the caller should consider multi-domain retrieval.
 */
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

// ── Multi-domain retrieval ────────────────────────────────────────────────────
/**
 * Returns up to N strategies ranked by hit count.
 * Used when the top result confidence < 0.4 — include multiple strategy blocks.
 */
export function routeQueryMulti(query: string, topN = 3): RagRouteResult[] {
  if (!query?.trim()) return [];
  const q = query.toLowerCase();

  return ROUTING_RULES
    .map((rule) => {
      const hits = rule.keywords.filter((kw) => q.includes(kw)).length;
      return { strategy: rule.strategy, confidence: calcConfidence(hits, rule.keywords.length), hitCount: hits };
    })
    .filter((r) => r.hitCount > 0)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, topN);
}

// ── buildRagContextBlock ──────────────────────────────────────────────────────
export function buildRagContextBlock(query: string): string {
  const result = routeQuery(query);
  const wordCount = query.trim().split(/\s+/).length;

  // Low confidence → include top 2 domains so the agent can triangulate.
  if (result.confidence < 0.4 && result.confidence > 0) {
    const multi = routeQueryMulti(query, 2);
    if (multi.length > 1) {
      const lines = multi.map(
        (r, i) =>
          `${i + 1}. [${r.strategy.domain}] (confidence ${Math.round(r.confidence * 100)}%) — use ${r.strategy.primaryTools[0]}`,
      );
      return (
        `\n\n[RAG ROUTING — MULTI-DOMAIN (low confidence)]\n` +
        lines.join("\n") +
        `\nCross-reference both domains. Cite sources.\n[END RAG ROUTING]\n`
      );
    }
  }

  const s = result.strategy;
  const confPct = Math.round(result.confidence * 100);

  // Short queries get a compact hint.
  if (wordCount < 8) {
    return `\n[RAG: ${s.domain} — use ${s.primaryTools[0]}. Credibility: ${s.credibility} · confidence ${confPct}%]\n`;
  }

  return (
    `\n\n[RAG ROUTING — ${s.domain}]\n` +
    `Confidence: ${confPct}%\n` +
    `Primary tools: ${s.primaryTools.join(", ")}\n` +
    `Fallback tools: ${s.fallbackTools.join(", ")}\n` +
    `Source credibility expectation: [${s.credibility}]\n` +
    `Rationale: ${s.rationale}\n` +
    `[END RAG ROUTING]\n`
  );
}
