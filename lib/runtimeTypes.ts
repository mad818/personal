import { z } from "zod";

const EvalPointSchema = z.object({
  ts: z.string().optional(),
  score: z.number().optional(),
  minScore: z.number().optional(),
  ok: z.boolean().optional(),
  categories: z.record(z.object({ score: z.number().optional() })).optional(),
});

const RuntimeEvalFailuresSchema = z.object({
  checks: z
    .array(
      z.object({
        name: z.string().optional(),
        category: z.string().optional(),
      }),
    )
    .optional(),
  categories: z
    .array(
      z.object({
        name: z.string().optional(),
        score: z.number().optional(),
        threshold: z.number().nullable().optional(),
      }),
    )
    .optional(),
});

const RuntimeEvalRunnerSchema = z.object({
  cooldownMin: z.number().optional(),
  effectiveCooldownMin: z.number().optional(),
  failureStreak: z.number().optional(),
  nextEligibleAt: z.string().optional(),
});

const RuntimeExperimentSummarySchema = z.object({
  id: z.string().optional(),
  createdAt: z.string().optional(),
  title: z.string().optional(),
  variantKind: z
    .enum([
      "prompt_delta",
      "routing_preset_delta",
      "memory_context_policy_delta",
      "tool_selection_policy_delta",
    ])
    .optional(),
  recommendation: z.enum(["reject", "review", "candidate_win"]).optional(),
  verdict: z.enum(["regressed", "neutral", "improved"]).optional(),
  scoreDelta: z.number().optional(),
  summary: z.string().optional(),
});

const ForecastProviderStatusSchema = z.object({
  id: z.string().optional(),
  label: z.string().optional(),
  ready: z.boolean().optional(),
  requiresCompanion: z.boolean().optional(),
  confidenceSupported: z.boolean().optional(),
  supportedHorizons: z.array(z.string()).optional(),
  degradedReason: z.string().nullable().optional(),
});

const ForecastBacktestResultSchema = z.object({
  assetId: z.string().optional(),
  symbol: z.string().optional(),
  horizon: z.string().optional(),
  status: z.enum(["ok", "insufficient_history"]).optional(),
  sampleCount: z.number().optional(),
  windows: z.number().optional(),
  latestActual: z.number().nullable().optional(),
  latestPredicted: z.number().nullable().optional(),
  meanAbsolutePercentageError: z.number().nullable().optional(),
  rootMeanSquaredError: z.number().nullable().optional(),
  directionalAccuracy: z.number().nullable().optional(),
  insufficientHistoryReason: z.string().nullable().optional(),
});

const ForecastRunSummarySchema = z.object({
  score: z.number().optional(),
  quality: z.enum(["ready", "guarded", "degraded"]).optional(),
  label: z.string().optional(),
  assetsRequested: z.number().optional(),
  assetsCovered: z.number().optional(),
  insufficientHistoryCount: z.number().optional(),
  horizons: z.array(z.string()).optional(),
  windows: z.number().optional(),
  meanAbsolutePercentageError: z.number().nullable().optional(),
  rootMeanSquaredError: z.number().nullable().optional(),
  directionalAccuracy: z.number().nullable().optional(),
  reasons: z.array(z.string()).optional(),
});

const ForecastRunSchema = z.object({
  ts: z.string().optional(),
  provider: ForecastProviderStatusSchema.optional(),
  universe: z
    .object({
      assetIds: z.array(z.string()).optional(),
      requestedAssets: z.number().optional(),
      coveredAssets: z.number().optional(),
      insufficientAssets: z.number().optional(),
    })
    .optional(),
  summary: ForecastRunSummarySchema.optional(),
  backtests: z.array(ForecastBacktestResultSchema).optional(),
});

const SchedulerEfficiencyProviderStatusSchema = z.object({
  id: z.string().optional(),
  label: z.string().optional(),
  ready: z.boolean().optional(),
  supportsSingleRun: z.boolean().optional(),
  supportsInternalBatch: z.boolean().optional(),
  supportsProviderNativeBatch: z.boolean().optional(),
  degradedReason: z.string().nullable().optional(),
});

