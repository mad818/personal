import type { NextRequest } from "next/server";
import { executeCommodityRates } from "@/lib/marketRatesServer";
import { protectedJson } from "@/lib/protectedApi";
import {
  applyRateLimitHeaders,
  checkRateLimit,
} from "@/lib/security/rateLimit";

export const dynamic = "force-dynamic";

const COMMODITIES_RATE_LIMIT = {
  bucket: "api-commodities",
  windowMs: 60_000,
  maxAttempts: 30,
} as const;

function respond(body: unknown, status: number, retryAfterSec?: number) {
  const response = protectedJson(body, { status });
  applyRateLimitHeaders(response, COMMODITIES_RATE_LIMIT, retryAfterSec);
  return response;
}

export async function GET(req: NextRequest) {
  const rateLimit = checkRateLimit(req, COMMODITIES_RATE_LIMIT);
  if (!rateLimit.ok) {
    return respond(
      {
        ok: false,
        error: "Commodity rate limit reached. Try again shortly.",
        quotes: [],
        sources: { metals: "unavailable", energy: "unavailable" },
        energyConfigured: false,
      },
      429,
      rateLimit.retryAfterSec,
    );
  }
  const result = await executeCommodityRates();
  return respond(result.body, result.status);
}
