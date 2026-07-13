import { NextResponse } from "next/server";
import { readSecondBrainStatus } from "@/lib/secondBrain";

export const runtime = "nodejs";

export async function GET() {
  try {
    return NextResponse.json(await readSecondBrainStatus());
  } catch {
    return NextResponse.json(
      {
        posture: "degraded",
        authority: "human_files_over_ai_memory",
        aiWriteAuthority: false,
        files: [],
      },
      { status: 503 },
    );
  }
}
