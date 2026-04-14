"use client";

import { useMemo, useState } from "react";
import { ShellBadge } from "@/components/ui/shell";
import {
  SurfaceCallout,
  SurfaceEmpty,
} from "@/components/ui/surfacePrimitives";
import { HQ_WORKFLOW_CATALOG } from "@/components/home/office/workflowCommands";
import { buildWorkflowOpsSnapshot } from "@/lib/nativeAssimilation";
import { useStore } from "@/store/useStore";

const WORKFLOW_HOOK_POSTURE = [
  {
    id: "workflow-writeback",
    label: "Workflow writeback",
    state: "active",
    detail:
      "Successful HQ workflow runs auto-write compiled memory pages into the local memory spine.",
  },
  {
    id: "scheduler-writeback",
    label: "Scheduler writeback",
    state: "active",
    detail:
      "Scheduler jobs targeting vault or review also write compiled pages for durable local recall.",
  },
  {
    id: "reply-memory-bridge",
    label: "Reply memory bridge",
    state: "active",
    detail:
      "HQ prompts and finished replies can be promoted into COMMAND's native memory lane with one click.",
  },
  {
    id: "visibility-clamp",
    label: "Visibility clamp",
    state: "active",
    detail:
      "Manual filing can raise sensitivity, but detected internal or restricted content cannot be downgraded.",
  },
  {
    id: "mission-templates",
    label: "Mission templates",
    state: "next",
    detail:
      "Scheduler-ready workflow mission templates are still pending as the next follow-up batch.",
  },
] as const;

function statusTone(
  status: "active" | "queued" | "blocked" | "handoff" | "ready" | "standby",
) {
  if (status === "active" || status === "ready") return "success" as const;
  if (status === "queued" || status === "handoff") return "accent" as const;
  if (status === "blocked") return "muted" as const;
  return "muted" as const;
}

function summaryTone(snapshot: ReturnType<typeof buildWorkflowOpsSnapshot>) {
  if (snapshot.blockedCount > 0) return "warning" as const;
  if (snapshot.activeCount > 0 || snapshot.queuedCount > 0) return "info" as const;
  return "success" as const;
}

