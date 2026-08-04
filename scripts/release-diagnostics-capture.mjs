#!/usr/bin/env node
/* eslint-disable no-console */
import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";

const root = process.cwd();
const envLocalPath = path.join(root, ".env.local");
const metricsDir = path.join(root, "docs", "metrics");
const INTERNAL_AUTH_HEADER = "x-nexus-internal-auth";
const DEFAULT_BASE_URL = "http://127.0.0.1:3100";
const DEFAULT_ROUTES = [
  "/api/health",
  "/",
  "/hq?focus=hq-chronicle",
  "/command",
  "/resources",
  "/vehicle",
  "/internal/vehicle",
  "/api/status",
  "/api/diagnostics",
];

function parseArgs(argv) {
  const args = {};

  for (const arg of argv) {
    if (arg.startsWith("--base-url=")) {
      args.baseUrl = arg.slice("--base-url=".length);
    } else if (arg.startsWith("--routes=")) {
      args.routes = arg
        .slice("--routes=".length)
        .split(",")
        .map((route) => route.trim())
        .filter(Boolean);
    } else if (arg.startsWith("--out-dir=")) {
      args.outDir = arg.slice("--out-dir=".length);
    }
  }

  return args;
}

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};

  const result = {};
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;

    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (key) result[key] = value;
  }

  return result;
}

function envValue(key, fileEnv) {
  return process.env[key] ?? fileEnv[key] ?? "";
}

function normalizeBaseUrl(value) {
  return value.replace(/\/+$/, "");
}


function dockerStatus() {
  const result = spawnSync("docker", ["--version"], {
    encoding: "utf8",
    windowsHide: true,
  });

  return {
    expected: true,
    available: result.status === 0,
    status: result.status,
    error: result.error ? result.error.message : null,
    version: result.status === 0 ? result.stdout.trim() : null,
  };
}

async function fetchRoute(baseUrl, route, token) {
  const startedAt = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const headers = token ? { [INTERNAL_AUTH_HEADER]: token } : undefined;
    const response = await fetch(`${baseUrl}${route}`, {
      headers,
      redirect: "manual",
      signal: controller.signal,
    });
    const contentType = response.headers.get("content-type") ?? "";
    const body = await safeBody(response, contentType);

    return {
      route,
      ok: response.ok,
      status: response.status,
      redirected: response.status >= 300 && response.status < 400,
      contentType,
      durationMs: Date.now() - startedAt,
      body,
    };
  } catch (error) {
    return {
      route,
      ok: false,
      status: 0,
      redirected: false,
      contentType: null,
      durationMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function safeBody(response, contentType) {
  try {
    if (contentType.includes("application/json")) {
      const json = await response.json();
      return sanitizeJson(json);
    }

    const text = await response.text();
    return text ? { preview: text.slice(0, 240) } : null;
  } catch {
    return null;
  }
}

function sanitizeJson(value) {
  if (Array.isArray(value)) return value.map(sanitizeJson);

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, nested]) => {
        if (/token|secret|password|key|authorization/i.test(key)) {
          return [key, Boolean(nested)];
        }
        return [key, sanitizeJson(nested)];
      }),
    );
  }

  return value;
}

function buildBlockedReasons({ hasReleaseBaseUrl, hasToken, docker }) {
  const blocked = [];

  if (!hasReleaseBaseUrl) {
    blocked.push("NEXUS_RELEASE_BASE_URL is missing; capture used local fallback.");
  }

  if (!hasToken) {
    blocked.push("NEXUS_TOKEN is missing; protected diagnostics may be auth-gated.");
  }

  if (!docker.available) {
    blocked.push("Docker CLI is unavailable; local container proof remains blocked.");
  }

  return blocked;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const fileEnv = loadEnvFile(envLocalPath);
  const releaseBaseUrl = args.baseUrl ?? envValue("NEXUS_RELEASE_BASE_URL", fileEnv);
  const hasReleaseBaseUrl = Boolean(releaseBaseUrl);
  const baseUrl = normalizeBaseUrl(releaseBaseUrl || DEFAULT_BASE_URL);
  const token = envValue("NEXUS_TOKEN", fileEnv);
  const hasToken = Boolean(token);
  const routes = args.routes ?? DEFAULT_ROUTES;
  const docker = dockerStatus();
  const capturedAt = new Date();
  const routeResults = [];

  for (const route of routes) {
    const result = await fetchRoute(baseUrl, route, token);
    routeResults.push(result);
    const label = result.status === 0 ? "ERR" : result.status;
    console.log(`${route} ${label} ${result.durationMs}ms`);
  }

  const blocked = buildBlockedReasons({ hasReleaseBaseUrl, hasToken, docker });
  const artifact = {
    capturedAt: capturedAt.toISOString(),
    baseUrl,
    baseUrlSource: hasReleaseBaseUrl ? "NEXUS_RELEASE_BASE_URL" : "local-fallback",
    routes: routeResults,
    environment: {
      hasReleaseBaseUrl,
      hasToken,
      dockerExpected: docker.expected,
      dockerAvailable: docker.available,
      node: process.version,
      platform: process.platform,
    },
    blocked,
    releaseProofReady: blocked.length === 0 && routeResults.every((route) => route.ok || route.redirected),
  };

  const outDir = args.outDir ? path.resolve(root, args.outDir) : metricsDir;
  fs.mkdirSync(outDir, { recursive: true });

  const outPath = path.join(outDir, "release-diagnostics-latest.json");
  fs.writeFileSync(outPath, `${JSON.stringify(artifact, null, 2)}\n`);

  console.log(`release diagnostics captured: ${path.relative(root, outPath)}`);

  if (blocked.length > 0) {
    console.log("blocked prerequisites:");
    for (const reason of blocked) console.log(`- ${reason}`);
  }
}

main().catch((error) => {
  console.error("release-diagnostics:capture failed");
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exit(1);
});
