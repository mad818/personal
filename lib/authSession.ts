import type { NextRequest, NextResponse } from "next/server";
import { applyNoStoreHeaders } from "@/lib/cacheHeaders";
import { normalizeTokenCandidate } from "@/lib/authToken";

export const NEXUS_SESSION_COOKIE = "nexus_session_token";
export const NEXUS_STEP_UP_COOKIE = "nexus_step_up_token";
export const NEXUS_SESSION_MAX_AGE_SECONDS = 60 * 60 * 12;
export const NEXUS_STEP_UP_MAX_AGE_SECONDS = 60 * 20;
export const NEXUS_INTERNAL_AUTH_HEADER = "x-nexus-internal-auth";
const NEXUS_AUTH_TOKEN_VERSION = "v1";

export type NexusSessionAuthTier = "master" | "phone";

type SessionRecord = {
  cookieValue: string;
  sessionId: string;
  issuedAt: number;
  expiresAt: number;
};

type StepUpRecord = {
  cookieValue: string;
  stepUpId: string;
  sessionId: string;
  issuedAt: number;
  expiresAt: number;
};

function buildSessionCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}

function buildStepUpCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "strict" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function mintOpaqueToken(prefix: "sess" | "step") {
  const bytes = new Uint8Array(18);
  globalThis.crypto.getRandomValues(bytes);
  return `${prefix}_${bytesToHex(bytes)}`;
}

function parseTokenTimestamp(raw: string) {
  const value = Number.parseInt(raw, 10);
  return Number.isFinite(value) && value > 0 ? value : null;
}

function buildSignedPayload(kind: "session" | "step", parts: string[]) {
  return `nexus-${kind}:${parts.join(":")}`;
}

async function signAuthPayload(payload: string) {
  const configuredToken = getConfiguredNexusToken();
  if (!configuredToken) return "";
  const key = await globalThis.crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(configuredToken),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await globalThis.crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payload),
  );
  return bytesToHex(new Uint8Array(signature));
}

async function verifyAuthSignature(
  kind: "session" | "step",
  parts: string[],
  expectedSignature?: string | null,
) {
  const normalizedSignature = normalizeTokenCandidate(expectedSignature ?? "");
  if (!normalizedSignature) return false;
  const actualSignature = await signAuthPayload(buildSignedPayload(kind, parts));
  return Boolean(actualSignature && actualSignature === normalizedSignature);
}

function normalizeCookieToken(rawValue?: string | null) {
  return normalizeTokenCandidate(rawValue ?? "");
}

function parseSignedToken(rawValue?: string | null) {
  const token = normalizeCookieToken(rawValue);
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length < 3 || parts[0] !== NEXUS_AUTH_TOKEN_VERSION) {
    return null;
  }
  return {
    token,
    body: parts.slice(1, -1),
    signature: parts[parts.length - 1] ?? "",
  };
}

export async function createNexusSession(
  authTier: NexusSessionAuthTier = "master",
) {
  const issuedAt = Date.now();
  const expiresAt = issuedAt + NEXUS_SESSION_MAX_AGE_SECONDS * 1000;
  const sessionId = mintOpaqueToken("sess");
  const tier = authTier === "phone" ? "phone" : "master";
  const body = [sessionId, String(issuedAt), String(expiresAt), tier];
  const signature = await signAuthPayload(buildSignedPayload("session", body));
  if (!signature) return null;
  return {
    cookieValue: [NEXUS_AUTH_TOKEN_VERSION, ...body, signature].join("."),
    sessionId,
    issuedAt,
    expiresAt,
    authTier: tier,
  };
}

export async function createNexusStepUp(sessionId: string) {
  if (!sessionId) return null;
  const issuedAt = Date.now();
  const expiresAt = issuedAt + NEXUS_STEP_UP_MAX_AGE_SECONDS * 1000;
  const stepUpId = mintOpaqueToken("step");
  const body = [sessionId, stepUpId, String(issuedAt), String(expiresAt)];
  const signature = await signAuthPayload(buildSignedPayload("step", body));
  if (!signature) return null;
  return {
    cookieValue: [NEXUS_AUTH_TOKEN_VERSION, ...body, signature].join("."),
    sessionId,
    stepUpId,
    issuedAt,
    expiresAt,
  };
}

