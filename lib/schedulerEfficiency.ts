import { analyzeScheduledJobs, type SchedulerGovernanceSnapshot } from "@/lib/schedulerGovernance";
import type {
  ScheduledJob,
  ScheduledJobEfficiencySnapshot,
  ScheduledJobRecentExecution,
} from "@/store/useStore";

export interface SchedulerEfficiencyProviderStatus {
  id: "native_scheduler";
  label: string;
  ready: boolean;
  supportsSingleRun: true;
  supportsInternalBatch: true;
  supportsProviderNativeBatch: true;
  degradedReason: string | null;
}

export interface SchedulerEfficiencySourceJob {
  id: string;
  name: string;
  enabled: boolean;
  type?: ScheduledJob["type"];
  outputTarget?: ScheduledJob["outputTarget"];
  approvalPolicy?: ScheduledJob["approvalPolicy"];
  missionAgent?: string;
  templateId?: string;
  lastRunAt?: number;
  lastStatus?: ScheduledJob["lastStatus"];
  hasPendingBatch: boolean;
  pendingBatchProvider?: ScheduledJob["pendingBatchProvider"];
  pendingBatchSubmittedAt?: number;
  pendingBatchSize?: number;
  pendingBatchPollFailures?: number;
  lastEfficiency?: ScheduledJobEfficiencySnapshot;
  lastExecutionOrigin?: ScheduledJob["lastExecutionOrigin"];
  lastExecutionAt?: number;
  recentExecutions?: ScheduledJobRecentExecution[];
}

export interface SchedulerEfficiencyLedgerEntry {
  jobId: string;
  jobName: string;
  recordedAt: number;
  status: "ok" | "error" | "queued";
  executionOrigin:
    | "single_run"
    | "internal_batch"
    | "provider_native_batch"
    | "queue_pending";
  cacheHit: boolean;
  batchMode:
    | ScheduledJobEfficiencySnapshot["batchMode"]
    | "provider_native_pending";
  wroteArtifact: boolean;
  artifactTarget?: ScheduledJob["outputTarget"];
  note: string;
}

export interface SchedulerEfficiencyRepairCandidate {
  jobId: string;
  jobName: string;
  reason: string;
}

export interface SchedulerEfficiencySourcePayload {
  snapshot: SchedulerGovernanceSnapshot;
  jobs: SchedulerEfficiencySourceJob[];
  ledger: SchedulerEfficiencyLedgerEntry[];
  repairCandidates: SchedulerEfficiencyRepairCandidate[];
  strongestRecommendation: string;
}

export interface SchedulerEfficiencySourceSnapshot
  extends SchedulerEfficiencySourcePayload {
  syncedAt: string;
}

export interface SchedulerEfficiencyLaneSummary {
  count: number;
  label: string;
}

export interface SchedulerEfficiencyQueueSummary {
  pendingNativeBatchCount: number;
  pendingNativeBatchFailures: number;
  boundedRetryHealthy: boolean;
  label: string;
}

export interface SchedulerEfficiencyRunSummary {
  score: number;
  quality: "ready" | "guarded" | "degraded";
  label: string;
  activeJobs: number;
  measuredRuns: number;
  cacheObservableRuns: number;
  observedCacheRuns: number;
  cacheHitRuns: number;
  cacheObservedCoverage: number;
  cacheHitCoverage: number;
  batchedRuns: number;
  internalBatchRuns: number;
  providerNativeBatchRuns: number;
  queuedJobs: number;
  queuedFailureJobs: number;
  lowCacheabilityRuns: number;
  templateGapJobs: number;
  reasons: string[];
  strongestTakeaway: string;
  strongestOptimization: string;
}

export interface SchedulerEfficiencyRun {
  ts: string;
  sourceSyncedAt: string | null;
  provider: SchedulerEfficiencyProviderStatus;
  summary: SchedulerEfficiencyRunSummary;
  lanes: {
    single: SchedulerEfficiencyLaneSummary;
    internalBatch: SchedulerEfficiencyLaneSummary;
    providerNativeBatch: SchedulerEfficiencyLaneSummary;
  };
  queue: SchedulerEfficiencyQueueSummary;
  ledger: SchedulerEfficiencyLedgerEntry[];
  repairCandidates: SchedulerEfficiencyRepairCandidate[];
}

export interface SchedulerEfficiencyEvalRunnerState {
  lastRunAt?: string;
  lastOk?: boolean;
  lastSummary?: string;
  cooldownMin?: number;
  effectiveCooldownMin?: number;
  nextEligibleAt?: string;
  failureStreak?: number;
}

export interface SchedulerEfficiencyEvalPayload {
  status: string;
  provider: SchedulerEfficiencyProviderStatus;
  latest: SchedulerEfficiencyRun | null;
  history: SchedulerEfficiencyRun[];
  points: number;
  freshness: {
    freshnessWindowMin: number;
    ageMinutes: number | null;
    stale: boolean;
  };
  source: {
    syncedAt: string | null;
    activeJobs: number;
    totalJobs: number;
    ageMinutes: number | null;
    stale: boolean;
  };
  runner: SchedulerEfficiencyEvalRunnerState;
}

const DEFAULT_SCHEDULER_REASON =
  "Efficiency bench standing by until governed recurring missions record cache and batch evidence.";

