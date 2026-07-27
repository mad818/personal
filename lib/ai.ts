"use client";

// ── AI call wrappers — all Anthropic calls go through /api/ai (server-side key)

import { useStore, DEFAULT_SETTINGS, type Settings } from "@/store/useStore";
import { apiFetch } from "@/lib/apiFetch";
import {
  ANTHROPIC_DEFAULT_CHAT_MODEL,
  MINIMAX_DEFAULT_CHAT_MODEL,
  OPENAI_DEFAULT_CHAT_MODEL,
  TASK_MODELS,
} from "@/lib/aiModelRouting";
import {
  extractOllamaErrorMessage,
  isMissingOllamaModelError,
  resolveInstalledOllamaModel,
  shouldPreferActiveOllamaModel,
} from "@/lib/ollamaModelResolver";
import {
  AI_NO_IMPLICIT_TOOLING_BLOCK,
  AI_EVIDENCE_DISCIPLINE_BLOCK,
  AI_TRUTH_BOUNDARY_BLOCK,
} from "@/lib/aiTruthBoundary";
import {
  FAINIR_READER_CONTRACT_BLOCK,
  YAGNI_AGENT_DIRECTIVE,
} from "@/lib/agentYagniGuardrails";
import {
  normalizePreferredAIProvider,
  resolveApiAIProvider,
} from "@/lib/aiProviderPreference";
import { NEXUS_AGENT_NO_BILLING_RULE } from "@/lib/productGuarantees";
import { readPrivacyShieldStatusFromHeaders } from "@/lib/privacyShieldClient";
import {
  getNavProductSurfaces,
  summarizeSurfaceTiers,
} from "@/lib/releaseMatrix";
import { buildPersonalAIProfilePromptBlock } from "@/lib/personalAIProfile";

