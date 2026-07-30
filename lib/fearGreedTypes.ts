export interface FearGreedEntry {
  value: number;
  classification: string;
  timestamp: string;
}

export interface FearGreedSuccess {
  ok: true;
  current: FearGreedEntry;
  history: FearGreedEntry[];
}

export interface FearGreedFailure {
  ok: false;
  error: string;
}

export type FearGreedResponse = FearGreedSuccess | FearGreedFailure;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isEntry(value: unknown): value is FearGreedEntry {
  if (!isRecord(value)) return false;
  return (
    typeof value.value === "number" &&
    Number.isInteger(value.value) &&
    value.value >= 0 &&
    value.value <= 100 &&
    typeof value.classification === "string" &&
    value.classification.length > 0 &&
    typeof value.timestamp === "string" &&
    Number.isFinite(Date.parse(value.timestamp))
  );
}

export function isFearGreedSuccess(value: unknown): value is FearGreedSuccess {
  return (
    isRecord(value) &&
    value.ok === true &&
    isEntry(value.current) &&
    Array.isArray(value.history) &&
    value.history.length > 0 &&
    value.history.every(isEntry)
  );
}
