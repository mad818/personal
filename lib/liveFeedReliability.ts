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
