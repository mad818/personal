import type { NextResponse } from "next/server";
import type { NetworkMode } from "@/lib/security/routePolicy";

export const NEXUS_NETWORK_MODE_COOKIE = "nexus_network_mode";
export const NEXUS_HIGH_RISK_COOKIE = "nexus_high_risk_tools";

const POLICY_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

function buildPolicyCookieOptions(maxAge = POLICY_COOKIE_MAX_AGE_SECONDS) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}

export function parseNetworkModeCookie(raw?: string | null): NetworkMode | null {
  const value = String(raw ?? "").trim().toLowerCase();
  if (value === "isolated" || value === "internal" || value === "connected") {
    return value;
  }
  return null;
}

export function parseBooleanPolicyCookie(raw?: string | null): boolean | null {
  const value = String(raw ?? "").trim().toLowerCase();
  if (value === "true") return true;
  if (value === "false") return false;
  return null;
}

export function applyRuntimePolicyCookies(
  response: NextResponse,
  state: {
    networkMode: NetworkMode;
    highRiskEnabled: boolean;
  },
) {
  response.cookies.set(
    NEXUS_NETWORK_MODE_COOKIE,
    state.networkMode,
    buildPolicyCookieOptions(),
  );
  response.cookies.set(
    NEXUS_HIGH_RISK_COOKIE,
    state.highRiskEnabled ? "true" : "false",
    buildPolicyCookieOptions(),
  );
}
