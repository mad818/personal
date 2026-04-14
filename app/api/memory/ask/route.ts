import { NextRequest } from "next/server";
import { buildMemoryAskResult } from "@/lib/memoryAnswers";
import {
  compareMemoryAdapterResults,
  searchOptionalSidecarMemoryAdapter,
} from "@/lib/memoryAdapters";
import type { MemoryLayer } from "@/lib/memorySpine";
import { protectedJson } from "@/lib/protectedApi";
import { searchPersistedMemorySpine } from "@/lib/memorySpineStore";
import { NEXUS_FREE_USE_LABEL } from "@/lib/productGuarantees";

export const dynamic = "force-dynamic";

const VALID_LAYERS = new Set<MemoryLayer | "all">([
  "all",
  "raw",
  "knowledge",
  "output",
]);

function parseCompareFlag(value: string | null) {
  return value === "1" || value?.toLowerCase() === "true";
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q")?.trim() ?? "";
  const layer = (searchParams.get("layer") ?? "all") as MemoryLayer | "all";
  const limit = Math.min(
    10,
    Math.max(1, parseInt(searchParams.get("limit") ?? "5", 10) || 5),
  );
  const compare = parseCompareFlag(searchParams.get("compare"));

  if (!query) {
    return protectedJson(
      { error: "memory ask requires a non-empty query" },
      { status: 400 },
    );
  }

  if (!VALID_LAYERS.has(layer)) {
    return protectedJson({ error: "invalid memory layer" }, { status: 400 });
  }

  const native = await searchPersistedMemorySpine({
    query,
    layer,
    limit,
  });
  const answer = buildMemoryAskResult(query, native.items);

  let comparison:
    | {
        requested: true;
        performed: boolean;
        sidecarState: string;
        sharedCount: number;
        nativeOnlyCount: number;
        sidecarOnlyCount: number;
        overlapRatio: number;
        sidecarMatchCount: number;
      }
    | {
        requested: false;
        performed: false;
      } = { requested: false, performed: false };

  if (compare) {
    const sidecar = await searchOptionalSidecarMemoryAdapter({
      query,
      layer,
      limit,
    });
    const overlap = compareMemoryAdapterResults(
      native.items.map((item) => ({
        id: item.id,
        title: item.title,
        summary: item.summary,
        sourceLabel: item.sourceLabel,
        layer: item.layer,
        visibility: item.visibility,
        timestamp: item.timestamp,
      })),
      sidecar.items,
    );

    comparison = {
      requested: true,
      performed: sidecar.adapter.state === "ready" || sidecar.adapter.state === "degraded",
      sidecarState: sidecar.adapter.state,
      sharedCount: overlap.sharedCount,
      nativeOnlyCount: overlap.nativeOnlyCount,
      sidecarOnlyCount: overlap.sidecarOnlyCount,
      overlapRatio: overlap.overlapRatio,
      sidecarMatchCount: sidecar.matchCount,
    };
  }

  return protectedJson({
    status: "ok",
    query,
    layer,
    limit,
    localOnly: true,
    freeFirst: true,
    productPolicy: NEXUS_FREE_USE_LABEL,
    answer: answer.answer,
    confidence: answer.confidence,
    synthesisMode: answer.synthesisMode,
    sources: answer.sources,
    relatedItems: answer.relatedItems,
    gaps: answer.gaps,
    total: native.snapshot.total,
    matchCount: native.items.length,
    syncedAt: native.syncedAt,
    withheldRestrictedCount: native.snapshot.countsByVisibility.restricted,
    comparison,
    note: "Native Nexus memory remains the answering boundary. Optional sidecar comparison is explicit and query-only.",
  });
}
