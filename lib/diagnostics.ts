/**
 * lib/diagnostics.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * NEXUS PRIME system diagnostics, health monitoring, and self-healing.
 *
 * Features:
 *  - Periodic diagnostics (runs every 60s by default)
 *  - Checks: Ollama reachability, API routes, localStorage quota, memory usage
 *  - Predictive warnings: localStorage approaching 5MB limit, API error threshold
 *  - Self-healing: auto-reconnect WebSocket, auto-retry failed API calls,
 *    auto-clear stale cache entries when storage is near full
 *  - All findings emitted to eventBus 'system:health' and 'system:error'
 */

import { eventBus } from '@/lib/eventBus'
import { checkOllamaAvailability } from '@/lib/ollama'
import { getWSManager } from '@/lib/wsManager'

// ── Types ──────────────────────────────────────────────────────────────────────
export interface DiagnosticResult {
  component: string
  status:    'healthy' | 'degraded' | 'down'
  message:   string
  ts:        number
  data?:     Record<string, unknown>
}

export interface DiagnosticsConfig {
  intervalMs:          number    // Default 60_000 (1 min)
  lsWarnThresholdPct:  number    // Warn at this % of localStorage usage (default 70)
  lsAutoCleanPct:      number    // Auto-clean stale keys above this % (default 90)
  apiErrorThreshold:   number    // Emit warning after N consecutive API errors (default 3)
  apiRoutes:           string[]  // Routes to health-check
  wsUrls:              string[]  // WebSocket URLs to keep alive
}

// ── Defaults ───────────────────────────────────────────────────────────────────
const DEFAULT_CONFIG: DiagnosticsConfig = {
  intervalMs:          60_000,
  lsWarnThresholdPct:  70,
  lsAutoCleanPct:      90,
  apiErrorThreshold:   3,
  apiRoutes:           ['/api/mqtt'],
  wsUrls:              [],
}

// ── Module-level error tracking ────────────────────────────────────────────────
const apiErrorCounts: Record<string, number> = {}
const pendingRetries:  Map<string, ReturnType<typeof setTimeout>> = new Map()

// ── localStorage helpers ───────────────────────────────────────────────────────
function getLocalStorageStats(): { usedBytes: number; quotaBytes: number; pct: number } {
  if (typeof window === 'undefined') return { usedBytes: 0, quotaBytes: 5_242_880, pct: 0 }
  try {
    let used = 0
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key) used += key.length + (localStorage.getItem(key) ?? '').length
    }
    const quota = 5 * 1024 * 1024 // 5 MB estimate
    return { usedBytes: used, quotaBytes: quota, pct: (used / quota) * 100 }
  } catch {
    return { usedBytes: 0, quotaBytes: 5_242_880, pct: 0 }
  }
}

/** Remove stale cache entries (keys containing 'cache' or older timestamp keys) */
function clearStaleCache(): number {
  if (typeof window === 'undefined') return 0
  const toRemove: string[] = []
  const now = Date.now()

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (!key) continue

      // Remove keys that look like cache entries
      if (key.includes('cache') || key.includes('Cache')) {
        toRemove.push(key)
        continue
      }

      // Remove keys with embedded timestamps older than 24 hours
      const match = key.match(/[-_](\d{13})$/)
      if (match && now - parseInt(match[1]) > 86_400_000) {
        toRemove.push(key)
      }
    }

    toRemove.forEach((k) => {
      try { localStorage.removeItem(k) } catch { /* skip */ }
    })
  } catch { /* skip */ }

  return toRemove.length
}

