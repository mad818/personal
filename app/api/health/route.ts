import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "nexus-prime",
    ts: new Date().toISOString(),
  });
}
