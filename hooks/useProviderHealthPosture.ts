"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/apiFetch";
import { useOfflineReadiness } from "@/hooks/useOfflineReadiness";
import {
  buildProviderResiliencePosture,
  type ProviderHealthSnapshot,
} from "@/lib/providerPosture";

export function useProviderHealthPosture() {
  const { status, internetReachable, runtimeReachable } = useOfflineReadiness();
  const [snapshot, setSnapshot] = useState<ProviderHealthSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiFetch("/api/health/providers", {
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error("Provider posture is temporarily unavailable.");
      }
      const payload = (await response.json()) as ProviderHealthSnapshot;
      setSnapshot(payload);
      setLoadError("");
    } catch {
      setLoadError(
        "Provider posture is temporarily unavailable. Runtime reachability and local fallback cues remain available while the health snapshot recovers.",
      );
      setSnapshot(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const run = async () => {
      await refresh();
      if (!active) return;
    };
    void run();

    const handleVisible = () => {
      if (typeof document !== "undefined" && document.hidden) return;
      void refresh();
    };

    document.addEventListener("visibilitychange", handleVisible);
    return () => {
      active = false;
      document.removeEventListener("visibilitychange", handleVisible);
    };
  }, [refresh]);

  const posture = useMemo(
    () =>
      buildProviderResiliencePosture({
        snapshot,
        internetReachable,
        runtimeReachable,
        loadError,
      }),
    [internetReachable, loadError, runtimeReachable, snapshot],
  );

  return {
    offlineStatus: status,
    snapshot,
    loading,
    loadError,
    posture,
    refresh,
  };
}
