export type MarketSourceState =
  | "ok"
  | "partial"
  | "unconfigured"
  | "unavailable";

export interface MarketQuote {
  id: string;
  label: string;
  icon: string;
  price: number;
  chg: number;
  unit: string;
}

export interface FxRatesSuccess {
  ok: true;
  rates: Record<string, number>;
  updatedAt: string;
}

export interface FxRatesFailure {
  ok: false;
  error: string;
  rates: Record<string, never>;
}

export type FxRatesResponse = FxRatesSuccess | FxRatesFailure;

export interface CommoditySources {
  metals: MarketSourceState;
  energy: MarketSourceState;
}

export interface CommodityRatesSuccess {
  ok: true;
  quotes: MarketQuote[];
  sources: CommoditySources;
  energyConfigured: boolean;
}

export interface CommodityRatesFailure {
  ok: false;
  error: string;
  quotes: MarketQuote[];
  sources: CommoditySources;
  energyConfigured: boolean;
}

export type CommodityRatesResponse =
  | CommodityRatesSuccess
  | CommodityRatesFailure;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isSourceState(value: unknown): value is MarketSourceState {
  return (
    value === "ok" ||
    value === "partial" ||
    value === "unconfigured" ||
    value === "unavailable"
  );
}

function isMarketQuote(value: unknown): value is MarketQuote {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    typeof value.label === "string" &&
    typeof value.icon === "string" &&
    typeof value.price === "number" &&
    Number.isFinite(value.price) &&
    value.price > 0 &&
    typeof value.chg === "number" &&
    Number.isFinite(value.chg) &&
    typeof value.unit === "string"
  );
}

export function isFxRatesSuccess(value: unknown): value is FxRatesSuccess {
  if (!isRecord(value) || value.ok !== true || !isRecord(value.rates)) {
    return false;
  }
  const rates = Object.values(value.rates);
  return (
    rates.length > 0 &&
    rates.every(
      (rate) => typeof rate === "number" && Number.isFinite(rate) && rate > 0,
    ) &&
    typeof value.updatedAt === "string" &&
    value.updatedAt.length > 0
  );
}

export function isCommodityRatesSuccess(
  value: unknown,
): value is CommodityRatesSuccess {
  if (
    !isRecord(value) ||
    value.ok !== true ||
    !Array.isArray(value.quotes) ||
    value.quotes.length === 0 ||
    !value.quotes.every(isMarketQuote) ||
    !isRecord(value.sources)
  ) {
    return false;
  }
  return (
    isSourceState(value.sources.metals) &&
    isSourceState(value.sources.energy) &&
    typeof value.energyConfigured === "boolean"
  );
}