function getSettings(): Settings {
  // BUG-04 fix: read from the in-memory Zustand store, not localStorage.
  // localStorage is only updated at persist intervals and can be stale by
  // several seconds when settings change while an AI call is in flight.
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const settings = useStore.getState().settings ?? DEFAULT_SETTINGS;
    return {
      ...DEFAULT_SETTINGS,
      ...settings,
      aiProvider: normalizePreferredAIProvider(settings.aiProvider),
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function syncPrivacyShieldStatus(response: Response) {
  try {
    useStore
      .getState()
      .setPrivacyShieldStatus(readPrivacyShieldStatusFromHeaders(response));
  } catch {
    // local posture only
  }
}

function aiReady(s: Settings): boolean {
  if (resolveApiAIProvider(normalizePreferredAIProvider(s.aiProvider)))
    return true;
  // Local Ollama — needs endpoint + model
  if (s.localEndpoint && s.localModel) return true;
  return false;
}

function readServerRoutedProvider(settings: Settings) {
  return resolveApiAIProvider(
    normalizePreferredAIProvider(settings.aiProvider),
  );
}

function readServerRoutedModel(
  provider: ReturnType<typeof readServerRoutedProvider>,
) {
  switch (provider) {
    case "anthropic":
      return ANTHROPIC_DEFAULT_CHAT_MODEL;
    case "minimax":
      return MINIMAX_DEFAULT_CHAT_MODEL;
    case "openai":
      return OPENAI_DEFAULT_CHAT_MODEL;
    default:
      return undefined;
  }
}

const NON_INTERACTIVE_SINGLE_FLIGHT = new Map<
  string,
  Promise<NonInteractiveAIResult>
>();
const SYSTEM_PROMPT_CACHE = new Map<string, string>();

export interface NonInteractivePromptParts {
  cacheablePrefix?: string;
  volatilePrompt: string;
  fullPrompt: string;
  cacheStrategy: "system_only" | "system_plus_user_prefix";
}

export interface NonInteractiveCallMeta {
  provider?: string;
  model?: string;
  cacheObserved: boolean;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  cacheHit: boolean;
}

export interface NonInteractiveBatchItem {
  id: string;
  name: string;
  prompt: string;
}

export interface NonInteractiveAIResult {
  content: string;
  meta: NonInteractiveCallMeta;
}

export interface NonInteractiveBatchResult {
  id: string;
  status: "ok" | "error";
  content: string;
}

export interface NonInteractiveBatchResponse {
  results: NonInteractiveBatchResult[];
  meta: NonInteractiveCallMeta;
}

export interface NativeAnthropicBatchSubmission {
  batchId: string;
  provider: "anthropic";
  model?: string;
  processingStatus: string;
  requestCount: number;
}

export interface NativeAnthropicBatchPollResult {
  batchId: string;
  provider: "anthropic";
  model?: string;
  processingStatus: string;
  requestCount: number;
  results: NonInteractiveBatchResult[];
}

export interface NativeAnthropicBatchPosture {
  provider: "anthropic";
  nativeReady: boolean;
  mode: "provider_native" | "internal_fallback";
  featureEnabled: boolean;
  paidApisAllowed: boolean;
  apiKeyConfigured: boolean;
  reason: string;
}

function stableHash(input: string): string {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function buildPromptProfileSignature(s: Settings, liveContext: string) {
  return JSON.stringify({
    userName: s.userName,
    userGoals: s.userGoals,
    userSkills: s.userSkills,
    userLearning: s.userLearning,
    userContext: s.userContext,
    deploymentLanePreference: s.deploymentLanePreference,
    surfaceVisibilityPreference: s.surfaceVisibilityPreference,
    liveContextHash: stableHash(liveContext),
  });
}

export function buildCachedSystemPrompt(s: Settings, liveContext = ""): string {
  const key = buildPromptProfileSignature(s, liveContext);
  const cached = SYSTEM_PROMPT_CACHE.get(key);
  if (cached) return cached;
  const prompt = buildSystemPrompt(s, liveContext);
  SYSTEM_PROMPT_CACHE.set(key, prompt);
  return prompt;
}

export function buildDirectCallSystemPrompt(s: Settings): string {
  const name = s.userName || "Mario";
  return `You are Homefront AI — ${name}'s direct analysis and drafting lane.

${NEXUS_AGENT_NO_BILLING_RULE}

This is a direct completion path. You do not automatically have tool execution, browsing, live file access, or verified current-world context unless the prompt explicitly includes it.

${AI_TRUTH_BOUNDARY_BLOCK}

${AI_NO_IMPLICIT_TOOLING_BLOCK}

${AI_EVIDENCE_DISCIPLINE_BLOCK}${buildPersonalAIProfilePromptBlock(s)}`;
}

export function buildScheduledMissionPromptParts(
  operationalPrefix: string,
  jobPrompt: string,
): NonInteractivePromptParts {
  const prefix = `${operationalPrefix.trim()}\n\n[Scheduled Task]\n`;
  const volatilePrompt = jobPrompt.trim();
  return {
    cacheablePrefix: prefix,
    volatilePrompt,
    fullPrompt: `${prefix}${volatilePrompt}`,
    cacheStrategy: "system_plus_user_prefix",
  };
}

export function buildScheduledMissionSingleFlightKey(input: {
  systemPrompt: string;
  cacheablePrefix?: string;
  volatilePrompt: string;
  timeWindowMs?: number;
}): string {
  const {
    systemPrompt,
    cacheablePrefix = "",
    volatilePrompt,
    timeWindowMs = 60_000,
  } = input;
  const windowBucket = Math.floor(Date.now() / Math.max(1, timeWindowMs));
  return `scheduled:${windowBucket}:${stableHash(
    `${systemPrompt}\n${cacheablePrefix}\n${volatilePrompt}`,
  )}`;
}

function readNonInteractiveMeta(res: Response): NonInteractiveCallMeta {
  const cacheReadTokens = Number(res.headers.get("X-Cache-Read-Tokens") ?? 0);
  const cacheWriteTokens = Number(res.headers.get("X-Cache-Write-Tokens") ?? 0);
  const cacheObserved = res.headers.get("X-Cache-Observed") === "true";
  return {
    provider: res.headers.get("X-Provider") ?? undefined,
    model: res.headers.get("X-Model") ?? undefined,
    cacheObserved,
    cacheReadTokens: Number.isFinite(cacheReadTokens) ? cacheReadTokens : 0,
    cacheWriteTokens: Number.isFinite(cacheWriteTokens) ? cacheWriteTokens : 0,
    cacheHit: res.headers.get("X-Cache-Hit") === "true",
  };
}

export function buildNonInteractiveBatchPrompt(
  items: NonInteractiveBatchItem[],
): string {
  const manifest = items
    .map(
      (item, index) =>
        `## Mission ${index + 1}\nid: ${item.id}\nname: ${item.name}\nprompt:\n${item.prompt.trim()}`,
    )
    .join("\n\n");

  return [
    "Process each mission independently and return ONLY valid JSON.",
    'Return an array where every item matches this exact shape: {"id":"string","status":"ok|error","content":"string"}',
    "Do not omit any mission. Keep each content concise, operator-grade, and specific to that mission only.",
    'If a mission cannot be completed, still return its id with status="error" and a brief explanation in content.',
    "",
    manifest,
  ].join("\n");
}

function extractJsonPayload(raw: string): string {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return fenced[1].trim();
  const arrayStart = trimmed.indexOf("[");
  const arrayEnd = trimmed.lastIndexOf("]");
  if (arrayStart >= 0 && arrayEnd > arrayStart) {
    return trimmed.slice(arrayStart, arrayEnd + 1);
  }
  return trimmed;
}

export async function callNonInteractiveAIBatch(opts: {
  systemPrompt: string;
  items: NonInteractiveBatchItem[];
  maxTokens?: number;
  task?: string;
  singleFlightKey?: string;
  promptParts?: NonInteractivePromptParts;
}): Promise<NonInteractiveBatchResponse> {
  const {
    systemPrompt,
    items,
    maxTokens = 900,
    task = "fast",
    singleFlightKey,
    promptParts,
  } = opts;
  const userPrompt =
    promptParts?.fullPrompt ?? buildNonInteractiveBatchPrompt(items);
  const raw = await callNonInteractiveAIWithMeta({
    systemPrompt,
    userPrompt,
    maxTokens,
    task,
    singleFlightKey,
    promptParts,
  });
  const parsed = JSON.parse(extractJsonPayload(raw.content)) as unknown;
  if (!Array.isArray(parsed)) {
    throw new Error("Batch response did not return a JSON array.");
  }
  const results = parsed
    .filter(
      (item): item is Record<string, unknown> =>
        typeof item === "object" && item !== null,
    )
    .map<NonInteractiveBatchResult>((item) => ({
      id: String(item.id ?? "").trim(),
      status: item.status === "error" ? "error" : "ok",
      content: String(item.content ?? "").trim(),
    }))
    .filter((item) => item.id.length > 0);
  if (results.length !== items.length) {
    throw new Error("Batch response did not include every scheduled mission.");
  }
  return {
    results,
    meta: raw.meta,
  };
}

export async function submitAnthropicNativeBatch(opts: {
  systemPrompt: string;
  sharedPrefix?: string;
  items: NonInteractiveBatchItem[];
  maxTokens?: number;
}): Promise<NativeAnthropicBatchSubmission> {
  const res = await apiFetch("/api/ai/batches", {
    method: "POST",
    body: JSON.stringify({
      provider: "anthropic",
      system: opts.systemPrompt,
      sharedPrefix: opts.sharedPrefix ?? "",
      items: opts.items,
      max_tokens: opts.maxTokens ?? 900,
    }),
  });
  const data = (await res.json()) as {
    error?: unknown;
    batchId?: unknown;
    provider?: unknown;
    model?: unknown;
    processingStatus?: unknown;
    requestCount?: unknown;
  };
  if (!res.ok) {
    throw new Error(
      typeof data.error === "string"
        ? data.error
        : `Native Anthropic batch submit failed (${res.status}).`,
    );
  }
  return {
    batchId: String(data.batchId ?? "").trim(),
    provider: "anthropic",
    model: typeof data.model === "string" ? data.model : undefined,
    processingStatus: String(data.processingStatus ?? "unknown"),
    requestCount: Math.max(
      0,
      Number(data.requestCount ?? opts.items.length) || 0,
    ),
  };
}

export async function pollAnthropicNativeBatch(
  batchId: string,
): Promise<NativeAnthropicBatchPollResult> {
  const res = await apiFetch(`/api/ai/batches/${encodeURIComponent(batchId)}`, {
    method: "GET",
  });
  const data = (await res.json()) as {
    error?: unknown;
    batchId?: unknown;
    provider?: unknown;
    model?: unknown;
    processingStatus?: unknown;
    requestCount?: unknown;
    results?: unknown;
  };
  if (!res.ok) {
    throw new Error(
      typeof data.error === "string"
        ? data.error
        : `Native Anthropic batch poll failed (${res.status}).`,
    );
  }
  const results = Array.isArray(data.results)
    ? data.results
        .filter(
          (
            item,
          ): item is { id?: unknown; status?: unknown; content?: unknown } =>
            typeof item === "object" && item !== null,
        )
        .map<NonInteractiveBatchResult>((item) => ({
          id: String(item.id ?? "").trim(),
          status: item.status === "error" ? "error" : "ok",
          content: String(item.content ?? "").trim(),
        }))
        .filter((item) => item.id.length > 0)
    : [];

  return {
    batchId: String(data.batchId ?? batchId).trim(),
    provider: "anthropic",
    model: typeof data.model === "string" ? data.model : undefined,
    processingStatus: String(data.processingStatus ?? "unknown"),
    requestCount: Math.max(0, Number(data.requestCount ?? results.length) || 0),
    results,
  };
}

export async function readAnthropicNativeBatchPosture(): Promise<NativeAnthropicBatchPosture> {
  const res = await apiFetch("/api/ai/batches", {
    method: "GET",
  });
  const data = (await res.json()) as {
    error?: unknown;
    provider?: unknown;
    nativeReady?: unknown;
    mode?: unknown;
    featureEnabled?: unknown;
    paidApisAllowed?: unknown;
    apiKeyConfigured?: unknown;
    reason?: unknown;
  };
  if (!res.ok) {
    throw new Error(
      typeof data.error === "string"
        ? data.error
        : `Native Anthropic batch posture failed (${res.status}).`,
    );
  }
  return {
    provider: "anthropic",
    nativeReady: data.nativeReady === true,
    mode:
      data.mode === "provider_native" ? "provider_native" : "internal_fallback",
    featureEnabled: data.featureEnabled === true,
    paidApisAllowed: data.paidApisAllowed === true,
    apiKeyConfigured: data.apiKeyConfigured === true,
    reason:
      typeof data.reason === "string"
        ? data.reason
        : "Native batch posture unavailable.",
  };
}

// ── Streaming helper ──────────────────────────────────────────────────────────
async function streamRequest(
  url: string,
  headers: Record<string, string>,
  body: object,
  onChunk: (text: string) => void,
  useApiFetch = false,
): Promise<string> {
  let full = "";
  const res = useApiFetch
    ? await apiFetch(url, { method: "POST", body: JSON.stringify(body) })
    : await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify(body),
      });
  syncPrivacyShieldStatus(res);
  if (!res.ok) throw new Error(`API ${res.status}`);
  // BUG-02 fix: guard against null body (204 No Content or empty response)
  // instead of crashing with the non-null assertion operator.
  if (!res.body) return full;
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    for (const line of chunk.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const data = trimmed.slice(5).trim();
      if (data === "[DONE]") continue;
      try {
        const json = JSON.parse(data);
        const text =
          json.choices?.[0]?.delta?.content ?? json.delta?.text ?? "";
        if (text) {
          full += text;
          onChunk(text);
        }
      } catch {
        /* skip malformed */
      }
    }
  }
  return full;
}

