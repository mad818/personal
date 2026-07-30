// ── hooks/useArticles ───────────────────────────────────────
// Hook for fetching and managing news articles with filtering and pagination.

"use client";

import { useCallback, useRef, useState } from "react";
import { useStore, Article } from "@/store/useStore";
import { apiFetch } from "@/lib/apiFetch";
import { readJsonFeedResponse } from "@/lib/liveFeedReliability";

// Bias detection — mirrors nexus-final.html logic
const BIAS_KW: Record<string, string[]> = {
  bullish: [
    "surge",
    "rally",
    "gain",
    "soar",
    "jump",
    "rise",
    "high",
    "bull",
    "breakout",
    "record",
  ],
  bearish: [
    "crash",
    "drop",
    "fall",
    "plunge",
    "decline",
    "sell",
    "bear",
    "loss",
    "low",
    "risk",
  ],
  neutral: ["stable", "steady", "hold", "flat", "unchanged", "mixed"],
};

function detectBias(text: string): string {
  const t = text.toLowerCase();
  const scores: Record<string, number> = { bullish: 0, bearish: 0, neutral: 0 };
  for (const [bias, kws] of Object.entries(BIAS_KW)) {
    scores[bias] = kws.filter((k) => t.includes(k)).length;
  }
  const top = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
  return top[1] > 0 ? top[0] : "neutral";
}

function stableArticleId(prefix: string, title: string, link: string): string {
  const s = `${title}|${link}`;
  let h = 0;
  for (let i = 0; i < s.length; i++)
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return `${prefix}-${Math.abs(h).toString(36)}`;
}

/** Last-resort categorization for GDELT client fallback */
function guessCatFromTitle(title: string): string {
  const t = title.toLowerCase();
  if (/bitcoin|crypto|ethereum|blockchain|defi|token|btc|solana/.test(t))
    return "crypto";
  if (/hack|cyber|ransom|malware|cve|vulnerability|breach|phish/.test(t))
    return "cyber";
  if (/stock|market|fed|earnings|economy|trade|bank|inflation|gdp/.test(t))
    return "markets";
  if (/software|chip|ai|iphone|google|microsoft|apple|tech/.test(t))
    return "tech";
  return "world";
}

interface NewsRecord {
  title: string;
  link: string;
  date: string;
  src: string;
  cat?: string;
  desc?: string;
}

function isNewsPayload(value: unknown): value is NewsRecord[] {
  return (
    Array.isArray(value) &&
    value.every(
      (entry) =>
        entry !== null &&
        typeof entry === "object" &&
        typeof (entry as NewsRecord).title === "string" &&
        typeof (entry as NewsRecord).link === "string" &&
        typeof (entry as NewsRecord).date === "string" &&
        typeof (entry as NewsRecord).src === "string",
    )
  );
}

interface GdeltPayload {
  articles: Array<{ title?: string; url?: string; seendate?: string }>;
}

function isGdeltPayload(value: unknown): value is GdeltPayload {
  return Boolean(
    value &&
    typeof value === "object" &&
    Array.isArray((value as GdeltPayload).articles),
  );
}

const ARTICLES_UNAVAILABLE =
  "News refresh failed. Any previously verified articles remain displayed.";

export function useArticles() {
  const setArticles = useStore((s) => s.setArticles);
  const setArticlesLoaded = useStore((s) => s.setArticlesLoaded);
  const updateFeedStatus = useStore((s) => s.updateFeedStatus);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const requestIdRef = useRef(0);

  const fetchArticles = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError("");
    updateFeedStatus("articles", { lastAttemptAt: Date.now() });
    try {
      const articles: Article[] = [];
      let verifiedSource = false;

      // ── 1. Server-side RSS + CryptoCompare + GDELT fallback (see app/api/news/route.ts) ─
      try {
        const response = await apiFetch("/api/news", {
          signal: AbortSignal.timeout(15000),
        });
        const raw = await readJsonFeedResponse(
          response,
          isNewsPayload,
          ARTICLES_UNAVAILABLE,
        );
        verifiedSource = true;
        raw.forEach((a) => {
          articles.push({
            id: stableArticleId("news", a.title, a.link),
            title: a.title,
            desc: a.desc ?? "",
            link: a.link,
            date: a.date,
            bias: detectBias(a.title),
            src: a.src,
            cat: a.cat,
          });
        });
      } catch {
        /* silent */
      }

      // ── 2. Client GDELT backup if /api/news returned nothing (edge case) ─────────
      if (articles.length === 0) {
        try {
          const response = await apiFetch(
            "/api/gdelt?query=cryptocurrency+OR+cybersecurity+OR+markets+OR+geopolitics&timespan=24H&maxrecords=35",
            { signal: AbortSignal.timeout(12000) },
          );
          const payload = await readJsonFeedResponse(
            response,
            isGdeltPayload,
            ARTICLES_UNAVAILABLE,
          );
          verifiedSource = true;
          payload.articles.forEach((a) => {
            const title = String(a.title ?? "");
            const link = String(a.url ?? "");
            if (!title || !link.startsWith("http")) return;
            const cat = guessCatFromTitle(title);
            articles.push({
              id: stableArticleId("gdelt", title, link),
              title,
              desc: "",
              link,
              date: String(a.seendate ?? ""),
              bias: detectBias(title),
              src: "GDELT",
              cat,
            });
          });
        } catch {
          /* silent */
        }
      }

      if (!verifiedSource) throw new Error(ARTICLES_UNAVAILABLE);
      if (requestId !== requestIdRef.current) return;

      setArticles(articles);
      updateFeedStatus("articles", {
        lastSuccessAt: Date.now(),
        lastError: null,
      });
    } catch {
      if (requestId !== requestIdRef.current) return;
      const completedAt = Date.now();
      setError(ARTICLES_UNAVAILABLE);
      updateFeedStatus("articles", {
        lastFailureAt: completedAt,
        lastError: ARTICLES_UNAVAILABLE,
      });
    } finally {
      if (requestId === requestIdRef.current) {
        setArticlesLoaded(true);
        setLoading(false);
      }
    }
  }, [setArticles, setArticlesLoaded, updateFeedStatus]);

  const cancelArticles = useCallback(() => {
    requestIdRef.current += 1;
  }, []);

  return { fetchArticles, cancelArticles, loading, error };
}
