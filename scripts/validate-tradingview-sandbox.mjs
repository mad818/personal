#!/usr/bin/env node
/* eslint-disable no-console */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";

const root = process.cwd();
const findings = [];

function read(relativePath) {
  return readFileSync(join(root, relativePath), "utf8");
}

function fail(message) {
  findings.push(message);
}

function requireText(source, value, label) {
  if (!source.includes(value)) fail(`${label} is missing ${value}`);
}

function requireNormalizedText(source, value, label) {
  const normalizedSource = source.replace(/\s+/g, " ");
  const normalizedValue = value.replace(/\s+/g, " ");
  if (!normalizedSource.includes(normalizedValue)) {
    fail(`${label} is missing ${normalizedValue}`);
  }
}

function jsxAttributeNames(source, file) {
  const sourceFile = ts.createSourceFile(
    file,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const iframeAttributes = [];
  function visit(node) {
    const opening = ts.isJsxSelfClosingElement(node)
      ? node
      : ts.isJsxElement(node)
        ? node.openingElement
        : null;
    if (opening?.tagName.getText() === "iframe") {
      iframeAttributes.push(
        opening.attributes.properties
          .filter(ts.isJsxAttribute)
          .map((attribute) => attribute.name.getText()),
      );
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
  return iframeAttributes;
}

const requiredFiles = [
  "app/embeds/tradingview/route.ts",
  "components/alpha/TradingViewMarkets.tsx",
  "lib/security/tradingViewEmbed.ts",
  "scripts/check-tradingview-sandbox-runtime.mjs",
  "scripts/validate-tradingview-sandbox.mjs",
  "docs/security/tradingview-sandbox.md",
  "specs/features/tradingview-sandbox-isolation.md",
];
for (const file of requiredFiles) {
  if (!existsSync(join(root, file)))
    fail(`Missing TradingView sandbox file: ${file}`);
}

const component = read("components/alpha/TradingViewMarkets.tsx");
const embed = read("lib/security/tradingViewEmbed.ts");
const route = read("app/embeds/tradingview/route.ts");
const policy = read("lib/security/contentSecurityPolicy.ts");
const middleware = read("middleware.ts");
const nextConfig = read("next.config.js");
const productionCheck = read(
  "scripts/check-content-security-policy-production.mjs",
);
const packageJson = JSON.parse(read("package.json"));
const todo = read("tasks/todo.md");
const lessons = read("tasks/lessons.md");

for (const forbidden of [
  'document.createElement("script")',
  ".innerHTML",
  ".appendChild(",
  "IntersectionObserver",
  "s3.tradingview.com",
  "allow-same-origin",
  "integrity=",
]) {
  if (component.includes(forbidden)) {
    fail(`TradingViewMarkets.tsx must not include ${forbidden}`);
  }
}
for (const value of [
  '"allow-scripts allow-popups allow-popups-to-escape-sandbox"',
  "src={`/embeds/tradingview?kind=${kind}`}",
  'referrerPolicy="no-referrer"',
  'loading="lazy"',
  'kind: "ticker" | "chart"',
  'kind="ticker"',
  'kind="chart"',
]) {
  requireText(component, value, "TradingViewMarkets.tsx");
}
const iframeAttributes = jsxAttributeNames(
  component,
  "components/alpha/TradingViewMarkets.tsx",
);
if (iframeAttributes.length !== 1) {
  fail(
    `Expected one shared TradingView iframe declaration, found ${iframeAttributes.length}.`,
  );
} else {
  for (const attribute of [
    "src",
    "title",
    "sandbox",
    "referrerPolicy",
    "loading",
    "allowFullScreen",
  ]) {
    if (!iframeAttributes[0].includes(attribute)) {
      fail(`TradingView iframe is missing ${attribute}.`);
    }
  }
}

for (const value of [
  'TRADING_VIEW_EMBED_KINDS = ["ticker", "chart"]',
  "parseTradingViewEmbedKind",
  "assertContentSecurityPolicyNonce(nonce)",
  "serializeScriptData",
  'replaceAll("<", "\\\\u003c")',
  "embed-widget-ticker-tape.js",
  "embed-widget-advanced-chart.js",
  'referrerpolicy="no-referrer"',
]) {
  requireText(embed, value, "tradingViewEmbed.ts");
}
for (const value of [
  "parseTradingViewEmbedKind",
  "CONTENT_SECURITY_POLICY_NONCE_HEADER",
  "buildTradingViewEmbedHtml(kind, nonce)",
  '"Cache-Control": "private, no-store, max-age=0"',
  '"Content-Type": "text/html; charset=utf-8"',
  "Unsupported TradingView widget.",
]) {
  requireNormalizedText(route, value, "TradingView route");
}

for (const value of [
  "tradingViewEmbed?: boolean",
  "if (options.tradingViewEmbed)",
  'scriptSrc.push("https://s3.tradingview.com")',
  '"https://*.tradingview-widget.com"',
  '"sandbox allow-scripts allow-popups allow-popups-to-escape-sandbox"',
  "\"frame-ancestors 'self'\"",
]) {
  requireText(policy, value, "contentSecurityPolicy.ts");
}
requireNormalizedText(
  middleware,
  "tradingViewEmbed: pathname === '/embeds/tradingview'",
  "middleware.ts",
);
const denyIndex = nextConfig.indexOf(
  "{ key: 'X-Frame-Options',        value: 'DENY' }",
);
const sameOriginIndex = nextConfig.indexOf(
  "headers: [{ key: 'X-Frame-Options', value: 'SAMEORIGIN' }]",
);
if (!(denyIndex >= 0 && sameOriginIndex > denyIndex)) {
  fail(
    "next.config.js must apply the exact SAMEORIGIN embed override after global DENY.",
  );
}

for (const value of [
  'readTradingViewEmbed("ticker")',
  'readTradingViewEmbed("chart")',
  "allow-popups-to-escape-sandbox",
  "allow-same-origin",
  "SAMEORIGIN",
]) {
  requireText(productionCheck, value, "production CSP check");
}

if (
  packageJson.scripts?.["security:tradingview"] !==
  "node scripts/validate-tradingview-sandbox.mjs && npm run security:tradingview:runtime"
) {
  fail("package.json security:tradingview wiring drifted.");
}
if (
  packageJson.scripts?.["security:tradingview:runtime"] !==
  "node --no-warnings --experimental-strip-types scripts/check-tradingview-sandbox-runtime.mjs"
) {
  fail("package.json security:tradingview:runtime wiring drifted.");
}
requireText(
  packageJson.scripts?.verify ?? "",
  "npm run security:tradingview",
  "verify",
);
requireText(todo, "TRADINGVIEW-SANDBOX-ISOLATION", "task queue");
requireText(lessons.toLowerCase(), "third-party widget scripts", "lessons");

if (findings.length > 0) {
  console.error(
    `TradingView sandbox validation found ${findings.length} issue(s):`,
  );
  for (const finding of findings) console.error(`- ${finding}`);
  process.exit(1);
}

console.log(
  "TradingView sandbox OK (fixed iframe route, opaque sandbox, scoped CSP hosts, and same-origin framing override).",
);
