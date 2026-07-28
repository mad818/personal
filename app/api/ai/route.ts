// ── api/ai ──────────────────────────────────────────────────
// Multi-provider AI proxy: Ollama fallback chain, task-based model routing, hard token caps.

import { NextRequest, NextResponse } from "next/server";
import {
  DEFAULT_LOCAL_MODEL,
  MINIMAX_DEFAULT_CHAT_MODEL,
  TASK_MODELS,
  type AITask,
} from "@/lib/aiModelRouting";
import { resolveInstalledOllamaModel } from "@/lib/ollamaModelResolver";
import { BRAND_NAME } from "@/lib/brand";
import {
  applyRateLimitHeaders,
  checkRateLimit,
} from "@/lib/security/rateLimit";
import { resolvePhoneSessionAiPolicy } from "@/lib/security/phoneSessionPolicy";
import {
  applyPrivacyShieldHeaders,
  protectCloudBoundPayload,
} from "@/lib/privacyShieldServer";
import { readProtectedActionContext } from "@/lib/security/toolCapabilityPolicy";
import {
  readLocalAccelerationConfig,
  validateLocalAccelerationEndpoint,
} from "@/lib/localAcceleration";
import {
  normalizeOllamaEndpoint,
  resolveProviderChainForTask,
} from "@/lib/localInferencePosture";
import {
  appendSecondBrainSystemPrompt,
  buildSecondBrainSystemBlock,
  isSecondBrainModeReady,
  resolveSecondBrainMode,
} from "@/lib/secondBrain";
import { readAzureOpenAIConfig } from "@/lib/azureOpenAI";

/**
 * Multi-provider AI proxy with task-based model routing.
 *
 * Fallback chain (auto mode): Ollama → Groq → OpenRouter → Google → MiniMax → Anthropic → Azure → OpenAI
 * Research chain: Anthropic → Azure → OpenRouter → Groq → MiniMax → Ollama → OpenAI
 *
 * Task routing maps task hints to the optimal local Ollama model:
 *   chat      → qwen3:8b             (fast, general purpose)
 *   code      → qwen2.5-coder:14b    (code-optimized)
 *   vision    → gemma3:12b           (multimodal)
 *   reasoning → deepseek-r1:14b      (deep reasoning)
 *   fast      → qwen3:8b             (lowest latency)
 *   research  → cloud-first chain    (claude opus for depth)
 *   embed     → nomic-embed-text     (embeddings)
 *
 * Security guarantees:
 *  - All API keys live in process.env only — never touch the browser
 *  - Hard max_tokens cap enforced server-side
 *  - Provider whitelist — only known providers accepted
 *
 * Response headers:
 *  X-Provider — which provider actually responded
 *  X-Model    — which model was used
 */

// ── Token budget ───────────────────────────────────────────────────────────────
const MAX_TOKENS_PER_REQUEST = Math.min(
  parseInt(process.env.NEXUS_MAX_TOKENS ?? "2048", 10),
  8192,
);

// ── Task → local Ollama model map ─────────────────────────────────────────────
// ── Provider registry ─────────────────────────────────────────────────────────
interface Provider {
  name: string;
  url: string;
  key: () => string;
  format: "anthropic" | "openai";
  model: string;
  headers: (key: string) => Record<string, string>;
}

