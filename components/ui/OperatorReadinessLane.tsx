"use client";

import { useEffect, useMemo, useState } from "react";
import { DEFAULT_SKILLS } from "@/lib/skillEngine";
import { buildMemorySpineSnapshot } from "@/lib/memorySpine";
import { timeAgo } from "@/lib/helpers";
import {
  buildCapabilityAuditSummary,
  buildMemoryLifecycleSummary,
  buildWorkflowOpsSnapshot,
} from "@/lib/nativeAssimilation";
import {
  resolveSurfaceCapabilityId,
  type SurfaceCapabilityId,
} from "@/lib/resourceSessionRegistry";
import { apiFetch } from "@/lib/apiFetch";
import { useBrowserOpsReadiness } from "@/hooks/useBrowserOpsReadiness";
import { useForecastEvalReadiness } from "@/hooks/useForecastEvalReadiness";
import { useSchedulerEfficiencyReadiness } from "@/hooks/useSchedulerEfficiencyReadiness";
import { ShellBadge } from "@/components/ui/shell";
import {
  SurfaceCallout,
  SurfaceSkeletonRows,
} from "@/components/ui/surfacePrimitives";
import { useStore } from "@/store/useStore";
import type { HQWorkflowCatalogItem } from "@/components/home/office/workflowCommands";

interface SettingsReadinessResponse {
  secretPosture: {
    inventoryCount: number;
    configuredCount: number;
    readonlyConfiguredCount: number;
    editableConfiguredCount: number;
    tokenGateConfigured: boolean;
    localEnvOnly: boolean;
    rawValuesReturned: boolean;
  };
  providers: {
    counts: {
      ready: number;
      availableIfConfigured: number;
      hiddenByDefault: number;
      configured: number;
    };
  };
}

interface OperatorReadinessLaneProps {
  surfaceId?: SurfaceCapabilityId | "global" | string;
  title?: string;
  detail?: string;
  workflowCatalog?: HQWorkflowCatalogItem[];
  showNextMoves?: boolean;
}

function summaryTone(
  score: number,
  tokenGateConfigured: boolean,
  configuredSecrets: number,
) {
  if (!tokenGateConfigured || configuredSecrets === 0)
    return "warning" as const;
  if (score >= 75) return "success" as const;
  return "info" as const;
}

function browserLabel(
  value: "standby" | "companion_ready" | "not_configured" | null | undefined,
) {
  if (value === "companion_ready") return "Browser companion ready";
  if (value === "not_configured") return "Browser companion optional";
  return "Guarded browser standby";
}

