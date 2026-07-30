// ── components/intel/PolymarketFeed ────────────────────────
// Prediction market odds feed — sort, search, summary bar, bracket labels.

"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { apiFetch } from "@/lib/apiFetch";
import {
  isPredictionMarketsSuccess,
  type VerifiedPredictionMarket as Market,
} from "@/lib/coreMarketFeedTypes";
import { useStore } from "@/store/useStore";

type SortKey = "prob_hi" | "prob_lo" | "volume" | "closing";
const PREDICTIONS_UNAVAILABLE =
  "Prediction markets are temporarily unavailable.";

function bracketLabel(p: number): { label: string; color: string } {
  if (p >= 80 || p <= 20) return { label: "Extreme", color: "#ef4444" };
  if (p >= 65 || p <= 35) return { label: "Leaning", color: "#f59e0b" };
  return { label: "Contested", color: "#6b7280" };
}

function daysUntil(dateStr: string): number | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return Math.ceil((d.getTime() - Date.now()) / 86_400_000);
}

function fmtVol(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}

function SummaryBar({ markets }: { markets: Market[] }) {
  if (!markets.length) return null;
  const extreme = markets.filter(
    (m) => m.probability >= 80 || m.probability <= 20,
  ).length;
  const leaning = markets.filter(
    (m) =>
      (m.probability >= 65 && m.probability < 80) ||
      (m.probability > 20 && m.probability <= 35),
  ).length;
  const contested = markets.length - extreme - leaning;
  const avgVol = markets.reduce((s, m) => s + m.volume, 0) / markets.length;

  const chip = (label: string, val: string | number, color: string) => (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        background: "var(--surf2)",
        border: "1px solid var(--border)",
        borderRadius: "8px",
        padding: "7px 12px",
        minWidth: "70px",
      }}
    >
      <span style={{ fontSize: "16px", fontWeight: 900, color }}>{val}</span>
      <span
        style={{
          fontSize: "9px",
          color: "var(--text3)",
          textTransform: "uppercase",
          letterSpacing: ".06em",
          marginTop: "2px",
        }}
      >
        {label}
      </span>
    </div>
  );

  return (
    <div
      style={{
        display: "flex",
        gap: "6px",
        flexWrap: "wrap",
        marginBottom: "14px",
      }}
    >
      {chip("Total", markets.length, "var(--text)")}
      {chip("Extreme", extreme, "#ef4444")}
      {chip("Leaning", leaning, "#f59e0b")}
      {chip("Contested", contested, "#6b7280")}
      {chip("Avg Vol", fmtVol(avgVol), "var(--text2)")}
    </div>
  );
}

