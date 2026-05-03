// ── api/ai ──────────────────────────────────────────────────
// Multi-provider AI proxy: Ollama fallback chain, task-based model routing, hard token caps.

import { NextRequest, NextResponse } from "next/server";
import {
  DEFAULT_LOCAL_MODEL,
  MINIMAX_DEFAULT_CHAT_MODEL,
  TASK_MODELS,
} from "@/lib/aiModelRouting";
import { BRAND_NAME } from "@/lib/brand";
import {
  applyRateLimitHeaders,
  checkRateLimit,
} from "@/lib/security/rateLimit";
import {
  applyPrivacyShieldHeaders,
  protectCloudBoundPayload,
} from "@/lib/privacyShieldServer";
import { readProtectedActionContext } from "@/lib/security/toolCapabilityPolicy";

/**
 * Multi-provider AI proxy with task-based model routing.
 *
 * Fallback chain (auto mode): Ollama → Groq → OpenRouter → Google → MiniMax → Anthropic → OpenAI
 * Research chain: Anthropic → OpenRouter → Groq → MiniMax → Ollama → OpenAI
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
  "groq",
  "openrouter",
  "google",
  "minimax",
  "anthropic",
  "openai",
];
// research: cloud-first for depth, local as final fallback
const RESEARCH_CHAIN = [
  "anthropic",
  "openrouter",
  "groq",
  "minimax",
  "ollama",
  "openai",
];

const FREE_DEFAULT_PROVIDERS = new Set(["ollama"]);
const ALLOW_PAID_APIS = process.env.NEXUS_ALLOW_PAID_APIS === "true";

function providerAllowedByPolicy(providerName: string, localOnlyMode: boolean) {
  if (localOnlyMode) return providerName === "ollama";
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
): Promise<Response | null> {
  const p = PROVIDERS[providerName];
  const key = p.key();
  if (!key || (key === "ollama" && providerName !== "ollama")) return null;
  if (!key && providerName !== "ollama") return null;

  const resolvedModel = model ?? p.model;

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
      max_tokens: maxTokens,
      messages: msgs,
      ...(tools ? { tools } : {}),
      ...(toolChoice ? { tool_choice: toolChoice } : {}),
      ...(stream ? { stream: true } : {}),
    };
  }

  try {
    const r = await fetch(p.url, {
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
          message: "AI route rate limit exceeded. Slow down and try again shortly.",
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
    } = body;

    // Clamp tokens
    const safeMaxTokens = Math.min(
      typeof max_tokens === "number" && max_tokens > 0 ? max_tokens : 1024,
      MAX_TOKENS_PER_REQUEST,
    );

    // Determine the model to use for Ollama based on task hint
    const taskModel = task
      ? (TASK_MODELS[task as keyof typeof TASK_MODELS] ?? DEFAULT_LOCAL_MODEL)
      : undefined;
    const trustContext = await readProtectedActionContext(req);
    const localOnlyMode = trustContext.networkMode === "isolated";

    // Determine provider chain
    let chain: string[];
    let resolvedModel: string | undefined;

    if (provider && PROVIDERS[provider]) {
      if (localOnlyMode && provider !== "ollama") {
        return NextResponse.json(
          {
            error: {
              message:
                `Provider "${provider}" is blocked while the network mode is isolated. Start Ollama locally or switch to internal/connected mode first.`,
            },
          },
          { status: 403 },
        );
      }
      if (!providerAllowedByPolicy(provider, localOnlyMode)) {
        return NextResponse.json(
          {
            error: {
              message:
                `Provider "${provider}" is blocked by free-use policy. ` +
                "Set NEXUS_ALLOW_PAID_APIS=true to opt in.",
            },
          },
          { status: 403 },
        );
      }
      // Explicit provider requested
      chain = [provider];
      resolvedModel = model ?? PROVIDERS[provider].model;
    } else if (task === "research") {
      chain = RESEARCH_CHAIN;
      resolvedModel = model;
    } else {
      // Auto chain — use task model for ollama, default for cloud
      chain = AUTO_CHAIN;
      resolvedModel = taskModel ?? model;
    }

    const policyFilteredChain = chain.filter((providerName) =>
      providerAllowedByPolicy(providerName, localOnlyMode),
    );
    if (policyFilteredChain.length === 0) {
      return NextResponse.json(
        {
          error: {
            message:
              localOnlyMode
                ? "No local providers are available while the network mode is isolated. Start Ollama locally to continue."
                : "No providers allowed by free-use policy. Set NEXUS_ALLOW_PAID_APIS=true to opt in.",
          },
        },
        { status: 403 },
      );
    }

    // Walk the chain until one succeeds
    for (const providerName of policyFilteredChain) {
      // For cloud providers in the auto chain, use provider's default model
      const effectiveModel =
        providerName === "ollama"
          ? (resolvedModel ?? DEFAULT_LOCAL_MODEL)
          : providerName === chain[0]
            ? resolvedModel
            : undefined;
      const protectedPayload = protectCloudBoundPayload({
        providerName,
        messages,
        system,
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
          effectiveModel ?? PROVIDERS[providerName].model,
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
        tools,
        tool_choice,
      );

      if (r) {
        const usedModel = effectiveModel ?? PROVIDERS[providerName].model;
        const response = new NextResponse(r.body, {
          status: r.status,
          headers: {
            "Content-Type": r.headers.get("Content-Type") ?? "application/json",
            "X-Provider": providerName,
            "X-Model": usedModel,
          },
        });
        applyPrivacyShieldHeaders(response, protectedPayload.status);
        applyRateLimitHeaders(response, rateLimitConfig);
        return response;
      }
    }

    // All providers failed
    const response = NextResponse.json(
      {
        error: {
          message:
            "All AI providers unavailable. Check your API keys and Ollama status.",
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
