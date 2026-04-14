import { NextRequest, NextResponse } from "next/server";
import {
  buildSafeAuthRedirectUrl,
  clearNexusSessionCookie,
  sanitizeAuthReturnPath,
} from "@/lib/authSession";

export async function GET(req: NextRequest) {
  const nextPath = sanitizeAuthReturnPath(
    req.nextUrl.searchParams.get("next") ?? "/hq",
  );
  const response = NextResponse.redirect(buildSafeAuthRedirectUrl(req, nextPath), 303);
  clearNexusSessionCookie(response);
  return response;
}
