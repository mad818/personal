export type FeedSignalState = "live" | "retained" | "unavailable" | "awaiting";

export interface FeedSignalStatus {
  lastAttemptAt: number | null;
  lastSuccessAt: number | null;
  lastFailureAt: number | null;
  lastError: string | null;
}

export interface FeedSignalItem {
  key: string;
  state: FeedSignalState;
  status: FeedSignalStatus;
}

export interface FeedSignalSummary {
  counts: Record<FeedSignalState, number>;
  items: FeedSignalItem[];
}

export const MAX_UPSTREAM_FEED_BYTES = 8 * 1024 * 1024;

export async function readBoundedUpstreamText(
  response: Response,
  maxBytes = MAX_UPSTREAM_FEED_BYTES,
): Promise<string> {
  if (!Number.isSafeInteger(maxBytes) || maxBytes <= 0) {
    throw new Error("Upstream body byte limit must be a positive integer.");
  }

  const contentLength = response.headers.get("content-length");
  if (contentLength && /^\d+$/.test(contentLength)) {
    const declaredBytes = Number(contentLength);
    if (declaredBytes > maxBytes) {
      await response.body?.cancel().catch(() => undefined);
      throw new Error(`Upstream response exceeded ${maxBytes} bytes.`);
    }
  }

  if (!response.body) return "";

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let receivedBytes = 0;
  let text = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    receivedBytes += value.byteLength;
    if (receivedBytes > maxBytes) {
      await reader.cancel().catch(() => undefined);
      throw new Error(`Upstream response exceeded ${maxBytes} bytes.`);
    }
    text += decoder.decode(value, { stream: true });
  }

  return text + decoder.decode();
}

export async function readBoundedUpstreamJson<T>(
  response: Response,
  maxBytes = MAX_UPSTREAM_FEED_BYTES,
): Promise<T> {
  const text = await readBoundedUpstreamText(response, maxBytes);
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error("Upstream response contained invalid JSON.");
  }
}

export async function readJsonFeedResponse<T>(
  response: Response,
  validate: (value: unknown) => value is T,
  unavailableMessage: string,
): Promise<T> {
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new Error(unavailableMessage);
  }

  if (!response.ok || !validate(payload)) {
    throw new Error(unavailableMessage);
  }
  return payload;
}

export function combineFeedAbortSignals(
  parentSignal: AbortSignal | undefined,
  timeoutMs: number,
): AbortSignal {
  const timeoutSignal = AbortSignal.timeout(timeoutMs);
  if (!parentSignal) return timeoutSignal;
  return AbortSignal.any([parentSignal, timeoutSignal]);
}

export function isDedupeSafeGet(
  method: string,
  options: Pick<RequestInit, "body" | "cache" | "signal">,
): boolean {
  return (
    method.toUpperCase() === "GET" &&
    options.signal == null &&
    options.body == null &&
    options.cache !== "no-store" &&
    options.cache !== "reload"
  );
}

function resolveFeedSignalState(status: FeedSignalStatus): FeedSignalState {
  if (status.lastError) {
    return status.lastSuccessAt == null ? "unavailable" : "retained";
  }
  if (status.lastSuccessAt != null) return "live";
  return "awaiting";
}

export function summarizeFeedSignals(
  statuses: Record<string, FeedSignalStatus>,
): FeedSignalSummary {
  const counts: Record<FeedSignalState, number> = {
    live: 0,
    retained: 0,
    unavailable: 0,
    awaiting: 0,
  };
  const items = Object.entries(statuses).map(([key, status]) => {
    const state = resolveFeedSignalState(status);
    counts[state] += 1;
    return { key, state, status };
  });
  return { counts, items };
}
