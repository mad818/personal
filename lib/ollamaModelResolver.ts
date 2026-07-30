import {
  DEFAULT_LOCAL_MODEL,
  TASK_MODELS,
  type AITask,
} from "@/lib/aiModelRouting";
import {
  normalizeOllamaEndpoint,
  validateOllamaEndpoint,
} from "@/lib/localInferencePosture";

export interface OllamaRuntimeModel {
  name: string;
  model?: string;
  modified_at?: string;
  expires_at?: string;
  details?: {
    family?: string;
  };
}

export interface ResolvedOllamaModel {
  requestedModel: string;
  resolvedModel: string | null;
  reachable: boolean;
  models: OllamaRuntimeModel[];
  activeModels: OllamaRuntimeModel[];
  reason:
    | "active_runtime"
    | "configured"
    | "task_match"
    | "default_match"
    | "recommended_fallback"
    | "newest_installed"
    | "no_models"
    | "unreachable";
}

const DEFAULT_OLLAMA_TAGS_URL = "http://localhost:11434/api/tags";
const DEFAULT_OLLAMA_PS_URL = "http://localhost:11434/api/ps";
const COMMON_FALLBACK_CANDIDATES = [
  "gemma4:latest",
  "gemma4",
  "qwen3.5:9b",
  "qwen3:8b",
  "gemma3:12b",
  "llama3:8b",
  "mistral:7b",
  "phi4:14b",
  "deepseek-r1:14b",
] as const;

function normalizeModelToken(value: string | null | undefined) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function readModelBase(value: string | null | undefined) {
  const normalized = normalizeModelToken(value);
  if (!normalized) return "";
  const lastColon = normalized.lastIndexOf(":");
  return lastColon >= 0 ? normalized.slice(0, lastColon) : normalized;
}

function readModelFamilyToken(value: string | null | undefined) {
  const normalized = normalizeModelToken(value);
  if (!normalized) return "";
  if (normalized.includes("gemma4")) return "gemma4";
  if (normalized.includes("gemma3")) return "gemma3";
  if (normalized.includes("qwen3.5") || normalized.includes("qwen35"))
    return "qwen35";
  if (normalized.includes("qwen")) return "qwen";
  if (normalized.includes("deepseek")) return "deepseek";
  if (normalized.includes("llama")) return "llama";
  if (normalized.includes("mistral")) return "mistral";
  if (normalized.includes("phi")) return "phi";
  return "";
}

function modelMatchesCandidate(model: OllamaRuntimeModel, candidate: string) {
  const candidateNormalized = normalizeModelToken(candidate);
  if (!candidateNormalized) return false;
  const candidateBase = readModelBase(candidateNormalized);
  const candidateFamily = readModelFamilyToken(candidateNormalized);
  const modelName = normalizeModelToken(model.name);
  const modelId = normalizeModelToken(model.model);
  const modelBase = readModelBase(model.name || model.model);
  const modelFamily =
    readModelFamilyToken(model.details?.family) ||
    readModelFamilyToken(model.name) ||
    readModelFamilyToken(model.model);

  if (
    candidateNormalized === modelName ||
    candidateNormalized === modelId ||
    candidateBase === modelBase
  ) {
    return true;
  }

  if (candidateFamily && modelFamily) {
    return candidateFamily === modelFamily;
  }

  return false;
}

function sortNewestFirst(models: OllamaRuntimeModel[]) {
  return [...models].sort((left, right) => {
    const leftTs = Date.parse(left.modified_at ?? "");
    const rightTs = Date.parse(right.modified_at ?? "");
    return (
      (Number.isFinite(rightTs) ? rightTs : 0) -
      (Number.isFinite(leftTs) ? leftTs : 0)
    );
  });
}

function deriveOllamaEndpointUrl(
  endpoint: string | null | undefined,
  pathname: string,
) {
  const normalized = String(endpoint ?? "").trim();
  if (!normalized) {
    return pathname === "/api/ps"
      ? DEFAULT_OLLAMA_PS_URL
      : DEFAULT_OLLAMA_TAGS_URL;
  }
  try {
    const url = normalizeOllamaEndpoint(normalized);
    const parsed = new URL(url);
    parsed.pathname = pathname;
    parsed.search = "";
    parsed.hash = "";
    return parsed.toString();
  } catch {
    return pathname === "/api/ps"
      ? DEFAULT_OLLAMA_PS_URL
      : DEFAULT_OLLAMA_TAGS_URL;
  }
}

