#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const METRICS_DIR = path.join(ROOT, "docs", "metrics");
const LATEST_FILE = path.join(METRICS_DIR, "forecast-eval-latest.json");
const HISTORY_FILE = path.join(METRICS_DIR, "forecast-eval-history.jsonl");
const BASE = "https://api.coingecko.com/api/v3";
const HEADERS = { Accept: "application/json" };

const DEFAULT_ASSETS = [
  { id: "bitcoin", symbol: "BTC", name: "Bitcoin" },
  { id: "ethereum", symbol: "ETH", name: "Ethereum" },
  { id: "solana", symbol: "SOL", name: "Solana" },
  { id: "binancecoin", symbol: "BNB", name: "BNB" },
  { id: "ripple", symbol: "XRP", name: "XRP" },
  { id: "cardano", symbol: "ADA", name: "Cardano" },
  { id: "chainlink", symbol: "LINK", name: "Chainlink" },
  { id: "uniswap", symbol: "UNI", name: "Uniswap" },
];

const HORIZON_STEPS = {
  "1h": 1,
  "6h": 6,
  "24h": 24,
};

function ensureDir(dir) {
  try {
    fs.mkdirSync(dir, { recursive: true });
  } catch {
    // ignore
  }
}

function parseArgs() {
  const args = process.argv.slice(2);
  const has = (flag) => args.includes(flag);
  const readFlag = (flag, fallback) => {
    const idx = args.indexOf(flag);
    if (idx === -1) return fallback;
    const value = Number(args[idx + 1]);
    return Number.isFinite(value) ? value : fallback;
  };
  return {
    record: has("--record"),
    minScore: readFlag("--min-score", 0),
  };
}

async function cgFetch(url) {
  const baseDelays = [1000, 2000];
  for (let attempt = 0; attempt <= baseDelays.length; attempt++) {
    const response = await fetch(url, {
      headers: HEADERS,
      signal: AbortSignal.timeout(10000),
    });
    if (response.status !== 429 || attempt === baseDelays.length) {
      return response;
    }
    const retryAfter = response.headers.get("Retry-After");
    const waitMs = retryAfter
      ? Math.min(parseInt(retryAfter, 10) * 1000, 4000)
      : baseDelays[attempt];
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }
  throw new Error("CoinGecko: rate limited after retries");
}

function cleanHistory(history) {
  return (Array.isArray(history) ? history : [])
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value) && value > 0);
}

