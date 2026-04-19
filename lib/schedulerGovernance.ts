import type {
  ScheduledJob,
  ScheduledJobEfficiencySnapshot,
} from "@/store/useStore";

export interface SchedulerAuditExport {
  exportedAt: string;
  scope: {
    kind: "all" | "job";
    label: string;
    jobIds: string[];
  };
  filters: SchedulerAuditFilters;
  snapshot: SchedulerGovernanceSnapshot;
  nativeBatchPosture?: {
    nativeReady: boolean;
    mode: "provider_native" | "internal_fallback";
    featureEnabled: boolean;
    paidApisAllowed: boolean;
    apiKeyConfigured: boolean;
    reason: string;
  };
  jobs: Array<{
    id: string;
    name: string;
    enabled: boolean;
    cron: string;
    type?: ScheduledJob["type"];
    outputTarget?: ScheduledJob["outputTarget"];
    approvalPolicy?: ScheduledJob["approvalPolicy"];
    missionAgent?: string;
    templateId?: string;
    lastRunAt?: number;
    lastStatus?: ScheduledJob["lastStatus"];
    lastSummary?: string;
    lastExecutionOrigin?: ScheduledJob["lastExecutionOrigin"];
    lastExecutionAt?: number;
    lastArtifactOrigin?: ScheduledJob["lastArtifactOrigin"];
    lastArtifactTarget?: ScheduledJob["lastArtifactTarget"];
    lastArtifactAt?: number;
    lastEfficiency?: ScheduledJob["lastEfficiency"];
    recentExecutions?: ScheduledJob["recentExecutions"];
  }>;
}

export interface SchedulerAuditFilters {
  lane: "all" | "single_run" | "internal_batch" | "provider_native_batch";
  status: "all" | "ok" | "error";
  window: "all" | "24h" | "7d";
}

export interface SchedulerAuditFilterPreset {
  id: string;
  label: string;
  filters: SchedulerAuditFilters;
}

export interface SavedSchedulerAuditView {
  id: string;
  name: string;
  filters: SchedulerAuditFilters;
}

export interface SavedSchedulerAuditViewsExport {
  version: 1;
  exportedAt: number;
  views: SavedSchedulerAuditView[];
}

export interface SavedSchedulerAuditViewsImportPreview {
  incomingCount: number;
  replacementCount: number;
  newCount: number;
  trimmedCount: number;
  replacementNames: string[];
  newNames: string[];
}

export const DEFAULT_SCHEDULER_AUDIT_FILTERS: SchedulerAuditFilters = {
  lane: "all",
  status: "all",
  window: "all",
};

export const MAX_SAVED_SCHEDULER_AUDIT_VIEWS = 6;

export const SCHEDULER_AUDIT_FILTER_PRESETS: SchedulerAuditFilterPreset[] = [
  {
    id: "all",
    label: "All activity",
    filters: DEFAULT_SCHEDULER_AUDIT_FILTERS,
  },
  {
    id: "errors",
    label: "Errors only",
    filters: {
      lane: "all",
      status: "error",
      window: "all",
    },
  },
  {
    id: "recent",
    label: "Last 24h",
    filters: {
      lane: "all",
      status: "all",
      window: "24h",
    },
  },
  {
    id: "native",
    label: "Native batch",
    filters: {
      lane: "provider_native_batch",
      status: "all",
      window: "all",
    },
  },
];

const SCHEDULER_AUDIT_FILTER_LANES = new Set<SchedulerAuditFilters["lane"]>([
  "all",
  "single_run",
  "internal_batch",
  "provider_native_batch",
]);

const SCHEDULER_AUDIT_FILTER_STATUSES = new Set<SchedulerAuditFilters["status"]>([
  "all",
  "ok",
  "error",
]);

const SCHEDULER_AUDIT_FILTER_WINDOWS = new Set<SchedulerAuditFilters["window"]>([
  "all",
  "24h",
  "7d",
]);

export function coerceSchedulerAuditFilters(
  value: Partial<SchedulerAuditFilters> | null | undefined,
): SchedulerAuditFilters {
  return {
    lane:
      value?.lane && SCHEDULER_AUDIT_FILTER_LANES.has(value.lane)
        ? value.lane
        : DEFAULT_SCHEDULER_AUDIT_FILTERS.lane,
    status:
      value?.status && SCHEDULER_AUDIT_FILTER_STATUSES.has(value.status)
        ? value.status
        : DEFAULT_SCHEDULER_AUDIT_FILTERS.status,
    window:
      value?.window && SCHEDULER_AUDIT_FILTER_WINDOWS.has(value.window)
        ? value.window
        : DEFAULT_SCHEDULER_AUDIT_FILTERS.window,
  };
}

