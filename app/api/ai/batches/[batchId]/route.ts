import { NextRequest } from "next/server";
import { protectedJson } from "@/lib/protectedApi";
import { pollAnthropicNativeBatch } from "@/lib/anthropicBatches";

export const dynamic = "force-dynamic";

type Params = {
  params: { batchId: string };
};

export async function GET(_req: NextRequest, { params }: Params) {
  const batchId = params.batchId?.trim() ?? "";
  if (!batchId) {
    return protectedJson({ error: "missing batch id" }, { status: 400 });
  }

  try {
    const batch = await pollAnthropicNativeBatch(batchId);
    return protectedJson({
      status: "ok",
      provider: batch.provider,
      model: batch.model,
      batchId: batch.batchId,
      processingStatus: batch.processingStatus,
      requestCount: batch.requestCount,
      results: batch.results,
    });
  } catch (error) {
    return protectedJson(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to poll native Anthropic batch.",
      },
      { status: 500 },
    );
  }
}
