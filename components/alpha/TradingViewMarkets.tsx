"use client";

// ── TradingView embeds (from legacy StockBot / sanity-next era in archive/) ──
// Free widgets run inside a fixed opaque-origin sandbox instead of the Nexus document.

import { memo } from "react";

const TRADING_VIEW_SANDBOX =
  "allow-scripts allow-popups allow-popups-to-escape-sandbox";

function TradingViewSandboxFrame({
  kind,
  title,
}: {
  kind: "ticker" | "chart";
  title: string;
}) {
  return (
    <iframe
      src={`/embeds/tradingview?kind=${kind}`}
      title={title}
      sandbox={TRADING_VIEW_SANDBOX}
      referrerPolicy="no-referrer"
      loading="lazy"
      allow="fullscreen"
      allowFullScreen
      style={{ width: "100%", height: "100%", border: 0, display: "block" }}
    />
  );
}

/** Horizontal tape — crypto + majors (legacy experimentalbot defaults, crypto-tilted). */
export const TradingViewTickerTape = memo(function TradingViewTickerTape() {
  return (
    <div style={{ marginBottom: "14px" }}>
      <div
        className="tv-widget-root"
        style={{
          height: "46px",
          borderRadius: "8px",
          overflow: "hidden",
          border: "1px solid var(--border)",
          background: "var(--surface2)",
        }}
      >
        <TradingViewSandboxFrame
          kind="ticker"
          title="TradingView crypto and major markets ticker tape"
        />
      </div>
      <div
        style={{
          fontSize: "9px",
          color: "var(--text3)",
          marginTop: "4px",
          textAlign: "right",
        }}
      >
        <a
          href="https://www.tradingview.com/"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "var(--text3)" }}
        >
          Charts by TradingView
        </a>
      </div>
    </div>
  );
});

/** Advanced chart — default BTC/USD. */
export const TradingViewBtcChart = memo(function TradingViewBtcChart() {
  return (
    <div
      style={{
        height: "min(520px, 70vh)",
        borderRadius: "10px",
        overflow: "hidden",
        border: "1px solid var(--border)",
        background: "var(--surface2)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{ flex: 1, minHeight: 0, width: "100%", position: "relative" }}
      >
        <TradingViewSandboxFrame
          kind="chart"
          title="TradingView BTC USD advanced chart"
        />
      </div>
      <div
        style={{
          fontSize: "9px",
          color: "var(--text3)",
          padding: "4px 8px",
          textAlign: "right",
          flexShrink: 0,
        }}
      >
        <a
          href="https://www.tradingview.com/symbols/BTCUSD/?exchange=BITSTAMP"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "var(--text3)" }}
        >
          BTC/USD on TradingView
        </a>
      </div>
    </div>
  );
});

export default function TradingViewMarkets() {
  return (
    <div>
      <p
        style={{
          fontSize: "12px",
          color: "var(--text2)",
          lineHeight: 1.5,
          margin: "0 0 14px",
          maxWidth: "640px",
        }}
      >
        Embeds from the early <strong>StockBot</strong> phase (Groq +
        TradingView widgets), now isolated from the Nexus document in a
        no-referrer sandbox while preserving the dark MARKETS view.
      </p>
      <TradingViewTickerTape />
      <div
        style={{
          fontSize: "11px",
          fontWeight: 700,
          color: "var(--text3)",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          marginBottom: "8px",
        }}
      >
        BTC / USD — advanced chart
      </div>
      <TradingViewBtcChart />
    </div>
  );
}
