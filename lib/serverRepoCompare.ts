import "server-only";

import { listCompiledMemoryPages } from "@/lib/memoryPagesStore";

export async function loadSavedRepoAssimilationBrief(normalizedRepoId: string) {
  const pages = await listCompiledMemoryPages({
    limit: 24,
    workflowId: "repo-assimilation",
  });
  const match =
    pages.find(
      (page) =>
        page.continuity.repoMemoryBinding === normalizedRepoId && page.content,
    ) ?? null;
  return match?.content ?? null;
}
