import { NextRequest, NextResponse } from "next/server";
import {
  NEXUS_SESSION_COOKIE,
  sanitizeAuthReturnPath,
} from "@/lib/authSession";

function buildRedirect(req: NextRequest, path: string) {
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") ?? req.nextUrl.protocol.replace(":", "");
  if (host) {
    return new URL(path, `${proto}://${host}`);
  }
  return new URL(path, req.nextUrl.origin);
}

export async function GET(req: NextRequest) {
  const nextPath = sanitizeAuthReturnPath(
    req.nextUrl.searchParams.get("next") ?? "/hq",
  );
  const response = NextResponse.redirect(buildRedirect(req, nextPath), 303);
  response.cookies.set(NEXUS_SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return response;
}
