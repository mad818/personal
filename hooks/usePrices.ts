"use client";

import { useCallback, useRef, useState } from "react";
import { apiFetch } from "@/lib/apiFetch";
import {
  isPriceMarketsSuccess,
  isPriceSparklinesSuccess,
  type PriceMarketsSuccess,
  type PriceSparklinesSuccess,
} from "@/lib/coreMarketFeedTypes";
import { buildDeltaSweep } from "@/lib/liveContext";
import { useStore, type PriceData } from "@/store/useStore";

export const DEFAULT_COINS = [
  "bitcoin",
  "ethereum",
  "solana",
  "binancecoin",
  "ripple",
  "cardano",
  "avalanche-2",
  "polkadot",
  "chainlink",
  "uniswap",
];

const DEFAULT_SYM: Record<string, string> = {
  bitcoin: "BTC",
  ethereum: "ETH",
  solana: "SOL",
  binancecoin: "BNB",
  ripple: "XRP",
  cardano: "ADA",
  "avalanche-2": "AVAX",
  polkadot: "DOT",
  chainlink: "LINK",
  uniswap: "UNI",
};

const PRICE_FEED_UNAVAILABLE =
  "Price feed refresh failed. Any previously verified prices remain displayed.";
const PRICE_CHARTS_UNAVAILABLE =
  "Live prices refreshed, but chart history is temporarily unavailable.";

async function fetchMarketPrices(
  coinsParam: string,
): Promise<PriceMarketsSuccess> {
  const response = await apiFetch(
    `/api/prices?mode=markets&coins=${encodeURIComponent(coinsParam)}`,
    { signal: AbortSignal.timeout(12_000) },
  );
  const payload: unknown = await response.json();
  if (!response.ok || !isPriceMarketsSuccess(payload)) {
    throw new Error(PRICE_FEED_UNAVAILABLE);
  }
  return payload;
}

async function fetchPriceSparklines(
  coinsParam: string,
): Promise<PriceSparklinesSuccess> {
  const response = await apiFetch(
    `/api/prices?mode=sparklines&coins=${encodeURIComponent(coinsParam)}`,
    { signal: AbortSignal.timeout(12_000) },
  );
  const payload: unknown = await response.json();
  if (!response.ok || !isPriceSparklinesSuccess(payload)) {
    throw new Error(PRICE_CHARTS_UNAVAILABLE);
  }
  return payload;
}

export function usePrices() {
  const setPrices = useStore((state) => state.setPrices);
  const setPricesLoaded = useStore((state) => state.setPricesLoaded);
  const setSparklines = useStore((state) => state.setSparklines);
  const addNotification = useStore((state) => state.addNotification);
  const updateFeedStatus = useStore((state) => state.updateFeedStatus);
  const watchlist = useStore((state) => state.settings.watchlist);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevPrices = useRef<Record<string, PriceData>>({});
  const onVisibleRef = useRef<(() => void) | null>(null);
  const requestIdRef = useRef(0);

  const fetchPrices = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError("");
    updateFeedStatus("prices", { lastAttemptAt: Date.now() });

    const coins = Array.from(
      new Set([...DEFAULT_COINS, ...(watchlist ?? [])]),
    ).slice(0, 25);
    const coinsParam = coins.join(",");
    const [marketResult, sparklineResult] = await Promise.allSettled([
      fetchMarketPrices(coinsParam),
      fetchPriceSparklines(coinsParam),
    ]);
    if (requestId !== requestIdRef.current) return;

    const completedAt = Date.now();
    let nextError = "";

    if (marketResult.status === "fulfilled") {
      const prices: Record<string, PriceData> = {};
      for (const record of marketResult.value.records) {
        prices[record.id] = {
          price: record.price,
          chg: record.change24h,
          sym: DEFAULT_SYM[record.id] ?? record.symbol.toUpperCase(),
          mcap: record.marketCap,
          vol: record.totalVolume,
        };
      }

      if (Object.keys(prevPrices.current).length > 0) {
        const alerts = buildDeltaSweep(
          { prices: prevPrices.current },
          { prices },
        );
        alerts.forEach((alert) =>
          addNotification({
            type: alert.type === "market" ? "market" : "intel",
            severity: alert.severity,
            title: alert.title,
            message: alert.message,
            source: alert.source,
          }),
        );
      }
      prevPrices.current = prices;
      setPrices(prices);
    } else {
      nextError = PRICE_FEED_UNAVAILABLE;
    }

    if (sparklineResult.status === "fulfilled") {
      const sparklines: Record<string, number[]> = {};
      for (const record of sparklineResult.value.records) {
        sparklines[record.id] = record.prices;
      }
      setSparklines(sparklines);
    } else if (!nextError) {
      nextError = PRICE_CHARTS_UNAVAILABLE;
    }

    if (nextError) {
      setError(nextError);
      updateFeedStatus("prices", {
        ...(marketResult.status === "fulfilled"
          ? { lastSuccessAt: completedAt }
          : {}),
        lastFailureAt: completedAt,
        lastError: nextError,
      });
    } else {
      updateFeedStatus("prices", {
        lastSuccessAt: completedAt,
        lastError: null,
      });
    }
    setPricesLoaded(true);
    setLoading(false);
  }, [
    addNotification,
    setPrices,
    setPricesLoaded,
    setSparklines,
    updateFeedStatus,
    watchlist,
  ]);

  const start = useCallback(
    (intervalMs = 60_000) => {
      void fetchPrices();
      timerRef.current = setInterval(() => {
        if (typeof document !== "undefined" && document.hidden) return;
        void fetchPrices();
      }, intervalMs);

      const onVisible = () => {
        if (!document.hidden) void fetchPrices();
      };
      onVisibleRef.current = onVisible;
      document.addEventListener("visibilitychange", onVisible);
    },
    [fetchPrices],
  );

  const stop = useCallback(() => {
    requestIdRef.current += 1;
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (onVisibleRef.current) {
      document.removeEventListener("visibilitychange", onVisibleRef.current);
      onVisibleRef.current = null;
    }
  }, []);

  return { fetchPrices, start, stop, loading, error };
}
