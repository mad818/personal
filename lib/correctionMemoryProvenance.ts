import type { CorrectionMemoryEntry } from "@/lib/assistantSessionMemory";
import { timeAgo } from "@/lib/helpers";

export interface CorrectionProvenanceLine {
  id: string;
  rule: string;
  agent: string | null;
  routeSurface: string | null;
  sourceQuery: string;
  appliedCount: number;
  approvedAt: string;
  lastApplied: string | null;
}

export function buildCorrectionProvenanceLine(
  entry: CorrectionMemoryEntry,
): CorrectionProvenanceLine {
  return {
    id: entry.id,
    rule: entry.content.rule,
    agent: entry.scope.agent ?? null,
    routeSurface: entry.scope.routeSurface ?? null,
    sourceQuery: entry.provenance.sourceQuery,
    appliedCount: entry.appliedCount,
    approvedAt: entry.provenance.approvedAt
      ? timeAgo(new Date(entry.provenance.approvedAt).toISOString())
      : timeAgo(new Date(entry.provenance.createdAt).toISOString()),
    lastApplied: entry.lastAppliedAt
      ? timeAgo(new Date(entry.lastAppliedAt).toISOString())
      : null,
  };
}

export function buildCorrectionProvenanceReceipt(
  entries: CorrectionMemoryEntry[],
): string {
  if (!entries.length) return "";
  const lines = entries
    .slice(0, 3)
    .map(
      (entry, index) =>
        `${index + 1}. ${entry.content.rule} · approved ${buildCorrectionProvenanceLine(entry).approvedAt}` +
        (entry.appliedCount > 0 ? ` · applied ${entry.appliedCount}x` : ""),
    );
  return (
    `\n[CORRECTION PROVENANCE — influencing this run]\n` +
    `${lines.join("\n")}\n` +
    `[END CORRECTION PROVENANCE]\n`
  );
}
