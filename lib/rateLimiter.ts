// lib/rateLimiter.ts — server-side, no 'use client'

export interface RateLimitConfig {
  maxTokens: number        // bucket size
  refillRate: number       // tokens per second
  refillInterval: number   // ms between refills (default 1000)
}

export const API_LIMITS: Record<string, RateLimitConfig> = {
  nvd:         { maxTokens: 50,  refillRate: 1.67,  refillInterval: 1000 }, // 50 per 30s
  coingecko:   { maxTokens: 30,  refillRate: 0.5,   refillInterval: 1000 }, // 30 per min
  gdelt:       { maxTokens: 10,  refillRate: 0.33,  refillInterval: 1000 }, // 10 per 30s
  opensky:     { maxTokens: 5,   refillRate: 0.083, refillInterval: 1000 }, // 5 per min
  groq:        { maxTokens: 30,  refillRate: 0.5,   refillInterval: 1000 }, // 30 per min
  otx:         { maxTokens: 100, refillRate: 1.67,  refillInterval: 1000 }, // 100 per min
  usgs:        { maxTokens: 20,  refillRate: 0.33,  refillInterval: 1000 }, // 20 per min
  firms:       { maxTokens: 10,  refillRate: 0.17,  refillInterval: 1000 }, // 10 per min
  frankfurter: { maxTokens: 60,  refillRate: 1.0,   refillInterval: 1000 }, // 60 per min
  threatfox:   { maxTokens: 10,  refillRate: 0.17,  refillInterval: 1000 }, // 10 per min
}

export interface RateLimiterStats {
  available: number
  max: number
  lastRefill: number
}

export interface RateLimiter {
  tryAcquire(): boolean
  waitForToken(): Promise<void>
  getStats(): RateLimiterStats
}

export function createRateLimiter(
  name: string,
  config?: Partial<RateLimitConfig>,
): RateLimiter {
  const preset = API_LIMITS[name]
  const cfg: RateLimitConfig = {
    maxTokens: config?.maxTokens ?? preset?.maxTokens ?? 10,
    refillRate: config?.refillRate ?? preset?.refillRate ?? 1,
    refillInterval: config?.refillInterval ?? preset?.refillInterval ?? 1000,
  }

  let tokens = cfg.maxTokens
  let lastRefill = Date.now()

  function refill() {
    const now = Date.now()
    const elapsed = (now - lastRefill) / 1000 // convert to seconds
    const newTokens = elapsed * cfg.refillRate
    if (newTokens > 0) {
      tokens = Math.min(cfg.maxTokens, tokens + newTokens)
      lastRefill = now
    }
  }

  function tryAcquire(): boolean {
    refill()
    if (tokens >= 1) {
      tokens -= 1
      return true
    }
    return false
  }

  async function waitForToken(): Promise<void> {
    // Poll at the refill interval until a token becomes available
    return new Promise((resolve) => {
      function attempt() {
        if (tryAcquire()) {
          resolve()
        } else {
          // Calculate how long until the next token
          const tokensNeeded = 1 - tokens
          const msUntilToken = Math.ceil((tokensNeeded / cfg.refillRate) * 1000)
          const delay = Math.max(cfg.refillInterval, msUntilToken)
          setTimeout(attempt, delay)
        }
      }
      attempt()
    })
  }

  function getStats(): RateLimiterStats {
    refill()
    return {
      available: Math.floor(tokens),
      max: cfg.maxTokens,
      lastRefill,
    }
  }

  return { tryAcquire, waitForToken, getStats }
}
