// lib/apiCache.ts — server-side, no 'use client'

export interface CacheConfig {
  maxEntries: number   // default 200
  defaultTTL: number   // default 300000 (5 min)
}

const DEFAULT_CACHE_CONFIG: CacheConfig = {
  maxEntries: 200,
  defaultTTL: 300_000,
}

interface CacheEntry<T> {
  value: T
  expiresAt: number
  key: string
}

export interface CacheStats {
  size: number
  hits: number
  misses: number
  hitRate: number
}

export interface Cache<T = unknown> {
  get(key: string): T | undefined
  set(key: string, value: T, ttl?: number): void
  has(key: string): boolean
  delete(key: string): void
  clear(): void
  stats(): CacheStats
}

export function createCache<T = unknown>(config: Partial<CacheConfig> = {}): Cache<T> {
  const cfg: CacheConfig = { ...DEFAULT_CACHE_CONFIG, ...config }

  // Ordered map maintains insertion order for LRU eviction
  const store = new Map<string, CacheEntry<T>>()
  let hits = 0
  let misses = 0

  function isExpired(entry: CacheEntry<T>): boolean {
    return Date.now() > entry.expiresAt
  }

  function evictLRU() {
    // Map iteration order is insertion order; first entry is oldest (LRU)
    const firstKey = store.keys().next().value
    if (firstKey !== undefined) {
      store.delete(firstKey)
    }
  }

  function pruneExpired() {
    store.forEach((entry, key) => {
      if (isExpired(entry)) {
        store.delete(key)
      }
    })
  }

  function get(key: string): T | undefined {
    const entry = store.get(key)
    if (!entry) {
      misses++
      return undefined
    }
    if (isExpired(entry)) {
      store.delete(key)
      misses++
      return undefined
    }
    // Promote to most-recently-used by reinserting
    store.delete(key)
    store.set(key, entry)
    hits++
    return entry.value
  }

  function set(key: string, value: T, ttl?: number): void {
    const resolvedTTL = ttl ?? cfg.defaultTTL

    // If updating existing key, remove first to re-insert at end (MRU position)
    if (store.has(key)) {
      store.delete(key)
    }

    // Evict until under limit (also prune expired first for efficiency)
    if (store.size >= cfg.maxEntries) {
      pruneExpired()
      while (store.size >= cfg.maxEntries) {
        evictLRU()
      }
    }

    store.set(key, {
      key,
      value,
      expiresAt: Date.now() + resolvedTTL,
    })
  }

  function has(key: string): boolean {
    const entry = store.get(key)
    if (!entry) return false
    if (isExpired(entry)) {
      store.delete(key)
      return false
    }
    return true
  }

  function deleteKey(key: string): void {
    store.delete(key)
  }

  function clear(): void {
    store.clear()
    hits = 0
    misses = 0
  }

  function stats(): CacheStats {
    pruneExpired()
    const total = hits + misses
    return {
      size: store.size,
      hits,
      misses,
      hitRate: total === 0 ? 0 : hits / total,
    }
  }

  return { get, set, has, delete: deleteKey, clear, stats }
}
