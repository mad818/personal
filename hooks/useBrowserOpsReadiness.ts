"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/apiFetch";
import type { BrowserOpsReadinessSnapshot } from "@/lib/nativeAssimilation";

export function useBrowserOpsReadiness() {
  const [snapshot, setSnapshot] = useState<BrowserOpsReadinessSnapshot | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiFetch("/api/recon/status");
      if (!response.ok) {
        throw new Error("Failed to load browser ops readiness.");
      }
      const payload = (await response.json()) as BrowserOpsReadinessSnapshot;
      setSnapshot(payload);
      setLoadError("");
    } catch {
      setLoadError(
        "Browser-ops readiness is temporarily unavailable. Guarded recon routes still stay primary until the local posture recovers.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    snapshot,
    loading,
    loadError,
    refresh,
  };
}
