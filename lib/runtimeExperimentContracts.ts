import { z } from "zod";

export const runtimeExperimentVariantKindSchema = z.enum([
  "prompt_delta",
  "routing_preset_delta",
  "memory_context_policy_delta",
  "tool_selection_policy_delta",
]);

export const runtimeExperimentCategorySchema = z.enum([
  "safety",
  "reliability",
  "ux",
  "observability",
]);

export const runtimeExperimentVerdictSchema = z.enum([
  "regressed",
  "neutral",
  "improved",
]);

export const runtimeExperimentRecommendationSchema = z.enum([
  "reject",
  "review",
  "candidate_win",
]);

export const runtimeExperimentDecisionValueSchema = z.enum([
  "keep",
  "reject",
  "defer",
]);

export const runtimeExperimentDefinitionInputSchema = z.object({
  title: z.string().trim().min(1).max(160),
  variantKind: runtimeExperimentVariantKindSchema,
  changeSummary: z.string().trim().min(1).max(600),
  hypothesis: z.string().trim().min(1).max(600),
  targetCategories: z.array(runtimeExperimentCategorySchema).max(4).default([]),
  operatorNotes: z.string().trim().max(1200).optional(),
});

export const runtimeExperimentDefinitionSchema =
  runtimeExperimentDefinitionInputSchema.extend({
    id: z.string().min(1).max(120),
    createdAt: z.string().datetime(),
  });

const runtimeExperimentCategoryScoreSchema = z.object({
  score: z.number().min(0).max(100),
});

const runtimeExperimentFailureSchema = z.object({
  name: z.string().min(1).max(200),
  category: z.string().min(1).max(80),
});

const runtimeExperimentCategoryFailureSchema = z.object({
  name: z.string().min(1).max(80),
  score: z.number().min(0).max(100),
  threshold: z.number().nullable(),
});

export const runtimeExperimentEvalSnapshotSchema = z.object({
  ts: z.string().datetime(),
  score: z.number().min(0).max(100),
  minScore: z.number().min(0).max(100),
  ok: z.boolean(),
  categories: z.record(runtimeExperimentCategoryScoreSchema),
  categoryThresholds: z.record(z.number().min(0).max(100)),
  failedChecks: z.array(runtimeExperimentFailureSchema).default([]),
  failedCategories: z.array(runtimeExperimentCategoryFailureSchema).default([]),
});

export const runtimeExperimentVariantResultSchema = z.object({
  score: z.number().min(0).max(100),
  categories: z.record(runtimeExperimentCategoryScoreSchema),
  categoryThresholds: z.record(z.number().min(0).max(100)),
  failedChecks: z.array(runtimeExperimentFailureSchema).default([]),
  failedCategories: z.array(runtimeExperimentCategoryFailureSchema).default([]),
  deltas: z.record(z.number().min(-20).max(20)),
  notes: z.array(z.string().min(1).max(240)).default([]),
});

export const runtimeExperimentComparisonSchema = z.object({
  scoreDelta: z.number().min(-100).max(100),
  categoryDeltas: z.record(z.number().min(-20).max(20)),
  newFailures: z.array(z.string().min(1).max(200)).default([]),
  resolvedFailures: z.array(z.string().min(1).max(200)).default([]),
  verdict: runtimeExperimentVerdictSchema,
  recommendation: runtimeExperimentRecommendationSchema,
  summary: z.string().min(1).max(600),
});

export const runtimeExperimentRunSchema = z.object({
  id: z.string().min(1).max(120),
  createdAt: z.string().datetime(),
  definition: runtimeExperimentDefinitionSchema,
  baseline: runtimeExperimentEvalSnapshotSchema,
  variant: runtimeExperimentVariantResultSchema,
  comparison: runtimeExperimentComparisonSchema,
});

export const runtimeExperimentDecisionInputSchema = z.object({
  runId: z.string().trim().min(1).max(120),
  decision: runtimeExperimentDecisionValueSchema,
  rationale: z.string().trim().min(1).max(600),
});

export const runtimeExperimentDecisionSchema = z.object({
  id: z.string().min(1).max(120),
  runId: z.string().min(1).max(120),
  definitionId: z.string().min(1).max(120),
  decidedAt: z.string().datetime(),
  decision: runtimeExperimentDecisionValueSchema,
  rationale: z.string().min(1).max(600),
  benchmark: z.object({
    recommendation: runtimeExperimentRecommendationSchema,
    verdict: runtimeExperimentVerdictSchema,
    scoreDelta: z.number().min(-100).max(100),
    keepEligible: z.boolean(),
  }),
});

export const runtimeExperimentLatestSummarySchema = z.object({
  id: z.string().min(1).max(120),
  createdAt: z.string().datetime(),
  title: z.string().min(1).max(160),
  variantKind: runtimeExperimentVariantKindSchema,
  recommendation: runtimeExperimentRecommendationSchema,
  verdict: runtimeExperimentVerdictSchema,
  scoreDelta: z.number().min(-100).max(100),
  summary: z.string().min(1).max(600),
});

