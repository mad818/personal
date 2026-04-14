import { NextRequest } from "next/server";
import { connectorJson } from "@/lib/connectorResponse";
import { protectedJson } from "@/lib/protectedApi";
import {
  applyRateLimitHeaders,
  checkRateLimit,
} from "@/lib/security/rateLimit";

export const dynamic = "force-dynamic";

const RATE_LIMIT = {
  bucket: "api-recon-tor-check",
  windowMs: 60_000,
  maxAttempts: 20,
  includeBearerToken: false,
} as const;

export async function GET(req: NextRequest) {
  const rateLimit = checkRateLimit(req, RATE_LIMIT);
  if (!rateLimit.ok) {
    const response = protectedJson(
      { error: "Rate limit exceeded. Try again shortly." },
      { status: 429 },
    );
    applyRateLimitHeaders(response, RATE_LIMIT, rateLimit.retryAfterSec);
    return response;
  }

  try {
    const upstream = await fetch("https://check.torproject.org/api/ip", {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(6_000),
      cache: "no-store",
    });

    if (!upstream.ok) {
      const response = connectorJson(
        {
          isTor: null,
          error: `Tor Project returned HTTP ${upstream.status}.`,
        },
        {
          source: "recon-tor-check",
          maxAgeSeconds: 60,
          degraded: true,
          warnings: [`Tor Project returned HTTP ${upstream.status}.`],
          status: 200,
        },
      );
      applyRateLimitHeaders(response, RATE_LIMIT);
      return response;
    }

    const data = (await upstream.json().catch(() => null)) as
      | { IsTor?: boolean }
      | null;

    if (data === null || typeof data.IsTor !== "boolean") {
      const response = connectorJson(
        {
          isTor: null,
          error: "Tor Project returned an invalid payload.",
        },
        {
          source: "recon-tor-check",
          maxAgeSeconds: 60,
          degraded: true,
          warnings: ["Tor Project returned an invalid payload."],
          status: 200,
        },
      );
      applyRateLimitHeaders(response, RATE_LIMIT);
      return response;
    }

    const response = connectorJson(
      {
        isTor: data.IsTor,
      },
      {
        source: "recon-tor-check",
        maxAgeSeconds: 60,
        status: 200,
      },
    );
    applyRateLimitHeaders(response, RATE_LIMIT);
    return response;
  } catch (error) {
    const response = connectorJson(
      {
        isTor: null,
        error:
          error instanceof Error ? error.message : "Tor check is unavailable.",
      },
      {
        source: "recon-tor-check",
        maxAgeSeconds: 60,
        degraded: true,
        warnings: [
          error instanceof Error ? error.message : "Tor check is unavailable.",
        ],
        status: 200,
      },
    );
    applyRateLimitHeaders(response, RATE_LIMIT);
    return response;
  }
}
