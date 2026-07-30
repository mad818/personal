import type { NextRequest } from "next/server";
import { executeFxRates } from "@/lib/marketRatesServer";
import { protectedJson } from "@/lib/protectedApi";
import {
  applyRateLimitHeaders,
  checkRateLimit,
} from "@/lib/security/rateLimit";

export const dynamic = "force-dynamic";

const FX_RATE_LIMIT = {
  bucket: "api-fx",
  windowMs: 60_000,
  maxAttempts: 30,
} as const;

function respond(body: unknown, status: number, retryAfterSec?: number) {
  const response = protectedJson(body, { status });
  applyRateLimitHeaders(response, FX_RATE_LIMIT, retryAfterSec);
  return response;
}

export async function GET(req: NextRequest) {
  const rateLimit = checkRateLimit(req, FX_RATE_LIMIT);
  if (!rateLimit.ok) {
    return respond(
      {
        ok: false,
        error: "FX rate limit reached. Try again shortly.",
        rates: {},
      },
      429,
      rateLimit.retryAfterSec,
    );
  }
  const result = await executeFxRates();
  return respond(result.body, result.status);
}