const PROVIDERS: Record<string, Provider> = {
  ollama: {
    name: "ollama",
    url:
      process.env.OLLAMA_ENDPOINT ??
      "http://localhost:11434/v1/chat/completions",
    key: () => process.env.OLLAMA_API_KEY ?? "ollama",
    format: "openai",
    model: DEFAULT_LOCAL_MODEL,
    headers: (key) => ({
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    }),
  },
  turboquant: {
    name: "turboquant",
    url: readLocalAccelerationConfig().turboQuant.openAiEndpoint,
    key: () =>
      readLocalAccelerationConfig().turboQuant.enabled
        ? "turboquant-local"
        : "",
    format: "openai",
    model: readLocalAccelerationConfig().turboQuant.model,
    headers: (key) => ({
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    }),
  },
  groq: {
    name: "groq",
    url: "https://api.groq.com/openai/v1/chat/completions",
    key: () => process.env.GROQ_API_KEY ?? "",
    format: "openai",
    model: "llama-3.3-70b-versatile",
    headers: (key) => ({
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    }),
  },
  openrouter: {
    name: "openrouter",
    url: "https://openrouter.ai/api/v1/chat/completions",
    key: () => process.env.OPENROUTER_API_KEY ?? "",
    format: "openai",
    model: "anthropic/claude-3.5-sonnet",
    headers: (key) => ({
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
      "HTTP-Referer": "https://aegis-vector.local",
      "X-Title": BRAND_NAME,
    }),
  },
  google: {
    name: "google",
    url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
    key: () => process.env.GOOGLE_AI_KEY ?? "",
    format: "openai",
    model: "gemini-2.0-flash",
    headers: (key) => ({
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    }),
  },
  anthropic: {
    name: "anthropic",
    url: "https://api.anthropic.com/v1/messages",
    key: () => process.env.ANTHROPIC_API_KEY ?? "",
    format: "anthropic",
    model: "claude-opus-4-5",
    headers: (key) => ({
      "Content-Type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    }),
  },
  openai: {
    name: "openai",
    url: "https://api.openai.com/v1/chat/completions",
    key: () => process.env.OPENAI_API_KEY ?? "",
    format: "openai",
    model: "gpt-4o-mini",
    headers: (key) => ({
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    }),
  },
  azure: {
    name: "azure",
    url: "",
    key: () => {
      const result = readAzureOpenAIConfig();
      return result.configured ? result.config.apiKey : "";
    },
    format: "openai",
    model: "",
    headers: (key) => ({
      "Content-Type": "application/json",
      "api-key": key,
    }),
  },
  /** OpenAI-compatible — https://platform.minimax.io/docs/api-reference/text-openai-api */
  minimax: {
    name: "minimax",
    url: "https://api.minimax.io/v1/chat/completions",
    key: () => process.env.MINIMAX_API_KEY ?? "",
    format: "openai",
    model: MINIMAX_DEFAULT_CHAT_MODEL,
    headers: (key) => ({
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    }),
  },
};

// ── Provider chains ───────────────────────────────────────────────────────────
// auto: try local first, fall back to cloud
const AUTO_CHAIN = [
  "ollama",
  "turboquant",
  "groq",
  "openrouter",
  "google",
  "minimax",
  "anthropic",
  "azure",
  "openai",
];
// research: cloud-first for depth, local as final fallback
const RESEARCH_CHAIN = [
  "anthropic",
  "azure",
  "openrouter",
  "groq",
  "minimax",
  "turboquant",
  "ollama",
  "openai",
];

const FREE_DEFAULT_PROVIDERS = new Set(["ollama", "turboquant"]);
const ALLOW_PAID_APIS = process.env.NEXUS_ALLOW_PAID_APIS === "true";

function getProviderDefaultModel(providerName: string) {
  if (providerName === "azure") {
    const result = readAzureOpenAIConfig();
    return result.configured ? result.config.deployment : "azure-deployment";
  }
  return PROVIDERS[providerName]?.model ?? "";
}

function providerAllowedByPolicy(providerName: string, localOnlyMode: boolean) {
  if (localOnlyMode)
    return providerName === "ollama" || providerName === "turboquant";
  if (ALLOW_PAID_APIS) return true;
  return FREE_DEFAULT_PROVIDERS.has(providerName);
}

// ── Call a single provider ────────────────────────────────────────────────────
async function callProvider(
  providerName: string,
  messages: unknown[],
  model: string | undefined,
  maxTokens: number,
  system: string | undefined,
  stream: boolean,
  tools?: unknown,
  toolChoice?: unknown,
  options?: {
    url?: string;
    key?: string;
  },
): Promise<Response | null> {
  const p = PROVIDERS[providerName];
  const azureResult = providerName === "azure" ? readAzureOpenAIConfig() : null;
  const azureConfig =
    azureResult?.configured === true ? azureResult.config : null;
  if (providerName === "azure" && !azureConfig) return null;

  const key = options?.key ?? azureConfig?.apiKey ?? p.key();
  if (!key || (key === "ollama" && providerName !== "ollama")) return null;
  if (!key && providerName !== "ollama") return null;

  const resolvedModel =
    providerName === "azure"
      ? (azureConfig?.deployment ?? getProviderDefaultModel(providerName))
      : (model ?? p.model);

  let body: Record<string, unknown>;

  if (p.format === "anthropic") {
    // Anthropic Messages format — pass tools through for agent tool-use
    body = {
      model: resolvedModel,
      max_tokens: maxTokens,
      messages,
      ...(system ? { system } : {}),
      ...(tools ? { tools } : {}),
      ...(toolChoice ? { tool_choice: toolChoice } : {}),
      ...(stream ? { stream: true } : {}),
    };
  } else {
    // OpenAI-compatible format
    const msgs = system
      ? [{ role: "system", content: system }, ...messages]
      : messages;
    body = {
      model: resolvedModel,
      ...(providerName === "azure"
        ? { max_completion_tokens: maxTokens }
        : { max_tokens: maxTokens }),
      messages: msgs,
      ...(tools ? { tools } : {}),
      ...(toolChoice ? { tool_choice: toolChoice } : {}),
      ...(stream ? { stream: true } : {}),
    };
  }

  try {
    const requestUrl =
      providerName === "turboquant"
        ? validateLocalAccelerationEndpoint(
            options?.url ?? p.url,
            readLocalAccelerationConfig().allowTailnet,
          ).toString()
        : providerName === "azure"
          ? (azureConfig?.chatCompletionsUrl ?? "")
          : (options?.url ?? p.url);
    const r = await fetch(requestUrl, {
      method: "POST",
      headers: p.headers(key),
      body: JSON.stringify(body),
      // @ts-expect-error — Node 18 fetch supports duplex for streaming
      duplex: "half",
    });
    if (!r.ok) return null;
    return r;
  } catch {
    return null;
  }
}

// ── Main handler ──────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const rateLimitConfig = {
    bucket: "api-ai",
    windowMs: 60_000,
    maxAttempts: 30,
    includeBearerToken: true,
  } as const;
  const rateLimit = checkRateLimit(req, rateLimitConfig);
  if (!rateLimit.ok) {
    const response = NextResponse.json(
      {
        error: {
          message:
            "AI route rate limit exceeded. Slow down and try again shortly.",
        },
      },
      { status: 429 },
    );
    applyRateLimitHeaders(response, rateLimitConfig, rateLimit.retryAfterSec);
    return response;
  }

  let body: {
    provider?: string;
    task?: string;
    model?: string;
    messages?: unknown[];
    system?: string;
    max_tokens?: number;
    stream?: boolean;
    tools?: unknown;
    tool_choice?: unknown;
    secondBrainMode?: unknown;
    [key: string]: unknown;
  };
  try {
    try {
      body = (await req.json()) as typeof body;
    } catch {
      return NextResponse.json(
        {
          error: {
            message:
              "Invalid or empty JSON body. Send Content-Type: application/json with a valid payload.",
          },
        },
        { status: 400 },
      );
    }

    const {
      provider,
      task,
      model,
      messages = [],
      system,
      max_tokens,
      stream = false,
      tools,
      tool_choice,
      localEndpoint,
      localApiKey,
      preferRunningModel,
      secondBrainMode,
    } = body;

    const trustContext = await readProtectedActionContext(req);
    const phoneAiPolicy = resolvePhoneSessionAiPolicy(
      trustContext.session?.authTier,
      typeof provider === "string" ? provider : null,
    );
    if (!phoneAiPolicy.explicitProviderAllowed) {
      return NextResponse.json(
        {
          error: {
            code: "phone_token_limited",
            message: `Provider "${phoneAiPolicy.provider}" is blocked for phone-token sessions. Phone access can use Ollama or TurboQuant local AI only.`,
            recoveryAction:
              "Use local AI from the phone, or use the master token from the desktop for an explicitly enabled BYOK provider.",
          },
        },
        { status: 403 },
      );
    }
    const localOnlyMode =
      phoneAiPolicy.localOnly || trustContext.networkMode === "isolated";

    const resolvedSecondBrainMode = resolveSecondBrainMode({
      requestedMode: secondBrainMode,
      task,
      messages,
    });
    const secondBrain = await buildSecondBrainSystemBlock(
      resolvedSecondBrainMode,
    );
    if (
      !isSecondBrainModeReady(resolvedSecondBrainMode, secondBrain.loadedFiles)
    ) {
      return NextResponse.json(
        {
          error: {
            code: "second_brain_unavailable",
            message:
              resolvedSecondBrainMode === "human-editor"
                ? "The canonical Human Editor skill file is unavailable. Restore it or check the file status in VAULT before rewriting."
                : "The canonical Night Shift skill or house rules are unavailable. Restore the tracked contract before refining second-brain material.",
          },
        },
        {
          status: 503,
          headers: {
            "X-Second-Brain-Mode": resolvedSecondBrainMode,
            "X-Second-Brain-Files": String(secondBrain.loadedFiles.length),
          },
        },
      );
    }
    const effectiveSystem = appendSecondBrainSystemPrompt(
      typeof system === "string" ? system : undefined,
      secondBrain.block,
    );

    // Clamp tokens
    const safeMaxTokens = Math.min(
      typeof max_tokens === "number" && max_tokens > 0 ? max_tokens : 1024,
      MAX_TOKENS_PER_REQUEST,
    );

    // Determine the model to use for Ollama based on task hint
    const taskModel = task
      ? (TASK_MODELS[task as keyof typeof TASK_MODELS] ?? DEFAULT_LOCAL_MODEL)
      : undefined;

    let validatedLocalEndpoint: string | undefined;
    if (typeof localEndpoint === "string" && localEndpoint.trim()) {
      try {
        validatedLocalEndpoint = normalizeOllamaEndpoint(localEndpoint);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Ollama endpoint is invalid.";
        return NextResponse.json(
          {
            error: {
              code: "ollama_endpoint_blocked",
              message,
              recoveryAction:
                "Use a loopback Ollama endpoint such as http://localhost:11434/v1/chat/completions.",
            },
          },
          { status: 400 },
        );
      }
    }

    // Determine provider chain
    let chain: string[];
    let resolvedModel: string | undefined;

    if (provider && PROVIDERS[provider]) {
      if (localOnlyMode && provider !== "ollama" && provider !== "turboquant") {
        return NextResponse.json(
          {
            error: {
              code: "network_locked",
              message: `Provider "${provider}" is blocked while the network mode is isolated. Start Ollama or the optional TurboQuant local runtime, or switch to internal/connected mode first.`,
              recoveryAction:
                "Keep NEXUS_NETWORK_MODE=isolated for offline use and run Ollama or TurboQuant locally.",
            },
          },
          { status: 403 },
        );
      }
      if (!providerAllowedByPolicy(provider, localOnlyMode)) {
        return NextResponse.json(
          {
            error: {
              code: "paid_provider_blocked",
              message:
                `Provider "${provider}" is blocked by free-use policy. ` +
                "Set NEXUS_ALLOW_PAID_APIS=true to opt in.",
              recoveryAction:
                "Use Ollama locally for the fully free default, or explicitly opt in to BYOK cloud outside the app.",
            },
          },
          { status: 403 },
        );
      }
      // Explicit provider requested
      chain = [provider];
      resolvedModel =
        provider === "azure"
          ? getProviderDefaultModel(provider)
          : (model ?? PROVIDERS[provider].model);
    } else {
      chain = resolveProviderChainForTask({
        task: typeof task === "string" ? task : undefined,
        localOnlyMode,
        paidApisAllowed: ALLOW_PAID_APIS,
        explicitProvider: null,
        autoChain: AUTO_CHAIN,
        researchChain: RESEARCH_CHAIN,
      });
      resolvedModel = taskModel ?? model;
    }

    const policyFilteredChain = chain.filter((providerName) =>
      providerAllowedByPolicy(providerName, localOnlyMode),
    );
    if (policyFilteredChain.length === 0) {
      const phoneLocalAiRequired = phoneAiPolicy.phoneSession;
      return NextResponse.json(
        {
          error: {
            code: phoneLocalAiRequired
              ? "phone_local_ai_required"
              : localOnlyMode
                ? "ollama_required"
                : "provider_policy_blocked",
            message: phoneLocalAiRequired
              ? "No local AI provider is available for this phone-token session. Start Ollama or the optional TurboQuant runtime."
              : localOnlyMode
                ? "No local providers are available while the network mode is isolated. Start Ollama locally to continue."
                : "No providers allowed by free-use policy. Set NEXUS_ALLOW_PAID_APIS=true to opt in.",
            recoveryAction: phoneLocalAiRequired
              ? "Start a local AI runtime on the host, then retry from the phone."
              : localOnlyMode
                ? "Start Ollama and install the configured local model."
                : "Use Ollama locally, or explicitly opt in to BYOK cloud providers.",
          },
        },
        { status: 403 },
      );
    }

    // Walk the chain until one succeeds
    for (const providerName of policyFilteredChain) {
      // For cloud providers in the auto chain, use provider's default model
      const requestedEffectiveModel =
        providerName === "ollama"
          ? (resolvedModel ?? DEFAULT_LOCAL_MODEL)
          : providerName === chain[0]
            ? resolvedModel
            : undefined;
      let effectiveModel = requestedEffectiveModel;
      let ollamaResolutionReason: string | null = null;
      let ollamaRequestedModel: string | null = null;
      if (providerName === "ollama") {
        const ollamaTask: AITask | "default" =
          typeof task === "string" &&
          Object.prototype.hasOwnProperty.call(TASK_MODELS, task)
            ? (task as AITask)
            : "default";
        const resolution = await resolveInstalledOllamaModel({
          endpoint: validatedLocalEndpoint,
          apiKey:
            typeof localApiKey === "string" && localApiKey.trim()
              ? localApiKey.trim()
              : undefined,
          requestedModel: requestedEffectiveModel,
          task: ollamaTask,
          preferActiveModel: preferRunningModel !== false,
        });
        ollamaRequestedModel = resolution.requestedModel;
        ollamaResolutionReason = resolution.reason;
        if (resolution.reachable && resolution.resolvedModel) {
          effectiveModel = resolution.resolvedModel;
        }
      }
      const protectedPayload = protectCloudBoundPayload({
        providerName,
        messages,
        system: effectiveSystem,
        tools,
        toolChoice: tool_choice,
      });
      if (protectedPayload.status?.dispatchMode === "blocked") {
        const response = NextResponse.json(
          {
            error: {
              message:
                protectedPayload.status.blockedReason ??
                "Cloud dispatch was blocked because the request still carried sensitive evidence after privacy review.",
            },
          },
          { status: 403 },
        );
        response.headers.set("X-Provider", providerName);
        response.headers.set(
          "X-Model",
          effectiveModel ?? getProviderDefaultModel(providerName),
        );
        response.headers.set("X-Second-Brain-Mode", resolvedSecondBrainMode);
        response.headers.set(
          "X-Second-Brain-Files",
          String(secondBrain.loadedFiles.length),
        );
        applyPrivacyShieldHeaders(response, protectedPayload.status);
        applyRateLimitHeaders(response, rateLimitConfig);
        return response;
      }

      const r = await callProvider(
        providerName,
        protectedPayload.messages,
        effectiveModel,
        safeMaxTokens,
        protectedPayload.system,
        stream,
        protectedPayload.tools,
        protectedPayload.toolChoice,
        providerName === "ollama"
          ? {
              url: validatedLocalEndpoint,
              key:
                typeof localApiKey === "string" && localApiKey.trim()
                  ? localApiKey.trim()
                  : undefined,
            }
          : providerName === "turboquant"
            ? { url: readLocalAccelerationConfig().turboQuant.openAiEndpoint }
            : undefined,
      );

      if (r) {
        const usedModel =
          effectiveModel ?? getProviderDefaultModel(providerName);
        const response = new NextResponse(r.body, {
          status: r.status,
          headers: {
            "Content-Type": r.headers.get("Content-Type") ?? "application/json",
            "X-Provider": providerName,
            "X-Model": usedModel,
            "X-Second-Brain-Mode": resolvedSecondBrainMode,
            "X-Second-Brain-Files": String(secondBrain.loadedFiles.length),
          },
        });
        if (providerName === "ollama") {
          if (ollamaResolutionReason) {
            response.headers.set(
              "X-Ollama-Resolution-Reason",
              ollamaResolutionReason,
            );
          }
          if (ollamaRequestedModel) {
            response.headers.set(
              "X-Ollama-Requested-Model",
              ollamaRequestedModel,
            );
          }
        }
        applyPrivacyShieldHeaders(response, protectedPayload.status);
        applyRateLimitHeaders(response, rateLimitConfig);
        return response;
      }
    }

    // All providers failed
    const response = NextResponse.json(
      {
        error: {
          code: phoneAiPolicy.phoneSession
            ? "phone_local_ai_unavailable"
            : localOnlyMode
              ? "ollama_unavailable"
              : "provider_unavailable",
          message: phoneAiPolicy.phoneSession
            ? "Local AI did not answer this phone-token request. Check that Ollama or TurboQuant is running on the host."
            : localOnlyMode
              ? "Local Ollama did not answer. Check that Ollama is running and the resolved model is installed."
              : "All allowed AI providers are unavailable. Check Ollama first, then any explicitly configured BYOK provider keys.",
          recoveryAction: phoneAiPolicy.phoneSession
            ? "Run the local AI readiness check on the host, then retry from the phone."
            : localOnlyMode
              ? "Run ollama serve, then run npm run offline:local:check."
              : "Open provider health and keep paid APIs disabled unless you explicitly opt in.",
        },
      },
      { status: 503 },
    );
    applyRateLimitHeaders(response, rateLimitConfig);
    return response;
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "AI proxy request failed.";
    const response = NextResponse.json(
      { error: { message: msg } },
      { status: 500 },
    );
    applyRateLimitHeaders(response, rateLimitConfig);
    return response;
  }
}
