"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/apiFetch";
import type { FreeLocalReadinessSnapshot } from "@/lib/freeLocalReadiness";
import {
  deriveIntelOnlyPosture,
  type IntelOnlyPostureSnapshot,
} from "@/lib/intelOnlyDegradedMode";

const EMPTY_POSTURE = deriveIntelOnlyPosture(null);

export function useIntelOnlyPosture(pollMs = 30_000) {
  const [snapshot, setSnapshot] =
    useState<FreeLocalReadinessSnapshot | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const response = await apiFetch("/api/free-local-readiness", {
        cache: "no-store",
        signal,
      });
      if (!response.ok) {
        if (!signal?.aborted) setSnapshot(null);
        return;
      }
      const payload = (await response.json()) as FreeLocalReadinessSnapshot;
      if (!signal?.aborted) setSnapshot(payload);
    } catch {
      if (!signal?.aborted) setSnapshot(null);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void refresh(controller.signal);

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        void refresh(controller.signal);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void refresh(controller.signal);
      }
    }, pollMs);

    return () => {
      controller.abort();
      document.removeEventListener("visibilitychange", onVisibility);
      window.clearInterval(timer);
    };
  }, [pollMs, refresh]);

  const posture: IntelOnlyPostureSnapshot = deriveIntelOnlyPosture(snapshot);

  return { posture, snapshot, loading, refresh };
}