export function deriveOllamaTagsUrl(endpoint: string | null | undefined) {
  return deriveOllamaEndpointUrl(endpoint, "/api/tags");
}

export function deriveOllamaPsUrl(endpoint: string | null | undefined) {
  return deriveOllamaEndpointUrl(endpoint, "/api/ps");
}

async function fetchOllamaModelList(
  url: string,
  apiKey?: string | null,
): Promise<{ reachable: boolean; models: OllamaRuntimeModel[] }> {
  try {
    const target = validateOllamaEndpoint(url);
    if (target.pathname !== "/api/tags" && target.pathname !== "/api/ps") {
      return { reachable: false, models: [] };
    }
    if (
      target.protocol !== "http:" ||
      target.port !== "11434" ||
      target.search ||
      target.hash
    ) {
      return { reachable: false, models: [] };
    }
    const requestInit: RequestInit = {
      method: "GET",
      headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : undefined,
      signal: AbortSignal.timeout(3_000),
      redirect: "error",
    };
    let response: Response;
    switch (`${target.hostname}${target.pathname}`) {
      case "localhost/api/tags":
        response = await fetch("http://localhost:11434/api/tags", requestInit);
        break;
      case "localhost/api/ps":
        response = await fetch("http://localhost:11434/api/ps", requestInit);
        break;
      case "127.0.0.1/api/tags":
        response = await fetch("http://127.0.0.1:11434/api/tags", requestInit);
        break;
      case "127.0.0.1/api/ps":
        response = await fetch("http://127.0.0.1:11434/api/ps", requestInit);
        break;
      case "[::1]/api/tags":
        response = await fetch("http://[::1]:11434/api/tags", requestInit);
        break;
      case "[::1]/api/ps":
        response = await fetch("http://[::1]:11434/api/ps", requestInit);
        break;
      default:
        return { reachable: false, models: [] };
    }
    if (!response.ok) {
      return { reachable: false, models: [] };
    }
    const data = (await response.json()) as { models?: OllamaRuntimeModel[] };
    return {
      reachable: true,
      models: Array.isArray(data.models) ? data.models : [],
    };
  } catch {
    return { reachable: false, models: [] };
  }
}

export async function listReachableOllamaModels(options?: {
  endpoint?: string | null;
  apiKey?: string | null;
}): Promise<{
  reachable: boolean;
  models: OllamaRuntimeModel[];
  tagsUrl: string;
}> {
  const tagsUrl = deriveOllamaTagsUrl(options?.endpoint);
  const result = await fetchOllamaModelList(tagsUrl, options?.apiKey);
  return { ...result, tagsUrl };
}

export async function listRunningOllamaModels(options?: {
  endpoint?: string | null;
  apiKey?: string | null;
}): Promise<{
  reachable: boolean;
  models: OllamaRuntimeModel[];
  psUrl: string;
}> {
  const psUrl = deriveOllamaPsUrl(options?.endpoint);
  const result = await fetchOllamaModelList(psUrl, options?.apiKey);
  return { ...result, psUrl };
}

function readPrimaryActiveModel(models: OllamaRuntimeModel[]) {
  return (
    models.find((model) => normalizeModelToken(model.name || model.model)) ??
    null
  );
}

export function shouldPreferActiveOllamaModel(task: string | null | undefined) {
  const normalized = normalizeModelToken(task);
  return (
    !normalized ||
    normalized === "default" ||
    normalized === "chat" ||
    normalized === "fast" ||
    normalized === "research"
  );
}

