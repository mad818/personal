import { NextResponse } from "next/server";
import { getBrandServiceName } from "@/lib/brand";
import { applyNoStoreHeaders, readRuntimeIdentity } from "@/lib/runtimeIdentity";

export const dynamic = "force-dynamic";

export async function GET() {
  const runtime = readRuntimeIdentity();
  const response = NextResponse.json({
    status: "ok",
    service: getBrandServiceName(),
    ts: new Date().toISOString(),
    runtime: {
      bootId: runtime.bootId,
      startedAt: runtime.startedAt,
      ageSeconds: runtime.ageSeconds,
    },
  });
  applyNoStoreHeaders(response.headers);
  return response;
}
