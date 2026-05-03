import { NextResponse } from "next/server";
import {
  buildRuntimeExperimentWorkbenchMeta,
  readRuntimeExperimentPayload,
} from "@/lib/runtimeExperimentLedger";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const limit = Math.max(
    5,
    Math.min(60, Number(url.searchParams.get("limit") ?? 12)),
  );
  const payload = readRuntimeExperimentPayload(limit);
  return NextResponse.json({
    status: "ok",
    ...payload,
    meta: buildRuntimeExperimentWorkbenchMeta(),
  });
}
