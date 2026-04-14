import { NextRequest, NextResponse } from "next/server";
import {
  listGeoDeltaSnapshots,
  saveGeoDeltaSnapshot,
} from "@/lib/assimilation/storage";
import { geoDeltaSnapshotSchema, sweepTheaterSchema } from "@/lib/assimilation/contracts";
import {
  applyWorkbenchRateLimit,
  createWorkbenchMeta,
  parseWorkbenchPayload,
  workbenchJson,
} from "@/lib/assimilation/http";

export const dynamic = "force-dynamic";

const RATE_LIMIT = {
  bucket: "workbench-geo-delta",
  windowMs: 60_000,
  maxAttempts: 45,
  includeBearerToken: false,
} as const;

export async function GET(req: NextRequest) {
  const meta = createWorkbenchMeta({
    surface: "geo-delta",
    simulation: "derived",
    warnings: [
      "Geo delta snapshots are locally persisted and may include synthesized observation coordinates from sweep-derived snapshots.",
    ],
  });
  const rateLimited = applyWorkbenchRateLimit(req, RATE_LIMIT, meta);
  if (rateLimited) return rateLimited;

  const theaterParam = req.nextUrl.searchParams.get("theater");
  const theater = sweepTheaterSchema.safeParse(theaterParam).success
    ? theaterParam
    : null;
  const snapshots = await listGeoDeltaSnapshots();
  const filtered = theater
    ? snapshots.filter((snapshot) => snapshot.theater === theater)
    : snapshots;
  return workbenchJson(meta, { snapshots: filtered });
}

export async function POST(req: NextRequest) {
  const meta = createWorkbenchMeta({
    surface: "geo-delta",
    simulation: "derived",
    warnings: [
      "Geo delta snapshots are locally persisted and may include synthesized observation coordinates from sweep-derived snapshots.",
    ],
  });
  const rateLimited = applyWorkbenchRateLimit(req, RATE_LIMIT, meta);
  if (rateLimited) return rateLimited;

  const parsed = parseWorkbenchPayload(
    geoDeltaSnapshotSchema,
    await req.json(),
    meta,
  );
  if (!parsed.ok) return parsed.response;

  const saved = await saveGeoDeltaSnapshot(parsed.data);
  return workbenchJson(meta, { snapshot: saved });
}
