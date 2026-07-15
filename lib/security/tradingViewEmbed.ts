import { assertContentSecurityPolicyNonce } from "./contentSecurityPolicy.ts";

export const TRADING_VIEW_EMBED_KINDS = ["ticker", "chart"] as const;

export type TradingViewEmbedKind = (typeof TRADING_VIEW_EMBED_KINDS)[number];

interface TradingViewEmbedDefinition {
  title: string;
  scriptUrl: string;
  config: Record<string, unknown>;
}

const TRADING_VIEW_EMBEDS: Record<
  TradingViewEmbedKind,
  TradingViewEmbedDefinition
> = {
  ticker: {
    title: "TradingView crypto and major markets ticker tape",
    scriptUrl:
      "https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js",
    config: {
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
  },
  chart: {
    title: "TradingView BTC USD advanced chart",
    scriptUrl:
      "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js",
    config: {
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
  },
};

export function parseTradingViewEmbedKind(
  candidate: string | null | undefined,
): TradingViewEmbedKind | null {
  return TRADING_VIEW_EMBED_KINDS.find((kind) => kind === candidate) ?? null;
}

function serializeScriptData(value: Record<string, unknown>) {
  return JSON.stringify(value)
    .replaceAll("<", "\\u003c")
    .replaceAll("\u2028", "\\u2028")
    .replaceAll("\u2029", "\\u2029");
}

export function buildTradingViewEmbedHtml(
  kind: TradingViewEmbedKind,
  nonce: string,
) {
  assertContentSecurityPolicyNonce(nonce);
  const embed = TRADING_VIEW_EMBEDS[kind];
  const config = serializeScriptData(embed.config);

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="color-scheme" content="dark">
    <title>${embed.title}</title>
    <style>
      html, body, .tradingview-widget-container, .tradingview-widget-container__widget {
        width: 100%; height: 100%; margin: 0; padding: 0; overflow: hidden;
        background: #0e0b0c;
      }
    </style>
  </head>
  <body data-tradingview-kind="${kind}">
    <div class="tradingview-widget-container">
      <div class="tradingview-widget-container__widget"></div>
      <script nonce="${nonce}" type="text/javascript" src="${embed.scriptUrl}" async referrerpolicy="no-referrer">${config}</script>
    </div>
  </body>
</html>`;
}
