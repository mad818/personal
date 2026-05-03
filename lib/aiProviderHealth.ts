// ── lib/aiProviderHealth ─────────────────────────────────────────────────────
// Over-engineered provider health system for the Homefront AI proxy.
//
// Responsibilities:
//   1. Exponential backoff circuit breaker — per-provider, independent state
//   2. Response-time scoring — fast providers drift up the chain automatically
//   3. Per-provider timeout budget — fast-fail slow providers before the user notices
//   4. Request sanitization — strip dangerous/malformed input before forwarding
//   5. Response validation — detect valid AI responses vs. silent error bodies
//   6. Health snapshot — serializable state for the /api/health/providers endpoint
//
// All state is module-level (persists across requests within one Node.js process).
// A server restart resets all state — this is intentional; stale state is worse.

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ProviderStats {
  /** Consecutive failures since last success */
  consecutiveFails: number;
  /** Lifetime successes this process lifetime */
  totalSuccesses: number;
  /** Lifetime failures this process lifetime */
  totalFailures: number;
  /** Unix ms when circuit was last tripped (0 = never) */
  circuitOpenAt: number;
  /** Unix ms of last successful response */
  lastSuccessAt: number;
  /** Unix ms of last failure */
  lastFailAt: number;
  /** Exponential moving average of response time (ms) */
  avgResponseMs: number;
  /** Computed priority score 0–1 (higher = preferred) */
  score: number;
}

// ── State store ───────────────────────────────────────────────────────────────

const _stats: Map<string, ProviderStats> = new Map();

function getOrCreate(provider: string): ProviderStats {
  if (!_stats.has(provider)) {
    _stats.set(provider, {
      consecutiveFails: 0,
      totalSuccesses:   0,
      totalFailures:    0,
      circuitOpenAt:    0,
      lastSuccessAt:    0,
      lastFailAt:       0,
      avgResponseMs:    0,
      score:            0.5, // neutral on first use
    });
  }
  return _stats.get(provider)!;
}

// ── Circuit breaker — exponential backoff ─────────────────────────────────────
// Cooldown grows with consecutive failures:
//   1st fail  →  2 min
//   2nd fail  →  5 min
//   3rd fail  → 15 min
//   4th+ fail → 30 min
//
// This lets a briefly-rate-limited provider recover quickly while
// keeping a truly dead provider out of the chain for longer.

const COOLDOWN_STEPS_MS = [
  2  * 60_000,  // 1st consecutive fail
  5  * 60_000,  // 2nd
  15 * 60_000,  // 3rd
  30 * 60_000,  // 4th+
];

function cooldownMs(consecutiveFails: number): number {
  const idx = Math.min(consecutiveFails - 1, COOLDOWN_STEPS_MS.length - 1);
  return COOLDOWN_STEPS_MS[Math.max(0, idx)];
}

/** Returns true if the provider should be skipped right now. */
export function isCircuitOpen(provider: string): boolean {
  const s = getOrCreate(provider);
  if (s.circuitOpenAt === 0) return false;
  const elapsed = Date.now() - s.circuitOpenAt;
  const cd = cooldownMs(s.consecutiveFails);
  if (elapsed >= cd) {
    // Cooldown expired — half-open: allow one probe through
    s.circuitOpenAt = 0;
    return false;
  }
  return true;
}

/** Record a failure for a provider. Trips or extends the circuit. */
export function recordFailure(provider: string): void {
  const s = getOrCreate(provider);
  s.consecutiveFails += 1;
  s.totalFailures    += 1;
  s.lastFailAt        = Date.now();
  s.circuitOpenAt     = Date.now(); // (re)open circuit
  s.score             = computeScore(s);
}

/** Record a success for a provider. Resets the circuit and updates timing. */
export function recordSuccess(provider: string, responseMs: number): void {
  const s = getOrCreate(provider);
  s.consecutiveFails  = 0;
  s.totalSuccesses   += 1;
  s.circuitOpenAt     = 0;
  s.lastSuccessAt     = Date.now();
  // Exponential moving average (α = 0.25) — new value weighted at 25%
  s.avgResponseMs =
    s.avgResponseMs === 0
      ? responseMs
      : s.avgResponseMs * 0.75 + responseMs * 0.25;
  s.score = computeScore(s);
}

