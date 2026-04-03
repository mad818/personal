import { NextRequest, NextResponse } from "next/server";
import { performSweepBundle } from "@/lib/assimilation/sweep";
import { saveGeoDeltaSnapshot } from "@/lib/assimilation/storage";
import type { GeoDeltaSnapshot, SweepTheater } from "@/lib/assimilation/types";

export const dynamic = "force-dynamic";

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
  const theater = normalizeTheater(req.nextUrl.searchParams.get("theater"));
  const sweep = await performSweepBundle(req.url, theater);
  return NextResponse.json({ sweep });
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { theater?: string; persistSnapshot?: boolean };
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

  return NextResponse.json({ sweep });
}
