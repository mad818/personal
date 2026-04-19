import type { AssistantCapabilityId } from "@/lib/assistantCapabilityRegistry";

export type AssistantLiveRetrievalDomain =
  | "markets"
  | "news"
  | "cyber"
  | "project"
  | "open_web"
  | "unverified";

export interface AssistantLiveRetrievalCitation {
  label: string;
  url: string;
  source: string;
  publishedAt?: string | null;
}

export interface AssistantLiveRetrievalResult {
  query: string;
  domain: AssistantLiveRetrievalDomain;
  verified: boolean;
  degraded: boolean;
  summary: string;
  observed: string[];
  verifyNext: string[];
  warnings: string[];
  citations: AssistantLiveRetrievalCitation[];
  capabilityId: AssistantCapabilityId | null;
  preparedWorkspaceHref: string | null;
}

export function buildAssistantLiveRetrievalPromptBlock(
  result: AssistantLiveRetrievalResult | null | undefined,
) {
  if (!result) return "";

  const lines = [
    "",
    "[HQ VERIFIED LIVE RETRIEVAL]",
    `Verification status: ${result.verified ? "verified" : "unverified / degraded"}.`,
    `Domain: ${result.domain}.`,
    `Summary: ${result.summary}`,
  ];

  if (result.observed.length > 0) {
    lines.push("- Observed:");
    lines.push(...result.observed.map((item) => `  • ${item}`));
  }

  if (result.citations.length > 0) {
    lines.push("- Sources:");
    lines.push(
      ...result.citations.map((citation) => {
        const stamp = citation.publishedAt ? ` (${citation.publishedAt})` : "";
        return `  • ${citation.source}: ${citation.label}${stamp} — ${citation.url}`;
      }),
    );
  }

  if (result.warnings.length > 0) {
    lines.push("- Retrieval warnings:");
    lines.push(...result.warnings.map((warning) => `  • ${warning}`));
  }

  lines.push(
    "- Use this retrieval block instead of fabricating current-state claims.",
    "- If the answer remains unverified, say that explicitly and bound the confidence.",
    "[END HQ VERIFIED LIVE RETRIEVAL]",
    "",
  );

  return lines.join("\n");
}

export function buildAssistantLiveRetrievalFallback(
  result: AssistantLiveRetrievalResult | null | undefined,
) {
  if (result?.summary?.trim()) {
    return `I could not fully verify this live query in the current run. Treat the answer below as unverified.\n\n${result.summary}`;
  }
  return "I could not fully verify this live query in the current run, so treat the answer below as unverified.";
}
