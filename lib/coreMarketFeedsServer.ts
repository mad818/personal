import {
  type PredictionMarketsResponse,
  type PriceFeedMode,
  type PriceFeedResponse,
  type VerifiedMarketPrice,
  type VerifiedPredictionMarket,
  type VerifiedPriceSparkline,
} from "./coreMarketFeedTypes.ts";

type FetchLike = (input: string | URL, init?: RequestInit) => Promise<Response>;

export interface CoreMarketFeedsServerOptions {
  fetchImpl?: FetchLike;
  env?: Readonly<Record<string, string | undefined>>;
  timeoutMs?: number;
  maxResponseBytes?: number;
}

export interface CoreMarketFeedExecution<T> {
  status: number;
  body: T;
}

export interface PriceFeedInput {
  mode?: string | null;
  coins?: string | null;
}

class MarketFeedProviderFailure extends Error {
  constructor() {
    super("market_feed_provider_unavailable");
    this.name = "MarketFeedProviderFailure";
  }
}

const COINGECKO_URL = "https://api.coingecko.com/api/v3/coins/markets";
const POLYMARKET_URL =
  "https://gamma-api.polymarket.com/events?active=true&limit=40&order=volume&ascending=false";
const DEFAULT_TIMEOUT_MS = 12_000;
const DEFAULT_MAX_RESPONSE_BYTES = 512 * 1024;
const MAX_COINS = 25;
const MAX_COIN_QUERY_LENGTH = 1_800;
const COIN_ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,63}$/;
const PRICE_UNAVAILABLE = "Crypto prices are temporarily unavailable.";
const PREDICTIONS_UNAVAILABLE =
  "Prediction markets are temporarily unavailable.";