// ── Memory usage check ─────────────────────────────────────────────────────────
function checkMemory(): DiagnosticResult {
  const ts = Date.now()

  // Use Performance API if available
  if (typeof window !== 'undefined' && 'performance' in window) {
    const perf = performance as Performance & {
      memory?: { usedJSHeapSize: number; jsHeapSizeLimit: number }
    }
    if (perf.memory) {
      const usedMB  = (perf.memory.usedJSHeapSize / 1_048_576).toFixed(1)
      const limitMB = (perf.memory.jsHeapSizeLimit / 1_048_576).toFixed(1)
      const pct     = (perf.memory.usedJSHeapSize / perf.memory.jsHeapSizeLimit) * 100

      return {
        component: 'memory',
        status:    pct > 85 ? 'degraded' : 'healthy',
        message:   `JS heap: ${usedMB}MB / ${limitMB}MB (${pct.toFixed(1)}%)`,
        ts,
        data:      { usedMB, limitMB, pct },
      }
    }
  }

  return { component: 'memory', status: 'healthy', message: 'Memory API unavailable', ts }
}

// ── Individual diagnostic checks ───────────────────────────────────────────────

async function checkOllama(): Promise<DiagnosticResult> {
  const ts = Date.now()
  try {
    const available = await checkOllamaAvailability()
    return {
      component: 'ollama',
      status:    available ? 'healthy' : 'down',
      message:   available ? 'Ollama reachable at localhost:11434' : 'Ollama not running',
      ts,
    }
  } catch {
    return { component: 'ollama', status: 'down', message: 'Ollama check failed', ts }
  }
}

async function checkAPIRoute(route: string): Promise<DiagnosticResult> {
  const ts = Date.now()
  try {
    const res = await fetch(route, {
      method: 'HEAD',
      signal: AbortSignal.timeout(3000),
    })
    const ok = res.status < 500

    if (ok) {
      apiErrorCounts[route] = 0
    } else {
      apiErrorCounts[route] = (apiErrorCounts[route] ?? 0) + 1
    }

    return {
      component: `api:${route}`,
      status:    ok ? 'healthy' : 'degraded',
      message:   ok ? `Route OK (${res.status})` : `Route error ${res.status}`,
      ts,
      data:      { consecutiveErrors: apiErrorCounts[route] ?? 0 },
    }
  } catch (err) {
    apiErrorCounts[route] = (apiErrorCounts[route] ?? 0) + 1
    return {
      component: `api:${route}`,
      status:    'down',
      message:   `Route unreachable: ${err instanceof Error ? err.message : String(err)}`,
      ts,
      data:      { consecutiveErrors: apiErrorCounts[route] },
    }
  }
}

function checkLocalStorage(config: DiagnosticsConfig): DiagnosticResult {
  const ts    = Date.now()
  const stats = getLocalStorageStats()
  const { pct, usedBytes, quotaBytes } = stats

  const usedKB  = (usedBytes / 1024).toFixed(1)
  const quotaMB = (quotaBytes / (1024 * 1024)).toFixed(0)

  // Predictive warning
  if (pct >= config.lsAutoCleanPct) {
    const cleared = clearStaleCache()
    const after   = getLocalStorageStats()
    return {
      component: 'storage',
      status:    after.pct > 95 ? 'down' : 'degraded',
      message:   `Storage ${pct.toFixed(1)}% full — auto-cleared ${cleared} stale keys. Now ${after.pct.toFixed(1)}%`,
      ts,
      data:      stats,
    }
  }

  if (pct >= config.lsWarnThresholdPct) {
    return {
      component: 'storage',
      status:    'degraded',
      message:   `Storage at ${pct.toFixed(1)}% (${usedKB}KB / ${quotaMB}MB) — approaching limit`,
      ts,
      data:      stats,
    }
  }

  return {
    component: 'storage',
    status:    'healthy',
    message:   `${usedKB}KB / ${quotaMB}MB (${pct.toFixed(1)}%)`,
    ts,
    data:      stats,
  }
}

// ── WebSocket self-healing ─────────────────────────────────────────────────────

