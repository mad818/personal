import { NextRequest } from "next/server";
import {
  detectAssistantCapability,
  getAssistantCapability,
} from "@/lib/assistantCapabilityRegistry";
import {
  type AssistantLiveRetrievalCitation,
  type AssistantLiveRetrievalResult,
} from "@/lib/assistantLiveRetrieval";
import { protectedJson } from "@/lib/protectedApi";

type PriceRow = {
  id?: string;
  symbol?: string;
  current_price?: number;
  price_change_percentage_24h?: number;
  last_updated?: string;
};

type NewsRow = {
  title?: string;
  url?: string;
  date?: string;
  source?: string;
  summary?: string;
  description?: string;
};

type CveRow = {
  cve?: {
    id?: string;
    published?: string;
    lastModified?: string;
    descriptions?: Array<{ lang?: string; value?: string }>;
    metrics?: {
      cvssMetricV31?: Array<{ cvssData?: { baseScore?: number } }>;
      cvssMetricV30?: Array<{ cvssData?: { baseScore?: number } }>;
    };
  };
  dueDate?: string;
};

const MARKET_ASSET_MAP: Record<string, string> = {
  bitcoin: "bitcoin",
  btc: "bitcoin",
  ethereum: "ethereum",
  eth: "ethereum",
  solana: "solana",
  sol: "solana",
  chainlink: "chainlink",
  link: "chainlink",
};

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function stripHtml(value: string) {
  return decodeHtmlEntities(value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
}

async function fetchJsonRoute<T>(req: NextRequest, path: string): Promise<T | null> {
  try {
    const response = await fetch(new URL(path, req.url), {
      cache: "no-store",
      headers: {
        cookie: req.headers.get("cookie") ?? "",
      },
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

function detectCoins(query: string) {
  const lower = query.toLowerCase();
  const seen = new Set<string>();
  for (const [token, id] of Object.entries(MARKET_ASSET_MAP)) {
    if (lower.includes(token)) seen.add(id);
  }
  return Array.from(seen).slice(0, 4);
}

function buildMarketResult(
  query: string,
  capabilityId: AssistantLiveRetrievalResult["capabilityId"],
  preparedWorkspaceHref: string,
  rows: PriceRow[],
): AssistantLiveRetrievalResult {
  const observed = rows.slice(0, 3).map((row) => {
    const symbol = row.symbol?.toUpperCase() ?? row.id ?? "asset";
    const price =
      typeof row.current_price === "number"
        ? `$${row.current_price.toLocaleString(undefined, {
            maximumFractionDigits: row.current_price < 1 ? 4 : 2,
          })}`
        : "price unavailable";
    const delta =
      typeof row.price_change_percentage_24h === "number"
        ? ` (${row.price_change_percentage_24h >= 0 ? "+" : ""}${row.price_change_percentage_24h.toFixed(2)}% 24h)`
        : "";
    return `${symbol} ${price}${delta}`;
  });
  const citations: AssistantLiveRetrievalCitation[] = rows.slice(0, 3).map((row) => ({
    label: `${row.symbol?.toUpperCase() ?? row.id ?? "asset"} via CoinGecko`,
    url: "/api/prices?mode=markets",
    source: "CoinGecko / Nexus prices",
    publishedAt: row.last_updated ?? null,
  }));

  return {
    query,
    domain: "markets",
    verified: observed.length > 0,
    degraded: observed.length === 0,
    summary:
      observed.length > 0
        ? `Verified market context: ${observed.join("; ")}.`
        : "No verified market rows were available from the internal prices lane.",
    observed,
    verifyNext:
      observed.length > 0
        ? ["Open ALPHA prices or scanner if you need broader market follow-through."]
        : ["Retry the request when the prices lane is reachable, or treat any answer as unverified."],
    warnings:
      observed.length > 0
        ? []
        : ["The internal prices lane did not return usable live rows."],
    citations,
    capabilityId,
    preparedWorkspaceHref,
  };
}

function buildNewsResult(
  query: string,
  capabilityId: AssistantLiveRetrievalResult["capabilityId"],
  preparedWorkspaceHref: string,
  rows: NewsRow[],
): AssistantLiveRetrievalResult {
  const lower = query.toLowerCase();
  const ranked = rows
    .map((row) => {
      const haystack = `${row.title ?? ""} ${row.summary ?? ""} ${row.description ?? ""}`.toLowerCase();
      const score = lower
        .split(/\s+/)
        .filter((token) => token.length > 2)
        .reduce((total, token) => (haystack.includes(token) ? total + 1 : total), 0);
      return { row, score };
    })
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const aTime = a.row.date ? new Date(a.row.date).getTime() : 0;
      const bTime = b.row.date ? new Date(b.row.date).getTime() : 0;
      return bTime - aTime;
    })
    .slice(0, 3)
    .map((entry) => entry.row);

  const observed = ranked
    .filter((row) => row.title)
    .map((row) => `${row.title}${row.source ? ` (${row.source})` : ""}`);
  const citations: AssistantLiveRetrievalCitation[] = ranked
    .filter((row) => row.title && row.url)
    .map((row) => ({
      label: row.title ?? "article",
      url: row.url ?? "/api/news",
      source: row.source ?? "Nexus news",
      publishedAt: row.date ?? null,
    }));

  return {
    query,
    domain: "news",
    verified: citations.length > 0,
    degraded: citations.length === 0,
    summary:
      citations.length > 0
        ? `Verified news context: ${observed.join("; ")}.`
        : "No recent news items were strong enough to verify this query.",
    observed,
    verifyNext:
      citations.length > 0
        ? ["Open INTEL news or world if you need broader narrative context."]
        : ["Retry when news feeds are fresh, or treat the response as unverified."],
    warnings:
      citations.length > 0
        ? []
        : ["The internal news lane did not produce strong enough matches for this live query."],
    citations,
    capabilityId,
    preparedWorkspaceHref,
  };
}

function buildCyberResult(
  query: string,
  capabilityId: AssistantLiveRetrievalResult["capabilityId"],
  preparedWorkspaceHref: string,
  rows: CveRow[],
): AssistantLiveRetrievalResult {
  const observed = rows.slice(0, 3).map((row) => {
    const id = row.cve?.id ?? "CVE unavailable";
    const description =
      row.cve?.descriptions?.find((entry) => entry.lang === "en")?.value ??
      "No description available.";
    const score =
      row.cve?.metrics?.cvssMetricV31?.[0]?.cvssData?.baseScore ??
      row.cve?.metrics?.cvssMetricV30?.[0]?.cvssData?.baseScore;
    return `${id}${typeof score === "number" ? ` (CVSS ${score})` : ""} — ${description}`;
  });
  const citations: AssistantLiveRetrievalCitation[] = rows.slice(0, 3).map((row) => ({
    label: row.cve?.id ?? "CVE",
    url: "/api/cves",
    source: "NVD / Nexus CVEs",
    publishedAt: row.cve?.published ?? row.cve?.lastModified ?? row.dueDate ?? null,
  }));

  return {
    query,
    domain: "cyber",
    verified: observed.length > 0,
    degraded: observed.length === 0,
    summary:
      observed.length > 0
        ? `Verified cyber context: ${observed.join("; ")}.`
        : "No verified CVE or threat rows were available from the internal cyber lane.",
    observed,
    verifyNext:
      observed.length > 0
        ? ["Open CYBER triage if you need broader KEV/OTX correlation."]
        : ["Retry when the cyber feeds are reachable, or treat any answer as unverified."],
    warnings:
      observed.length > 0
        ? []
        : ["The internal cyber lane did not return usable vulnerability rows."],
    citations,
    capabilityId,
    preparedWorkspaceHref,
  };
}

function decodeDuckDuckGoHref(value: string) {
  try {
    const href = value.startsWith("//") ? `https:${value}` : value;
    const url = new URL(href, "https://duckduckgo.com");
    const redirected = url.searchParams.get("uddg");
    return redirected ? decodeURIComponent(redirected) : url.toString();
  } catch {
    return value;
  }
}

function buildOpenWebQueries(query: string) {
  const queries = [query];
  const lower = query.toLowerCase();
  const looksLikeHandleLookup =
    /\b(twitch|streamer|youtube|creator|channel|handle)\b/i.test(query) ||
    /^[a-z0-9_]{3,32}$/i.test(query.replace(/\s+/g, ""));

  if (looksLikeHandleLookup) {
    if (!lower.includes("site:twitch.tv")) {
      queries.unshift(`site:twitch.tv ${query}`);
    }
    if (!lower.includes("site:x.com") && !lower.includes("site:twitter.com")) {
      queries.push(`site:x.com OR site:twitter.com ${query}`);
    }
  }

  return Array.from(new Set(queries));
}

function parseDuckDuckGoResults(html: string) {
  const matches = Array.from(
    html.matchAll(
      /<a[^>]+class="(?:result__a|result-link)"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi,
    ),
  );
  const results: AssistantLiveRetrievalCitation[] = [];
  for (const match of matches) {
    const href = decodeDuckDuckGoHref(match[1] ?? "");
    const title = stripHtml(match[2] ?? "");
    if (!href || !title) continue;
    results.push({
      label: title,
      url: href,
      source: "DuckDuckGo web search",
      publishedAt: null,
    });
    if (results.length >= 3) break;
  }
  return results;
}

async function fetchOpenWebResults(query: string) {
  const collected: AssistantLiveRetrievalCitation[] = [];
  for (const candidate of buildOpenWebQueries(query)) {
    try {
      const response = await fetch(
        `https://html.duckduckgo.com/html/?q=${encodeURIComponent(candidate)}`,
        {
          headers: {
            "User-Agent": "Mozilla/5.0 NexusPrime/1.0",
          },
          cache: "no-store",
          signal: AbortSignal.timeout(12000),
        },
      );
      if (!response.ok) continue;
      const html = await response.text();
      for (const row of parseDuckDuckGoResults(html)) {
        if (collected.some((existing) => existing.url === row.url)) continue;
        collected.push(row);
        if (collected.length >= 3) break;
      }
      if (collected.length >= 3) break;
    } catch {
      /* try the next query variant */
    }
  }
  return collected;
}

function buildOpenWebResult(
  query: string,
  capabilityId: AssistantLiveRetrievalResult["capabilityId"],
  preparedWorkspaceHref: string | null,
  citations: AssistantLiveRetrievalCitation[],
): AssistantLiveRetrievalResult {
  const observed = citations.map((citation) => citation.label);
  return {
    query,
    domain: citations.length > 0 ? "open_web" : "unverified",
    verified: citations.length > 0,
    degraded: citations.length === 0,
    summary:
      citations.length > 0
        ? `Verified open-web context from: ${observed.join("; ")}.`
        : "Open-web verification did not return usable results for this live query.",
    observed,
    verifyNext:
      citations.length > 0
        ? ["Use the cited sources in the answer and keep the confidence bounded."]
        : ["Say the answer is unverified instead of improvising current facts."],
    warnings:
      citations.length > 0
        ? []
        : ["The open-web retrieval adapter could not verify the request."],
    citations,
    capabilityId,
    preparedWorkspaceHref,
  };
}

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (!query) {
    return protectedJson(
      {
        error: "A query string is required.",
      },
      { status: 400 },
    );
  }

  const capabilityMatch = detectAssistantCapability({
    input: query,
    intent: "live_current",
    answerStyle: "live_current",
    routeHint: req.nextUrl.searchParams.get("routeHint"),
  });
  const capability = getAssistantCapability(capabilityMatch.capability.id);
  const preparedWorkspaceHref = capability.defaultExactHref;

  if (capability.liveDomain === "markets") {
    const coins = detectCoins(query);
    const coinParam = coins.length > 0 ? `&coins=${coins.join(",")}` : "";
    const pricesResponse = await fetchJsonRoute<{ data?: PriceRow[] }>(
      req,
      `/api/prices?mode=markets${coinParam}`,
    );
    const rows = pricesResponse?.data ?? [];
    const marketResult = buildMarketResult(
      query,
      capability.id,
      preparedWorkspaceHref,
      rows,
    );
    if (marketResult.verified) {
      return protectedJson(marketResult);
    }
  }

  if (capability.liveDomain === "cyber") {
    const cyberResponse = await fetchJsonRoute<{ vulnerabilities?: CveRow[] }>(
      req,
      "/api/cves",
    );
    const rows = cyberResponse?.vulnerabilities ?? [];
    const cyberResult = buildCyberResult(
      query,
      capability.id,
      preparedWorkspaceHref,
      rows,
    );
    if (cyberResult.verified) {
      return protectedJson(cyberResult);
    }
  }

  if (capability.liveDomain === "news") {
    const newsResponse = await fetchJsonRoute<NewsRow[]>(req, "/api/news");
    const rows = newsResponse ?? [];
    const newsResult = buildNewsResult(
      query,
      capability.id,
      preparedWorkspaceHref,
      rows,
    );
    if (newsResult.verified) {
      return protectedJson(newsResult);
    }
  }

  const openWebResults = await fetchOpenWebResults(query);
  return protectedJson(
    buildOpenWebResult(
      query,
      capability.id,
      preparedWorkspaceHref,
      openWebResults,
    ),
  );
}
