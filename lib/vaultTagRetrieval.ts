import type { CompiledMemoryPage } from "@/lib/memoryPagesStore";

export interface VaultTagBoostedPage {
  page: CompiledMemoryPage;
  tagBoost: number;
}

export function scoreVaultTagOverlap(
  query: string,
  page: CompiledMemoryPage,
): number {
  const q = query.toLowerCase();
  let boost = 0;
  for (const tag of page.tags) {
    const normalized = tag.toLowerCase();
    if (!normalized) continue;
    if (q.includes(normalized) || normalized.includes(q)) boost += 2;
  }
  const artifactType = page.artifactClassification?.artifactType;
  if (artifactType && q.includes(artifactType.replace(/_/g, " "))) {
    boost += 1;
  }
  if (page.workflowId && q.includes(page.workflowId.replace(/-/g, " "))) {
    boost += 1;
  }
  return boost;
}

export function buildVaultTagBoosts(
  query: string,
  pages: CompiledMemoryPage[],
): VaultTagBoostedPage[] {
  return [...pages]
    .map((page) => ({ page, tagBoost: scoreVaultTagOverlap(query, page) }))
    .sort((left, right) => {
      const delta = right.tagBoost - left.tagBoost;
      if (delta !== 0) return delta;
      return right.page.updatedAt - left.page.updatedAt;
    });
}
