import {
  type CommodityRatesResponse,
  type CommoditySources,
  type FxRatesResponse,
  type MarketQuote,
  type MarketSourceState,
} from "./marketRatesTypes.ts";

type FetchLike = (input: string | URL, init?: RequestInit) => Promise<Response>;

export interface MarketRatesServerOptions {
  fetchImpl?: FetchLike;
  env?: Readonly<Record<string, string | undefined>>;
  timeoutMs?: number;
  maxResponseBytes?: number;
  previousMetalPrices?: Record<string, number>;
}

export interface MarketRatesExecution<T> {
  status: number;
  body: T;
}

class MarketProviderFailure extends Error {
  constructor() {
    super("market_provider_unavailable");
    this.name = "MarketProviderFailure";
  }
}

const FX_URL = "https://open.er-api.com/v6/latest/USD";
const METALS_URL =
  "https://api.metals.live/v1/spot/gold,silver,platinum,copper";
const FRED_URL = "https://api.stlouisfed.org/fred/series/observations";
const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_MAX_RESPONSE_BYTES = 256 * 1024;
const FX_UNAVAILABLE = "FX rates are temporarily unavailable.";
const COMMODITIES_UNAVAILABLE = "Commodity rates are temporarily unavailable.";
const REQUIRED_FX_KEYS = ["EUR", "GBP", "JPY", "CNY", "CHF", "CAD", "AUD"];

const METALS_META: Record<
  string,
  { id: string; label: string; icon: string; unit: string; scale: number }
> = {
  gold: { id: "XAU", label: "Gold", icon: "🥇", unit: "/oz", scale: 1 },
  silver: {
    id: "XAG",
    label: "Silver",
    icon: "⚪",
    unit: "/oz",
    scale: 1,
  },
  platinum: {
    id: "XPT",
    label: "Platinum",
    icon: "🔵",
    unit: "/oz",
    scale: 1,
  },
  copper: {
    id: "HG",
    label: "Copper",
    icon: "🔶",
    unit: "/lb",
    scale: 0.0686,
  },
};

const ENERGY_SERIES = [
  { id: "DCOILWTICO", label: "WTI Crude", icon: "🛢️", unit: "/bbl" },
  { id: "DCOILBRENTEU", label: "Brent", icon: "⛽", unit: "/bbl" },
  { id: "DHHNGSP", label: "Nat Gas", icon: "🔥", unit: "/MMBtu" },
] as const;

const previousMetalPrices: Record<string, number> = {};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function resolveOptions(options: MarketRatesServerOptions) {
  return {
    fetchImpl: options.fetchImpl ?? fetch,
    env: options.env ?? process.env,
    timeoutMs: options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    maxResponseBytes: options.maxResponseBytes ?? DEFAULT_MAX_RESPONSE_BYTES,
    previousMetalPrices: options.previousMetalPrices ?? previousMetalPrices,
  };
}

