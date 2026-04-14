// ── lib/aiUsageGuard ─────────────────────────────────────────────────────────
// Belt-and-suspenders paid-territory protection for the Nexus AI proxy.
//
// This module is the SECOND layer of defence after the policy filter in route.ts.
// Even if policy logic has a bug, this module hard-blocks paid providers
// and tracks all usage so the operator has full visibility.
//
// Responsibilities:
//   1. Hard paid-provider block  — second independent gate, never trust policy alone
//   2. Per-provider RPM enforcement — enforce free-tier rate limits before hammering
//   3. Daily request quota tracking — know when a provider's daily limit is near
//   4. Session token budget — accumulate estimated tokens, warn before overrun
//   5. Paid-provider audit log — ring-buffer of every paid call (for operator review)
//   6. Cost estimator — approximate $ cost per paid provider call
//   7. Paid key presence detector — warn if paid keys are set but gate is off
//
// All state is module-level (resets on server restart — intentional).
// Source for rate limits: github.com/vava-nessa/free-coding-models README

// ── Free-tier rate limits ─────────────────────────────────────────────────────
// Requests per minute per provider (conservative — err on the side of staying
// well inside the limit rather than right up to it).
// Unlimited providers (iFlow) are set to 999 to skip the check.
const FREE_RPM: Record<string, number> = {
  ollama:      999, // local — no external limit
  cerebras:     60, // generous developer tier (repo: "10× higher limits")
  groq:         30, // repo: "30-50 RPM per model" — use lower bound
  sambanova:    60, // repo: "generous developer tier"
  nvidia:       35, // repo: "40 req/min" — use 35 to stay safe
  hyperbolic:   20, // $1 credits — be conservative
  together:     30, // credits-based — conservative
  siliconflow:  80, // repo: "~100 RPM" — use 80
  zai:          60, // repo: "generous quota"
  iflow:       999, // repo: "no req limits"
  deepinfra:    60, // repo: "200 concurrent" — generous, use 60 RPM
  fireworks:    10, // repo: "10 req/min without payment"
  scaleway:     40, // 1M tokens total — no RPM stated; conservative
  qwen:         40, // 1M tokens/model; conservative RPM
  huggingface:  10, // minimal free credits — very conservative
  codestral:    25, // repo: "30 req/min" — use 25
  googleai:     25, // repo: "30/min" — use 25
  cloudflare:  200, // repo: "300 RPM text-gen" — use 200
  perplexity:   40, // repo: "~50 RPM" — use 40
};

// ── Daily request limits ──────────────────────────────────────────────────────
// Max requests per provider per UTC day before we deprioritise them.
// 0 = no known daily limit (track only, never block).
const FREE_DAILY_LIMIT: Record<string, number> = {
  ollama:       0,      // local — no limit
  cerebras:     0,      // no stated daily limit
  groq:         0,      // rate-limited by RPM, not daily req count
  sambanova:    0,
  nvidia:       0,
  hyperbolic:   0,
  together:     0,
  siliconflow:  0,
  zai:          0,
  iflow:        0,      // unlimited
  deepinfra:    0,
  fireworks:    0,
  scaleway:     0,
  qwen:         0,
  huggingface: 50,      // ~$0.10 credits — very tight
  codestral:  1800,     // repo: "2000/day" — use 1800 to leave buffer
  googleai:  12_000,    // repo: "14.4K req/day" — use 12K as buffer
  cloudflare:    0,     // 10K neurons/day — not a clean req count
  perplexity:    0,
};

// ── Paid providers ────────────────────────────────────────────────────────────
// This set is the second, independent gate. Never rely on the policy filter alone.
const PAID_PROVIDERS = new Set([
  "openrouter",
  "google",
  "minimax",
  "anthropic",
  "openai",
]);

