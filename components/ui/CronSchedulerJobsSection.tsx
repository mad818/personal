"use client";

import type { ScheduledJob } from "@/store/useStore";
import CompactOperatorNote from "@/components/ui/CompactOperatorNote";
import MissionContinuationActions from "@/components/ui/MissionContinuationActions";
import { filterScheduledJobRecentExecutions, type SchedulerAuditFilters } from "@/lib/schedulerGovernance";
import { getHQWorkflowCatalogItem } from "@/components/home/office/workflowCommands";
import {
  buildMissionHref,
  type MissionContinuationTarget,
} from "@/lib/missionHandoff";
import {
  fmtAgeSince,
  fmtBatchMode,
  fmtChars,
  fmtExecutionOrigin,
} from "@/components/ui/cronSchedulerPanelUtils";

function truncateInline(text: string, max = 180) {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1).trimEnd()}…`;
}

interface CronSchedulerJobsSectionProps {
  sortedJobs: ScheduledJob[];
  auditFilters: SchedulerAuditFilters;
  hasActiveAuditFilters: boolean;
  onToggleJob: (id: string) => void;
  onRemoveJob: (id: string) => void;
  onCopyJobAudit: (job: ScheduledJob) => void | Promise<void>;
  onExportJobAudit: (job: ScheduledJob) => void;
  onClearQueuedJob: (id: string) => void;
}

export default function CronSchedulerJobsSection({
  sortedJobs,
  auditFilters,
  hasActiveAuditFilters,
  onToggleJob,
  onRemoveJob,
  onCopyJobAudit,
  onExportJobAudit,
  onClearQueuedJob,
}: CronSchedulerJobsSectionProps) {
  return (
    <div
      style={{
        padding: "9px 12px",
        overflowY: "auto",
        display: "grid",
        gap: 8,
      }}
    >
      {sortedJobs.length === 0 ? (
        <CompactOperatorNote
          label="SCHEDULER"
          summary="No scheduled jobs yet. Add a mission above or promote a workflow template when you want automation."
          tone="neutral"
        />
      ) : (
        sortedJobs.map((job) => {
          const workflow = getHQWorkflowCatalogItem(job.templateId);
          const routeHint = workflow?.route && workflow.route !== "/hq" ? workflow.route : null;
          const continuationTargets: MissionContinuationTarget[] = [];
          if (
            job.outputTarget === "vault" ||
            job.outputTarget === "review" ||
            job.lastArtifactTarget === "vault" ||
            job.lastArtifactTarget === "review"
          ) {
            continuationTargets.push({
              href: buildMissionHref("/vault", "archive"),
              label: "Open VAULT",
              tab: "vault",
            });
          }
          const efficiency = job.lastEfficiency;
          const queuedAge = fmtAgeSince(job.pendingBatchSubmittedAt);
          const queuedFailures = job.pendingBatchPollFailures ?? 0;
          const lastArtifactAge = fmtAgeSince(job.lastArtifactAt);
          const lastExecutionAge = fmtAgeSince(job.lastExecutionAt);
          const showLastExecutionHint = Boolean(
            job.lastExecutionOrigin &&
              job.lastExecutionAt &&
              (!job.lastArtifactOrigin ||
                !job.lastArtifactAt ||
                job.lastExecutionAt !== job.lastArtifactAt),
          );
          const filteredRecentRuns = filterScheduledJobRecentExecutions(
            job,
            auditFilters,
          );
          const stableShare = efficiency
            ? Math.round(
                (efficiency.stablePrefixChars /
                  Math.max(
                    1,
                    efficiency.stablePrefixChars +
                      efficiency.volatilePromptChars,
                  )) *
                  100,
              )
            : 0;

          return (
            <div
              key={job.id}
              style={{
                border: `1px solid ${
                  job.enabled ? "#00DDFF33" : "#1A2040"
                }`,
                borderRadius: 8,
                background: "#080d18",
                padding: "10px 12px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div
                  style={{ color: "#ccd6f6", fontWeight: 700, fontSize: 12 }}
                >
                  {job.name}
                </div>
                {job.lastStatus ? (
                  <span
                    style={{
                      borderRadius: 999,
                      padding: "2px 7px",
                      fontSize: 9,
                      fontWeight: 800,
                      letterSpacing: ".04em",
                      color:
                        job.lastStatus === "ok"
                          ? "#86efac"
                          : job.lastStatus === "queued"
                            ? "#7dd3fc"
                            : "#fca5a5",
                      background:
                        job.lastStatus === "ok"
                          ? "rgba(134,239,172,.12)"
                          : job.lastStatus === "queued"
                            ? "rgba(125,211,252,.12)"
                            : "rgba(252,165,165,.12)",
                      border:
                        job.lastStatus === "ok"
                          ? "1px solid rgba(134,239,172,.24)"
                          : job.lastStatus === "queued"
                            ? "1px solid rgba(125,211,252,.24)"
                            : "1px solid rgba(252,165,165,.24)",
                    }}
                  >
                    {job.lastStatus.toUpperCase()}
                  </span>
                ) : null}
                <span
                  style={{
                    marginLeft: "auto",
                    color: job.enabled ? "#10b981" : "#6875a0",
                    fontSize: 10,
                    fontWeight: 700,
                  }}
                >
                  {job.enabled ? "ENABLED" : "DISABLED"}
                </span>
              </div>
              <div
                style={{
                  color: "#8892b0",
                  fontSize: 11,
                  marginTop: 4,
                  lineHeight: 1.45,
                }}
                title={job.prompt}
              >
                {truncateInline(job.prompt, 168)}
              </div>
              <div
                style={{
                  marginTop: 6,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  flexWrap: "wrap",
                }}
              >
                <span
                  style={{
                    fontFamily: "monospace",
                    color: "#00DDFF",
                    fontSize: 11,
                  }}
                >
                  {job.cron}
                </span>
                {job.lastRunAt ? (
                  <span style={{ color: "#6875a0", fontSize: 10 }}>
                    {job.lastStatus === "queued" ? "Queued" : "Last run"}:{" "}
                    {new Date(job.lastRunAt).toLocaleString()}
                  </span>
                ) : (
                  <span style={{ color: "#304060", fontSize: 10 }}>
                    Never run
                  </span>
                )}
                <span style={{ color: "#6875a0", fontSize: 10 }}>
                  {job.outputTarget ?? "none"} ·{" "}
                  {job.approvalPolicy ?? "human_gate"} ·{" "}
                  {job.missionAgent ?? "orbit"}
                </span>
                {job.lastArtifactOrigin && job.lastArtifactTarget ? (
                  <span
                    style={{
                      color: "#cbd5e1",
                      fontSize: 10,
                      borderRadius: 999,
                      border: "1px solid #1A2040",
                      background: "#0a1120",
                      padding: "2px 8px",
                    }}
                  >
                    Last artifact: {fmtExecutionOrigin(job.lastArtifactOrigin)} →{" "}
                    {job.lastArtifactTarget} · {lastArtifactAge}
                  </span>
                ) : null}
                {showLastExecutionHint ? (
                  <span
                    style={{
                      color: "#9fb7ff",
                      fontSize: 10,
                      borderRadius: 999,
                      border: "1px solid rgba(79,110,247,0.24)",
                      background: "rgba(79,110,247,0.08)",
                      padding: "2px 8px",
                    }}
                  >
                    Last lane: {fmtExecutionOrigin(job.lastExecutionOrigin)} ·{" "}
                    {lastExecutionAge}
                  </span>
                ) : null}
              </div>
              {workflow ? (
                <div
                  style={{
                    marginTop: 8,
                    padding: "8px 9px",
                    borderRadius: 8,
                    border: "1px solid #1A2040",
                    background: "#0a1120",
                    display: "grid",
                    gap: 4,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      flexWrap: "wrap",
                    }}
                  >
                    <span
                      style={{
                        color: "#86efac",
                        fontSize: 10,
                        fontWeight: 700,
                      }}
                    >
                      {workflow.command}
                    </span>
                    <span style={{ color: "#6875a0", fontSize: 10 }}>
                      {workflow.source} · {workflow.agent.toUpperCase()} ·{" "}
                      {workflow.route}
                    </span>
                  </div>
                  <div
                    style={{
                      color: "#cbd5e1",
                      fontSize: 10,
                      lineHeight: 1.45,
                    }}
                  >
                    Automation posture:{" "}
                    {workflow.automationPosture ===
                    "candidate_with_human_gate"
                      ? "candidate with human gate"
                      : "review only"}
                  </div>
                  <div style={{ color: "#6875a0", fontSize: 10, lineHeight: 1.45 }}>
                    {truncateInline(workflow.automationGuidance, 132)}
                  </div>
                </div>
              ) : null}
              {efficiency ? (
                <div
                  style={{
                    marginTop: 8,
                    padding: "8px 9px",
                    borderRadius: 8,
                    border: "1px solid #1A2040",
                    background: "#0a1120",
                    display: "grid",
                    gap: 6,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      flexWrap: "wrap",
                    }}
                  >
                    <span
                      style={{
                        color:
                          efficiency.cacheability === "high"
                            ? "#86efac"
                            : efficiency.cacheability === "medium"
                              ? "#fbbf24"
                              : "#fca5a5",
                        fontSize: 10,
                        fontWeight: 700,
                      }}
                    >
                      {efficiency.cacheability.toUpperCase()} CACHEABILITY
                    </span>
                    <span style={{ color: "#6875a0", fontSize: 10 }}>
                      Recorded{" "}
                      {new Date(efficiency.recordedAt).toLocaleTimeString()}
                    </span>
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                      gap: 8,
                    }}
                  >
                    <div>
                      <div style={{ color: "#6875a0", fontSize: 10 }}>Prompt</div>
                      <div
                        style={{
                          color: "#ccd6f6",
                          fontSize: 11,
                          fontFamily: "monospace",
                        }}
                      >
                        {fmtChars(efficiency.promptChars)}
                      </div>
                    </div>
                    <div>
                      <div style={{ color: "#6875a0", fontSize: 10 }}>
                        Stable prefix
                      </div>
                      <div
                        style={{
                          color: "#ccd6f6",
                          fontSize: 11,
                          fontFamily: "monospace",
                        }}
                      >
                        {fmtChars(efficiency.stablePrefixChars)} · {stableShare}%
                      </div>
                    </div>
                    <div>
                      <div style={{ color: "#6875a0", fontSize: 10 }}>Output</div>
                      <div
                        style={{
                          color: "#ccd6f6",
                          fontSize: 11,
                          fontFamily: "monospace",
                        }}
                      >
                        {fmtChars(efficiency.outputChars)}
                      </div>
                    </div>
                  </div>
                  <div
                    style={{
                      color: "#6875a0",
                      fontSize: 10,
                      lineHeight: 1.45,
                    }}
                  >
                    Tool schema:{" "}
                    {efficiency.toolCatalogChars > 0
                      ? fmtChars(efficiency.toolCatalogChars)
                      : "none"}{" "}
                    · volatile delta {fmtChars(efficiency.volatilePromptChars)} ·{" "}
                    {efficiency.cacheStrategy === "system_plus_user_prefix"
                      ? "split prefix active"
                      : "system-only cache"}{" "}
                    ·{" "}
                    {efficiency.singleFlightScope === "shared_window"
                      ? "shared minute window"
                      : "job-scoped dedupe"}{" "}
                    ·{" "}
                    {efficiency.batchMode === "provider_native"
                      ? `provider-native batch x${efficiency.batchSize}`
                      : efficiency.batchedRun
                        ? `internal batch x${efficiency.batchSize}`
                        : "single run"}{" "}
                    ·{" "}
                    {efficiency.cacheObserved
                      ? efficiency.cacheHit
                        ? `cache hit ${fmtChars(efficiency.cacheReadTokens)}`
                        : `cache warm ${fmtChars(efficiency.cacheWriteTokens)}`
                      : "cache telemetry unavailable"}
                  </div>
                </div>
              ) : job.lastStatus === "queued" && job.pendingBatchId ? (
                <div
                  style={{
                    marginTop: 8,
                    padding: "7px 9px",
                    borderRadius: 8,
                    border: "1px solid rgba(125,211,252,.22)",
                    background: "rgba(14,165,233,.08)",
                    color: "#bae6fd",
                    fontSize: 10,
                    lineHeight: 1.45,
                  }}
                >
                  Anthropic native batch pending. Batch id:{" "}
                  <span style={{ fontFamily: "monospace" }}>
                    {job.pendingBatchId}
                  </span>
                  {" · "}group size {job.pendingBatchSize ?? 1}
                  {" · "}queued {queuedAge}
                  {queuedFailures > 0 ? ` · poll retries ${queuedFailures}` : ""}
                </div>
              ) : job.lastRunAt ? (
                <div
                  style={{
                    marginTop: 8,
                    padding: "7px 9px",
                    borderRadius: 8,
                    border: "1px solid #1A2040",
                    background: "#0a1120",
                    color: "#6875a0",
                    fontSize: 10,
                    lineHeight: 1.45,
                  }}
                >
                  No efficiency snapshot was recorded for the latest run.
                </div>
              ) : null}
              <div style={{ marginTop: 8 }}>
                <MissionContinuationActions
                  memoryQuery={job.prompt}
                  routeHint={routeHint}
                  extraTargets={continuationTargets}
                />
              </div>
              {job.recentExecutions?.length ? (
                <details
                  style={{
                    marginTop: 8,
                    borderRadius: 8,
                    border: "1px solid #1A2040",
                    background: "#0a1120",
                    padding: "8px 9px",
                  }}
                >
                  <summary
                    style={{
                      color: "#cbd5e1",
                      fontSize: 10,
                      fontWeight: 700,
                      cursor: "pointer",
                      listStyle: "none",
                    }}
                  >
                    Recent runs (
                    {hasActiveAuditFilters
                      ? `${filteredRecentRuns.length}/${job.recentExecutions.length}`
                      : job.recentExecutions.length}
                    )
                  </summary>
                  <div
                    style={{
                      marginTop: 8,
                      display: "grid",
                      gap: 8,
                    }}
                  >
                    {filteredRecentRuns.length === 0 ? (
                      <div
                        style={{
                          borderRadius: 8,
                          border: "1px solid #1A2040",
                          background: "#080d18",
                          padding: "8px 9px",
                          color: "#6875a0",
                          fontSize: 10,
                          lineHeight: 1.45,
                        }}
                      >
                        No recent runs match the current audit filters.
                      </div>
                    ) : null}
                    {filteredRecentRuns.slice(0, 3).map((run, index) => (
                      <div
                        key={`${run.recordedAt}-${index}`}
                        style={{
                          borderRadius: 8,
                          border: "1px solid rgba(26,32,64,0.9)",
                          background: "#080d18",
                          padding: "8px 9px",
                          display: "grid",
                          gap: 4,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            flexWrap: "wrap",
                          }}
                        >
                          <span
                            style={{
                              color:
                                run.status === "ok" ? "#86efac" : "#fca5a5",
                              fontSize: 10,
                              fontWeight: 700,
                            }}
                          >
                            {run.status.toUpperCase()}
                          </span>
                          <span style={{ color: "#9fb7ff", fontSize: 10 }}>
                            {fmtExecutionOrigin(run.executionOrigin)}
                          </span>
                          <span style={{ color: "#6875a0", fontSize: 10 }}>
                            {new Date(run.recordedAt).toLocaleString()}
                          </span>
                        </div>
                        <div
                          style={{
                            color: "#6875a0",
                            fontSize: 10,
                            lineHeight: 1.45,
                          }}
                        >
                          {run.wroteArtifact && run.artifactTarget
                            ? `Artifact → ${run.artifactTarget}`
                            : "No artifact"}
                          {" · "}
                          {run.cacheStrategy === "system_plus_user_prefix"
                            ? "split prefix"
                            : "system-only cache"}
                          {" · "}
                          {fmtBatchMode(run.batchMode)}
                          {run.cacheHit ? " · cache hit" : ""}
                        </div>
                        <div
                          style={{
                            color: "#cbd5e1",
                            fontSize: 10,
                            lineHeight: 1.45,
                          }}
                        >
                          {run.summary}
                        </div>
                      </div>
                    ))}
                  </div>
                </details>
              ) : null}
              <div
                style={{
                  marginTop: 8,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  flexWrap: "wrap",
                }}
              >
                <button
                  onClick={() => onToggleJob(job.id)}
                  style={{
                    borderRadius: 6,
                    border: "1px solid #1A2040",
                    background: "transparent",
                    color: "#ccd6f6",
                    padding: "4px 8px",
                    cursor: "pointer",
                    fontSize: 10,
                  }}
                >
                  {job.enabled ? "Disable" : "Enable"}
                </button>
                <details
                  style={{
                    borderRadius: 8,
                    border: "1px solid #1A2040",
                    background: "#0a1120",
                    padding: "6px 8px",
                  }}
                >
                  <summary
                    style={{
                      cursor: "pointer",
                      fontSize: 10,
                      fontWeight: 700,
                      color: "#cbd5e1",
                    }}
                  >
                    Manage job
                  </summary>
                  <div
                    style={{
                      marginTop: 8,
                      display: "flex",
                      gap: 6,
                      flexWrap: "wrap",
                    }}
                  >
                    <button
                      onClick={() => {
                        void onCopyJobAudit(job);
                      }}
                      style={{
                        borderRadius: 6,
                        border: "1px solid rgba(0,221,255,.35)",
                        background: "rgba(0,221,255,.08)",
                        color: "#00DDFF",
                        padding: "4px 8px",
                        cursor: "pointer",
                        fontSize: 10,
                      }}
                    >
                      Copy job audit
                    </button>
                    <button
                      onClick={() => onExportJobAudit(job)}
                      style={{
                        borderRadius: 6,
                        border: "1px solid #1A2040",
                        background: "#10182c",
                        color: "#cbd5e1",
                        padding: "4px 8px",
                        cursor: "pointer",
                        fontSize: 10,
                      }}
                    >
                      Export job audit
                    </button>
                    {job.lastStatus === "queued" && job.pendingBatchId ? (
                      <button
                        onClick={() => onClearQueuedJob(job.id)}
                        style={{
                          borderRadius: 6,
                          border: "1px solid rgba(125,211,252,.45)",
                          background: "rgba(14,165,233,.1)",
                          color: "#7dd3fc",
                          padding: "4px 8px",
                          cursor: "pointer",
                          fontSize: 10,
                        }}
                      >
                        Clear queue
                      </button>
                    ) : null}
                    <button
                      onClick={() => onRemoveJob(job.id)}
                      style={{
                        borderRadius: 6,
                        border: "1px solid rgba(239,68,68,.45)",
                        background: "rgba(239,68,68,.1)",
                        color: "#ef4444",
                        padding: "4px 8px",
                        cursor: "pointer",
                        fontSize: 10,
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </details>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
