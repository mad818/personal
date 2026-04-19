"use client";

import { useMemo } from "react";
import { DEFAULT_SKILLS } from "@/lib/skillEngine";
import { buildMemorySpineSnapshot } from "@/lib/memorySpine";
import {
  buildCapabilityAuditSummary,
  type CapabilityAuditSignalState,
} from "@/lib/nativeAssimilation";
import {
  resolveSurfaceCapabilityId,
  type SurfaceCapabilityId,
} from "@/lib/resourceSessionRegistry";
import { useBrowserOpsReadiness } from "@/hooks/useBrowserOpsReadiness";
import { useStore } from "@/store/useStore";
import { ShellBadge } from "@/components/ui/shell";
import { SurfaceCallout } from "@/components/ui/surfacePrimitives";

interface NativeCapabilityAuditCardProps {
  surfaceId?: SurfaceCapabilityId | "global" | string;
  title?: string;
  detail?: string;
  workflowCatalogCount?: number;
  showNextMoves?: boolean;
}

function signalTone(state: CapabilityAuditSignalState) {
  if (state === "strong") return "success" as const;
  if (state === "watch") return "muted" as const;
  return "accent" as const;
}

function summaryTone(score: number) {
  if (score >= 75) return "success" as const;
  if (score >= 50) return "info" as const;
  return "warning" as const;
}

