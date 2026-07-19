import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  executePredictionMarkets,
  executePriceFeed,
} from "../lib/coreMarketFeedsServer.ts";
import {
  isPredictionMarketsSuccess,
  isPriceMarketsSuccess,
  isPriceSparklinesSuccess,
} from "../lib/coreMarketFeedTypes.ts";

const root = resolve(import.meta.dirname, "..");
const read = (path) => readFileSync(resolve(root, path), "utf8");

const validCoin = {
  id: "bitcoin",
  symbol: "btc",
  current_price: 64000,
  price_change_percentage_24h: 2.25,
  market_cap: 1_200_000_000_000,
  total_volume: 24_000_000_000,
  sparkline_in_7d: { price: [62000, 63000, 64000] },
};

function jsonResponse(value, init = {}) {
  return new Response(JSON.stringify(value), {
    status: 200,
    headers: { "content-type": "application/json" },
    ...init,
  });
}

let observedPriceUrl = "";
const marketResult = await executePriceFeed(
  { mode: "markets", coins: "bitcoin,bitcoin" },
  {
    env: { COINGECKO_KEY: "fixture-auth-value" },
    fetchImpl: async (input) => {
      observedPriceUrl = String(input);
      return jsonResponse([validCoin]);
    },
  },
);
assert.equal(marketResult.status, 200);
assert.equal(marketResult.body.ok, true);
assert.match(observedPriceUrl, /ids=bitcoin/);
assert.match(observedPriceUrl, /x_cg_demo_api_key=fixture-auth-value/);
assert.doesNotMatch(JSON.stringify(marketResult.body), /fixture-auth-value/);
assert.equal(
  marketResult.body.ok && marketResult.body.mode === "markets"
    ? marketResult.body.records[0]?.price
    : null,
  64000,
);

const sparklineResult = await executePriceFeed(
  { mode: "sparklines", coins: "bitcoin" },
  { fetchImpl: async () => jsonResponse([validCoin]) },
);
assert.equal(sparklineResult.status, 200);
assert.deepEqual(
  sparklineResult.body.ok && sparklineResult.body.mode === "sparklines"
    ? sparklineResult.body.records[0]?.prices
    : null,
  [62000, 63000, 64000],
);

let invalidInputFetches = 0;
const invalidMode = await executePriceFeed(
  { mode: "raw", coins: "bitcoin" },
  {
    fetchImpl: async () => {
      invalidInputFetches += 1;
      return jsonResponse([validCoin]);
    },
  },
);
const invalidCoin = await executePriceFeed(
  { mode: "markets", coins: "bitcoin,../secret" },
  {
    fetchImpl: async () => {
      invalidInputFetches += 1;
      return jsonResponse([validCoin]);
    },
  },
);
const tooManyCoins = await executePriceFeed(
  {
    mode: "markets",
    coins: Array.from({ length: 26 }, (_, index) => `coin-${index}`).join(","),
  },
  {
    fetchImpl: async () => {
      invalidInputFetches += 1;
      return jsonResponse([validCoin]);
    },
  },
);
assert.equal(invalidMode.status, 400);
assert.equal(invalidCoin.status, 400);
assert.equal(tooManyCoins.status, 400);
assert.equal(invalidInputFetches, 0);

const malformedPrice = await executePriceFeed(
  { mode: "markets", coins: "bitcoin" },
  {
    fetchImpl: async () =>
      jsonResponse([{ ...validCoin, current_price: "64000" }]),
  },
);
assert.deepEqual(malformedPrice, {
  status: 502,
  body: { ok: false, error: "Crypto prices are temporarily unavailable." },
});

const invalidJsonPrice = await executePriceFeed(
  { mode: "markets", coins: "bitcoin" },
  { fetchImpl: async () => new Response("{", { status: 200 }) },
);
assert.equal(invalidJsonPrice.status, 502);

const oversizedPrice = await executePriceFeed(
  { mode: "markets", coins: "bitcoin" },
  {
    maxResponseBytes: 16,
    fetchImpl: async () =>
      new Response(JSON.stringify([validCoin]), {
        status: 200,
        headers: { "content-length": "4096" },
      }),
  },
);
assert.equal(oversizedPrice.status, 502);

const networkPrice = await executePriceFeed(
  { mode: "markets", coins: "bitcoin" },
  {
    fetchImpl: async () => {
      throw new Error("private upstream detail");
    },
  },
);
assert.equal(networkPrice.status, 502);
assert.doesNotMatch(
  JSON.stringify(networkPrice.body),
  /private upstream detail/,
);