export function sanitizeSchedulerAuditViewName(value: string): string {
  return value.trim().replace(/\s+/g, " ").slice(0, 32);
}

export function coerceSavedSchedulerAuditViews(
  value: unknown,
): SavedSchedulerAuditView[] {
  if (!Array.isArray(value)) return [];
  const next: SavedSchedulerAuditView[] = [];
  const seenIds = new Set<string>();
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const raw = item as {
      id?: unknown;
      name?: unknown;
      filters?: Partial<SchedulerAuditFilters>;
    };
    const id = typeof raw.id === "string" ? raw.id.trim() : "";
    const name =
      typeof raw.name === "string"
        ? sanitizeSchedulerAuditViewName(raw.name)
        : "";
    if (!id || !name || seenIds.has(id)) continue;
    seenIds.add(id);
    next.push({
      id,
      name,
      filters: coerceSchedulerAuditFilters(raw.filters),
    });
    if (next.length >= MAX_SAVED_SCHEDULER_AUDIT_VIEWS) break;
  }
  return next;
}

export function buildSavedSchedulerAuditViewsExport(
  views: SavedSchedulerAuditView[],
): SavedSchedulerAuditViewsExport {
  return {
    version: 1,
    exportedAt: Date.now(),
    views: coerceSavedSchedulerAuditViews(views),
  };
}

export function coerceSavedSchedulerAuditViewsImport(
  value: unknown,
): SavedSchedulerAuditView[] {
  if (Array.isArray(value)) {
    return coerceSavedSchedulerAuditViews(value);
  }
  if (value && typeof value === "object" && "views" in value) {
    return coerceSavedSchedulerAuditViews(
      (value as { views?: unknown }).views,
    );
  }
  return [];
}

export function summarizeSavedSchedulerAuditViewsImport(
  current: SavedSchedulerAuditView[],
  incoming: SavedSchedulerAuditView[],
): SavedSchedulerAuditViewsImportPreview {
  const currentNames = new Set(
    current.map((view) => view.name.toLowerCase()),
  );
  const replacementNames: string[] = [];
  const newNames: string[] = [];
  for (const view of incoming) {
    if (currentNames.has(view.name.toLowerCase())) {
      replacementNames.push(view.name);
    } else {
      newNames.push(view.name);
    }
  }
  const mergedCount = replacementNames.length + newNames.length;
  const untouchedCurrentCount = Math.max(0, current.length - replacementNames.length);
  const trimmedCount = Math.max(
    0,
    untouchedCurrentCount + mergedCount - MAX_SAVED_SCHEDULER_AUDIT_VIEWS,
  );
  return {
    incomingCount: incoming.length,
    replacementCount: replacementNames.length,
    newCount: newNames.length,
    trimmedCount,
    replacementNames,
    newNames,
  };
}

export interface SchedulerGovernanceRecommendation {
  id: string;
  tone: "success" | "info" | "warning";
  title: string;
  detail: string;
}

export interface SchedulerGovernanceSnapshot {
  totalJobs: number;
  activeJobs: number;
  queuedJobs: number;
  queuedFailureJobs: number;
  durableArtifactJobs: number;
  approveOnWriteJobs: number;
  reviewGatedJobs: number;
  observeOnlyJobs: number;
  longPromptJobs: number;
  totalPromptChars: number;
  completedEfficiencySnapshots: number;
  lowCacheabilityRuns: number;
  heavyMeasuredRuns: number;
  measuredPromptChars: number;
  unmeasuredActiveJobs: number;
  splitPrefixRuns: number;
  sharedWindowRuns: number;
  batchedRuns: number;
  internalBatchRuns: number;
  singleRunMeasuredRuns: number;
  providerNativeBatchRuns: number;
  templatedActiveJobs: number;
  templateEligibleJobs: number;
  templateGapJobs: number;
  cacheObservableRuns: number;
  observedCacheRuns: number;
  cacheHitRuns: number;
  cacheWarmRuns: number;
  cacheObservedCoverage: number;
  cacheHitCoverage: number;
  recommendations: SchedulerGovernanceRecommendation[];
}

