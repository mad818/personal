"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { apiFetch } from "@/lib/apiFetch";
import { useStore } from "@/store/useStore";
import FeedStatusPill from "@/components/ui/FeedStatusPill";
import { SurfaceCallout } from "@/components/ui/surfacePrimitives";
import { useInternetAvailability } from "@/hooks/useInternetAvailability";

// ── FX pairs to display ───────────────────────────────────────────────────────
const FX_PAIRS = [
  { key: "EUR", label: "EUR/USD", invert: true },
  { key: "GBP", label: "GBP/USD", invert: true },
  { key: "JPY", label: "USD/JPY", invert: false },
  { key: "CNY", label: "USD/CNY", invert: false },
  { key: "CHF", label: "USD/CHF", invert: false },
  { key: "CAD", label: "USD/CAD", invert: false },
  { key: "AUD", label: "AUD/USD", invert: true },
];

// ── Precious metals from FX rates ─────────────────────────────────────────────
// open.er-api.com includes XAU, XAG, XPT as currency codes.
// Rate = "how many troy oz per 1 USD" → invert to get USD/troy oz.
const METAL_KEYS = [
  { key: "XAU", label: "Gold", icon: "🥇", unit: "/oz" },
  { key: "XAG", label: "Silver", icon: "⚪", unit: "/oz" },
  { key: "XPT", label: "Platinum", icon: "🔵", unit: "/oz" },
];

