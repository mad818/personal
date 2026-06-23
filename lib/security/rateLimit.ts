import { createHash } from "crypto";
import type { NextRequest, NextResponse } from "next/server";

type AttemptWindow = {
  count: number;
  resetAt: number;
};

export interface RateLimitConfig {
  bucket: string;
  maxAttempts: number;
  windowMs: number;
  includeBearerToken?: boolean;
}

const RATE_LIMIT_BUCKETS = new Map<string, AttemptWindow>();

function hashValue(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function trustForwardedClientIp() {
  return process.env.NEXUS_TRUST_PROXY === "true";
}

function getDirectClientIp(req: NextRequest) {
  const forwarded = req.headers.get("x-forwarded-for") ?? "";
  const fromForwarded = forwarded.split(",")[0]?.trim();
  if (trustForwardedClientIp() && fromForwarded) {
    return fromForwarded;
  }

  const realIp = req.headers.get("x-real-ip")?.trim();
  if (trustForwardedClientIp() && realIp) {
    return realIp;
  }

  const cfIp = req.headers.get("cf-connecting-ip")?.trim();
  if (trustForwardedClientIp() && cfIp) {
    return cfIp;
  }

  // Direct LAN clients must not spoof X-Forwarded-For into unique buckets.
  return "direct";
}

export function getRequestIdentity(
  req: NextRequest,
  { includeBearerToken = false }: Pick<RateLimitConfig, "includeBearerToken"> = {},
) {
  const ip = getDirectClientIp(req);
  const authHeader = req.headers.get("authorization") ?? "";
  const bearer =
    includeBearerToken && authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : "";
  return hashValue(`${ip}:${bearer}`);
}

function pruneExpired(now: number) {
  for (const [key, value] of Array.from(RATE_LIMIT_BUCKETS.entries())) {
    if (value.resetAt <= now) RATE_LIMIT_BUCKETS.delete(key);
  }
}

export function checkRateLimit(req: NextRequest, config: RateLimitConfig) {
  const now = Date.now();
  pruneExpired(now);

  const identity = getRequestIdentity(req, config);
  const key = `${config.bucket}:${identity}`;
  const current = RATE_LIMIT_BUCKETS.get(key);

  if (current && current.resetAt > now && current.count >= config.maxAttempts) {
    return {
      ok: false as const,
      retryAfterSec: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    };
  }

  const next =
    current && current.resetAt > now
      ? { count: current.count + 1, resetAt: current.resetAt }
      : { count: 1, resetAt: now + config.windowMs };
  RATE_LIMIT_BUCKETS.set(key, next);

  return {
    ok: true as const,
    remaining: Math.max(0, config.maxAttempts - next.count),
  };
}

export function applyRateLimitHeaders(
  response: NextResponse,
  config: RateLimitConfig,
  retryAfterSec?: number,
) {
  response.headers.set("X-RateLimit-Limit", String(config.maxAttempts));
  response.headers.set("X-RateLimit-Window-Ms", String(config.windowMs));
  if (retryAfterSec) {
    response.headers.set("Retry-After", String(retryAfterSec));
  }
  return response;
}
