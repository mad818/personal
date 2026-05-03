"use client";

import { useMemo, useState } from "react";
import { ShellBadge } from "@/components/ui/shell";
import {
  SurfaceCallout,
  SurfaceEmpty,
} from "@/components/ui/surfacePrimitives";
import type { CorrectionMemoryEntry } from "@/lib/assistantSessionMemory";
import { timeAgo } from "@/lib/helpers";
import { buildMemorySpineSnapshot } from "@/lib/memorySpine";
import { useStore } from "@/store/useStore";

function formatScopeLabel(entry: CorrectionMemoryEntry) {
  const parts = [
    entry.scope.routeSurface ? `route ${entry.scope.routeSurface}` : null,
    entry.scope.agent ? `agent ${entry.scope.agent.toUpperCase()}` : null,
    entry.scope.taskType ? `task ${entry.scope.taskType}` : null,
    entry.scope.capability ? `capability ${entry.scope.capability}` : null,
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : "general correction";
}

function sortCorrections(
  entries: CorrectionMemoryEntry[],
) {
  return [...entries].sort((left, right) => {
    const statusRank = (value: typeof left.status) =>
      value === "proposed" ? 3 : value === "approved" ? 2 : 1;
    const statusDelta = statusRank(right.status) - statusRank(left.status);
    if (statusDelta !== 0) return statusDelta;
    return right.provenance.createdAt - left.provenance.createdAt;
  });
}

export default function MemorySpineStatusCard() {
  const savedArticles = useStore((s) => s.savedArticles);
  const agentLearnings = useStore((s) => s.agentLearnings);
  const agentRunHistory = useStore((s) => s.agentRunHistory);
  const modeBriefings = useStore((s) => s.modeBriefings);
  const correctionMemories = useStore((s) => s.correctionMemories);
  const approveCorrectionMemory = useStore((s) => s.approveCorrectionMemory);
  const archiveCorrectionMemory = useStore((s) => s.archiveCorrectionMemory);
  const [expanded, setExpanded] = useState(true);

  const snapshot = useMemo(
    () =>
      buildMemorySpineSnapshot({
        savedArticles,
        agentLearnings,
        agentRunHistory,
        modeBriefings,
      }),
    [savedArticles, agentLearnings, agentRunHistory, modeBriefings],
  );

  const sortedCorrections = useMemo(
    () => sortCorrections(correctionMemories),
    [correctionMemories],
  );
  const proposedCorrections = sortedCorrections.filter(
    (entry) => entry.status === "proposed",
  );
  const approvedCorrections = sortedCorrections.filter(
    (entry) => entry.status === "approved",
  );
  const archivedCorrections = sortedCorrections.filter(
    (entry) => entry.status === "archived",
  );
  const latestCorrection =
    sortedCorrections[0] ?? null;
  const latestMemoryUpdate =
    snapshot.latestUpdatedAt && snapshot.latestUpdatedAt > 0
      ? timeAgo(new Date(snapshot.latestUpdatedAt).toISOString())
      : "No retained memory yet";

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surf2)] p-3 text-xs">
      <button
        type="button"
        className="flex w-full items-center justify-between text-left text-[var(--text2)] hover:text-[var(--text)]"
        onClick={() => setExpanded((value) => !value)}
      >
        <span className="font-mono font-semibold tracking-wider">
          MEMORY SPINE
        </span>
        <div className="flex items-center gap-2">
          <span className="text-[9px] text-[var(--text3)]">
            {snapshot.total} memory · {correctionMemories.length} corrections
          </span>
          <span>{expanded ? "▲" : "▼"}</span>
        </div>
      </button>

      {expanded ? (
        <div className="mt-3 flex flex-col gap-3">
          {snapshot.total === 0 && correctionMemories.length === 0 ? (
            <SurfaceEmpty
              icon="Archive"
              title="Memory posture is still cold"
              description="Run HQ missions, save archive material, or approve a correction proposal to start building reusable continuity."
              compact
            />
          ) : null}

          <SurfaceCallout
            tone={proposedCorrections.length ? "warning" : "info"}
            compact
            icon="Memory"
            title="Correction memory posture"
            description={
              proposedCorrections.length
                ? `${proposedCorrections.length} proposal${proposedCorrections.length === 1 ? "" : "s"} waiting for approval before they can influence prompt context.`
                : approvedCorrections.length
                  ? `${approvedCorrections.length} approved correction${approvedCorrections.length === 1 ? "" : "s"} can now shape HQ context before generic lessons load.`
                  : "No approved corrections yet. New proposals will appear here after substantive HQ runs."
            }
          >
            <div className="flex flex-wrap gap-2">
              <ShellBadge tone="accent">Proposed {proposedCorrections.length}</ShellBadge>
              <ShellBadge tone="muted">Approved {approvedCorrections.length}</ShellBadge>
              <ShellBadge tone="muted">Archived {archivedCorrections.length}</ShellBadge>
              {latestCorrection ? (
                <ShellBadge tone="muted">
                  Updated {timeAgo(new Date(latestCorrection.provenance.createdAt).toISOString())}
                </ShellBadge>
              ) : null}
            </div>
          </SurfaceCallout>

          <div className="grid grid-cols-2 gap-2 text-[10px] sm:grid-cols-4">
            <div className="rounded-md border border-[var(--border)] bg-[var(--surf)] px-2 py-1.5">
              <div className="text-[var(--text3)]">Raw</div>
              <div className="mt-1 font-mono text-[var(--text)]">
                {snapshot.countsByLayer.raw}
              </div>
            </div>
            <div className="rounded-md border border-[var(--border)] bg-[var(--surf)] px-2 py-1.5">
              <div className="text-[var(--text3)]">Knowledge</div>
              <div className="mt-1 font-mono text-[var(--text)]">
                {snapshot.countsByLayer.knowledge}
              </div>
            </div>
            <div className="rounded-md border border-[var(--border)] bg-[var(--surf)] px-2 py-1.5">
              <div className="text-[var(--text3)]">Outputs</div>
              <div className="mt-1 font-mono text-[var(--text)]">
                {snapshot.countsByLayer.output}
              </div>
            </div>
            <div className="rounded-md border border-[var(--border)] bg-[var(--surf)] px-2 py-1.5">
              <div className="text-[var(--text3)]">Latest memory</div>
              <div className="mt-1 font-mono text-[var(--text)]">
                {latestMemoryUpdate}
              </div>
            </div>
          </div>

          <details className="nexus-surface-disclosure" open={proposedCorrections.length > 0}>
            <summary>Review correction proposals</summary>
            <div className="nexus-surface-disclosure__body">
              {proposedCorrections.length === 0 ? (
                <div className="text-[10px] leading-5 text-[var(--text3)]">
                  No pending proposals right now. When HQ detects a reusable operator correction, it lands here for approval instead of entering prompts automatically.
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {proposedCorrections.map((entry) => (
                    <div
                      key={entry.id}
                      className="rounded-md border border-[var(--border)] bg-[var(--surf)] px-3 py-2"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <ShellBadge tone="accent">Proposed</ShellBadge>
                        <ShellBadge tone="muted">
                          {entry.sensitivity}
                        </ShellBadge>
                        <span className="text-[10px] text-[var(--text3)]">
                          {formatScopeLabel(entry)}
                        </span>
                      </div>
                      <div className="mt-2 text-[11px] font-medium text-[var(--text)]">
                        {entry.content.rule}
                      </div>
                      <div className="mt-1 text-[10px] leading-5 text-[var(--text3)]">
                        {entry.content.preferredBehavior}
                      </div>
                      <div className="mt-2 text-[10px] text-[var(--text3)]">
                        Source: {entry.provenance.sourceQuery.slice(0, 140)}
                        {entry.provenance.sourceQuery.length > 140 ? "…" : ""}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="nexus-shell-button"
                          onClick={() => approveCorrectionMemory(entry.id)}
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          className="nexus-shell-button"
                          onClick={() => archiveCorrectionMemory(entry.id)}
                        >
                          Archive
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </details>

          {approvedCorrections.length > 0 ? (
            <details className="nexus-surface-disclosure">
              <summary>Approved correction memory</summary>
              <div className="nexus-surface-disclosure__body">
                <div className="flex flex-col gap-2">
                  {approvedCorrections.slice(0, 5).map((entry) => (
                    <div
                      key={entry.id}
                      className="rounded-md border border-[var(--border)] bg-[var(--surf)] px-3 py-2"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <ShellBadge tone="muted">Approved</ShellBadge>
                        <ShellBadge tone="muted">{entry.sensitivity}</ShellBadge>
                        <span className="text-[10px] text-[var(--text3)]">
                          {formatScopeLabel(entry)}
                        </span>
                      </div>
                      <div className="mt-2 text-[11px] font-medium text-[var(--text)]">
                        {entry.content.rule}
                      </div>
                      <div className="mt-1 text-[10px] leading-5 text-[var(--text3)]">
                        {entry.content.preferredBehavior}
                      </div>
                      <div className="mt-2 text-[10px] text-[var(--text3)]">
                        Applied {entry.appliedCount} time{entry.appliedCount === 1 ? "" : "s"}
                        {entry.lastAppliedAt
                          ? ` · last used ${timeAgo(new Date(entry.lastAppliedAt).toISOString())}`
                          : ""}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </details>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
