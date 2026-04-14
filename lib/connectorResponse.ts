import { NextResponse } from "next/server";

const DEFAULT_AUTH_VARY = ["Authorization", "Cookie"] as const;

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

type ConnectorJsonInit = {
  source: string;
  maxAgeSeconds: number;
  staleWhileRevalidateSeconds?: number;
  degraded?: boolean;
  warnings?: string[];
  status?: number;
};

export function connectorJson<T extends Record<string, unknown>>(
  body: T,
  init: ConnectorJsonInit,
) {
  const staleWhileRevalidateSeconds =
    init.staleWhileRevalidateSeconds ?? Math.min(init.maxAgeSeconds, 60);
  const response = NextResponse.json(
    {
      ...body,
      meta: {
        source: init.source,
        status: init.degraded ? "degraded" : "ok",
        generatedAt: new Date().toISOString(),
        cache: {
          scope: "private",
          maxAgeSeconds: init.maxAgeSeconds,
          staleWhileRevalidateSeconds,
        },
        warnings: init.warnings ?? [],
      },
    },
    { status: init.status },
  );

  response.headers.set(
    "Cache-Control",
    `private, max-age=${init.maxAgeSeconds}, stale-while-revalidate=${staleWhileRevalidateSeconds}`,
  );
  mergeVaryHeaders(response.headers, DEFAULT_AUTH_VARY);
  return response;
}
