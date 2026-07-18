import { apiFetch } from "@/lib/apiFetch";
import type {
  FeynmanResearchWatchReceipt,
  FeynmanResearchWatchRecord,
} from "@/lib/feynmanResearchWatch";

export const FEYNMAN_RESEARCH_WATCH_CLIENT_TEMPLATE_ID = "watch";

type WatchRunResponse = {
  watch: FeynmanResearchWatchRecord;
  receipt: FeynmanResearchWatchReceipt;
  networkUsed: boolean;
};

async function readWatchResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => null)) as
    | (T & { error?: string })
    | null;
  if (!response.ok || !payload) {
    throw new Error(
      payload?.error || `Feynman research watch failed (${response.status}).`,
    );
  }
  return payload;
}

export function extractFeynmanResearchWatchTopic(prompt: string) {
  const match = prompt.match(
    /^Use feynman_research with workflow "watch" for:\s*([^\r\n]+)/i,
  );
  const topic = match?.[1]?.trim() ?? "";
  if (!topic) throw new Error("Scheduled research watch topic is missing.");
  return topic;
}

export function summarizeFeynmanResearchWatchRun(result: WatchRunResponse) {
  const { receipt } = result;
  if (receipt.status === "baseline") {
    return `Research watch baseline saved with ${receipt.entryCount} paper(s); review in VAULT Papers.`;
  }
  if (receipt.status === "cached") {
    return `Research watch reused the daily arXiv cache (${receipt.entryCount} paper(s)); review in VAULT Papers.`;
  }
  if (receipt.status === "changed") {
    return `Research watch found ${receipt.newCount} new and ${receipt.updatedCount} updated paper(s); review in VAULT Papers.`;
  }
  return `Research watch found no material paper changes across ${receipt.entryCount} result(s); review in VAULT Papers.`;
}

export async function runFeynmanResearchWatchClient(input: {
  id: string;
  topic: string;
}) {
  const response = await apiFetch("/api/feynman/watch/run", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return readWatchResponse<WatchRunResponse>(response);
}