export async function getNexusSessionState(rawSessionCookie?: string | null) {
  const parsed = parseSignedToken(rawSessionCookie);
  if (!parsed) return null;

  let sessionId = "";
  let issuedAtRaw = "";
  let expiresAtRaw = "";
  let authTier: NexusSessionAuthTier = "master";
  let signBody: string[];

  if (parsed.body.length === 3) {
    [sessionId, issuedAtRaw, expiresAtRaw] = parsed.body;
    signBody = parsed.body;
  } else if (parsed.body.length === 4) {
    const [sid, issued, expires, tierRaw] = parsed.body;
    sessionId = sid;
    issuedAtRaw = issued;
    expiresAtRaw = expires;
    authTier = tierRaw === "phone" ? "phone" : "master";
    signBody = parsed.body;
  } else {
    return null;
  }

  const issuedAt = parseTokenTimestamp(issuedAtRaw);
  const expiresAt = parseTokenTimestamp(expiresAtRaw);
  if (!sessionId || !issuedAt || !expiresAt || expiresAt <= issuedAt) return null;
  const now = Date.now();
  if (expiresAt <= now) return null;
  const validSignature = await verifyAuthSignature(
    "session",
    signBody,
    parsed.signature,
  );
  if (!validSignature) return null;
  return {
    sessionId,
    cookieValue: parsed.token,
    issuedAt,
    expiresAt,
    authTier,
    ageSeconds: Math.max(0, Math.floor((now - issuedAt) / 1000)),
    remainingSeconds: Math.max(0, Math.ceil((expiresAt - now) / 1000)),
  };
}

export async function getNexusStepUpState(
  rawStepUpCookie?: string | null,
  rawSessionCookie?: string | null,
) {
  const sessionState = await getNexusSessionState(rawSessionCookie);
  if (!sessionState) return null;
  if (sessionState.authTier === "phone") return null;
  const parsed = parseSignedToken(rawStepUpCookie);
  if (!parsed || parsed.body.length !== 4) return null;
  const [sessionId, stepUpId, issuedAtRaw, expiresAtRaw] = parsed.body;
  const issuedAt = parseTokenTimestamp(issuedAtRaw);
  const expiresAt = parseTokenTimestamp(expiresAtRaw);
  if (
    !sessionId ||
    !stepUpId ||
    !issuedAt ||
    !expiresAt ||
    expiresAt <= issuedAt ||
    sessionId !== sessionState.sessionId
  ) {
    return null;
  }
  const now = Date.now();
  if (expiresAt <= now) return null;
  const validSignature = await verifyAuthSignature(
    "step",
    [sessionId, stepUpId, issuedAtRaw, expiresAtRaw],
    parsed.signature,
  );
  if (!validSignature) return null;
  return {
    cookieValue: parsed.token,
    stepUpId,
    sessionId,
    issuedAt,
    expiresAt,
    ageSeconds: Math.max(0, Math.floor((now - issuedAt) / 1000)),
    remainingSeconds: Math.max(0, Math.ceil((expiresAt - now) / 1000)),
  };
}

export async function hasAuthenticatedNexusSession(rawSessionCookie?: string | null) {
  return Boolean(await getNexusSessionState(rawSessionCookie));
}

export async function hasActiveNexusStepUp(
  rawStepUpCookie?: string | null,
  rawSessionCookie?: string | null,
) {
  return Boolean(await getNexusStepUpState(rawStepUpCookie, rawSessionCookie));
}

export function getConfiguredNexusToken() {
  return normalizeTokenCandidate(process.env.NEXUS_TOKEN ?? "");
}

export function getConfiguredNexusPhoneToken() {
  return normalizeTokenCandidate(process.env.NEXUS_PHONE_TOKEN ?? "");
}

export function isNexusPhoneTokenConfigured() {
  const phone = getConfiguredNexusPhoneToken();
  const master = getConfiguredNexusToken();
  return Boolean(phone && phone !== master);
}

