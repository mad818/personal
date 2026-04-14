// ── api/headers ─────────────────────────────────────────────
// Server-side proxy: fetch HTTP response headers for a URL.
// Client cannot do this directly due to CORS — server fetches and returns.

import { NextRequest } from "next/server";
import { assertSafePublicUrl } from "@/lib/security/networkGuards";
import {
  applyRateLimitHeaders,
  checkRateLimit,
} from "@/lib/security/rateLimit";
import { protectedJson } from "@/lib/protectedApi";

export const dynamic = "force-dynamic";

const SECURITY_HEADERS = [
  "content-security-policy",
  "strict-transport-security",
  "x-frame-options",
  "x-content-type-options",
  "referrer-policy",
  "permissions-policy",
  "cross-origin-opener-policy",
  "cross-origin-embedder-policy",
  "cross-origin-resource-policy",
  "x-xss-protection",
];

const RATE_LIMIT = {
  bucket: "api-headers",
  windowMs: 60_000,
  maxAttempts: 20,
  includeBearerToken: false,
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

  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url") ?? "";

  let parsed: URL;
  try {
    parsed = assertSafePublicUrl(url, { allowHttp: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Invalid URL parameter.";
    const response = protectedJson({ error: message }, { status: 400 });
    applyRateLimitHeaders(response, RATE_LIMIT);
    return response;
  }

  try {
    const r = await fetch(parsed.href, {
      method: "HEAD",
      redirect: "follow",
      signal: AbortSignal.timeout(8000),
    });

    const all: Record<string, string> = {};
    r.headers.forEach((val, key) => {
      all[key.toLowerCase()] = val;
    });

    const security: Record<string, string | null> = {};
    SECURITY_HEADERS.forEach((h) => {
      security[h] = all[h] ?? null;
    });

    const response = protectedJson({
      url: parsed.href,
      status: r.status,
      ok: r.ok,
      all,
      security,
    });
    applyRateLimitHeaders(response, RATE_LIMIT);
    return response;
  } catch (e) {
    const response = protectedJson(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 502 },
    );
    applyRateLimitHeaders(response, RATE_LIMIT);
    return response;
  }
}
