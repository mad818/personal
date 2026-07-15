import { getSessionTargetLabel } from "@/lib/exactSessionLinks";
import type { UnfinishedSessionMemory } from "@/lib/assistantSessionMemory";
import { ASSISTANT_CAPABILITIES } from "@/lib/assistantCapabilityRegistry";
import type { ContextLoadReport } from "@/lib/contextPolicy";
import {
  type GovernanceRiskTier,
  summarizeGovernanceInventory,
} from "@/lib/governanceCatalog";
import type { MemorySpineItem, MemorySpineSnapshot } from "@/lib/memorySpine";
import type { SurfaceCapabilityId } from "@/lib/resourceSessionRegistry";
import {
  analyzeScheduledJobs,
  getScheduledMissionReviewSummary,
} from "@/lib/schedulerGovernance";
import type { NetworkMode } from "@/lib/security/routePolicy";
import type { Skill } from "@/lib/skillEngine";
import {
  inferWorkflowPackIdFromText,
  getWorkflowPack,
} from "@/lib/workflowPacks";
import type { ScheduledJob, AgentRuntime } from "@/store/useStore";
import type { HQWorkflowCatalogItem } from "@/components/home/office/workflowCommands";

export type WorkflowOpsQueueStatus =
  | "active"
  | "queued"
  | "blocked"
  | "handoff"
  | "ready"
  | "standby";

export interface WorkflowOpsQueueItem {
  id: string;
  label: string;
  owner: string;
  status: WorkflowOpsQueueStatus;
  source: "runtime" | "scheduler" | "continuity";
  note: string;
}

export interface WorkflowOpsSnapshot {
  headline: string;
  detail: string;
  queuedCount: number;
  blockedCount: number;
  handoffCount: number;
  activeCount: number;
  readyCount: number;
  ownerCount: number;
  reviewGatedJobs: number;
  measuredRuns: number;
  governance: WorkflowOpsGovernancePosture;
  items: WorkflowOpsQueueItem[];
}

export interface WorkflowOpsGovernancePosture {
  headline: string;
  detail: string;
  missingPackJobs: number;
  missingApprovalJobs: number;
  highRiskUngatedJobs: number;
  schedulerAutomationGapJobs: number;
  cyberBaselineRepairJobs: number;
}

export interface MemoryLifecycleSummary {
  tone: "success" | "info" | "warning";
  headline: string;
  detail: string;
  promotedCount: number;
  promotionReadyCount: number;
  compactionBacklog: number;
  visibleCount: number;
  restrictedCount: number;
  citationReadyCount: number;
  reopenReadyCount: number;
  sensitiveHoldCount: number;
  freshnessLabel: string;
  nextMove: string;
}

export type BrowserOpsReadinessState =
  | "standby"
  | "companion_ready"
  | "not_configured";

export interface BrowserOpsReadinessSnapshot {
  state: BrowserOpsReadinessState;
  mode: "native_guarded" | "lightpanda_companion";
  source: "guarded_routes" | "lightpanda_companion";
  networkMode: NetworkMode;
  guardedRouteCount: number;
  guardedRoutes: {
    lookup: boolean;
    passiveDns: boolean;
    torCheck: boolean;
    sweeps: boolean;
  };
  requiresApproval: true;
  endpointLabel: string | null;
  reason: string;
  windowsNote: string;
}

export type CapabilityAuditSignalState = "strong" | "watch" | "gap";

export interface CapabilityAuditSignal {
  id: string;
  label: string;
  state: CapabilityAuditSignalState;
  note: string;
}

export interface CapabilityAuditSummary {
  score: number;
  headline: string;
  detail: string;
  governance: GovernanceAuditSummary;
  signals: CapabilityAuditSignal[];
  nextMoves: string[];
}

export interface GovernanceAuditSummary {
  headline: string;
  detail: string;
  totalProfiles: number;
  approvalRequiredCount: number;
  operatorOnlyCount: number;
  missingMetadataGaps: number;
  byRisk: Record<GovernanceRiskTier, number>;
  domainTagCount: number;
  highRiskCapabilityCount: number;
  missingPackJobs: number;
  missingApprovalJobs: number;
  highRiskUngatedJobs: number;
  schedulerAutomationGapJobs: number;
  cyberBaselineRepairJobs: number;
  baselinePackId: string;
}

