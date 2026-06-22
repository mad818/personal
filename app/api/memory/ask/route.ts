import { NextRequest, NextResponse } from "next/server";
import {
  buildMemoryAskResponse,
  type MemoryAskLayer,
} from "@/lib/memoryAsk";
import { protectedJson } from "@/lib/protectedApi";

export const dynamic = "force-dynamic";

function parseLayer(value: string | null): MemoryAskLayer {
  const normalized = (value ?? "all").toLowerCase();
  if (
    normalized === "raw" ||
    normalized === "knowledge" ||
    normalized === "output"
  ) {
    return normalized;
  }
  return "all";
}

export async function GET(req: NextRequest) {
  try {
    const query = req.nextUrl.searchParams.get("q")?.trim() ?? "";
    const layer = parseLayer(req.nextUrl.searchParams.get("layer"));
    const limit = Number(req.nextUrl.searchParams.get("limit") ?? "5");
    const compare = req.nextUrl.searchParams.get("compare") === "1";

    const response = await buildMemoryAskResponse({
      query,
      layer,
      limit: Number.isFinite(limit) ? limit : 5,
      compare,
    });

    return protectedJson(response);
  } catch {
    return NextResponse.json(
      { error: "Memory ask is unavailable right now." },
      { status: 503 },
    );
  }
}
