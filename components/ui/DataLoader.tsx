// ── components/ui/DataLoader ───────────────────────────────
// Client-side data fetchers: PricesLoader, ArticlesLoader, FearGreedLoader.

"use client";

/**
 * DataLoader — mounts once per page and triggers the relevant data hooks.
 * Each page imports the variant it needs. Data goes into Zustand store,
 * then components read from the store — no prop drilling.
 */

import { useEffect } from "react";
import { usePrices } from "@/hooks/usePrices";
import { useArticles } from "@/hooks/useArticles";
import { useCVEs } from "@/hooks/useCVEs";
import { useOTX } from "@/hooks/useOTX";
import { useStore } from "@/store/useStore";
import { apiFetch } from "@/lib/apiFetch";
import { subscribeVisiblePolling } from "@/lib/visiblePolling";
import { ShellButton } from "@/components/ui/shell";

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
  const { fetchArticles } = useArticles();
  useEffect(() => {
    return startVisiblePolling("articles", fetchArticles, 5 * 60_000);
  }, [fetchArticles]);
  return null;
}

// ── CVEs (CYBER tab) ──────────────────────────────────────────────────────────
export function CVEsLoader() {
  const { fetchCVEs } = useCVEs();
  useEffect(() => {
    return startVisiblePolling("cves", fetchCVEs, 15 * 60_000);
  }, [fetchCVEs]);
  return null;
}

// ── OTX Threat Pulses (CYBER tab) ─────────────────────────────────────────────
export function OTXLoader() {
  const { fetchOTX } = useOTX();
  useEffect(() => {
    return startVisiblePolling("otx", fetchOTX, 15 * 60_000);
  }, [fetchOTX]);
  return null;
}

// ── World Risk background loader (COMMAND tab KPI) ────────────────────────────
// Fetches conflict RSS silently so COMMAND shows worldRisk without needing OPS open
export function WorldRiskLoader() {
  const setWorldRisk = useStore((s) => s.setWorldRisk);

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
      try {
        const r = await apiFetch("/api/conflict", {
          signal: AbortSignal.timeout(15000),
        });
        const d = await r.json();
        const articles = (d.articles ?? []) as {
          title: string;
          impact?: string;
        }[];
        const riskCount = articles.filter((a) => {
          const t = a.title.toLowerCase();
          return CONFLICT_KW.some((k) => t.includes(k));
        }).length;
        if (riskCount > 0) setWorldRisk(riskCount);
      } catch {
        /* silent */
      }
    }
    return startVisiblePolling("worldRisk", load, 15 * 60_000);
  }, [setWorldRisk]);

  return null;
}

// ── Fear & Greed (COMMAND tab) ────────────────────────────────────────────────
export function FearGreedLoader() {
  const setSignals = useStore((s) => s.setSignals);

  useEffect(() => {
    async function fetchFearGreed() {
      try {
        const r = await apiFetch("/api/fear-greed", {
          signal: AbortSignal.timeout(10_000),
        });
        const d = await r.json();
        const entry = d?.current;
        if (entry?.value != null) {
          setSignals({
            fg: {
              value: Number(entry.value),
              label: entry.classification ?? "",
            },
          });
        }
      } catch {
        /* silent */
      }
    }
    return startVisiblePolling("fearGreed", fetchFearGreed, 10 * 60_000);
  }, [setSignals]);

  return null;
}