// ── Cost estimates (USD per 1K tokens) ───────────────────────────────────────
// Approximate only — used for spend warnings, not billing.
// Input cost / Output cost pairs.
const COST_PER_1K: Record<string, [number, number]> = {
  anthropic:   [0.015,  0.075],  // claude-opus-4-5
  openai:      [0.00015, 0.0006], // gpt-4o-mini
  google:      [0.000075, 0.0003], // gemini-2.0-flash
  minimax:     [0.0002, 0.0011],
  openrouter:  [0.001, 0.001],   // estimate — varies by model
};

// ── Session spend limit ───────────────────────────────────────────────────────
// Warn when estimated paid spend in the current server-process lifetime exceeds this.
const SESSION_SPEND_WARN_USD = 1.00;
const SESSION_SPEND_BLOCK_USD = 5.00; // hard block if spend goes above this

// ── State ─────────────────────────────────────────────────────────────────────

// Rolling window: timestamps (ms) of recent requests per provider
const _requestLog: Record<string, number[]> = {};

// Daily counters — reset at midnight UTC
const _dailyCounters: Record<string, number> = {};
let _dailyCounterDate = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

// Session token accumulator
let _sessionInputTokens  = 0;
let _sessionOutputTokens = 0;
let _sessionPaidSpendUsd = 0;

// Paid provider audit log — ring buffer (last 200 entries)
interface PaidAuditEntry {
  ts:             number;
  provider:       string;
  model:          string;
  estimatedInputTokens:  number;
  estimatedOutputTokens: number;
  estimatedCostUsd:      number;
}
const _paidAuditLog: PaidAuditEntry[] = [];
const AUDIT_LOG_MAX = 200;

// ── Helpers ───────────────────────────────────────────────────────────────────

function getTodayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Reset daily counters if the date has rolled over. */
function maybeResetDailyCounters(): void {
  const today = getTodayUtc();
  if (today !== _dailyCounterDate) {
    _dailyCounterDate = today;
    Object.keys(_dailyCounters).forEach((k) => { _dailyCounters[k] = 0; });
  }
}

/** Prune request timestamps older than 60s from the rolling window. */
function pruneWindow(provider: string): void {
  const cutoff = Date.now() - 60_000;
  const log    = _requestLog[provider];
  if (!log) return;
  let i = 0;
  while (i < log.length && log[i] < cutoff) i++;
  if (i > 0) log.splice(0, i);
}

/** Current RPM for a provider (requests in the last 60s). */
function currentRpm(provider: string): number {
  pruneWindow(provider);
  return (_requestLog[provider] ?? []).length;
}

// ── Public API ────────────────────────────────────────────────────────────────

export interface UsageGuardResult {
  allowed:  boolean;
  reason:   string;
  /** If true, warn the user but allow the call (soft block) */
  soft:     boolean;
}

/**
 * Check whether a provider call is allowed.
 * Call this BEFORE dispatching to any provider.
 * Returns { allowed, reason, soft }.
 */
