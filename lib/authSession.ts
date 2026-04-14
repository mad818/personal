import type { NextRequest, NextResponse } from "next/server";
import { applyNoStoreHeaders } from "@/lib/cacheHeaders";
import { normalizeTokenCandidate } from "@/lib/authToken";

export const NEXUS_SESSION_COOKIE = "nexus_session_token";
export const NEXUS_SESSION_MAX_AGE_SECONDS = 60 * 60 * 12;

function buildSessionCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}

export function getConfiguredNexusToken() {
  return normalizeTokenCandidate(process.env.NEXUS_TOKEN ?? "");
}

export function isNexusAuthEnabled() {
  return Boolean(getConfiguredNexusToken());
}

export function matchesConfiguredNexusToken(rawCandidate?: string | null) {
  const configured = getConfiguredNexusToken();
  const candidate = normalizeTokenCandidate(rawCandidate ?? "");
  return Boolean(configured && candidate && configured === candidate);
}

export function sanitizeAuthReturnPath(rawPath?: string | null) {
  const fallback = "/hq";
  if (!rawPath) return fallback;
  const trimmed = rawPath.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return fallback;
  if (trimmed.includes("\r") || trimmed.includes("\n")) return fallback;
  if (trimmed.startsWith("/auth/connect")) return fallback;
  return trimmed;
}

function buildRequestOrigin(req: NextRequest) {
  const originHeader = req.headers.get("origin");
  if (originHeader) {
    try {
      return new URL(originHeader).origin;
    } catch {
      // Fall through to host-based reconstruction.
    }
  }

  const forwardedHost = req.headers.get("x-forwarded-host");
  const host = forwardedHost || req.headers.get("host");
  if (host) {
    const protocol =
      req.headers.get("x-forwarded-proto") ||
      req.nextUrl.protocol.replace(/:$/, "") ||
      "http";
    return `${protocol}://${host}`;
  }

  return req.nextUrl.origin;
}

export function buildSafeAuthRedirectUrl(
  req: NextRequest,
  rawPath?: string | null,
) {
  return new URL(sanitizeAuthReturnPath(rawPath), buildRequestOrigin(req));
}

export function buildInternalApiHeaders(headers?: HeadersInit) {
  const nextHeaders = new Headers(headers ?? {});
  const token = getConfiguredNexusToken();
  if (token) {
    nextHeaders.set("Authorization", `Bearer ${token}`);
  }
  return nextHeaders;
}

export function applyAuthNoStoreHeaders(headers: Headers) {
  applyNoStoreHeaders(headers);
  headers.set("Vary", "Cookie");
}

export function clearNexusSessionCookie(response: NextResponse) {
  response.cookies.set(
    NEXUS_SESSION_COOKIE,
    "",
    buildSessionCookieOptions(0),
  );
  applyAuthNoStoreHeaders(response.headers);
}

export function setNexusSessionCookie(
  response: NextResponse,
  token: string,
) {
  response.cookies.set(
    NEXUS_SESSION_COOKIE,
    token,
    buildSessionCookieOptions(NEXUS_SESSION_MAX_AGE_SECONDS),
  );
  applyAuthNoStoreHeaders(response.headers);
}