const predictionResult = await executePredictionMarkets({
  fetchImpl: async () =>
    jsonResponse([
      {
        id: "event-1",
        title: "Will verified evidence win?",
        volume: "125000",
        category: "Research",
        endDate: "2026-12-31T00:00:00.000Z",
        markets: [{ outcomePrices: '["0.72","0.28"]' }],
      },
      {
        id: "event-missing-odds",
        title: "Missing odds must not become neutral",
        volume: "500",
        markets: [{}],
      },
    ]),
});
assert.equal(predictionResult.status, 200);
assert.equal(
  predictionResult.body.ok ? predictionResult.body.markets.length : 0,
  1,
);
assert.equal(
  predictionResult.body.ok
    ? predictionResult.body.markets[0]?.probability
    : null,
  72,
);
assert.doesNotMatch(
  JSON.stringify(predictionResult.body),
  /event-missing-odds/,
);

const missingOdds = await executePredictionMarkets({
  fetchImpl: async () =>
    jsonResponse([
      { id: "event-2", title: "No odds", volume: "1", markets: [{}] },
    ]),
});
assert.deepEqual(missingOdds, {
  status: 502,
  body: {
    ok: false,
    error: "Prediction markets are temporarily unavailable.",
  },
});

const providerPredictionFailure = await executePredictionMarkets({
  fetchImpl: async () => jsonResponse({ error: "raw" }, { status: 503 }),
});
assert.equal(providerPredictionFailure.status, 502);
assert.doesNotMatch(JSON.stringify(providerPredictionFailure.body), /raw/);

assert.equal(isPriceMarketsSuccess(marketResult.body), true);
assert.equal(isPriceSparklinesSuccess(sparklineResult.body), true);
assert.equal(isPredictionMarketsSuccess(predictionResult.body), true);
assert.equal(isPriceMarketsSuccess(networkPrice.body), false);
assert.equal(isPredictionMarketsSuccess(missingOdds.body), false);

const [
  priceRoute,
  predictionRoute,
  priceHook,
  priceLoader,
  alphaPage,
  predictionPanel,
  server,
  packageJson,
  task,
  spec,
  lesson,
] = await Promise.all([
  read("app/api/prices/route.ts"),
  read("app/api/polymarket/route.ts"),
  read("hooks/usePrices.ts"),
  read("components/ui/DataLoader.tsx"),
  read("app/alpha/page.tsx"),
  read("components/intel/PolymarketFeed.tsx"),
  read("lib/coreMarketFeedsServer.ts"),
  read("package.json"),
  read("tasks/todo.md"),
  read("specs/features/core-market-feed-truth.md"),
  read("tasks/lessons.md"),
]);

for (const route of [priceRoute, predictionRoute]) {
  assert.match(route, /protectedJson/);
  assert.match(route, /checkRateLimit/);
  assert.match(route, /applyRateLimitHeaders/);
}
assert.doesNotMatch(priceHook, /https?:\/\//);
assert.match(priceHook, /response\.ok/);
assert.match(priceHook, /isPriceMarketsSuccess/);
assert.match(priceHook, /isPriceSparklinesSuccess/);
assert.match(priceHook, /Promise\.allSettled/);
assert.match(priceHook, /requestIdRef/);
assert.match(priceHook, /updateFeedStatus\("prices"/);
assert.match(priceLoader, /showStatus/);
assert.match(priceLoader, /role="alert"/);
assert.match(priceLoader, /Retry prices/);
assert.match(alphaPage, /<PricesLoader showStatus \/>/);
assert.doesNotMatch(predictionPanel, /prob\s*=\s*50/);
assert.doesNotMatch(predictionPanel, /outcomePrices/);
assert.match(predictionPanel, /response\.ok/);
assert.match(predictionPanel, /isPredictionMarketsSuccess/);
assert.match(predictionPanel, /requestIdRef/);
assert.match(predictionPanel, /last verified markets/);
assert.match(predictionPanel, /role="alert"/);
assert.match(predictionPanel, /role="status"/);
assert.match(server, /COINGECKO_KEY/);
assert.match(server, /MAX_COINS = 25/);
assert.match(server, /DEFAULT_MAX_RESPONSE_BYTES/);
assert.match(server, /DEFAULT_TIMEOUT_MS/);
assert.match(packageJson, /core-market-feed:truth:check/);
assert.match(packageJson, /npm run core-market-feed:truth:check/);
assert.match(task, /CORE-MARKET-FEED-TRUTH/);
assert.match(spec, /without a valid first outcome probability are omitted/);
assert.match(lesson, /never invent a neutral quote or probability/);

console.log(
  "ok core-market-feed-truth (closed price inputs, normalized server records, no fabricated odds, retained client data, safe failures, and accessible retry)",
);
