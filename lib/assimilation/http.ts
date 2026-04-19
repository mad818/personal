import type { ZodSchema } from "zod";
import type { NextRequest } from "next/server";
import {
  applyRateLimitHeaders,
  checkRateLimit,
  type RateLimitConfig,
} from "@/lib/security/rateLimit";
import {
  flattenZodIssues,
  simulationLabel,
  type FlattenedZodIssue,
  type InternalWorkbenchMeta,
  type WorkbenchSimulationMode,
} from "@/lib/assimilation/contracts";
import { protectedJson } from "@/lib/protectedApi";

export type InternalWorkbenchSurface =
  | "workflow-forge"
  | "workflow-runs"
  | "registry-console"
  | "blacksite-lab"
  | "security-doctrine"
  | "sweep-engine"
  | "geo-delta";

export function createWorkbenchMeta(opts: {
  surface: InternalWorkbenchSurface;
  simulation: WorkbenchSimulationMode;
  warnings?: string[];
}): InternalWorkbenchMeta {
  return {
    support: "internal",
    surface: opts.surface,
    storage: "local-file",
    validation: "zod",
    simulation: {
      mode: opts.simulation,
      label: simulationLabel(opts.simulation),
    },
    warnings: opts.warnings ?? [],
    timestamp: Date.now(),
  };
}

export function workbenchJson<T extends Record<string, unknown>>(
  meta: InternalWorkbenchMeta,
  payload: T,
  init?: ResponseInit,
) {
  return protectedJson({ meta, ...payload }, init);
}

export function workbenchError(
  meta: InternalWorkbenchMeta,
  init: {
    status: number;
    code: "invalid_request" | "not_found" | "rate_limited" | "internal_error";
    message: string;
    issues?: FlattenedZodIssue[];
  },
) {
  return protectedJson(
    {
      meta,
      error: {
        code: init.code,
        message: init.message,
        issues: init.issues ?? [],
      },
    },
    { status: init.status },
  );
}

export function applyWorkbenchRateLimit(
  req: NextRequest,
  config: RateLimitConfig,
  meta: InternalWorkbenchMeta,
) {
  const state = checkRateLimit(req, config);
  if (state.ok) return null;

  const response = workbenchError(meta, {
    status: 429,
    code: "rate_limited",
    message: "Too many requests for this internal workbench route.",
  });
  applyRateLimitHeaders(response, config, state.retryAfterSec);
  return response;
}

export function parseWorkbenchPayload<T>(
  schema: ZodSchema<T>,
  payload: unknown,
  meta: InternalWorkbenchMeta,
) {
  const result = schema.safeParse(payload);
  if (result.success) return { ok: true as const, data: result.data };
  return {
    ok: false as const,
    response: workbenchError(meta, {
      status: 400,
      code: "invalid_request",
      message: "Request payload failed validation.",
      issues: flattenZodIssues(result.error),
    }),
  };
}