const SchedulerEfficiencyLaneSchema = z.object({
  count: z.number().optional(),
  label: z.string().optional(),
});

const SchedulerEfficiencyQueueSchema = z.object({
  pendingNativeBatchCount: z.number().optional(),
  pendingNativeBatchFailures: z.number().optional(),
  boundedRetryHealthy: z.boolean().optional(),
  label: z.string().optional(),
});

const SchedulerEfficiencyLedgerEntrySchema = z.object({
  jobId: z.string().optional(),
  jobName: z.string().optional(),
  recordedAt: z.number().optional(),
  status: z.enum(["ok", "error", "queued"]).optional(),
  executionOrigin: z
    .enum([
      "single_run",
      "internal_batch",
      "provider_native_batch",
      "queue_pending",
    ])
    .optional(),
  cacheHit: z.boolean().optional(),
  batchMode: z.string().optional(),
  wroteArtifact: z.boolean().optional(),
  artifactTarget: z.string().optional(),
  note: z.string().optional(),
});

const SchedulerEfficiencyRepairCandidateSchema = z.object({
  jobId: z.string().optional(),
  jobName: z.string().optional(),
  reason: z.string().optional(),
});

const SchedulerEfficiencyRunSummarySchema = z.object({
  score: z.number().optional(),
  quality: z.enum(["ready", "guarded", "degraded"]).optional(),
  label: z.string().optional(),
  activeJobs: z.number().optional(),
  measuredRuns: z.number().optional(),
  cacheObservableRuns: z.number().optional(),
  observedCacheRuns: z.number().optional(),
  cacheHitRuns: z.number().optional(),
  cacheObservedCoverage: z.number().optional(),
  cacheHitCoverage: z.number().optional(),
  batchedRuns: z.number().optional(),
  internalBatchRuns: z.number().optional(),
  providerNativeBatchRuns: z.number().optional(),
  queuedJobs: z.number().optional(),
  queuedFailureJobs: z.number().optional(),
  lowCacheabilityRuns: z.number().optional(),
  templateGapJobs: z.number().optional(),
  reasons: z.array(z.string()).optional(),
  strongestTakeaway: z.string().optional(),
  strongestOptimization: z.string().optional(),
});

const SchedulerEfficiencyRunSchema = z.object({
  ts: z.string().optional(),
  sourceSyncedAt: z.string().nullable().optional(),
  provider: SchedulerEfficiencyProviderStatusSchema.optional(),
  summary: SchedulerEfficiencyRunSummarySchema.optional(),
  lanes: z
    .object({
      single: SchedulerEfficiencyLaneSchema.optional(),
      internalBatch: SchedulerEfficiencyLaneSchema.optional(),
      providerNativeBatch: SchedulerEfficiencyLaneSchema.optional(),
    })
    .optional(),
  queue: SchedulerEfficiencyQueueSchema.optional(),
  ledger: z.array(SchedulerEfficiencyLedgerEntrySchema).optional(),
  repairCandidates: z.array(SchedulerEfficiencyRepairCandidateSchema).optional(),
});

export const ForecastEvalPayloadSchema = z.object({
  status: z.string().optional(),
  provider: ForecastProviderStatusSchema.optional(),
  latest: ForecastRunSchema.nullable().optional(),
  history: z.array(ForecastRunSchema).optional(),
  points: z.number().optional(),
  freshness: z
    .object({
      freshnessWindowMin: z.number().optional(),
      ageMinutes: z.number().nullable().optional(),
      stale: z.boolean().optional(),
    })
    .optional(),
  runner: RuntimeEvalRunnerSchema.optional(),
});

