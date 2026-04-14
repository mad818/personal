import { NextRequest } from "next/server";
import { compareMemoryAdapterResults, readMemoryAdapterStatuses, searchNativeMemoryAdapter, searchOptionalSidecarMemoryAdapter } from "@/lib/memoryAdapters";
import type { MemoryLayer } from "@/lib/memorySpine";
import { protectedJson } from "@/lib/protectedApi";
import { NEXUS_FREE_USE_LABEL } from "@/lib/productGuarantees";

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
    12,
    Math.max(1, parseInt(searchParams.get("limit") ?? "6", 10) || 6),
  );

  if (!query) {
    return protectedJson(
      { error: "memory eval requires a non-empty query" },
      { status: 400 },
    );
  }

  if (!VALID_LAYERS.has(layer)) {
    return protectedJson({ error: "invalid memory layer" }, { status: 400 });
  }

  const [native, sidecar] = await Promise.all([
    searchNativeMemoryAdapter({ query, layer, limit }),
    searchOptionalSidecarMemoryAdapter({ query, layer, limit }),
  ]);
  const adapters = readMemoryAdapterStatuses();
  const comparison = compareMemoryAdapterResults(native.items, sidecar.items);

  return protectedJson({
    status: "ok",
    query,
    layer,
    limit,
    evaluationMode: adapters.evaluationMode,
    restrictedSyncPolicy: adapters.restrictedSyncPolicy,
    productPolicy: NEXUS_FREE_USE_LABEL,
    localOnly: true,
    freeFirst: true,
    adapters,
    native,
    sidecar,
    comparison,
    note: "Sidecar evaluation is query-only and never syncs restricted Nexus artifacts out to third-party memory infrastructure.",
  });
}
