import { NextResponse } from "next/server";
import { applyNoStoreHeaders } from "@/lib/cacheHeaders";

const DEFAULT_PROTECTED_VARY = [
  "Cookie",
  "X-Nexus-Internal-Auth",
] as const;

function mergeVaryHeaders(headers: Headers, vary: readonly string[]) {
  const existing = headers.get("Vary");
  const merged = new Set(
    (existing ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  );

  for (const value of vary) {
    merged.add(value);
  }

  if (merged.size > 0) {
    headers.set("Vary", Array.from(merged).join(", "));
  }
}

export function applyProtectedApiHeaders(
  headers: Headers,
  vary: readonly string[] = DEFAULT_PROTECTED_VARY,
) {
  applyNoStoreHeaders(headers);
  mergeVaryHeaders(headers, vary);
}

type ProtectedJsonInit = ResponseInit & {
  vary?: readonly string[];
};

export function protectedJson<T>(body: T, init: ProtectedJsonInit = {}) {
  const { vary, ...responseInit } = init;
  const response = NextResponse.json(body, responseInit);
  applyProtectedApiHeaders(response.headers, vary);
  return response;
}