async function callLocalModel(
  s: Settings,
  body: {
    max_tokens: number;
    messages: { role: string; content: string }[];
    task?: string;
    secondBrainMode?:
      | "off"
      | "auto"
      | "file-first"
      | "human-editor"
      | "night-shift";
  },
) {
  const requestedModel = body.task
    ? (TASK_MODELS[body.task as keyof typeof TASK_MODELS] ?? s.localModel)
    : s.localModel;
  const preferRunningModel = shouldPreferActiveOllamaModel(
    body.task ?? "default",
  );
  try {
    const res = await apiFetch("/api/ai", {
      method: "POST",
      body: JSON.stringify({
        provider: "ollama",
        model: requestedModel,
        max_tokens: body.max_tokens,
        messages: body.messages,
        preferRunningModel,
        ...(body.task ? { task: body.task } : {}),
        ...(body.secondBrainMode
          ? { secondBrainMode: body.secondBrainMode }
          : {}),
        ...(s.localEndpoint ? { localEndpoint: s.localEndpoint } : {}),
        ...(s.localApiKey ? { localApiKey: s.localApiKey } : {}),
      }),
    });
    const data = (await res.json().catch(() => null)) as Record<
      string,
      unknown
    > | null;
    syncPrivacyShieldStatus(res);
    if (!res.ok) {
      return "";
    }
    const activeModel = res.headers.get("X-Model")?.trim();
    if (
      activeModel &&
      requestedModel === s.localModel &&
      activeModel !== s.localModel
    ) {
      useStore.getState().updateSettings({
        localModel: activeModel,
      } as Partial<Settings>);
    }
    return (
      (data as { choices?: { message?: { content?: string } }[] })?.choices?.[0]
        ?.message?.content ?? ""
    );
  } catch {
    return "";
  }
}

