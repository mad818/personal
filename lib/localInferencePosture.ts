import type { NetworkMode } from "@/lib/security/routePolicy";

export type InferencePosture = "ready" | "degraded" | "hosted_opt_in";

export type LocalInferenceTask = "chat" | "research" | "code";

export const LOCAL_INFERENCE_PROVIDERS = ["ollama", "turboquant"] as const;

export const LOCAL_INFERENCE_CHAINS: Record<
  LocalInferenceTask,
  readonly string[]
> = {
  chat: LOCAL_INFERENCE_PROVIDERS,
  research: LOCAL_INFERENCE_PROVIDERS,
  code: LOCAL_INFERENCE_PROVIDERS,
};

const DEFAULT_OLLAMA_CHAT_URL = "http://localhost:11434/v1/chat/completions";

function envBool(value: string | undefined, fallback = false) {
  if (typeof value !== "string") return fallback;
  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
}

export function readLocalInferenceStrictMode(
  env: Record<string, string | undefined> = process.env,
) {
  return envBool(env.NEXUS_LOCAL_INFERENCE_STRICT, true);
}

export function readOllamaTailnetAllowed(
  env: Record<string, string | undefined> = process.env,
) {
  return envBool(env.NEXUS_OLLAMA_ALLOW_TAILNET);
}

export function validateOllamaEndpoint(
  rawEndpoint: string,
  options?: { allowTailnet?: boolean },
) {
  let parsed: URL;
  try {
    parsed = new URL(rawEndpoint);
  } catch {
    throw new Error("Ollama endpoint is invalid.");
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Ollama endpoint must use HTTP or HTTPS.");
  }
  if (parsed.username || parsed.password) {
    throw new Error("Credential-bearing Ollama endpoints are blocked.");
  }
  const host = parsed.hostname.toLowerCase();
  const loopback =
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "::1" ||
    host === "[::1]";
  const tailnet = host.endsWith(".ts.net");
  const allowTailnet = options?.allowTailnet ?? readOllamaTailnetAllowed();
  if (!loopback && !(allowTailnet && tailnet)) {
    throw new Error(
      "Ollama endpoint must be loopback unless tailnet access is explicitly enabled.",
    );
  }
  return parsed;
}

export function normalizeOllamaEndpoint(
  rawEndpoint: string | null | undefined,
  options?: { allowTailnet?: boolean },
) {
  const normalized = String(rawEndpoint ?? "").trim();
  if (!normalized) return DEFAULT_OLLAMA_CHAT_URL;
  return validateOllamaEndpoint(normalized, options).toString();
}

export interface ResolveInferencePostureInput {
  networkMode: NetworkMode;
  paidApisAllowed: boolean;
  ollamaReachable: boolean;
  resolvedModel: string | null;
  aiMode?: "claude" | "local" | "auto";
  aiProvider?: string;
}

export function resolveInferencePosture(
  input: ResolveInferencePostureInput,
): InferencePosture {
  const hostedOptIn =
    input.networkMode !== "isolated" &&
    input.paidApisAllowed &&
    (input.aiMode === "claude" ||
      input.aiProvider === "anthropic" ||
      input.aiProvider === "azure" ||
      input.aiProvider === "openai" ||
      input.aiProvider === "minimax");

  if (hostedOptIn) return "hosted_opt_in";
  if (input.ollamaReachable && input.resolvedModel) return "ready";
  return "degraded";
}

export interface CloudEscalationInput {
  networkMode: NetworkMode;
  paidApisAllowed: boolean;
  aiMode?: "claude" | "local" | "auto";
  aiProvider?: string;
  strictLocalInference?: boolean;
}

export function shouldAllowCloudEscalation(input: CloudEscalationInput) {
  if (input.aiMode === "local") return false;
  if (input.networkMode === "isolated") return false;
  if (!input.paidApisAllowed) return false;
  if (input.strictLocalInference ?? readLocalInferenceStrictMode()) {
    if (input.aiMode === "auto") return false;
    if (input.aiProvider === "ollama" || !input.aiProvider) return false;
  }
  return true;
}

export function resolveProviderChainForTask(options: {
  task?: string;
  localOnlyMode: boolean;
  paidApisAllowed: boolean;
  explicitProvider?: string | null;
  autoChain: readonly string[];
  researchChain: readonly string[];
}) {
  if (options.explicitProvider) return [options.explicitProvider];
  const useLocalFirst =
    options.localOnlyMode ||
    !options.paidApisAllowed ||
    readLocalInferenceStrictMode();
  if (options.task === "research") {
    return useLocalFirst
      ? [...LOCAL_INFERENCE_CHAINS.research]
      : [...options.researchChain];
  }
  return useLocalFirst
    ? [...LOCAL_INFERENCE_CHAINS.chat]
    : [...options.autoChain];
}

export function buildLocalInferenceRecoveryMessage() {
  return {
    code: "ollama_unavailable" as const,
    message:
      "Local Ollama is not reachable. Start `ollama serve`, install a model, then retry. Intel dashboards remain available.",
    recoveryAction:
      "Run `ollama serve`, pull a model (`ollama pull qwen3:8b`), and use Check local AI in HQ.",
  };
}
