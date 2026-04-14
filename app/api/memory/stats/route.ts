import { readMemoryAdapterStatuses } from "@/lib/memoryAdapters";
import { buildMemoryLifecycleSummary } from "@/lib/nativeAssimilation";
import { protectedJson } from "@/lib/protectedApi";
import { readPersistedMemorySpineStats } from "@/lib/memorySpineStore";
import { NEXUS_FREE_USE_LABEL } from "@/lib/productGuarantees";

export const dynamic = "force-dynamic";

export async function GET() {
  const [stats, adapters] = await Promise.all([
    readPersistedMemorySpineStats(),
    Promise.resolve(readMemoryAdapterStatuses()),
  ]);
  const lifecycle = buildMemoryLifecycleSummary({
    total: stats.snapshot.total,
    latestUpdatedAt: stats.snapshot.latestUpdatedAt,
    countsByLayer: stats.snapshot.countsByLayer,
    countsByVisibility: stats.snapshot.countsByVisibility,
    items: stats.snapshot.items,
  });

  return protectedJson({
    status: "ok",
    generatedAt: new Date().toISOString(),
    syncedAt: stats.syncedAt,
    syncAgeMinutes: stats.syncAgeMinutes,
    total: stats.snapshot.total,
    latestUpdatedAt: stats.snapshot.latestUpdatedAt,
    countsByLayer: stats.snapshot.countsByLayer,
    countsByDomain: stats.snapshot.countsByDomain,
    countsByVisibility: stats.snapshot.countsByVisibility,
    localOnly: stats.localOnly,
    freeFirst: stats.freeFirst,
    productPolicy: NEXUS_FREE_USE_LABEL,
    persistence: stats.persistence,
    withheldRestrictedCount: stats.snapshot.countsByVisibility.restricted,
    lifecycle,
    preview: stats.snapshot.items.slice(0, 5).map((item) => ({
      id: item.id,
      title: item.title,
      kind: item.kind,
      layer: item.layer,
      visibility: item.visibility,
      citationId: item.citationId ?? null,
      lifecycle: item.lifecycle ?? null,
      nextAction: item.nextAction ?? null,
      timestamp: item.timestamp,
    })),
    adapters,
  });
}
