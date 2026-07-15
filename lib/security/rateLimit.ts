import { createHash } from "crypto";
import type { NextRequest, NextResponse } from "next/server";
import {
  createDefaultRateLimitStore,
  type PersistentRateLimitStore,
} from "@/lib/security/rateLimitStore";

export interface RateLimitConfig {
  bucket: string;
  maxAttempts: number;
  windowMs: number;
  includeBearerToken?: boolean;
}

declare global {
  // eslint-disable-next-line no-var
  var __NEXUS_RATE_LIMIT_STORE__: PersistentRateLimitStore | undefined;
}

function getRateLimitStore() {
  if (!globalThis.__NEXUS_RATE_LIMIT_STORE__) {
    globalThis.__NEXUS_RATE_LIMIT_STORE__ = createDefaultRateLimitStore();
  }
  return globalThis.__NEXUS_RATE_LIMIT_STORE__;
}

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
  {
    includeBearerToken = false,
  }: Pick<RateLimitConfig, "includeBearerToken"> = {},
) {
  const ip = getDirectClientIp(req);
  const authHeader = req.headers.get("authorization") ?? "";
  const bearer =
    includeBearerToken && authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : "";
  return hashValue(`${ip}:${bearer}`);
}

function normalizedBucketName(bucket: string) {
  const trimmed = bucket.trim();
  return /^[a-z0-9][a-z0-9._-]{0,95}$/i.test(trimmed)
    ? trimmed
    : `bucket-${hashValue(trimmed)}`;
}

export function checkRateLimit(req: NextRequest, config: RateLimitConfig) {
  const identity = getRequestIdentity(req, config);
  const key = `${normalizedBucketName(config.bucket)}:${identity}`;
  return getRateLimitStore().consume(key, config);
}

export function readRateLimitStoreStatus() {
  return getRateLimitStore().getStatus();
}

export function applyRateLimitHeaders(
  response: NextResponse,
  config: RateLimitConfig,
  retryAfterSec?: number,
) {
  response.headers.set("X-RateLimit-Limit", String(config.maxAttempts));
  response.headers.set("X-RateLimit-Window-Ms", String(config.windowMs));
  response.headers.set("X-RateLimit-Store", readRateLimitStoreStatus().mode);
  if (retryAfterSec) {
    response.headers.set("Retry-After", String(retryAfterSec));
  }
  return response;
}
