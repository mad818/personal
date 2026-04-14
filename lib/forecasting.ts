export const FORECAST_PROVIDER_IDS = [
  "native_baseline",
  "timesfm_companion",
] as const;

export type ForecastProviderId = (typeof FORECAST_PROVIDER_IDS)[number];

export const FORECAST_HORIZONS = ["1h", "6h", "24h"] as const;

export type ForecastHorizon = (typeof FORECAST_HORIZONS)[number];

export interface ForecastAsset {
  id: string;
  symbol: string;
  name?: string;
}

export interface ForecastSample {
  ts: string;
  value: number;
  lower: number | null;
  upper: number | null;
}

export interface ForecastProviderStatus {
  id: ForecastProviderId;
  label: string;
  ready: boolean;
  requiresCompanion: boolean;
  confidenceSupported: boolean;
  supportedHorizons: ForecastHorizon[];
  degradedReason: string | null;
}

export interface ForecastBacktestResult {
  assetId: string;
  symbol: string;
  horizon: ForecastHorizon;
  status: "ok" | "insufficient_history";
  sampleCount: number;
  windows: number;
  latestActual: number | null;
  latestPredicted: number | null;
  meanAbsolutePercentageError: number | null;
  rootMeanSquaredError: number | null;
  directionalAccuracy: number | null;
  insufficientHistoryReason: string | null;
}

export interface ForecastRunSummary {
  score: number;
  quality: "ready" | "guarded" | "degraded";
  label: string;
  assetsRequested: number;
  assetsCovered: number;
  insufficientHistoryCount: number;
  horizons: ForecastHorizon[];
  windows: number;
  meanAbsolutePercentageError: number | null;
  rootMeanSquaredError: number | null;
  directionalAccuracy: number | null;
  reasons: string[];
}

export interface ForecastRun {
  ts: string;
  provider: ForecastProviderStatus;
  universe: {
    assetIds: string[];
    requestedAssets: number;
    coveredAssets: number;
    insufficientAssets: number;
  };
  summary: ForecastRunSummary;
  backtests: ForecastBacktestResult[];
}

export interface ForecastEvalRunnerState {
  lastRunAt?: string;
  lastOk?: boolean;
  lastSummary?: string;
  cooldownMin?: number;
  effectiveCooldownMin?: number;
  nextEligibleAt?: string;
  failureStreak?: number;
}

export interface ForecastEvalPayload {
  status: "ok";
  provider: ForecastProviderStatus;
  latest: ForecastRun | null;
  history: ForecastRun[];
  points: number;
  freshness: {
    freshnessWindowMin: number;
    ageMinutes: number | null;
    stale: boolean;
  };
  runner: ForecastEvalRunnerState;
}

export function buildDefaultForecastProviderStatus(
  degradedReason = "No baseline evaluation has been recorded yet.",
): ForecastProviderStatus {
  return {
    id: "native_baseline",
    label: "Native baseline",
    ready: false,
    requiresCompanion: false,
    confidenceSupported: false,
    supportedHorizons: [...FORECAST_HORIZONS],
    degradedReason,
  };
}

export function forecastQualityLabel(
  score: number | null | undefined,
  insufficientHistoryCount = 0,
): ForecastRunSummary["quality"] {
  if (typeof score !== "number" || !Number.isFinite(score) || score <= 0) {
    return "degraded";
  }
  if (score >= 78 && insufficientHistoryCount <= 1) return "ready";
  if (score >= 58) return "guarded";
  return "degraded";
}

export function forecastQualityText(
  quality: ForecastRunSummary["quality"],
): string {
  if (quality === "ready") return "Baseline ready";
  if (quality === "guarded") return "Baseline guarded";
  return "Baseline degraded";
}