export default function WorkflowCommandOpsCard() {
  const [expanded, setExpanded] = useState(true);
  const scheduledJobs = useStore((s) => s.settings.scheduledJobs ?? []);
  const agentRuntime = useStore((s) => s.agentRuntime);
  const unfinishedSessions = useStore((s) => s.unfinishedSessions);

  const snapshot = useMemo(
    () =>
      buildWorkflowOpsSnapshot({
        jobs: scheduledJobs,
        runtime: agentRuntime,
        unfinishedSessions,
        workflowCatalog: HQ_WORKFLOW_CATALOG,
      }),
    [agentRuntime, scheduledJobs, unfinishedSessions],
  );

  const workflowOpsSummary = useMemo(() => {
    const queueLines = snapshot.items
      .map(
        (item) =>
          `- ${item.label} | owner=${item.owner} | status=${item.status} | ${item.note}`,
      )
      .join("\n");
    const catalogLines = HQ_WORKFLOW_CATALOG.map(
      (workflow) =>
        `- ${workflow.command} | ${workflow.label} | agent=${workflow.agent.toUpperCase()} | route=${workflow.route} | ${workflow.automationPosture}`,
    ).join("\n");
    return [
      "Native workflow ops summary",
      `Headline: ${snapshot.headline}`,
      `Queued: ${snapshot.queuedCount}`,
      `Blocked: ${snapshot.blockedCount}`,
      `Handoffs: ${snapshot.handoffCount}`,
      `Owners: ${snapshot.ownerCount}`,
      `Review gates: ${snapshot.reviewGatedJobs}`,
      `Measured runs: ${snapshot.measuredRuns}`,
      "",
      "Active queue:",
      queueLines || "- Ops spine standing by",
      "",
      "Workflow catalog:",
      catalogLines,
    ].join("\n");
  }, [snapshot]);

  const [copyMsg, setCopyMsg] = useState("");

  const handleCopySummary = async () => {
    try {
      await navigator.clipboard.writeText(workflowOpsSummary);
      setCopyMsg("Ops summary copied.");
    } catch {
      setCopyMsg("Copy failed.");
    }
  };

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surf2)] p-3 text-xs">
      <button
        type="button"
        className="flex w-full items-center justify-between text-left text-[var(--text2)] hover:text-[var(--text)]"
        onClick={() => setExpanded((value) => !value)}
      >
        <span className="font-mono font-semibold tracking-wider">WORKFLOW OPS</span>
        <div className="flex items-center gap-2">
          <span className="text-[9px] text-[var(--text3)]">
            {snapshot.items.length} live items
          </span>
          <span>{expanded ? "▲" : "▼"}</span>
        </div>
      </button>

      {expanded ? (
        <div className="mt-3 flex flex-col gap-3">
          <SurfaceCallout
            tone={summaryTone(snapshot)}
            compact
            icon="◎"
            title={snapshot.headline}
            description={snapshot.detail}
          >
            <div className="flex flex-wrap gap-1.5">
              <ShellBadge tone="success">{snapshot.activeCount} live</ShellBadge>
              <ShellBadge tone="accent">{snapshot.queuedCount} queued</ShellBadge>
              <ShellBadge tone="accent">{snapshot.handoffCount} handoff</ShellBadge>
              <ShellBadge tone="muted">{snapshot.ownerCount} owners</ShellBadge>
              <ShellBadge
                tone={
                  snapshot.governance.highRiskUngatedJobs > 0
                    ? "accent"
                    : snapshot.governance.missingPackJobs > 0
                      ? "muted"
                      : "success"
                }
              >
                Governance {snapshot.governance.highRiskUngatedJobs > 0 ? "repair" : "aligned"}
              </ShellBadge>
            </div>
          </SurfaceCallout>

          <SurfaceCallout
            tone={
              snapshot.governance.highRiskUngatedJobs > 0
                ? "warning"
                : snapshot.governance.missingPackJobs > 0 ||
                    snapshot.governance.missingApprovalJobs > 0
                  ? "info"
                  : "success"
            }
            compact
            icon="Slash"
            title={snapshot.governance.headline}
            description={snapshot.governance.detail}
          >
            <div className="flex flex-wrap gap-1.5">
              <ShellBadge tone="muted">
                {snapshot.governance.missingPackJobs} pack gaps
              </ShellBadge>
              <ShellBadge tone="muted">
                {snapshot.governance.missingApprovalJobs} approval gaps
              </ShellBadge>
              <ShellBadge
                tone={snapshot.governance.highRiskUngatedJobs > 0 ? "accent" : "success"}
              >
                {snapshot.governance.highRiskUngatedJobs} ungated tier-2
              </ShellBadge>
            </div>
          </SurfaceCallout>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void handleCopySummary()}
              className="nexus-shell-button"
              style={{ minHeight: "30px", padding: "0 10px", fontSize: "11px" }}
            >
              Copy ops summary
            </button>
            {copyMsg ? (
              <span className="text-[10px] text-[var(--text3)]">{copyMsg}</span>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-2 text-[10px] sm:grid-cols-5">
            <div className="rounded-md border border-[var(--border)] bg-[var(--surf)] px-2 py-1.5">
              <div className="text-[var(--text3)]">Owners</div>
              <div className="mt-1 font-mono text-[var(--text)]">{snapshot.ownerCount}</div>
            </div>
            <div className="rounded-md border border-[var(--border)] bg-[var(--surf)] px-2 py-1.5">
              <div className="text-[var(--text3)]">Review-gated</div>
              <div className="mt-1 font-mono text-[var(--text)]">{snapshot.reviewGatedJobs}</div>
            </div>
            <div className="rounded-md border border-[var(--border)] bg-[var(--surf)] px-2 py-1.5">
              <div className="text-[var(--text3)]">Measured runs</div>
              <div className="mt-1 font-mono text-[var(--text)]">{snapshot.measuredRuns}</div>
            </div>
            <div className="rounded-md border border-[var(--border)] bg-[var(--surf)] px-2 py-1.5">
              <div className="text-[var(--text3)]">Ready lanes</div>
              <div className="mt-1 font-mono text-[var(--text)]">{snapshot.readyCount}</div>
            </div>
            <div className="rounded-md border border-[var(--border)] bg-[var(--surf)] px-2 py-1.5">
              <div className="text-[var(--text3)]">Blocked</div>
              <div className="mt-1 font-mono text-[var(--text)]">{snapshot.blockedCount}</div>
            </div>
          </div>

          {snapshot.items.length ? (
            <div className="flex flex-col gap-2">
              {snapshot.items.map((item) => (
                <article
                  key={item.id}
                  className="rounded-md border border-[var(--border)] bg-[var(--surf)] px-3 py-2"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="font-mono text-[11px] text-[var(--text)]">
                      {item.label}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <ShellBadge tone={statusTone(item.status)}>{item.status}</ShellBadge>
                      <ShellBadge tone="muted">{item.owner}</ShellBadge>
                      <ShellBadge tone="muted">{item.source}</ShellBadge>
                    </div>
                  </div>
                  <div className="mt-1 text-[10px] leading-5 text-[var(--text3)]">
                    {item.note}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <SurfaceEmpty
              compact
              icon="◎"
              title="Ops spine standing by"
              description="No governed mission queue or continuation handoff is active yet."
            />
          )}

          <details className="nexus-surface-disclosure">
            <summary>Assimilation posture</summary>
            <div className="nexus-surface-disclosure__body">
              <SurfaceCallout
                tone="info"
                compact
                icon="Slash"
                title="Native Multica and xyOps patterns"
                description="Queue ownership, scheduler governance, and handoff posture now stay inside COMMAND instead of spawning a second board or incident shell."
              />
              <div className="mt-3 flex flex-col gap-2">
                {WORKFLOW_HOOK_POSTURE.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-md border border-[var(--border)] bg-[var(--surf)] px-3 py-2"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-[11px] font-medium text-[var(--text)]">
                        {item.label}
                      </div>
                      <ShellBadge tone={item.state === "active" ? "success" : "muted"}>
                        {item.state}
                      </ShellBadge>
                    </div>
                    <div className="mt-1 text-[10px] leading-5 text-[var(--text3)]">
                      {item.detail}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </details>

          <details className="nexus-surface-disclosure">
            <summary>Workflow catalog</summary>
            <div className="nexus-surface-disclosure__body">
              <div className="flex flex-col gap-2">
                {HQ_WORKFLOW_CATALOG.map((workflow) => (
                  <div
                    key={workflow.id}
                    className="rounded-md border border-[var(--border)] bg-[var(--surf)] px-3 py-2"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="font-mono text-[11px] text-[var(--text)]">
                        {workflow.command}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        <ShellBadge tone="accent">{workflow.source}</ShellBadge>
                        <ShellBadge
                          tone={
                            workflow.automationPosture === "candidate_with_human_gate"
                              ? "success"
                              : "muted"
                          }
                        >
                          {workflow.automationPosture === "candidate_with_human_gate"
                            ? "automation candidate"
                            : "review only"}
                        </ShellBadge>
                      </div>
                    </div>
                    <div className="mt-1 text-[11px] font-medium text-[var(--text)]">
                      {workflow.label}
                    </div>
                    <div className="mt-1 text-[10px] leading-5 text-[var(--text3)]">
                      Agent {workflow.agent.toUpperCase()} · Route {workflow.route} · Output{" "}
                      {workflow.outputLayer}
                      {workflow.defensiveOnly ? " · defensive only" : ""}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </details>
        </div>
      ) : null}
    </div>
  );
}
