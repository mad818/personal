// ── api/ai ──────────────────────────────────────────────────
// Multi-provider AI proxy: Ollama fallback chain, task-based model routing, hard token caps.

import { NextRequest, NextResponse } from "next/server";
import {
  ANTHROPIC_DEFAULT_CHAT_MODEL,
  DEFAULT_LOCAL_MODEL,
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
import { BRAND_NAME } from "@/lib/brand";
import {
  applyRateLimitHeaders,
  checkRateLimit,
} from "@/lib/security/rateLimit";
import {
  isCircuitOpen,
  recordFailure,
  recordSuccess,
  scoreSortedChain,
  getTimeoutMs,
  sanitizeMessages,
  sanitizeSystem,
  isValidCompletionResponse,
  getOpenCircuits,
} from "@/lib/aiProviderHealth";
import {
  canUseProvider,
  recordUsage,
  estimateInputTokens,
} from "@/lib/aiUsageGuard";
import { patchProcessEnvFromFile } from "@/lib/serverEnvRuntime";

/**
 * Multi-provider AI proxy — 24 providers, hard-coded free usage.
 *
 * Free-tier AUTO_CHAIN (19 providers, no flag required):
 *   Ollama → Cerebras → Groq → SambaNova → NVIDIA → Hyperbolic → Together AI
 *   → SiliconFlow → ZAI → iFlow → DeepInfra → Fireworks → Scaleway → DashScope
 *   → HuggingFace → Codestral → Google AI (Gemma) → Cloudflare → Perplexity
 *
 * Paid providers (opt-in via NEXUS_ALLOW_PAID_APIS=true):
 *   OpenRouter → Google (Gemini) → MiniMax → Anthropic → OpenAI
 *
 * Research chain: Anthropic → OpenRouter → Groq → SambaNova → Ollama → OpenAI
 *
 * Free providers activate automatically when their env key is set —
 * no policy flag, no manual configuration required.
 *
 * Circuit breaker: failed providers are skipped for 5 min automatically.
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
 *  X-Provider       — which provider actually responded
 *  X-Model          — which model was used
 *  X-Circuits-Open  — comma list of providers in circuit-open (cooldown) state
 *
 * Source: provider endpoints + model IDs verified against
 *   https://github.com/vava-nessa/free-coding-models (sources.js)
 *   SWE-bench scores from swebench.com / marc0.dev leaderboard
 */

// ── Token budget ───────────────────────────────────────────────────────────────
const MAX_TOKENS_PER_REQUEST = Math.min(
  parseInt(process.env.NEXUS_MAX_TOKENS ?? "2048", 10),
  8192,
);

// ── Provider registry ─────────────────────────────────────────────────────────
// All endpoints and model IDs verified against:
//   https://github.com/vava-nessa/free-coding-models (sources.js)
// Default model = highest SWE-bench tier available on the free plan.
// Free providers activate automatically when their env key is set —
// no NEXUS_ALLOW_PAID_APIS flag, no extra configuration required.
interface Provider {
  name: string;
  url: string;
  key: () => string;
  format: "anthropic" | "openai";
  model: string;
  headers: (key: string) => Record<string, string>;
  /** Shown in X-Provider header and health endpoint */
  tier?: "free" | "paid";
  /** SWE-bench Verified score of the default model (informational) */
  sweScore?: string;
}

interface LocalProviderOverrides {
  localEndpoint?: string;
  localApiKey?: string;
  localModelRecoveryAllowed?: boolean;
  preferRunningModel?: boolean;
  task?: string;
}

async function readPromptCacheUsage(
  response: Response,
): Promise<{ observed: boolean; readTokens: number; writeTokens: number }> {
  try {
    const contentType = response.headers.get("Content-Type") ?? "";
    if (!contentType.toLowerCase().includes("application/json")) {
      return { observed: false, readTokens: 0, writeTokens: 0 };
    }
    const data = (await response.clone().json()) as {
      usage?: {
        cache_read_input_tokens?: unknown;
        cache_creation_input_tokens?: unknown;
      };
    };
    const hasRead =
      Object.prototype.hasOwnProperty.call(data?.usage ?? {}, "cache_read_input_tokens");
    const hasWrite =
      Object.prototype.hasOwnProperty.call(
        data?.usage ?? {},
        "cache_creation_input_tokens",
      );
    const readTokens = Number(data?.usage?.cache_read_input_tokens ?? 0);
    const writeTokens = Number(data?.usage?.cache_creation_input_tokens ?? 0);
    return {
      observed: hasRead || hasWrite,
      readTokens: Number.isFinite(readTokens) ? readTokens : 0,
      writeTokens: Number.isFinite(writeTokens) ? writeTokens : 0,
    };
  } catch {
    return { observed: false, readTokens: 0, writeTokens: 0 };
  }
}

const PROVIDERS: Record<string, Provider> = {
  // ── LOCAL ──────────────────────────────────────────────────────────────────
  /** Ollama local — zero cost, zero latency, fully private */
  ollama: {
    name: "ollama",
    tier: "free",
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

  // ── FREE TIER — SPEED-FIRST ────────────────────────────────────────────────
  /**
   * Cerebras — ~1750 tok/s, fastest inference cloud available.
   * Free: cloud.cerebras.ai  Key: CEREBRAS_API_KEY
   * Default: Qwen3 235B (S+ 70.0% SWE-bench)
   */
  cerebras: {
    name: "cerebras",
    tier: "free",
    sweScore: "70.0%",
    url: "https://api.cerebras.ai/v1/chat/completions",
    key: () => process.env.CEREBRAS_API_KEY ?? "",
    format: "openai",
    model: "qwen-3-235b-a22b-instruct-2507",
    headers: (key) => ({
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    }),
  },
  /**
   * Groq — ultra-fast LPU inference, rock-solid uptime.
   * Free: console.groq.com/keys  Key: GROQ_API_KEY
   * Default: Qwen3 32B (A+ 50.0% SWE-bench)
   */
  groq: {
    name: "groq",
    tier: "free",
    sweScore: "50.0%",
    url: "https://api.groq.com/openai/v1/chat/completions",
    key: () => process.env.GROQ_API_KEY ?? "",
    format: "openai",
    model: "qwen/qwen3-32b",
    headers: (key) => ({
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    }),
  },
  /**
   * SambaNova Cloud — enterprise infra, S+ frontier models free.
   * Free: cloud.sambanova.ai  Key: SAMBANOVA_API_KEY
   * Default: DeepSeek V3.2 (S+ 73.1% SWE-bench)
   */
  sambanova: {
    name: "sambanova",
    tier: "free",
    sweScore: "73.1%",
    url: "https://api.sambanova.ai/v1/chat/completions",
    key: () => process.env.SAMBANOVA_API_KEY ?? "",
    format: "openai",
    model: "DeepSeek-V3.2",
    headers: (key) => ({
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    }),
  },

  // ── FREE TIER — HIGH QUALITY ───────────────────────────────────────────────
  /**
   * NVIDIA NIM — enterprise GPU infra, 40 req/min free.
   * Free: build.nvidia.com  Key: NVIDIA_API_KEY
   * Default: Qwen3 Coder 480B (S+ 70.6% SWE-bench)
   */
  nvidia: {
    name: "nvidia",
    tier: "free",
    sweScore: "70.6%",
    url: "https://integrate.api.nvidia.com/v1/chat/completions",
    key: () => process.env.NVIDIA_API_KEY ?? "",
    format: "openai",
    model: "qwen/qwen3-coder-480b-a35b-instruct",
    headers: (key) => ({
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    }),
  },
  /**
   * Hyperbolic — $1 free credits, S+ frontier models.
   * Free: app.hyperbolic.ai  Key: HYPERBOLIC_API_KEY
   * Default: Qwen3 Coder 480B (S+ 70.6% SWE-bench)
   */
  hyperbolic: {
    name: "hyperbolic",
    tier: "free",
    sweScore: "70.6%",
    url: "https://api.hyperbolic.xyz/v1/chat/completions",
    key: () => process.env.HYPERBOLIC_API_KEY ?? "",
    format: "openai",
    model: "qwen/qwen3-coder-480b-a35b-instruct",
    headers: (key) => ({
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    }),
  },
  /**
   * Together AI — S+ models including Kimi K2.5.
   * Free: api.together.ai  Key: TOGETHER_API_KEY
   * Default: Kimi K2.5 (S+ 76.8% SWE-bench)
   */
  together: {
    name: "together",
    tier: "free",
    sweScore: "76.8%",
    url: "https://api.together.xyz/v1/chat/completions",
    key: () => process.env.TOGETHER_API_KEY ?? "",
    format: "openai",
    model: "moonshotai/Kimi-K2.5",
    headers: (key) => ({
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    }),
  },
  /**
   * SiliconFlow — S+ Qwen3 Coder + DeepSeek V3.2 free.
   * Free: cloud.siliconflow.cn  Key: SILICONFLOW_API_KEY
   * Default: Qwen3 Coder 480B (S+ 70.6% SWE-bench)
   */
  siliconflow: {
    name: "siliconflow",
    tier: "free",
    sweScore: "70.6%",
    url: "https://api.siliconflow.com/v1/chat/completions",
    key: () => process.env.SILICONFLOW_API_KEY ?? "",
    format: "openai",
    model: "Qwen/Qwen3-Coder-480B-A35B-Instruct",
    headers: (key) => ({
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    }),
  },
  /**
   * ZAI (z.ai) — GLM frontier models, generous free quota.
   * Free: open.z.ai  Key: ZAI_API_KEY
   * Default: GLM-5 (S+ 77.8% SWE-bench — highest free model score)
   */
  zai: {
    name: "zai",
    tier: "free",
    sweScore: "77.8%",
    url: "https://api.z.ai/api/coding/paas/v4/chat/completions",
    key: () => process.env.ZAI_API_KEY ?? "",
    format: "openai",
    model: "zai/glm-5",
    headers: (key) => ({
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    }),
  },
  /**
   * iFlow — unlimited requests (key refreshes every 7 days).
   * Free: platform.iflow.cn  Key: IFLOW_API_KEY
   * Default: DeepSeek V3.2 (S+ 73.1% SWE-bench)
   */
  iflow: {
    name: "iflow",
    tier: "free",
    sweScore: "73.1%",
    url: "https://apis.iflow.cn/v1/chat/completions",
    key: () => process.env.IFLOW_API_KEY ?? "",
    format: "openai",
    model: "deepseek-v3.2",
    headers: (key) => ({
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    }),
  },

  // ── FREE TIER — BULK / SPECIALTY ──────────────────────────────────────────
  /**
   * DeepInfra — 200 concurrent req free, S+ Qwen3 235B.
   * Free: deepinfra.com  Key: DEEPINFRA_API_KEY
   * Default: Qwen3 235B (S+ 70.0% SWE-bench)
   */
  deepinfra: {
    name: "deepinfra",
    tier: "free",
    sweScore: "70.0%",
    url: "https://api.deepinfra.com/v1/openai/chat/completions",
    key: () => process.env.DEEPINFRA_API_KEY ?? "",
    format: "openai",
    model: "Qwen/Qwen3-235B-A22B",
    headers: (key) => ({
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    }),
  },
  /**
   * Fireworks AI — $1 free credits, S+ Qwen3 + DeepSeek.
   * Free: fireworks.ai  Key: FIREWORKS_API_KEY
   * Default: Qwen3 235B (S+ 70.0% SWE-bench)
   */
  fireworks: {
    name: "fireworks",
    tier: "free",
    sweScore: "70.0%",
    url: "https://api.fireworks.ai/inference/v1/chat/completions",
    key: () => process.env.FIREWORKS_API_KEY ?? "",
    format: "openai",
    model: "accounts/fireworks/models/qwen3-235b-a22b",
    headers: (key) => ({
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    }),
  },
  /**
   * Scaleway — 1M free tokens, S+ Devstral 2 123B.
   * Free: console.scaleway.com  Key: SCALEWAY_API_KEY
   * Default: Devstral 2 123B (S+ 72.2% SWE-bench)
   */
  scaleway: {
    name: "scaleway",
    tier: "free",
    sweScore: "72.2%",
    url: "https://api.scaleway.ai/v1/chat/completions",
    key: () => process.env.SCALEWAY_API_KEY ?? "",
    format: "openai",
    model: "devstral-2-123b-instruct-2512",
    headers: (key) => ({
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    }),
  },
  /**
   * Alibaba DashScope — 1M tokens/model for 90 days, S+ Qwen3 Coder.
   * Free: modelstudio.console.alibabacloud.com  Key: DASHSCOPE_API_KEY
   * Default: Qwen3 Coder 480B (S+ 70.6% SWE-bench)
   */
  qwen: {
    name: "qwen",
    tier: "free",
    sweScore: "70.6%",
    url: "https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions",
    key: () => process.env.DASHSCOPE_API_KEY ?? "",
    format: "openai",
    model: "qwen3-coder-480b-a35b-instruct",
    headers: (key) => ({
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    }),
  },
  /**
   * Hugging Face Inference — ~$0.10 monthly free credits.
   * Free: huggingface.co/settings/tokens  Key: HUGGINGFACE_API_KEY
   * Default: DeepSeek V3 0324 (S 62.0% SWE-bench)
   */
  huggingface: {
    name: "huggingface",
    tier: "free",
    sweScore: "62.0%",
    url: "https://router.huggingface.co/v1/chat/completions",
    key: () => process.env.HUGGINGFACE_API_KEY ?? "",
    format: "openai",
    model: "deepseek-ai/DeepSeek-V3-0324",
    headers: (key) => ({
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    }),
  },
  /**
   * Mistral Codestral — free coding model, 2000 req/day.
   * Free: codestral.mistral.ai  Key: CODESTRAL_API_KEY
   * Default: codestral-latest (B+ 34.0% SWE-bench, code-specialist)
   */
  codestral: {
    name: "codestral",
    tier: "free",
    sweScore: "34.0%",
    url: "https://api.mistral.ai/v1/chat/completions",
    key: () => process.env.CODESTRAL_API_KEY ?? "",
    format: "openai",
    model: "codestral-latest",
    headers: (key) => ({
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    }),
  },
  /**
   * Google AI Studio — free Gemma 3 models (14.4K req/day).
   * Uses same GOOGLE_AI_KEY as the paid Gemini provider but routes to free Gemma.
   * Free: aistudio.google.com  Key: GOOGLE_AI_KEY
   * Default: Gemma 3 27B (B 22.0% SWE-bench — largest free Gemma)
   */
  googleai: {
    name: "googleai",
    tier: "free",
    sweScore: "22.0%",
    url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
    key: () => process.env.GOOGLE_AI_KEY ?? "",
    format: "openai",
    model: "gemma-3-27b-it",
    headers: (key) => ({
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    }),
  },
  /**
   * Cloudflare Workers AI — 10K neurons/day free, Kimi K2.5.
   * Requires both CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID.
   * Free: dash.cloudflare.com  Key: CLOUDFLARE_API_TOKEN + CLOUDFLARE_ACCOUNT_ID
   * Default: Kimi K2.5 (S+ 76.8% SWE-bench)
   */
  cloudflare: {
    name: "cloudflare",
    tier: "free",
    sweScore: "76.8%",
    url: `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID ?? ""}/ai/v1/chat/completions`,
    // Key function encodes both requirements — empty string skips the provider
    key: () =>
      process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_API_TOKEN
        ? process.env.CLOUDFLARE_API_TOKEN
        : "",
    format: "openai",
    model: "@cf/moonshotai/kimi-k2.5",
    headers: (key) => ({
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    }),
  },
  /**
   * Perplexity — search-augmented reasoning, tiered free limits.
   * Free: perplexity.ai/settings/api  Key: PERPLEXITY_API_KEY
   * Default: sonar-reasoning (A 45.0% SWE-bench, web-search grounded)
   */
  perplexity: {
    name: "perplexity",
    tier: "free",
    sweScore: "45.0%",
    url: "https://api.perplexity.ai/chat/completions",
    key: () => process.env.PERPLEXITY_API_KEY ?? "",
    format: "openai",
    model: "sonar-reasoning",
    headers: (key) => ({
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    }),
  },

  // ── PAID TIER — opt-in via NEXUS_ALLOW_PAID_APIS=true ────────────────────
  /**
   * OpenRouter — multi-model gateway, 50 free req/day with :free models.
   * Paid: openrouter.ai  Key: OPENROUTER_API_KEY
   * Default: Qwen3 Coder :free (S+ 70.6% SWE-bench)
   */
  openrouter: {
    name: "openrouter",
    tier: "paid",
    sweScore: "70.6%",
    url: "https://openrouter.ai/api/v1/chat/completions",
    key: () => process.env.OPENROUTER_API_KEY ?? "",
    format: "openai",
    model: "qwen/qwen3-coder:free",
    headers: (key) => ({
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
      "HTTP-Referer": "https://aegis-vector.local",
      "X-Title": BRAND_NAME,
    }),
  },
  /**
   * Google Gemini — paid Gemini 2.0 Flash.
   * Paid: aistudio.google.com  Key: GOOGLE_AI_KEY
   */
  google: {
    name: "google",
    tier: "paid",
    url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
    key: () => process.env.GOOGLE_AI_KEY ?? "",
    format: "openai",
    model: "gemini-2.0-flash",
    headers: (key) => ({
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    }),
  },
  /** MiniMax — OpenAI-compatible, paid. https://platform.minimax.io */
  minimax: {
    name: "minimax",
    tier: "paid",
    url: "https://api.minimax.io/v1/chat/completions",
    key: () => process.env.MINIMAX_API_KEY ?? "",
    format: "openai",
    model: MINIMAX_DEFAULT_CHAT_MODEL,
    headers: (key) => ({
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    }),
  },
  /** Anthropic Claude — paid, with prompt caching. https://console.anthropic.com */
  anthropic: {
    name: "anthropic",
    tier: "paid",
    url: "https://api.anthropic.com/v1/messages",
    key: () => process.env.ANTHROPIC_API_KEY ?? "",
    format: "anthropic",
    model: ANTHROPIC_DEFAULT_CHAT_MODEL,
    headers: (key) => ({
      "Content-Type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "anthropic-beta": "prompt-caching-2024-07-31",
    }),
  },
  /** OpenAI GPT — paid. https://platform.openai.com */
  openai: {
    name: "openai",
    tier: "paid",
    url: "https://api.openai.com/v1/chat/completions",
    key: () => process.env.OPENAI_API_KEY ?? "",
    format: "openai",
    model: OPENAI_DEFAULT_CHAT_MODEL,
    headers: (key) => ({
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    }),
  },
};

// ── Provider chains ───────────────────────────────────────────────────────────
// Ordered by: local first → speed tier → quality tier → specialty → paid.
// All 19 free providers are included. Key-empty check in callProvider() skips
// any provider whose key is not set — safe to include all of them here.
const AUTO_CHAIN = [
  // Local — zero cost, zero latency
  "ollama",
  // Speed tier — fastest free inference
  "cerebras",    // ~1750 tok/s, Qwen3 235B (S+ 70.0%)
  "groq",        // LPU inference, Qwen3 32B (A+ 50.0%)
  "sambanova",   // enterprise, DeepSeek V3.2 (S+ 73.1%)
  // High-quality free tier
  "nvidia",      // 40 RPM, Qwen3 Coder 480B (S+ 70.6%)
  "hyperbolic",  // $1 credits, Qwen3 Coder 480B (S+ 70.6%)
  "together",    // Kimi K2.5 (S+ 76.8%)
  "siliconflow", // Qwen3 Coder 480B (S+ 70.6%)
  "zai",         // GLM-5 (S+ 77.8% — highest free model score)
  "iflow",       // Unlimited req, DeepSeek V3.2 (S+ 73.1%)
  // Bulk / specialty free tier
  "deepinfra",   // 200 concurrent, Qwen3 235B (S+ 70.0%)
  "fireworks",   // $1 credits, Qwen3 235B (S+ 70.0%)
  "scaleway",    // 1M tokens, Devstral 2 123B (S+ 72.2%)
  "qwen",        // 1M tokens/model, Qwen3 Coder 480B (S+ 70.6%)
  "huggingface", // ~$0.10 credits, DeepSeek V3 (S 62.0%)
  "codestral",   // 2K req/day, code-specialist (B+ 34.0%)
  "googleai",    // 14.4K req/day, Gemma 3 27B (B 22.0%)
  "cloudflare",  // 10K neurons/day, Kimi K2.5 (S+ 76.8%)
  "perplexity",  // search-grounded, sonar-reasoning (A 45.0%)
  // Paid tier — opt-in only
  "openrouter",
  "google",
  "minimax",
  "anthropic",
  "openai",
];

// Research chain: cloud-first depth, local as final fallback
const RESEARCH_CHAIN = [
  "anthropic",
  "together",    // Kimi K2.5 is excellent for research
  "sambanova",   // DeepSeek V3.2
  "openrouter",
  "groq",
  "minimax",
  "ollama",
  "openai",
];

// Free-tier providers — active by default whenever their key is set.
// No NEXUS_ALLOW_PAID_APIS flag required. Hard-coded free usage.
// Paid providers stay gated: openrouter, google, minimax, anthropic, openai.
const FREE_PROVIDERS = new Set([
  "ollama",
  "cerebras",
  "groq",
  "sambanova",
  "nvidia",
  "hyperbolic",
  "together",
  "siliconflow",
  "zai",
  "iflow",
  "deepinfra",
  "fireworks",
  "scaleway",
  "qwen",
  "huggingface",
  "codestral",
  "googleai",
  "cloudflare",
  "perplexity",
]);

const ALLOW_PAID_APIS = process.env.NEXUS_ALLOW_PAID_APIS === "true";

function providerAllowedByPolicy(providerName: string): boolean {
  if (ALLOW_PAID_APIS) return true;
  return FREE_PROVIDERS.has(providerName);
}

// ── Call a single provider ────────────────────────────────────────────────────
// Returns the raw Response on success, null on any failure.
// Handles: key-absent guard, per-provider timeout (AbortController),
// non-streaming response validation, timing + health state updates.
async function callProvider(
  providerName: string,
  messages: unknown[],
  model: string | undefined,
  maxTokens: number,
  system: string | undefined,
  stream: boolean,
  tools?: unknown,
  toolChoice?: unknown,
  overrides?: LocalProviderOverrides,
): Promise<Response | null> {
  const baseProvider = PROVIDERS[providerName];
  const localEndpoint =
    typeof overrides?.localEndpoint === "string" &&
    overrides.localEndpoint.trim().length > 0
      ? overrides.localEndpoint.trim()
      : baseProvider.url;
  const localApiKey =
    typeof overrides?.localApiKey === "string" &&
    overrides.localApiKey.trim().length > 0
      ? overrides.localApiKey.trim()
      : process.env.OLLAMA_API_KEY ?? "ollama";
  const p =
    providerName === "ollama"
      ? {
          ...baseProvider,
          url: localEndpoint,
          key: () => localApiKey,
        }
      : baseProvider;

  // ── Guard 1: key must be present ─────────────────────────────────────────
  const key = p.key();
  if (!key || (key !== "ollama" && providerName !== "ollama" && !key)) return null;
  // Ollama uses the literal string "ollama" as its key placeholder
  if (providerName !== "ollama" && !key) return null;

  const resolvedModel = model ?? p.model;

  // ── Build provider-specific request body ─────────────────────────────────
  let body: Record<string, unknown>;

  if (p.format === "anthropic") {
    body = {
      model: resolvedModel,
      max_tokens: maxTokens,
      messages,
      // Prompt caching: wrap system in a cache_control block so Anthropic
      // caches the large live-intel + agent-profile context across calls.
      ...(system
        ? {
            system: [
              {
                type: "text",
                text: system,
                cache_control: { type: "ephemeral" },
              },
            ],
          }
        : {}),
      ...(tools      ? { tools }                   : {}),
      ...(toolChoice ? { tool_choice: toolChoice } : {}),
      ...(stream     ? { stream: true }             : {}),
    };
  } else {
    // OpenAI-compatible
    const msgs = system
      ? [{ role: "system", content: system }, ...messages]
      : messages;
    body = {
      model: resolvedModel,
      max_tokens: maxTokens,
      messages: msgs,
      ...(tools      ? { tools }                   : {}),
      ...(toolChoice ? { tool_choice: toolChoice } : {}),
      ...(stream     ? { stream: true }             : {}),
    };
  }

  // ── Guard 2: per-provider timeout via AbortController ────────────────────
  const timeoutMs = getTimeoutMs(providerName);
  const controller = new AbortController();
  const timeoutId  = setTimeout(() => controller.abort(), timeoutMs);
  const startMs    = Date.now();

  try {
    const r = await fetch(p.url, {
      method: "POST",
      headers: p.headers(key),
      body: JSON.stringify(body),
      signal: controller.signal,
      // @ts-expect-error — Node 18 fetch supports duplex for streaming
      duplex: "half",
    });

    clearTimeout(timeoutId);

    // ── Guard 3: HTTP-level failure ─────────────────────────────────────
    if (!r.ok) {
      if (
        providerName === "ollama" &&
        overrides?.localModelRecoveryAllowed !== false
      ) {
        const data = (await r.json().catch(() => null)) as
          | Record<string, unknown>
          | null;
        const errorMessage = extractOllamaErrorMessage(data, r.status);
        if (isMissingOllamaModelError(errorMessage)) {
          const recovery = await resolveInstalledOllamaModel({
            endpoint: localEndpoint,
            apiKey: localApiKey,
            requestedModel: model ?? DEFAULT_LOCAL_MODEL,
            preferActiveModel: overrides?.preferRunningModel !== false,
            task:
              overrides?.task && overrides.task in TASK_MODELS
                ? (overrides.task as keyof typeof TASK_MODELS)
                : "default",
          });
          if (
            recovery.reachable &&
            recovery.resolvedModel &&
            recovery.resolvedModel !== (model ?? DEFAULT_LOCAL_MODEL)
          ) {
            return callProvider(
              providerName,
              messages,
              recovery.resolvedModel,
              maxTokens,
              system,
              stream,
              tools,
              toolChoice,
              {
                ...overrides,
                localModelRecoveryAllowed: false,
              },
            );
          }
        }
      }
      recordFailure(providerName);
      return null;
    }

    // ── Guard 4: non-streaming response validation ───────────────────────
    // Some providers return 200 with an error JSON body (rate limit, quota,
    // maintenance). Validate by cloning the response before passing it on.
    if (!stream) {
      const clone = r.clone();
      const valid = await isValidCompletionResponse(clone);
      if (!valid) {
        recordFailure(providerName);
        return null;
      }
    }

    // ── Record success + timing ─────────────────────────────────────────
    recordSuccess(providerName, Date.now() - startMs);
    return r;

  } catch (err: unknown) {
    clearTimeout(timeoutId);
    const isTimeout = err instanceof Error && err.name === "AbortError";
    // Timeout failures count toward the circuit but use a shorter cooldown
    // than hard errors — they may be transient load spikes.
    if (!isTimeout) {
      recordFailure(providerName);
    } else {
      // Soft-trip: only trip circuit on 2+ consecutive timeouts
      const p2 = (await import("@/lib/aiProviderHealth")).getAllStats();
      const consecutiveFails = p2[providerName]?.consecutiveFails ?? 0;
      if (consecutiveFails >= 1) recordFailure(providerName);
    }
    return null;
  }
}

// ── Main handler ──────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  // ── Sync .env.local → process.env (picks up keys saved via /api/settings) ──
  await patchProcessEnvFromFile();

  // ── Rate limit ──────────────────────────────────────────────────────────────
  const rateLimitConfig = {
    bucket: "api-ai",
    windowMs: 60_000,
    maxAttempts: 30,
    includeBearerToken: true,
  } as const;
  const rateLimit = checkRateLimit(req, rateLimitConfig);
  if (!rateLimit.ok) {
    const res = NextResponse.json(
      { error: { message: "Rate limit exceeded. Try again shortly." } },
      { status: 429 },
    );
    applyRateLimitHeaders(res, rateLimitConfig, rateLimit.retryAfterSec);
    return res;
  }

  // ── Content-Length safety gate ──────────────────────────────────────────────
  const contentLength = Number(req.headers.get("content-length") ?? 0);
  if (contentLength > 2_000_000) {
    return NextResponse.json(
      { error: { message: "Request body too large." } },
      { status: 413 },
    );
  }

  let body: {
    provider?: string;
    task?: string;
    model?: string;
    localEndpoint?: string;
    localApiKey?: string;
    preferRunningModel?: boolean;
    messages?: unknown[];
    system?: string;
    max_tokens?: number;
    stream?: boolean;
    tools?: unknown;
    tool_choice?: unknown;
    [key: string]: unknown;
  };

  try {
    // ── Parse + validate JSON body ────────────────────────────────────────────
    try {
      body = (await req.json()) as typeof body;
    } catch {
      return NextResponse.json(
        {
          error: {
            message:
              "Invalid JSON body. Send Content-Type: application/json with a valid payload.",
          },
        },
        { status: 400 },
      );
    }

    // ── Destructure — only known fields forwarded (strip unknown keys) ────────
    const {
      provider,
      task,
      model,
      localEndpoint,
      localApiKey,
      preferRunningModel: rawPreferRunningModel,
      messages: rawMessages = [],
      system: rawSystem,
      max_tokens,
      stream = false,
      tools,
      tool_choice,
    } = body;

    // ── Sanitize inputs ───────────────────────────────────────────────────────
    const messages   = sanitizeMessages(rawMessages);
    const system     = sanitizeSystem(rawSystem);
    const safeStream = typeof stream === "boolean" ? stream : false;

    // Clamp tokens — server-side cap enforced regardless of client request
    const safeMaxTokens = Math.min(
      typeof max_tokens === "number" && max_tokens > 0 ? max_tokens : 1024,
      MAX_TOKENS_PER_REQUEST,
    );

    // ── Validate provider name (allowlist only) ───────────────────────────────
    if (provider !== undefined && typeof provider !== "string") {
      return NextResponse.json(
        { error: { message: "Invalid provider value." } },
        { status: 400 },
      );
    }
    if (provider && !PROVIDERS[provider]) {
      return NextResponse.json(
        { error: { message: `Unknown provider "${provider}".` } },
        { status: 400 },
      );
    }
    if (localEndpoint !== undefined && typeof localEndpoint !== "string") {
      return NextResponse.json(
        { error: { message: "Invalid localEndpoint value." } },
        { status: 400 },
      );
    }
    if (localApiKey !== undefined && typeof localApiKey !== "string") {
      return NextResponse.json(
        { error: { message: "Invalid localApiKey value." } },
        { status: 400 },
      );
    }
    if (
      rawPreferRunningModel !== undefined &&
      typeof rawPreferRunningModel !== "boolean"
    ) {
      return NextResponse.json(
        { error: { message: "Invalid preferRunningModel value." } },
        { status: 400 },
      );
    }

    // ── Determine task model for Ollama ───────────────────────────────────────
    const taskModel = task
      ? (TASK_MODELS[task as keyof typeof TASK_MODELS] ?? DEFAULT_LOCAL_MODEL)
      : undefined;
    const shouldResolveLocalModel = provider === undefined || provider === "ollama";
    const preferRunningModel =
      typeof rawPreferRunningModel === "boolean"
        ? rawPreferRunningModel
        : shouldPreferActiveOllamaModel(task ?? "default");
    const localRequestedModel =
      typeof model === "string" && model.trim().length > 0
        ? model.trim()
        : taskModel ?? DEFAULT_LOCAL_MODEL;
    const localModelResolution = shouldResolveLocalModel
      ? await resolveInstalledOllamaModel({
          endpoint: localEndpoint,
          apiKey: localApiKey,
          requestedModel: localRequestedModel,
          preferActiveModel: preferRunningModel,
          task:
            task && task in TASK_MODELS
              ? (task as keyof typeof TASK_MODELS)
              : "default",
        })
      : null;
    const resolvedLocalModel =
      localModelResolution?.reachable && localModelResolution.resolvedModel
        ? localModelResolution.resolvedModel
        : undefined;

    // ── Build chain ───────────────────────────────────────────────────────────
    let chain: string[];
    let resolvedModel: string | undefined;

    if (provider && PROVIDERS[provider]) {
      if (!providerAllowedByPolicy(provider)) {
        return NextResponse.json(
          {
            error: {
              message:
                `Provider "${provider}" requires NEXUS_ALLOW_PAID_APIS=true.`,
            },
          },
          { status: 403 },
        );
      }
      chain         = [provider];
      resolvedModel =
        provider === "ollama"
          ? resolvedLocalModel ?? localRequestedModel ?? PROVIDERS[provider].model
          : model ?? PROVIDERS[provider].model;
    } else if (task === "research") {
      chain         = RESEARCH_CHAIN;
      resolvedModel = model;
    } else {
      chain         = AUTO_CHAIN;
      resolvedModel = taskModel ?? model;
    }

    // ── Policy filter → remove paid providers when not opted in ───────────────
    const policyChain = chain.filter(providerAllowedByPolicy);
    if (policyChain.length === 0) {
      return NextResponse.json(
        {
          error: {
            message:
              "No providers available. Add a free API key (Groq, Cerebras, etc.) " +
              "or start Ollama locally.",
          },
        },
        { status: 503 },
      );
    }

    // ── Score-sort the chain by live provider health ──────────────────────────
    // Providers that have been fast and reliable recently float to the top.
    // Explicit single-provider requests are not re-sorted.
    const activeChain =
      policyChain.length > 1
        ? scoreSortedChain(policyChain, FREE_PROVIDERS)
        : policyChain;
    const explicitProviderRequest = Boolean(provider && policyChain.length === 1);

    // ── Walk the chain — skip open circuits, try each provider ───────────────
    for (const providerName of activeChain) {
      if (!explicitProviderRequest && isCircuitOpen(providerName)) continue;

      // ── Usage guard — RPM / daily quota / paid spend cap ─────────────────
      // Second independent gate after the policy filter above.
      const guardResult = canUseProvider(providerName, ALLOW_PAID_APIS);
      if (!guardResult.allowed) continue;

      // Ollama uses the task-specific model; other providers use their default
      // unless the caller explicitly requested a model
      const effectiveModel =
        providerName === "ollama"
          ? (resolvedLocalModel ?? resolvedModel ?? DEFAULT_LOCAL_MODEL)
          : resolvedModel !== undefined && policyChain.length === 1
            ? resolvedModel           // explicit single-provider: respect caller model
            : undefined;              // auto chain: use provider default

      const r = await callProvider(
        providerName,
        messages,
        effectiveModel,
        safeMaxTokens,
        system,
        safeStream,
        tools,
        tool_choice,
        {
          localEndpoint,
          localApiKey,
          preferRunningModel,
          task,
        },
      );

      if (!r) continue;

      // ── Record usage (estimates — provider response may not include token counts) ──
      const estimatedIn  = estimateInputTokens(messages, system);
      const estimatedOut = Math.min(safeMaxTokens, 1024); // conservative overestimate
      recordUsage(
        providerName,
        effectiveModel ?? PROVIDERS[providerName].model,
        estimatedIn,
        estimatedOut,
      );

      // ── Build response — sanitize headers ─────────────────────────────────
      const usedModel    = effectiveModel ?? PROVIDERS[providerName].model;
      const openCircuits = getOpenCircuits()
        .map((c) => c.provider)
        .join(",");
      const cacheUsage =
        safeStream || providerName !== "anthropic"
          ? { observed: false, readTokens: 0, writeTokens: 0 }
          : await readPromptCacheUsage(r);

      const response = new NextResponse(r.body, {
        status: r.status,
        headers: {
          "Content-Type": r.headers.get("Content-Type") ?? "application/json",
          // Operational headers — safe for client to read
          "X-Provider":      providerName,
          "X-Model":         usedModel,
          "X-Provider-Tier": PROVIDERS[providerName].tier ?? "free",
          ...(providerName === "ollama" && localModelResolution?.reason
            ? { "X-Ollama-Resolution-Reason": localModelResolution.reason }
            : {}),
          "X-Cache-Observed": cacheUsage.observed ? "true" : "false",
          "X-Cache-Read-Tokens": String(cacheUsage.readTokens),
          "X-Cache-Write-Tokens": String(cacheUsage.writeTokens),
          "X-Cache-Hit": cacheUsage.readTokens > 0 ? "true" : "false",
          ...(openCircuits     ? { "X-Circuits-Open": openCircuits }       : {}),
          ...(guardResult.soft ? { "X-Spend-Warning": guardResult.reason } : {}),
          // Security: never forward provider's internal headers
        },
      });
      applyRateLimitHeaders(response, rateLimitConfig);
      return response;
    }

    // ── All providers failed — friendly degradation message ──────────────────
    const openCircuits = getOpenCircuits();
    const openNames    = openCircuits.map((c) => c.provider).join(", ");
    const degradedMsg  =
      provider === "ollama"
        ? openNames.includes("ollama")
          ? `Ollama is temporarily degraded${localEndpoint ? ` at ${localEndpoint}` : ""}. ` +
            "Nexus will keep probing it automatically, and an explicit retry will test it again immediately."
          : `Ollama is not responding${localEndpoint ? ` at ${localEndpoint}` : ""}. ` +
            "If Ollama is already running, verify the Local Endpoint and selected model in Settings, then retry."
        : provider
          ? openNames.length > 0
            ? `Provider "${provider}" is temporarily unavailable (circuit open: ${openNames}). ` +
              "Retry in a moment and Nexus will probe it again."
            : `Provider "${provider}" is not responding right now. Retry in a moment or switch providers in Settings.`
          : openNames.length > 0
            ? `All AI providers are temporarily unavailable (circuit open: ${openNames}). ` +
              "They will retry automatically — please try again in a few minutes."
            : "No AI providers are responding. " +
              "Check that Ollama is running or add a free API key (Groq, Cerebras, SambaNova) in Settings.";

    const failRes = NextResponse.json(
      { error: { message: degradedMsg } },
      { status: 503 },
    );
    applyRateLimitHeaders(failRes, rateLimitConfig);
    return failRes;

  } catch {
    // ── Catch-all — never expose internal details ────────────────────────────
    const errRes = NextResponse.json(
      { error: { message: "AI proxy encountered an unexpected error." } },
      { status: 500 },
    );
    applyRateLimitHeaders(errRes, rateLimitConfig);
    return errRes;
  }
}
