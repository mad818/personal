import { NextRequest } from "next/server";
import { protectedJson } from "@/lib/protectedApi";
import { buildInternalApiHeaders } from "@/lib/authSession";
import {
  applyRateLimitHeaders,
  checkRateLimit,
} from "@/lib/security/rateLimit";
import { assertSafePublicUrl } from "@/lib/security/networkGuards";
import { getRoutePolicy, readNetworkMode } from "@/lib/security/routePolicy";

export const dynamic = "force-dynamic";

const RATE_LIMIT = {
  bucket: "api-network-health-check",
  windowMs: 60_000,
  maxAttempts: 30,
  includeBearerToken: false,
} as const;

type NetworkCheckKind = "local" | "external";

function normalizeLocalApiPath(rawUrl: string) {
  const trimmed = rawUrl.trim();
  if (!trimmed.startsWith("/api/")) {
    throw new Error("Only local /api/* paths are allowed for Nexus route checks.");
  }
  const parsed = new URL(trimmed, "http://localhost");
  if (parsed.hash) {
    throw new Error("Hash fragments are not allowed in local route checks.");
  }
  const normalized = `${parsed.pathname}${parsed.search}`;
  if (parsed.pathname === "/api/network-health/check") {
    throw new Error("Recursive network-health checks are blocked.");
  }
  if (!getRoutePolicy(parsed.pathname)) {
    throw new Error("Unknown local API route.");
  }
  return normalized;
}

async function runLocalRouteCheck(req: NextRequest, rawUrl: string) {
  const path = normalizeLocalApiPath(rawUrl);
  const start = Date.now();
  const response = await fetch(new URL(path, req.nextUrl.origin), {
    method: "GET",
    headers: buildInternalApiHeaders({ Accept: "application/json" }),
    cache: "no-store",
    redirect: "follow",
    signal: AbortSignal.timeout(6_000),
  });
  const ms = Date.now() - start;
  return {
    ok: response.ok,
    kind: "local" as const,
    statusCode: response.status,
    ms,
    note: response.ok ? null : `Local route returned HTTP ${response.status}.`,
    target: path,
  };
}

async function runExternalCheck(rawUrl: string) {
  const mode = readNetworkMode();
  if (mode === "isolated") {
    return {
      ok: false,
      kind: "external" as const,
      statusCode: null,
      ms: null,
      note: "External checks are blocked while Nexus is in isolated mode.",
      target: rawUrl.trim(),
    };
  }

  const parsed = assertSafePublicUrl(rawUrl, { allowHttp: true });
  const start = Date.now();
  const response = await fetch(parsed.toString(), {
    method: "GET",
    headers: {
      Accept: "text/plain,application/json,*/*",
      "User-Agent": "Aegis-Vector NetworkHealth/1.0",
    },
    cache: "no-store",
    redirect: "follow",
    signal: AbortSignal.timeout(6_000),
  });
  const ms = Date.now() - start;
  return {
    ok: response.ok,
    kind: "external" as const,
    statusCode: response.status,
    ms,
    note: response.ok
      ? null
      : `External target returned HTTP ${response.status}.`,
    target: parsed.toString(),
  };
}

function inferKind(rawUrl: string): NetworkCheckKind {
  return rawUrl.trim().startsWith("/api/") ? "local" : "external";
}

export async function POST(req: NextRequest) {
  const rate = await checkRateLimit(req, RATE_LIMIT);
  if (!rate.ok) {
    const response = protectedJson(
      {
        ok: false,
        kind: "external" as const,
        statusCode: null,
        ms: null,
        note: "Rate limited. Try again in a moment.",
        target: "",
      },
      { status: 429 },
    );
    return applyRateLimitHeaders(response, RATE_LIMIT, rate.retryAfterSec);
  }

  let rawUrl = "";
  try {
    const body = (await req.json()) as { url?: string };
    rawUrl = String(body.url ?? "").trim();
    if (!rawUrl) {
      const response = protectedJson(
        {
          ok: false,
          kind: "external" as const,
          statusCode: null,
          ms: null,
          note: "Target URL is required.",
          target: "",
      },
      { status: 400 },
    );
      return applyRateLimitHeaders(response, RATE_LIMIT);
    }

    const result = rawUrl.startsWith("/api/")
      ? await runLocalRouteCheck(req, rawUrl)
      : await runExternalCheck(rawUrl);
    const response = protectedJson(result);
    return applyRateLimitHeaders(response, RATE_LIMIT);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to check target.";
    const response = protectedJson(
      {
        ok: false,
        kind: inferKind(rawUrl),
        statusCode: null,
        ms: null,
        note: message,
        target: rawUrl,
      },
      { status: 400 },
    );
    return applyRateLimitHeaders(response, RATE_LIMIT);
  }
}