export function canUseProvider(
  provider: string,
  allowPaidApis: boolean,
): UsageGuardResult {
  // ── Hard block 1: paid provider gate ─────────────────────────────────────
  // Independent of the policy filter in route.ts — belt AND suspenders.
  if (PAID_PROVIDERS.has(provider) && !allowPaidApis) {
    return {
      allowed: false,
      soft:    false,
      reason:  `"${provider}" is a paid provider. Set NEXUS_ALLOW_PAID_APIS=true to enable.`,
    };
  }

  // ── Hard block 2: session spend cap ──────────────────────────────────────
  if (PAID_PROVIDERS.has(provider) && _sessionPaidSpendUsd >= SESSION_SPEND_BLOCK_USD) {
    return {
      allowed: false,
      soft:    false,
      reason:
        `Session paid spend (≈$${_sessionPaidSpendUsd.toFixed(2)}) reached the ` +
        `$${SESSION_SPEND_BLOCK_USD} safety cap. Restart the server to reset.`,
    };
  }

  // ── Soft warn: session spend approaching cap ──────────────────────────────
  if (
    PAID_PROVIDERS.has(provider) &&
    _sessionPaidSpendUsd >= SESSION_SPEND_WARN_USD &&
    _sessionPaidSpendUsd < SESSION_SPEND_BLOCK_USD
  ) {
    // Allow the call but flag it so the route can add a warning header
    return {
      allowed: true,
      soft:    true,
      reason:
        `Session paid spend ≈$${_sessionPaidSpendUsd.toFixed(2)} — ` +
        `approaching $${SESSION_SPEND_BLOCK_USD} safety cap.`,
    };
  }

  // ── Hard block 3: RPM enforcement ─────────────────────────────────────────
  const rpm    = FREE_RPM[provider] ?? 30;
  const curRpm = currentRpm(provider);
  if (curRpm >= rpm) {
    return {
      allowed: false,
      soft:    false,
      reason:  `"${provider}" at RPM limit (${curRpm}/${rpm}/min) — skipping to next provider.`,
    };
  }

  // ── Hard block 4: daily quota ─────────────────────────────────────────────
  maybeResetDailyCounters();
  const dailyLimit   = FREE_DAILY_LIMIT[provider] ?? 0;
  const dailyUsed    = _dailyCounters[provider]    ?? 0;
  if (dailyLimit > 0 && dailyUsed >= dailyLimit) {
    return {
      allowed: false,
      soft:    false,
      reason:  `"${provider}" daily quota reached (${dailyUsed}/${dailyLimit}). Resets at midnight UTC.`,
    };
  }

  // ── Soft warn: daily quota approaching ───────────────────────────────────
  if (dailyLimit > 0 && dailyUsed >= dailyLimit * 0.9) {
    return {
      allowed: true,
      soft:    true,
      reason:  `"${provider}" at ${dailyUsed}/${dailyLimit} daily requests (90% used).`,
    };
  }

  return { allowed: true, soft: false, reason: "" };
}

/**
 * Record a completed provider call.
 * Call this AFTER a successful response.
 * Estimates token counts from response size if not provided.
 */
export function recordUsage(
  provider:             string,
  model:                string,
  estimatedInputTokens: number,
  estimatedOutputTokens: number,
): void {
  const now = Date.now();

  // Update rolling RPM window
  if (!_requestLog[provider]) _requestLog[provider] = [];
  _requestLog[provider].push(now);

  // Update daily counter
  maybeResetDailyCounters();
  _dailyCounters[provider] = (_dailyCounters[provider] ?? 0) + 1;

  // Update session totals
  _sessionInputTokens  += estimatedInputTokens;
  _sessionOutputTokens += estimatedOutputTokens;

  // Paid provider tracking
  if (PAID_PROVIDERS.has(provider)) {
    const [inRate, outRate] = COST_PER_1K[provider] ?? [0.001, 0.001];
    const costUsd =
      (estimatedInputTokens  / 1000) * inRate +
      (estimatedOutputTokens / 1000) * outRate;
    _sessionPaidSpendUsd += costUsd;

    // Append to audit log (ring buffer)
    _paidAuditLog.push({
      ts: now, provider, model,
      estimatedInputTokens,
      estimatedOutputTokens,
      estimatedCostUsd: costUsd,
    });
    if (_paidAuditLog.length > AUDIT_LOG_MAX) {
      _paidAuditLog.shift();
    }
  }
}

// ── Paid key presence detector ────────────────────────────────────────────────
// Returns paid providers that have a key set but the paid-API gate is off.
// Shown as a warning in the health endpoint and on startup.

interface KeyWarning {
  provider: string;
  message:  string;
}

export function detectUnusedPaidKeys(): KeyWarning[] {
  const warnings: KeyWarning[] = [];
  const keyMap: Record<string, string | undefined> = {
    openrouter: process.env.OPENROUTER_API_KEY,
    google:     process.env.GOOGLE_AI_KEY,
    minimax:    process.env.MINIMAX_API_KEY,
    anthropic:  process.env.ANTHROPIC_API_KEY,
    openai:     process.env.OPENAI_API_KEY,
  };
  const paidEnabled = process.env.NEXUS_ALLOW_PAID_APIS === "true";
  if (paidEnabled) return warnings; // gate is open — no warning needed

  for (const [provider, key] of Object.entries(keyMap)) {
    if (key && key.length > 4) {
      warnings.push({
        provider,
        message:
          `${provider} key is set but NEXUS_ALLOW_PAID_APIS is not enabled. ` +
          `The key will NOT be used. Remove it or set NEXUS_ALLOW_PAID_APIS=true.`,
      });
    }
  }
  return warnings;
}