async function readBoundedText(response: Response, maxBytes: number) {
  const declared = Number.parseInt(
    response.headers.get("content-length") ?? "",
    10,
  );
  if (Number.isFinite(declared) && declared > maxBytes) {
    throw new MarketProviderFailure();
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
        throw new MarketProviderFailure();
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

async function fetchJson(
  url: string | URL,
  options: ReturnType<typeof resolveOptions>,
) {
  let response: Response;
  try {
    response = await options.fetchImpl(url, {
      cache: "no-store",
      redirect: "follow",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(options.timeoutMs),
    });
  } catch {
    throw new MarketProviderFailure();
  }
  if (!response.ok) throw new MarketProviderFailure();

  const text = await readBoundedText(response, options.maxResponseBytes);
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new MarketProviderFailure();
  }
}

function finitePositive(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function parseFxPayload(value: unknown) {
  if (!isRecord(value) || !isRecord(value.rates)) {
    throw new MarketProviderFailure();
  }
  const rates: Record<string, number> = {};
  for (const key of REQUIRED_FX_KEYS) {
    const rate = value.rates[key];
    if (!finitePositive(rate)) throw new MarketProviderFailure();
    rates[key] = rate;
  }
  if (typeof value.time_last_update_utc !== "string") {
    throw new MarketProviderFailure();
  }
  const updatedAtMs = Date.parse(value.time_last_update_utc);
  if (!Number.isFinite(updatedAtMs)) throw new MarketProviderFailure();
  return { rates, updatedAt: new Date(updatedAtMs).toISOString() };
}

function parseMetalsPayload(value: unknown, previous: Record<string, number>) {
  if (!Array.isArray(value)) throw new MarketProviderFailure();
  const merged: Record<string, unknown> = {};
  for (const entry of value) {
    if (!isRecord(entry)) throw new MarketProviderFailure();
    Object.assign(merged, entry);
  }

  const quotes: MarketQuote[] = [];
  for (const [key, meta] of Object.entries(METALS_META)) {
    const price = merged[key];
    if (!finitePositive(price)) continue;
    const previousPrice = previous[key] ?? price;
    const chg = ((price - previousPrice) / previousPrice) * 100;
    previous[key] = price;
    quotes.push({
      id: meta.id,
      label: meta.label,
      icon: meta.icon,
      price: price * meta.scale,
      chg: Number.isFinite(chg) ? chg : 0,
      unit: meta.unit,
    });
  }
  if (quotes.length === 0) throw new MarketProviderFailure();
  return quotes;
}

function parseFredPayload(
  value: unknown,
  series: (typeof ENERGY_SERIES)[number],
): MarketQuote {
  if (!isRecord(value) || !Array.isArray(value.observations)) {
    throw new MarketProviderFailure();
  }
  const observations = value.observations
    .filter(isRecord)
    .map((entry) => entry.value)
    .filter(
      (entry): entry is string => typeof entry === "string" && entry !== ".",
    )
    .map((entry) => Number.parseFloat(entry))
    .filter(finitePositive);
  const latest = observations[0];
  if (!latest) throw new MarketProviderFailure();
  const previous = observations[1] ?? latest;
  const chg = ((latest - previous) / previous) * 100;
  return {
    id: series.id,
    label: series.label,
    icon: series.icon,
    price: latest,
    chg: Number.isFinite(chg) ? chg : 0,
    unit: series.unit,
  } satisfies MarketQuote;
}

async function loadMetals(options: ReturnType<typeof resolveOptions>) {
  const value = await fetchJson(METALS_URL, options);
  return parseMetalsPayload(value, options.previousMetalPrices);
}

async function loadEnergy(
  key: string,
  options: ReturnType<typeof resolveOptions>,
) {
  const settled = await Promise.allSettled(
    ENERGY_SERIES.map(async (series) => {
      const url = new URL(FRED_URL);
      url.searchParams.set("series_id", series.id);
      url.searchParams.set("limit", "3");
      url.searchParams.set("sort_order", "desc");
      url.searchParams.set("api_key", key);
      url.searchParams.set("file_type", "json");
      const value = await fetchJson(url, options);
      return parseFredPayload(value, series);
    }),
  );
  const quotes = settled
    .filter(
      (result): result is PromiseFulfilledResult<MarketQuote> =>
        result.status === "fulfilled",
    )
    .map((result) => result.value);
  if (quotes.length === 0) throw new MarketProviderFailure();
  return quotes;
}

function sourceState(count: number, expected: number): MarketSourceState {
  if (count === 0) return "unavailable";
  return count === expected ? "ok" : "partial";
}

export async function executeFxRates(
  serverOptions: MarketRatesServerOptions = {},
): Promise<MarketRatesExecution<FxRatesResponse>> {
  const options = resolveOptions(serverOptions);
  try {
    const payload = parseFxPayload(await fetchJson(FX_URL, options));
    return { status: 200, body: { ok: true, ...payload } };
  } catch {
    return {
      status: 502,
      body: { ok: false, error: FX_UNAVAILABLE, rates: {} },
    };
  }
}

export async function executeCommodityRates(
  serverOptions: MarketRatesServerOptions = {},
): Promise<MarketRatesExecution<CommodityRatesResponse>> {
  const options = resolveOptions(serverOptions);
  const fredKey = options.env.FRED_KEY?.trim() ?? "";
  const energyConfigured = Boolean(fredKey);
  const [metalsResult, energyResult] = await Promise.allSettled([
    loadMetals(options),
    fredKey ? loadEnergy(fredKey, options) : Promise.resolve([]),
  ]);

  const metals = metalsResult.status === "fulfilled" ? metalsResult.value : [];
  const energy = energyResult.status === "fulfilled" ? energyResult.value : [];
  const sources: CommoditySources = {
    metals: sourceState(metals.length, Object.keys(METALS_META).length),
    energy: energyConfigured
      ? sourceState(energy.length, ENERGY_SERIES.length)
      : "unconfigured",
  };
  const quotes = [...metals, ...energy];
  if (quotes.length === 0) {
    return {
      status: 502,
      body: {
        ok: false,
        error: COMMODITIES_UNAVAILABLE,
        quotes: [],
        sources,
        energyConfigured,
      },
    };
  }
  return {
    status: 200,
    body: { ok: true, quotes, sources, energyConfigured },
  };
}
