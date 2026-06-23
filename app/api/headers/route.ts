// ── api/headers ─────────────────────────────────────────────
// Server-side proxy: fetch HTTP response headers for a URL.
// Client cannot do this directly due to CORS — server fetches and returns.
//
// Security: SSRF prevention — private/loopback IP ranges and non-http(s)
// schemes are blocked before any network request is made.

import { NextRequest, NextResponse } from "next/server";
import {
  applyRateLimitHeaders,
  checkRateLimit,
} from "@/lib/security/rateLimit";
import { requireMasterSessionForAction } from "@/lib/security/masterSession";
import {
  assertPublicResolvableHost,
  isPrivateNetworkHost,
} from "@/lib/security/privateNetwork";

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

const HEADERS_RATE_LIMIT = {
  bucket: "api-headers",
  windowMs: 60_000,
  maxAttempts: 20,
} as const;

export async function GET(req: NextRequest) {
  const masterRequired = await requireMasterSessionForAction(req, {
    action: "tools_networked",
    capability: "networked",
  });
  if (masterRequired) return masterRequired;

  const rateLimit = checkRateLimit(req, HEADERS_RATE_LIMIT);
  if (!rateLimit.ok) {
    const res = NextResponse.json(
      { error: "Rate limit exceeded. Try again shortly." },
      { status: 429 },
    );
    applyRateLimitHeaders(res, HEADERS_RATE_LIMIT, rateLimit.retryAfterSec);
    return res;
  }

  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url");
  if (!url)
    return NextResponse.json({ error: "Missing url param" }, { status: 400 });

  let parsed: URL;
  try {
    parsed = new URL(url.startsWith("http") ? url : `https://${url}`);
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  // Only allow http/https — block file:, ftp:, data:, etc.
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return NextResponse.json(
      { error: "Only http and https URLs are supported." },
      { status: 400 },
    );
  }

  // Block SSRF to private/loopback addresses (literal + DNS rebinding)
  if (isPrivateNetworkHost(parsed.hostname)) {
    return NextResponse.json(
      { error: "Requests to private or loopback addresses are not allowed." },
      { status: 400 },
    );
  }

  try {
    await assertPublicResolvableHost(parsed.hostname);
  } catch {
    return NextResponse.json(
      { error: "Hostname resolves to a private or loopback address." },
      { status: 400 },
    );
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

    const res = NextResponse.json({
      url: parsed.href,
      status: r.status,
      ok: r.ok,
      all,
      security,
    });
    applyRateLimitHeaders(res, HEADERS_RATE_LIMIT);
    return res;
  } catch {
    const res = NextResponse.json(
      { error: "Header probe failed or timed out." },
      { status: 502 },
    );
    applyRateLimitHeaders(res, HEADERS_RATE_LIMIT);
    return res;
  }
}
