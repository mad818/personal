import type { NextRequest } from "next/server";
import { protectedJson } from "@/lib/protectedApi";
import { executeReconLookup } from "@/lib/reconLookupServer";
import {
  applyRateLimitHeaders,
  checkRateLimit,
} from "@/lib/security/rateLimit";

export const dynamic = "force-dynamic";

const RECON_LOOKUP_RATE_LIMIT = {
  bucket: "api-recon-lookup",
  windowMs: 60_000,
  maxAttempts: 30,
} as const;
const MAX_REQUEST_BYTES = 4 * 1024;

function respond(body: unknown, status: number, retryAfterSec?: number) {
  const response = protectedJson(body, { status });
  applyRateLimitHeaders(response, RECON_LOOKUP_RATE_LIMIT, retryAfterSec);
  return response;
}

export async function POST(req: NextRequest) {
  const rateLimit = checkRateLimit(req, RECON_LOOKUP_RATE_LIMIT);
  if (!rateLimit.ok) {
    return respond(
      {
        ok: false,
        code: "rate_limited",
        error: "The RECON lookup rate limit was reached.",
      },
      429,
      rateLimit.retryAfterSec,
    );
  }

  const declaredLength = Number.parseInt(
    req.headers.get("content-length") ?? "",
    10,
  );
  if (Number.isFinite(declaredLength) && declaredLength > MAX_REQUEST_BYTES) {
    return respond(
      {
        ok: false,
        code: "invalid_request",
        error: "Invalid RECON lookup request.",
      },
      413,
    );
  }

  let input: unknown;
  try {
    const text = await req.text();
    if (new TextEncoder().encode(text).byteLength > MAX_REQUEST_BYTES) {
      return respond(
        {
          ok: false,
          code: "invalid_request",
          error: "Invalid RECON lookup request.",
        },
        413,
      );
    }
    input = JSON.parse(text) as unknown;
  } catch {
    return respond(
      {
        ok: false,
        code: "invalid_request",
        error: "Invalid RECON lookup request.",
      },
      400,
    );
  }

  const result = await executeReconLookup(input);
  return respond(result.body, result.status);
}
