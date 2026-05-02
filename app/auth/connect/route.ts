import { NextRequest, NextResponse } from "next/server";
import {
  buildSafeAuthRedirectUrl,
  clearNexusSessionCookie,
  createNexusSession,
  getConfiguredNexusToken,
  setNexusSessionCookie,
  sanitizeAuthReturnPath,
} from "@/lib/authSession";
import { normalizeTokenCandidate } from "@/lib/authToken";

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const nextPath = sanitizeAuthReturnPath(String(form.get("next") ?? "/hq"));
  const failurePath = sanitizeAuthReturnPath(
    String(form.get("failureNext") ?? nextPath),
  );
  const submittedToken = normalizeTokenCandidate(String(form.get("token") ?? ""));
  const configuredToken = getConfiguredNexusToken();

  if (!configuredToken) {
    const url = buildSafeAuthRedirectUrl(req, failurePath);
    url.searchParams.set("authError", "server");
    const response = NextResponse.redirect(url, 303);
    clearNexusSessionCookie(response);
    return response;
  }

  if (!submittedToken || submittedToken !== configuredToken) {
    const url = buildSafeAuthRedirectUrl(req, failurePath);
    url.searchParams.set("authError", "invalid");
    const response = NextResponse.redirect(url, 303);
    clearNexusSessionCookie(response);
    return response;
  }

  const response = NextResponse.redirect(buildSafeAuthRedirectUrl(req, nextPath), 303);
  const session = await createNexusSession();
  if (!session) {
    const url = buildSafeAuthRedirectUrl(req, failurePath);
    url.searchParams.set("authError", "server");
    const failureResponse = NextResponse.redirect(url, 303);
    clearNexusSessionCookie(failureResponse);
    return failureResponse;
  }
  setNexusSessionCookie(response, session.cookieValue);
  return response;
}

export async function GET(req: NextRequest) {
  const response = NextResponse.redirect(buildSafeAuthRedirectUrl(req, "/hq"), 303);
  clearNexusSessionCookie(response);
  return response;
}
