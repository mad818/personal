#!/usr/bin/env node
/* eslint-disable no-console */

const DEFAULT_BASE_URL = "http://127.0.0.1:3100";
const HEALTH_ROUTE = "/api/health";
const DEFAULT_ROUTES = [
  HEALTH_ROUTE,
  "/",
  "/hq?focus=hq-chronicle",
  "/command",
  "/resources",
  "/vehicle",
];

function readOption(argv, name) {
  const prefix = `--${name}=`;
  return argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) ?? "";
}

function normalizeRoute(route) {
  const trimmed = route.trim();
  if (!trimmed) return "";
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

function parseRoutes(argv) {
  const routeArg = readOption(argv, "routes");
  const source = routeArg ? routeArg.split(",") : DEFAULT_ROUTES;
  const routes = source.map(normalizeRoute).filter(Boolean);

  return Array.from(new Set([HEALTH_ROUTE, ...routes]));
}

function resolveBaseUrl(argv) {
  return readOption(argv, "base-url") || process.env.NEXUS_RELEASE_BASE_URL || DEFAULT_BASE_URL;
}

function resolveTimeoutMs(argv) {
  const raw = readOption(argv, "timeout-ms");
  if (!raw) return 15_000;

  const parsed = Number(raw);
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }

  return 15_000;
}

function isHealthyStatus(route, status) {
  if (route === HEALTH_ROUTE) {
    return status === 200;
  }

  if (status >= 200 && status < 400) {
    return true;
  }

  return route.startsWith("/api/") && (status === 401 || status === 403);
}

function statusLabel(route, status) {
  if (route.startsWith("/api/") && route !== HEALTH_ROUTE && (status === 401 || status === 403)) {
    return `${status} AUTH-PROTECTED`;
  }

  return String(status);
}

async function checkRoute(baseUrl, route, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(new URL(route, baseUrl), {
      cache: "no-store",
      redirect: "manual",
      signal: controller.signal,
    });
    const ok = isHealthyStatus(route, response.status);
    console.log(`[runtime-proof] ${route} ${statusLabel(route, response.status)}`);
    return ok;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.log(`[runtime-proof] ${route} ERROR ${message}`);
    return false;
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  const argv = process.argv.slice(2);
  const baseUrl = resolveBaseUrl(argv);
  const timeoutMs = resolveTimeoutMs(argv);
  const routes = parseRoutes(argv);

  console.log(`[runtime-proof] base ${baseUrl}`);

  const results = [];
  for (const route of routes) {
    results.push(await checkRoute(baseUrl, route, timeoutMs));
  }

  if (results.some((ok) => !ok)) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
