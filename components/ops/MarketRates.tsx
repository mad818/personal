"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { apiFetch } from "@/lib/apiFetch";
import {
  isCommodityRatesSuccess,
  isFxRatesSuccess,
  type CommoditySources,
  type FxRatesSuccess,
  type MarketQuote,
} from "@/lib/marketRatesTypes";

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
const FX_UNAVAILABLE = "FX rates are temporarily unavailable.";
const COMMODITIES_UNAVAILABLE = "Commodity rates are temporarily unavailable.";

function formatUpdatedAt(value: string) {
  return value.slice(0, 16).replace("T", " ");
}

async function fetchFxSnapshot(): Promise<FxRatesSuccess> {
  try {
    const response = await apiFetch("/api/fx", { cache: "no-store" });
    const payload: unknown = await response.json();
    if (!response.ok || !isFxRatesSuccess(payload)) {
      throw new Error(FX_UNAVAILABLE);
    }
    return payload;
  } catch {
    throw new Error(FX_UNAVAILABLE);
  }
}

async function fetchCommoditySnapshot() {
  try {
    const response = await apiFetch("/api/commodities", {
      cache: "no-store",
    });
    const payload: unknown = await response.json();
    if (!response.ok || !isCommodityRatesSuccess(payload)) {
      throw new Error(COMMODITIES_UNAVAILABLE);
    }
    return payload;
  } catch {
    throw new Error(COMMODITIES_UNAVAILABLE);
  }
}

function commoditySourceNotice(
  sources: CommoditySources,
  energyConfigured: boolean | null,
) {
  const messages: string[] = [];
  if (sources.metals === "partial")
    messages.push("Some metal quotes are unavailable.");
  if (sources.metals === "unavailable")
    messages.push("Metal quotes are unavailable.");
  if (energyConfigured && sources.energy === "partial") {
    messages.push("Some FRED energy series are unavailable.");
  }
  if (energyConfigured && sources.energy === "unavailable") {
    messages.push("FRED energy quotes are unavailable.");
  }
  return messages.join(" ");
}

// ── Main component ────────────────────────────────────────────────────────────
export default function MarketRates() {
  const [fxRates, setFxRates] = useState<FXRates>({});
  const [quotes, setQuotes] = useState<MarketQuote[]>([]);
  const [loading, setLoading] = useState(false);
  const [updatedAt, setUpdatedAt] = useState("");
  const [fxError, setFxError] = useState("");
  const [commodityError, setCommodityError] = useState("");
  const [commoditySources, setCommoditySources] = useState<CommoditySources>({
    metals: "unavailable",
    energy: "unconfigured",
  });
  const [energyConfigured, setEnergyConfigured] = useState<boolean | null>(
    null,
  );
  const requestIdRef = useRef(0);

  const load = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    const [fxResult, commodityResult] = await Promise.allSettled([
      fetchFxSnapshot(),
      fetchCommoditySnapshot(),
    ]);
    if (requestId !== requestIdRef.current) return;

    if (fxResult.status === "fulfilled") {
      setFxRates(fxResult.value.rates);
      setUpdatedAt(formatUpdatedAt(fxResult.value.updatedAt));
      setFxError("");
    } else {
      setFxError(FX_UNAVAILABLE);
    }
    if (commodityResult.status === "fulfilled") {
      setQuotes(commodityResult.value.quotes);
      setCommoditySources(commodityResult.value.sources);
      setEnergyConfigured(commodityResult.value.energyConfigured);
      setCommodityError("");
    } else {
      setCommodityError(COMMODITIES_UNAVAILABLE);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
    return () => {
      requestIdRef.current += 1;
    };
  }, [load]);

  const hasFX = Object.keys(fxRates).length > 0;
  const hasQuotes = quotes.length > 0;
  const sourceNotice = commoditySourceNotice(
    commoditySources,
    energyConfigured,
  );

  return (
    <div style={{ marginTop: "18px" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          marginBottom: "14px",
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
        {updatedAt && (
          <span style={{ fontSize: "10px", color: "var(--text3)" }}>
            · {updatedAt} UTC
          </span>
        )}
        {loading && (
          <span
            role="status"
            style={{ fontSize: "10px", color: "var(--text3)" }}
          >
            Refreshing verified rates…
          </span>
        )}
        <button
          aria-label="Refresh FX and commodity rates"
          onClick={() => void load()}
          disabled={loading}
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
            cursor: "pointer",
          }}
        >
          {loading ? "…" : "↻ Refresh"}
        </button>
      </div>

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
              role={fxError ? "alert" : "status"}
              style={{
                fontSize: "12px",
                color: "var(--text3)",
                textAlign: "center",
                padding: "20px 0",
              }}
            >
              {loading
                ? "Fetching rates…"
                : fxError || "No verified FX rates are available yet."}
            </div>
          )}
          {hasFX && fxError && (
            <div
              role="alert"
              style={{
                fontSize: "10px",
                color: "var(--fmd)",
                marginBottom: "8px",
              }}
            >
              FX refresh failed; showing the last verified rates.
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
              role={commodityError ? "alert" : "status"}
              style={{
                fontSize: "11px",
                color: "var(--text3)",
                textAlign: "center",
                padding: "16px 0",
              }}
            >
              {loading
                ? "Fetching prices…"
                : commodityError ||
                  "No verified commodity rates are available yet."}
            </div>
          )}
          {hasQuotes && commodityError && (
            <div
              role="alert"
              style={{
                fontSize: "10px",
                color: "var(--fmd)",
                marginBottom: "8px",
              }}
            >
              Commodity refresh failed; showing the last verified quotes.
            </div>
          )}
          {hasQuotes && !commodityError && sourceNotice && (
            <div
              role="alert"
              style={{
                fontSize: "10px",
                color: "var(--fmd)",
                marginBottom: "8px",
              }}
            >
              {sourceNotice} Other displayed quotes are verified.
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
          {energyConfigured === false && hasQuotes && (
            <div
              style={{
                fontSize: "10px",
                color: "var(--text3)",
                marginTop: "10px",
                borderTop: "1px solid var(--border)",
                paddingTop: "8px",
              }}
            >
              Add a FRED key in Settings to also see WTI, Brent &amp; Nat Gas.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
