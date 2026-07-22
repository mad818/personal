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

  return null;
}
