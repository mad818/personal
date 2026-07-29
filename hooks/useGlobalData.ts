// ── hooks/useGlobalData ─────────────────────────────────────
// Hook for coordinating global data fetches across all data sources.

"use client";

import { useCallback, useRef, useState } from "react";
import { apiFetch } from "@/lib/apiFetch";
import {
  combineFeedAbortSignals,
  readJsonFeedResponse,
} from "@/lib/liveFeedReliability";
import {
  useStore,
  type DefiData,
  type FeedStatusKey,
  type GeoRecord,
  type ThreatIntel,
  type WeatherData,
} from "@/store/useStore";

type GlobalFeedKey =
  | "earthquakes"
  | "gdelt"
  | "threatIntel"
  | "weather"
  | "defi"
  | "hackerNews"
  | "secFilings";

interface EarthquakePayload {
  earthquakes: GeoRecord[];
}

interface GdeltPayload {
  articles: GeoRecord[];
}

interface ThreatIntelPayload {
  threatfox?: GeoRecord[];
  iocs?: GeoRecord[];
  shodan?: GeoRecord | null;
  sources: { threatfox?: string };
}

interface WeatherPayload extends WeatherData {
  hourly: GeoRecord[];
  daily: GeoRecord[];
}

interface DefiPayload {
  protocols: GeoRecord[];
}

interface HackerNewsPayload {
  stories: GeoRecord[];
}

