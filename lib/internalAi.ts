import { buildInternalApiHeaders } from "@/lib/authSession";

export type InternalAiMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type InternalAiCallOptions = {
  origin: string;
  messages: InternalAiMessage[];
  maxTokens?: number;
  task?: string;
  timeoutMs?: number;
};

export type InternalAiCallResult = {
  ok: boolean;
  status: number;
  payload: unknown;
  text: string;
};

export function extractInternalAiText(payload: unknown): string {
  const data = payload as {
    content?: unknown;
    choices?: Array<{ message?: { content?: unknown } }>;
    text?: unknown;
    result?: unknown;
  };

  if (typeof data.content === "string") return data.content;
  if (Array.isArray(data.content)) {
    return data.content
      .map((item) =>
        item &&
        typeof item === "object" &&
        typeof (item as { text?: unknown }).text === "string"
          ? (item as { text: string }).text
          : "",
      )
      .join("");
  }

  const choiceText = data.choices?.[0]?.message?.content;
  if (typeof choiceText === "string") return choiceText;
  if (typeof data.text === "string") return data.text;
  if (typeof data.result === "string") return data.result;
  return "";
}

export async function callInternalAi(
  opts: InternalAiCallOptions,
): Promise<InternalAiCallResult> {
  const response = await fetch(new URL("/api/ai", opts.origin), {
    method: "POST",
    headers: buildInternalApiHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({
      messages: opts.messages,
      max_tokens: opts.maxTokens ?? 512,
      ...(opts.task ? { task: opts.task } : {}),
    }),
    signal: AbortSignal.timeout(opts.timeoutMs ?? 30_000),
  });

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  return {
    ok: response.ok,
    status: response.status,
    payload,
    text: extractInternalAiText(payload),
  };
}
