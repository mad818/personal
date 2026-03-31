"use client";

// ── lib/keywordAlerts.ts ───────────────────────────────────────────────────────
// Keyword alert engine for Nexus Prime.
//
// Scans loaded articles against a comma-separated list of user-defined keywords
// from Settings. Returns matches without duplicates — callers are responsible
// for tracking already-fired article IDs across renders.

import type { Article } from "@/store/useStore";

export interface AlertMatch {
  article: Article;
  matchedKeyword: string;
}

/**
 * Parse raw keyword string into a clean list.
 * Input: "bitcoin, ETF, rate hike" → ["bitcoin", "etf", "rate hike"]
 */
export function parseKeywords(raw: string): string[] {
  return raw
    .split(",")
    .map((k) => k.trim().toLowerCase())
    .filter((k) => k.length >= 2);
}

/**
 * scanArticles — check articles for keyword matches.
 *
 * @param articles    Current article list from the store
 * @param rawKeywords Comma-separated string from settings.alertKeywords
 * @param seenIds     Set of article IDs already matched — mutated in place
 * @returns           Array of { article, matchedKeyword } for new matches only
 */
export function scanArticles(
  articles: Article[],
  rawKeywords: string,
  seenIds: Set<string>,
): AlertMatch[] {
  if (!rawKeywords.trim()) return [];

  const keywords = parseKeywords(rawKeywords);
  if (!keywords.length) return [];

  const matches: AlertMatch[] = [];

  for (const article of articles) {
    if (seenIds.has(article.id)) continue;

    const haystack = `${article.title} ${article.desc ?? ""}`.toLowerCase();

    for (const kw of keywords) {
      if (haystack.includes(kw)) {
        matches.push({ article, matchedKeyword: kw });
        seenIds.add(article.id); // mark as seen so we never fire twice
        break; // one alert per article max
      }
    }
  }

  return matches;
}

/**
 * Map article category to notification type.
 */
export function articleCatToNotifType(
  cat: string | undefined,
): "market" | "threat" | "intel" {
  if (!cat) return "intel";
  if (cat === "crypto" || cat === "markets") return "market";
  if (cat === "cyber") return "threat";
  return "intel";
}