export const SchedulerEfficiencyEvalPayloadSchema = z.object({
  status: z.string().optional(),
  provider: SchedulerEfficiencyProviderStatusSchema.optional(),
  latest: SchedulerEfficiencyRunSchema.nullable().optional(),
  history: z.array(SchedulerEfficiencyRunSchema).optional(),
  points: z.number().optional(),
  freshness: z
    .object({
      freshnessWindowMin: z.number().optional(),
      ageMinutes: z.number().nullable().optional(),
      stale: z.boolean().optional(),
    })
    .optional(),
  source: z
    .object({
      syncedAt: z.string().nullable().optional(),
      activeJobs: z.number().optional(),
      totalJobs: z.number().optional(),
      ageMinutes: z.number().nullable().optional(),
      stale: z.boolean().optional(),
    })
    .optional(),
  runner: RuntimeEvalRunnerSchema.optional(),
});

export const RuntimeEvalPayloadSchema = z.object({
  latest: EvalPointSchema.nullable().optional(),
  history: z.array(EvalPointSchema).optional(),
  points: z.number().optional(),
  experiments: z
    .object({
      latest: RuntimeExperimentSummarySchema.nullable().optional(),
      points: z.number().optional(),
      definitions: z.number().optional(),
    })
    .optional(),
  schedulerEfficiency: SchedulerEfficiencyEvalPayloadSchema.optional(),
  forecastEval: ForecastEvalPayloadSchema.optional(),
  freshness: z
    .object({
      freshnessWindowMin: z.number().optional(),
      ageMinutes: z.number().nullable().optional(),
      stale: z.boolean().optional(),
    })
    .optional(),
  failures: RuntimeEvalFailuresSchema.optional(),
  runner: RuntimeEvalRunnerSchema.optional(),
});

export type RuntimeEvalPayload = z.infer<typeof RuntimeEvalPayloadSchema>;
export type ForecastEvalPayload = z.infer<typeof ForecastEvalPayloadSchema>;
export type SchedulerEfficiencyEvalPayload = z.infer<
  typeof SchedulerEfficiencyEvalPayloadSchema
>;

export function parseRuntimeEvalPayload(input: unknown): RuntimeEvalPayload {
  const parsed = RuntimeEvalPayloadSchema.safeParse(input);
  if (parsed.success) return parsed.data;
  return { latest: null, history: [], points: 0 };
}

export function parseForecastEvalPayload(input: unknown): ForecastEvalPayload {
  const parsed = ForecastEvalPayloadSchema.safeParse(input);
  if (parsed.success) return parsed.data;
  return { latest: null, history: [], points: 0 };
}

export function parseSchedulerEfficiencyEvalPayload(
  input: unknown,
): SchedulerEfficiencyEvalPayload {
  const parsed = SchedulerEfficiencyEvalPayloadSchema.safeParse(input);
  if (parsed.success) return parsed.data;
  return { latest: null, history: [], points: 0 };
}

export const StatusPayloadSchema = z.object({
  status: z.string().optional(),
  generatedAt: z.string().optional(),
  readiness: z
    .object({
      experiments: z
        .object({
          runtimeVariants: z
            .object({
              baselineOnly: z.boolean().optional(),
              latest: RuntimeExperimentSummarySchema.nullable().optional(),
            })
            .optional(),
        })
        .optional(),
      evalPolicy: z
        .object({
          rollup: z
            .object({
              grade: z.enum(["A", "B", "C", "unknown"]).optional(),
              stale: z.boolean().optional(),
              degradedReasons: z.array(z.string()).optional(),
            })
            .optional(),
        })
        .optional(),
      toolIsolation: z
        .object({
          adapterReady: z.boolean().optional(),
          requiredExecTools: z.number().optional(),
          approvedExecTools: z.number().optional(),
          status: z.enum(["not_required", "ready", "unavailable", "blocked"]).optional(),
          reason: z.string().nullable().optional(),
        })
        .optional(),
    })
    .optional(),
});

export type StatusPayload = z.infer<typeof StatusPayloadSchema>;

export function parseStatusPayload(input: unknown): StatusPayload {
  const parsed = StatusPayloadSchema.safeParse(input);
  if (parsed.success) return parsed.data;
  return {};
}