export const __aiTestUtils = {
  stableHash,
  callLocalModel,
};

// ── Main AI call (non-streaming) ──────────────────────────────────────────────
interface DirectAiRequestOptions {
  systemPrompt: string;
  messages: { role: string; content: string }[];
  maxTokens?: number;
  task?: string;
  provider?: string;
  model?: string;
  secondBrainMode?:
    | "off"
    | "auto"
    | "file-first"
    | "human-editor"
    | "night-shift";
}

async function callAIInternal(opts: DirectAiRequestOptions): Promise<string> {
  const s = getSettings();
  if (!aiReady(s)) throw new Error("No AI configured");

  const cloudProvider = opts.provider ?? readServerRoutedProvider(s);
  if (cloudProvider) {
    const cloudModel =
      opts.model ??
      (cloudProvider === "anthropic" ||
      cloudProvider === "minimax" ||
      cloudProvider === "openai"
        ? readServerRoutedModel(cloudProvider)
        : undefined);
    const res = await apiFetch("/api/ai", {
      method: "POST",
      body: JSON.stringify({
        provider: cloudProvider,
        ...(cloudModel ? { model: cloudModel } : {}),
        max_tokens: opts.maxTokens ?? 1024,
        system: opts.systemPrompt,
        messages: opts.messages,
        ...(opts.task ? { task: opts.task } : {}),
        ...(opts.secondBrainMode
          ? { secondBrainMode: opts.secondBrainMode }
          : {}),
      }),
    });
    syncPrivacyShieldStatus(res);
    const data = await res.json();
    if (!res.ok) {
      if (s.localEndpoint && s.localModel) {
        return callLocalModel(s, {
          max_tokens: opts.maxTokens ?? 1024,
          messages: opts.systemPrompt
            ? [{ role: "system", content: opts.systemPrompt }, ...opts.messages]
            : opts.messages,
          task: opts.task,
          secondBrainMode: opts.secondBrainMode,
        });
      }
      throw new Error(data?.error?.message ?? `API error ${res.status}`);
    }
    return data.content?.[0]?.text ?? data.choices?.[0]?.message?.content ?? "";
  }

  return callLocalModel(s, {
    max_tokens: opts.maxTokens ?? 1024,
    messages: opts.systemPrompt
      ? [{ role: "system", content: opts.systemPrompt }, ...opts.messages]
      : opts.messages,
    task: opts.task,
    secondBrainMode: opts.secondBrainMode,
  });
}

