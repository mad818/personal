import { NextRequest, NextResponse } from "next/server";
import { performSweepBundle } from "@/lib/assimilation/sweep";
import { saveGeoDeltaSnapshot } from "@/lib/assimilation/storage";
import type { GeoDeltaSnapshot, SweepTheater } from "@/lib/assimilation/types";
import { sweepsRequestSchema, sweepTheaterSchema } from "@/lib/assimilation/contracts";
import {
  applyWorkbenchRateLimit,
  createWorkbenchMeta,
  parseWorkbenchPayload,
  workbenchJson,
} from "@/lib/assimilation/http";

export const dynamic = "force-dynamic";

const RATE_LIMIT = {
  bucket: "workbench-sweeps",
  windowMs: 60_000,
  maxAttempts: 30,
  includeBearerToken: false,
} as const;

function normalizeTheater(value: string | null): SweepTheater {
  const parsed = sweepTheaterSchema.safeParse(value);
  return parsed.success ? parsed.data : "markets";
}

export async function GET(req: NextRequest) {
  const meta = createWorkbenchMeta({
    surface: "sweep-engine",
    simulation: "live",
    warnings: [
      "Live source aggregation is real, but any persisted geo snapshot derived from a sweep still uses synthesized observation coordinates.",
    ],
  });
  const rateLimited = applyWorkbenchRateLimit(req, RATE_LIMIT, meta);
  if (rateLimited) return rateLimited;

  const theater = normalizeTheater(req.nextUrl.searchParams.get("theater"));
  const sweep = await performSweepBundle(req.url, theater);
  return workbenchJson(meta, { sweep });
}

export async function POST(req: NextRequest) {
  const meta = createWorkbenchMeta({
    surface: "sweep-engine",
    simulation: "live",
    warnings: [
      "Live source aggregation is real, but any persisted geo snapshot derived from a sweep still uses synthesized observation coordinates.",
    ],
  });
  const rateLimited = applyWorkbenchRateLimit(req, RATE_LIMIT, meta);
  if (rateLimited) return rateLimited;

  const parsed = parseWorkbenchPayload(
    sweepsRequestSchema,
    await req.json(),
    meta,
  );
  if (!parsed.ok) return parsed.response;

  const body = parsed.data;
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

  return workbenchJson(meta, { sweep });
}
