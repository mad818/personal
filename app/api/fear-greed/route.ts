import type { NextRequest } from "next/server";
import { createCache } from "@/lib/apiCache";
import { executeFearGreed } from "@/lib/fearGreedServer";
import type { FearGreedSuccess } from "@/lib/fearGreedTypes";
import { protectedJson } from "@/lib/protectedApi";
import {
  applyRateLimitHeaders,
  checkRateLimit,
} from "@/lib/security/rateLimit";

export const dynamic = "force-dynamic";

const FEAR_GREED_RATE_LIMIT = {
  bucket: "api-fear-greed",
  windowMs: 60_000,
  maxAttempts: 20,
} as const;
const cache = createCache<FearGreedSuccess>({
  maxEntries: 1,
  defaultTTL: 3_600_000,
});
const CACHE_KEY = "fear-greed";

function respond(body: unknown, status: number, retryAfterSec?: number) {
  const response = protectedJson(body, { status });
  applyRateLimitHeaders(response, FEAR_GREED_RATE_LIMIT, retryAfterSec);
  return response;
}

export async function GET(req: NextRequest) {
  const rateLimit = checkRateLimit(req, FEAR_GREED_RATE_LIMIT);
  if (!rateLimit.ok) {
    return respond(
      {
        ok: false,
        error: "Sentiment rate limit reached. Try again shortly.",
      },
      429,
      rateLimit.retryAfterSec,
    );
  }

  const cached = cache.get(CACHE_KEY);
  if (cached) return respond(cached, 200);

  const result = await executeFearGreed();
  if (result.status === 200 && result.body.ok) {
    cache.set(CACHE_KEY, result.body);
  }
  return respond(result.body, result.status);
}