export async function callAI(
  prompt: string,
  maxTokens = 1024,
  task?: string,
): Promise<string> {
  return callAIInternal({
    systemPrompt: buildDirectCallSystemPrompt(getSettings()),
    messages: [{ role: "user", content: prompt }],
    maxTokens,
    task,
  });
}

export async function callAIWithSystemPrompt(
  opts: DirectAiRequestOptions,
): Promise<string> {
  return callAIInternal(opts);
}

async function callNonInteractiveAIInternal(opts: {
  systemPrompt: string;
  userPrompt: string;
  maxTokens?: number;
  task?: string;
  singleFlightKey?: string;
  promptParts?: NonInteractivePromptParts;
  secondBrainMode?:
    | "off"
    | "auto"
    | "file-first"
    | "human-editor"
    | "night-shift";
}): Promise<NonInteractiveAIResult> {
  const {
    systemPrompt,
    userPrompt,
    maxTokens = 300,
    task = "fast",
    singleFlightKey,
    promptParts,
    secondBrainMode,
  } = opts;
  const existing = singleFlightKey
    ? NON_INTERACTIVE_SINGLE_FLIGHT.get(singleFlightKey)
    : null;
  if (existing) {
    return existing.then((result) => ({
      content: result.content,
      meta: result.meta,
    }));
  }

  const run = async () => {
    const s = getSettings();
    if (!aiReady(s)) throw new Error("No AI configured");

    const cloudProvider = readServerRoutedProvider(s);
    if (cloudProvider) {
      const cloudModel = readServerRoutedModel(cloudProvider);
      const anthropicMessages =
        cloudProvider === "anthropic" &&
        promptParts?.cacheStrategy === "system_plus_user_prefix" &&
        promptParts.cacheablePrefix
          ? [
              {
                role: "user",
                content: [
                  {
                    type: "text",
                    text: promptParts.cacheablePrefix,
                    cache_control: { type: "ephemeral" as const },
                  },
                  {
                    type: "text",
                    text: promptParts.volatilePrompt,
                  },
                ],
              },
            ]
          : [{ role: "user", content: userPrompt }];
      const res = await apiFetch("/api/ai", {
        method: "POST",
        body: JSON.stringify({
          provider: cloudProvider,
          ...(cloudModel ? { model: cloudModel } : {}),
          max_tokens: maxTokens,
          system: systemPrompt,
          messages: anthropicMessages,
          task,
          non_interactive: true,
          secondBrainMode,
        }),
      });
      syncPrivacyShieldStatus(res);
      const data = await res.json();
      if (!res.ok) {
        if (s.localEndpoint && s.localModel) {
          const content = await callLocalModel(s, {
            max_tokens: maxTokens,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
            task,
            secondBrainMode,
          });
          return {
            content,
            meta: {
              cacheObserved: false,
              cacheReadTokens: 0,
              cacheWriteTokens: 0,
              cacheHit: false,
            },
          };
        }
        throw new Error(data?.error?.message ?? `API error ${res.status}`);
      }
      return {
        content:
          data.content?.[0]?.text ?? data.choices?.[0]?.message?.content ?? "",
        meta: readNonInteractiveMeta(res),
      };
    }

    const content = await callLocalModel(s, {
      max_tokens: maxTokens,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      task,
      secondBrainMode,
    });
    return {
      content,
      meta: {
        cacheObserved: false,
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
        cacheHit: false,
      },
    };
  };

  const promise = run().finally(() => {
    if (singleFlightKey) NON_INTERACTIVE_SINGLE_FLIGHT.delete(singleFlightKey);
  });
  if (singleFlightKey)
    NON_INTERACTIVE_SINGLE_FLIGHT.set(singleFlightKey, promise);
  return promise;
}

