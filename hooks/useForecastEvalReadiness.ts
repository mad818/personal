"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/apiFetch";
import { fetchJsonCached } from "@/lib/apiCache";
import {
  parseForecastEvalPayload,
  type ForecastEvalPayload,
} from "@/lib/runtimeTypes";

export function useForecastEvalReadiness(limit = 12, enabled = true) {
  const [payload, setPayload] = useState<ForecastEvalPayload | null>(null);
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
        `forecast-eval:limit=${limit}`,
        async () => {
          const response = await apiFetch(
            `/api/metrics/runtime-eval?limit=${limit}`,
          );
          if (!response.ok) {
            throw new Error("Forecast readiness request failed.");
          }
          const envelope = (await response.json()) as {
            forecastEval?: unknown;
          };
          return (
            envelope.forecastEval ?? {
              status: "unavailable",
              latest: null,
              history: [],
              points: 0,
            }
          );
        },
        15_000,
      );
      const nextPayload = parseForecastEvalPayload(raw);
      setPayload(nextPayload);
      setLoadError("");
      return nextPayload;
    } catch {
      setLoadError(
        "Forecast readiness is temporarily unavailable. The market tape remains primary while the baseline bench recovers.",
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