function formatExecutionOrigin(job: ScheduledJob) {
  if (!job.lastExecutionOrigin) return null;
  return job.lastExecutionOrigin.replace(/_/g, " ");
}

function resolveWorkflowOwner(
  job: ScheduledJob,
  workflow?: HQWorkflowCatalogItem,
) {
  const owner = job.missionAgent ?? workflow?.agent ?? "ops";
  return owner.toUpperCase();
}

function deriveWorkflowStatus(job: ScheduledJob): WorkflowOpsQueueStatus {
  if (!job.enabled) return "standby";
  const missionReview = getScheduledMissionReviewSummary(job);
  if (missionReview.status === "expired") return "blocked";
  if (missionReview.status === "pending_review") return "queued";
  if (job.lastStatus === "error") return "blocked";
  if (job.lastStatus === "queued" || job.pendingBatchId) return "queued";
  if (job.lastStatus === "ok") return "ready";
  return "ready";
}

function statusPriority(status: WorkflowOpsQueueStatus) {
  switch (status) {
    case "active":
      return 0;
    case "queued":
      return 1;
    case "blocked":
      return 2;
    case "handoff":
      return 3;
    case "ready":
      return 4;
    case "standby":
      return 5;
    default:
      return 6;
  }
}

function buildWorkflowJobNote(
  job: ScheduledJob,
  workflow?: HQWorkflowCatalogItem,
) {
  const missionReview = getScheduledMissionReviewSummary(job);
  const summary = job.lastSummary?.trim();
  if (
    summary &&
    missionReview.status !== "pending_review" &&
    missionReview.status !== "expired"
  ) {
    return summary;
  }

  if (missionReview.status === "expired") {
    return `${summary ? `${summary} · ` : ""}review expired${missionReview.scope ? ` · ${missionReview.scope}` : ""}`;
  }

  if (missionReview.status === "pending_review") {
    return `${summary ? `${summary} · ` : ""}awaiting operator review${missionReview.expiresAt ? ` · due in ${Math.max(1, Math.ceil((missionReview.expiresAt - Date.now()) / (60 * 60 * 1000)))}h` : ""}`;
  }

  const pieces = [
    workflow?.label ??
      (job.type === "mission" ? "mission lane" : "prompt lane"),
    formatExecutionOrigin(job),
    job.outputTarget ? `${job.outputTarget} output` : null,
    job.approvalPolicy ? job.approvalPolicy.replace(/_/g, " ") : null,
  ].filter(Boolean);

  return pieces.join(" · ");
}

function sanitizeEndpointLabel(value: string | null | undefined) {
  if (!value) return null;
  try {
    const parsed = new URL(value);
    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return value;
  }
}

const CYBER_JOB_RE =
  /\b(?:cve|cves|kev|otx|vulnerability|vulnerabilities|threat|threats|cyber|exploit|malware)\b/i;

function buildWorkflowGovernancePosture(jobs: ScheduledJob[]) {
  const activeJobs = jobs.filter((job) => job.enabled);
  const jobProfiles = activeJobs.map((job) => {
    const signature = [job.name, job.prompt, job.templateId ?? ""].join(" ");
    const packId = inferWorkflowPackIdFromText(signature);
    const pack = packId ? getWorkflowPack(packId) : null;
    const isCyberJob = CYBER_JOB_RE.test(signature);
    return {
      job,
      packId,
      pack,
      isCyberJob,
    };
  });

  const missingPackJobs = jobProfiles.filter((entry) => !entry.pack).length;
  const missingApprovalJobs = jobProfiles.filter(
    (entry) => !entry.job.approvalPolicy,
  ).length;
  const highRiskUngatedJobs = jobProfiles.filter(
    (entry) =>
      entry.pack?.riskTier === "tier2" &&
      (entry.job.approvalPolicy ?? "human_gate") === "approve_on_write",
  ).length;
  const schedulerAutomationGapJobs = jobProfiles.filter(
    (entry) => entry.pack && !entry.pack.automationEligible,
  ).length;
  const cyberBaselineRepairJobs = jobProfiles.filter(
    (entry) => entry.isCyberJob && !entry.job.templateId?.trim(),
  ).length;

  const headline =
    highRiskUngatedJobs > 0
      ? `${highRiskUngatedJobs} high-risk job${highRiskUngatedJobs === 1 ? "" : "s"} need gating`
      : missingPackJobs > 0
        ? `${missingPackJobs} recurring mission${missingPackJobs === 1 ? "" : "s"} lack pack metadata`
        : cyberBaselineRepairJobs > 0
          ? `${cyberBaselineRepairJobs} cyber mission${cyberBaselineRepairJobs === 1 ? "" : "s"} need baseline association`
          : "Governed recurring-work posture is aligned";

  const detail =
    highRiskUngatedJobs > 0
      ? "At least one tier-2 recurring mission can still auto-write. Keep cyber, reverse-engineering, and similarly risky automation behind explicit operator gates."
      : missingPackJobs > 0
        ? "Some scheduled jobs still have no native workflow-pack association, so governance and repair guidance stay weaker than they should be."
        : cyberBaselineRepairJobs > 0
          ? "Cyber-flavored recurring work exists without a strong template anchor. Associate it with the cyber-triage baseline before widening follow-through."
          : "Workflow packs, approval posture, and scheduler intent are aligned well enough to keep automation legible without a second governance dashboard.";

  return {
    headline,
    detail,
    missingPackJobs,
    missingApprovalJobs,
    highRiskUngatedJobs,
    schedulerAutomationGapJobs,
    cyberBaselineRepairJobs,
  } satisfies WorkflowOpsGovernancePosture;
}

