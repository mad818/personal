import { NextRequest } from "next/server";
import {
  applyRateLimitHeaders,
  checkRateLimit,
} from "@/lib/security/rateLimit";
import { protectedJson } from "@/lib/protectedApi";
import {
  getVehicleBridgeSnapshot,
  ingestVehicleBridgePayload,
  validateVehicleBridgeBody,
} from "@/lib/vehicle/bridgeStore";

export const dynamic = "force-dynamic";

const GET_RATE_LIMIT = {
  bucket: "api-vehicle-telemetry-get",
  windowMs: 60_000,
  maxAttempts: 60,
  includeBearerToken: false,
} as const;

const POST_RATE_LIMIT = {
  bucket: "api-vehicle-telemetry-post",
  windowMs: 60_000,
  maxAttempts: 120,
  includeBearerToken: false,
} as const;

export async function GET(req: NextRequest) {
  const rateLimit = checkRateLimit(req, GET_RATE_LIMIT);
  if (!rateLimit.ok) {
    const response = protectedJson(
      { error: "Rate limit exceeded. Try again shortly." },
      { status: 429 },
    );
    applyRateLimitHeaders(response, GET_RATE_LIMIT, rateLimit.retryAfterSec);
    return response;
  }

  const response = protectedJson(getVehicleBridgeSnapshot());
  applyRateLimitHeaders(response, GET_RATE_LIMIT);
  return response;
}

export async function POST(req: NextRequest) {
  const rateLimit = checkRateLimit(req, POST_RATE_LIMIT);
  if (!rateLimit.ok) {
    const response = protectedJson(
      { error: "Rate limit exceeded. Try again shortly." },
      { status: 429 },
    );
    applyRateLimitHeaders(response, POST_RATE_LIMIT, rateLimit.retryAfterSec);
    return response;
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    const response = protectedJson(
      { error: "Request body must be valid JSON." },
      { status: 400 },
    );
    applyRateLimitHeaders(response, POST_RATE_LIMIT);
    return response;
  }

  const parsed = validateVehicleBridgeBody(payload);
  if (!parsed.ok) {
    const response = protectedJson({ error: parsed.message }, { status: 400 });
    applyRateLimitHeaders(response, POST_RATE_LIMIT);
    return response;
  }

  const response = protectedJson(ingestVehicleBridgePayload(parsed.body));
  applyRateLimitHeaders(response, POST_RATE_LIMIT);
  return response;
}
