import { NextRequest, NextResponse } from "next/server";
import { performSweepBundle } from "@/lib/assimilation/sweep";
import { saveGeoDeltaSnapshot } from "@/lib/assimilation/storage";
import { requireMasterSessionForAction } from "@/lib/security/masterSession";
import {
  applyRateLimitHeaders,
  checkRateLimit,
} from "@/lib/security/rateLimit";
import type { GeoDeltaSnapshot, SweepTheater } from "@/lib/assimilation/types";

export const dynamic = "force-dynamic";

const SWEEPS_RATE_LIMIT = {
  bucket: "api-sweeps",
  windowMs: 60_000,
  maxAttempts: 12,
} as const;

function normalizeTheater(value: string | null): SweepTheater {
  const fallback: SweepTheater = "markets";
  if (
    value === "markets" ||
    value === "cyber" ||
    value === "geopolitics" ||
    value === "air-sea" ||
    value === "infra" ||
    value === "watchlist"
  ) {
    return value;
  }
  return fallback;
}

export async function GET(req: NextRequest) {
  const masterRequired = await requireMasterSessionForAction(req, {
    action: "tools_networked",
    capability: "networked",
  });
  if (masterRequired) return masterRequired;

  const rateLimit = checkRateLimit(req, SWEEPS_RATE_LIMIT);
  if (!rateLimit.ok) {
    const res = NextResponse.json(
      { error: "Sweep rate limit exceeded. Try again shortly." },
      { status: 429 },
    );
    applyRateLimitHeaders(res, SWEEPS_RATE_LIMIT, rateLimit.retryAfterSec);
    return res;
  }

  const theater = normalizeTheater(req.nextUrl.searchParams.get("theater"));
  const sweep = await performSweepBundle(req.url, theater);
  const res = NextResponse.json({ sweep });
  applyRateLimitHeaders(res, SWEEPS_RATE_LIMIT);
  return res;
}

export async function POST(req: NextRequest) {
  const masterRequired = await requireMasterSessionForAction(req, {
    action: "tools_networked",
    capability: "networked",
  });
  if (masterRequired) return masterRequired;

  const rateLimit = checkRateLimit(req, SWEEPS_RATE_LIMIT);
  if (!rateLimit.ok) {
    const res = NextResponse.json(
      { error: "Sweep rate limit exceeded. Try again shortly." },
      { status: 429 },
    );
    applyRateLimitHeaders(res, SWEEPS_RATE_LIMIT, rateLimit.retryAfterSec);
    return res;
  }

  const body = (await req.json()) as { theater?: string; persistSnapshot?: boolean };
  if (body.persistSnapshot) {
    const masterRequired = await requireMasterSessionForAction(req, {
      action: "tools_mutate_exec",
      capability: "mutate",
    });
    if (masterRequired) return masterRequired;
  }

  const theater = normalizeTheater(body.theater ?? null);
  const sweep = await performSweepBundle(req.url, theater);

  if (body.persistSnapshot) {
    const snapshot: GeoDeltaSnapshot = {
      id: `geo-${theater}-${Date.now()}`,
      theater,
      title: `${theater.toUpperCase()} sweep snapshot`,
      summary: sweep.summary,
      severity: sweep.severity,
      capturedAt: sweep.completedAt,
      observations: sweep.sources
        .filter((source) => source.status === "ok")
        .slice(0, 3)
        .map((source, index) => ({
          id: `${source.id}-${index}`,
          label: source.label,
          theater,
          severity: sweep.severity,
          lat: 33 + index * 5,
          lon: -20 + index * 10,
          beforeLabel: "Previous sweep",
          afterLabel: source.summary,
          note: `Derived from ${source.endpoint}`,
        })),
    };
    await saveGeoDeltaSnapshot(snapshot);
  }

  const res = NextResponse.json({ sweep });
  applyRateLimitHeaders(res, SWEEPS_RATE_LIMIT);
  return res;
}
