#!/usr/bin/env node
/* eslint-disable no-console */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  executeCommodityRates,
  executeFxRates,
} from "../lib/marketRatesServer.ts";
import {
  isCommodityRatesSuccess,
  isFxRatesSuccess,
} from "../lib/marketRatesTypes.ts";

const ROOT = resolve(import.meta.dirname, "..");
const read = (path) => readFileSync(resolve(ROOT, path), "utf8");
const jsonResponse = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

function readRequestUrl(input) {
  return new URL(String(input));
}

const fxPayload = {
  rates: {
    EUR: 0.91,
    GBP: 0.78,
    JPY: 157.2,
    CNY: 7.2,
    CHF: 0.8,
    CAD: 1.36,
    AUD: 1.5,
  },
  time_last_update_utc: "Fri, 18 Jul 2026 00:00:01 +0000",
};
const metalsPayload = [
  { gold: 2400 },
  { silver: 31 },
  { platinum: 980 },
  { copper: 4.5 },
];
const fredPayload = {
  observations: [{ value: "81.25" }, { value: "80.00" }],
};

const validFx = await executeFxRates({
  fetchImpl: async () => jsonResponse(fxPayload),
});
assert.equal(validFx.status, 200);
assert.equal(isFxRatesSuccess(validFx.body), true);
assert.equal(validFx.body.ok, true);
assert.equal(validFx.body.rates.EUR, 0.91);

const malformedFx = await executeFxRates({
  fetchImpl: async () =>
    jsonResponse({ rates: { EUR: 0.91 }, private: "provider detail fixture" }),
});
assert.deepEqual(malformedFx, {
  status: 502,
  body: {
    ok: false,
    error: "FX rates are temporarily unavailable.",
    rates: {},
  },
});
assert.equal(JSON.stringify(malformedFx).includes("provider detail"), false);

const oversizedFx = await executeFxRates({
  fetchImpl: async () => new Response("x".repeat(33)),
  maxResponseBytes: 32,
});
assert.equal(oversizedFx.status, 502);
assert.equal(oversizedFx.body.ok, false);

const networkFx = await executeFxRates({
  fetchImpl: async () => {
    throw new Error("private network failure fixture");
  },
});
assert.equal(networkFx.status, 502);
assert.equal(JSON.stringify(networkFx).includes("private network"), false);

const noFredCalls = [];
const noFred = await executeCommodityRates({
  env: {},
  previousMetalPrices: {},
  fetchImpl: async (input) => {
    noFredCalls.push(String(input));
    return jsonResponse(metalsPayload);
  },
});
assert.equal(noFred.status, 200);
assert.equal(isCommodityRatesSuccess(noFred.body), true);
assert.equal(noFred.body.ok, true);
assert.equal(noFred.body.energyConfigured, false);
assert.deepEqual(noFred.body.sources, {
  metals: "ok",
  energy: "unconfigured",
});
assert.equal(noFred.body.quotes.length, 4);
assert.equal(noFredCalls.length, 1);

const fredKey = "fixture-fred-auth-value";
const partialCalls = [];
const partialEnergy = await executeCommodityRates({
  env: { FRED_KEY: fredKey },
  previousMetalPrices: {},
  fetchImpl: async (input) => {
    const url = readRequestUrl(input);
    partialCalls.push(url);
    if (url.hostname === "api.metals.live") return jsonResponse(metalsPayload);
    if (url.searchParams.get("series_id") === "DCOILWTICO")
      return jsonResponse(fredPayload);
    return new Response("unavailable", { status: 503 });
  },
});
assert.equal(partialEnergy.status, 200);
assert.equal(partialEnergy.body.ok, true);
assert.deepEqual(partialEnergy.body.sources, {
  metals: "ok",
  energy: "partial",
});
assert.equal(partialEnergy.body.quotes.length, 5);
assert.equal(
  partialCalls.filter((url) => url.hostname === "api.stlouisfed.org").length,
  3,
);
assert.equal(JSON.stringify(partialEnergy).includes(fredKey), false);