const INVALID_PRICE_REQUEST = "Invalid price feed request.";
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
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function finitePositive(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function finiteNonNegative(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function resolveOptions(options: CoreMarketFeedsServerOptions) {
  return {
    fetchImpl: options.fetchImpl ?? fetch,
    env: options.env ?? process.env,
    timeoutMs: options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    maxResponseBytes: options.maxResponseBytes ?? DEFAULT_MAX_RESPONSE_BYTES,
  };
}

async function readBoundedText(response: Response, maxBytes: number) {
  const declared = Number.parseInt(
    response.headers.get("content-length") ?? "",
    10,
  );
  if (Number.isFinite(declared) && declared > maxBytes) {
    throw new MarketFeedProviderFailure();
  }
  if (!response.body) return "";

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        throw new MarketFeedProviderFailure();
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const combined = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(combined);
}

async function fetchJson(url: URL, options: ReturnType<typeof resolveOptions>) {
  let response: Response;
  try {
    response = await options.fetchImpl(url, {
      cache: "no-store",
      redirect: "follow",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(options.timeoutMs),
    });
  } catch {
    throw new MarketFeedProviderFailure();
  }
  if (!response.ok) throw new MarketFeedProviderFailure();

  const text = await readBoundedText(response, options.maxResponseBytes);
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new MarketFeedProviderFailure();
  }
}

function parsePriceInput(input: PriceFeedInput) {
  const mode = input.mode ?? "markets";
  if (mode !== "markets" && mode !== "sparklines") return null;
  const rawCoins = input.coins?.trim() || DEFAULT_COINS.join(",");
  if (!rawCoins || rawCoins.length > MAX_COIN_QUERY_LENGTH) return null;
  const coins = Array.from(
    new Set(rawCoins.split(",").map((coin) => coin.trim())),
  );
  if (
    coins.length === 0 ||
    coins.length > MAX_COINS ||
    coins.some((coin) => !COIN_ID_PATTERN.test(coin))
  ) {
    return null;
  }
  return { mode: mode as PriceFeedMode, coins };
}

function parseMarketPrices(
  value: unknown,
  requestedCoins: ReadonlySet<string>,
) {
  if (!Array.isArray(value)) throw new MarketFeedProviderFailure();
  const records: VerifiedMarketPrice[] = [];
  for (const entry of value) {
    if (!isRecord(entry)) continue;
    const id = typeof entry.id === "string" ? entry.id : "";
    const symbol = typeof entry.symbol === "string" ? entry.symbol : "";
    if (
      !requestedCoins.has(id) ||
      !symbol ||
      !finitePositive(entry.current_price) ||
      typeof entry.price_change_percentage_24h !== "number" ||
      !Number.isFinite(entry.price_change_percentage_24h) ||
      !finiteNonNegative(entry.market_cap) ||
      !finiteNonNegative(entry.total_volume)
    ) {
      continue;
    }
    records.push({
      id,
      symbol,
      price: entry.current_price,
      change24h: entry.price_change_percentage_24h,
      marketCap: entry.market_cap,
      totalVolume: entry.total_volume,
    });
  }
  if (records.length === 0) throw new MarketFeedProviderFailure();
  return records;
}

function parsePriceSparklines(
  value: unknown,
  requestedCoins: ReadonlySet<string>,
) {
  if (!Array.isArray(value)) throw new MarketFeedProviderFailure();
  const records: VerifiedPriceSparkline[] = [];
  for (const entry of value) {
    if (!isRecord(entry)) continue;
    const id = typeof entry.id === "string" ? entry.id : "";
    const sparkline = isRecord(entry.sparkline_in_7d)
      ? entry.sparkline_in_7d.price
      : null;
    if (
      !requestedCoins.has(id) ||
      !Array.isArray(sparkline) ||
      sparkline.length < 2 ||
      !sparkline.every(finitePositive)
    ) {
      continue;
    }
    records.push({ id, prices: sparkline.slice(-200) });
  }
  if (records.length === 0) throw new MarketFeedProviderFailure();
  return records;
}

function parseOutcomeProbability(value: unknown) {
  let prices: unknown = value;
  if (typeof value === "string") {
    try {
      prices = JSON.parse(value) as unknown;
    } catch {
      return null;
    }
  }
  if (!Array.isArray(prices)) return null;
  const first =
    typeof prices[0] === "string" ? Number.parseFloat(prices[0]) : prices[0];
  if (
    typeof first !== "number" ||
    !Number.isFinite(first) ||
    first < 0 ||
    first > 1
  ) {
    return null;
  }
  return Math.round(first * 100);
}

function parsePredictionMarkets(value: unknown) {
  const events = Array.isArray(value)
    ? value
    : isRecord(value) && Array.isArray(value.events)
      ? value.events
      : null;
  if (!events) throw new MarketFeedProviderFailure();

  const markets: VerifiedPredictionMarket[] = [];
  for (const event of events) {
    if (!isRecord(event)) continue;
    const id = typeof event.id === "string" ? event.id : String(event.id ?? "");
    const titleValue = event.title ?? event.question;
    const title = typeof titleValue === "string" ? titleValue.trim() : "";
    const eventMarkets = Array.isArray(event.markets) ? event.markets : [];
    const firstMarket = isRecord(eventMarkets[0]) ? eventMarkets[0] : null;
    const probability = parseOutcomeProbability(firstMarket?.outcomePrices);
    const volume =
      typeof event.volume === "number"
        ? event.volume
        : typeof event.volume === "string"
          ? Number.parseFloat(event.volume)
          : Number.NaN;
    if (
      !id ||
      !title ||
      probability === null ||
      !Number.isFinite(volume) ||
      volume < 0
    ) {
      continue;
    }
    const category =
      typeof event.category === "string" && event.category.trim()
        ? event.category.trim()
        : "Uncategorized";
    const endDate =
      typeof event.endDate === "string" &&
      Number.isFinite(Date.parse(event.endDate))
        ? event.endDate
        : "";
    markets.push({
      id,
      title,
      probability,
      volume,
      category,
      endDate,
    });
    if (markets.length >= 40) break;
  }
  if (markets.length === 0) throw new MarketFeedProviderFailure();
  return markets;
}

export async function executePriceFeed(
  input: PriceFeedInput,
  serverOptions: CoreMarketFeedsServerOptions = {},
): Promise<CoreMarketFeedExecution<PriceFeedResponse>> {
  const parsedInput = parsePriceInput(input);
  if (!parsedInput) {
    return {
      status: 400,
      body: { ok: false, error: INVALID_PRICE_REQUEST },
    };
  }

  const options = resolveOptions(serverOptions);
  try {
    const url = new URL(COINGECKO_URL);
    url.searchParams.set("vs_currency", "usd");
    url.searchParams.set("ids", parsedInput.coins.join(","));
    url.searchParams.set("order", "market_cap_desc");
    url.searchParams.set("per_page", String(parsedInput.coins.length));
    url.searchParams.set(
      "sparkline",
      parsedInput.mode === "sparklines" ? "true" : "false",
    );
    const key = options.env.COINGECKO_KEY?.trim();
    if (key) url.searchParams.set("x_cg_demo_api_key", key);
    const value = await fetchJson(url, options);
    const requestedCoins = new Set(parsedInput.coins);
    if (parsedInput.mode === "markets") {
      return {
        status: 200,
        body: {
          ok: true,
          mode: "markets",
          records: parseMarketPrices(value, requestedCoins),
        },
      };
    }
    return {
      status: 200,
      body: {
        ok: true,
        mode: "sparklines",
        records: parsePriceSparklines(value, requestedCoins),
      },
    };
  } catch {
    return {
      status: 502,
      body: { ok: false, error: PRICE_UNAVAILABLE },
    };
  }
}

export async function executePredictionMarkets(
  serverOptions: CoreMarketFeedsServerOptions = {},
): Promise<CoreMarketFeedExecution<PredictionMarketsResponse>> {
  const options = resolveOptions(serverOptions);
  try {
    const markets = parsePredictionMarkets(
      await fetchJson(new URL(POLYMARKET_URL), options),
    );
    return { status: 200, body: { ok: true, markets } };
  } catch {
    return {
      status: 502,
      body: { ok: false, error: PREDICTIONS_UNAVAILABLE },
    };
  }
}