export function buildScheduledJobEfficiencySnapshot({
  systemPrompt,
  userPrompt,
  systemPromptChars,
  stablePrefixChars,
  volatilePromptChars,
  output,
  toolCatalogChars = 0,
  cacheStrategy = "system_only",
  singleFlightScope = "job",
  batchedRun = false,
  batchMode = batchedRun ? "internal" : "single",
  batchSize = 1,
  cacheObserved = false,
  cacheReadTokens = 0,
  cacheWriteTokens = 0,
}: {
  systemPrompt?: string;
  userPrompt?: string;
  systemPromptChars?: number;
  stablePrefixChars?: number;
  volatilePromptChars?: number;
  output: string;
  toolCatalogChars?: number;
  cacheStrategy?: ScheduledJobEfficiencySnapshot["cacheStrategy"];
  singleFlightScope?: ScheduledJobEfficiencySnapshot["singleFlightScope"];
  batchedRun?: boolean;
  batchMode?: ScheduledJobEfficiencySnapshot["batchMode"];
  batchSize?: number;
  cacheObserved?: boolean;
  cacheReadTokens?: number;
  cacheWriteTokens?: number;
}): ScheduledJobEfficiencySnapshot {
  const resolvedSystemPromptChars = Math.max(
    0,
    systemPromptChars ?? systemPrompt?.length ?? 0,
  );
  const resolvedStablePrefixChars = Math.max(
    0,
    stablePrefixChars ?? resolvedSystemPromptChars,
  );
  const resolvedVolatilePromptChars = Math.max(
    0,
    volatilePromptChars ?? userPrompt?.length ?? 0,
  );
  const promptChars =
    resolvedStablePrefixChars +
    resolvedVolatilePromptChars +
    Math.max(0, toolCatalogChars);
  const stableRatio =
    resolvedStablePrefixChars /
    Math.max(1, resolvedStablePrefixChars + resolvedVolatilePromptChars);

  let cacheability: ScheduledJobEfficiencySnapshot["cacheability"] = "low";
  if (stableRatio >= 0.68 && resolvedVolatilePromptChars <= 900) {
    cacheability = "high";
  } else if (stableRatio >= 0.5) {
    cacheability = "medium";
  }

  return {
    recordedAt: Date.now(),
    systemPromptChars: resolvedSystemPromptChars,
    stablePrefixChars: resolvedStablePrefixChars,
    volatilePromptChars: resolvedVolatilePromptChars,
    promptChars,
    outputChars: output.trim().length,
    toolCatalogChars: Math.max(0, toolCatalogChars),
    cacheability,
    cacheStrategy,
    singleFlightScope,
    batchedRun,
    batchMode,
    batchSize,
    cacheObserved,
    cacheReadTokens: Math.max(0, cacheReadTokens),
    cacheWriteTokens: Math.max(0, cacheWriteTokens),
    cacheHit: cacheReadTokens > 0,
  };
}

