#!/usr/bin/env node
/* eslint-disable no-console */

import assert from "node:assert/strict";
import { buildContentSecurityPolicy } from "../lib/security/contentSecurityPolicy.ts";
import {
  buildTradingViewEmbedHtml,
  parseTradingViewEmbedKind,
  TRADING_VIEW_EMBED_KINDS,
} from "../lib/security/tradingViewEmbed.ts";

const nonce = "a".repeat(32);

function readDirective(policy, name) {
  const directive = policy
    .split(";")
    .map((value) => value.trim())
    .find((value) => value === name || value.startsWith(`${name} `));
  assert.ok(directive, `Missing ${name} directive.`);
  return directive.split(/\s+/);
}

assert.deepEqual(TRADING_VIEW_EMBED_KINDS, ["ticker", "chart"]);
assert.equal(parseTradingViewEmbedKind("ticker"), "ticker");
assert.equal(parseTradingViewEmbedKind("chart"), "chart");
for (const invalid of [null, undefined, "", "Ticker", "chart/extra", "other"]) {
  assert.equal(parseTradingViewEmbedKind(invalid), null);
}

for (const [kind, scriptName, requiredConfig] of [
  [
    "ticker",
    "embed-widget-ticker-tape.js",
    ['"proName":"BITSTAMP:BTCUSD"', '"displayMode":"adaptive"'],
  ],
  [
    "chart",
    "embed-widget-advanced-chart.js",
    ['"symbol":"BITSTAMP:BTCUSD"', '"interval":"240"'],
  ],
]) {
  const html = buildTradingViewEmbedHtml(kind, nonce);
  assert.ok(html.startsWith("<!doctype html>"));
  assert.ok(html.includes(`data-tradingview-kind="${kind}"`));
  assert.ok(
    html.includes(
      `src="https://s3.tradingview.com/external-embedding/${scriptName}"`,
    ),
  );
  assert.ok(html.includes(`nonce="${nonce}"`));
  assert.ok(html.includes('referrerpolicy="no-referrer"'));
  assert.equal((html.match(/<script\b/g) ?? []).length, 1);
  assert.equal((html.match(/<\/script>/g) ?? []).length, 1);
  for (const value of requiredConfig) assert.ok(html.includes(value));
  assert.equal(html.includes("allow-same-origin"), false);
  assert.equal(html.includes("document.cookie"), false);
}

assert.throws(() => buildTradingViewEmbedHtml("ticker", "bad; nonce"));
assert.throws(() => buildTradingViewEmbedHtml("unknown", nonce));

const defaultPolicy = buildContentSecurityPolicy(nonce, {
  development: false,
});
for (const host of [
  "https://s3.tradingview.com",
  "https://www.tradingview.com",
  "https://s.tradingview.com",
  "https://*.tradingview-widget.com",
]) {
  assert.equal(defaultPolicy.includes(host), false, host);
}
assert.equal(defaultPolicy.includes("sandbox "), false);
assert.equal(defaultPolicy.includes("frame-ancestors"), false);

const embedPolicy = buildContentSecurityPolicy(nonce, {
  development: false,
  tradingViewEmbed: true,
});
assert.deepEqual(readDirective(embedPolicy, "script-src"), [
  "script-src",
  "'self'",
  `'nonce-${nonce}'`,
  "'strict-dynamic'",
  "https://s3.tradingview.com",
]);
assert.deepEqual(readDirective(embedPolicy, "frame-src"), [
  "frame-src",
  "'self'",
  "https://www.tradingview.com",
  "https://s.tradingview.com",
  "https://*.tradingview-widget.com",
]);
assert.deepEqual(readDirective(embedPolicy, "sandbox"), [
  "sandbox",
  "allow-scripts",
  "allow-popups",
  "allow-popups-to-escape-sandbox",
]);
assert.deepEqual(readDirective(embedPolicy, "frame-ancestors"), [
  "frame-ancestors",
  "'self'",
]);
assert.equal(embedPolicy.includes("allow-same-origin"), false);

const developmentPolicy = buildContentSecurityPolicy(nonce, {
  development: true,
  devPort: "3100",
});
assert.ok(
  readDirective(developmentPolicy, "script-src").includes("'unsafe-eval'"),
);
assert.equal(developmentPolicy.includes("s3.tradingview.com"), false);

console.log(
  "ok tradingview-sandbox-runtime (fixed widgets, escaped nonce HTML, default host removal, route-scoped hosts, and opaque sandbox policy)",
);
