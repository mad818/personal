// lib/fetchWithProtection.ts — server-side

import { createCircuitBreaker } from '@/lib/circuitBreaker'
import { createCache } from '@/lib/apiCache'
import { createRateLimiter } from '@/lib/rateLimiter'

// Module-level singletons — shared across requests in the same Node.js process
const breakers = new Map<string, ReturnType<typeof createCircuitBreaker>>()
const limiters = new Map<string, ReturnType<typeof createRateLimiter>>()
const responseCache = createCache<string>({ maxEntries: 500, defaultTTL: 300_000 })

function getBreaker(source: string) {
  if (!breakers.has(source)) {
    breakers.set(source, createCircuitBreaker(source))
  }
  return breakers.get(source)!
}

function getLimiter(source: string) {
  if (!limiters.has(source)) {
    limiters.set(source, createRateLimiter(source))
  }
  return limiters.get(source)!
}

export interface ProtectedFetchOptions {
  source?: string          // rate limiter / circuit breaker key (e.g., 'nvd', 'coingecko')
  cacheTTL?: number        // cache TTL in ms (0 = no cache)
  cacheKey?: string        // custom cache key (default = url)
  timeout?: number         // fetch timeout ms (default 8000)
  retries?: number         // retry count (default 1)
  fetchOptions?: RequestInit
}

export async function protectedFetch(
  url: string,
  options: ProtectedFetchOptions = {},
): Promise<Response> {
  const {
    source,
    cacheTTL,
    cacheKey,
    timeout = 8_000,
    retries = 1,
    fetchOptions = {},
  } = options

  const resolvedCacheKey = cacheKey ?? url
  const shouldCache = cacheTTL !== 0

  // 1. Check cache first
  if (shouldCache) {
    const cached = responseCache.get(resolvedCacheKey)
    if (cached !== undefined) {
      return new Response(cached, {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'X-Cache': 'HIT' },
      })
    }
  }

  // 2. Rate limiting
  if (source) {
    const limiter = getLimiter(source)
    const allowed = limiter.tryAcquire()
    if (!allowed) {
      // Wait for a token rather than hard-rejecting (respects backpressure)
      await limiter.waitForToken()
    }
  }

  // 3. Execute fetch through circuit breaker with retry logic
  const breaker = source ? getBreaker(source) : null

  let lastError: Error = new Error('Unknown fetch error')

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const doFetch = async (): Promise<Response> => {
        const signal = AbortSignal.timeout(timeout)
        const response = await fetch(url, { ...fetchOptions, signal })
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }
        return response
      }

      const response = breaker
        ? await breaker.execute(doFetch)
        : await doFetch()

      // 4. Cache the response body text for future requests
      if (shouldCache) {
        const ttl = cacheTTL ?? 300_000
        const bodyText = await response.text()
        responseCache.set(resolvedCacheKey, bodyText, ttl)
        return new Response(bodyText, {
          status: response.status,
          headers: {
            'Content-Type': response.headers.get('Content-Type') ?? 'application/json',
            'X-Cache': 'MISS',
          },
        })
      }

      return response
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))
      if (attempt < retries) {
        // Brief backoff before retry
        await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)))
      }
    }
  }

  throw lastError
}

/** Expose cache and breaker stats for monitoring endpoints */
export function getProtectionStats() {
  const breakerStats: Record<string, ReturnType<ReturnType<typeof createCircuitBreaker>['getStats']>> = {}
  breakers.forEach((breaker, bName) => {
    breakerStats[bName] = breaker.getStats()
  })

  const limiterStats: Record<string, ReturnType<ReturnType<typeof createRateLimiter>['getStats']>> = {}
  limiters.forEach((limiter, lName) => {
    limiterStats[lName] = limiter.getStats()
  })

  return {
    cache: responseCache.stats(),
    breakers: breakerStats,
    limiters: limiterStats,
  }
}
