// Shared runtime cadence and cache knobs for status/eval telemetry.

export const RUNTIME_CACHE_TTL_MS = {
  statusReadiness: 15_000,
  runtimeEvalLimit1: 10_000,
  runtimeEvalLimit5: 10_000,
  runtimeEvalLimit24: 10_000,
} as const;

export const RUNTIME_POLL_MS = {
  hqStatus: 60_000,
  telemetryEval: 45_000,
  runtimeEvalPanel: 10 * 60 * 1000,
} as const;

// Deterministic per-surface startup jitter to avoid same-tick polling bursts.
export function staggerDelayMs(seed: string, spreadMs = 2_500): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++)
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  const n = Math.abs(hash);
  return n % Math.max(1, spreadMs);
}