function mean(values) {
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function round(value) {
  if (!Number.isFinite(value)) return null;
  return Number(value.toFixed(2));
}

function forecastQualityLabel(score, insufficientHistoryCount) {
  if (!Number.isFinite(score) || score <= 0) return "degraded";
  if (score >= 78 && insufficientHistoryCount <= 1) return "ready";
  if (score >= 58) return "guarded";
  return "degraded";
}

function forecastQualityText(quality) {
  if (quality === "ready") return "Baseline ready";
  if (quality === "guarded") return "Baseline guarded";
  return "Baseline degraded";
}

function computeReturns(history, origin, lookback) {
  const returns = [];
  const start = Math.max(1, origin - lookback + 1);
  for (let index = start; index <= origin; index++) {
    const prev = history[index - 1];
    const current = history[index];
    if (!prev || !current) continue;
    returns.push(current / prev - 1);
  }
  return returns;
}

function predictFromOrigin(history, origin, horizonSteps) {
  const current = history[origin];
  if (!Number.isFinite(current) || current <= 0) return null;
  const lookback = Math.max(12, Math.min(48, horizonSteps * 4));
  const returns = computeReturns(history, origin, lookback);
  const avgReturn = mean(returns);
  if (!Number.isFinite(avgReturn)) return null;
  return clamp(current * (1 + avgReturn * horizonSteps), current * 0.25, current * 4);
}

function backtestAsset(asset, horizon, horizonSteps) {
  const history = cleanHistory(asset.history);
  const requiredPoints = Math.max(30, horizonSteps + 24);

  if (history.length < requiredPoints) {
    return {
      assetId: asset.id,
      symbol: asset.symbol,
      horizon,
      status: "insufficient_history",
      sampleCount: 0,
      windows: 0,
      latestActual: history.at(-1) ?? null,
      latestPredicted: null,
      meanAbsolutePercentageError: null,
      rootMeanSquaredError: null,
      directionalAccuracy: null,
      insufficientHistoryReason: `Need at least ${requiredPoints} sparkline points for ${horizon}; only ${history.length} available.`,
    };
  }

  const stride = Math.max(1, Math.floor(horizonSteps / 2));
  const origins = [];
  for (
    let origin = Math.max(12, Math.min(48, horizonSteps * 4));
    origin + horizonSteps < history.length;
    origin += stride
  ) {
    origins.push(origin);
  }

  const absolutePctErrors = [];
  const squaredPctErrors = [];
  const directionalHits = [];

  for (const origin of origins) {
    const current = history[origin];
    const actual = history[origin + horizonSteps];
    const predicted = predictFromOrigin(history, origin, horizonSteps);
    if (!Number.isFinite(current) || !Number.isFinite(actual) || !Number.isFinite(predicted)) {
      continue;
    }
    const pctError = Math.abs(predicted - actual) / actual;
    absolutePctErrors.push(pctError);
    squaredPctErrors.push(pctError ** 2);

    const predictedDirection = Math.sign(predicted - current);
    const actualDirection = Math.sign(actual - current);
    directionalHits.push(predictedDirection === actualDirection ? 1 : 0);
  }

  if (!absolutePctErrors.length) {
    return {
      assetId: asset.id,
      symbol: asset.symbol,
      horizon,
      status: "insufficient_history",
      sampleCount: 0,
      windows: 0,
      latestActual: history.at(-1) ?? null,
      latestPredicted: null,
      meanAbsolutePercentageError: null,
      rootMeanSquaredError: null,
      directionalAccuracy: null,
      insufficientHistoryReason: `History for ${asset.symbol} did not yield any stable rolling windows for ${horizon}.`,
    };
  }

  const latestActual = history.at(-1) ?? null;
  const latestPredicted = predictFromOrigin(
    history,
    history.length - 1,
    horizonSteps,
  );

  return {
    assetId: asset.id,
    symbol: asset.symbol,
    horizon,
    status: "ok",
    sampleCount: absolutePctErrors.length,
    windows: absolutePctErrors.length,
    latestActual,
    latestPredicted: round(latestPredicted),
    meanAbsolutePercentageError: round((mean(absolutePctErrors) ?? 0) * 100),
    rootMeanSquaredError: round(Math.sqrt(mean(squaredPctErrors) ?? 0) * 100),
    directionalAccuracy: round((mean(directionalHits) ?? 0) * 100),
    insufficientHistoryReason: null,
  };
}

function aggregateResults(requestedAssets, backtests, degradedReason) {
  const okResults = backtests.filter((result) => result.status === "ok");
  const assetsCovered = new Set(okResults.map((result) => result.assetId));
  const insufficientHistoryCount = backtests.filter(
    (result) => result.status === "insufficient_history",
  ).length;
  const windows = okResults.reduce((sum, result) => sum + result.windows, 0);

  const weightedMetric = (field) => {
    const weighted = okResults
      .filter(
        (result) =>
          Number.isFinite(result[field]) && Number(result.sampleCount) > 0,
      )
      .reduce(
        (acc, result) => {
          const weight = Number(result.sampleCount) || 0;
          return {
            total: acc.total + Number(result[field]) * weight,
            weight: acc.weight + weight,
          };
        },
        { total: 0, weight: 0 },
      );
    if (!weighted.weight) return null;
    return round(weighted.total / weighted.weight);
  };

  const meanAbsolutePercentageError = weightedMetric("meanAbsolutePercentageError");
  const rootMeanSquaredError = weightedMetric("rootMeanSquaredError");
  const directionalAccuracy = weightedMetric("directionalAccuracy");

  const coverageScore = (assetsCovered.size / Math.max(1, requestedAssets.length)) * 100;
  const directionalScore = directionalAccuracy ?? 0;
  const errorScore =
    meanAbsolutePercentageError === null
      ? 0
      : Math.max(0, 100 - meanAbsolutePercentageError * 2);
  const rmseScore =
    rootMeanSquaredError === null
      ? 0
      : Math.max(0, 100 - rootMeanSquaredError * 1.5);
  const insufficiencyPenalty = Math.min(20, insufficientHistoryCount * 2);
  const score = Math.round(
    clamp(
      directionalScore * 0.45 +
        errorScore * 0.35 +
        rmseScore * 0.1 +
        coverageScore * 0.1 -
        insufficiencyPenalty,
      0,
      100,
    ),
  );

  const quality = forecastQualityLabel(score, insufficientHistoryCount);
  const reasons = [];
  if (degradedReason) reasons.push(degradedReason);
  if (insufficientHistoryCount > 0) {
    reasons.push(
      `${insufficientHistoryCount} horizon lane${insufficientHistoryCount === 1 ? "" : "s"} still need more history before the baseline can cover them.`,
    );
  }
  if (assetsCovered.size < requestedAssets.length) {
    reasons.push(
      `${requestedAssets.length - assetsCovered.size} asset${requestedAssets.length - assetsCovered.size === 1 ? "" : "s"} are not fully covered by the current sparkline window.`,
    );
  }
  if (!okResults.length) {
    reasons.push("No rolling-origin forecast windows were available for scoring.");
  } else if (score < 58) {
    reasons.push("The baseline is still too weak to be treated as production guidance.");
  }

  return {
    provider: {
      id: "native_baseline",
      label: "Native baseline",
      ready: okResults.length > 0,
      requiresCompanion: false,
      confidenceSupported: false,
      supportedHorizons: Object.keys(HORIZON_STEPS),
      degradedReason: reasons[0] ?? null,
    },
    summary: {
      score,
      quality,
      label: forecastQualityText(quality),
      assetsRequested: requestedAssets.length,
      assetsCovered: assetsCovered.size,
      insufficientHistoryCount,
      horizons: Object.keys(HORIZON_STEPS),
      windows,
      meanAbsolutePercentageError,
      rootMeanSquaredError,
      directionalAccuracy,
      reasons,
    },
    universe: {
      assetIds: requestedAssets.map((asset) => asset.id),
      requestedAssets: requestedAssets.length,
      coveredAssets: assetsCovered.size,
      insufficientAssets: Math.max(0, requestedAssets.length - assetsCovered.size),
    },
  };
}

async function loadSparklineUniverse() {
  const requestedAssets = DEFAULT_ASSETS;
  const ids = requestedAssets.map((asset) => asset.id).join(",");
  const cgKey = process.env.COINGECKO_KEY ?? "";
  const keyParam = cgKey ? `&x_cg_demo_api_key=${cgKey}` : "";
  const url =
    `${BASE}/coins/markets?vs_currency=usd&ids=${ids}` +
    `&order=market_cap_desc&per_page=50&sparkline=true${keyParam}`;

  try {
    const response = await cgFetch(url);
    if (!response.ok) {
      return {
        requestedAssets,
        assets: [],
        degradedReason: `CoinGecko returned HTTP ${response.status} while loading sparkline history.`,
      };
    }
    const data = await response.json();
    const byId = new Map((Array.isArray(data) ? data : []).map((row) => [row.id, row]));
    const assets = requestedAssets.map((asset) => {
      const row = byId.get(asset.id);
      return {
        id: asset.id,
        symbol: asset.symbol,
        name: asset.name,
        history: cleanHistory(row?.sparkline_in_7d?.price),
      };
    });
    return {
      requestedAssets,
      assets,
      degradedReason: null,
    };
  } catch (error) {
    return {
      requestedAssets,
      assets: [],
      degradedReason:
        error instanceof Error
          ? error.message
          : "Could not load sparkline history for baseline evaluation.",
    };
  }
}

async function main() {
  const opts = parseArgs();
  const { requestedAssets, assets, degradedReason } = await loadSparklineUniverse();

  const backtests = [];
  for (const asset of assets) {
    for (const [horizon, horizonSteps] of Object.entries(HORIZON_STEPS)) {
      backtests.push(backtestAsset(asset, horizon, horizonSteps));
    }
  }

  const aggregate = aggregateResults(requestedAssets, backtests, degradedReason);
  const report = {
    ts: new Date().toISOString(),
    provider: aggregate.provider,
    universe: aggregate.universe,
    summary: aggregate.summary,
    backtests,
  };

  console.log(
    `Forecast eval score: ${report.summary.score}/100 · ${report.summary.label} · ${report.summary.assetsCovered}/${report.summary.assetsRequested} assets covered`,
  );
  console.log(
    `MAPE=${report.summary.meanAbsolutePercentageError ?? "—"} · RMSE=${report.summary.rootMeanSquaredError ?? "—"} · Directional=${report.summary.directionalAccuracy ?? "—"} · Windows=${report.summary.windows}`,
  );
  for (const result of backtests) {
    if (result.status === "ok") {
      console.log(
        `- [OK] ${result.symbol} ${result.horizon}: mape=${result.meanAbsolutePercentageError} rmse=${result.rootMeanSquaredError} dir=${result.directionalAccuracy} windows=${result.windows}`,
      );
    } else {
      console.log(
        `- [HOLD] ${result.symbol} ${result.horizon}: ${result.insufficientHistoryReason}`,
      );
    }
  }

  if (opts.record) {
    ensureDir(METRICS_DIR);
    try {
      fs.writeFileSync(LATEST_FILE, JSON.stringify(report, null, 2));
      fs.appendFileSync(HISTORY_FILE, `${JSON.stringify(report)}\n`);
      console.log(`Wrote forecast report: ${path.relative(ROOT, LATEST_FILE)}`);
      console.log(`Appended forecast history: ${path.relative(ROOT, HISTORY_FILE)}`);
    } catch (error) {
      console.log(
        `Could not persist forecast report: ${String(error && error.message ? error.message : error)}`,
      );
      process.exit(1);
    }
  }

  if (report.summary.score < opts.minScore) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(
    `Forecast evaluation crashed: ${String(error && error.message ? error.message : error)}`,
  );
  process.exit(1);
});
