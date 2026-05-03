"use client";

import { ShellBadge } from "@/components/ui/shell";
import { SurfaceCallout } from "@/components/ui/surfacePrimitives";
import { HQ_WORKFLOW_CATALOG } from "@/components/home/office/workflowCommands";
import { analyzeScheduledJobs } from "@/lib/schedulerGovernance";
import type { ScheduledJob } from "@/store/useStore";

function fmtChars(value: number) {
  return `${value.toLocaleString()} ch`;
}

export default function SchedulerGovernanceCard({
  jobs,
}: {
  jobs: ScheduledJob[];
}) {
  const snapshot = analyzeScheduledJobs(jobs);
  const automationCandidates = HQ_WORKFLOW_CATALOG.filter(
    (workflow) => workflow.automationPosture === "candidate_with_human_gate",
  );
  const reviewOnly = HQ_WORKFLOW_CATALOG.filter(
    (workflow) => workflow.automationPosture === "review_only",
  );

  return (
    <div
      style={{
        border: "1px solid #1A2040",
        borderRadius: 10,
        background: "#080d18",
        padding: "10px 12px",
        display: "grid",
        gap: 10,
      }}
    >
      <SurfaceCallout
        tone={snapshot.recommendations[0]?.tone ?? "info"}
        compact
        icon="Clock3"
        title={snapshot.recommendations[0]?.title ?? "Scheduler posture"}
        description={
          snapshot.recommendations[0]?.detail ??
          "No scheduler governance guidance available."
        }
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: 8,
        }}
      >
        <div
          style={{
            borderRadius: 8,
            border: "1px solid #1A2040",
            background: "#0a1120",
            padding: "8px 10px",
          }}
        >
          <div style={{ color: "#6875a0", fontSize: 10 }}>Active jobs</div>
          <div style={{ marginTop: 4, color: "#ccd6f6", fontFamily: "monospace", fontSize: 12 }}>
            {snapshot.activeJobs}
          </div>
        </div>
        <div
          style={{
            borderRadius: 8,
            border: "1px solid #1A2040",
            background: "#0a1120",
            padding: "8px 10px",
          }}
        >
          <div style={{ color: "#6875a0", fontSize: 10 }}>Durable outputs</div>
          <div style={{ marginTop: 4, color: "#ccd6f6", fontFamily: "monospace", fontSize: 12 }}>
            {snapshot.durableArtifactJobs}
          </div>
        </div>
        <div
          style={{
            borderRadius: 8,
            border: "1px solid #1A2040",
            background: "#0a1120",
            padding: "8px 10px",
          }}
        >
          <div style={{ color: "#6875a0", fontSize: 10 }}>Measured runs</div>
          <div style={{ marginTop: 4, color: "#ccd6f6", fontFamily: "monospace", fontSize: 12 }}>
            {snapshot.completedEfficiencySnapshots}
          </div>
        </div>
        <div
          style={{
            borderRadius: 8,
            border: "1px solid #1A2040",
            background: "#0a1120",
            padding: "8px 10px",
          }}
        >
          <div style={{ color: "#6875a0", fontSize: 10 }}>Queued native</div>
          <div style={{ marginTop: 4, color: "#ccd6f6", fontFamily: "monospace", fontSize: 12 }}>
            {snapshot.queuedJobs}
          </div>
        </div>
        <div
          style={{
            borderRadius: 8,
            border: "1px solid #1A2040",
            background: "#0a1120",
            padding: "8px 10px",
          }}
        >
          <div style={{ color: "#6875a0", fontSize: 10 }}>Prompt weight</div>
          <div style={{ marginTop: 4, color: "#ccd6f6", fontFamily: "monospace", fontSize: 12 }}>
            {fmtChars(snapshot.measuredPromptChars || snapshot.totalPromptChars)}
          </div>
        </div>
        <div
          style={{
            borderRadius: 8,
            border: "1px solid #1A2040",
            background: "#0a1120",
            padding: "8px 10px",
          }}
        >
          <div style={{ color: "#6875a0", fontSize: 10 }}>Low-cache runs</div>
          <div style={{ marginTop: 4, color: "#ccd6f6", fontFamily: "monospace", fontSize: 12 }}>
            {snapshot.lowCacheabilityRuns}
          </div>
        </div>
        <div
          style={{
            borderRadius: 8,
            border: "1px solid #1A2040",
            background: "#0a1120",
            padding: "8px 10px",
          }}
        >
          <div style={{ color: "#6875a0", fontSize: 10 }}>Unmeasured</div>
          <div style={{ marginTop: 4, color: "#ccd6f6", fontFamily: "monospace", fontSize: 12 }}>
            {snapshot.unmeasuredActiveJobs}
          </div>
        </div>
        <div
          style={{
            borderRadius: 8,
            border: "1px solid #1A2040",
            background: "#0a1120",
            padding: "8px 10px",
          }}
        >
          <div style={{ color: "#6875a0", fontSize: 10 }}>Approve-on-write</div>
          <div style={{ marginTop: 4, color: "#ccd6f6", fontFamily: "monospace", fontSize: 12 }}>
            {snapshot.approveOnWriteJobs}
          </div>
        </div>
        <div
          style={{
            borderRadius: 8,
            border: "1px solid #1A2040",
            background: "#0a1120",
            padding: "8px 10px",
          }}
        >
          <div style={{ color: "#6875a0", fontSize: 10 }}>Mission jobs</div>
          <div style={{ marginTop: 4, color: "#ccd6f6", fontFamily: "monospace", fontSize: 12 }}>
            {snapshot.missionJobs}
          </div>
        </div>
        <div
          style={{
            borderRadius: 8,
            border: "1px solid #1A2040",
            background: "#0a1120",
            padding: "8px 10px",
          }}
        >
          <div style={{ color: "#6875a0", fontSize: 10 }}>Review contracts</div>
          <div style={{ marginTop: 4, color: "#ccd6f6", fontFamily: "monospace", fontSize: 12 }}>
            {snapshot.missionReviewContractJobs}
          </div>
        </div>
        <div
          style={{
            borderRadius: 8,
            border: "1px solid #1A2040",
            background: "#0a1120",
            padding: "8px 10px",
          }}
        >
          <div style={{ color: "#6875a0", fontSize: 10 }}>Pending review</div>
          <div style={{ marginTop: 4, color: "#ccd6f6", fontFamily: "monospace", fontSize: 12 }}>
            {snapshot.pendingMissionReviews}
          </div>
        </div>
        <div
          style={{
            borderRadius: 8,
            border: "1px solid #1A2040",
            background: "#0a1120",
            padding: "8px 10px",
          }}
        >
          <div style={{ color: "#6875a0", fontSize: 10 }}>Expired review</div>
          <div style={{ marginTop: 4, color: "#ccd6f6", fontFamily: "monospace", fontSize: 12 }}>
            {snapshot.expiredMissionReviews}
          </div>
        </div>
      </div>

      {snapshot.recommendations.length > 1 ? (
        <div style={{ display: "grid", gap: 8 }}>
          {snapshot.recommendations.slice(1).map((item) => (
            <div
              key={item.id}
              style={{
                borderRadius: 8,
                border: "1px solid #1A2040",
                background: "#0a1120",
                padding: "8px 10px",
              }}
            >
              <div style={{ color: "#ccd6f6", fontSize: 11, fontWeight: 700 }}>
                {item.title}
              </div>
              <div style={{ color: "#6875a0", fontSize: 10, marginTop: 4, lineHeight: 1.5 }}>
                {item.detail}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <div style={{ display: "grid", gap: 8 }}>
        <div
          style={{
            borderRadius: 8,
            border: "1px solid #1A2040",
            background: "#0a1120",
            padding: "8px 10px",
          }}
        >
          <div style={{ color: "#cbd5e1", fontSize: 11, fontWeight: 700 }}>
            Reviewed mission posture
          </div>
          <div style={{ color: "#6875a0", fontSize: 10, marginTop: 4, lineHeight: 1.5 }}>
            {snapshot.missionJobs > 0
              ? `${snapshot.missionReviewContractJobs}/${snapshot.missionJobs} active mission jobs carry a bounded review contract, ${snapshot.pendingMissionReviews} are waiting on operator review, and ${snapshot.expiredMissionReviews} have passed their review window.`
              : "No mission jobs are active yet, so overnight review posture is still defined by manual dispatch."}
          </div>
        </div>
        <div style={{ color: "#f59e0b", fontWeight: 800, fontSize: 11 }}>
          WORKFLOW AUTOMATION POSTURE
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          <ShellBadge tone="success">
            {automationCandidates.length} candidate with human gate
          </ShellBadge>
          <ShellBadge tone="muted">{reviewOnly.length} review only</ShellBadge>
          <ShellBadge tone="muted">
            {snapshot.reviewGatedJobs} active human-gated jobs
          </ShellBadge>
          <ShellBadge tone="muted">
            {snapshot.observeOnlyJobs} observe-only jobs
          </ShellBadge>
          <ShellBadge tone="muted">
            {snapshot.heavyMeasuredRuns} heavy measured runs
          </ShellBadge>
          <ShellBadge tone="muted">
            {snapshot.splitPrefixRuns} split-prefix runs
          </ShellBadge>
          <ShellBadge tone="muted">
            {snapshot.sharedWindowRuns} shared-window runs
          </ShellBadge>
          <ShellBadge tone="muted">
            {snapshot.batchedRuns} batched runs
          </ShellBadge>
          <ShellBadge tone="muted">
            {snapshot.providerNativeBatchRuns} provider-native batch runs
          </ShellBadge>
          <ShellBadge tone="muted">
            {snapshot.queuedFailureJobs} queued trouble
          </ShellBadge>
          <ShellBadge tone="muted">
            {snapshot.cacheHitRuns}/{snapshot.observedCacheRuns} cache-hit runs
          </ShellBadge>
        </div>
        <div style={{ display: "grid", gap: 6 }}>
          {automationCandidates.slice(0, 3).map((workflow) => (
            <div
              key={workflow.id}
              style={{
                borderRadius: 8,
                border: "1px solid #1A2040",
                background: "#0a1120",
                padding: "8px 10px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ color: "#ccd6f6", fontSize: 11, fontWeight: 700 }}>
                  {workflow.command}
                </span>
                <span style={{ color: "#6875a0", fontSize: 10 }}>
                  {workflow.agent.toUpperCase()} · {workflow.route}
                </span>
              </div>
              <div style={{ color: "#6875a0", fontSize: 10, marginTop: 4, lineHeight: 1.5 }}>
                {workflow.automationGuidance}
              </div>
            </div>
          ))}
          {reviewOnly.slice(0, 2).map((workflow) => (
            <div
              key={workflow.id}
              style={{
                borderRadius: 8,
                border: "1px solid rgba(245,158,11,.28)",
                background: "rgba(245,158,11,.08)",
                padding: "8px 10px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ color: "#fbbf24", fontSize: 11, fontWeight: 700 }}>
                  {workflow.command}
                </span>
                <span style={{ color: "#cbd5e1", fontSize: 10 }}>
                  Review only
                </span>
              </div>
              <div style={{ color: "#cbd5e1", fontSize: 10, marginTop: 4, lineHeight: 1.5 }}>
                {workflow.automationGuidance}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