// ── Provider score ────────────────────────────────────────────────────────────
// score = (successRate × 0.4) + (speedScore × 0.4) + (recencyScore × 0.2)
//
// successRate  — fraction of lifetime calls that succeeded
// speedScore   — 1 = instant, 0 = 30s+ (normalized, capped at 30s baseline)
// recencyScore — 1 = just succeeded, 0 = no success in 24h

function computeScore(s: ProviderStats): number {
  const total = s.totalSuccesses + s.totalFailures;
  const successRate = total === 0 ? 0.5 : s.totalSuccesses / total;
  const speedScore =
    s.avgResponseMs > 0
      ? Math.max(0, 1 - s.avgResponseMs / 30_000)
      : 0.5;
  const recencyScore =
    s.lastSuccessAt > 0
      ? Math.max(0, 1 - (Date.now() - s.lastSuccessAt) / (24 * 3_600_000))
      : 0.5;
  return successRate * 0.4 + speedScore * 0.4 + recencyScore * 0.2;
}

/** Return all provider stats sorted by score descending. */
export function getAllStats(): Record<string, ProviderStats> {
  const out: Record<string, ProviderStats> = {};
  _stats.forEach((v, k) => { out[k] = { ...v }; });
  return out;
}

/**
 * Re-sort a provider chain by live score (descending) while preserving
 * the relative order within the free tier and within the paid tier.
 * Providers with no history retain their original position (score = 0.5).
 */
export function scoreSortedChain(
  chain: string[],
  freeProviders: ReadonlySet<string>,
): string[] {
  const free = chain.filter((p) => freeProviders.has(p));
  const paid = chain.filter((p) => !freeProviders.has(p));

  const sortByScore = (a: string, b: string): number => {
    const sa = getOrCreate(a).score;
    const sb = getOrCreate(b).score;
    return sb - sa; // descending
  };

  return [...free.sort(sortByScore), ...paid.sort(sortByScore)];
}

// ── Per-provider timeout budget ───────────────────────────────────────────────
// Fast-fail slow providers before the user notices.
// Speed-tier providers (Cerebras, Groq) get short budgets — they should
// respond in <3s or they're having issues. Paid providers get more time.

const TIMEOUT_MS: Record<string, number> = {
  // Local — model warmups and first-token latency can be much slower than cloud.
  ollama:     90_000,
  // Speed tier — should answer in <3s; 8s = generous
  cerebras:    8_000,
  groq:        8_000,
  // Quality free tier
  sambanova:  15_000,
  nvidia:     15_000,
  hyperbolic: 15_000,
  together:   15_000,
  siliconflow:15_000,
  zai:        15_000,
  iflow:      15_000,
  // Bulk / specialty
  deepinfra:  20_000,
  fireworks:  20_000,
  scaleway:   20_000,
  qwen:       20_000,
  huggingface:20_000,
  codestral:  20_000,
  googleai:   20_000,
  cloudflare: 20_000,
  perplexity: 20_000,
  // Paid — can be slower (complex routing, prompt caching, etc.)
  openrouter: 30_000,
  google:     30_000,
  minimax:    30_000,
  anthropic:  60_000,
  openai:     60_000,
};

const DEFAULT_TIMEOUT_MS = 20_000;

export function getTimeoutMs(provider: string): number {
  return TIMEOUT_MS[provider] ?? DEFAULT_TIMEOUT_MS;
}

// ── Request sanitization ──────────────────────────────────────────────────────
// Strip/clamp dangerous or malformed input before it reaches any provider.

const MAX_MESSAGES        = 100;
const MAX_MESSAGE_CHARS   = 128_000; // 128K chars per message
const MAX_SYSTEM_CHARS    = 32_000;
const MAX_ROLE_CHARS      = 20;
const ALLOWED_ROLES       = new Set(["user", "assistant", "system", "tool"]);

