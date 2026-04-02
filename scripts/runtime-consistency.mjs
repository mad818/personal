#!/usr/bin/env node
/* eslint-disable no-console */

import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local" });

const baseUrl = process.env.NEXUS_RELEASE_BASE_URL ?? "http://127.0.0.1:3000";
const token = process.env.NEXUS_TOKEN ?? "";
const TRANSIENT_STATUSES = new Set([404, 500, 502, 503]);

function fail(message) {
  console.error(`❌ runtime-consistency: ${message}`);
  process.exit(1);
}

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function readJson(
  pathname,
  { auth = false, retries = 8, retryDelayMs = 750 } = {},
) {
  const headers =
    auth && token ? { Authorization: `Bearer ${token}` } : undefined;
  let lastFailure = "unknown";

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}${pathname}`, {
        headers,
        cache: "no-store",
      });

      if (response.ok) {
        return response
          .json()
          .catch(() => fail(`${pathname} returned invalid JSON`));
      }

      lastFailure = `${pathname} expected 200, got ${response.status}`;
      if (!TRANSIENT_STATUSES.has(response.status) || attempt === retries) {
        fail(lastFailure);
      }
    } catch (error) {
      lastFailure = error instanceof Error ? error.message : String(error);
      if (attempt === retries) {
        fail(`${pathname} request failed: ${lastFailure}`);
      }
    }

    await sleep(retryDelayMs);
  }

  fail(lastFailure);
}

function extractRuntime(payload) {
  return payload?.runtime ?? payload?.readiness?.runtime ?? null;
}

function extractBootId(payload) {
  const runtime = extractRuntime(payload);
  return runtime?.bootId ?? runtime?.identity?.bootId ?? null;
}

async function main() {
  console.log(`runtime-consistency against ${baseUrl}`);

  const snapshots = [
    { path: "/api/health", auth: false },
    { path: "/api/auth-diagnostics", auth: false },
    { path: "/api/status", auth: true },
    { path: "/api/diagnostics", auth: true },
  ];

  const results = [];
  for (const snapshot of snapshots) {
    const payload = await readJson(snapshot.path, { auth: snapshot.auth });
    const bootId = extractBootId(payload);
    if (!bootId) {
      fail(`${snapshot.path} did not expose a runtime boot id`);
    }
    results.push({
      path: snapshot.path,
      bootId,
      runtime: extractRuntime(payload),
    });
  }

  const uniqueBootIds = [...new Set(results.map((entry) => entry.bootId))];
  if (uniqueBootIds.length !== 1) {
    fail(
      `boot id drift detected: ${results
        .map((entry) => `${entry.path}=${entry.bootId}`)
        .join(", ")}`,
    );
  }

  const ageSeconds = results
    .map((entry) => Number(entry.runtime?.ageSeconds ?? Number.NaN))
    .filter((value) => Number.isFinite(value));

  if (ageSeconds.length && Math.max(...ageSeconds) - Math.min(...ageSeconds) > 15) {
    fail(
      `runtime age drift too large: ${results
        .map(
          (entry) =>
            `${entry.path}=${entry.runtime?.ageSeconds ?? "unknown"}s`,
        )
        .join(", ")}`,
    );
  }

  console.log(`✅ runtime boot ${uniqueBootIds[0]}`);
  console.log("✅ runtime-consistency passed");
}

main().catch((error) => {
  fail(error instanceof Error ? error.message : String(error));
});