// ── Change bar ────────────────────────────────────────────────────────────────
function ChgBar({ chg }: { chg: number }) {
  const capped = Math.max(-3, Math.min(3, chg));
  const isUp = chg >= 0;
  const fillPct = (Math.abs(capped) / 3) * 50;
  const col = isUp ? "#10b981" : "#ef4444";
  return (
    <div
      style={{
        position: "relative",
        width: "60px",
        height: "4px",
        background: "var(--surf3)",
        borderRadius: "2px",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: 0,
          width: "1px",
          height: "100%",
          background: "var(--border2)",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 0,
          height: "100%",
          width: `${fillPct}%`,
          left: isUp ? "50%" : `${50 - fillPct}%`,
          background: col,
          borderRadius: "2px",
        }}
      />
    </div>
  );
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface FXRates {
  [key: string]: number;
}
interface Quote {
  id: string;
  label: string;
  icon: string;
  price: number;
  chg: number;
  unit: string;
}

// ── Main component ────────────────────────────────────────────────────────────
export default function MarketRates() {
  const marketRatesStatus = useStore((s) => s.feedStatus.marketRates);
  const updateFeedStatus = useStore((s) => s.updateFeedStatus);
  const { internetReachable } = useInternetAvailability();

  const [fxRates, setFxRates] = useState<FXRates>({});
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [energyConfigured, setEnergyConfigured] = useState(false);
  const [loading, setLoading] = useState(false);
  const [updatedAt, setUpdatedAt] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Remember previous metal prices between refreshes to derive % change
  const prevMetals = useRef<Record<string, number>>({});
  const hasLocalDataRef = useRef(false);
  const hasFX = Object.keys(fxRates).length > 0;
  const hasQuotes = quotes.length > 0;
  const lastFailureIsNewest =
    Boolean(marketRatesStatus.lastFailureAt) &&
    (marketRatesStatus.lastSuccessAt === null ||
      (marketRatesStatus.lastFailureAt ?? 0) >
        (marketRatesStatus.lastSuccessAt ?? 0));

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    updateFeedStatus("marketRates", {
      lastAttemptAt: Date.now(),
      lastError: null,
    });
    try {
      // ── FX and metals in parallel ──────────────────────────────────────────
      const [fxRes, commoditiesRes] = await Promise.all([
        apiFetch("/api/fx"),
        apiFetch("/api/commodities"),
      ]);
      if (!fxRes.ok || !commoditiesRes.ok) {
        throw new Error("Remote market feeds are unavailable.");
      }
      const fxData = await fxRes.json();
      const commoditiesData = await commoditiesRes.json();
      const rates: FXRates = fxData.rates ?? {};
      setEnergyConfigured(commoditiesData.energyConfigured === true);
      setFxRates(rates);
      if (fxData.time_last_update_utc)
        setUpdatedAt(fxData.time_last_update_utc.slice(0, 16));

      const resolvedQuotes: Quote[] = (commoditiesData.quotes ?? []).map(
        (quote: Quote) => {
          const prev = prevMetals.current[quote.id] ?? quote.price;
          const chg =
            quote.chg !== 0
              ? quote.chg
              : prev !== 0
                ? ((quote.price - prev) / prev) * 100
                : 0;
          prevMetals.current[quote.id] = quote.price;
          return { ...quote, chg };
        },
      );

      setQuotes(resolvedQuotes);
      if (Object.keys(rates).length > 0 || resolvedQuotes.length > 0) {
        updateFeedStatus("marketRates", {
          lastSuccessAt: Date.now(),
          lastError: null,
        });
      } else {
        throw new Error("Could not load market rates.");
      }
    } catch {
      setError(
        hasLocalDataRef.current
          ? null
          : "Could not load FX and commodities right now.",
      );
      updateFeedStatus("marketRates", {
        lastFailureAt: Date.now(),
        lastError: "Could not load FX and commodities right now.",
      });
    } finally {
      setLoading(false);
    }
  }, [updateFeedStatus]);

  useEffect(() => {
    hasLocalDataRef.current = hasFX || hasQuotes;
  }, [hasFX, hasQuotes]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div style={{ marginTop: "18px" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          marginBottom: "14px",
          flexWrap: "wrap",
        }}
      >
        <span
          style={{
            fontSize: "11px",
            fontWeight: 700,
            color: "var(--text3)",
            textTransform: "uppercase",
            letterSpacing: ".6px",
          }}
        >
          💱 FX &amp; Commodities
        </span>
        <FeedStatusPill
          label="Rates"
          status={marketRatesStatus}
          internetReachable={internetReachable}
        />
        {updatedAt && (
          <span style={{ fontSize: "10px", color: "var(--text3)" }}>
            · {updatedAt} UTC
          </span>
        )}
        <button
          onClick={load}
          disabled={loading || !internetReachable}
          style={{
            marginLeft: "auto",
            height: "24px",
            padding: "0 10px",
            borderRadius: "6px",
            background: "transparent",
            border: "1px solid var(--border2)",
            color: "var(--text3)",
            fontSize: "10.5px",
            fontWeight: 700,
            cursor:
              loading || !internetReachable ? "not-allowed" : "pointer",
            opacity: internetReachable ? 1 : 0.65,
          }}
        >
          {loading ? "…" : internetReachable ? "↻ Refresh" : "Offline"}
        </button>
      </div>

      {!internetReachable && marketRatesStatus.lastSuccessAt !== null ? (
        <SurfaceCallout
          tone="info"
          icon="↺"
          title="Internet offline · showing last-known market rates"
          description="FX and commodities refresh is paused until reconnect. The current rates and spot prices remain available locally."
          style={{ marginBottom: "12px" }}
        />
      ) : null}

      {internetReachable && lastFailureIsNewest && (hasFX || hasQuotes) ? (
        <SurfaceCallout
          tone="info"
          icon="!"
          title="Showing last good market snapshot"
          description="The latest rates refresh failed, so this panel is preserving the most recent successful FX and spot-price state."
          style={{ marginBottom: "12px" }}
        />
      ) : null}

      {error && !(hasFX || hasQuotes) ? (
        <SurfaceCallout
          tone="warning"
          icon="!"
          title="FX and commodities feed unavailable"
          description={error}
          style={{ marginBottom: "12px" }}
        />
      ) : null}

      <div
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}
      >
        {/* ── FX panel ── */}
        <div
          style={{
            background: "var(--surf2)",
            border: "1px solid var(--border)",
            borderRadius: "10px",
            padding: "12px 14px",
          }}
        >
          <div
            style={{
              fontSize: "10px",
              fontWeight: 700,
              color: "var(--text3)",
              textTransform: "uppercase",
              letterSpacing: ".5px",
              marginBottom: "10px",
            }}
          >
            FX Rates · USD base
          </div>
          {!hasFX && (
            <div
              style={{
                fontSize: "12px",
                color: "var(--text3)",
                textAlign: "center",
                padding: "20px 0",
              }}
            >
              {loading
                ? "Fetching rates…"
                : "Free FX rates are temporarily unavailable."}
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {FX_PAIRS.map(({ key, label, invert }) => {
              const raw = fxRates[key];
              if (!raw) return null;
              const rate = invert ? 1 / raw : raw;
              return (
                <div
                  key={key}
                  style={{ display: "flex", alignItems: "center", gap: "8px" }}
                >
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: 700,
                      color: "var(--text2)",
                      minWidth: "68px",
                      fontFamily: "monospace",
                    }}
                  >
                    {label}
                  </span>
                  <span
                    style={{
                      fontSize: "13px",
                      fontWeight: 900,
                      fontFamily: "monospace",
                      color: "var(--text)",
                      flex: 1,
                    }}
                  >
                    {rate.toFixed(4)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Commodities panel ── */}
        <div
          style={{
            background: "var(--surf2)",
            border: "1px solid var(--border)",
            borderRadius: "10px",
            padding: "12px 14px",
          }}
        >
          <div
            style={{
              fontSize: "10px",
              fontWeight: 700,
              color: "var(--text3)",
              textTransform: "uppercase",
              letterSpacing: ".5px",
              marginBottom: "10px",
            }}
          >
            Spot Prices
            {energyConfigured ? " · Metals + Energy" : " · Precious Metals"}
          </div>
          {!hasQuotes && (
            <div
              style={{
                fontSize: "11px",
                color: "var(--text3)",
                textAlign: "center",
                padding: "16px 0",
              }}
            >
              {loading
                ? "Fetching prices…"
                : "Free spot feeds are temporarily unavailable."}
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
            {quotes.map((q) => {
              const col = q.chg >= 0 ? "#10b981" : "#ef4444";
              return (
                <div
                  key={q.id}
                  style={{ display: "flex", alignItems: "center", gap: "8px" }}
                >
                  <span style={{ fontSize: "13px", flexShrink: 0 }}>
                    {q.icon}
                  </span>
                  <span
                    style={{
                      fontSize: "11px",
                      color: "var(--text2)",
                      fontWeight: 600,
                      minWidth: "60px",
                    }}
                  >
                    {q.label}
                  </span>
                  <span
                    style={{
                      fontSize: "12px",
                      fontWeight: 900,
                      fontFamily: "monospace",
                      color: "var(--text)",
                      flex: 1,
                    }}
                  >
                    $
                    {q.price < 10
                      ? q.price.toFixed(3)
                      : q.price < 100
                        ? q.price.toFixed(2)
                        : Math.round(q.price).toLocaleString()}
                    <span
                      style={{
                        fontSize: "9px",
                        color: "var(--text3)",
                        fontWeight: 400,
                      }}
                    >
                      {q.unit}
                    </span>
                  </span>
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: 700,
                      fontFamily: "monospace",
                      color: col,
                      minWidth: "46px",
                      textAlign: "right",
                    }}
                  >
                    {q.chg !== 0
                      ? `${q.chg >= 0 ? "+" : ""}${q.chg.toFixed(2)}%`
                      : "—"}
                  </span>
                  {q.chg !== 0 && <ChgBar chg={q.chg} />}
                </div>
              );
            })}
          </div>
          {!energyConfigured && hasQuotes && (
            <div
              style={{
                fontSize: "10px",
                color: "var(--text3)",
                marginTop: "10px",
                borderTop: "1px solid var(--border)",
                paddingTop: "8px",
              }}
            >
              Add a FRED key in Settings to also see WTI, Brent &amp; Nat Gas
              through the local commodities connector.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
