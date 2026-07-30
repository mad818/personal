#!/usr/bin/env node
/* eslint-disable no-console */

import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { randomInt } from "node:crypto";
import { spawn } from "node:child_process";

const root = process.cwd();
const host = "127.0.0.1";
const port = String(randomInt(31_000, 32_000));
const baseUrl = `http://${host}:${port}`;
const nextCli = join(root, "node_modules", "next", "dist", "bin", "next");
const buildId = join(root, ".next", "BUILD_ID");
async function stopProcessTree(child) {
  if (!child.pid || child.exitCode !== null) return;

  const exited = new Promise((resolve) => child.once("exit", resolve));
  child.kill("SIGTERM");
  const graceful = await Promise.race([
    exited.then(() => true),
    new Promise((resolve) => setTimeout(() => resolve(false), 3_000)),
  ]);
  if (!graceful && child.exitCode === null) {
    child.kill("SIGKILL");
    await Promise.race([
      exited,
      new Promise((resolve) => setTimeout(resolve, 3_000)),
    ]);
  }
}

async function waitForHealth(child, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`Production server exited with ${child.exitCode}.`);
    }
    try {
      const response = await fetch(`${baseUrl}/api/health`, {
        cache: "no-store",
      });
      if (response.ok) return;
    } catch {
      // The loop owns the bounded retry window while the server starts.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Production server did not become healthy on ${baseUrl}.`);
}

function readNonce(policy) {
  const scriptDirective = policy
    .split(";")
    .map((value) => value.trim())
    .find((value) => value.startsWith("script-src "));
  assert.ok(scriptDirective, "Missing script-src directive.");
  assert.equal(scriptDirective.includes("'unsafe-inline'"), false);
  assert.equal(scriptDirective.includes("'unsafe-eval'"), false);
  assert.ok(scriptDirective.includes("'strict-dynamic'"));
  const match = scriptDirective.match(/'nonce-([^']+)'/g) ?? [];
  assert.equal(match.length, 1, "Expected exactly one script nonce source.");
  return match[0].slice("'nonce-".length, -1);
}

function policyTokenSet(policy) {
  return new Set(
    policy
      .split(";")
      .flatMap((directive) => directive.trim().split(/\s+/))
      .filter(Boolean),
  );
}

function assertDefaultPolicy(policy) {
  for (const host of [
    "https://s3.tradingview.com",
    "https://www.tradingview.com",
    "https://s.tradingview.com",
    "https://*.tradingview-widget.com",
  ]) {
    assert.equal(policyTokenSet(policy).has(host), false, host);
  }
  assert.equal(policy.includes("sandbox "), false);
  assert.equal(policy.includes("frame-ancestors"), false);
}

function assertTradingViewPolicy(policy) {
  assert.ok(policyTokenSet(policy).has("https://s3.tradingview.com"));
  assert.ok(policyTokenSet(policy).has("https://*.tradingview-widget.com"));
  assert.ok(
    policy.includes(
      "sandbox allow-scripts allow-popups allow-popups-to-escape-sandbox",
    ),
  );
  assert.ok(policy.includes("frame-ancestors 'self'"));
  assert.equal(policy.includes("allow-same-origin"), false);
}

function assertRenderedScripts(html, nonce) {
  const scriptTags = html.match(/<script\b[^>]*>/gi) ?? [];
  assert.ok(scriptTags.length > 3, "Expected framework and Nexus script tags.");
  for (const tag of scriptTags) {
    assert.match(tag, new RegExp(`\\snonce=["']${nonce}["']`));
  }
  for (const id of [
    "nexus-persisted-shell-state-boot",
    "nexus-surface-motion-boot",
    "nexus-shell-bootstrap-guard",
  ]) {
    const tag = scriptTags.find((candidate) =>
      candidate.includes(`id="${id}"`),
    );
    assert.ok(tag, `Missing rendered ${id} script.`);
    assert.match(tag, new RegExp(`\\snonce=["']${nonce}["']`));
  }
}

