#!/usr/bin/env node
/* eslint-disable no-console */
import fs from "fs";
import path from "path";

const root = process.cwd();
const matrixPath = path.join(root, "lib", "release-matrix.json");
const matrix = JSON.parse(fs.readFileSync(matrixPath, "utf8"));
const baseUrl = process.env.NEXUS_RELEASE_BASE_URL ?? "http://127.0.0.1:3000";
const token = process.env.NEXUS_TOKEN ?? "";

const gaSurfaces = matrix.surfaces.filter((surface) => surface.tier === "ga");
const gaNavTabs = matrix.surfaces.filter(
  (surface) => surface.tier === "ga" && surface.kind === "tab",
);

async function check(url, opts = {}) {
  try {
    const res = await fetch(`${baseUrl}${url}`, {
      redirect: "manual",
      ...opts,
    });
    return { ok: res.ok, status: res.status, json: await safeJson(res) };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      json: { error: error instanceof Error ? error.message : String(error) },
    };
  }
}

async function safeJson(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

function fail(message) {
  console.error(`❌ release-smoke: ${message}`);
  process.exit(1);
}

async function main() {
  console.log(`release-smoke against ${baseUrl}`);

  const health = await check("/api/health");
  if (!health.ok) fail(`/api/health returned ${health.status}`);
  console.log(`✅ /api/health ${health.status}`);

  const tokenMetrics = await check("/api/token");
  if (!tokenMetrics.ok) fail(`/api/token GET returned ${tokenMetrics.status}`);
  console.log(`✅ /api/token ${tokenMetrics.status}`);

  const invalidTokenRes = await check("/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: "__invalid_nexus_token__" }),
  });
  if (invalidTokenRes.status !== 401) {
    fail(`/api/token invalid auth expected 401, got ${invalidTokenRes.status}`);
  }
  console.log(`✅ /api/token invalid auth ${invalidTokenRes.status}`);

  if (token) {
    const validTokenRes = await check("/api/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    if (!validTokenRes.ok || validTokenRes.json?.code !== "ok") {
      fail(`/api/token valid auth expected ok, got ${validTokenRes.status}`);
    }
    console.log(`✅ /api/token valid auth ${validTokenRes.status}`);
  }

  for (const surface of gaSurfaces) {
    const res = await check(surface.href);
    if (!res.ok) fail(`${surface.href} returned ${res.status}`);
    console.log(`✅ ${surface.href} ${res.status}`);
  }

  const protectedHeaders = token
    ? { Authorization: `Bearer ${token}` }
    : undefined;

  const statusRes = await check("/api/status", {
    headers: protectedHeaders,
  });
  if (!token) {
    if (![401, 403].includes(statusRes.status)) {
      fail(`/api/status expected auth gate, got ${statusRes.status}`);
    }
    console.log(`✅ /api/status auth gate ${statusRes.status}`);
  } else {
    if (!statusRes.ok) fail(`/api/status returned ${statusRes.status}`);
    const counts = statusRes.json?.readiness?.release?.surfaces?.counts;
    if (!counts || counts.gaNav !== gaNavTabs.length) {
      fail(`/api/status release surface counts mismatch (expected gaNav=${gaNavTabs.length})`);
    }
    console.log(`✅ /api/status ${statusRes.status}`);
  }

  const diagnosticsRes = await check("/api/diagnostics", {
    headers: protectedHeaders,
  });
  if (!token) {
    if (![401, 403].includes(diagnosticsRes.status)) {
      fail(`/api/diagnostics expected auth gate, got ${diagnosticsRes.status}`);
    }
    console.log(`✅ /api/diagnostics auth gate ${diagnosticsRes.status}`);
  } else {
    if (!diagnosticsRes.ok) fail(`/api/diagnostics returned ${diagnosticsRes.status}`);
    console.log(`✅ /api/diagnostics ${diagnosticsRes.status}`);
  }

  console.log("✅ release-smoke passed");
}

main();