interface SecFilingsPayload {
  filings: GeoRecord[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function hasArray(value: unknown, field: string): boolean {
  return isRecord(value) && Array.isArray(value[field]);
}

function isEarthquakePayload(value: unknown): value is EarthquakePayload {
  return hasArray(value, "earthquakes");
}

function isGdeltPayload(value: unknown): value is GdeltPayload {
  return hasArray(value, "articles");
}

function isThreatIntelPayload(value: unknown): value is ThreatIntelPayload {
  if (!isRecord(value) || !isRecord(value.sources)) return false;
  const threatfox = value.threatfox ?? value.iocs;
  return Array.isArray(threatfox);
}

function isWeatherPayload(value: unknown): value is WeatherPayload {
  return hasArray(value, "hourly") && hasArray(value, "daily");
}

function isDefiPayload(value: unknown): value is DefiPayload {
  return hasArray(value, "protocols");
}

function isHackerNewsPayload(value: unknown): value is HackerNewsPayload {
  return hasArray(value, "stories");
}

function isSecFilingsPayload(value: unknown): value is SecFilingsPayload {
  return hasArray(value, "filings");
}

const FEED_ERRORS: Record<GlobalFeedKey, string> = {
  earthquakes:
    "Earthquake refresh failed. Previously verified events remain displayed.",
  gdelt:
    "Global event refresh failed. Previously verified events remain displayed.",
  threatIntel:
    "Threat intelligence refresh failed. Previously verified indicators remain displayed.",
  weather:
    "Weather refresh failed. Previously verified conditions remain displayed.",
  defi: "DeFi refresh failed. Previously verified protocols remain displayed.",
  hackerNews:
    "Hacker News refresh failed. Previously verified stories remain displayed.",
  secFilings:
    "SEC refresh failed. Previously verified filings remain displayed.",
};

export function useGlobalData() {
  const [loading, setLoading] = useState(false);
  const controllerRef = useRef<AbortController | null>(null);
  const batchIdRef = useRef(0);
  const requestIdsRef = useRef<Record<GlobalFeedKey, number>>({
    earthquakes: 0,
    gdelt: 0,
    threatIntel: 0,
    weather: 0,
    defi: 0,
    hackerNews: 0,
    secFilings: 0,
  });

  const setEarthquakes = useStore((state) => state.setEarthquakes);
  const setGdeltEvents = useStore((state) => state.setGdeltEvents);
  const setThreatIntel = useStore((state) => state.setThreatIntel);
  const setThreatIntelLoaded = useStore((state) => state.setThreatIntelLoaded);
  const setWeather = useStore((state) => state.setWeather);
  const setDefiData = useStore((state) => state.setDefiData);
  const setHackerNews = useStore((state) => state.setHackerNews);
  const setSecFilings = useStore((state) => state.setSecFilings);
  const updateFeedStatus = useStore((state) => state.updateFeedStatus);

  const startFeedRequest = useCallback((feed: GlobalFeedKey) => {
    requestIdsRef.current[feed] += 1;
    return requestIdsRef.current[feed];
  }, []);

  const isLatestFeedRequest = useCallback(
    (feed: GlobalFeedKey, requestId: number) =>
      requestIdsRef.current[feed] === requestId,
    [],
  );

  const markAttempt = useCallback(
    (feed: FeedStatusKey) => {
      updateFeedStatus(feed, { lastAttemptAt: Date.now() });
    },
    [updateFeedStatus],
  );

  const markSuccess = useCallback(
    (feed: FeedStatusKey) => {
      updateFeedStatus(feed, {
        lastSuccessAt: Date.now(),
        lastError: null,
      });
    },
    [updateFeedStatus],
  );

  const markFailure = useCallback(
    (feed: FeedStatusKey, message: string) => {
      updateFeedStatus(feed, {
        lastFailureAt: Date.now(),
        lastError: message,
      });
    },
    [updateFeedStatus],
  );

  const fetchEarthquakes = useCallback(
    async (parentSignal?: AbortSignal) => {
      const feed: GlobalFeedKey = "earthquakes";
      const requestId = startFeedRequest(feed);
      markAttempt(feed);
      try {
        const response = await apiFetch("/api/earthquakes", {
          signal: combineFeedAbortSignals(parentSignal, 10_000),
        });
        const payload = await readJsonFeedResponse(
          response,
          isEarthquakePayload,
          FEED_ERRORS[feed],
        );
        if (!isLatestFeedRequest(feed, requestId)) return;
        setEarthquakes(payload.earthquakes);
        markSuccess(feed);
      } catch {
        if (parentSignal?.aborted || !isLatestFeedRequest(feed, requestId))
          return;
        markFailure(feed, FEED_ERRORS[feed]);
      }
    },
    [
      isLatestFeedRequest,
      markAttempt,
      markFailure,
      markSuccess,
      setEarthquakes,
      startFeedRequest,
    ],
  );

  const fetchGdelt = useCallback(
    async (parentSignal?: AbortSignal) => {
      const feed: GlobalFeedKey = "gdelt";
      const requestId = startFeedRequest(feed);
      markAttempt(feed);
      try {
        const response = await apiFetch(
          "/api/gdelt?query=conflict+OR+crisis&timespan=24H",
          { signal: combineFeedAbortSignals(parentSignal, 15_000) },
        );
        const payload = await readJsonFeedResponse(
          response,
          isGdeltPayload,
          FEED_ERRORS[feed],
        );
        if (!isLatestFeedRequest(feed, requestId)) return;
        setGdeltEvents(payload.articles);
        markSuccess(feed);
      } catch {
        if (parentSignal?.aborted || !isLatestFeedRequest(feed, requestId))
          return;
        markFailure(feed, FEED_ERRORS[feed]);
      }
    },
    [
      isLatestFeedRequest,
      markAttempt,
      markFailure,
      markSuccess,
      setGdeltEvents,
      startFeedRequest,
    ],
  );

  const fetchThreatIntel = useCallback(
    async (parentSignal?: AbortSignal) => {
      const feed: GlobalFeedKey = "threatIntel";
      const requestId = startFeedRequest(feed);
      markAttempt(feed);
      try {
        const response = await apiFetch("/api/threat-intel", {
          signal: combineFeedAbortSignals(parentSignal, 10_000),
        });
        const payload = await readJsonFeedResponse(
          response,
          isThreatIntelPayload,
          FEED_ERRORS[feed],
        );
        if (payload.sources.threatfox !== "ok") {
          throw new Error(FEED_ERRORS[feed]);
        }
        if (!isLatestFeedRequest(feed, requestId)) return;
        const threatIntel: ThreatIntel = {
          threatfox: payload.threatfox ?? payload.iocs ?? [],
          shodan: payload.shodan ?? null,
        };
        setThreatIntel(threatIntel);
        markSuccess(feed);
      } catch {
        if (parentSignal?.aborted || !isLatestFeedRequest(feed, requestId))
          return;
        markFailure(feed, FEED_ERRORS[feed]);
      } finally {
        if (!parentSignal?.aborted && isLatestFeedRequest(feed, requestId)) {
          setThreatIntelLoaded(true);
        }
      }
    },
    [
      isLatestFeedRequest,
      markAttempt,
      markFailure,
      markSuccess,
      setThreatIntel,
      setThreatIntelLoaded,
      startFeedRequest,
    ],
  );

  const fetchWeather = useCallback(
    async (parentSignal?: AbortSignal) => {
      const feed: GlobalFeedKey = "weather";
      const requestId = startFeedRequest(feed);
      markAttempt(feed);
      try {
        const response = await apiFetch("/api/weather", {
          signal: combineFeedAbortSignals(parentSignal, 10_000),
        });
        const payload = await readJsonFeedResponse(
          response,
          isWeatherPayload,
          FEED_ERRORS[feed],
        );
        if (!isLatestFeedRequest(feed, requestId)) return;
        setWeather(payload);
        markSuccess(feed);
      } catch {
        if (parentSignal?.aborted || !isLatestFeedRequest(feed, requestId))
          return;
        markFailure(feed, FEED_ERRORS[feed]);
      }
    },
    [
      isLatestFeedRequest,
      markAttempt,
      markFailure,
      markSuccess,
      setWeather,
      startFeedRequest,
    ],
  );

  const fetchDefi = useCallback(
    async (parentSignal?: AbortSignal) => {
      const feed: GlobalFeedKey = "defi";
      const requestId = startFeedRequest(feed);
      markAttempt(feed);
      try {
        const response = await apiFetch("/api/defi?type=tvl", {
          signal: combineFeedAbortSignals(parentSignal, 10_000),
        });
        const payload = await readJsonFeedResponse(
          response,
          isDefiPayload,
          FEED_ERRORS[feed],
        );
        if (!isLatestFeedRequest(feed, requestId)) return;
        const defiData: DefiData = {
          protocols: payload.protocols,
          stablecoins: [],
          yields: [],
        };
        setDefiData(defiData);
        markSuccess(feed);
      } catch {
        if (parentSignal?.aborted || !isLatestFeedRequest(feed, requestId))
          return;
        markFailure(feed, FEED_ERRORS[feed]);
      }
    },
    [
      isLatestFeedRequest,
      markAttempt,
      markFailure,
      markSuccess,
      setDefiData,
      startFeedRequest,
    ],
  );

  const fetchHackerNews = useCallback(
    async (parentSignal?: AbortSignal) => {
      const feed: GlobalFeedKey = "hackerNews";
      const requestId = startFeedRequest(feed);
      markAttempt(feed);
      try {
        const response = await apiFetch("/api/hacker-news?type=top", {
          signal: combineFeedAbortSignals(parentSignal, 10_000),
        });
        const payload = await readJsonFeedResponse(
          response,
          isHackerNewsPayload,
          FEED_ERRORS[feed],
        );
        if (!isLatestFeedRequest(feed, requestId)) return;
        setHackerNews(payload.stories);
        markSuccess(feed);
      } catch {
        if (parentSignal?.aborted || !isLatestFeedRequest(feed, requestId))
          return;
        markFailure(feed, FEED_ERRORS[feed]);
      }
    },
    [
      isLatestFeedRequest,
      markAttempt,
      markFailure,
      markSuccess,
      setHackerNews,
      startFeedRequest,
    ],
  );

  const fetchSecFilings = useCallback(
    async (parentSignal?: AbortSignal) => {
      const feed: GlobalFeedKey = "secFilings";
      const requestId = startFeedRequest(feed);
      markAttempt(feed);
      try {
        const response = await apiFetch("/api/sec-filings?query=10-K", {
          signal: combineFeedAbortSignals(parentSignal, 10_000),
        });
        const payload = await readJsonFeedResponse(
          response,
          isSecFilingsPayload,
          FEED_ERRORS[feed],
        );
        if (!isLatestFeedRequest(feed, requestId)) return;
        setSecFilings(payload.filings);
        markSuccess(feed);
      } catch {
        if (parentSignal?.aborted || !isLatestFeedRequest(feed, requestId))
          return;
        markFailure(feed, FEED_ERRORS[feed]);
      }
    },
    [
      isLatestFeedRequest,
      markAttempt,
      markFailure,
      markSuccess,
      setSecFilings,
      startFeedRequest,
    ],
  );

  const fetchAll = useCallback(async () => {
    if (typeof document !== "undefined" && document.hidden) return;

    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    const batchId = ++batchIdRef.current;

    setLoading(true);
    await Promise.allSettled([
      fetchEarthquakes(controller.signal),
      fetchGdelt(controller.signal),
      fetchThreatIntel(controller.signal),
      fetchWeather(controller.signal),
      fetchDefi(controller.signal),
      fetchHackerNews(controller.signal),
      fetchSecFilings(controller.signal),
    ]);
    if (batchId === batchIdRef.current) setLoading(false);
  }, [
    fetchDefi,
    fetchEarthquakes,
    fetchGdelt,
    fetchHackerNews,
    fetchSecFilings,
    fetchThreatIntel,
    fetchWeather,
  ]);

  const cancelAll = useCallback(() => {
    batchIdRef.current += 1;
    controllerRef.current?.abort();
    controllerRef.current = null;
    setLoading(false);
  }, []);

  return {
    fetchAll,
    cancelAll,
    fetchEarthquakes,
    fetchGdelt,
    fetchThreatIntel,
    fetchWeather,
    fetchDefi,
    fetchHackerNews,
    fetchSecFilings,
    loading,
  };
}
