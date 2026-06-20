// ── api/recon/username-enum ──────────────────────────────────
// Server-side username enumeration across the pinned WhatsMyName manifest.
// Protected by middleware (NEXUS_TOKEN session). Rate-limited.
// Max 30 sites per request, default 25, bounded concurrency 5.

import { NextRequest, NextResponse } from "next/server";
import {
  checkUsername,
  normalizeUsername,
  formatUsernameEnumResults,
  USERNAME_ENUM_LIMITS,
} from "@/lib/recon/usernameEnum";
import {
  applyRateLimitHeaders,
  checkRateLimit,
} from "@/lib/security/rateLimit";

export const dynamic = "force-dynamic";

const RATE_CONFIG = {
  bucket: "recon-username-enum",
  maxAttempts: 6,
  windowMs: 60_000,
} as const;

export async function POST(req: NextRequest): Promise<NextResponse> {
  const rl = checkRateLimit(req, RATE_CONFIG);
  if (!rl.ok) {
    const res = NextResponse.json(
      { error: "Rate limit exceeded", retryAfterSec: rl.retryAfterSec },
      { status: 429 },
    );
    applyRateLimitHeaders(res, RATE_CONFIG, rl.retryAfterSec);
    return res;
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (
    typeof body !== "object" ||
    body === null ||
    typeof (body as Record<string, unknown>).username !== "string"
  ) {
    return NextResponse.json(
      { error: "Missing required field: username" },
      { status: 400 },
    );
  }

  const raw = (body as Record<string, unknown>).username as string;
  const rawMax = (body as Record<string, unknown>).maxSites;
  const maxSites =
    typeof rawMax === "number"
      ? Math.min(
          Math.max(1, Math.floor(rawMax)),
          USERNAME_ENUM_LIMITS.absoluteMaxSites,
        )
      : USERNAME_ENUM_LIMITS.defaultMaxSites;

  let username: string;
  try {
    username = normalizeUsername(raw);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Invalid username" },
      { status: 400 },
    );
  }

  let results;
  try {
    results = await checkUsername(username, { maxSites });
  } catch (err) {
    return NextResponse.json(
      { error: "Scan failed", detail: err instanceof Error ? err.message : String(err) },
      { status: 502 },
    );
  }

  const found = results.filter((r) => r.found).length;
  const html = formatUsernameEnumResults(results, username);

  const res = NextResponse.json({
    username,
    checked: results.length,
    found,
    results,
    html,
  });

  applyRateLimitHeaders(res, RATE_CONFIG);
  res.headers.set("Cache-Control", "no-store");
  return res;
}
