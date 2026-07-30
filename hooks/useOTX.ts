"use client";

import { useCallback, useRef, useState } from "react";
import { useStore } from "@/store/useStore";
import type { OTXPulse } from "@/store/useStore";
import { apiFetch } from "@/lib/apiFetch";
import { readJsonFeedResponse } from "@/lib/liveFeedReliability";

// ── Raw API shape ─────────────────────────────────────────────────────────────
interface OTXRawPulse {
  id?: string;
  name?: string;
  description?: string;
  author_name?: string;
  tags?: string[];
  indicator_count?: number;
  created?: string;
  modified?: string;
  tlp?: string;
  adversary?: string;
  references?: string[];
}

function parseRaw(r: OTXRawPulse): OTXPulse {
  return {
    id: r.id ?? "",
    name: r.name ?? "(unnamed)",
    description: (r.description ?? "").slice(0, 300),
    author: r.author_name ?? "",
    tags: Array.isArray(r.tags) ? r.tags.slice(0, 8) : [],
    indicator_count: r.indicator_count ?? 0,
    created: r.created ?? "",
    modified: r.modified ?? "",
    tlp: (r.tlp ?? "white").toLowerCase(),
    adversary: r.adversary ?? "",
    references: Array.isArray(r.references) ? r.references.slice(0, 3) : [],
  };
}

interface OTXPayload {
  otx_pulses: OTXRawPulse[];
  otx_available: boolean;
  sources: { otx?: string };
}

function isOTXPayload(value: unknown): value is OTXPayload {
  return Boolean(
    value &&
    typeof value === "object" &&
    Array.isArray((value as OTXPayload).otx_pulses) &&
    typeof (value as OTXPayload).otx_available === "boolean" &&
    (value as OTXPayload).sources &&
    typeof (value as OTXPayload).sources === "object",
  );
}

const OTX_UNAVAILABLE =
  "OTX refresh failed. Any previously verified pulses remain displayed.";
const OTX_NOT_CONFIGURED = "OTX key is not configured on the server.";

export function useOTX() {
  const setOtxPulses = useStore((s) => s.setOtxPulses);
  const updateFeedStatus = useStore((s) => s.updateFeedStatus);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const requestIdRef = useRef(0);

  const fetchOTX = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError("");
    updateFeedStatus("otx", { lastAttemptAt: Date.now() });
    let failureMessage = OTX_UNAVAILABLE;
    try {
      // Read through server route so OTX key stays server-side.
      const response = await apiFetch("/api/threat-intel", {
        signal: AbortSignal.timeout(12_000),
      });
      const payload = await readJsonFeedResponse(
        response,
        isOTXPayload,
        OTX_UNAVAILABLE,
      );
      if (!payload.otx_available) {
        failureMessage = OTX_NOT_CONFIGURED;
        throw new Error(failureMessage);
      }
      if (payload.sources.otx !== "ok") throw new Error(failureMessage);
      if (requestId !== requestIdRef.current) return;

      const raw = payload.otx_pulses;
      const pulses = raw.map(parseRaw);
      // Sort: most recently modified first
      pulses.sort(
        (a, b) =>
          new Date(b.modified).getTime() - new Date(a.modified).getTime(),
      );
      setOtxPulses(pulses);
      updateFeedStatus("otx", {
        lastSuccessAt: Date.now(),
        lastError: null,
      });
    } catch {
      if (requestId !== requestIdRef.current) return;
      const completedAt = Date.now();
      setError(failureMessage);
      updateFeedStatus("otx", {
        lastFailureAt: completedAt,
        lastError: failureMessage,
      });
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [setOtxPulses, updateFeedStatus]);

  const cancelOTX = useCallback(() => {
    requestIdRef.current += 1;
  }, []);

  return { fetchOTX, cancelOTX, loading, error };
}
