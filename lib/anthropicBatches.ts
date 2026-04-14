import "server-only";

import { ANTHROPIC_DEFAULT_CHAT_MODEL } from "@/lib/aiModelRouting";
import { patchProcessEnvFromFile } from "@/lib/serverEnvRuntime";

export interface AnthropicNativeBatchItem {
  id: string;
  name: string;
  prompt: string;
}

export interface AnthropicNativeBatchSubmission {
  batchId: string;
  provider: "anthropic";
  model: string;
  processingStatus: string;
  requestCount: number;
}

export interface AnthropicNativeBatchResult {
  id: string;
  status: "ok" | "error";
  content: string;
}

export interface AnthropicNativeBatchPoll {
  batchId: string;
  provider: "anthropic";
  model: string;
  processingStatus: string;
  requestCount: number;
  results: AnthropicNativeBatchResult[];
}

export interface AnthropicNativeBatchPosture {
  provider: "anthropic";
  nativeReady: boolean;
  mode: "provider_native" | "internal_fallback";
  featureEnabled: boolean;
  paidApisAllowed: boolean;
  apiKeyConfigured: boolean;
  reason: string;
}

export async function readAnthropicNativeBatchAvailability() {
  await patchProcessEnvFromFile();
  const enabled = process.env.NEXUS_ENABLE_ANTHROPIC_NATIVE_BATCHES === "true";
  const allowPaidApis = process.env.NEXUS_ALLOW_PAID_APIS === "true";
  const apiKey = process.env.ANTHROPIC_API_KEY ?? "";

  if (!enabled) {
    return {
      ok: false as const,
      reason: "Anthropic native batches are disabled.",
    };
  }
  if (!allowPaidApis) {
    return {
      ok: false as const,
      reason: "Anthropic native batches require NEXUS_ALLOW_PAID_APIS=true.",
    };
  }
  if (!apiKey) {
    return {
      ok: false as const,
      reason: "ANTHROPIC_API_KEY is not configured.",
    };
  }

  return {
    ok: true as const,
    apiKey,
  };
}

export async function readAnthropicNativeBatchPosture(): Promise<AnthropicNativeBatchPosture> {
  await patchProcessEnvFromFile();
  const featureEnabled =
    process.env.NEXUS_ENABLE_ANTHROPIC_NATIVE_BATCHES === "true";
  const paidApisAllowed = process.env.NEXUS_ALLOW_PAID_APIS === "true";
  const apiKeyConfigured = Boolean(process.env.ANTHROPIC_API_KEY ?? "");

  if (!featureEnabled) {
    return {
      provider: "anthropic",
      nativeReady: false,
      mode: "internal_fallback",
      featureEnabled,
      paidApisAllowed,
      apiKeyConfigured,
      reason:
        "Native Anthropic batches are disabled. Scheduler missions will stay on the internal batch lane.",
    };
  }

  if (!paidApisAllowed) {
    return {
      provider: "anthropic",
      nativeReady: false,
      mode: "internal_fallback",
      featureEnabled,
      paidApisAllowed,
      apiKeyConfigured,
      reason:
        "Paid-provider use is disabled. Scheduler missions will stay on the internal batch lane until NEXUS_ALLOW_PAID_APIS=true.",
    };
  }

  if (!apiKeyConfigured) {
    return {
      provider: "anthropic",
      nativeReady: false,
      mode: "internal_fallback",
      featureEnabled,
      paidApisAllowed,
      apiKeyConfigured,
      reason:
        "ANTHROPIC_API_KEY is not configured. Scheduler missions will stay on the internal batch lane.",
    };
  }

  return {
    provider: "anthropic",
    nativeReady: true,
    mode: "provider_native",
    featureEnabled,
    paidApisAllowed,
    apiKeyConfigured,
    reason:
      "Native Anthropic batches are available. Eligible scheduled mission groups can queue through the protected local native-batch lane.",
  };
}

function anthropicHeaders(apiKey: string) {
  return {
    "Content-Type": "application/json",
    "x-api-key": apiKey,
    "anthropic-version": "2023-06-01",
    "anthropic-beta": "prompt-caching-2024-07-31",
  };
}

function extractTextFromAnthropicContent(content: unknown): string {
  if (typeof content === "string") return content.trim();
  if (!Array.isArray(content)) return "";
  return content
    .map((item) => {
      if (
        typeof item === "object" &&
        item !== null &&
        "type" in item &&
        (item as { type?: unknown }).type === "text" &&
        "text" in item &&
        typeof (item as { text?: unknown }).text === "string"
      ) {
        return ((item as { text: string }).text ?? "").trim();
      }
      return "";
    })
    .filter(Boolean)
    .join("\n\n")
    .trim();
}

