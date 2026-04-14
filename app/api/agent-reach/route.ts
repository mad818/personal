// ── api/agent-reach ──────────────────────────────────────────────────────────
// Proxy to the local Agent Reach Python service (localhost:5051).
// Provides agents with free-tier connectors: Reddit, GitHub Trending, RSS, DDG.
//
// If the service is not running, all calls degrade gracefully with a
// human-readable error — the rest of Nexus continues to work normally.
//
// Start the service:  python scripts/agent-reach-service.py
// See:                docs/deployment/agent-reach.md

import { NextRequest } from "next/server";
import {
  applyRateLimitHeaders,
  checkRateLimit,
} from "@/lib/security/rateLimit";
import {
  buildValidatedSearchParams,
  RequestValidationError,
} from "@/lib/security/inputGuards";
import { assertSafePublicUrl } from "@/lib/security/networkGuards";
import { protectedJson } from "@/lib/protectedApi";

const AGENT_REACH_BASE = process.env.AGENT_REACH_URL ?? "http://127.0.0.1:5051";

// Allowed endpoints — whitelist prevents open proxy abuse
const ALLOWED_PATHS = new Set([
  "/reddit",
  "/github-trending",
  "/rss",
  "/search",
  "/health",
]);

const RATE_LIMIT = {
  bucket: "api-agent-reach",
  windowMs: 60_000,
  maxAttempts: 30,
  includeBearerToken: false,
} as const;

const ENDPOINT_PARAM_SPECS = {
  "/reddit": {
    q: { required: true, maxLength: 200 },
    subreddit: { maxLength: 64, pattern: /^[A-Za-z0-9_]+$/ },
    limit: { pattern: /^(?:[1-9]|1\d|2[0-5])$/ },
    sort: { allowedValues: ["relevance", "new", "hot", "top"] },
  },
  "/github-trending": {
    language: { maxLength: 32, pattern: /^[A-Za-z0-9+#.\-]+$/ },
    since: { allowedValues: ["daily", "weekly", "monthly"] },
    limit: { pattern: /^(?:[1-9]|1\d|2[0-5])$/ },
  },
  "/rss": {
    url: {
      required: true,
      maxLength: 2048,
      normalize: (value: string) =>
        assertSafePublicUrl(value, { allowHttp: true }).toString(),
    },
    limit: { pattern: /^(?:[1-9]|[12]\d|30)$/ },
  },
  "/search": {
    q: { required: true, maxLength: 200 },
  },
  "/health": {},
} as const;

export async function GET(req: NextRequest) {
  const rateLimit = checkRateLimit(req, RATE_LIMIT);
  if (!rateLimit.ok) {
    const response = protectedJson(
      { error: "Rate limit exceeded. Try again shortly." },
      { status: 429 },
    );
    applyRateLimitHeaders(response, RATE_LIMIT, rateLimit.retryAfterSec);
    return response;
  }

  const { searchParams } = req.nextUrl;

  // ?endpoint=/reddit&q=cybersecurity
  const endpoint = searchParams.get("endpoint") ?? "";
  if (!ALLOWED_PATHS.has(endpoint)) {
    const response = protectedJson(
      {
        error: `Unknown endpoint "${endpoint}". Allowed: ${Array.from(ALLOWED_PATHS).join(", ")}`,
      },
      { status: 400 },
    );
    applyRateLimitHeaders(response, RATE_LIMIT);
    return response;
  }

  let forward = new URLSearchParams();
  try {
    const spec =
      ENDPOINT_PARAM_SPECS[
        endpoint as keyof typeof ENDPOINT_PARAM_SPECS
      ] ?? {};
    forward = buildValidatedSearchParams(searchParams, spec);
  } catch (error) {
    const message =
      error instanceof RequestValidationError
        ? error.message
        : "Invalid request parameters.";
    const response = protectedJson({ error: message }, { status: 400 });
    applyRateLimitHeaders(response, RATE_LIMIT);
    return response;
  }

  const target = `${AGENT_REACH_BASE}${endpoint}${forward.size ? `?${forward}` : ""}`;

  try {
    const upstream = await fetch(target, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(12_000),
    });
    const data = (await upstream.json().catch(() => null)) as unknown;
    if (data === null) {
      const response = protectedJson(
        { error: "Agent Reach returned an invalid JSON payload." },
        { status: 502 },
      );
      applyRateLimitHeaders(response, RATE_LIMIT);
      return response;
    }
    const response = protectedJson(data, { status: upstream.status });
    applyRateLimitHeaders(response, RATE_LIMIT);
    return response;
  } catch {
    const response = protectedJson(
      {
        error: "Agent Reach service is not running.",
        hint: "Run `python scripts/agent-reach-service.py` to start it. See docs/deployment/agent-reach.md.",
      },
      { status: 503 },
    );
    applyRateLimitHeaders(response, RATE_LIMIT);
    return response;
  }
}