// ── Usage snapshot ────────────────────────────────────────────────────────────

export interface ProviderUsageStats {
  provider:       string;
  currentRpm:     number;
  rpmLimit:       number;
  rpmPct:         number;    // 0–100
  dailyRequests:  number;
  dailyLimit:     number;
  dailyPct:       number;    // 0–100 (0 if no limit)
  paid:           boolean;
}

export interface UsageSnapshot {
  providers:          ProviderUsageStats[];
  sessionInputTokens: number;
  sessionOutputTokens:number;
  sessionTotalTokens: number;
  sessionPaidSpendUsd:number;
  sessionSpendCapUsd: number;
  sessionSpendPct:    number;   // 0–100 of hard cap
  paidAuditLog:       PaidAuditEntry[];
  unusedPaidKeyWarnings: KeyWarning[];
  timestamp:          number;
}

export function getUsageSnapshot(): UsageSnapshot {
  maybeResetDailyCounters();

  const allProviders = [
    "ollama", "cerebras", "groq", "sambanova", "nvidia", "hyperbolic",
    "together", "siliconflow", "zai", "iflow", "deepinfra", "fireworks",
    "scaleway", "qwen", "huggingface", "codestral", "googleai", "cloudflare",
    "perplexity", "openrouter", "google", "minimax", "anthropic", "openai",
  ];

  const providers: ProviderUsageStats[] = allProviders.map((p) => {
    const rpm      = FREE_RPM[p]          ?? 30;
    const daily    = FREE_DAILY_LIMIT[p]  ?? 0;
    const cur      = currentRpm(p);
    const dayCount = _dailyCounters[p]    ?? 0;
    return {
      provider:      p,
      currentRpm:    cur,
      rpmLimit:      rpm,
      rpmPct:        Math.round((cur / rpm) * 100),
      dailyRequests: dayCount,
      dailyLimit:    daily,
      dailyPct:      daily > 0 ? Math.round((dayCount / daily) * 100) : 0,
      paid:          PAID_PROVIDERS.has(p),
    };
  });

  const totalTokens = _sessionInputTokens + _sessionOutputTokens;
  return {
    providers,
    sessionInputTokens:  _sessionInputTokens,
    sessionOutputTokens: _sessionOutputTokens,
    sessionTotalTokens:  totalTokens,
    sessionPaidSpendUsd: _sessionPaidSpendUsd,
    sessionSpendCapUsd:  SESSION_SPEND_BLOCK_USD,
    sessionSpendPct:     Math.round((_sessionPaidSpendUsd / SESSION_SPEND_BLOCK_USD) * 100),
    paidAuditLog:        [..._paidAuditLog].reverse(), // newest first
    unusedPaidKeyWarnings: detectUnusedPaidKeys(),
    timestamp: Date.now(),
  };
}

// ── Token estimation ──────────────────────────────────────────────────────────
// Rough estimate when actual token counts are not returned by the provider.
// 1 token ≈ 4 chars for English text. We use 3.5 to be conservative.

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 3.5);
}

/**
 * Estimate input tokens from the messages + system prompt.
 * Used when the provider response doesn't include token usage info.
 */
export function estimateInputTokens(
  messages: unknown[],
  system:   string | undefined,
): number {
  const sysLen = system ? system.length : 0;
  const msgLen = Array.isArray(messages)
    ? messages.reduce<number>((acc, m) => {
        const content =
          typeof m === "object" && m !== null
            ? String((m as Record<string, unknown>).content ?? "")
            : "";
        return acc + content.length;
      }, 0)
    : 0;
  return Math.ceil((sysLen + msgLen) / 3.5);
}