export function resolveInstalledOllamaModelFromCatalog(options: {
  requestedModel?: string | null;
  task?: AITask | "default" | null;
  models: OllamaRuntimeModel[];
  activeModels?: OllamaRuntimeModel[];
  preferActiveModel?: boolean;
}): ResolvedOllamaModel {
  const requestedModel =
    String(options.requestedModel ?? "").trim() || DEFAULT_LOCAL_MODEL;
  const models = options.models ?? [];
  const activeModels = options.activeModels ?? [];
  const activeRuntimeModel =
    options.preferActiveModel !== false
      ? readPrimaryActiveModel(activeModels)
      : null;
  if (activeRuntimeModel) {
    const resolvedModel =
      activeRuntimeModel.name || activeRuntimeModel.model || null;
    return {
      requestedModel,
      resolvedModel,
      reachable: true,
      models,
      activeModels,
      reason: "active_runtime",
    };
  }

  if (!models.length) {
    return {
      requestedModel,
      resolvedModel: null,
      reachable: true,
      models,
      activeModels,
      reason: "no_models",
    };
  }

  const taskCandidate =
    options.task && options.task !== "default"
      ? TASK_MODELS[options.task as AITask]
      : undefined;
  const candidateOrder = Array.from(
    new Set(
      [
        requestedModel,
        taskCandidate,
        DEFAULT_LOCAL_MODEL,
        TASK_MODELS.chat,
        ...COMMON_FALLBACK_CANDIDATES,
      ].filter((value): value is string => Boolean(value && value.trim())),
    ),
  );

  for (const candidate of candidateOrder) {
    const match = models.find((model) =>
      modelMatchesCandidate(model, candidate),
    );
    if (!match) continue;
    if (candidate === requestedModel) {
      return {
        requestedModel,
        resolvedModel: match.name,
        reachable: true,
        models,
        activeModels,
        reason: "configured",
      };
    }
    if (candidate === taskCandidate) {
      return {
        requestedModel,
        resolvedModel: match.name,
        reachable: true,
        models,
        activeModels,
        reason: "task_match",
      };
    }
    if (candidate === DEFAULT_LOCAL_MODEL || candidate === TASK_MODELS.chat) {
      return {
        requestedModel,
        resolvedModel: match.name,
        reachable: true,
        models,
        activeModels,
        reason: "default_match",
      };
    }
    return {
      requestedModel,
      resolvedModel: match.name,
      reachable: true,
      models,
      activeModels,
      reason: "recommended_fallback",
    };
  }

  const newest = sortNewestFirst(models)[0];
  return {
    requestedModel,
    resolvedModel: newest?.name ?? null,
    reachable: true,
    models,
    activeModels,
    reason: newest ? "newest_installed" : "no_models",
  };
}

export async function resolveInstalledOllamaModel(options: {
  endpoint?: string | null;
  apiKey?: string | null;
  requestedModel?: string | null;
  task?: AITask | "default" | null;
  preferActiveModel?: boolean;
}): Promise<ResolvedOllamaModel> {
  const requestedModel =
    String(options.requestedModel ?? "").trim() || DEFAULT_LOCAL_MODEL;
  const [catalog, running] = await Promise.all([
    listReachableOllamaModels(options),
    listRunningOllamaModels(options),
  ]);
  if (!catalog.reachable && !running.reachable) {
    return {
      requestedModel,
      resolvedModel: null,
      reachable: false,
      models: [],
      activeModels: [],
      reason: "unreachable",
    };
  }
  return resolveInstalledOllamaModelFromCatalog({
    requestedModel,
    task: options.task ?? "default",
    models: catalog.models,
    activeModels: running.models,
    preferActiveModel: options.preferActiveModel,
  });
}

export function isMissingOllamaModelError(value: string | null | undefined) {
  const normalized = normalizeModelToken(value);
  return (
    (normalized.includes("not found") && normalized.includes("model")) ||
    (normalized.includes("not installed") && normalized.includes("model"))
  );
}

export function extractOllamaErrorMessage(
  data: Record<string, unknown> | null | undefined,
  status: number,
) {
  const rawError = data?.error;
  if (typeof rawError === "string" && rawError.trim()) return rawError.trim();
  if (
    rawError &&
    typeof rawError === "object" &&
    typeof (rawError as { message?: unknown }).message === "string" &&
    (rawError as { message?: string }).message?.trim()
  ) {
    return (rawError as { message: string }).message.trim();
  }
  return `Ollama error (HTTP ${status}).`;
}

export function summarizeInstalledOllamaModels(
  models: OllamaRuntimeModel[],
  limit = 4,
) {
  return models
    .map((model) => model.name)
    .filter(Boolean)
    .slice(0, limit)
    .join(", ");
}
