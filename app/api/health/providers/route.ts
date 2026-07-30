// ── api/health/providers ─────────────────────────────────────────────────────
// Live provider health snapshot — no live pings, reads in-memory circuit state.
//
// GET /api/health/providers
//
// Returns:
//   {
//     providers: ProviderHealth[],   // one entry per registered provider
//     chain: string[],               // active AUTO_CHAIN (policy-filtered)
//     activeProvider: string | null, // first provider where status === "up"
//     openCircuitCount: number,
//     timestamp: number,
//   }
//
// Security: no secrets returned. Key presence is signalled as a boolean only.
// Rate-limited separately from the main AI route.

import { NextRequest } from "next/server";
import {
  getAllStats,
  getOpenCircuits,
  isCircuitOpen,
} from "@/lib/aiProviderHealth";
import {
  ANTHROPIC_DEFAULT_CHAT_MODEL,
  MINIMAX_DEFAULT_CHAT_MODEL,
  OPENAI_DEFAULT_CHAT_MODEL,
} from "@/lib/aiModelRouting";
import {
  applyRateLimitHeaders,
  checkRateLimit,
} from "@/lib/security/rateLimit";
import { protectedJson } from "@/lib/protectedApi";
import { isConfiguredSecretValue } from "@/lib/secretReadiness";
import { readAzureOpenAIConfig } from "@/lib/azureOpenAI";

// Import provider registry + chain from the AI route
// We duplicate the constants here rather than re-exporting from the route
// to avoid circular imports and keep the health endpoint standalone.