export function sanitizeMessages(messages: unknown): unknown[] {
  if (!Array.isArray(messages)) return [];

  return messages
    .slice(-MAX_MESSAGES)
    .filter((m): m is Record<string, unknown> =>
      typeof m === "object" && m !== null && !Array.isArray(m),
    )
    .map((m) => {
      const rawRole = typeof m.role === "string" ? m.role.slice(0, MAX_ROLE_CHARS) : "user";
      const role    = ALLOWED_ROLES.has(rawRole) ? rawRole : "user";

      let content: unknown = m.content;
      if (typeof content === "string") {
        content = content.slice(0, MAX_MESSAGE_CHARS);
      } else if (Array.isArray(content)) {
        // Multi-part content (images, tool results) — pass through, cap text parts
        content = content
          .slice(0, 20)
          .map((part: unknown) => {
            if (
              typeof part === "object" &&
              part !== null &&
              (part as Record<string, unknown>).type === "text"
            ) {
              return {
                ...(part as Record<string, unknown>),
                text: String((part as Record<string, unknown>).text ?? "").slice(
                  0,
                  MAX_MESSAGE_CHARS,
                ),
              };
            }
            return part;
          });
      }

      // Only forward known safe fields — strip any injected metadata
      const safe: Record<string, unknown> = { role, content };
      if (typeof m.name === "string") safe.name = m.name.slice(0, 64);
      if (typeof m.tool_call_id === "string")
        safe.tool_call_id = m.tool_call_id.slice(0, 128);
      if (Array.isArray(m.tool_calls)) safe.tool_calls = m.tool_calls;
      return safe;
    });
}

export function sanitizeSystem(system: unknown): string | undefined {
  if (typeof system !== "string") return undefined;
  return system.slice(0, MAX_SYSTEM_CHARS);
}

// ── Response validation ───────────────────────────────────────────────────────
// Detect provider responses that return 200 but contain an error body
// (common with free-tier rate limiting, maintenance windows, etc.)

const ERROR_BODY_PATTERNS = [
  /"error"\s*:/i,
  /"message"\s*:\s*"(rate limit|quota|insufficient|overloaded|maintenance|unavailable)/i,
  /503 Service Unavailable/i,
  /Too Many Requests/i,
];

/**
 * Read a clone of the response body and check if it looks like a valid
 * AI completion (non-streaming). Returns true if valid, false if it looks
 * like a provider error masquerading as 200.
 *
 * IMPORTANT: call this on a *cloned* response — reading the body is destructive.
 */
export async function isValidCompletionResponse(
  responseClone: Response,
): Promise<boolean> {
  try {
    const text = await responseClone.text();

    // Check for error body patterns
    for (const pattern of ERROR_BODY_PATTERNS) {
      if (pattern.test(text)) return false;
    }

    // Must parse as JSON with expected shape
    const json = JSON.parse(text) as Record<string, unknown>;

    // OpenAI-compatible: must have choices array
    if (Array.isArray(json.choices) && json.choices.length > 0) return true;

    // Anthropic format: must have content array
    if (Array.isArray(json.content) && json.content.length > 0) return true;

    return false;
  } catch {
    return false; // parse failure = not valid
  }
}

// ── Cooldown status (for health endpoint) ────────────────────────────────────

export interface CooldownInfo {
  provider: string;
  circuitOpenAt: number;
  cooldownMs: number;
  remainingMs: number;
  consecutiveFails: number;
}

export function getOpenCircuits(): CooldownInfo[] {
  const now = Date.now();
  const result: CooldownInfo[] = [];
  _stats.forEach((s, provider) => {
    if (s.circuitOpenAt === 0) return;
    const cd  = cooldownMs(s.consecutiveFails);
    const rem = cd - (now - s.circuitOpenAt);
    if (rem > 0) {
      result.push({
        provider,
        circuitOpenAt:    s.circuitOpenAt,
        cooldownMs:       cd,
        remainingMs:      rem,
        consecutiveFails: s.consecutiveFails,
      });
    }
  });
  return result;
}
