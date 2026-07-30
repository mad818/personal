export type PriceFeedMode = "markets" | "sparklines";

export interface VerifiedMarketPrice {
  id: string;
  symbol: string;
  price: number;
  change24h: number;
  marketCap: number;
  totalVolume: number;
}

export interface VerifiedPriceSparkline {
  id: string;
  prices: number[];
}

export interface PriceMarketsSuccess {
  ok: true;
  mode: "markets";
  records: VerifiedMarketPrice[];
}

export interface PriceSparklinesSuccess {
  ok: true;
  mode: "sparklines";
  records: VerifiedPriceSparkline[];
}

export interface CoreMarketFeedFailure {
  ok: false;
  error: string;
}

export type PriceFeedResponse =
  | PriceMarketsSuccess
  | PriceSparklinesSuccess
  | CoreMarketFeedFailure;

export interface VerifiedPredictionMarket {
  id: string;
  title: string;
  probability: number;
  volume: number;
  category: string;
  endDate: string;
}

export interface PredictionMarketsSuccess {
  ok: true;
  markets: VerifiedPredictionMarket[];
}

export type PredictionMarketsResponse =
  | PredictionMarketsSuccess
  | CoreMarketFeedFailure;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isMarketPrice(value: unknown): value is VerifiedMarketPrice {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    value.id.length > 0 &&
    typeof value.symbol === "string" &&
    value.symbol.length > 0 &&
    isFiniteNumber(value.price) &&
    value.price > 0 &&
    isFiniteNumber(value.change24h) &&
    isFiniteNumber(value.marketCap) &&
    value.marketCap >= 0 &&
    isFiniteNumber(value.totalVolume) &&
    value.totalVolume >= 0
  );
}

function isPriceSparkline(value: unknown): value is VerifiedPriceSparkline {
  if (!isRecord(value) || !Array.isArray(value.prices)) return false;
  return (
    typeof value.id === "string" &&
    value.id.length > 0 &&
    value.prices.length >= 2 &&
    value.prices.every((price) => isFiniteNumber(price) && price > 0)
  );
}

export function isPriceMarketsSuccess(
  value: unknown,
): value is PriceMarketsSuccess {
  return (
    isRecord(value) &&
    value.ok === true &&
    value.mode === "markets" &&
    Array.isArray(value.records) &&
    value.records.length > 0 &&
    value.records.every(isMarketPrice)
  );
}

export function isPriceSparklinesSuccess(
  value: unknown,
): value is PriceSparklinesSuccess {
  return (
    isRecord(value) &&
    value.ok === true &&
    value.mode === "sparklines" &&
    Array.isArray(value.records) &&
    value.records.length > 0 &&
    value.records.every(isPriceSparkline)
  );
}

function isPredictionMarket(value: unknown): value is VerifiedPredictionMarket {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    value.id.length > 0 &&
    typeof value.title === "string" &&
    value.title.length > 0 &&
    isFiniteNumber(value.probability) &&
    value.probability >= 0 &&
    value.probability <= 100 &&
    isFiniteNumber(value.volume) &&
    value.volume >= 0 &&
    typeof value.category === "string" &&
    value.category.length > 0 &&
    typeof value.endDate === "string"
  );
}

export function isPredictionMarketsSuccess(
  value: unknown,
): value is PredictionMarketsSuccess {
  return (
    isRecord(value) &&
    value.ok === true &&
    Array.isArray(value.markets) &&
    value.markets.length > 0 &&
    value.markets.every(isPredictionMarket)
  );
}