export function analyzeScheduledJobs(
  jobs: ScheduledJob[],
): SchedulerGovernanceSnapshot {
  const activeJobs = jobs.filter((job) => job.enabled);
  const queuedJobs = activeJobs.filter((job) => job.lastStatus === "queued").length;
  const queuedFailureJobs = activeJobs.filter(
    (job) => job.lastStatus === "queued" && (job.pendingBatchPollFailures ?? 0) > 0,
  ).length;
  const measuredJobs = activeJobs.filter(
    (
      job,
    ): job is ScheduledJob & { lastEfficiency: ScheduledJobEfficiencySnapshot } =>
      Boolean(job.lastEfficiency),
  );
  const durableArtifactJobs = activeJobs.filter(
    (job) => job.outputTarget === "vault" || job.outputTarget === "review",
  ).length;
  const approveOnWriteJobs = activeJobs.filter(
    (job) => job.approvalPolicy === "approve_on_write",
  ).length;
  const reviewGatedJobs = activeJobs.filter(
    (job) => !job.approvalPolicy || job.approvalPolicy === "human_gate",
  ).length;
  const observeOnlyJobs = activeJobs.filter(
    (job) => job.approvalPolicy === "observe",
  ).length;
  const longPromptJobs = activeJobs.filter(
    (job) => job.prompt.trim().length >= 220,
  ).length;
  const totalPromptChars = activeJobs.reduce(
    (sum, job) => sum + job.prompt.trim().length,
    0,
  );
  const completedEfficiencySnapshots = measuredJobs.length;
  const lowCacheabilityRuns = measuredJobs.filter(
    (job) => job.lastEfficiency.cacheability === "low",
  ).length;
  const heavyMeasuredRuns = measuredJobs.filter(
    (job) => job.lastEfficiency.promptChars >= 2600,
  ).length;
  const measuredPromptChars = measuredJobs.reduce(
    (sum, job) => sum + job.lastEfficiency.promptChars,
    0,
  );
  const splitPrefixRuns = measuredJobs.filter(
    (job) => job.lastEfficiency.cacheStrategy === "system_plus_user_prefix",
  ).length;
  const sharedWindowRuns = measuredJobs.filter(
    (job) => job.lastEfficiency.singleFlightScope === "shared_window",
  ).length;
  const batchedRuns = measuredJobs.filter(
    (job) => job.lastEfficiency.batchedRun,
  ).length;
  const providerNativeBatchRuns = measuredJobs.filter(
    (job) => job.lastEfficiency.batchMode === "provider_native",
  ).length;
  const internalBatchRuns = Math.max(0, batchedRuns - providerNativeBatchRuns);
  const singleRunMeasuredRuns = Math.max(
    0,
    completedEfficiencySnapshots - batchedRuns,
  );
  const templateEligibleJobs = activeJobs.filter(
    (job) => (job.approvalPolicy ?? "human_gate") !== "approve_on_write",
  ).length;
  const templatedActiveJobs = activeJobs.filter((job) =>
    Boolean(job.templateId?.trim()),
  ).length;
  const templateGapJobs = Math.max(
    0,
    templateEligibleJobs - templatedActiveJobs,
  );
  const cacheObservableRuns = measuredJobs.filter(
    (job) => job.lastEfficiency.batchMode !== "provider_native",
  );
  const observedCacheRuns = cacheObservableRuns.filter(
    (job) => job.lastEfficiency.cacheObserved,
  ).length;
  const cacheHitRuns = cacheObservableRuns.filter(
    (job) => job.lastEfficiency.cacheHit,
  ).length;
  const cacheWarmRuns = Math.max(0, observedCacheRuns - cacheHitRuns);
  const cacheObservedCoverage = Math.round(
    (observedCacheRuns / Math.max(1, cacheObservableRuns.length)) * 100,
  );
  const cacheHitCoverage = Math.round(
    (cacheHitRuns / Math.max(1, observedCacheRuns)) * 100,
  );
  const unmeasuredActiveJobs = Math.max(
    0,
    activeJobs.length - completedEfficiencySnapshots,
  );

  const recommendations: SchedulerGovernanceRecommendation[] = [];

  if (
    activeJobs.some(
      (job) =>
        (job.outputTarget === "vault" || job.outputTarget === "review") &&
        job.approvalPolicy === "approve_on_write",
    )
  ) {
    recommendations.push({
      id: "durable-approve-on-write",
      tone: "warning",
      title: "Durable artifact jobs are auto-approving writes",
      detail:
        "At least one active scheduled mission writes durable output while using approve-on-write. Prefer human gate for memory-bearing or review-targeted jobs.",
    });
  }

  if (longPromptJobs > 0) {
    recommendations.push({
      id: "long-scheduler-prompts",
      tone: "info",
      title: "Some scheduled prompts are still heavy",
      detail:
        "Long scheduled prompts are the next place to apply stable-prefix splitting and compact mission templates so non-interactive runs stay cheaper and more predictable.",
    });
  }

  if (heavyMeasuredRuns > 0) {
    recommendations.push({
      id: "heavy-measured-runs",
      tone: "warning",
      title: "Completed scheduled runs are still heavy",
      detail:
        "At least one recurring mission already produced a large measured prompt payload. Tighten stable-prefix splitting before adding more automation to the same lane.",
    });
  }

  if (lowCacheabilityRuns > 0) {
    recommendations.push({
      id: "low-cacheability-runs",
      tone: "info",
      title: "Some completed jobs still skew volatile",
      detail:
        "Measured scheduled runs show weak stable-prefix reuse. Keep the reusable prefix stable and compress the job-specific delta so prompt caching has more to reuse.",
    });
  }

  if (templateGapJobs > 0) {
    recommendations.push({
      id: "template-gap-jobs",
      tone: "info",
      title: "Some recurring missions still lack template posture",
      detail:
        "At least one scheduler-friendly recurring mission is running without a linked workflow template. Promote the strongest candidate into a mission template before widening cadence.",
    });
  }

  if (completedEfficiencySnapshots > 0 && splitPrefixRuns === 0) {
    recommendations.push({
      id: "no-split-prefix-runs",
      tone: "warning",
      title: "Measured jobs are not using split prompt prefixes",
      detail:
        "Completed scheduled runs are still behaving like monolithic prompts. Split stable framing from the volatile task block so Anthropic prompt caching has more reusable surface.",
    });
  }

  if (activeJobs.length >= 2 && completedEfficiencySnapshots > 0 && batchedRuns === 0) {
    recommendations.push({
      id: "no-batched-runs",
      tone: "info",
      title: "No measured jobs have used the batch lane yet",
      detail:
        "Multiple active scheduled missions are present, but recent completed runs did not use the internal batch path. Keep grouping review-gated jobs where possible before widening cadence.",
    });
  }

  if (queuedJobs > 0) {
    recommendations.push({
      id: "queued-native-batches",
      tone: "info",
      title: "Some scheduled jobs are queued in a native batch lane",
      detail:
        "Queued native-batch jobs are intentionally paused until Anthropic returns ended results. They will not be re-submitted every scheduler tick while the pending batch is still active.",
    });
  }

  if (queuedFailureJobs > 0) {
    recommendations.push({
      id: "queued-native-batch-failures",
      tone: "warning",
      title: "Some queued native batches are having trouble polling",
      detail:
        "At least one queued Anthropic batch has already hit poll failures. Clear the stalled queue or let the bounded retry policy release it before relying on that lane for more recurring work.",
    });
  }

  if (cacheObservableRuns.length > 0 && observedCacheRuns === 0) {
    recommendations.push({
      id: "no-cache-observability",
      tone: "info",
      title: "Cache usage is still unobserved on measured runs",
      detail:
        "The scheduler has efficiency snapshots, but none of the completed runs exposed prompt-cache telemetry yet. Track provider cache reads and writes so cache tuning is evidence-based.",
    });
  }

  if (unmeasuredActiveJobs > 0) {
    recommendations.push({
      id: "unmeasured-jobs",
      tone: "info",
      title: "Some active jobs are still unmeasured",
      detail:
        "A few recurring missions have not produced an efficiency snapshot yet. Let them run once before widening cadence or cloning their prompt shape.",
    });
  }

  if (activeJobs.length >= 5) {
    recommendations.push({
      id: "many-active-jobs",
      tone: "warning",
      title: "Scheduler surface is getting crowded",
      detail:
        "Multiple active jobs can drift into overlapping work and duplicated context. Consolidate overlapping briefs before adding more cadence.",
    });
  }

  if (recommendations.length === 0) {
    recommendations.push({
      id: "healthy",
      tone: "success",
      title: "Scheduler posture looks disciplined",
      detail:
        "The current scheduled jobs stay within a reasonable local-first posture. Measured recurring runs look lean enough to keep pushing on cacheability and mission-template polish next.",
    });
  }

  return {
    totalJobs: jobs.length,
    activeJobs: activeJobs.length,
    queuedJobs,
    queuedFailureJobs,
    durableArtifactJobs,
    approveOnWriteJobs,
    reviewGatedJobs,
    observeOnlyJobs,
    longPromptJobs,
    totalPromptChars,
    completedEfficiencySnapshots,
    lowCacheabilityRuns,
    heavyMeasuredRuns,
    measuredPromptChars,
    unmeasuredActiveJobs,
    splitPrefixRuns,
    sharedWindowRuns,
    batchedRuns,
    internalBatchRuns,
    singleRunMeasuredRuns,
    providerNativeBatchRuns,
    templatedActiveJobs,
    templateEligibleJobs,
    templateGapJobs,
    cacheObservableRuns: cacheObservableRuns.length,
    observedCacheRuns,
    cacheHitRuns,
    cacheWarmRuns,
    cacheObservedCoverage,
    cacheHitCoverage,
    recommendations,
  };
}

