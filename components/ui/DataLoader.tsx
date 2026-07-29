// ── components/ui/DataLoader ───────────────────────────────
// Client-side data fetchers: PricesLoader, ArticlesLoader, FearGreedLoader.

"use client";

/**
 * DataLoader — mounts once per page and triggers the relevant data hooks.
 * Each page imports the variant it needs. Data goes into Zustand store,
 * then components read from the store — no prop drilling.
 */

import { useEffect, useRef } from "react";
import { usePrices } from "@/hooks/usePrices";
import { useFearGreed } from "@/hooks/useFearGreed";
import { useArticles } from "@/hooks/useArticles";
import { useCVEs } from "@/hooks/useCVEs";
import { useOTX } from "@/hooks/useOTX";
import { useStore } from "@/store/useStore";
import { apiFetch } from "@/lib/apiFetch";
import { subscribeVisiblePolling } from "@/lib/visiblePolling";
import { ShellButton } from "@/components/ui/shell";
import { readJsonFeedResponse } from "@/lib/liveFeedReliability";

function startVisiblePolling(
  key: string,
  fn: () => void | Promise<void>,
  intervalMs: number,
) {
  return subscribeVisiblePolling({ key, run: fn, intervalMs });
}

// ── Prices (ALPHA + COMMAND tabs) ─────────────────────────────────────────────
export function PricesLoader({ showStatus = false }: { showStatus?: boolean }) {
  const { fetchPrices, loading, stop } = usePrices();
  const priceStatus = useStore((state) => state.feedStatus.prices);
  useEffect(() => {
    const unsubscribe = startVisiblePolling("prices", fetchPrices, 60_000);
    return () => {
      unsubscribe();
      stop();
    };
  }, [fetchPrices, stop]);

  if (!showStatus || !priceStatus.lastError) return null;
  return (
    <div
      role="alert"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "12px",
        padding: "10px 12px",
        marginBottom: "12px",
        border: "1px solid var(--border2)",
        borderRadius: "8px",
        background: "var(--surf2)",
        color: "var(--fmd)",
        fontSize: "11px",
      }}
    >
      <span>{priceStatus.lastError}</span>
      <ShellButton
        onClick={() => fetchPrices()}
        disabled={loading}
        title="Retry the verified crypto price feeds"
      >
        {loading ? "Retrying…" : "Retry prices"}
      </ShellButton>
    </div>
  );
}

// ── Articles (SIGNALS tab) ────────────────────────────────────────────────────
export function ArticlesLoader() {
  const { fetchArticles, cancelArticles } = useArticles();
  useEffect(() => {
    const unsubscribe = startVisiblePolling(
      "articles",
      fetchArticles,
      5 * 60_000,
    );
    return () => {
      unsubscribe();
      cancelArticles();
    };
  }, [cancelArticles, fetchArticles]);
  return null;
}

// ── CVEs (CYBER tab) ──────────────────────────────────────────────────────────
export function CVEsLoader() {
  const { fetchCVEs, cancelCVEs } = useCVEs();
  useEffect(() => {
    const unsubscribe = startVisiblePolling("cves", fetchCVEs, 15 * 60_000);
    return () => {
      unsubscribe();
      cancelCVEs();
    };
  }, [cancelCVEs, fetchCVEs]);
  return null;
}

// ── OTX Threat Pulses (CYBER tab) ─────────────────────────────────────────────
export function OTXLoader() {
  const { fetchOTX, cancelOTX } = useOTX();
  useEffect(() => {
    const unsubscribe = startVisiblePolling("otx", fetchOTX, 15 * 60_000);
    return () => {
      unsubscribe();
      cancelOTX();
    };
  }, [cancelOTX, fetchOTX]);
  return null;
}

// ── World Risk background loader (COMMAND tab KPI) ────────────────────────────
// Fetches conflict RSS silently so COMMAND shows worldRisk without needing OPS open
export function WorldRiskLoader() {
  const setWorldRisk = useStore((s) => s.setWorldRisk);
  const updateFeedStatus = useStore((s) => s.updateFeedStatus);
  const requestIdRef = useRef(0);

  useEffect(() => {
    const CONFLICT_KW = [
      "war",
      "conflict",
      "military",
      "attack",
      "killed",
      "airstrike",
      "strike",
      "missile",
      "bomb",
      "troops",
      "invasion",
      "coup",
      "sanctions",
      "nuclear",
      "casualties",
    ];

    async function load() {
      const requestId = ++requestIdRef.current;
      updateFeedStatus("conflict", { lastAttemptAt: Date.now() });
      try {
        const response = await apiFetch("/api/conflict", {
          signal: AbortSignal.timeout(15000),
        });
        const payload = await readJsonFeedResponse(
          response,
          (
            value,
          ): value is {
            articles: Array<{ title: string; impact?: string }>;
          } =>
            Boolean(
              value &&
              typeof value === "object" &&
              Array.isArray(
                (
                  value as {
                    articles?: unknown;
                  }
                ).articles,
              ) &&
              (
                value as {
                  articles: unknown[];
                }
              ).articles.every(
                (article) =>
                  article !== null &&
                  typeof article === "object" &&
                  typeof (article as { title?: unknown }).title === "string",
              ),
            ),
          "Conflict feed is temporarily unavailable.",
        );
        if (requestId !== requestIdRef.current) return;
        const articles = payload.articles;
        const riskCount = articles.filter((a) => {
          const t = a.title.toLowerCase();
          return CONFLICT_KW.some((k) => t.includes(k));
        }).length;
        setWorldRisk(riskCount);
        updateFeedStatus("conflict", {
          lastSuccessAt: Date.now(),
          lastError: null,
        });
      } catch {
        if (requestId !== requestIdRef.current) return;
        updateFeedStatus("conflict", {
          lastFailureAt: Date.now(),
          lastError:
            "Conflict refresh failed. Previously verified risk remains displayed.",
        });
      }
    }
    const unsubscribe = startVisiblePolling("worldRisk", load, 15 * 60_000);
    return () => {
      unsubscribe();
      requestIdRef.current += 1;
    };
  }, [setWorldRisk, updateFeedStatus]);

  return null;
}

// ── Fear & Greed (COMMAND tab) ────────────────────────────────────────────────
export function FearGreedLoader() {
  const { fetchFearGreed, cancelFearGreed } = useFearGreed();

  useEffect(() => {
    const unsubscribe = startVisiblePolling(
      "fearGreed",
      fetchFearGreed,
      10 * 60_000,
    );
    return () => {
      unsubscribe();
      cancelFearGreed();
    };
  }, [cancelFearGreed, fetchFearGreed]);

  return null;
}
