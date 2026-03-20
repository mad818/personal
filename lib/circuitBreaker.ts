// lib/circuitBreaker.ts — server-side utility, no 'use client'

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN'

export interface CircuitBreakerConfig {
  failureThreshold: number   // failures before opening (default 5)
  resetTimeout: number       // ms before trying again (default 60000)
  monitorWindow: number      // time window for counting failures (default 120000)
}

const DEFAULT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  resetTimeout: 60_000,
  monitorWindow: 120_000,
}

export interface CircuitBreakerStats {
  state: CircuitState
  failures: number
  successes: number
  lastFailure: number | null
  lastSuccess: number | null
}

export interface CircuitBreaker {
  execute<T>(fn: () => Promise<T>): Promise<T>
  getState(): CircuitState
  getStats(): CircuitBreakerStats
}

export function createCircuitBreaker(
  name: string,
  config: Partial<CircuitBreakerConfig> = {},
): CircuitBreaker {
  const cfg: CircuitBreakerConfig = { ...DEFAULT_CONFIG, ...config }

  let state: CircuitState = 'CLOSED'
  let failures = 0
  let successes = 0
  let lastFailure: number | null = null
  let lastSuccess: number | null = null
  let openedAt: number | null = null

  // Timestamps of recent failures within the monitor window
  const failureTimes: number[] = []

  function pruneFailureTimes() {
    const cutoff = Date.now() - cfg.monitorWindow
    while (failureTimes.length > 0 && failureTimes[0] < cutoff) {
      failureTimes.shift()
    }
  }

  function recordFailure() {
    const now = Date.now()
    failures++
    lastFailure = now
    failureTimes.push(now)
    pruneFailureTimes()

    if (failureTimes.length >= cfg.failureThreshold) {
      state = 'OPEN'
      openedAt = now
    }
  }

  function recordSuccess() {
    const now = Date.now()
    successes++
    lastSuccess = now

    if (state === 'HALF_OPEN') {
      // Recovery successful — close the circuit
      state = 'CLOSED'
      failureTimes.length = 0
      openedAt = null
    }
  }

  function checkState() {
    if (state === 'OPEN' && openedAt !== null) {
      const elapsed = Date.now() - openedAt
      if (elapsed >= cfg.resetTimeout) {
        state = 'HALF_OPEN'
      }
    }
  }

  async function execute<T>(fn: () => Promise<T>): Promise<T> {
    checkState()

    if (state === 'OPEN') {
      throw new Error(
        `Circuit breaker '${name}' is OPEN — rejecting call. ` +
        `Last failure: ${lastFailure ? new Date(lastFailure).toISOString() : 'unknown'}`,
      )
    }

    try {
      const result = await fn()
      recordSuccess()
      return result
    } catch (err) {
      recordFailure()
      throw err
    }
  }

  function getState(): CircuitState {
    checkState()
    return state
  }

  function getStats(): CircuitBreakerStats {
    checkState()
    pruneFailureTimes()
    return {
      state,
      failures,
      successes,
      lastFailure,
      lastSuccess,
    }
  }

  return { execute, getState, getStats }
}
