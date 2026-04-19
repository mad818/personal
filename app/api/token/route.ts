// ── api/token ───────────────────────────────────────────────
// Local auth token exchange and minimal session introspection.

import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import {
  applyAuthNoStoreHeaders,
  clearNexusSessionCookie,
  createNexusSession,
  createNexusStepUp,
  getConfiguredNexusToken,
  getNexusSessionState,
  getNexusStepUpState,
  NEXUS_SESSION_COOKIE,
  NEXUS_STEP_UP_COOKIE,
  setNexusSessionCookie,
  setNexusStepUpCookie,
} from "@/lib/authSession";
import { normalizeTokenCandidate } from "@/lib/authToken";

type AttemptInfo = { count: number; resetAt: number };
type TokenCode =
  | "ok"
  | "invalid_token"
  | "rate_limited"
  | "bad_request"
  | "server_error";
type TokenResponse = {
  ok: boolean;
  code: TokenCode;
  retryable: boolean;
  error?: string;
};
const TOKEN_ATTEMPTS = new Map<string, AttemptInfo>();
const TOKEN_METRICS: Record<TokenCode, number> = {
  ok: 0,
  invalid_token: 0,
  rate_limited: 0,
  bad_request: 0,
  server_error: 0,
};
const WINDOW_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 10;

function anonymizeClientId(rawClientId: string): string {
  return createHash("sha256").update(rawClientId).digest("hex");
}

function getClientId(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for") ?? "";
  const rawClientId =
    xff.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    req.headers.get("cf-connecting-ip") ||
    "unknown";
  return anonymizeClientId(rawClientId);
}

function cleanupExpiredAttempts(now: number) {
  TOKEN_ATTEMPTS.forEach((info, clientId) => {
    if (info.resetAt < now) TOKEN_ATTEMPTS.delete(clientId);
  });
}

function tokenJson(body: TokenResponse, status = 200) {
  TOKEN_METRICS[body.code] += 1;
  const response = NextResponse.json(body, { status });
  applyAuthNoStoreHeaders(response.headers);
  return response;
}

export async function GET(req: NextRequest) {
  const authEnabled = Boolean(getConfiguredNexusToken());
  const sessionCookie = req.cookies.get(NEXUS_SESSION_COOKIE)?.value ?? "";
  const stepUpCookie = req.cookies.get(NEXUS_STEP_UP_COOKIE)?.value ?? "";
  const sessionState = await getNexusSessionState(sessionCookie);
  const stepUpState = await getNexusStepUpState(stepUpCookie, sessionCookie);
  const response = NextResponse.json({
    ok: true,
    authEnabled,
    authenticated: authEnabled ? Boolean(sessionState) : true,
    stepUpActive: authEnabled ? Boolean(stepUpState) : true,
    sessionAgeSeconds: sessionState?.ageSeconds ?? null,
    sessionRemainingSeconds: sessionState?.remainingSeconds ?? null,
    stepUpRemainingSeconds: stepUpState?.remainingSeconds ?? null,
  });
  applyAuthNoStoreHeaders(response.headers);
  return response;
}

/**
 * POST /api/token
 *
 * Exchange the Nexus token for a confirmed session.
 * The frontend sends { token } and gets back { ok: true } if valid.
 * This is the equivalent of OpenClaw's dashboard connect flow.
 *
 * The token itself is never sent back, and the browser should not persist the
 * master token after validation. Successful auth relies on the httpOnly session
 * cookie issued by the server.
 */
export async function POST(req: NextRequest) {
  try {
    const now = Date.now();
    cleanupExpiredAttempts(now);

    const clientId = getClientId(req);
    const prev = TOKEN_ATTEMPTS.get(clientId);
    if (prev && now <= prev.resetAt && prev.count >= MAX_ATTEMPTS) {
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((prev.resetAt - now) / 1000),
      );
      const response = tokenJson(
        {
          ok: false,
          code: "rate_limited",
          retryable: true,
          error: "Too many attempts. Try again in a few minutes.",
        },
        429,
      );
      response.headers.set("Retry-After", String(retryAfterSeconds));
      return response;
    }

    const rawBody = (await req.json()) as { token?: unknown; elevate?: unknown };
    const token =
      typeof rawBody.token === "string"
        ? normalizeTokenCandidate(rawBody.token)
        : undefined;
    const elevate = rawBody.elevate === true;
    const serverToken = getConfiguredNexusToken();

    if (!serverToken) {
      return tokenJson(
        {
          ok: false,
          code: "server_error",
          retryable: false,
          error: "Token validation is not configured on the server.",
        },
        500,
      );
    }

    if (!serverToken || !token || token !== serverToken) {
      const active =
        prev && now <= prev.resetAt
          ? { count: prev.count + 1, resetAt: prev.resetAt }
          : { count: 1, resetAt: now + WINDOW_MS };
      TOKEN_ATTEMPTS.set(clientId, active);
      const response = tokenJson(
        { ok: false, code: "invalid_token", retryable: false, error: "Invalid token" },
        401,
      );
      clearNexusSessionCookie(response);
      return response;
    }

    TOKEN_ATTEMPTS.delete(clientId);
    const sessionCookie = req.cookies.get(NEXUS_SESSION_COOKIE)?.value ?? "";
    const existingSession = await getNexusSessionState(sessionCookie);
    const session = existingSession ?? (await createNexusSession());
    if (!session) {
      return tokenJson(
        {
          ok: false,
          code: "server_error",
          retryable: true,
          error: "Session minting failed on the local runtime.",
        },
        500,
      );
    }
    const response = tokenJson({
      ok: true,
      code: "ok",
      retryable: false,
    });
    setNexusSessionCookie(response, session.cookieValue);
    if (elevate) {
      const stepUp = await createNexusStepUp(session.sessionId);
      if (stepUp) {
        setNexusStepUpCookie(response, stepUp.cookieValue);
        response.headers.set("X-Nexus-Step-Up", "armed");
      }
    }
    return response;
  } catch {
    return tokenJson(
      { ok: false, code: "bad_request", retryable: false, error: "Bad request" },
      400,
    );
  }
}