const FREE_PROVIDERS = new Set([
  "ollama",
  "turboquant",
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

const ALL_PROVIDERS_ORDER = [
  "ollama",
  "turboquant",
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
  "openrouter",
  "google",
  "minimax",
  "anthropic",
  "azure",
  "openai",
];

function readAzureDeployment() {
  const result = readAzureOpenAIConfig();
  return result.configured ? result.config.deployment : "—";
}

const PROVIDER_DEFAULT_MODELS: Record<string, string> = {
  ollama: "local",
  turboquant: process.env.NEXUS_TURBOQUANT_MODEL ?? "local-turboquant",
  cerebras: "qwen-3-235b-a22b-instruct-2507",
  groq: "qwen/qwen3-32b",
  sambanova: "DeepSeek-V3.2",
  nvidia: "qwen/qwen3-coder-480b-a35b-instruct",
  hyperbolic: "qwen/qwen3-coder-480b-a35b-instruct",
  together: "moonshotai/Kimi-K2.5",
  siliconflow: "Qwen/Qwen3-Coder-480B-A35B-Instruct",
  zai: "zai/glm-5",
  iflow: "deepseek-v3.2",
  deepinfra: "Qwen/Qwen3-235B-A22B",
  fireworks: "accounts/fireworks/models/qwen3-235b-a22b",
  scaleway: "devstral-2-123b-instruct-2512",
  qwen: "qwen3-coder-480b-a35b-instruct",
  huggingface: "deepseek-ai/DeepSeek-V3-0324",
  codestral: "codestral-latest",
  googleai: "gemma-3-27b-it",
  cloudflare: "@cf/moonshotai/kimi-k2.5",
  perplexity: "sonar-reasoning",
  openrouter: "qwen/qwen3-coder:free",
  google: "gemini-2.0-flash",
  minimax: MINIMAX_DEFAULT_CHAT_MODEL,
  anthropic: ANTHROPIC_DEFAULT_CHAT_MODEL,
  azure: "—",
  openai: OPENAI_DEFAULT_CHAT_MODEL,
};

const SWE_SCORES: Record<string, string> = {
  ollama: "—",
  turboquant: "—",
  cerebras: "S+ 70.0%",
  groq: "A+ 50.0%",
  sambanova: "S+ 73.1%",
  nvidia: "S+ 70.6%",
  hyperbolic: "S+ 70.6%",
  together: "S+ 76.8%",
  siliconflow: "S+ 70.6%",
  zai: "S+ 77.8%",
  iflow: "S+ 73.1%",
  deepinfra: "S+ 70.0%",
  fireworks: "S+ 70.0%",
  scaleway: "S+ 72.2%",
  qwen: "S+ 70.6%",
  huggingface: "S 62.0%",
  codestral: "B+ 34.0%",
  googleai: "B 22.0%",
  cloudflare: "S+ 76.8%",
  perplexity: "A 45.0%",
  openrouter: "S+ 70.6%",
  google: "—",
  minimax: "—",
  anthropic: "S+ 75.0%",
  azure: "—",
  openai: "—",
};

/** Check whether a provider's env key is set (boolean — never return the key itself). */
function hasKey(provider: string): boolean {
  switch (provider) {
    case "ollama":
      return true; // always "present" (localhost)
    case "turboquant":
      return (
        process.env.NEXUS_TURBOQUANT_ENABLED === "true" &&
        process.env.NEXUS_TURBOQUANT_MODE !== "off"
      );
    case "cerebras":
      return isConfiguredSecretValue(process.env.CEREBRAS_API_KEY);
    case "groq":
      return isConfiguredSecretValue(process.env.GROQ_API_KEY);
    case "sambanova":
      return isConfiguredSecretValue(process.env.SAMBANOVA_API_KEY);
    case "nvidia":
      return isConfiguredSecretValue(process.env.NVIDIA_API_KEY);
    case "hyperbolic":
      return isConfiguredSecretValue(process.env.HYPERBOLIC_API_KEY);
    case "together":
      return isConfiguredSecretValue(process.env.TOGETHER_API_KEY);
    case "siliconflow":
      return isConfiguredSecretValue(process.env.SILICONFLOW_API_KEY);
    case "zai":
      return isConfiguredSecretValue(process.env.ZAI_API_KEY);
    case "iflow":
      return isConfiguredSecretValue(process.env.IFLOW_API_KEY);
    case "deepinfra":
      return isConfiguredSecretValue(process.env.DEEPINFRA_API_KEY);
    case "fireworks":
      return isConfiguredSecretValue(process.env.FIREWORKS_API_KEY);
    case "scaleway":
      return isConfiguredSecretValue(process.env.SCALEWAY_API_KEY);
    case "qwen":
      return isConfiguredSecretValue(process.env.DASHSCOPE_API_KEY);
    case "huggingface":
      return isConfiguredSecretValue(process.env.HUGGINGFACE_API_KEY);
    case "codestral":
      return isConfiguredSecretValue(process.env.CODESTRAL_API_KEY);
    case "googleai":
      return isConfiguredSecretValue(process.env.GOOGLE_AI_KEY);
    case "cloudflare":
      return (
        isConfiguredSecretValue(process.env.CLOUDFLARE_API_TOKEN) &&
        isConfiguredSecretValue(process.env.CLOUDFLARE_ACCOUNT_ID)
      );
    case "perplexity":
      return isConfiguredSecretValue(process.env.PERPLEXITY_API_KEY);
    case "openrouter":
      return isConfiguredSecretValue(process.env.OPENROUTER_API_KEY);
    case "google":
      return isConfiguredSecretValue(process.env.GOOGLE_AI_KEY);
    case "minimax":
      return isConfiguredSecretValue(process.env.MINIMAX_API_KEY);
    case "anthropic":
      return isConfiguredSecretValue(process.env.ANTHROPIC_API_KEY);
    case "azure":
      return readAzureOpenAIConfig().configured;
    case "openai":
      return isConfiguredSecretValue(process.env.OPENAI_API_KEY);
    default:
      return false;
  }
}

type ProviderStatus = "up" | "circuit-open" | "no-key" | "paid-gated";

interface ProviderHealth {
  name: string;
  status: ProviderStatus;
  free: boolean;
  hasKey: boolean;
  model: string;
  sweScore: string;
  score: number;
  consecutiveFails: number;
  totalSuccesses: number;
  totalFailures: number;
  avgResponseMs: number;
  circuitOpenAt: number; // 0 = closed
  cooldownRemainingMs: number; // 0 = closed
  lastSuccessAt: number;
  lastFailAt: number;
}

function computeCooldownRemaining(
  circuitOpenAt: number,
  consecutiveFails: number,
): number {
  if (circuitOpenAt === 0) return 0;
  const STEPS = [2, 5, 15, 30].map((m) => m * 60_000);
  const cd =
    STEPS[Math.min(consecutiveFails - 1, STEPS.length - 1)] ?? STEPS[0];
  const rem = cd - (Date.now() - circuitOpenAt);
  return Math.max(0, rem);
}

export async function GET(req: NextRequest) {
  const rateLimitConfig = {
    bucket: "api-health",
    windowMs: 10_000,
    maxAttempts: 20,
    includeBearerToken: false,
  } as const;
  const rateLimit = checkRateLimit(req, rateLimitConfig);
  if (!rateLimit.ok) {
    const res = protectedJson(
      { error: { message: "Health endpoint rate limit exceeded." } },
      { status: 429 },
    );
    applyRateLimitHeaders(res, rateLimitConfig, rateLimit.retryAfterSec);
    return res;
  }

  const ALLOW_PAID = process.env.NEXUS_ALLOW_PAID_APIS === "true";
  const allStats = getAllStats();
  const openInfos = getOpenCircuits();
  const openMap = Object.fromEntries(openInfos.map((c) => [c.provider, c]));

  const providers: ProviderHealth[] = ALL_PROVIDERS_ORDER.map((name) => {
    const stats = allStats[name];
    const keySet = hasKey(name);
    const free = FREE_PROVIDERS.has(name);
    const circuitInfo = openMap[name];
    const circuitOpen = isCircuitOpen(name);

    let status: ProviderStatus;
    if (!free && !ALLOW_PAID) status = "paid-gated";
    else if (!keySet) status = "no-key";
    else if (circuitOpen) status = "circuit-open";
    else status = "up";

    return {
      name,
      status,
      free,
      hasKey: keySet,
      model:
        name === "azure"
          ? readAzureDeployment()
          : (PROVIDER_DEFAULT_MODELS[name] ?? "—"),
      sweScore: SWE_SCORES[name] ?? "—",
      score: stats?.score ?? 0.5,
      consecutiveFails: stats?.consecutiveFails ?? 0,
      totalSuccesses: stats?.totalSuccesses ?? 0,
      totalFailures: stats?.totalFailures ?? 0,
      avgResponseMs: stats?.avgResponseMs ?? 0,
      circuitOpenAt: stats?.circuitOpenAt ?? 0,
      cooldownRemainingMs: circuitInfo
        ? computeCooldownRemaining(
            circuitInfo.circuitOpenAt,
            circuitInfo.consecutiveFails,
          )
        : 0,
      lastSuccessAt: stats?.lastSuccessAt ?? 0,
      lastFailAt: stats?.lastFailAt ?? 0,
    };
  });

  const upProviders = providers.filter((p) => p.status === "up");
  const activeProvider = upProviders[0]?.name ?? null;

  const body = {
    providers,
    chain: ALL_PROVIDERS_ORDER.filter(
      (p) => FREE_PROVIDERS.has(p) || ALLOW_PAID,
    ),
    activeProvider,
    openCircuitCount: openInfos.length,
    freeProviderCount: providers.filter((p) => p.free && p.hasKey).length,
    upCount: upProviders.length,
    timestamp: Date.now(),
  };

  const res = protectedJson(body);
  applyRateLimitHeaders(res, rateLimitConfig);
  return res;
}