export async function callNonInteractiveAI(opts: {
  systemPrompt: string;
  userPrompt: string;
  maxTokens?: number;
  task?: string;
  singleFlightKey?: string;
  promptParts?: NonInteractivePromptParts;
  secondBrainMode?:
    | "off"
    | "auto"
    | "file-first"
    | "human-editor"
    | "night-shift";
}): Promise<string> {
  const result = await callNonInteractiveAIInternal(opts);
  return result.content;
}

export async function callNonInteractiveAIWithMeta(opts: {
  systemPrompt: string;
  userPrompt: string;
  maxTokens?: number;
  task?: string;
  singleFlightKey?: string;
  promptParts?: NonInteractivePromptParts;
  secondBrainMode?:
    | "off"
    | "auto"
    | "file-first"
    | "human-editor"
    | "night-shift";
}): Promise<NonInteractiveAIResult> {
  return callNonInteractiveAIInternal(opts);
}

// ── Streaming AI call ─────────────────────────────────────────────────────────
export async function streamAI(
  messages: { role: string; content: string }[],
  systemPrompt: string,
  onChunk: (text: string) => void,
  maxTokens = 1024,
  task?: string,
): Promise<string> {
  const s = getSettings();
  if (!aiReady(s)) throw new Error("No AI configured");

  const cloudProvider = readServerRoutedProvider(s);
  if (cloudProvider) {
    const cloudModel = readServerRoutedModel(cloudProvider);
    return streamRequest(
      "/api/ai",
      {},
      {
        provider: cloudProvider,
        ...(cloudModel ? { model: cloudModel } : {}),
        max_tokens: maxTokens,
        system: systemPrompt,
        messages,
        stream: true,
        ...(task ? { task } : {}),
      },
      onChunk,
      true, // use apiFetch
    );
  }

  // Local Ollama via same-origin proxy — avoids browser CORS failures against localhost.
  const requestedModel = task
    ? (TASK_MODELS[task as keyof typeof TASK_MODELS] ?? s.localModel)
    : s.localModel;
  return streamRequest(
    "/api/ai",
    {},
    {
      provider: "ollama",
      model: requestedModel,
      max_tokens: maxTokens,
      messages: [{ role: "system", content: systemPrompt }, ...messages],
      stream: true,
      preferRunningModel: shouldPreferActiveOllamaModel(task ?? "default"),
      ...(task ? { task } : {}),
      ...(s.localEndpoint ? { localEndpoint: s.localEndpoint } : {}),
      ...(s.localApiKey ? { localApiKey: s.localApiKey } : {}),
    },
    onChunk,
    true,
  );
}