function buildGovernanceAuditSummary(args: {
  scheduledJobs: ScheduledJob[];
}): GovernanceAuditSummary {
  const inventory = summarizeGovernanceInventory();
  const workflowGovernance = buildWorkflowGovernancePosture(args.scheduledJobs);
  const highRiskCapabilityCount = ASSISTANT_CAPABILITIES.filter(
    (capability) => capability.governance.riskTier === "tier2",
  ).length;

  const headline =
    workflowGovernance.highRiskUngatedJobs > 0 ||
    workflowGovernance.missingPackJobs > 0 ||
    workflowGovernance.missingApprovalJobs > 0
      ? "Governance control plane needs repair"
      : "Governance control plane is aligned";

  const detail =
    workflowGovernance.highRiskUngatedJobs > 0
      ? "High-risk recurring work still needs stronger operator gating before the control plane can be considered fully safe."
      : workflowGovernance.missingPackJobs > 0 ||
          workflowGovernance.missingApprovalJobs > 0
        ? "Shared governance metadata is present, but some recurring jobs still lack explicit pack or approval posture."
        : `Shared governance metadata now covers skills, workflow packs, assistant capabilities, and exact-session continuations with ${inventory.domainTags.length} dominant domain tags visible.`;

  return {
    headline,
    detail,
    totalProfiles: inventory.totalProfiles,
    approvalRequiredCount: inventory.approvalRequiredCount,
    operatorOnlyCount: inventory.operatorOnlyCount,
    missingMetadataGaps: inventory.missingMetadataGaps,
    byRisk: inventory.byRisk,
    domainTagCount: inventory.domainTags.length,
    highRiskCapabilityCount,
    missingPackJobs: workflowGovernance.missingPackJobs,
    missingApprovalJobs: workflowGovernance.missingApprovalJobs,
    highRiskUngatedJobs: workflowGovernance.highRiskUngatedJobs,
    schedulerAutomationGapJobs: workflowGovernance.schedulerAutomationGapJobs,
    cyberBaselineRepairJobs: workflowGovernance.cyberBaselineRepairJobs,
    baselinePackId: inventory.baselinePackId,
  };
}