function parseJsonlResults(payload: string): AnthropicNativeBatchResult[] {
  return payload
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line) as {
          custom_id?: unknown;
          result?: {
            type?: unknown;
            message?: { content?: unknown };
            error?: { message?: unknown };
          };
        };
      } catch {
        return null;
      }
    })
    .filter(
      (
        item,
      ): item is {
        custom_id?: unknown;
        result?: {
          type?: unknown;
          message?: { content?: unknown };
          error?: { message?: unknown };
        };
      } => Boolean(item),
    )
    .map<AnthropicNativeBatchResult>((item) => {
      const id = String(item.custom_id ?? "").trim();
      const resultType = String(item.result?.type ?? "").trim().toLowerCase();
      if (resultType === "succeeded") {
        return {
          id,
          status: "ok",
          content: extractTextFromAnthropicContent(item.result?.message?.content),
        };
      }
      return {
        id,
        status: "error",
        content:
          String(item.result?.error?.message ?? "").trim() ||
          `Anthropic batch result: ${resultType || "error"}.`,
      };
    })
    .filter((item) => item.id.length > 0);
}

export async function submitAnthropicNativeBatch(input: {
  systemPrompt: string;
  sharedPrefix?: string;
  items: AnthropicNativeBatchItem[];
  maxTokens: number;
  model?: string;
}): Promise<AnthropicNativeBatchSubmission> {
  const availability = await readAnthropicNativeBatchAvailability();
  if (!availability.ok) {
    throw new Error(availability.reason);
  }

  const model = input.model?.trim() || ANTHROPIC_DEFAULT_CHAT_MODEL;
  const requests = input.items.map((item) => ({
    custom_id: item.id,
    params: {
      model,
      max_tokens: input.maxTokens,
      system: input.systemPrompt
        ? [
            {
              type: "text",
              text: input.systemPrompt,
              cache_control: { type: "ephemeral" as const },
            },
          ]
        : undefined,
      messages: [
        {
          role: "user",
          content: input.sharedPrefix?.trim()
            ? [
                {
                  type: "text",
                  text: input.sharedPrefix.trim(),
                  cache_control: { type: "ephemeral" as const },
                },
                {
                  type: "text",
                  text: item.prompt.trim(),
                },
              ]
            : item.prompt.trim(),
        },
      ],
    },
  }));

  const response = await fetch("https://api.anthropic.com/v1/messages/batches", {
    method: "POST",
    headers: anthropicHeaders(availability.apiKey),
    body: JSON.stringify({ requests }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `Anthropic batch submit failed (${response.status}): ${text.slice(0, 240)}`,
    );
  }

  const data = (await response.json()) as {
    id?: unknown;
    processing_status?: unknown;
    request_counts?: { processing?: unknown; succeeded?: unknown; errored?: unknown };
  };

  return {
    batchId: String(data.id ?? "").trim(),
    provider: "anthropic",
    model,
    processingStatus: String(data.processing_status ?? "in_progress"),
    requestCount: input.items.length,
  };
}

export async function pollAnthropicNativeBatch(
  batchId: string,
): Promise<AnthropicNativeBatchPoll> {
  const availability = await readAnthropicNativeBatchAvailability();
  if (!availability.ok) {
    throw new Error(availability.reason);
  }

  const batchResponse = await fetch(
    `https://api.anthropic.com/v1/messages/batches/${encodeURIComponent(batchId)}`,
    {
      headers: anthropicHeaders(availability.apiKey),
      cache: "no-store",
    },
  );

  if (!batchResponse.ok) {
    const text = await batchResponse.text();
    throw new Error(
      `Anthropic batch poll failed (${batchResponse.status}): ${text.slice(0, 240)}`,
    );
  }

  const batchData = (await batchResponse.json()) as {
    id?: unknown;
    processing_status?: unknown;
    request_counts?: {
      processing?: unknown;
      succeeded?: unknown;
      errored?: unknown;
      canceled?: unknown;
      expired?: unknown;
    };
    results_url?: unknown;
  };

  let results: AnthropicNativeBatchResult[] = [];
  if (
    String(batchData.processing_status ?? "").trim().toLowerCase() === "ended" &&
    typeof batchData.results_url === "string" &&
    batchData.results_url.trim().length > 0
  ) {
    const resultsResponse = await fetch(batchData.results_url, {
      headers: anthropicHeaders(availability.apiKey),
      cache: "no-store",
    });
    if (!resultsResponse.ok) {
      const text = await resultsResponse.text();
      throw new Error(
        `Anthropic batch results failed (${resultsResponse.status}): ${text.slice(0, 240)}`,
      );
    }
    results = parseJsonlResults(await resultsResponse.text());
  }

  const totalRequests =
    Number(batchData.request_counts?.processing ?? 0) +
    Number(batchData.request_counts?.succeeded ?? 0) +
    Number(batchData.request_counts?.errored ?? 0) +
    Number(batchData.request_counts?.canceled ?? 0) +
    Number(batchData.request_counts?.expired ?? 0);

  return {
    batchId: String(batchData.id ?? batchId).trim(),
    provider: "anthropic",
    model: ANTHROPIC_DEFAULT_CHAT_MODEL,
    processingStatus: String(batchData.processing_status ?? "unknown"),
    requestCount: Number.isFinite(totalRequests) && totalRequests > 0 ? totalRequests : results.length,
    results,
  };
}
