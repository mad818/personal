import { isConfiguredSecretValue } from "./secretReadiness.ts";

const AZURE_OPENAI_HOST_SUFFIXES = [
  ".openai.azure.com",
  ".services.ai.azure.com",
] as const;

const AZURE_OPENAI_BASE_PATH = "/openai/v1";
const AZURE_OPENAI_CHAT_PATH = `${AZURE_OPENAI_BASE_PATH}/chat/completions`;
const DEPLOYMENT_NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;

export interface AzureOpenAIConfig {
  apiKey: string;
  baseUrl: string;
  chatCompletionsUrl: string;
  deployment: string;
}

export type AzureOpenAIConfigResult =
  | { configured: true; config: AzureOpenAIConfig; reason: null }
  | {
      configured: false;
      config: null;
      reason:
        | "missing-key"
        | "missing-endpoint"
        | "missing-deployment"
        | "invalid-endpoint"
        | "invalid-deployment";
    };

function isAzureOpenAIHostname(hostname: string) {
  const normalized = hostname.trim().toLowerCase();
  return AZURE_OPENAI_HOST_SUFFIXES.some((suffix) =>
    normalized.endsWith(suffix),
  );
}

export function normalizeAzureOpenAIEndpoint(rawEndpoint: string) {
  let endpoint: URL;
  try {
    endpoint = new URL(rawEndpoint.trim());
  } catch {
    throw new Error("Azure OpenAI endpoint is invalid.");
  }

  if (endpoint.protocol !== "https:") {
    throw new Error("Azure OpenAI endpoint must use HTTPS.");
  }
  if (endpoint.username || endpoint.password) {
    throw new Error("Credential-bearing Azure OpenAI endpoints are blocked.");
  }
  if (endpoint.port || endpoint.search || endpoint.hash) {
    throw new Error(
      "Azure OpenAI endpoint cannot include a port, query, or fragment.",
    );
  }
  if (!isAzureOpenAIHostname(endpoint.hostname)) {
    throw new Error("Azure OpenAI endpoint must use an approved Azure host.");
  }

  const normalizedPath =
    endpoint.pathname.replace(/\/+$/, "") || AZURE_OPENAI_BASE_PATH;
  if (
    normalizedPath !== AZURE_OPENAI_BASE_PATH &&
    normalizedPath !== AZURE_OPENAI_CHAT_PATH
  ) {
    throw new Error(
      "Azure OpenAI endpoint must end with /openai/v1 or /openai/v1/chat/completions.",
    );
  }

  endpoint.pathname = AZURE_OPENAI_BASE_PATH;
  const baseUrl = `${endpoint.toString().replace(/\/+$/, "")}/`;
  endpoint.pathname = AZURE_OPENAI_CHAT_PATH;
  const chatCompletionsUrl = endpoint.toString();

  return { baseUrl, chatCompletionsUrl };
}

export function normalizeAzureOpenAIDeployment(rawDeployment: string) {
  const deployment = rawDeployment.trim();
  if (!DEPLOYMENT_NAME_PATTERN.test(deployment)) {
    throw new Error("Azure OpenAI deployment name is invalid.");
  }
  return deployment;
}

export function readAzureOpenAIConfig(
  env: Record<string, string | undefined> = process.env,
): AzureOpenAIConfigResult {
  const apiKey = String(env.AZURE_OPENAI_API_KEY ?? "").trim();
  const rawEndpoint = String(env.AZURE_OPENAI_ENDPOINT ?? "").trim();
  const rawDeployment = String(env.AZURE_OPENAI_DEPLOYMENT ?? "").trim();

  if (!isConfiguredSecretValue(apiKey)) {
    return { configured: false, config: null, reason: "missing-key" };
  }
  if (!rawEndpoint) {
    return { configured: false, config: null, reason: "missing-endpoint" };
  }
  if (!rawDeployment) {
    return { configured: false, config: null, reason: "missing-deployment" };
  }

  let endpoint: ReturnType<typeof normalizeAzureOpenAIEndpoint>;
  try {
    endpoint = normalizeAzureOpenAIEndpoint(rawEndpoint);
  } catch {
    return { configured: false, config: null, reason: "invalid-endpoint" };
  }

  let deployment: string;
  try {
    deployment = normalizeAzureOpenAIDeployment(rawDeployment);
  } catch {
    return { configured: false, config: null, reason: "invalid-deployment" };
  }

  return {
    configured: true,
    config: {
      apiKey,
      baseUrl: endpoint.baseUrl,
      chatCompletionsUrl: endpoint.chatCompletionsUrl,
      deployment,
    },
    reason: null,
  };
}

export function isAzureOpenAIConfigured(
  env: Record<string, string | undefined> = process.env,
) {
  return readAzureOpenAIConfig(env).configured;
}
