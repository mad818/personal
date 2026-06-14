// ── components/ui/GlobalDataLoader ─────────────────────────
// Root-level data fetcher and cache manager for global application state.

"use client";
import { useEffect } from "react";
import { useGlobalData } from "@/hooks/useGlobalData";
import { useKeywordAlerts } from "@/hooks/useKeywordAlerts";
import { subscribeVisiblePolling } from "@/lib/visiblePolling";

export default function GlobalDataLoader() {
  const { fetchAll } = useGlobalData();

  // Keyword alert engine — fires notifications when articles match user keywords
  useKeywordAlerts();

  useEffect(() => {
    return subscribeVisiblePolling({
      key: "globalData",
      run: fetchAll,
      intervalMs: 5 * 60_000,
    });
  }, [fetchAll]);

  // Manual refresh trigger from SystemStatusFooter
  useEffect(() => {
    const handler = async () => {
      try {
        await fetchAll();
      } finally {
        // Notify footer + any listeners that data refresh completed
        window.dispatchEvent(new CustomEvent("nexus-data-refreshed"));
      }
    };
    window.addEventListener("nexus-refresh-trigger", handler as EventListener);
    return () =>
      window.removeEventListener(
        "nexus-refresh-trigger",
        handler as EventListener,
      );
  }, [fetchAll]);

  return null;
}