function healWebSockets(wsUrls: string[]): void {
  for (const url of wsUrls) {
    try {
      const manager = getWSManager(url)
      if (manager.getStatus() === 'disconnected' || manager.getStatus() === 'error') {
        manager.connect()
        eventBus.emit('system:health', {
          component: `ws:${url}`,
          status:    'degraded',
          message:   'Auto-reconnect triggered by diagnostics',
          ts:        Date.now(),
        })
      }
    } catch { /* skip */ }
  }
}

// ── API call retry helper ──────────────────────────────────────────────────────

/**
 * Retry a failed API call with exponential backoff.
 * Integrates with the global retry queue to avoid duplicate retries.
 */
export async function retryAPICall<T>(
  key:        string,
  fn:         () => Promise<T>,
  maxRetries: number = 3,
  baseDelayMs: number = 1000
): Promise<T> {
  // Cancel any existing retry for this key
  const existing = pendingRetries.get(key)
  if (existing) {
    clearTimeout(existing)
    pendingRetries.delete(key)
  }

  let lastError: unknown
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const result = await fn()
      apiErrorCounts[key] = 0
      return result
    } catch (err) {
      lastError = err
      apiErrorCounts[key] = (apiErrorCounts[key] ?? 0) + 1

      if (attempt < maxRetries - 1) {
        const delay = baseDelayMs * 2 ** attempt
        await new Promise<void>((resolve) => {
          const timer = setTimeout(resolve, delay)
          pendingRetries.set(key, timer)
        })
        pendingRetries.delete(key)
      }
    }
  }

  throw lastError
}

// ── DiagnosticsRunner class ────────────────────────────────────────────────────
export class DiagnosticsRunner {
  private config:    DiagnosticsConfig
  private timer:     ReturnType<typeof setInterval> | null = null
  private running:   boolean = false
  private listeners: Set<(results: DiagnosticResult[]) => void> = new Set()

  constructor(config: Partial<DiagnosticsConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  // ── Start / stop ─────────────────────────────────────────────────────────────

  start(): void {
    if (this.timer) return
    this.runAll()
    this.timer = setInterval(() => this.runAll(), this.config.intervalMs)
  }

  stop(): void {
    if (this.timer) { clearInterval(this.timer); this.timer = null }
  }

  updateConfig(patch: Partial<DiagnosticsConfig>): void {
    this.config = { ...this.config, ...patch }
  }

  // ── Run all checks ───────────────────────────────────────────────────────────

  async runAll(): Promise<DiagnosticResult[]> {
    if (this.running) return []
    this.running = true

    try {
      const checks: Promise<DiagnosticResult>[] = [
        checkOllama(),
        ...this.config.apiRoutes.map((r) => checkAPIRoute(r)),
        Promise.resolve(checkLocalStorage(this.config)),
        Promise.resolve(checkMemory()),
      ]

      const results = await Promise.all(checks)

      // Self-heal WebSockets
      healWebSockets(this.config.wsUrls)

      // Emit results to eventBus
      results.forEach((r) => {
        eventBus.emit('system:health', {
          component: r.component,
          status:    r.status,
          message:   r.message,
          ts:        r.ts,
        })

        // Predictive API error warning
        const errors = apiErrorCounts[r.component] ?? 0
        if (errors >= this.config.apiErrorThreshold) {
          eventBus.emit('system:error', {
            source: `diagnostics:${r.component}`,
            error:  `${errors} consecutive failures: ${r.message}`,
            ts:     r.ts,
          })
        }
      })

      this.listeners.forEach((l) => l(results))
      return results
    } finally {
      this.running = false
    }
  }

  // ── Subscribe to results ─────────────────────────────────────────────────────

  subscribe(listener: (results: DiagnosticResult[]) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }
}

// ── Singleton instance ─────────────────────────────────────────────────────────
export const diagnostics = new DiagnosticsRunner()

/** Auto-start diagnostics in the browser */
if (typeof window !== 'undefined') {
  // Slight delay to not block initial render
  setTimeout(() => diagnostics.start(), 3000)
}

export default diagnostics
