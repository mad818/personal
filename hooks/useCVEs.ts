// ── hooks/useCVEs ───────────────────────────────────────────
// Hook for fetching and caching CVE data with search and filtering.

"use client";

import { useCallback, useRef, useState } from "react";
import { useStore } from "@/store/useStore";
import { apiFetch } from "@/lib/apiFetch";
import { buildDeltaSweep } from "@/lib/liveContext";
import {
  combineFeedAbortSignals,
  readJsonFeedResponse,
} from "@/lib/liveFeedReliability";

export interface CVE {
  id: string;
  description: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "NONE";
  score: number;
  published: string;
  url: string;
}

const SEV_ORDER: Record<string, number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
  NONE: 4,
};

function parseSeverity(metrics: any): {
  severity: CVE["severity"];
  score: number;
} {
  const cvss31 = metrics?.cvssMetricV31?.[0]?.cvssData;
  const cvss30 = metrics?.cvssMetricV30?.[0]?.cvssData;
  const cvss2 = metrics?.cvssMetricV2?.[0]?.cvssData;
  const data = cvss31 ?? cvss30 ?? cvss2;

  if (!data) return { severity: "NONE", score: 0 };

  const score = data.baseScore ?? 0;
  const sev = (
    data.baseSeverity ??
    (score >= 9
      ? "CRITICAL"
      : score >= 7
        ? "HIGH"
        : score >= 4
          ? "MEDIUM"
          : "LOW")
  ).toUpperCase();

  return {
    severity: sev as CVE["severity"],
    score,
  };
}

interface RawCveRecord {
  cve: {
    id: string;
    descriptions?: Array<{ lang?: string; value?: string }>;
    metrics?: unknown;
    published?: string;
  };
}

interface CvePayload {
  vulnerabilities: RawCveRecord[];
}

function isCvePayload(value: unknown): value is CvePayload {
  return Boolean(
    value &&
    typeof value === "object" &&
    Array.isArray((value as CvePayload).vulnerabilities) &&
    (value as CvePayload).vulnerabilities.every(
      (entry) =>
        entry !== null &&
        typeof entry === "object" &&
        entry.cve !== null &&
        typeof entry.cve === "object" &&
        typeof entry.cve.id === "string",
    ),
  );
}

const CVE_UNAVAILABLE =
  "CVE refresh failed. Any previously verified vulnerabilities remain displayed.";

export function useCVEs() {
  const setCves = useStore((s) => s.setCves);
  const setCvesLoaded = useStore((s) => s.setCvesLoaded);
  const setCveFetchError = useStore((s) => s.setCveFetchError);
  const addNotification = useStore((s) => s.addNotification);
  const updateFeedStatus = useStore((s) => s.updateFeedStatus);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [cves, setLocalCves] = useState<CVE[]>([]);
  const prevCves = useRef<CVE[]>([]);
  const requestIdRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchCVEs = useCallback(async () => {
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError("");
    setCveFetchError("");
    updateFeedStatus("cves", { lastAttemptAt: Date.now() });
    try {
      // Proxied through Next.js server route — NVD blocks direct browser fetches (CORS)
      const response = await apiFetch("/api/cves", {
        signal: combineFeedAbortSignals(controller.signal, 55000),
      });
      const payload = await readJsonFeedResponse(
        response,
        isCvePayload,
        CVE_UNAVAILABLE,
      );
      if (requestId !== requestIdRef.current) return;

      const raw: CVE[] = payload.vulnerabilities.map((v) => {
        const cve = v.cve;
        const desc =
          cve.descriptions?.find((entry) => entry.lang === "en")?.value ?? "";
        const { severity, score } = parseSeverity(cve.metrics);
        return {
          id: cve.id,
          description: desc.slice(0, 200),
          severity,
          score,
          published: cve.published ?? "",
          url: `https://nvd.nist.gov/vuln/detail/${cve.id}`,
        } satisfies CVE;
      });

      raw.sort(
        (a, b) => (SEV_ORDER[a.severity] ?? 4) - (SEV_ORDER[b.severity] ?? 4),
      );

      // ── Delta sweep: fire threat notifications on CVE spikes ──────────────
      if (prevCves.current.length > 0) {
        const alerts = buildDeltaSweep(
          { cves: prevCves.current },
          { cves: raw },
        );
        alerts.forEach((a) =>
          addNotification({
            type: "threat",
            severity: a.severity,
            title: a.title,
            message: a.message,
            source: a.source,
          }),
        );
      }
      prevCves.current = raw;

      setLocalCves(raw);
      setCves(raw);
      updateFeedStatus("cves", {
        lastSuccessAt: Date.now(),
        lastError: null,
      });
    } catch {
      if (requestId !== requestIdRef.current) return;
      const completedAt = Date.now();
      setError(CVE_UNAVAILABLE);
      setCveFetchError(CVE_UNAVAILABLE);
      updateFeedStatus("cves", {
        lastFailureAt: completedAt,
        lastError: CVE_UNAVAILABLE,
      });
    } finally {
      if (requestId === requestIdRef.current) {
        if (abortControllerRef.current === controller) {
          abortControllerRef.current = null;
        }
        setLoading(false);
        setCvesLoaded(true); // mark done regardless of outcome
      }
    }
  }, [
    setCves,
    setCvesLoaded,
    setCveFetchError,
    addNotification,
    updateFeedStatus,
  ]);

  const cancelCVEs = useCallback(() => {
    requestIdRef.current += 1;
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
  }, []);

  return { fetchCVEs, cancelCVEs, cves, loading, error };
}
