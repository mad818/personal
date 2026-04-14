import { NextRequest } from "next/server";
import { protectedJson } from "@/lib/protectedApi";
import { searchPersistedMemorySpine } from "@/lib/memorySpineStore";
import type { MemoryLayer } from "@/lib/memorySpine";

export const dynamic = "force-dynamic";

const VALID_LAYERS = new Set<MemoryLayer | "all">([
  "all",
  "raw",
  "knowledge",
  "output",
]);

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q")?.trim() ?? "";
  const layer = (searchParams.get("layer") ?? "all") as MemoryLayer | "all";
  const limit = Math.min(
    20,
    Math.max(1, parseInt(searchParams.get("limit") ?? "8", 10) || 8),
  );

  if (!VALID_LAYERS.has(layer)) {
    return protectedJson({ error: "invalid memory layer" }, { status: 400 });
  }

  const result = await searchPersistedMemorySpine({
    query,
    layer,
    limit,
  });

  return protectedJson({
    status: "ok",
    query,
    layer,
    limit,
    total: result.snapshot.total,
    matchCount: result.items.length,
    syncedAt: result.syncedAt,
    localOnly: result.localOnly,
    freeFirst: result.freeFirst,
    withheldRestrictedCount: result.snapshot.countsByVisibility.restricted,
    items: result.items,
  });
}
