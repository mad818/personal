import { existsSync, mkdirSync, readFileSync } from "fs";
import { join } from "path";
import type {
  ForecastEvalPayload,
  ForecastEvalRunnerState,
  ForecastRun,
} from "@/lib/forecasting";
import { buildDefaultForecastProviderStatus } from "@/lib/forecasting";

const ROOT = process.cwd();
const METRICS_DIR = join(ROOT, "docs", "metrics");
export const FORECAST_LATEST_FILE = join(
  METRICS_DIR,
  "forecast-eval-latest.json",
);
export const FORECAST_HISTORY_FILE = join(
  METRICS_DIR,
  "forecast-eval-history.jsonl",
);
export const FORECAST_RUNNER_STATE_FILE = join(
  METRICS_DIR,
  "forecast-eval-runner.json",
);

export function ensureForecastMetricsDir() {
  if (!existsSync(METRICS_DIR)) mkdirSync(METRICS_DIR, { recursive: true });
}

export function readLatestForecastEval(): ForecastRun | null {
  if (!existsSync(FORECAST_LATEST_FILE)) return null;
  try {
    return JSON.parse(readFileSync(FORECAST_LATEST_FILE, "utf-8")) as ForecastRun;
  } catch {
    return null;
  }
}

export function readForecastEvalHistory(limit: number): ForecastRun[] {
  if (!existsSync(FORECAST_HISTORY_FILE)) return [];
  try {
    return readFileSync(FORECAST_HISTORY_FILE, "utf-8")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(-Math.max(1, Math.min(200, limit)))
      .map((line) => {
        try {
          return JSON.parse(line) as ForecastRun;
        } catch {
          return null;
        }
      })
      .filter((value): value is ForecastRun => Boolean(value));
  } catch {
    return [];
  }
}

export function readForecastEvalRunnerState(): ForecastEvalRunnerState {
  if (!existsSync(FORECAST_RUNNER_STATE_FILE)) return {};
  try {
    return JSON.parse(
      readFileSync(FORECAST_RUNNER_STATE_FILE, "utf-8"),
    ) as ForecastEvalRunnerState;
  } catch {
    return {};
  }
}

export function buildForecastEvalPayload(
  limit = 24,
  freshnessWindowMin = 240,
): ForecastEvalPayload {
  ensureForecastMetricsDir();
  const latest = readLatestForecastEval();
  const history = readForecastEvalHistory(limit);
  const runner = readForecastEvalRunnerState();
  const ageMinutes = latest?.ts
    ? Math.max(
        0,
        Math.round((Date.now() - new Date(latest.ts).getTime()) / 60000),
      )
    : null;

  return {
    status: "ok",
    provider:
      latest?.provider ??
      buildDefaultForecastProviderStatus(
        "Forecast bench standing by until the first baseline backtest is recorded.",
      ),
    latest,
    history,
    points: history.length,
    freshness: {
      freshnessWindowMin,
      ageMinutes,
      stale: ageMinutes === null ? true : ageMinutes > freshnessWindowMin,
    },
    runner,
  };
}
