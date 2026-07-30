"use client";

import { useMemo, useState } from "react";
import { HQ_WORKFLOW_CATALOG } from "@/components/home/office/workflowCommands";
import { ShellBadge } from "@/components/ui/shell";
import {
  SurfaceCallout,
  SurfaceEmpty,
  SurfaceSkeletonRows,
} from "@/components/ui/surfacePrimitives";
import { useSchedulerEfficiencyReadiness } from "@/hooks/useSchedulerEfficiencyReadiness";
import { buildWorkflowOpsSnapshot } from "@/lib/nativeAssimilation";
import { useStore } from "@/store/useStore";

function toneForQuality(quality?: string, stale?: boolean) {
  if (stale || quality === "degraded") return "warning" as const;
  if (quality === "ready") return "success" as const;
  return "info" as const;
}

function laneLabel(count?: number, label?: string) {
  if (!label) return "Standing by";
  if (!count) return label;
  return label;
}

export default function EfficiencyOpsCard() {
  const [expanded, setExpanded] = useState(true);
  const scheduledJobs = useStore((s) => s.settings.scheduledJobs ?? []);
  const agentRuntime = useStore((s) => s.agentRuntime);
  const unfinishedSessions = useStore((s) => s.unfinishedSessions);
  const { payload, loading, loadError } = useSchedulerEfficiencyReadiness(
    12,
    true,
  );

  const workflowOps = useMemo(
    () =>
      buildWorkflowOpsSnapshot({
        jobs: scheduledJobs,
        runtime: agentRuntime,
        unfinishedSessions,
        workflowCatalog: HQ_WORKFLOW_CATALOG,
      }),
    [agentRuntime, scheduledJobs, unfinishedSessions],
  );

  const latest = payload?.latest;
  const summary = latest?.summary;
  const stale = Boolean(payload?.freshness?.stale);

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surf2)] p-3 text-xs">
      <button
        type="button"
        className="flex w-full items-center justify-between text-left text-[var(--text2)] hover:text-[var(--text)]"
        onClick={() => setExpanded((value) => !value)}
      >
        <span className="font-mono font-semibold tracking-wider">
          EFFICIENCY OPS
        </span>
        <div className="flex items-center gap-2">
          {summary ? (
            <span className="text-[9px] text-[var(--text3)]">
              {summary.score}/100
            </span>
          ) : null}
          <span>{expanded ? "▲" : "▼"}</span>
        </div>
      </button>

      {expanded ? (
        <div className="mt-3 flex flex-col gap-3">
          {loading && !latest ? (
            <SurfaceSkeletonRows rows={3} height={44} />
          ) : null}

          <SurfaceCallout
            tone={toneForQuality(summary?.quality, stale)}
            compact
            icon="Gauge"
            title={
              summary
                ? `${summary.label} · ${summary.score}/100`
                : workflowOps.headline
            }
            description={
              summary
                ? `${summary.strongestTakeaway} ${summary.strongestOptimization}`
                : "Recurring mission efficiency will settle here once the scheduler syncs its first measured posture."
            }
          >
            <div className="flex flex-wrap gap-1.5">
              <ShellBadge tone="success">
                {workflowOps.activeCount} live
              </ShellBadge>
              <ShellBadge tone="accent">
                {workflowOps.queuedCount} queued
              </ShellBadge>
              <ShellBadge tone="muted">
                {summary?.measuredRuns ?? 0} measured
              </ShellBadge>
              <ShellBadge tone="muted">
                cache {summary?.cacheObservedCoverage ?? 0}%
              </ShellBadge>
              <ShellBadge tone="muted">
                hit {summary?.cacheHitCoverage ?? 0}%
              </ShellBadge>
              <ShellBadge tone="accent">
                batch {summary?.batchedRuns ?? 0}
              </ShellBadge>
            </div>
          </SurfaceCallout>

          {loadError && !loading ? (
            <SurfaceCallout
              role="alert"
              tone="warning"
              compact
              icon="↺"
              title="Efficiency posture recovering"
              description={loadError}
            />
          ) : null}

          <div className="grid grid-cols-2 gap-2 text-[10px] sm:grid-cols-4">
            <div className="rounded-md border border-[var(--border)] bg-[var(--surf)] px-2 py-1.5">
              <div className="text-[var(--text3)]">Active jobs</div>
              <div className="mt-1 font-mono text-[var(--text)]">
                {summary?.activeJobs ?? 0}
              </div>
            </div>
            <div className="rounded-md border border-[var(--border)] bg-[var(--surf)] px-2 py-1.5">
              <div className="text-[var(--text3)]">Measured runs</div>
              <div className="mt-1 font-mono text-[var(--text)]">
                {summary?.measuredRuns ?? 0}
              </div>
            </div>
            <div className="rounded-md border border-[var(--border)] bg-[var(--surf)] px-2 py-1.5">
              <div className="text-[var(--text3)]">Queued native</div>
              <div className="mt-1 font-mono text-[var(--text)]">
                {summary?.queuedJobs ?? workflowOps.queuedCount}
              </div>
            </div>
            <div className="rounded-md border border-[var(--border)] bg-[var(--surf)] px-2 py-1.5">
              <div className="text-[var(--text3)]">Template gaps</div>
              <div className="mt-1 font-mono text-[var(--text)]">
                {summary?.templateGapJobs ?? 0}
              </div>
            </div>
          </div>

          {latest ? (
            <>
              <div className="grid grid-cols-1 gap-2 text-[10px] sm:grid-cols-3">
                <div className="rounded-md border border-[var(--border)] bg-[var(--surf)] px-3 py-2">
                  <div className="text-[var(--text3)]">Single lane</div>
                  <div className="mt-1 font-mono text-[var(--text)]">
                    {laneLabel(
                      latest.lanes?.single?.count,
                      latest.lanes?.single?.label,
                    )}
                  </div>
                </div>
                <div className="rounded-md border border-[var(--border)] bg-[var(--surf)] px-3 py-2">
                  <div className="text-[var(--text3)]">Internal batch</div>
                  <div className="mt-1 font-mono text-[var(--text)]">
                    {laneLabel(
                      latest.lanes?.internalBatch?.count,
                      latest.lanes?.internalBatch?.label,
                    )}
                  </div>
                </div>
                <div className="rounded-md border border-[var(--border)] bg-[var(--surf)] px-3 py-2">
                  <div className="text-[var(--text3)]">Native batch</div>
                  <div className="mt-1 font-mono text-[var(--text)]">
                    {laneLabel(
                      latest.lanes?.providerNativeBatch?.count,
                      latest.lanes?.providerNativeBatch?.label,
                    )}
                  </div>
                </div>
              </div>

              <div className="rounded-md border border-[var(--border)] bg-[var(--surf)] px-3 py-2 text-[10px] leading-5 text-[var(--text3)]">
                <div className="font-mono text-[11px] text-[var(--text)]">
                  Queue posture
                </div>
                <div className="mt-1">{latest.queue?.label}</div>
              </div>

              {latest.repairCandidates?.length ? (
                <div className="flex flex-col gap-2">
                  {latest.repairCandidates.slice(0, 3).map((candidate) => (
                    <div
                      key={candidate.jobId}
                      className="rounded-md border border-[var(--border)] bg-[var(--surf)] px-3 py-2"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="font-mono text-[11px] text-[var(--text)]">
                          {candidate.jobName}
                        </div>
                        <ShellBadge tone="accent">repair candidate</ShellBadge>
                      </div>
                      <div className="mt-1 text-[10px] leading-5 text-[var(--text3)]">
                        {candidate.reason}
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}

              {latest.ledger?.length ? (
                <details className="nexus-surface-disclosure">
                  <summary>Recent execution ledger</summary>
                  <div className="nexus-surface-disclosure__body">
                    <div className="grid gap-2">
                      {latest.ledger.slice(0, 4).map((entry) => (
                        <div
                          key={`${entry.jobId}-${entry.recordedAt}`}
                          className="rounded-md border border-[var(--border)] bg-[var(--surf)] px-3 py-2"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="font-mono text-[11px] text-[var(--text)]">
                              {entry.jobName}
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              <ShellBadge
                                tone={
                                  entry.status === "error" ? "accent" : "muted"
                                }
                              >
                                {entry.status}
                              </ShellBadge>
                              <ShellBadge tone="muted">
                                {(
                                  entry.executionOrigin ?? "scheduled_job"
                                ).replaceAll("_", " ")}
                              </ShellBadge>
                            </div>
                          </div>
                          <div className="mt-1 text-[10px] leading-5 text-[var(--text3)]">
                            {entry.note}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </details>
              ) : null}
            </>
          ) : (
            <SurfaceEmpty
              compact
              icon="Gauge"
              title="Efficiency bench standing by"
              description="Once the scheduler syncs its measured posture, COMMAND will show cache coverage, batch-lane proof, and the strongest repair candidate here."
            />
          )}
        </div>
      ) : null}
    </div>
  );
}
