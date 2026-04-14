// ── api/prices ──────────────────────────────────────────────
// Crypto prices API: CoinGecko and CEX price data with sparklines.

import { connectorJson } from "@/lib/connectorResponse";
// lets us attach the API key server-side (never exposed to the browser).

export const dynamic = "force-dynamic";

const DEFAULT_COINS = [
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
].join(",");

const BASE = "https://api.coingecko.com/api/v3";
const HEADERS = { Accept: "application/json" };

// Retry up to 2 times on 429 with exponential backoff.
// Respects the Retry-After header when present (capped at 4 s to stay within route timeout).
async function cgFetch(url: string): Promise<Response> {
  const BASE_DELAYS = [1000, 2000]; // ms between retries
  for (let attempt = 0; attempt <= BASE_DELAYS.length; attempt++) {
    const r = await fetch(url, {
      headers: HEADERS,
      signal: AbortSignal.timeout(10000),
    });
    if (r.status !== 429 || attempt === BASE_DELAYS.length) return r;
    const retryAfter = r.headers.get("Retry-After");
    const waitMs = retryAfter
      ? Math.min(parseInt(retryAfter, 10) * 1000, 4000)
      : BASE_DELAYS[attempt];
    await new Promise((res) => setTimeout(res, waitMs));
  }
  // Unreachable — for type narrowing only
  throw new Error("CoinGecko: rate limited after retries");
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("mode") ?? "markets"; // 'markets' | 'sparklines'
  // Optional custom coin list from client — falls back to defaults
  const coins = searchParams.get("coins") ?? DEFAULT_COINS;

  try {
    const cgKey = process.env.COINGECKO_KEY ?? "";
    const keyParam = cgKey ? `&x_cg_demo_api_key=${cgKey}` : "";

    const sparkline = mode === "sparklines" ? "true" : "false";
    const url = `${BASE}/coins/markets?vs_currency=usd&ids=${coins}&order=market_cap_desc&per_page=50&sparkline=${sparkline}${keyParam}`;

    const r = await cgFetch(url);

    if (!r.ok) {
      return connectorJson(
        { error: `CoinGecko ${r.status}`, data: [] },
        {
          source: "prices",
          maxAgeSeconds: 30,
          degraded: true,
          warnings: [`CoinGecko returned HTTP ${r.status}.`],
          status: 200,
        },
      );
    }

    const data = await r.json();
    return connectorJson(
      { data },
      {
        source: "prices",
        maxAgeSeconds: 60,
      },
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown";
    return connectorJson(
      { error: msg, data: [] },
      {
        source: "prices",
        maxAgeSeconds: 30,
        degraded: true,
        warnings: [msg],
        status: 200,
      },
    );
  }
}