export const runtimeExperimentPayloadSchema = z.object({
  latest: runtimeExperimentRunSchema.nullable().optional(),
  history: z.array(runtimeExperimentRunSchema).default([]),
  definitions: z.array(runtimeExperimentDefinitionSchema).default([]),
  decisions: z.array(runtimeExperimentDecisionSchema).default([]),
  latestDecision: runtimeExperimentDecisionSchema.nullable().optional(),
  points: z.number().int().nonnegative(),
  summary: runtimeExperimentLatestSummarySchema.nullable().optional(),
});

export type RuntimeExperimentVariantKind = z.infer<
  typeof runtimeExperimentVariantKindSchema
>;
export type RuntimeExperimentCategory = z.infer<
  typeof runtimeExperimentCategorySchema
>;
export type RuntimeExperimentRecommendation = z.infer<
  typeof runtimeExperimentRecommendationSchema
>;
export type RuntimeExperimentDecisionValue = z.infer<
  typeof runtimeExperimentDecisionValueSchema
>;
export type RuntimeExperimentVerdict = z.infer<
  typeof runtimeExperimentVerdictSchema
>;
export type RuntimeExperimentDefinitionInput = z.infer<
  typeof runtimeExperimentDefinitionInputSchema
>;
export type RuntimeExperimentDefinition = z.infer<
  typeof runtimeExperimentDefinitionSchema
>;
export type RuntimeExperimentRun = z.infer<typeof runtimeExperimentRunSchema>;
export type RuntimeExperimentDecisionInput = z.infer<
  typeof runtimeExperimentDecisionInputSchema
>;
export type RuntimeExperimentDecision = z.infer<
  typeof runtimeExperimentDecisionSchema
>;
export type RuntimeExperimentLatestSummary = z.infer<
  typeof runtimeExperimentLatestSummarySchema
>;
export type RuntimeExperimentPayload = z.infer<
  typeof runtimeExperimentPayloadSchema
>;

export interface RuntimeExperimentKeepGate {
  eligible: boolean;
  reasons: string[];
}

export function evaluateRuntimeExperimentKeepGate(
  run: RuntimeExperimentRun,
): RuntimeExperimentKeepGate {
  const reasons: string[] = [];
  if (run.comparison.recommendation !== "candidate_win") {
    reasons.push("Benchmark recommendation is not candidate_win.");
  }
  if (run.comparison.verdict !== "improved") {
    reasons.push("Benchmark verdict is not improved.");
  }
  if (run.comparison.scoreDelta <= 0) {
    reasons.push("Variant does not have a positive score delta.");
  }
  if (run.comparison.newFailures.length > 0) {
    reasons.push("Variant introduces new benchmark failures.");
  }
  if (run.variant.failedChecks.length > 0) {
    reasons.push("Variant retains failed runtime checks.");
  }
  if (run.variant.failedCategories.length > 0) {
    reasons.push("Variant remains below a category threshold.");
  }
  return {
    eligible: reasons.length === 0,
    reasons,
  };
}

export function buildRuntimeExperimentDecision(
  run: RuntimeExperimentRun,
  input: RuntimeExperimentDecisionInput,
  identity: { id: string; decidedAt: string },
): RuntimeExperimentDecision {
  const parsedInput = runtimeExperimentDecisionInputSchema.parse(input);
  const gate = evaluateRuntimeExperimentKeepGate(run);
  if (parsedInput.decision === "keep" && !gate.eligible) {
    throw new Error(gate.reasons[0] ?? "Variant is not eligible to keep.");
  }
  return runtimeExperimentDecisionSchema.parse({
    id: identity.id,
    runId: run.id,
    definitionId: run.definition.id,
    decidedAt: identity.decidedAt,
    decision: parsedInput.decision,
    rationale: parsedInput.rationale,
    benchmark: {
      recommendation: run.comparison.recommendation,
      verdict: run.comparison.verdict,
      scoreDelta: run.comparison.scoreDelta,
      keepEligible: gate.eligible,
    },
  });
}

export function summarizeRuntimeExperiment(
  run: RuntimeExperimentRun | null | undefined,
): RuntimeExperimentLatestSummary | null {
  if (!run) return null;
  return {
    id: run.id,
    createdAt: run.createdAt,
    title: run.definition.title,
    variantKind: run.definition.variantKind,
    recommendation: run.comparison.recommendation,
    verdict: run.comparison.verdict,
    scoreDelta: run.comparison.scoreDelta,
    summary: run.comparison.summary,
  };
}

export function parseRuntimeExperimentPayload(
  input: unknown,
): RuntimeExperimentPayload {
  const parsed = runtimeExperimentPayloadSchema.safeParse(input);
  if (parsed.success) return parsed.data;
  return {
    latest: null,
    history: [],
    definitions: [],
    decisions: [],
    latestDecision: null,
    points: 0,
    summary: null,
  };
}
