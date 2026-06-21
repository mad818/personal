import {
  getRepoAssimilationDecision,
  parseRepoAssimilationMarkdown,
  type RepoAssimilationDecision,
} from "@/lib/repoAssimilation";

export interface RepoAssimilationQueueItem {
  id: string;
  title: string;
  decision: RepoAssimilationDecision;
  smallestSlice: string;
  boundary: string;
  capturedAt: number;
}

export function buildRepoAssimilationQueueItem(input: {
  id: string;
  title: string;
  brief: string;
  capturedAt?: number;
}): RepoAssimilationQueueItem | null {
  const sections = parseRepoAssimilationMarkdown(input.brief);
  if (!sections) return null;
  return {
    id: input.id,
    title: input.title,
    decision: getRepoAssimilationDecision(sections),
    smallestSlice:
      sections.extensionPointsAndSmallestSlice.slice(0, 180) ||
      "No smallest slice recorded.",
    boundary:
      sections.boundariesAndRisks.slice(0, 160) || "No boundary note recorded.",
    capturedAt: input.capturedAt ?? Date.now(),
  };
}

export function summarizeRepoAssimilationQueue(
  items: RepoAssimilationQueueItem[],
): {
  adopt: number;
  adapt: number;
  reject: number;
  headline: string;
} {
  const adopt = items.filter((item) => item.decision === "adopt").length;
  const adapt = items.filter((item) => item.decision === "adapt").length;
  const reject = items.filter((item) => item.decision === "reject").length;
  const headline =
    items.length === 0
      ? "No repo assimilation briefs queued yet."
      : `${items.length} brief${items.length === 1 ? "" : "s"} · ${adapt} adapt · ${adopt} adopt · ${reject} reject`;
  return { adopt, adapt, reject, headline };
}