export default function PolymarketFeed() {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sort, setSort] = useState<SortKey>("prob_hi");
  const [search, setSearch] = useState("");
  const updateFeedStatus = useStore((state) => state.updateFeedStatus);
  const requestIdRef = useRef(0);

  const load = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    updateFeedStatus("polymarket", { lastAttemptAt: Date.now() });
    try {
      const response = await apiFetch("/api/polymarket", {
        cache: "no-store",
      });
      const payload: unknown = await response.json();
      if (!response.ok || !isPredictionMarketsSuccess(payload)) {
        throw new Error(PREDICTIONS_UNAVAILABLE);
      }
      if (requestId !== requestIdRef.current) return;
      const completedAt = Date.now();
      setMarkets(payload.markets);
      setError("");
      updateFeedStatus("polymarket", {
        lastSuccessAt: completedAt,
        lastError: null,
      });
    } catch {
      if (requestId !== requestIdRef.current) return;
      const completedAt = Date.now();
      setError(PREDICTIONS_UNAVAILABLE);
      updateFeedStatus("polymarket", {
        lastFailureAt: completedAt,
        lastError: PREDICTIONS_UNAVAILABLE,
      });
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [updateFeedStatus]);

  useEffect(() => {
    void load();
    return () => {
      requestIdRef.current += 1;
    };
  }, [load]);

  const query = search.trim().toLowerCase();
  const filtered = markets.filter(
    (m) =>
      !query ||
      m.title.toLowerCase().includes(query) ||
      m.category.toLowerCase().includes(query),
  );

  const sorted = [...filtered].sort((a, b) => {
    if (sort === "prob_hi") return b.probability - a.probability;
    if (sort === "prob_lo") return a.probability - b.probability;
    if (sort === "volume") return b.volume - a.volume;
    // closing: nulls last
    const da = daysUntil(a.endDate) ?? 99999;
    const db = daysUntil(b.endDate) ?? 99999;
    return da - db;
  });

  const probColor = (p: number) =>
    p >= 70 ? "var(--fhi)" : p <= 30 ? "var(--flo)" : "var(--fmd)";

  const sortBtn = (key: SortKey, label: string) => (
    <button
      key={key}
      onClick={() => setSort(key)}
      style={{
        height: "26px",
        padding: "0 10px",
        borderRadius: "6px",
        fontSize: "10.5px",
        fontWeight: 700,
        border: "1px solid var(--border2)",
        cursor: "pointer",
        background: sort === key ? "var(--accent)" : "transparent",
        color: sort === key ? "#fff" : "var(--text3)",
      }}
    >
      {label}
    </button>
  );

  return (
    <div>
      {/* Header row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          marginBottom: "12px",
          flexWrap: "wrap",
        }}
      >
        <span
          style={{
            fontSize: "12px",
            fontWeight: 700,
            color: "var(--text3)",
            textTransform: "uppercase",
          }}
        >
          🎲 Polymarket — Prediction Markets
        </span>
        <button
          onClick={load}
          disabled={loading}
          style={{
            marginLeft: "auto",
            height: "26px",
            padding: "0 12px",
            borderRadius: "6px",
            background: "var(--accent)",
            border: "none",
            color: "#fff",
            fontSize: "11px",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {loading ? "Loading…" : "↻ Refresh"}
        </button>
        {loading && (
          <span
            role="status"
            style={{ fontSize: "10px", color: "var(--text3)" }}
          >
            Refreshing verified markets…
          </span>
        )}
      </div>

      {error && (
        <div
          role="alert"
          style={{
            padding: "9px 11px",
            marginBottom: "12px",
            border: "1px solid var(--border2)",
            borderRadius: "8px",
            background: "var(--surf2)",
            color: "var(--fmd)",
            fontSize: "11px",
          }}
        >
          {markets.length > 0
            ? "Prediction market refresh failed; showing the last verified markets."
            : PREDICTIONS_UNAVAILABLE}
        </div>
      )}

      {/* Summary bar */}
      <SummaryBar markets={markets} />

      {/* Sort + search controls */}
      {markets.length > 0 && (
        <div
          style={{
            display: "flex",
            gap: "5px",
            flexWrap: "wrap",
            marginBottom: "10px",
            alignItems: "center",
          }}
        >
          {sortBtn("prob_hi", "% High")}
          {sortBtn("prob_lo", "% Low")}
          {sortBtn("volume", "Volume")}
          {sortBtn("closing", "Closing")}
          <input
            aria-label="Search prediction markets"
            type="text"
            placeholder="Search markets…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              marginLeft: "auto",
              height: "26px",
              padding: "0 10px",
              borderRadius: "6px",
              border: "1px solid var(--border2)",
              background: "var(--surf2)",
              color: "var(--text)",
              fontSize: "11px",
              outline: "none",
              minWidth: "160px",
            }}
          />
        </div>
      )}

      {!markets.length && !loading && !error && (
        <div
          style={{
            padding: "40px",
            textAlign: "center",
            color: "var(--text3)",
            fontSize: "13px",
          }}
        >
          No verified prediction markets are available yet.
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
          gap: "9px",
        }}
      >
        {sorted.map((m) => {
          const days = daysUntil(m.endDate);
          const bracket = bracketLabel(m.probability);
          const closingColor =
            days === null
              ? "var(--text3)"
              : days <= 3
                ? "#ef4444"
                : days <= 14
                  ? "#f59e0b"
                  : "var(--text3)";

          return (
            <div
              key={m.id}
              style={{
                background: "var(--surf2)",
                border: "1px solid var(--border)",
                borderRadius: "10px",
                padding: "12px 14px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "5px",
                }}
              >
                <span
                  style={{
                    fontSize: "10px",
                    color: "var(--text3)",
                    fontWeight: 600,
                  }}
                >
                  {m.category}
                </span>
                <span
                  style={{
                    fontSize: "10px",
                    fontWeight: 700,
                    color: bracket.color,
                  }}
                >
                  {bracket.label}
                </span>
              </div>
              <div
                style={{
                  fontSize: "12.5px",
                  color: "var(--text)",
                  lineHeight: 1.4,
                  marginBottom: "8px",
                }}
              >
                {m.title.slice(0, 90)}
                {m.title.length > 90 ? "…" : ""}
              </div>
              <div
                style={{ display: "flex", alignItems: "center", gap: "8px" }}
              >
                <span
                  style={{
                    fontSize: "20px",
                    fontWeight: 900,
                    fontFamily: "monospace",
                    color: probColor(m.probability),
                  }}
                >
                  {m.probability}%
                </span>
                <div
                  style={{
                    flex: 1,
                    height: "4px",
                    background: "var(--surf3)",
                    borderRadius: "2px",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${m.probability}%`,
                      height: "100%",
                      background: probColor(m.probability),
                      borderRadius: "2px",
                    }}
                  />
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginTop: "5px",
                }}
              >
                {m.volume > 0 && (
                  <span style={{ fontSize: "10px", color: "var(--text3)" }}>
                    Vol {fmtVol(m.volume)}
                  </span>
                )}
                {days !== null && (
                  <span
                    style={{
                      fontSize: "10px",
                      color: closingColor,
                      fontWeight: days <= 14 ? 700 : 400,
                    }}
                  >
                    {days <= 0 ? "Closed" : `${days}d left`}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
