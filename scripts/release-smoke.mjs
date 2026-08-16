#!/usr/bin/env node
/* eslint-disable no-console */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { parseReleaseTarget } from "./release-diagnostics-capture.mjs";

const root = process.cwd();
const matrixPath = path.join(root, "lib", "release-matrix.json");
const matrix = JSON.parse(fs.readFileSync(matrixPath, "utf8"));
const rawBaseUrl =
  process.env.NEXUS_RELEASE_BASE_URL ?? "http://127.0.0.1:3000";
export function normalizeReleaseSmokeTarget(value) {
  const target = parseReleaseTarget(value);
  return {
    origin: target.origin,
    display: target.local ? target.origin : "https://<staging-target>",
  };
}
const releaseTarget = normalizeReleaseSmokeTarget(rawBaseUrl);
const baseUrl = releaseTarget.origin;
const token = process.env.NEXUS_TOKEN ?? "";
const INTERNAL_AUTH_HEADER = "x-nexus-internal-auth";
export const RELEASE_SMOKE_REQUEST_TIMEOUT_MS = 15_000;
export const RELEASE_SMOKE_MAX_RESPONSE_BYTES = 256 * 1024;

const gaSurfaces = matrix.surfaces.filter((surface) => surface.tier === "ga");
const gaNavTabs = matrix.surfaces.filter(
  (surface) => surface.tier === "ga" && surface.kind === "tab",
);

export async function check(url, opts = {}) {
  try {
    const { signal: callerSignal, ...requestOptions } = opts;
    const timeoutSignal = AbortSignal.timeout(RELEASE_SMOKE_REQUEST_TIMEOUT_MS);
    const signal = callerSignal
      ? AbortSignal.any([callerSignal, timeoutSignal])
      : timeoutSignal;
    const res = await fetch(`${baseUrl}${url}`, {
      redirect: "manual",
      ...requestOptions,
      signal,
    });
    const body = await readBoundedJsonResponse(res);
    return {
      ok: res.ok && body.withinLimit,
      status: res.status,
      json: body.json,
      responseBytes: body.byteLength,
      responseWithinLimit: body.withinLimit,
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      json: { error: error instanceof Error ? error.message : String(error) },
    };
  }
}

export async function readBoundedJsonResponse(
  response,
  maxBytes = RELEASE_SMOKE_MAX_RESPONSE_BYTES,
) {
  const declaredLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    await response.body?.cancel("release smoke response limit exceeded");
    return {
      withinLimit: false,
      byteLength: declaredLength,
      json: null,
    };
  }

  if (!response.body) {
    return { withinLimit: true, byteLength: 0, json: null };
  }

  const reader = response.body.getReader();
  const chunks = [];
  let byteLength = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      byteLength += value.byteLength;
      if (byteLength > maxBytes) {
        await reader.cancel("release smoke response limit exceeded");
        return { withinLimit: false, byteLength, json: null };
      }
      chunks.push(value);
    }
  } catch {
    return { withinLimit: false, byteLength, json: null };
  }

  const body = new Uint8Array(byteLength);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    return {
      withinLimit: true,
      byteLength,
      json: JSON.parse(new TextDecoder().decode(body) || "null"),
    };
  } catch {
    return { withinLimit: true, byteLength, json: null };
  }
}

function fail(message) {
  console.error(`❌ release-smoke: ${message}`);
  process.exit(1);
}

async function main() {
  console.log(`release-smoke against ${releaseTarget.display}`);

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
    ? { [INTERNAL_AUTH_HEADER]: token }
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
      fail(
        `/api/status release surface counts mismatch (expected gaNav=${gaNavTabs.length})`,
      );
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
    if (!diagnosticsRes.ok)
      fail(`/api/diagnostics returned ${diagnosticsRes.status}`);
    console.log(`✅ /api/diagnostics ${diagnosticsRes.status}`);
  }

  console.log("✅ release-smoke passed");
}

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) main();
