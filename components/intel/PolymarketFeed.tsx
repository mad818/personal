// ── components/intel/PolymarketFeed ────────────────────────
// Prediction market odds feed — sort, search, summary bar, bracket labels.

"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { apiFetch } from "@/lib/apiFetch";
import FeedStatusPill from "@/components/ui/FeedStatusPill";
import { SurfaceCallout, SurfaceEmpty } from "@/components/ui/surfacePrimitives";
import { useInternetAvailability } from "@/hooks/useInternetAvailability";
import { useStore } from "@/store/useStore";

interface Market {
  id: string;
  title: string;
  probability: number;
  volume: number;
  category: string;
  endDate: string;
}

type SortKey = "prob_hi" | "prob_lo" | "volume" | "closing";

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
  const [sort, setSort] = useState<SortKey>("prob_hi");
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const hasLocalMarketsRef = useRef(false);
  const { internetReachable } = useInternetAvailability();
  const polymarketStatus = useStore((s) => s.feedStatus.polymarket);
  const updateFeedStatus = useStore((s) => s.updateFeedStatus);
  const lastFailureIsNewest =
    Boolean(polymarketStatus.lastFailureAt) &&
    (polymarketStatus.lastSuccessAt === null ||
      (polymarketStatus.lastFailureAt ?? 0) > (polymarketStatus.lastSuccessAt ?? 0));

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    updateFeedStatus("polymarket", {
      lastAttemptAt: Date.now(),
      lastError: null,
    });
    try {
      const r = await apiFetch("/api/polymarket");
      const d = (await r.json()) as Record<string, unknown>;
      const raw = (d.events as Record<string, unknown>[]) ?? [];
      const resolved = raw.slice(0, 50).map((e) => {
          const eRaw = e as Record<string, unknown>;
          const mArr = eRaw.markets as
            | Array<Record<string, unknown>>
            | undefined;
          let prob = 50;
          try {
            const prices = mArr?.[0]?.outcomePrices;
            if (typeof prices === "string") {
              prob = Math.round(
                parseFloat((JSON.parse(prices) as string[])[0] ?? "0.5") * 100,
              );
            }
          } catch {
            /* silent */
          }
          return {
            id: String(eRaw.id ?? ""),
            title: String(eRaw.title ?? eRaw.question ?? ""),
            probability: prob,
            volume: Math.round(parseFloat(String(eRaw.volume ?? "0"))),
            category: String(eRaw.category ?? "General"),
            endDate: String(eRaw.endDate ?? ""),
          };
        });
      setMarkets(resolved);
      if (resolved.length > 0) {
        updateFeedStatus("polymarket", {
          lastSuccessAt: Date.now(),
          lastError: null,
        });
      } else {
        setError("Could not load prediction markets.");
        updateFeedStatus("polymarket", {
          lastFailureAt: Date.now(),
          lastError: "Could not load prediction markets.",
        });
      }
    } catch {
      setError(
        hasLocalMarketsRef.current ? null : "Could not load prediction markets.",
      );
      updateFeedStatus("polymarket", {
        lastFailureAt: Date.now(),
        lastError: "Could not load prediction markets.",
      });
    } finally {
      setLoading(false);
    }
  }, [updateFeedStatus]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    hasLocalMarketsRef.current = markets.length > 0;
  }, [markets.length]);

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
  const showSearchEmpty = markets.length > 0 && sorted.length === 0 && !loading;

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
        <FeedStatusPill
          label="Polymarket"
          status={polymarketStatus}
          internetReachable={internetReachable}
        />
        <button
          onClick={load}
          disabled={loading || !internetReachable}
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
            cursor:
              loading || !internetReachable ? "not-allowed" : "pointer",
            opacity: internetReachable ? 1 : 0.65,
          }}
        >
          {loading ? "Loading…" : internetReachable ? "↻ Refresh" : "Offline"}
        </button>
      </div>

      {!internetReachable && polymarketStatus.lastSuccessAt !== null ? (
        <SurfaceCallout
          tone="info"
          icon="↺"
          title="Internet offline · showing last-known market snapshot"
          description="Prediction-market refresh is paused until reconnect. The current contract set remains available locally."
          style={{ marginBottom: "12px" }}
        />
      ) : null}

      {internetReachable && lastFailureIsNewest && markets.length > 0 ? (
        <SurfaceCallout
          tone="info"
          icon="!"
          title="Showing last good market snapshot"
          description="The latest refresh failed, so this panel is preserving the most recent successful Polymarket set."
          style={{ marginBottom: "12px" }}
        />
      ) : null}

      {error && !markets.length ? (
        <SurfaceCallout
          tone="warning"
          icon="!"
          title="Prediction market feed unavailable"
          description={error}
          style={{ marginBottom: "12px" }}
        />
      ) : null}

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
        <SurfaceEmpty
          icon="🎲"
          title="No market odds loaded yet"
          description="Hit Refresh to fetch the live Polymarket snapshot and rank active contracts."
        />
      )}

      {showSearchEmpty ? (
        <SurfaceEmpty
          icon="🔎"
          title="No markets match this search"
          description="Try another keyword or clear the search box to restore the broader market list."
          compact
          style={{ marginBottom: "10px" }}
        />
      ) : null}

      {sorted.length > 0 && !showSearchEmpty ? (
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
      ) : null}
    </div>
  );
}
