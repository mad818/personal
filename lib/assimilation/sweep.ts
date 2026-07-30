import type {
  SweepBundle,
  SweepSeverity,
  SweepSourceResult,
  SweepTheater,
} from "@/lib/assimilation/types";
import { fetchTrustedInternal } from "@/lib/internalFetch";

interface SweepSourceDef {
  id: string;
  label: string;
  endpoint: string;
}

const SWEEP_SOURCES: Record<SweepTheater, SweepSourceDef[]> = {
  markets: [
    { id: "prices", label: "Prices", endpoint: "/api/prices" },
    { id: "fear-greed", label: "Fear & Greed", endpoint: "/api/fear-greed" },
    { id: "defi", label: "DeFi", endpoint: "/api/defi" },
    { id: "metals", label: "Metals", endpoint: "/api/metals" },
  ],
  cyber: [
    { id: "cves", label: "CVEs", endpoint: "/api/cves" },
    { id: "cisa-kev", label: "CISA KEV", endpoint: "/api/cisa-kev" },
    {
      id: "threat-intel",
      label: "Threat Intel",
      endpoint: "/api/threat-intel",
    },
    { id: "news", label: "Cyber news", endpoint: "/api/news" },
  ],
  geopolitics: [
    { id: "news", label: "Signal news", endpoint: "/api/news" },
    { id: "conflict", label: "Conflict", endpoint: "/api/conflict" },
    { id: "flights", label: "Flights", endpoint: "/api/flights" },
    { id: "fires", label: "Fires", endpoint: "/api/fires" },
  ],
  "air-sea": [
    { id: "flights", label: "Flights", endpoint: "/api/flights" },
    { id: "maritime", label: "Maritime", endpoint: "/api/maritime" },
    { id: "weather", label: "Weather", endpoint: "/api/weather" },
  ],
  infra: [
    { id: "cves", label: "CVEs", endpoint: "/api/cves" },
    {
      id: "threat-intel",
      label: "Threat Intel",
      endpoint: "/api/threat-intel",
    },
    { id: "sec-filings", label: "SEC", endpoint: "/api/sec-filings" },
    { id: "earthquakes", label: "Earthquakes", endpoint: "/api/earthquakes" },
  ],
  watchlist: [
    { id: "prices", label: "Prices", endpoint: "/api/prices" },
    { id: "news", label: "News", endpoint: "/api/news" },
    { id: "sec-filings", label: "SEC", endpoint: "/api/sec-filings" },
  ],
};

function buildBaseUrl(reqUrl: string): string {
  const url = new URL(reqUrl);
  return `${url.protocol}//${url.host}`;
}

function measureCount(payload: unknown): number {
  if (Array.isArray(payload)) return payload.length;
  if (payload && typeof payload === "object") {
    if (Array.isArray((payload as { articles?: unknown[] }).articles)) {
      return (payload as { articles: unknown[] }).articles.length;
    }
    if (Array.isArray((payload as { history?: unknown[] }).history)) {
      return (payload as { history: unknown[] }).history.length;
    }
    const values = Object.values(payload as Record<string, unknown>);
    const arrayValue = values.find((value) => Array.isArray(value));
    if (Array.isArray(arrayValue)) return arrayValue.length;
    return values.length;
  }
  return 0;
}

function summarizePayload(label: string, payload: unknown): string {
  const count = measureCount(payload);
  if (count === 0) return `${label} responded with status only.`;
  return `${label} returned ${count} tracked records.`;
}

function severityFromResults(results: SweepSourceResult[]): SweepSeverity {
  const hasError = results.some((result) => result.status === "error");
  const total = results.reduce((sum, result) => sum + result.count, 0);
  if (hasError || total >= 60) return "high";
  if (total >= 20) return "medium";
  return "low";
}

async function runSingleSource(
  source: SweepSourceDef,
  origin?: string,
): Promise<SweepSourceResult> {
  const startedAt = Date.now();
  try {
    const response = await fetchTrustedInternal(source.endpoint, {
      origin,
      cache: "no-store",
    });
    if (!response.ok) {
      return {
        id: source.id,
        label: source.label,
        endpoint: source.endpoint,
        status: "error",
        durationMs: Date.now() - startedAt,
        count: 0,
        summary: `${source.label} returned HTTP ${response.status}.`,
      };
    }
    const payload = (await response.json()) as unknown;
    return {
      id: source.id,
      label: source.label,
      endpoint: source.endpoint,
      status: "ok",
      durationMs: Date.now() - startedAt,
      count: measureCount(payload),
      summary: summarizePayload(source.label, payload),
    };
  } catch (error) {
    return {
      id: source.id,
      label: source.label,
      endpoint: source.endpoint,
      status: "error",
      durationMs: Date.now() - startedAt,
      count: 0,
      summary:
        error instanceof Error
          ? error.message
          : `${source.label} sweep failed.`,
    };
  }
}

export function getSweepSources(theater: SweepTheater): SweepSourceDef[] {
  return SWEEP_SOURCES[theater];
}

export async function performSweepBundle(
  reqUrl: string,
  theater: SweepTheater,
): Promise<SweepBundle> {
  const baseUrl = buildBaseUrl(reqUrl);
  const startedAt = new Date().toISOString();
  const sources = await Promise.all(
    getSweepSources(theater).map((source) => runSingleSource(source, baseUrl)),
  );
  const severity = severityFromResults(sources);
  const completedAt = new Date().toISOString();
  const totalCount = sources.reduce((sum, source) => sum + source.count, 0);

  return {
    id: `sweep-${theater}-${Date.now()}`,
    theater,
    startedAt,
    completedAt,
    severity,
    summary: `${theater.toUpperCase()} sweep completed with ${sources.filter((item) => item.status === "ok").length}/${sources.length} successful sources and ${totalCount} collected records.`,
    sources,
  };
}