// ── Streaming AI with reasoning trace (DeepSeek R1 / any <think> model) ───────
// Splits the stream at <think>…</think> boundaries:
//   onThink(text) — called for every thinking token (show as grey trace)
//   onChunk(text) — called for every answer token (show as normal response)
// Falls back gracefully: if localEndpoint is not set, routes to /api/ai.
export async function streamAIWithThinking(
  messages: { role: string; content: string }[],
  systemPrompt: string,
  onThink: (text: string) => void,
  onChunk: (text: string) => void,
  maxTokens = 3000,
): Promise<{ thinking: string; answer: string }> {
  const s = getSettings();

  let thinking = "";
  let answer = "";
  let inThink = false;
  let buf = "";

  // Incrementally parse <think>…</think> tags as chunks arrive
  const handleToken = (token: string) => {
    buf += token;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      if (!inThink) {
        const start = buf.indexOf("<think>");
        if (start === -1) {
          // No open tag visible — flush all but last 6 chars (partial tag guard)
          const safe = buf.length > 6 ? buf.slice(0, buf.length - 6) : "";
          if (safe) {
            answer += safe;
            onChunk(safe);
            buf = buf.slice(safe.length);
          }
          break;
        }
        // Flush any content before <think> as answer
        if (start > 0) {
          const pre = buf.slice(0, start);
          answer += pre;
          onChunk(pre);
        }
        buf = buf.slice(start + 7); // consume '<think>'
        inThink = true;
      } else {
        const end = buf.indexOf("</think>");
        if (end === -1) {
          // Still inside think block — flush all but last 8 chars
          const safe = buf.length > 8 ? buf.slice(0, buf.length - 8) : "";
          if (safe) {
            thinking += safe;
            onThink(safe);
            buf = buf.slice(safe.length);
          }
          break;
        }
        const chunk = buf.slice(0, end);
        if (chunk) {
          thinking += chunk;
          onThink(chunk);
        }
        buf = buf.slice(end + 8); // consume '</think>'
        inThink = false;
      }
    }
  };

  if (s.localEndpoint) {
    // Same-origin Ollama proxy — avoids browser CORS failures against localhost.
    await streamRequest(
      "/api/ai",
      {},
      {
        provider: "ollama",
        model: TASK_MODELS.reasoning,
        max_tokens: maxTokens,
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        stream: true,
        task: "reasoning",
        preferRunningModel: false,
        ...(s.localEndpoint ? { localEndpoint: s.localEndpoint } : {}),
        ...(s.localApiKey ? { localApiKey: s.localApiKey } : {}),
      },
      handleToken,
      true,
    );
  } else {
    // Cloud fallback — Claude via /api/ai (no <think> blocks, onThink unused)
    await streamRequest(
      "/api/ai",
      {},
      {
        provider: "anthropic",
        model: ANTHROPIC_DEFAULT_CHAT_MODEL,
        max_tokens: maxTokens,
        system: systemPrompt,
        messages,
        stream: true,
        task: "reasoning",
      },
      handleToken,
      true,
    );
  }

  // Flush leftover buffer
  if (buf) {
    if (inThink) {
      thinking += buf;
      onThink(buf);
    } else {
      answer += buf;
      onChunk(buf);
    }
  }

  return { thinking, answer };
}

