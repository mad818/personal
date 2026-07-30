import type { NextRequest } from "next/server";
import { executePredictionMarkets } from "@/lib/coreMarketFeedsServer";
import { protectedJson } from "@/lib/protectedApi";
import {
  applyRateLimitHeaders,
  checkRateLimit,
} from "@/lib/security/rateLimit";

export const dynamic = "force-dynamic";

const POLYMARKET_RATE_LIMIT = {
  bucket: "api-polymarket",
  windowMs: 60_000,
  maxAttempts: 20,
} as const;

function respond(body: unknown, status: number, retryAfterSec?: number) {
  const response = protectedJson(body, { status });
  applyRateLimitHeaders(response, POLYMARKET_RATE_LIMIT, retryAfterSec);
  return response;
}

export async function GET(req: NextRequest) {
  const rateLimit = checkRateLimit(req, POLYMARKET_RATE_LIMIT);
  if (!rateLimit.ok) {
    return respond(
      {
        ok: false,
        error: "Prediction market rate limit reached. Try again shortly.",
      },
      429,
      rateLimit.retryAfterSec,
    );
  }

  const result = await executePredictionMarkets();
  return respond(result.body, result.status);
}
