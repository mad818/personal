import { NextRequest, NextResponse } from "next/server";
import {
  getConfiguredNexusToken,
  NEXUS_SESSION_COOKIE,
  sanitizeAuthReturnPath,
} from "@/lib/authSession";
import { normalizeTokenCandidate } from "@/lib/authToken";

function buildRedirect(req: NextRequest, path: string) {
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") ?? req.nextUrl.protocol.replace(":", "");
  if (host) {
    return new URL(path, `${proto}://${host}`);
  }
  return new URL(path, req.nextUrl.origin);
}

function clearSessionCookie(response: NextResponse) {
  response.cookies.set(NEXUS_SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const nextPath = sanitizeAuthReturnPath(String(form.get("next") ?? "/hq"));
  const submittedToken = normalizeTokenCandidate(String(form.get("token") ?? ""));
  const configuredToken = getConfiguredNexusToken();

  if (!configuredToken) {
    const url = buildRedirect(req, nextPath);
    url.searchParams.set("authError", "server");
    const response = NextResponse.redirect(url, 303);
    clearSessionCookie(response);
    return response;
  }

  if (!submittedToken || submittedToken !== configuredToken) {
    const url = buildRedirect(req, nextPath);
    url.searchParams.set("authError", "invalid");
    const response = NextResponse.redirect(url, 303);
    clearSessionCookie(response);
    return response;
  }

  const response = NextResponse.redirect(buildRedirect(req, nextPath), 303);
  response.cookies.set(NEXUS_SESSION_COOKIE, configuredToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  return response;
}

export async function GET(req: NextRequest) {
  return NextResponse.redirect(buildRedirect(req, "/hq"), 303);
}
