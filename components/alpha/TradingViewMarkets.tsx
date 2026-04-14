"use client";

// ── TradingView embeds (from legacy StockBot / sanity-next era in archive/) ──
// Free widget scripts — dark theme to match Nexus. Requires CSP allowlist in next.config.js.

import { useEffect, useRef, memo } from "react";

const TV_SCRIPT_BASE = "https://s3.tradingview.com/external-embedding";

function appendWidgetScript(
  container: HTMLDivElement | null,
  src: string,
  config: Record<string, unknown>,
): () => void {
  if (!container) return () => {};
  const script = document.createElement("script");
  script.src = src;
  script.type = "text/javascript";
  script.async = true;
  // ASSERT: TradingView receives the same JSON config without using innerHTML.
  script.textContent = JSON.stringify(config);
  container.appendChild(script);
  return () => {
    try {
      if (container.contains(script)) container.removeChild(script);
    } catch {
      /* ignore */
    }
  };
}

/** Horizontal tape — crypto + majors (legacy experimentalbot defaults, crypto-tilted). */
export const TradingViewTickerTape = memo(function TradingViewTickerTape() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return appendWidgetScript(
      ref.current,
      `${TV_SCRIPT_BASE}/embed-widget-ticker-tape.js`,
      {
        symbols: [
          { proName: "BITSTAMP:BTCUSD", title: "Bitcoin" },
          { proName: "BITSTAMP:ETHUSD", title: "Ethereum" },
          { proName: "COINBASE:SOLUSD", title: "Solana" },
          { proName: "FOREXCOM:SPXUSD", title: "S&P 500" },
          { proName: "FX_IDC:EURUSD", title: "EUR/USD" },
        ],
        showSymbolLogo: true,
        isTransparent: false,
        displayMode: "adaptive",
        colorTheme: "dark",
        locale: "en",
      },
    );
  }, []);

  return (
    <div style={{ marginBottom: "14px" }}>
      <div
        ref={ref}
        className="tv-widget-root"
        style={{
          minHeight: "46px",
          borderRadius: "8px",
          overflow: "hidden",
          border: "1px solid var(--border)",
          background: "var(--surface2)",
        }}
      >
        <div className="tradingview-widget-container__widget" />
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
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return appendWidgetScript(
      ref.current,
      `${TV_SCRIPT_BASE}/embed-widget-advanced-chart.js`,
      {
        autosize: true,
        symbol: "BITSTAMP:BTCUSD",
        interval: "240",
        timezone: "Etc/UTC",
        theme: "dark",
        style: "1",
        locale: "en",
        enable_publishing: false,
        hide_top_toolbar: false,
        hide_legend: false,
        save_image: false,
        calendar: false,
        support_host: "https://www.tradingview.com",
        backgroundColor: "rgba(14, 11, 12, 1)",
        gridColor: "rgba(42, 38, 40, 1)",
      },
    );
  }, []);

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
        ref={ref}
        style={{ flex: 1, minHeight: 0, width: "100%", position: "relative" }}
      >
        <div
          className="tradingview-widget-container__widget"
          style={{ height: "100%", width: "100%" }}
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
        TradingView widgets). Same free widget pattern as{" "}
        <code style={{ fontSize: "11px" }}>
          archive/components/tradingview/
        </code>{" "}
        — now wired for dark UI and MARKETS.
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
