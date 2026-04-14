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
import { readBrowserInternetAvailability, shouldPauseInternetPolling } from "@/lib/offlineReadiness";
import { NEXUS_RUNTIME_POLICY_REFRESHED_EVENT } from "@/lib/runtimePolicyEvents";

function startVisiblePolling(fn: () => void | Promise<void>, intervalMs: number) {
  const run = () => {
    if (typeof document !== "undefined" && document.hidden) return;
    if (shouldPauseInternetPolling()) return;
    void fn();
  };

  if (readBrowserInternetAvailability()) {
    run();
  }
  const id = setInterval(run, intervalMs);
  const onVisible = () => {
    if (typeof document === "undefined" || document.hidden) return;
    if (shouldPauseInternetPolling()) return;
    void fn();
  };
  const onOnline = () => {
    if (typeof document !== "undefined" && document.hidden) return;
    void fn();
  };
  const onRuntimePolicyRefreshed = () => {
    if (typeof document !== "undefined" && document.hidden) return;
    if (shouldPauseInternetPolling()) return;
    void fn();
  };

  if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", onVisible);
  }
  if (typeof window !== "undefined") {
    window.addEventListener("online", onOnline);
    window.addEventListener(
      NEXUS_RUNTIME_POLICY_REFRESHED_EVENT,
      onRuntimePolicyRefreshed,
    );
  }

  return () => {
    clearInterval(id);
    if (typeof document !== "undefined") {
      document.removeEventListener("visibilitychange", onVisible);
    }
    if (typeof window !== "undefined") {
      window.removeEventListener("online", onOnline);
      window.removeEventListener(
        NEXUS_RUNTIME_POLICY_REFRESHED_EVENT,
        onRuntimePolicyRefreshed,
      );
    }
  };
}

function startVisiblePolling(fn: () => void | Promise<void>, intervalMs: number) {
  const run = () => {
    if (typeof document !== "undefined" && document.hidden) return;
    void fn();
  };

  run();
  const id = setInterval(run, intervalMs);
  const onVisible = () => {
    if (typeof document === "undefined" || document.hidden) return;
    void fn();
  };

  if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", onVisible);
  }

  return () => {
    clearInterval(id);
    if (typeof document !== "undefined") {
      document.removeEventListener("visibilitychange", onVisible);
    }
  };
}

// ── Prices (ALPHA + COMMAND tabs) ─────────────────────────────────────────────
export function PricesLoader() {
  const { start, stop } = usePrices();
  useEffect(() => {
    start(60_000); // refresh every 60s
    return stop;
  }, [start, stop]);
  return null;
}

// ── Articles (SIGNALS tab) ────────────────────────────────────────────────────
export function ArticlesLoader() {
  const { fetchArticles } = useArticles();
  useEffect(() => {
    return startVisiblePolling(fetchArticles, 5 * 60_000);
  }, [fetchArticles]);
  return null;
}

// ── CVEs (CYBER tab) ──────────────────────────────────────────────────────────
export function CVEsLoader() {
  const { fetchCVEs } = useCVEs();
  useEffect(() => {
    return startVisiblePolling(fetchCVEs, 15 * 60_000);
  }, [fetchCVEs]);
  return null;
}

// ── OTX Threat Pulses (CYBER tab) ─────────────────────────────────────────────
export function OTXLoader() {
  const { fetchOTX } = useOTX();
  useEffect(() => {
    return startVisiblePolling(fetchOTX, 15 * 60_000);
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
    return startVisiblePolling(load, 15 * 60_000);
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
    return startVisiblePolling(fetchFearGreed, 10 * 60_000);
  }, [setSignals]);

  return null;
}