const energyOnly = await executeCommodityRates({
  env: { FRED_KEY: fredKey },
  previousMetalPrices: {},
  fetchImpl: async (input) =>
    readRequestUrl(input).hostname === "api.metals.live"
      ? new Response("unavailable", { status: 503 })
      : jsonResponse(fredPayload),
});
assert.equal(energyOnly.status, 200);
assert.equal(energyOnly.body.ok, true);
assert.deepEqual(energyOnly.body.sources, {
  metals: "unavailable",
  energy: "ok",
});
assert.equal(energyOnly.body.quotes.length, 3);

const totalOutage = await executeCommodityRates({
  env: {},
  fetchImpl: async () =>
    new Response("provider private fixture", { status: 503 }),
});
assert.deepEqual(totalOutage, {
  status: 502,
  body: {
    ok: false,
    error: "Commodity rates are temporarily unavailable.",
    quotes: [],
    sources: { metals: "unavailable", energy: "unconfigured" },
    energyConfigured: false,
  },
});
assert.equal(JSON.stringify(totalOutage).includes("provider private"), false);
assert.equal(isFxRatesSuccess(malformedFx.body), false);
assert.equal(isCommodityRatesSuccess(totalOutage.body), false);

const component = read("components/ops/MarketRates.tsx");
const fxRoute = read("app/api/fx/route.ts");
const commodityRoute = read("app/api/commodities/route.ts");
const server = read("lib/marketRatesServer.ts");
const clientBoundary = read("lib/clientSettingsBoundary.ts");
const store = read("store/useStore.ts");
const csp = read("lib/security/contentSecurityPolicy.ts");
const cspRuntime = read("scripts/check-content-security-policy-runtime.mjs");
const packageJson = JSON.parse(read("package.json"));
const task = read("tasks/todo.md");
const spec = read("specs/features/market-rates-server-truth.md");
const lessons = read("tasks/lessons.md");

assert.equal(component.includes("https://"), false);
assert.equal(component.includes("fredKey"), false);
assert.equal(component.includes("useStore"), false);
assert.equal(component.includes("fetch("), false);
assert.match(component, /apiFetch\("\/api\/fx"/);
assert.match(component, /apiFetch\("\/api\/commodities"/);
assert.match(component, /Promise\.allSettled/);
assert.match(component, /requestId !== requestIdRef\.current/);
assert.match(component, /showing the last verified rates/);
assert.match(component, /showing the last verified quotes/);
assert.match(component, /role="alert"/);
assert.match(component, /role="status"/);
assert.match(component, /Refresh FX and commodity rates/);

for (const route of [fxRoute, commodityRoute]) {
  assert.match(route, /protectedJson/);
  assert.match(route, /checkRateLimit/);
  assert.match(route, /applyRateLimitHeaders/);
}
assert.match(server, /env\.FRED_KEY/);
assert.match(server, /maxResponseBytes/);
assert.match(server, /AbortSignal\.timeout/);
assert.equal(store.includes("fredKey:"), false);
assert.match(clientBoundary, /"fredKey"/);

for (const host of [
  "api.coingecko.com",
  "services.nvd.nist.gov",
  "api.alternative.me",
  "mempool.space",
  "api.stlouisfed.org",
]) {
  assert.equal(
    csp.includes(host),
    false,
    `Browser CSP still includes ${host}.`,
  );
  assert.equal(
    cspRuntime.includes(host),
    false,
    `CSP fixture still expects ${host}.`,
  );
}

assert.equal(
  packageJson.scripts["market-rates:server-truth:check"],
  "node --no-warnings --experimental-strip-types scripts/validate-market-rates-server-truth.mjs",
);
assert.ok(
  packageJson.scripts.verify.includes("market-rates:server-truth:check"),
);
assert.match(task, /MARKET-RATES-SERVER-TRUTH/);
assert.match(spec, /HTTP 502 only when no verified quote is available/);
assert.match(lessons, /Market-data panels must not carry provider keys/);

console.log(
  "ok market-rates-server-truth (server-only FRED, validated FX, independent commodity sources, retained client data, safe failures, rate limits, and tightened CSP)",
);