export function buildWorkflowOpsSnapshot(args: {
  jobs: ScheduledJob[];
  runtime: AgentRuntime;
  unfinishedSessions: UnfinishedSessionMemory[];
  workflowCatalog: HQWorkflowCatalogItem[];
}): WorkflowOpsSnapshot {
  const governance = analyzeScheduledJobs(args.jobs);
  const workflowGovernance = buildWorkflowGovernancePosture(args.jobs);
  const workflowMap = new Map<string, HQWorkflowCatalogItem>(
    args.workflowCatalog.map((item) => [item.id, item]),
  );

  const items: WorkflowOpsQueueItem[] = [];

  if (args.runtime.status !== "idle") {
    items.push({
      id: args.runtime.runId || "runtime:live",
      label: "Live command loop",
      owner: "HQ",
      status:
        args.runtime.status === "failed" || args.runtime.status === "degraded"
          ? "blocked"
          : "active",
      source: "runtime",
      note: `${args.runtime.currentPhase} · ${args.runtime.contextChars.toLocaleString()} context chars${
        args.runtime.contextCompacted ? " · compacted" : ""
      }`,
    });
  }

  for (const job of args.jobs.filter((job) => job.enabled)) {
    const workflow =
      job.templateId && workflowMap.has(job.templateId)
        ? workflowMap.get(job.templateId)
        : undefined;
    items.push({
      id: `job:${job.id}`,
      label: job.name,
      owner: resolveWorkflowOwner(job, workflow),
      status: deriveWorkflowStatus(job),
      source: "scheduler",
      note: buildWorkflowJobNote(job, workflow),
    });
  }

  for (const session of args.unfinishedSessions.slice(0, 4)) {
    items.push({
      id: `handoff:${session.href}`,
      label: session.label || getSessionTargetLabel(session.href),
      owner: "HANDOFF",
      status: "handoff",
      source: "continuity",
      note: session.sourceQuery || session.detail,
    });
  }

  const sortedItems = items
    .sort((a, b) => statusPriority(a.status) - statusPriority(b.status))
    .slice(0, 6);

  const ownerCount = new Set(
    sortedItems
      .filter((item) => item.owner !== "HANDOFF")
      .map((item) => item.owner),
  ).size;
  const queuedCount = sortedItems.filter(
    (item) => item.status === "queued",
  ).length;
  const blockedCount = sortedItems.filter(
    (item) => item.status === "blocked",
  ).length;
  const handoffCount = sortedItems.filter(
    (item) => item.status === "handoff",
  ).length;
  const activeCount = sortedItems.filter(
    (item) => item.status === "active",
  ).length;
  const readyCount = sortedItems.filter(
    (item) => item.status === "ready",
  ).length;

  const headline =
    activeCount > 0
      ? `${activeCount} live command lane${activeCount === 1 ? "" : "s"}`
      : queuedCount > 0
        ? `${queuedCount} queued mission${queuedCount === 1 ? "" : "s"}`
        : handoffCount > 0
          ? `${handoffCount} continuation handoff${handoffCount === 1 ? "" : "s"}`
          : "Ops spine standing by";

  const detail =
    workflowGovernance.highRiskUngatedJobs > 0 ||
    workflowGovernance.missingPackJobs > 0 ||
    workflowGovernance.cyberBaselineRepairJobs > 0
      ? workflowGovernance.detail
      : (governance.recommendations[0]?.detail ??
        "Mission queue, scheduler posture, and continuity handoffs all stay inside the native dispatch spine.");

  return {
    headline,
    detail,
    queuedCount,
    blockedCount,
    handoffCount,
    activeCount,
    readyCount,
    ownerCount,
    reviewGatedJobs: governance.reviewGatedJobs,
    measuredRuns: governance.completedEfficiencySnapshots,
    governance: workflowGovernance,
    items: sortedItems,
  };
}

