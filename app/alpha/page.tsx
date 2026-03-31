// ── alpha/page.tsx ──────────────────────────────────────────
// MARKETS tab: crypto prices, momentum scanner, buy signals, position sizing.

"use client";

import { useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import WatchlistManager from "@/components/alpha/WatchlistManager";
import { PricesLoader } from "@/components/ui/DataLoader";
import { useStore } from "@/store/useStore";

type MarketsView =
  | "watchlist"
  | "signals"
  | "scanner"
  | "sizer"
  | "prices"
  | "charts";
const VIEWS: Array<{ id: MarketsView; label: string }> = [
  { id: "watchlist", label: "⭐ WATCHLIST" },
  { id: "signals", label: "🤖 SIGNALS" },
  { id: "scanner", label: "📈 SCANNER" },
  { id: "sizer", label: "🎯 SIZER" },
  { id: "prices", label: "💱 PRICES" },
  { id: "charts", label: "📺 CHARTS" },
];

const LazyPriceGrid = dynamic(() => import("@/components/alpha/PriceGrid"), {
  ssr: false,
});
const LazyMomentumScanner = dynamic(
  () => import("@/components/alpha/MomentumScanner"),
  { ssr: false },
);
const LazyBuyBot = dynamic(() => import("@/components/alpha/BuyBot"), {
  ssr: false,
});
const LazyPositionSizer = dynamic(
  () => import("@/components/alpha/PositionSizer"),
  { ssr: false },
);
const LazyPriceSparklines = dynamic(
  () => import("@/components/alpha/PriceSparklines"),
  { ssr: false },
);
const LazyTradingViewMarkets = dynamic(
  () => import("@/components/alpha/TradingViewMarkets"),
  { ssr: false },
);

export default function AlphaPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const view = useStore((s) => s.marketsView) ?? "watchlist";
  const setView = useStore((s) => s.setMarketsView);

  const urlView = useMemo(() => {
    const v = (searchParams?.get("view") ?? "").toLowerCase();
    return (
      [
        "watchlist",
        "signals",
        "scanner",
        "sizer",
        "prices",
        "charts",
      ] as MarketsView[]
    ).includes(v as MarketsView)
      ? (v as MarketsView)
      : null;
  }, [searchParams]);

  useEffect(() => {
    if (!urlView) return;
    setView(urlView);
  }, [urlView, setView]);

  useEffect(() => {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    if ((params.get("view") ?? "").toLowerCase() === view) return;
    params.set("view", view);
    router.replace(`/alpha?${params.toString()}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  return (
    <div
      style={{
        maxWidth: "1100px",
        margin: "0 auto",
        padding: "18px 16px 40px",
        position: "relative",
        zIndex: 5,
      }}
    >
      <PricesLoader />

      <div style={{ marginBottom: "20px" }}>
        <div style={{ fontSize: "18px", fontWeight: 900 }}>📈 MARKETS</div>
        <div
          style={{ fontSize: "12px", color: "var(--text2)", marginTop: "2px" }}
        >
          Crypto · Momentum scanner · Buy signals · Position sizing · Price
          tracking · TradingView charts
        </div>
      </div>

      {/* ── Sub-tabs ── */}
      <div
        style={{
          display: "flex",
          gap: "4px",
          marginBottom: "16px",
          background: "var(--surf2)",
          border: "1px solid var(--border)",
          borderRadius: "8px",
          padding: "3px",
          flexWrap: "wrap",
          position: "relative",
          zIndex: 2001,
          pointerEvents: "auto",
        }}
      >
        {VIEWS.map((v) => (
          <button
            key={v.id}
            type="button"
            onPointerDown={() => setView(v.id)}
            style={{
              flex: "1 1 140px",
              padding: "6px 8px",
              borderRadius: "6px",
              border: "none",
              cursor: "pointer",
              fontSize: "11px",
              fontWeight: 800,
              letterSpacing: "0.3px",
              transition: "all .15s",
              background: view === v.id ? "var(--accent)" : "transparent",
              color: view === v.id ? "#fff" : "var(--text2)",
              minWidth: 120,
            }}
            aria-pressed={view === v.id}
          >
            {v.label}
          </button>
        ))}
      </div>
      {view === "watchlist" && (
        <div style={{ marginBottom: "16px" }}>
          <div
            style={{
              fontSize: "11px",
              fontWeight: 700,
              color: "var(--text3)",
              textTransform: "uppercase",
              letterSpacing: "0.8px",
              marginBottom: "10px",
            }}
          >
            Watchlist
          </div>
          <WatchlistManager />
          <div style={{ marginTop: "20px" }}>
            <div
              style={{
                fontSize: "11px",
                fontWeight: 700,
                color: "var(--text3)",
                textTransform: "uppercase",
                letterSpacing: "0.8px",
                marginBottom: "10px",
              }}
            >
              7-Day Sparklines — Tracked Coins
            </div>
            <LazyPriceSparklines />
          </div>
        </div>
      )}

      {view === "signals" && (
        <div style={{ marginBottom: "28px" }}>
          <div
            style={{
              fontSize: "11px",
              fontWeight: 700,
              color: "var(--text3)",
              textTransform: "uppercase",
              letterSpacing: "0.8px",
              marginBottom: "10px",
            }}
          >
            Buy / Sell Signals
          </div>
          <LazyBuyBot />
        </div>
      )}

      {view === "scanner" && (
        <div style={{ marginBottom: "28px" }}>
          <div
            style={{
              fontSize: "11px",
              fontWeight: 700,
              color: "var(--text3)",
              textTransform: "uppercase",
              letterSpacing: "0.8px",
              marginBottom: "10px",
            }}
          >
            Momentum Signals
          </div>
          <LazyMomentumScanner />
        </div>
      )}

      {view === "sizer" && (
        <div style={{ marginBottom: "28px" }}>
          <div
            style={{
              fontSize: "11px",
              fontWeight: 700,
              color: "var(--text3)",
              textTransform: "uppercase",
              letterSpacing: "0.8px",
              marginBottom: "10px",
            }}
          >
            Position Sizer — Fixed Risk &amp; Kelly Criterion
          </div>
          <LazyPositionSizer />
        </div>
      )}

      {view === "prices" && (
        <div>
          <div
            style={{
              fontSize: "11px",
              fontWeight: 700,
              color: "var(--text3)",
              textTransform: "uppercase",
              letterSpacing: "0.8px",
              marginBottom: "10px",
            }}
          >
            Price Overview
          </div>
          <LazyPriceGrid />
        </div>
      )}

      {view === "charts" && (
        <div style={{ marginBottom: "28px" }}>
          <div
            style={{
              fontSize: "11px",
              fontWeight: 700,
              color: "var(--text3)",
              textTransform: "uppercase",
              letterSpacing: "0.8px",
              marginBottom: "10px",
            }}
          >
            TradingView — legacy StockBot embeds
          </div>
          <LazyTradingViewMarkets />
        </div>
      )}
    </div>
  );
}
