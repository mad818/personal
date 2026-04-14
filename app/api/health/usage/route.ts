// ── api/health/usage ─────────────────────────────────────────────────────────
// Live usage snapshot: RPM counters, daily quotas, session spend, paid audit log.
//
// GET /api/health/usage
//   Response: UsageSnapshot from lib/aiUsageGuard
//   Rate-limited: 20 req / 10 s  (same budget as /api/health/providers)
//   Cache-Control: no-store      (always fresh — RPM windows change every second)
//
// Security:
//   - No API keys, secrets, or env values are exposed
//   - Paid audit log contains only estimated token counts and costs — no content
//   - Rate-limited to prevent scraping

import { NextRequest } from "next/server";
import {
  applyRateLimitHeaders,
  checkRateLimit,
} from "@/lib/security/rateLimit";
import { getUsageSnapshot } from "@/lib/aiUsageGuard";
import { protectedJson } from "@/lib/protectedApi";

const RATE_LIMIT_CONFIG = {
  bucket:            "api-health-usage",
  windowMs:          10_000,   // 10 s
  maxAttempts:       20,
  includeBearerToken: true,
} as const;

export async function GET(req: NextRequest) {
  // ── Rate limit ──────────────────────────────────────────────────────────────
  const rateLimit = checkRateLimit(req, RATE_LIMIT_CONFIG);
  if (!rateLimit.ok) {
    const res = protectedJson(
      { error: { message: "Rate limit exceeded. Try again shortly." } },
      { status: 429 },
    );
    applyRateLimitHeaders(res, RATE_LIMIT_CONFIG, rateLimit.retryAfterSec);
    return res;
  }

  // ── Build snapshot ──────────────────────────────────────────────────────────
  const snapshot = getUsageSnapshot();

  const res = protectedJson(snapshot);

  applyRateLimitHeaders(res, RATE_LIMIT_CONFIG);
  return res;
}
