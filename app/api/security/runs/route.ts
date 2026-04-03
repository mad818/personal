import { NextRequest, NextResponse } from "next/server";
import { listSecurityRuns, saveSecurityRun } from "@/lib/assimilation/storage";
import type { SecurityRun } from "@/lib/assimilation/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const runs = await listSecurityRuns();
  return NextResponse.json({ runs });
}

export async function POST(req: NextRequest) {
  const run = (await req.json()) as SecurityRun;
  const saved = await saveSecurityRun(run);
  return NextResponse.json({ run: saved });
}
