import { z } from 'zod'

const EvalPointSchema = z.object({
  ts: z.string().optional(),
  score: z.number().optional(),
  minScore: z.number().optional(),
  ok: z.boolean().optional(),
  categories: z.record(z.object({ score: z.number().optional() })).optional(),
})

const RuntimeEvalFailuresSchema = z.object({
  checks: z.array(z.object({ name: z.string().optional(), category: z.string().optional() })).optional(),
  categories: z.array(z.object({ name: z.string().optional(), score: z.number().optional(), threshold: z.number().nullable().optional() })).optional(),
})

const RuntimeEvalRunnerSchema = z.object({
  cooldownMin: z.number().optional(),
  effectiveCooldownMin: z.number().optional(),
  failureStreak: z.number().optional(),
  nextEligibleAt: z.string().optional(),
})

export const RuntimeEvalPayloadSchema = z.object({
  latest: EvalPointSchema.nullable().optional(),
  history: z.array(EvalPointSchema).optional(),
  points: z.number().optional(),
  freshness: z.object({
    freshnessWindowMin: z.number().optional(),
    ageMinutes: z.number().nullable().optional(),
    stale: z.boolean().optional(),
  }).optional(),
  failures: RuntimeEvalFailuresSchema.optional(),
  runner: RuntimeEvalRunnerSchema.optional(),
})

export type RuntimeEvalPayload = z.infer<typeof RuntimeEvalPayloadSchema>

export function parseRuntimeEvalPayload(input: unknown): RuntimeEvalPayload {
  const parsed = RuntimeEvalPayloadSchema.safeParse(input)
  if (parsed.success) return parsed.data
  return { latest: null, history: [], points: 0 }
}

export const StatusPayloadSchema = z.object({
  status: z.string().optional(),
  generatedAt: z.string().optional(),
  readiness: z.object({
    evalPolicy: z.object({
      rollup: z.object({
        grade: z.enum(['A', 'B', 'C', 'unknown']).optional(),
        stale: z.boolean().optional(),
        degradedReasons: z.array(z.string()).optional(),
      }).optional(),
    }).optional(),
  }).optional(),
})

export type StatusPayload = z.infer<typeof StatusPayloadSchema>

export function parseStatusPayload(input: unknown): StatusPayload {
  const parsed = StatusPayloadSchema.safeParse(input)
  if (parsed.success) return parsed.data
  return {}
}
