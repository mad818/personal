import type { NextRequest } from "next/server";
import { executePriceFeed } from "@/lib/coreMarketFeedsServer";
import { protectedJson } from "@/lib/protectedApi";
import {
  applyRateLimitHeaders,
  checkRateLimit,
} from "@/lib/security/rateLimit";

export const dynamic = "force-dynamic";

const PRICE_FEED_RATE_LIMIT = {
  bucket: "api-prices",
  windowMs: 60_000,
  maxAttempts: 40,
} as const;

function respond(body: unknown, status: number, retryAfterSec?: number) {
  const response = protectedJson(body, { status });
  applyRateLimitHeaders(response, PRICE_FEED_RATE_LIMIT, retryAfterSec);
  return response;
}

export async function GET(req: NextRequest) {
  const rateLimit = checkRateLimit(req, PRICE_FEED_RATE_LIMIT);
  if (!rateLimit.ok) {
    return respond(
      { ok: false, error: "Price feed rate limit reached. Try again shortly." },
      429,
      rateLimit.retryAfterSec,
    );
  }

  const result = await executePriceFeed({
    mode: req.nextUrl.searchParams.get("mode"),
    coins: req.nextUrl.searchParams.get("coins"),
  });
  return respond(result.body, result.status);
}
