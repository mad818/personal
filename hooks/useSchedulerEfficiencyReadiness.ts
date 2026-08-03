"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/apiFetch";
import { fetchJsonCached } from "@/lib/apiCache";
import {
  parseSchedulerEfficiencyEvalPayload,
  type SchedulerEfficiencyEvalPayload,
} from "@/lib/runtimeTypes";

export function useSchedulerEfficiencyReadiness(limit = 12, enabled = true) {
  const [payload, setPayload] = useState<SchedulerEfficiencyEvalPayload | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");

  const refresh = useCallback(async () => {
    if (!enabled) {
      setPayload(null);
      setLoadError("");
      setLoading(false);
      return null;
    }
    setLoading(true);
    try {
      const raw = await fetchJsonCached(
        `scheduler-efficiency:limit=${limit}`,
        async () => {
          const response = await apiFetch(
            `/api/metrics/runtime-eval?limit=${limit}`,
          );
          if (!response.ok) {
            throw new Error("Scheduler efficiency request failed.");
          }
          const envelope = (await response.json()) as {
            schedulerEfficiency?: unknown;
          };
          return (
            envelope.schedulerEfficiency ?? {
              status: "unavailable",
              latest: null,
              history: [],
              points: 0,
            }
          );
        },
        15_000,
      );
      const nextPayload = parseSchedulerEfficiencyEvalPayload(raw);
      setPayload(nextPayload);
      setLoadError("");
      return nextPayload;
    } catch {
      setLoadError(
        "Efficiency posture is temporarily unavailable. Recurring mission optimization remains local-first and can recover on the next scheduler sync.",
      );
      return null;
    } finally {
      setLoading(false);
    }
  }, [enabled, limit]);

  useEffect(() => {
    if (!enabled) {
      setPayload(null);
      setLoadError("");
      setLoading(false);
      return;
    }
    void refresh();
  }, [enabled, refresh]);

  return {
    payload,
    loading,
    loadError,
    refresh,
  };
}