export default function OperatorReadinessLane({
  surfaceId = "global",
  title = "Operator readiness lane",
  detail = "Security posture, provider readiness, workflow ops, memory lifecycle, and capability coverage in one compact rail.",
  workflowCatalog = [],
  showNextMoves = true,
}: OperatorReadinessLaneProps) {
  const scheduledJobs = useStore((s) => s.settings.scheduledJobs ?? []);
  const agentRuntime = useStore((s) => s.agentRuntime);
  const unfinishedSessions = useStore((s) => s.unfinishedSessions);
  const savedArticles = useStore((s) => s.savedArticles);
  const agentLearnings = useStore((s) => s.agentLearnings);
  const agentRunHistory = useStore((s) => s.agentRunHistory);
  const modeBriefings = useStore((s) => s.modeBriefings);
  const contextLoadReport = useStore((s) => s.contextLoadReport);
  const resolvedSurfaceId =
    surfaceId === "global"
      ? "global"
      : (resolveSurfaceCapabilityId(surfaceId) ?? "global");
  const {
    snapshot: browserOps,
    loading: browserLoading,
    loadError,
  } = useBrowserOpsReadiness();
  const showForecastPosture =
    resolvedSurfaceId === "alpha" ||
    resolvedSurfaceId === "hq" ||
    resolvedSurfaceId === "command" ||
    resolvedSurfaceId === "resources" ||
    resolvedSurfaceId === "global";
  const showSchedulerPosture =
    resolvedSurfaceId === "hq" ||
    resolvedSurfaceId === "command" ||
    resolvedSurfaceId === "resources" ||
    resolvedSurfaceId === "skills" ||
    resolvedSurfaceId === "global";
  const {
    payload: forecastPayload,
    loading: forecastLoading,
    loadError: forecastLoadError,
  } = useForecastEvalReadiness(12, showForecastPosture);
  const {
    payload: schedulerPayload,
    loading: schedulerLoading,
    loadError: schedulerLoadError,
  } = useSchedulerEfficiencyReadiness(12, showSchedulerPosture);
  const [settingsReadiness, setSettingsReadiness] =
    useState<SettingsReadinessResponse | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsError, setSettingsError] = useState("");

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      setSettingsLoading(true);
      try {
        const response = await apiFetch("/api/settings");
        if (!response.ok) {
          throw new Error("Failed to load settings readiness.");
        }
        const payload = (await response.json()) as SettingsReadinessResponse;
        if (!active) return;
        setSettingsReadiness(payload);
        setSettingsError("");
      } catch {
        if (!active) return;
        setSettingsError(
          "Secret posture is temporarily unavailable. Raw values remain server-side even while the readiness lane is recovering.",
        );
      } finally {
        if (active) setSettingsLoading(false);
      }
    };

    void refresh();
    return () => {
      active = false;
    };
  }, []);

  const workflowOps = useMemo(
    () =>
      buildWorkflowOpsSnapshot({
        jobs: scheduledJobs,
        runtime: agentRuntime,
        unfinishedSessions,
        workflowCatalog,
      }),
    [agentRuntime, scheduledJobs, unfinishedSessions, workflowCatalog],
  );

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

  const memoryLifecycle = useMemo(
    () =>
      buildMemoryLifecycleSummary({
        total: memorySnapshot.total,
        latestUpdatedAt: memorySnapshot.latestUpdatedAt,
        countsByLayer: memorySnapshot.countsByLayer,
        countsByVisibility: memorySnapshot.countsByVisibility,
        items: memorySnapshot.items,
      }),
    [
      memorySnapshot.countsByLayer,
      memorySnapshot.countsByVisibility,
      memorySnapshot.items,
      memorySnapshot.latestUpdatedAt,
      memorySnapshot.total,
    ],
  );

  const capabilityAudit = useMemo(
    () =>
      buildCapabilityAuditSummary({
        surfaceId: resolvedSurfaceId,
        skills: DEFAULT_SKILLS,
        scheduledJobs,
        memoryTotal: memorySnapshot.total,
        workflowCatalogCount: workflowCatalog.length,
        contextLoadReport,
        browserOps,
      }),
    [
      browserOps,
      contextLoadReport,
      memorySnapshot.total,
      resolvedSurfaceId,
      scheduledJobs,
      workflowCatalog.length,
    ],
  );

  const secretPosture = settingsReadiness?.secretPosture;
  const providerCounts = settingsReadiness?.providers.counts;
  const forecastLatest = showForecastPosture ? forecastPayload?.latest : null;
  const schedulerLatest = showSchedulerPosture
    ? schedulerPayload?.latest
    : null;
  const loading =
    settingsLoading ||
    browserLoading ||
    (showForecastPosture && forecastLoading) ||
    (showSchedulerPosture && schedulerLoading);
  const readinessError =
    settingsError ||
    loadError ||
    (showSchedulerPosture ? schedulerLoadError : "") ||
    (showForecastPosture ? forecastLoadError : "");
  const forecastTone =
    forecastPayload?.freshness?.stale ||
    forecastLatest?.summary?.quality === "degraded"
      ? ("muted" as const)
      : forecastLatest?.summary?.quality === "ready"
        ? ("success" as const)
        : ("accent" as const);
  const schedulerTone =
    schedulerPayload?.freshness?.stale ||
    schedulerLatest?.summary?.quality === "degraded"
      ? ("muted" as const)
      : schedulerLatest?.summary?.quality === "ready"
        ? ("success" as const)
        : ("accent" as const);
  const schedulerSentence = schedulerLatest
    ? `${schedulerLatest.summary?.label ?? "Efficiency posture"} for ${schedulerLatest.summary?.measuredRuns ?? 0} measured recurring runs.`
    : "Efficiency bench standing by.";
  const forecastSentence = forecastLatest
    ? `${forecastLatest.summary?.label ?? "Baseline posture"} for ${forecastLatest.summary?.assetsCovered ?? 0}/${forecastLatest.summary?.assetsRequested ?? 0} assets.`
    : "Forecast bench standing by.";

  return (
    <div style={{ display: "grid", gap: "12px" }}>
      {loading && !settingsReadiness && !browserOps ? (
        <SurfaceSkeletonRows rows={3} height={44} />
      ) : null}

      <SurfaceCallout
        tone={summaryTone(
          capabilityAudit.score,
          secretPosture?.tokenGateConfigured ?? false,
          secretPosture?.configuredCount ?? 0,
        )}
        compact
        icon="◎"
        title={title}
        description={`${detail} ${browserLabel(browserOps?.state)}. ${showSchedulerPosture ? `${schedulerSentence} ` : ""}${showForecastPosture ? forecastSentence : ""}`}
      >
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
          {secretPosture ? (
            <ShellBadge tone="accent">
              Secrets {secretPosture.configuredCount}/
              {secretPosture.inventoryCount}
            </ShellBadge>
          ) : null}
          {providerCounts ? (
            <ShellBadge tone="success">
              Providers {providerCounts.ready} ready
            </ShellBadge>
          ) : null}
          <ShellBadge tone="muted">{workflowOps.headline}</ShellBadge>
          <ShellBadge
            tone={
              capabilityAudit.governance.highRiskUngatedJobs > 0
                ? "accent"
                : capabilityAudit.governance.missingPackJobs > 0 ||
                    capabilityAudit.governance.missingMetadataGaps > 0
                  ? "muted"
                  : "success"
            }
          >
            Governance{" "}
            {capabilityAudit.governance.highRiskUngatedJobs > 0
              ? "repair"
              : "aligned"}
          </ShellBadge>
          <ShellBadge tone="muted">
            {memoryLifecycle.freshnessLabel} archive
          </ShellBadge>
          {showSchedulerPosture ? (
            <ShellBadge tone={schedulerTone}>
              Efficiency {schedulerLatest?.summary?.quality ?? "standby"}
            </ShellBadge>
          ) : null}
          {showForecastPosture ? (
            <ShellBadge tone={forecastTone}>
              Forecast {forecastLatest?.summary?.quality ?? "standby"}
            </ShellBadge>
          ) : null}
          <ShellBadge tone="accent">
            Capability {capabilityAudit.score}
          </ShellBadge>
        </div>
      </SurfaceCallout>

      {readinessError && !loading ? (
        <SurfaceCallout
          role="alert"
          tone="warning"
          compact
          icon="↺"
          title="Readiness posture recovering"
          description={readinessError}
        />
      ) : null}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "10px",
        }}
      >
        <article className="nexus-shell-resource-card">
          <div className="nexus-shell-resource-card__meta">
            <span className="nexus-shell-resource-card__chip">
              Secret posture
            </span>
            {secretPosture?.localEnvOnly ? (
              <span className="nexus-shell-resource-card__chip">
                local env only
              </span>
            ) : null}
          </div>
          <div className="nexus-shell-resource-card__title">
            {secretPosture
              ? `${secretPosture.configuredCount}/${secretPosture.inventoryCount} configured`
              : "Server-side only"}
          </div>
          <p className="nexus-shell-resource-card__description">
            {secretPosture?.tokenGateConfigured
              ? `${secretPosture.readonlyConfiguredCount} internal gate token${secretPosture.readonlyConfiguredCount === 1 ? "" : "s"} stay readonly and never echo back through the client.`
              : "No auth gate token is confirmed yet. Keep secrets in .env.local and out of tracked files."}
          </p>
        </article>

        <article className="nexus-shell-resource-card">
          <div className="nexus-shell-resource-card__meta">
            <span className="nexus-shell-resource-card__chip">Providers</span>
            <span className="nexus-shell-resource-card__chip">
              BYOK bounded
            </span>
          </div>
          <div className="nexus-shell-resource-card__title">
            {providerCounts
              ? `${providerCounts.ready} ready lanes`
              : "Provider posture"}
          </div>
          <p className="nexus-shell-resource-card__description">
            {providerCounts
              ? `${providerCounts.availableIfConfigured} optional lanes can be configured, while ${providerCounts.hiddenByDefault} remain hidden until policy explicitly widens.`
              : "Provider readiness is loading."}
          </p>
        </article>

        <article className="nexus-shell-resource-card">
          <div className="nexus-shell-resource-card__meta">
            <span className="nexus-shell-resource-card__chip">Ops spine</span>
            <span className="nexus-shell-resource-card__chip">
              {browserLabel(browserOps?.state)}
            </span>
          </div>
          <div className="nexus-shell-resource-card__title">
            {workflowOps.headline}
          </div>
          <p className="nexus-shell-resource-card__description">
            {workflowOps.detail}
            {showSchedulerPosture && schedulerLatest?.summary?.strongestTakeaway
              ? ` ${schedulerLatest.summary.strongestTakeaway}`
              : ""}
          </p>
          <p className="nexus-shell-resource-card__note">
            {workflowOps.queuedCount} queued · {workflowOps.handoffCount}{" "}
            handoff · {browserOps?.guardedRouteCount ?? 0} guarded browser
            routes
            {showSchedulerPosture
              ? ` · cache ${schedulerLatest?.summary?.cacheObservedCoverage ?? 0}%`
              : ""}
          </p>
        </article>

        <article className="nexus-shell-resource-card">
          <div className="nexus-shell-resource-card__meta">
            <span className="nexus-shell-resource-card__chip">
              Governance plane
            </span>
            <span className="nexus-shell-resource-card__chip">
              {capabilityAudit.governance.baselinePackId}
            </span>
          </div>
          <div className="nexus-shell-resource-card__title">
            {capabilityAudit.governance.headline}
          </div>
          <p className="nexus-shell-resource-card__description">
            {capabilityAudit.governance.detail}
          </p>
          <p className="nexus-shell-resource-card__note">
            {capabilityAudit.governance.approvalRequiredCount} approval-gated ·{" "}
            {capabilityAudit.governance.operatorOnlyCount} operator-only ·{" "}
            {capabilityAudit.governance.missingPackJobs} pack repair ·{" "}
            {capabilityAudit.governance.highRiskUngatedJobs} ungated tier-2
          </p>
        </article>

        <article className="nexus-shell-resource-card">
          <div className="nexus-shell-resource-card__meta">
            <span className="nexus-shell-resource-card__chip">
              Memory lifecycle
            </span>
            <span className="nexus-shell-resource-card__chip">
              {memoryLifecycle.freshnessLabel}
            </span>
          </div>
          <div className="nexus-shell-resource-card__title">
            {memoryLifecycle.headline}
          </div>
          <p className="nexus-shell-resource-card__description">
            {memoryLifecycle.detail}
          </p>
          <p className="nexus-shell-resource-card__note">
            Promote {memoryLifecycle.promotionReadyCount} · Cite{" "}
            {memoryLifecycle.citationReadyCount} · Reopen{" "}
            {memoryLifecycle.reopenReadyCount}
          </p>
        </article>

        {showSchedulerPosture ? (
          <article className="nexus-shell-resource-card">
            <div className="nexus-shell-resource-card__meta">
              <span className="nexus-shell-resource-card__chip">
                Efficiency ops
              </span>
              <span className="nexus-shell-resource-card__chip">
                eval-first
              </span>
            </div>
            <div className="nexus-shell-resource-card__title">
              {schedulerLatest
                ? `${schedulerLatest.summary?.label ?? "Efficiency posture"} · ${schedulerLatest.summary?.score ?? 0}/100`
                : "Efficiency bench standing by"}
            </div>
            <p className="nexus-shell-resource-card__description">
              {schedulerLatest
                ? schedulerLatest.summary?.strongestTakeaway
                : "Recurring mission efficiency remains advisory until the scheduler records fresh cache and batch evidence."}
            </p>
            <p className="nexus-shell-resource-card__note">
              {schedulerLatest
                ? `${schedulerLatest.summary?.measuredRuns ?? 0} measured · cache ${schedulerLatest.summary?.cacheObservedCoverage ?? 0}% · hit ${schedulerLatest.summary?.cacheHitCoverage ?? 0}%`
                : "No cache signal yet"}
            </p>
          </article>
        ) : null}

        {showForecastPosture ? (
          <article className="nexus-shell-resource-card">
            <div className="nexus-shell-resource-card__meta">
              <span className="nexus-shell-resource-card__chip">
                Forecast lab
              </span>
              <span className="nexus-shell-resource-card__chip">
                eval-first
              </span>
            </div>
            <div className="nexus-shell-resource-card__title">
              {forecastLatest
                ? `${forecastLatest.summary?.label ?? "Baseline posture"} · ${forecastLatest.summary?.score ?? 0}/100`
                : "Forecast bench standing by"}
            </div>
            <p className="nexus-shell-resource-card__description">
              {forecastLatest
                ? `${forecastLatest.summary?.assetsCovered ?? 0}/${forecastLatest.summary?.assetsRequested ?? 0} assets covered across ${(forecastLatest.summary?.horizons ?? []).join(", ")}.`
                : "No baseline backtest is recorded yet, so the tape stays primary and the forecast bench remains advisory only."}
            </p>
            <p className="nexus-shell-resource-card__note">
              {forecastLatest
                ? `${forecastLatest.summary?.windows ?? 0} windows · ${
                    forecastLatest.ts
                      ? timeAgo(forecastLatest.ts)
                      : "freshness unknown"
                  }`
                : "Calibrating baseline"}
            </p>
          </article>
        ) : null}
      </div>

      {showNextMoves && capabilityAudit.nextMoves.length ? (
        <details className="nexus-surface-disclosure">
          <summary>Capability next moves</summary>
          <div className="nexus-surface-disclosure__body">
            <div style={{ display: "grid", gap: "10px" }}>
              {capabilityAudit.signals.map((signal) => (
                <div
                  key={signal.id}
                  className="rounded-md border border-[var(--border)] bg-[var(--surf)] px-3 py-2"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="font-mono text-[11px] text-[var(--text)]">
                      {signal.label}
                    </div>
                    <ShellBadge
                      tone={
                        signal.state === "strong"
                          ? "success"
                          : signal.state === "watch"
                            ? "muted"
                            : "accent"
                      }
                    >
                      {signal.state}
                    </ShellBadge>
                  </div>
                  <div className="mt-1 text-[10px] leading-5 text-[var(--text3)]">
                    {signal.note}
                  </div>
                </div>
              ))}
              <div className="rounded-md border border-[var(--border)] bg-[var(--surf)] px-3 py-2">
                <div className="font-mono text-[11px] text-[var(--text)]">
                  Recommended next moves
                </div>
                <div className="mt-2 grid gap-2 text-[10px] leading-5 text-[var(--text3)]">
                  {capabilityAudit.nextMoves.map((move) => (
                    <div key={move}>{move}</div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </details>
      ) : null}
    </div>
  );
}
