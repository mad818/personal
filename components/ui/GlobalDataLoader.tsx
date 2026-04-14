// ── components/ui/GlobalDataLoader ─────────────────────────
// Root-level data fetcher and cache manager for global application state.

"use client";
import { useEffect } from "react";
import { useGlobalData } from "@/hooks/useGlobalData";
import { useKeywordAlerts } from "@/hooks/useKeywordAlerts";
import { useLessons } from "@/hooks/useLessons";
import { NEXUS_RUNTIME_POLICY_REFRESHED_EVENT } from "@/lib/runtimePolicyEvents";

export default function GlobalDataLoader() {
  const { fetchAll } = useGlobalData();

  // Keyword alert engine — fires notifications when articles match user keywords
  useKeywordAlerts();

  // Standards engine — loads the shared rules set once per session into the store
  useLessons();

  useEffect(() => {
    const run = () => {
      // Skip if tab is hidden or browser reports no network connection.
      if (typeof document !== "undefined" && document.hidden) return;
      if (typeof navigator !== "undefined" && !navigator.onLine) return;
      void fetchAll();
    };

    run();
    const id = setInterval(run, 5 * 60_000);
    const onVisible = () => {
      if (typeof document === "undefined" || document.hidden) return;
      void fetchAll();
    };
    const onRuntimePolicyRefreshed = () => {
      if (typeof document !== "undefined" && document.hidden) return;
      void fetchAll();
    };

    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", onVisible);
    }
    if (typeof window !== "undefined") {
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
        window.removeEventListener(
          NEXUS_RUNTIME_POLICY_REFRESHED_EVENT,
          onRuntimePolicyRefreshed,
        );
      }
    };
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
