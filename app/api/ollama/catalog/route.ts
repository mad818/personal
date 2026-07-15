import { NextRequest } from "next/server";
import {
  DEFAULT_LOCAL_MODEL,
  TASK_MODELS,
  type AITask,
} from "@/lib/aiModelRouting";
import {
  listReachableOllamaModels,
  listRunningOllamaModels,
  resolveInstalledOllamaModel,
} from "@/lib/ollamaModelResolver";
import {
  applyRateLimitHeaders,
  checkRateLimit,
} from "@/lib/security/rateLimit";
import { protectedJson } from "@/lib/protectedApi";

export const dynamic = "force-dynamic";

function isAiTask(value: string | null): value is AITask {
  return Boolean(
    value && Object.prototype.hasOwnProperty.call(TASK_MODELS, value),
  );
}

export async function GET(req: NextRequest) {
  const rateLimitConfig = {
    bucket: "api-ollama-catalog",
    windowMs: 10_000,
    maxAttempts: 20,
    includeBearerToken: false,
  } as const;
  const rateLimit = checkRateLimit(req, rateLimitConfig);
  if (!rateLimit.ok) {
    const response = protectedJson(
      { reachable: false, models: [], error: "Ollama catalog rate limited." },
      { status: 429 },
    );
    applyRateLimitHeaders(response, rateLimitConfig, rateLimit.retryAfterSec);
    return response;
  }

  const requestedModel =
    req.nextUrl.searchParams.get("model")?.trim() || DEFAULT_LOCAL_MODEL;
  const taskParam = req.nextUrl.searchParams.get("task");
  const task = isAiTask(taskParam) ? taskParam : "default";
  const [catalog, running, resolution] = await Promise.all([
    listReachableOllamaModels(),
    listRunningOllamaModels(),
    resolveInstalledOllamaModel({
      requestedModel,
      task,
      preferActiveModel: true,
    }),
  ]);

  const response = protectedJson({
    reachable: catalog.reachable || running.reachable,
    tagsUrl: catalog.tagsUrl,
    psUrl: running.psUrl,
    models: catalog.models,
    running: running.models,
    requestedModel: resolution.requestedModel,
    resolvedModel: resolution.resolvedModel,
    resolutionReason: resolution.reason,
    defaultLocalModel: DEFAULT_LOCAL_MODEL,
    taskModels: TASK_MODELS,
  });
  applyRateLimitHeaders(response, rateLimitConfig);
  return response;
}