export function buildMemoryLifecycleSummary(args: {
  total: number;
  latestUpdatedAt: number | null;
  countsByLayer: MemorySpineSnapshot["countsByLayer"];
  countsByVisibility: MemorySpineSnapshot["countsByVisibility"];
  items?: MemorySpineItem[];
}): MemoryLifecycleSummary {
  const promotedCount =
    args.countsByLayer.knowledge + args.countsByLayer.output;
  const compactionBacklog = Math.max(
    0,
    args.countsByLayer.raw - args.countsByLayer.knowledge,
  );
  const promotionReadyCount = args.items
    ? args.items.filter((item) => item.nextAction === "promote").length
    : args.countsByLayer.raw;
  const visibleCount = Math.max(
    0,
    args.total - args.countsByVisibility.restricted,
  );
  const citationReadyCount = args.items
    ? args.items.filter(
        (item) =>
          item.visibility !== "restricted" &&
          Boolean(item.citationId) &&
          item.sourceLabel.trim().length > 0,
      ).length
    : visibleCount;
  const recentWindowStart =
    (args.latestUpdatedAt ?? Date.now()) - 1000 * 60 * 60 * 24 * 7;
  const reopenReadyCount = args.items
    ? args.items.filter(
        (item) =>
          item.nextAction === "reopen" && item.timestamp >= recentWindowStart,
      ).length
    : Math.min(args.countsByLayer.output, 4);
  const sensitiveHoldCount = args.items
    ? args.items.filter((item) => item.lifecycle === "sensitive_hold").length
    : args.countsByVisibility.restricted;
  const freshnessLabel =
    args.latestUpdatedAt === null
      ? "No archive pulse yet"
      : Date.now() - args.latestUpdatedAt < 1000 * 60 * 60
        ? "Fresh"
        : Date.now() - args.latestUpdatedAt < 1000 * 60 * 60 * 24
          ? "Recent"
          : Date.now() - args.latestUpdatedAt < 1000 * 60 * 60 * 24 * 7
            ? "Aging"
            : "Dormant";

  const tone: MemoryLifecycleSummary["tone"] =
    args.total === 0
      ? "info"
      : compactionBacklog > promotedCount || sensitiveHoldCount > 0
        ? "warning"
        : promotedCount > 0
          ? "success"
          : "info";

  const headline =
    args.total === 0
      ? "Memory lane standing by"
      : promotedCount > 0
        ? `${promotedCount} promoted artifacts ready for recall`
        : "Raw capture is ahead of durable promotion";

  const detail =
    compactionBacklog > 0
      ? `${compactionBacklog} raw artifacts are still waiting for compaction or promotion into durable knowledge.`
      : sensitiveHoldCount > 0
        ? `${sensitiveHoldCount} artifacts are on sensitive hold, so their details stay withheld while lifecycle posture remains visible.`
        : `Compaction backlog is controlled and the visible memory lane is ready for reuse. Freshness is ${freshnessLabel.toLowerCase()}.`;

  const nextMove =
    args.total === 0
      ? "Save one clip, briefing, or compiled page to seed the archive."
      : promotionReadyCount > 0
        ? "Promote one raw artifact into a compiled page or knowledge note."
        : compactionBacklog > 0
          ? "Compact one stale raw artifact before widening the archive further."
          : sensitiveHoldCount > 0
            ? "Review the sensitive-hold queue before sharing or reusing archive material."
            : "Reopen the latest durable output before creating a duplicate memory trail.";

  return {
    tone,
    headline,
    detail,
    promotedCount,
    promotionReadyCount,
    compactionBacklog,
    visibleCount,
    restrictedCount: args.countsByVisibility.restricted,
    citationReadyCount,
    reopenReadyCount,
    sensitiveHoldCount,
    freshnessLabel,
    nextMove,
  };
}

export function buildBrowserOpsReadinessSnapshot(args: {
  networkMode: NetworkMode;
  lightpandaEndpoint?: string | null;
  guardedRoutes?: Partial<BrowserOpsReadinessSnapshot["guardedRoutes"]>;
}): BrowserOpsReadinessSnapshot {
  const guardedRoutes = {
    lookup: true,
    passiveDns: true,
    torCheck: true,
    sweeps: true,
    ...(args.guardedRoutes ?? {}),
  };
  const endpointLabel = sanitizeEndpointLabel(args.lightpandaEndpoint);
  const guardedRouteCount = Object.values(guardedRoutes).filter(Boolean).length;

  if (endpointLabel) {
    return {
      state: "companion_ready",
      mode: "lightpanda_companion",
      source: "lightpanda_companion",
      networkMode: args.networkMode,
      guardedRouteCount,
      guardedRoutes,
      requiresApproval: true,
      endpointLabel,
      reason:
        "Protected recon routes remain primary while the Lightpanda companion is staged for explicit, approval-gated browser execution.",
      windowsNote:
        "On Windows, keep the companion optional and prefer WSL2/Docker-backed staging if the upstream browser stack is not running locally.",
    };
  }

  return {
    state: "standby",
    mode: "native_guarded",
    source: "guarded_routes",
    networkMode: args.networkMode,
    guardedRouteCount,
    guardedRoutes,
    requiresApproval: true,
    endpointLabel: null,
    reason:
      "Guarded lookup, passive DNS, OPSEC, and sweep routes are live. The external browser companion is optional and not configured yet.",
    windowsNote:
      "Keep browser ops behind protected local routes unless a loopback Lightpanda companion is deliberately staged.",
  };
}