export function resolveConfiguredLoginToken(rawCandidate?: string | null): {
  ok: boolean;
  tier: NexusSessionAuthTier;
} {
  const candidate = normalizeTokenCandidate(rawCandidate ?? "");
  if (!candidate) return { ok: false, tier: "master" };
  const master = getConfiguredNexusToken();
  if (master && candidate === master) {
    return { ok: true, tier: "master" };
  }
  const phone = getConfiguredNexusPhoneToken();
  if (phone && phone !== master && candidate === phone) {
    return { ok: true, tier: "phone" };
  }
  return { ok: false, tier: "master" };
}

export function isNexusAuthEnabled() {
  return Boolean(getConfiguredNexusToken());
}

export function matchesConfiguredNexusToken(rawCandidate?: string | null) {
  const configured = getConfiguredNexusToken();
  const candidate = normalizeTokenCandidate(rawCandidate ?? "");
  return Boolean(configured && candidate && configured === candidate);
}

function normalizeHostCandidate(rawValue?: string | null) {
  const value = rawValue?.trim();
  if (!value) return null;
  try {
    const parsed = new URL(value);
    if (parsed.host) {
      return parsed.host.toLowerCase();
    }
  } catch {
    // Fall through to plain host normalization below.
  }
  return value.replace(/^https?:\/\//i, "").replace(/\/.*$/, "").toLowerCase();
}

export function isTrustedInternalHost(rawHost?: string | null) {
  const host = normalizeHostCandidate(rawHost);
  if (!host) return false;
  if (
    host === "localhost" ||
    host.startsWith("localhost:") ||
    host === "127.0.0.1" ||
    host.startsWith("127.0.0.1:") ||
    host === "[::1]" ||
    host.startsWith("[::1]:")
  ) {
    return true;
  }

  const configuredReleaseHost = normalizeHostCandidate(
    process.env.NEXUS_RELEASE_BASE_URL ?? "",
  );
  return Boolean(configuredReleaseHost && configuredReleaseHost === host);
}

export function resolveInternalServiceOrigin() {
  const configured = process.env.NEXUS_RELEASE_BASE_URL?.trim();
  if (configured) {
    try {
      const url = new URL(configured);
      if (url.protocol === "http:" || url.protocol === "https:") {
        return url.origin;
      }
    } catch {
      // Fall back to the fixed local runtime origin below.
    }
  }

  const port = process.env.PORT?.trim() || "3000";
  return `http://127.0.0.1:${port}`;
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
    nextHeaders.set(NEXUS_INTERNAL_AUTH_HEADER, token);
  }
  return nextHeaders;
}

export function applyAuthNoStoreHeaders(headers: Headers) {
  applyNoStoreHeaders(headers);
  headers.set("Vary", `Cookie, ${NEXUS_INTERNAL_AUTH_HEADER}`);
}

export function clearNexusSessionCookie(response: NextResponse) {
  response.cookies.set(
    NEXUS_SESSION_COOKIE,
    "",
    buildSessionCookieOptions(0),
  );
  response.cookies.set(
    NEXUS_STEP_UP_COOKIE,
    "",
    buildStepUpCookieOptions(0),
  );
  applyAuthNoStoreHeaders(response.headers);
}

export function setNexusSessionCookie(
  response: NextResponse,
  sessionCookieValue: string,
) {
  response.cookies.set(
    NEXUS_SESSION_COOKIE,
    sessionCookieValue,
    buildSessionCookieOptions(NEXUS_SESSION_MAX_AGE_SECONDS),
  );
  applyAuthNoStoreHeaders(response.headers);
}

export function setNexusStepUpCookie(
  response: NextResponse,
  stepUpCookieValue: string,
) {
  response.cookies.set(
    NEXUS_STEP_UP_COOKIE,
    stepUpCookieValue,
    buildStepUpCookieOptions(NEXUS_STEP_UP_MAX_AGE_SECONDS),
  );
  applyAuthNoStoreHeaders(response.headers);
}
