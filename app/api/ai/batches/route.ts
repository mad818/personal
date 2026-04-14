import { NextRequest } from "next/server";
import { protectedJson } from "@/lib/protectedApi";
import {
  readAnthropicNativeBatchPosture,
  submitAnthropicNativeBatch,
} from "@/lib/anthropicBatches";
import { ANTHROPIC_DEFAULT_CHAT_MODEL } from "@/lib/aiModelRouting";

export const dynamic = "force-dynamic";

export async function GET() {
  const posture = await readAnthropicNativeBatchPosture();
  return protectedJson({
    status: "ok",
    provider: posture.provider,
    nativeReady: posture.nativeReady,
    mode: posture.mode,
    featureEnabled: posture.featureEnabled,
    paidApisAllowed: posture.paidApisAllowed,
    apiKeyConfigured: posture.apiKeyConfigured,
    reason: posture.reason,
    note: "This route reports only local posture for the optional native Anthropic batch lane. Secrets stay private and free-first installs continue to use the internal batch path.",
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      provider?: unknown;
      system?: unknown;
      sharedPrefix?: unknown;
      items?: unknown;
      max_tokens?: unknown;
      model?: unknown;
    };

    if (body.provider !== "anthropic") {
      return protectedJson(
        { error: "only anthropic native batches are supported" },
        { status: 400 },
      );
    }

    const items = Array.isArray(body.items)
      ? body.items
          .filter(
            (item): item is { id?: unknown; name?: unknown; prompt?: unknown } =>
              typeof item === "object" && item !== null,
          )
          .map((item) => ({
            id: String(item.id ?? "").trim(),
            name: String(item.name ?? "").trim(),
            prompt: String(item.prompt ?? "").trim(),
          }))
          .filter((item) => item.id.length > 0 && item.prompt.length > 0)
      : [];

    if (items.length === 0) {
      return protectedJson(
        { error: "native batch submit requires at least one item" },
        { status: 400 },
      );
    }

    const submission = await submitAnthropicNativeBatch({
      systemPrompt: String(body.system ?? ""),
      sharedPrefix: String(body.sharedPrefix ?? ""),
      items,
      maxTokens: Math.min(
        4096,
        Math.max(128, parseInt(String(body.max_tokens ?? "900"), 10) || 900),
      ),
      model:
        typeof body.model === "string" && body.model.trim().length > 0
          ? body.model.trim()
          : ANTHROPIC_DEFAULT_CHAT_MODEL,
    });

    return protectedJson({
      status: "ok",
      provider: submission.provider,
      model: submission.model,
      batchId: submission.batchId,
      processingStatus: submission.processingStatus,
      requestCount: submission.requestCount,
      note: "Native Anthropic batching is optional, queued, and local-scheduler-driven. Free-first installs remain on the internal batch lane unless this path is explicitly enabled.",
    });
  } catch (error) {
    return protectedJson(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to submit native Anthropic batch.",
      },
      { status: 500 },
    );
  }
}