export function buildCapabilityAuditSummary(args: {
  surfaceId?: SurfaceCapabilityId | "global";
  skills: Array<Pick<Skill, "level" | "successRate">>;
  scheduledJobs: ScheduledJob[];
  memoryTotal: number;
  workflowCatalogCount: number;
  contextLoadReport?: ContextLoadReport | null;
  browserOps?: BrowserOpsReadinessSnapshot | null;
}): CapabilityAuditSummary {
  const scheduler = analyzeScheduledJobs(args.scheduledJobs);
  const governanceSummary = buildGovernanceAuditSummary({
    scheduledJobs: args.scheduledJobs,
  });
  const avgSuccess =
    args.skills.length > 0
      ? args.skills.reduce((sum, skill) => sum + skill.successRate, 0) /
        args.skills.length
      : 0;
  const hasGovernedQueue =
    scheduler.activeJobs > 0 &&
    (scheduler.reviewGatedJobs > 0 || scheduler.approveOnWriteJobs > 0);

  const signals: CapabilityAuditSignal[] = [
    {
      id: "governance",
      label: "Governance plane",
      state:
        governanceSummary.missingMetadataGaps === 0 &&
        governanceSummary.highRiskUngatedJobs === 0 &&
        governanceSummary.missingPackJobs === 0
          ? "strong"
          : governanceSummary.highRiskUngatedJobs === 0 &&
              governanceSummary.missingApprovalJobs === 0
            ? "watch"
            : "gap",
      note:
        governanceSummary.highRiskUngatedJobs > 0
          ? `${governanceSummary.highRiskUngatedJobs} high-risk recurring job${governanceSummary.highRiskUngatedJobs === 1 ? "" : "s"} still need explicit operator gating before automation widens.`
          : governanceSummary.missingPackJobs > 0
            ? `${governanceSummary.missingPackJobs} recurring mission${governanceSummary.missingPackJobs === 1 ? "" : "s"} still lack workflow-pack metadata, so governance and next-move posture remain thinner than intended.`
            : `Governance metadata now covers ${governanceSummary.totalProfiles} native profiles with ${governanceSummary.approvalRequiredCount} approval-gated lanes and ${governanceSummary.domainTagCount} dominant domain tags.`,
    },
    {
      id: "workflow",
      label: "Workflow ops",
      state:
        args.workflowCatalogCount === 0
          ? "gap"
          : hasGovernedQueue
            ? "strong"
            : scheduler.activeJobs > 0
              ? "watch"
              : "gap",
      note: hasGovernedQueue
        ? `${scheduler.activeJobs} governed jobs are active, ${scheduler.completedEfficiencySnapshots} measured run${scheduler.completedEfficiencySnapshots === 1 ? "" : "s"} are already recorded, and ${governanceSummary.missingPackJobs} active job${governanceSummary.missingPackJobs === 1 ? "" : "s"} still need pack repair.`
        : scheduler.activeJobs > 0
          ? "Mission automation exists, but the governed queue is still light or unevenly measured."
          : "No governed mission queue is active yet, so dispatch posture depends on manual continuity.",
    },
    {
      id: "memory",
      label: "Memory lifecycle",
      state:
        args.memoryTotal >= 8
          ? "strong"
          : args.memoryTotal > 0
            ? "watch"
            : "gap",
      note:
        args.memoryTotal >= 8
          ? `${args.memoryTotal} durable artifacts already support compaction, recall, and reopen flows.`
          : args.memoryTotal > 0
            ? `${args.memoryTotal} durable artifacts exist, but the archive is still thin for reuse-heavy work.`
            : "Durable archive continuity is not seeded yet.",
    },
    {
      id: "context",
      label: "Context policy",
      state:
        args.contextLoadReport &&
        args.contextLoadReport.selectedAssets.length > 0
          ? "strong"
          : args.surfaceId === "hq" || args.surfaceId === "skills"
            ? "watch"
            : "strong",
      note:
        args.contextLoadReport &&
        args.contextLoadReport.selectedAssets.length > 0
          ? `${args.contextLoadReport.selectedAssets.length} bounded assets were loaded through the active lane policy.`
          : "No recent bounded context manifest is recorded on this surface yet.",
    },
    {
      id: "skills",
      label: "Skill coverage",
      state:
        avgSuccess >= 0.8 ? "strong" : avgSuccess >= 0.68 ? "watch" : "gap",
      note:
        avgSuccess >= 0.8
          ? `Average skill success is ${Math.round(avgSuccess * 100)}%, which is healthy enough for guided capability discovery.`
          : `Average skill success is ${Math.round(avgSuccess * 100)}%, so the improvement queue still matters.`,
    },
  ];

  if (
    args.surfaceId === "recon" ||
    args.surfaceId === "command" ||
    args.surfaceId === "resources" ||
    args.surfaceId === "global"
  ) {
    signals.splice(2, 0, {
      id: "browser",
      label: "Browser ops",
      state:
        args.browserOps?.state === "companion_ready"
          ? "strong"
          : args.browserOps
            ? "watch"
            : "gap",
      note:
        args.browserOps?.state === "companion_ready"
          ? "Guarded browser execution is staged behind protected routes with the companion browser ready."
          : args.browserOps
            ? "Protected routes are live, but the optional Lightpanda companion is not staged yet."
            : "Browser-ops readiness has not been confirmed yet.",
    });
  }

  const score = Math.round(
    (signals.reduce((sum, signal) => {
      if (signal.state === "strong") return sum + 2;
      if (signal.state === "watch") return sum + 1;
      return sum;
    }, 0) /
      Math.max(1, signals.length * 2)) *
      100,
  );

  const nextMoves = new Set<string>();
  if (
    signals.find((signal) => signal.id === "governance")?.state !== "strong"
  ) {
    nextMoves.add(
      governanceSummary.highRiskUngatedJobs > 0
        ? "Restore explicit human gating on tier-2 recurring work before widening automation or write follow-through."
        : governanceSummary.missingPackJobs > 0
          ? "Attach missing workflow-pack governance so recurring jobs stop drifting outside the native control plane."
          : `Use ${governanceSummary.baselinePackId} as the CYBER baseline and keep approval posture explicit in exact-session continuations.`,
    );
  }
  if (signals.find((signal) => signal.id === "workflow")?.state !== "strong") {
    nextMoves.add(
      "Stage or tighten one governed mission queue before widening automation.",
    );
  }
  if (signals.find((signal) => signal.id === "memory")?.state !== "strong") {
    nextMoves.add(
      "Promote one raw artifact into durable memory instead of starting a parallel archive trail.",
    );
  }
  if (signals.find((signal) => signal.id === "browser")?.state === "watch") {
    nextMoves.add(
      "Keep protected recon routes primary and stage the Lightpanda companion only behind explicit approval gates.",
    );
  }
  if (signals.find((signal) => signal.id === "skills")?.state !== "strong") {
    nextMoves.add(
      "Use the improvement queue to close the weakest capability before adding more surface complexity.",
    );
  }
  if (
    (args.surfaceId === "hq" || args.surfaceId === "command") &&
    signals.find((signal) => signal.id === "context")?.state !== "strong"
  ) {
    nextMoves.add(
      "Exercise the bounded context lane on the live shell so routing and support rails stay deterministic.",
    );
  }
  if (args.surfaceId === "vault") {
    nextMoves.add(
      "Keep Archive, Relations, and Publish distinct while stewardship stays in the quieter rail.",
    );
  }
  if (args.surfaceId === "resources" || args.surfaceId === "skills") {
    nextMoves.add(
      "Recommend capability packs and governance tags natively instead of reviving ambient context loading.",
    );
  }
  if (args.surfaceId === "cyber") {
    nextMoves.add(
      "Keep cyber-triage as the governed baseline, then stage RECON OPSEC or VAULT evidence follow-through explicitly.",
    );
  }

  return {
    score,
    headline:
      score >= 75
        ? "Native capability posture is cohesive"
        : score >= 50
          ? "Native capability posture is usable but still thin"
          : "Native capability posture needs reinforcement",
    detail:
      score >= 75
        ? "Workflow ops, memory, and route posture are coordinated well enough to absorb upstream ideas without turning the shell into a companion dashboard."
        : "The shell can absorb the next upstream ideas safely, but a few core lanes still need stronger queue, memory, or browser posture before they feel fully native.",
    governance: governanceSummary,
    signals,
    nextMoves: Array.from(nextMoves).slice(0, 4),
  };
}
