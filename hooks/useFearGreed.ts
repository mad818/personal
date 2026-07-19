"use client";

import { useCallback, useRef, useState } from "react";
import { apiFetch } from "@/lib/apiFetch";
import { isFearGreedSuccess } from "@/lib/fearGreedTypes";
import { useStore } from "@/store/useStore";

const SENTIMENT_UNAVAILABLE =
  "Fear & Greed sentiment is temporarily unavailable.";

export function useFearGreed() {
  const setFearGreed = useStore((state) => state.setFearGreed);
  const setSignals = useStore((state) => state.setSignals);
  const updateFeedStatus = useStore((state) => state.updateFeedStatus);
  const [loading, setLoading] = useState(false);
  const requestIdRef = useRef(0);

  const fetchFearGreed = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    updateFeedStatus("fearGreed", { lastAttemptAt: Date.now() });
    try {
      const response = await apiFetch("/api/fear-greed", {
        cache: "no-store",
        signal: AbortSignal.timeout(10_000),
      });
      const payload: unknown = await response.json();
      if (!response.ok || !isFearGreedSuccess(payload)) {
        throw new Error(SENTIMENT_UNAVAILABLE);
      }
      if (requestId !== requestIdRef.current) return;
      const completedAt = Date.now();
      setFearGreed({ current: payload.current, history: payload.history });
      setSignals({
        fg: {
          value: payload.current.value,
          label: payload.current.classification,
        },
      });
      updateFeedStatus("fearGreed", {
        lastSuccessAt: completedAt,
        lastError: null,
      });
    } catch {
      if (requestId !== requestIdRef.current) return;
      const completedAt = Date.now();
      updateFeedStatus("fearGreed", {
        lastFailureAt: completedAt,
        lastError: SENTIMENT_UNAVAILABLE,
      });
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [setFearGreed, setSignals, updateFeedStatus]);

  const cancelFearGreed = useCallback(() => {
    requestIdRef.current += 1;
  }, []);

  return { fetchFearGreed, cancelFearGreed, loading };
}