function buildLedgerNote(job: ScheduledJob) {
  if (job.lastStatus === "queued" && job.pendingBatchId) {
    return `Queued native batch x${job.pendingBatchSize ?? 1}${
      (job.pendingBatchPollFailures ?? 0) > 0
        ? ` · poll retries ${job.pendingBatchPollFailures}`
        : ""
    }`;
  }
  const efficiency = job.lastEfficiency;
  if (!efficiency) {
    return "No efficiency snapshot recorded yet.";
  }

  const parts = [
    efficiency.batchMode === "provider_native"
      ? `provider-native batch x${efficiency.batchSize}`
      : efficiency.batchMode === "internal"
        ? `internal batch x${efficiency.batchSize}`
        : "single run",
    efficiency.cacheObserved
      ? efficiency.cacheHit
        ? "cache hit observed"
        : "cache warm observed"
      : "cache signal pending",
    `${efficiency.cacheability} cacheability`,
  ];

  return parts.join(" · ");
}

function buildRepairCandidates(jobs: ScheduledJob[]) {
  return jobs
    .filter((job) => job.enabled)
    .map((job): SchedulerEfficiencyRepairCandidate | null => {
      if (!job.templateId?.trim() && (job.approvalPolicy ?? "human_gate") !== "approve_on_write") {
        return {
          jobId: job.id,
          jobName: job.name,
          reason: "Missing mission-template linkage for a scheduler-friendly lane.",
        };
      }
      if (job.lastEfficiency?.cacheability === "low") {
        return {
          jobId: job.id,
          jobName: job.name,
          reason: "Low cacheability suggests the prompt shape still needs stable-prefix repair.",
        };
      }
      if (
        job.lastStatus === "queued" &&
        (job.pendingBatchPollFailures ?? 0) > 0
      ) {
        return {
          jobId: job.id,
          jobName: job.name,
          reason: "Queued native batch has already hit poll retries and should be watched closely.",
        };
      }
      if (!job.lastEfficiency) {
        return {
          jobId: job.id,
          jobName: job.name,
          reason: "No efficiency snapshot recorded yet, so cache and batch posture are still unproven.",
        };
      }
      return null;
    })
    .filter((value): value is SchedulerEfficiencyRepairCandidate => Boolean(value))
    .slice(0, 6);
}

export function buildDefaultSchedulerEfficiencyProviderStatus(
  degradedReason = DEFAULT_SCHEDULER_REASON,
): SchedulerEfficiencyProviderStatus {
  return {
    id: "native_scheduler",
    label: "Native scheduler spine",
    ready: true,
    supportsSingleRun: true,
    supportsInternalBatch: true,
    supportsProviderNativeBatch: true,
    degradedReason,
  };
}

export function buildSchedulerEfficiencySourcePayload(
  jobs: ScheduledJob[],
): SchedulerEfficiencySourcePayload {
  const snapshot = analyzeScheduledJobs(jobs);
  const ledger = jobs
    .filter(
      (job) =>
        (job.lastExecutionAt && job.lastExecutionOrigin) ||
        (job.lastStatus === "queued" && job.pendingBatchId),
    )
    .map((job): SchedulerEfficiencyLedgerEntry => ({
      jobId: job.id,
      jobName: job.name,
      recordedAt:
        job.lastStatus === "queued" && job.pendingBatchSubmittedAt
          ? job.pendingBatchSubmittedAt
          : job.lastExecutionAt ?? job.lastRunAt ?? Date.now(),
      status: job.lastStatus ?? "queued",
      executionOrigin:
        job.lastStatus === "queued" && job.pendingBatchId
          ? "queue_pending"
          : job.lastExecutionOrigin ?? "single_run",
      cacheHit: job.lastEfficiency?.cacheHit ?? false,
      batchMode:
        job.lastStatus === "queued" && job.pendingBatchId
          ? "provider_native_pending"
          : job.lastEfficiency?.batchMode ?? "single",
      wroteArtifact:
        Boolean(job.lastArtifactAt) &&
        Boolean(job.outputTarget) &&
        job.outputTarget !== "none",
      artifactTarget:
        job.outputTarget && job.outputTarget !== "none" ? job.outputTarget : undefined,
      note: buildLedgerNote(job),
    }))
    .sort((a, b) => b.recordedAt - a.recordedAt)
    .slice(0, 12);

  return {
    snapshot,
    jobs: jobs.map((job) => ({
      id: job.id,
      name: job.name,
      enabled: job.enabled,
      type: job.type,
      outputTarget: job.outputTarget,
      approvalPolicy: job.approvalPolicy,
      missionAgent: job.missionAgent,
      templateId: job.templateId,
      lastRunAt: job.lastRunAt,
      lastStatus: job.lastStatus,
      hasPendingBatch: Boolean(job.pendingBatchId),
      pendingBatchProvider: job.pendingBatchProvider,
      pendingBatchSubmittedAt: job.pendingBatchSubmittedAt,
      pendingBatchSize: job.pendingBatchSize,
      pendingBatchPollFailures: job.pendingBatchPollFailures,
      lastEfficiency: job.lastEfficiency,
      lastExecutionOrigin: job.lastExecutionOrigin,
      lastExecutionAt: job.lastExecutionAt,
      recentExecutions: job.recentExecutions,
    })),
    ledger,
    repairCandidates: buildRepairCandidates(jobs),
    strongestRecommendation:
      snapshot.recommendations[0]?.detail ?? DEFAULT_SCHEDULER_REASON,
  };
}
