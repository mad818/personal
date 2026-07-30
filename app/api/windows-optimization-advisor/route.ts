import { NextRequest } from "next/server";
import { protectedJson } from "@/lib/protectedApi";
import {
  applyRateLimitHeaders,
  checkRateLimit,
} from "@/lib/security/rateLimit";
import { collectWindowsOptimizationAdvisor } from "@/lib/windowsOptimizationAdvisorServer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const rateLimitConfig = {
    bucket: "api-windows-optimization-advisor",
    windowMs: 30_000,
    maxAttempts: 6,
    includeBearerToken: false,
  } as const;
  const rateLimit = checkRateLimit(req, rateLimitConfig);
  if (!rateLimit.ok) {
    const response = protectedJson(
      { error: "Windows optimization advisor is rate limited." },
      { status: 429 },
    );
    applyRateLimitHeaders(response, rateLimitConfig, rateLimit.retryAfterSec);
    return response;
  }

  try {
    const response = protectedJson(await collectWindowsOptimizationAdvisor());
    applyRateLimitHeaders(response, rateLimitConfig);
    return response;
  } catch {
    return protectedJson(
      {
        error: "Unable to collect the sanitized Windows optimization posture.",
      },
      { status: 500 },
    );
  }
}