async function readDocument() {
  const response = await fetch(`${baseUrl}/`, {
    cache: "no-store",
    headers: { "Cache-Control": "no-cache" },
  });
  assert.equal(response.status, 200);
  const policy = response.headers.get("content-security-policy") ?? "";
  const nonce = readNonce(policy);
  assertDefaultPolicy(policy);
  assert.equal(response.headers.get("x-frame-options"), "DENY");
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  const html = await response.text();
  assertRenderedScripts(html, nonce);
  return { nonce, policy };
}

async function readTradingViewEmbed(kind) {
  const response = await fetch(
    `${baseUrl}/embeds/tradingview?kind=${encodeURIComponent(kind)}`,
    { cache: "no-store" },
  );
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("x-frame-options"), "SAMEORIGIN");
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.match(
    response.headers.get("content-type") ?? "",
    /^text\/html; charset=utf-8/i,
  );
  assert.ok((response.headers.get("cache-control") ?? "").includes("no-store"));

  const policy = response.headers.get("content-security-policy") ?? "";
  const nonce = readNonce(policy);
  assertTradingViewPolicy(policy);
  const html = await response.text();
  assert.ok(html.includes(`data-tradingview-kind="${kind}"`));
  const scriptTags = html.match(/<script\b[^>]*>/gi) ?? [];
  assert.equal(scriptTags.length, 1);
  assert.match(scriptTags[0], new RegExp(`\\snonce=["']${nonce}["']`));
  assert.match(
    scriptTags[0],
    /src="https:\/\/s3\.tradingview\.com\/external-embedding\/embed-widget-(?:ticker-tape|advanced-chart)\.js"/,
  );
  return nonce;
}

if (!existsSync(buildId)) {
  console.error("Run npm run build before security:csp:production:check.");
  process.exit(1);
}

const child = spawn(
  process.execPath,
  [nextCli, "start", "-H", host, "-p", port],
  {
    cwd: root,
    env: { ...process.env, NODE_ENV: "production" },
    stdio: "ignore",
    windowsHide: true,
  },
);

try {
  await waitForHealth(child);
  const first = await readDocument();
  const second = await readDocument();
  assert.notEqual(first.nonce, second.nonce);
  assert.notEqual(first.policy, second.policy);

  const apiResponse = await fetch(`${baseUrl}/api/health`, {
    cache: "no-store",
  });
  assert.equal(apiResponse.status, 200);
  const apiPolicy = apiResponse.headers.get("content-security-policy") ?? "";
  const apiNonce = readNonce(apiPolicy);
  assertDefaultPolicy(apiPolicy);
  assert.notEqual(apiNonce, first.nonce);
  assert.notEqual(apiNonce, second.nonce);

  const tickerNonce = await readTradingViewEmbed("ticker");
  const chartNonce = await readTradingViewEmbed("chart");
  assert.notEqual(tickerNonce, chartNonce);

  const invalidValue = 'chart"><script>alert(1)</script>';
  const invalidResponse = await fetch(
    `${baseUrl}/embeds/tradingview?kind=${encodeURIComponent(invalidValue)}`,
    { cache: "no-store" },
  );
  assert.equal(invalidResponse.status, 400);
  assert.equal(invalidResponse.headers.get("x-frame-options"), "SAMEORIGIN");
  const invalidPolicy =
    invalidResponse.headers.get("content-security-policy") ?? "";
  readNonce(invalidPolicy);
  assertTradingViewPolicy(invalidPolicy);
  const invalidBody = await invalidResponse.text();
  assert.equal(invalidBody, "Unsupported TradingView widget.");
  assert.equal(invalidBody.includes(invalidValue), false);

  console.log(
    "ok content-security-policy-production (distinct document/API/embed nonces, default host removal, isolated TradingView policy, matching rendered scripts, framing headers, invalid-kind rejection, and preserved security headers)",
  );
} finally {
  await stopProcessTree(child);
}