export default function NativeCapabilityAuditCard({
  surfaceId = "global",
  title = "Native capability audit",
  detail = "Check which native lanes are strong enough to absorb upstream ideas without widening the shell.",
  workflowCatalogCount = 0,
  showNextMoves = true,
}: NativeCapabilityAuditCardProps) {
  const scheduledJobs = useStore((s) => s.settings.scheduledJobs ?? []);
  const savedArticles = useStore((s) => s.savedArticles);
  const agentLearnings = useStore((s) => s.agentLearnings);
  const agentRunHistory = useStore((s) => s.agentRunHistory);
  const modeBriefings = useStore((s) => s.modeBriefings);
  const contextLoadReport = useStore((s) => s.contextLoadReport);
  const { snapshot: browserOps, loadError } = useBrowserOpsReadiness();
  const resolvedSurfaceId =
    surfaceId === "global" ? "global" : resolveSurfaceCapabilityId(surfaceId) ?? "global";

  const memorySnapshot = useMemo(
    () =>
      buildMemorySpineSnapshot({
        savedArticles,
        agentLearnings,
        agentRunHistory,
        modeBriefings,
      }),
    [agentLearnings, agentRunHistory, modeBriefings, savedArticles],
  );

  const audit = useMemo(
    () =>
      buildCapabilityAuditSummary({
        surfaceId: resolvedSurfaceId,
        skills: DEFAULT_SKILLS,
        scheduledJobs,
        memoryTotal: memorySnapshot.total,
        workflowCatalogCount,
        contextLoadReport,
        browserOps,
      }),
    [
      browserOps,
      contextLoadReport,
      memorySnapshot.total,
      resolvedSurfaceId,
      scheduledJobs,
      workflowCatalogCount,
    ],
  );

  const strongCount = audit.signals.filter(
    (signal) => signal.state === "strong",
  ).length;
  const watchCount = audit.signals.filter(
    (signal) => signal.state === "watch",
  ).length;
  const gapCount = audit.signals.filter((signal) => signal.state === "gap").length;

  return (
    <div style={{ display: "grid", gap: "12px" }}>
      <SurfaceCallout
        tone={summaryTone(audit.score)}
        compact
        icon="◎"
        title={title}
        description={`${audit.headline}. ${detail}`}
      >
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
          <ShellBadge tone="accent">Score {audit.score}</ShellBadge>
          <ShellBadge tone="success">{strongCount} strong</ShellBadge>
          <ShellBadge tone="muted">{watchCount} watch</ShellBadge>
          <ShellBadge tone="accent">{gapCount} gaps</ShellBadge>
          <ShellBadge tone="muted">
            {audit.governance.approvalRequiredCount} approval-gated
          </ShellBadge>
          <ShellBadge tone="muted">
            {audit.governance.highRiskCapabilityCount} tier-2 lanes
          </ShellBadge>
        </div>
      </SurfaceCallout>

      <div
        style={{
          display: "grid",
          gap: "8px",
          padding: "12px",
          borderRadius: "12px",
          border: "1px solid var(--border)",
          background: "rgba(10, 15, 30, 0.58)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "8px",
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              fontSize: "10px",
              fontWeight: 800,
              letterSpacing: ".12em",
              textTransform: "uppercase",
              color: "var(--text3)",
            }}
          >
            Governance control plane
          </div>
          <ShellBadge
            tone={
              audit.governance.highRiskUngatedJobs > 0
                ? "accent"
                : audit.governance.missingMetadataGaps > 0 ||
                    audit.governance.missingPackJobs > 0
                  ? "muted"
                  : "success"
            }
          >
            {audit.governance.baselinePackId} baseline
          </ShellBadge>
        </div>
        <div style={{ fontSize: "11px", lineHeight: 1.6, color: "var(--text2)" }}>
          {audit.governance.detail}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
          <ShellBadge tone="muted">
            {audit.governance.domainTagCount} domain tags
          </ShellBadge>
          <ShellBadge tone="muted">
            T0 {audit.governance.byRisk.tier0}
          </ShellBadge>
          <ShellBadge tone="muted">
            T1 {audit.governance.byRisk.tier1}
          </ShellBadge>
          <ShellBadge tone="muted">
            T2 {audit.governance.byRisk.tier2}
          </ShellBadge>
          <ShellBadge tone="muted">
            {audit.governance.operatorOnlyCount} operator-only
          </ShellBadge>
          <ShellBadge tone="muted">
            {audit.governance.missingMetadataGaps} metadata gaps
          </ShellBadge>
          <ShellBadge tone="muted">
            {audit.governance.missingPackJobs} pack repair
          </ShellBadge>
          <ShellBadge
            tone={audit.governance.highRiskUngatedJobs > 0 ? "accent" : "success"}
          >
            {audit.governance.highRiskUngatedJobs} ungated tier-2
          </ShellBadge>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "10px",
        }}
      >
        {audit.signals.map((signal) => (
          <article
            key={signal.id}
            style={{
              display: "grid",
              gap: "8px",
              minHeight: "112px",
              padding: "12px",
              borderRadius: "12px",
              border: "1px solid var(--border)",
              background:
                "linear-gradient(180deg, rgba(13, 16, 22, 0.94), rgba(9, 10, 13, 0.98))",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: "8px",
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <div
                style={{
                  fontSize: "10px",
                  fontWeight: 800,
                  letterSpacing: ".12em",
                  textTransform: "uppercase",
                  color: "var(--text3)",
                }}
              >
                {signal.label}
              </div>
              <ShellBadge tone={signalTone(signal.state)}>{signal.state}</ShellBadge>
            </div>
            <div
              style={{
                fontSize: "11px",
                lineHeight: 1.6,
                color: "var(--text2)",
              }}
            >
              {signal.note}
            </div>
          </article>
        ))}
      </div>

      {loadError &&
      (resolvedSurfaceId === "global" ||
        resolvedSurfaceId === "command" ||
        resolvedSurfaceId === "recon" ||
        resolvedSurfaceId === "resources") ? (
        <SurfaceCallout
          tone="warning"
          compact
          icon="↺"
          title="Browser-ops posture unavailable"
          description={loadError}
        />
      ) : null}

      {showNextMoves && audit.nextMoves.length ? (
        <div
          style={{
            display: "grid",
            gap: "8px",
            padding: "12px",
            borderRadius: "12px",
            border: "1px solid var(--border)",
            background: "rgba(10, 15, 30, 0.58)",
          }}
        >
          <div
            style={{
              fontSize: "10px",
              fontWeight: 800,
              letterSpacing: ".12em",
              textTransform: "uppercase",
              color: "var(--text3)",
            }}
          >
            Native next moves
          </div>
          <div style={{ display: "grid", gap: "8px" }}>
            {audit.nextMoves.map((move) => (
              <div
                key={move}
                style={{
                  fontSize: "11px",
                  lineHeight: 1.6,
                  color: "var(--text2)",
                }}
              >
                {move}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