export function hasActiveSchedulerAuditFilters(
  filters: SchedulerAuditFilters,
) {
  return (
    filters.lane !== "all" ||
    filters.status !== "all" ||
    filters.window !== "all"
  );
}

export function areSchedulerAuditFiltersEqual(
  a: SchedulerAuditFilters,
  b: SchedulerAuditFilters,
) {
  return a.lane === b.lane && a.status === b.status && a.window === b.window;
}

function matchesSchedulerAuditWindow(
  recordedAt: number,
  window: SchedulerAuditFilters["window"],
) {
  if (window === "all") return true;
  const maxAgeMs = window === "24h" ? 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000;
  return Date.now() - recordedAt <= maxAgeMs;
}

function matchesSchedulerAuditFilters(
  executionOrigin: NonNullable<ScheduledJob["lastExecutionOrigin"]>,
  status: "ok" | "error",
  recordedAt: number,
  filters: SchedulerAuditFilters,
) {
  if (filters.lane !== "all" && executionOrigin !== filters.lane) return false;
  if (filters.status !== "all" && status !== filters.status) return false;
  if (!matchesSchedulerAuditWindow(recordedAt, filters.window)) return false;
  return true;
}

export function filterScheduledJobRecentExecutions(
  job: ScheduledJob,
  filters: SchedulerAuditFilters,
): NonNullable<ScheduledJob["recentExecutions"]> {
  const recentExecutions = job.recentExecutions ?? [];
  if (!hasActiveSchedulerAuditFilters(filters)) return recentExecutions;
  return recentExecutions.filter((run) =>
    matchesSchedulerAuditFilters(
      run.executionOrigin,
      run.status,
      run.recordedAt,
      filters,
    ),
  );
}

