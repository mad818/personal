import { NextRequest, NextResponse } from "next/server";
import {
  NEXUS_SESSION_COOKIE,
  sanitizeAuthReturnPath,
} from "@/lib/authSession";

export async function GET(req: NextRequest) {
  const nextPath = sanitizeAuthReturnPath(
    req.nextUrl.searchParams.get("next") ?? "/hq",
  );
  const response = NextResponse.redirect(new URL(nextPath, req.nextUrl.origin), 303);
  response.cookies.set(NEXUS_SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return response;
}
