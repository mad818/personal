import { NextRequest, NextResponse } from "next/server";
import {
  listGeoDeltaSnapshots,
  saveGeoDeltaSnapshot,
} from "@/lib/assimilation/storage";
import type { GeoDeltaSnapshot } from "@/lib/assimilation/types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const theater = req.nextUrl.searchParams.get("theater");
  const snapshots = await listGeoDeltaSnapshots();
  const filtered = theater
    ? snapshots.filter((snapshot) => snapshot.theater === theater)
    : snapshots;
  return NextResponse.json({ snapshots: filtered });
}

export async function POST(req: NextRequest) {
  const snapshot = (await req.json()) as GeoDeltaSnapshot;
  const saved = await saveGeoDeltaSnapshot(snapshot);
  return NextResponse.json({ snapshot: saved });
}