function jobMatchesSchedulerAuditFilters(
  job: ScheduledJob,
  filters: SchedulerAuditFilters,
) {
  if (!hasActiveSchedulerAuditFilters(filters)) return true;
  if (filterScheduledJobRecentExecutions(job, filters).length > 0) return true;
  if (
    job.lastExecutionOrigin &&
    job.lastExecutionAt &&
    (job.lastStatus === "ok" || job.lastStatus === "error")
  ) {
    return matchesSchedulerAuditFilters(
      job.lastExecutionOrigin,
      job.lastStatus,
      job.lastExecutionAt,
      filters,
    );
  }
  return false;
}

export function buildSchedulerAuditExport(
  jobs: ScheduledJob[],
  nativeBatchPosture?: SchedulerAuditExport["nativeBatchPosture"],
  options?: {
    jobIds?: string[];
    scopeLabel?: string;
    filters?: SchedulerAuditFilters;
  },
): SchedulerAuditExport {
  const filters = options?.filters ?? DEFAULT_SCHEDULER_AUDIT_FILTERS;
  const scopeJobIds = options?.jobIds?.length
    ? Array.from(new Set(options.jobIds))
    : jobs.map((job) => job.id);
  const scopedJobs = options?.jobIds?.length
    ? jobs.filter((job) => scopeJobIds.includes(job.id))
    : jobs;
  const filteredScopedJobs = scopedJobs.filter((job) =>
    jobMatchesSchedulerAuditFilters(job, filters),
  );
  const scopeKind: SchedulerAuditExport["scope"]["kind"] =
    options?.jobIds?.length ? "job" : "all";
  const scopeLabel =
    options?.scopeLabel ??
    (scopeKind === "job" && scopedJobs.length === 1
      ? scopedJobs[0].name
      : "All scheduled jobs");
  return {
    exportedAt: new Date().toISOString(),
    scope: {
      kind: scopeKind,
      label: scopeLabel,
      jobIds: scopeJobIds,
    },
    filters,
    snapshot: analyzeScheduledJobs(filteredScopedJobs),
    nativeBatchPosture,
    jobs: filteredScopedJobs.map((job) => ({
      id: job.id,
      name: job.name,
      enabled: job.enabled,
      cron: job.cron,
      type: job.type,
      outputTarget: job.outputTarget,
      approvalPolicy: job.approvalPolicy,
      missionAgent: job.missionAgent,
      templateId: job.templateId,
      lastRunAt: job.lastRunAt,
      lastStatus: job.lastStatus,
      lastSummary: job.lastSummary,
      lastExecutionOrigin: job.lastExecutionOrigin,
      lastExecutionAt: job.lastExecutionAt,
      lastArtifactOrigin: job.lastArtifactOrigin,
      lastArtifactTarget: job.lastArtifactTarget,
      lastArtifactAt: job.lastArtifactAt,
      lastEfficiency: job.lastEfficiency,
      recentExecutions: filterScheduledJobRecentExecutions(job, filters),
    })),
  };
}