// ── System prompt builder ─────────────────────────────────────────────────────
// liveContext is an optional pre-built block from lib/liveContext.ts.
// When provided, agents reason from live dashboard data instead of stale memory.
export function buildSystemPrompt(s: Settings, liveContext = ""): string {
  const name = s.userName || "Mario";
  const supportedTabs = getNavProductSurfaces()
    .map((surface) => surface.href.replace("/", ""))
    .join(", ");
  const surfaceSummary = summarizeSurfaceTiers().counts;
  const profile = buildPersonalAIProfilePromptBlock(s);
  return `You are Homefront AI — ${name}'s personal intelligence system, advisor, and developer agent. You are direct, sharp, and technical. You adapt to whatever ${name} needs: market analysis, research, trading signals, or coding and editing the Homefront website itself.

${NEXUS_AGENT_NO_BILLING_RULE}

You have full access to the Homefront project source code through these tools:
- list_project_files(directory) — explore the project structure
- read_project_file(path, focus?, chunk?) — read exact small files or bounded semantic context from large files before editing
- patch_project_file(path, old_string, new_string) — make targeted edits to components, pages, or library files
- fetch_url('/api/project') — read the canonical context spine (AGENTS, SYSTEM_STATE, STANDARDS, PROJECT_BIBLE)
- list_design_skills(query?, category?, family?, availability?, limit?) — find an active non-game builder procedure
- resolve_design_skill(skill) — load its complete requirements, inputs, workflow, guardrails, and acceptance checks before relevant design, capture, support, media, performance, motion, WebGL, or UI-detail work

Project structure:
- app/ — Next.js routes. Supported GA tabs this cycle: ${supportedTabs}
- components/ — UI components grouped by tab
- lib/ — utilities (agent.ts, ai.ts, liveContext.ts, helpers.ts, etc.)
- store/useStore.ts — all global state (Zustand)
- public/ — static assets

Surface policy:
- Supported nav surface: 7 GA tabs only (HQ, COMMAND, INTEL, ALPHA, CYBER, RECON, VAULT)
- Additional routes exist in the repo as beta/internal surfaces and must not be treated as launch-critical by default
- Current counts: ${surfaceSummary.ga} ga / ${surfaceSummary.beta} beta / ${surfaceSummary.internal} internal

Rules for editing:
1. Always read_project_file before patching — never guess at the current content
2. Use list_project_files to find the right file first
3. Make small targeted patches — one logical change at a time
4. After patching, confirm what changed and what the user should see in the browser

Reasoning standard — operate like a senior analyst:
- When answering about markets, lead with the live numbers you can see right now
- When researching, search → read sources → synthesize with citations (Perplexity style)
- When coding, read the file first, understand context, then patch surgically
- Never give generic answers when live data is available — use it

  ${AI_TRUTH_BOUNDARY_BLOCK}

${AI_EVIDENCE_DISCIPLINE_BLOCK}

${FAINIR_READER_CONTRACT_BLOCK}

${YAGNI_AGENT_DIRECTIVE}${profile}${liveContext}`;
}
