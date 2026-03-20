// ── lib/memoryStore.ts ────────────────────────────────────────────────────────
// NEXUS PRIME — Persistent Agent Memory (IndexedDB)
//
// Gigabrain-inspired memory system that persists across browser sessions.
// Uses native IndexedDB API with no external dependencies.
//
// Memory types:
//   fact        — durable knowledge ("NVD API is rate limited to 5 req/30s")
//   preference  — user preferences ("User prefers dark theme")
//   episode     — event memories ("Detected unusual login at 3am")
//   skill_note  — notes about skill performance
//
// Usage:
//   import { remember, recall, checkpoint, getContradictions,
//            pruneOldMemories, exportMemories, importMemories } from '@/lib/memoryStore'

'use client'

// ── Types ─────────────────────────────────────────────────────────────────────

export type MemoryType = 'fact' | 'preference' | 'episode' | 'skill_note'

export interface Memory {
  id:             string
  content:        string
  type:           MemoryType
  tags:           string[]
  timestamp:      number     // creation time (ms since epoch)
  accessCount:    number     // number of times recalled
  relevanceScore: number     // 0-1, updated on access
  source?:        string     // who created this memory (e.g., 'agent', 'user')
  updatedAt?:     number
}

export interface SystemSnapshot {
  label:     string
  timestamp: number
  data:      Record<string, unknown>
}

// ── IndexedDB constants ───────────────────────────────────────────────────────

const DB_NAME    = 'nexus-memory'
const STORE_NAME = 'memories'
const SNAP_STORE = 'checkpoints'
const DB_VERSION = 1

// ── DB initialization ─────────────────────────────────────────────────────────

let _db: IDBDatabase | null = null

function openDB(): Promise<IDBDatabase> {
  if (_db) return Promise.resolve(_db)

  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not available'))
      return
    }

    const req = indexedDB.open(DB_NAME, DB_VERSION)

    req.onupgradeneeded = (evt) => {
      const db = (evt.target as IDBOpenDBRequest).result

      // Memories store
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' })
        store.createIndex('type',      'type',      { unique: false })
        store.createIndex('timestamp', 'timestamp', { unique: false })
      }

      // Checkpoints store
      if (!db.objectStoreNames.contains(SNAP_STORE)) {
        db.createObjectStore(SNAP_STORE, { keyPath: 'label' })
      }
    }

    req.onsuccess = (evt) => {
      _db = (evt.target as IDBOpenDBRequest).result
      resolve(_db)
    }

    req.onerror = (evt) => {
      reject((evt.target as IDBOpenDBRequest).error)
    }
  })
}

// ── Generic IDB helpers ───────────────────────────────────────────────────────

function idbPut<T>(storeName: string, value: T): Promise<void> {
  return openDB().then(db => new Promise((resolve, reject) => {
    const tx    = db.transaction(storeName, 'readwrite')
    const store = tx.objectStore(storeName)
    const req   = store.put(value)
    req.onsuccess   = () => resolve()
    req.onerror     = (e) => reject((e.target as IDBRequest).error)
  }))
}

function idbGet<T>(storeName: string, key: string): Promise<T | undefined> {
  return openDB().then(db => new Promise((resolve, reject) => {
    const tx    = db.transaction(storeName, 'readonly')
    const store = tx.objectStore(storeName)
    const req   = store.get(key)
    req.onsuccess = (e) => resolve((e.target as IDBRequest<T>).result)
    req.onerror   = (e) => reject((e.target as IDBRequest).error)
  }))
}

function idbGetAll<T>(storeName: string): Promise<T[]> {
  return openDB().then(db => new Promise((resolve, reject) => {
    const tx    = db.transaction(storeName, 'readonly')
    const store = tx.objectStore(storeName)
    const req   = store.getAll()
    req.onsuccess = (e) => resolve((e.target as IDBRequest<T[]>).result ?? [])
    req.onerror   = (e) => reject((e.target as IDBRequest).error)
  }))
}

function idbDelete(storeName: string, key: string): Promise<void> {
  return openDB().then(db => new Promise((resolve, reject) => {
    const tx    = db.transaction(storeName, 'readwrite')
    const store = tx.objectStore(storeName)
    const req   = store.delete(key)
    req.onsuccess = () => resolve()
    req.onerror   = (e) => reject((e.target as IDBRequest).error)
  }))
}

function idbClear(storeName: string): Promise<void> {
  return openDB().then(db => new Promise((resolve, reject) => {
    const tx    = db.transaction(storeName, 'readwrite')
    const store = tx.objectStore(storeName)
    const req   = store.clear()
    req.onsuccess = () => resolve()
    req.onerror   = (e) => reject((e.target as IDBRequest).error)
  }))
}

// ── ID generator ──────────────────────────────────────────────────────────────

function newMemoryId(): string {
  return `mem-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

// ── Relevance scoring helper ──────────────────────────────────────────────────
// Decays over time, boosted by access frequency

function computeRelevanceScore(memory: Memory): number {
  const ageDays = (Date.now() - memory.timestamp) / (1000 * 60 * 60 * 24)
  // Time decay: half-life of ~30 days for facts, ~7 days for episodes
  const halfLife: Record<MemoryType, number> = {
    fact:       30,
    preference: 90,   // preferences are long-lived
    episode:    7,
    skill_note: 14,
  }
  const hl    = halfLife[memory.type]
  const decay = Math.pow(0.5, ageDays / hl)
  // Access boost: each recall adds a small permanent bonus
  const accessBoost = Math.min(0.3, memory.accessCount * 0.02)
  return parseFloat(Math.min(1, decay + accessBoost).toFixed(4))
}

// ─────────────────────────────────────────────────────────────────────────────
// remember — store a new memory with timestamp
// ─────────────────────────────────────────────────────────────────────────────

export async function remember(
  content: string,
  type:    MemoryType,
  tags:    string[] = [],
  source?: string
): Promise<Memory> {
  const memory: Memory = {
    id:             newMemoryId(),
    content,
    type,
    tags:           tags.map(t => t.toLowerCase().trim()).filter(Boolean),
    timestamp:      Date.now(),
    accessCount:    0,
    relevanceScore: 1.0,   // new memories start at full relevance
    source,
    updatedAt:      Date.now(),
  }

  await idbPut<Memory>(STORE_NAME, memory)
  return memory
}

// ─────────────────────────────────────────────────────────────────────────────
// recall — search memories by content/tags (substring + tag matching)
// ─────────────────────────────────────────────────────────────────────────────

export async function recall(query: string, limit: number = 10): Promise<Memory[]> {
  const all     = await idbGetAll<Memory>(STORE_NAME)
  const q       = query.toLowerCase()
  const tokens  = q.split(/\W+/).filter(t => t.length > 2)

  const scored = all
    .map(mem => {
      const contentLower = mem.content.toLowerCase()
      let score = 0

      // Direct substring match in content
      if (contentLower.includes(q)) score += 50

      // Token matches in content
      const tokenMatches = tokens.filter(t => contentLower.includes(t)).length
      score += tokenMatches * 10

      // Tag matches
      const tagMatches = mem.tags.filter(tag =>
        tokens.some(t => tag.includes(t) || t.includes(tag))
      ).length
      score += tagMatches * 15

      // Boost by relevance score and recency
      const finalScore = score * (0.5 + mem.relevanceScore * 0.5)

      return { mem, score: finalScore }
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ mem }) => mem)

  // Update accessCount and relevanceScore for recalled memories
  for (const mem of scored) {
    const updated: Memory = {
      ...mem,
      accessCount:    mem.accessCount + 1,
      relevanceScore: computeRelevanceScore({ ...mem, accessCount: mem.accessCount + 1 }),
      updatedAt:      Date.now(),
    }
    await idbPut<Memory>(STORE_NAME, updated)
  }

  return scored
}

// ─────────────────────────────────────────────────────────────────────────────
// checkpoint — save current system state snapshot
// ─────────────────────────────────────────────────────────────────────────────

export async function checkpoint(
  label: string,
  data:  Record<string, unknown> = {}
): Promise<SystemSnapshot> {
  const snap: SystemSnapshot = {
    label,
    timestamp: Date.now(),
    data,
  }
  await idbPut<SystemSnapshot>(SNAP_STORE, snap)
  return snap
}

export async function getCheckpoint(label: string): Promise<SystemSnapshot | undefined> {
  return idbGet<SystemSnapshot>(SNAP_STORE, label)
}

export async function listCheckpoints(): Promise<SystemSnapshot[]> {
  return idbGetAll<SystemSnapshot>(SNAP_STORE)
}

// ─────────────────────────────────────────────────────────────────────────────
// getContradictions — find memories that might conflict with new info
// ─────────────────────────────────────────────────────────────────────────────

export async function getContradictions(content: string): Promise<Memory[]> {
  const all    = await idbGetAll<Memory>(STORE_NAME)
  const tokens = content.toLowerCase().split(/\W+/).filter(t => t.length > 3)

  // Contradiction heuristics:
  //  1. Same topic tokens but different numeric values
  //  2. Negation patterns ("not", "no longer", "deprecated", "removed")
  //  3. "was X, now Y" type patterns

  const candidates = all.filter(mem => {
    const memLower = mem.content.toLowerCase()

    // Must share topic tokens (otherwise unrelated)
    const sharedTokens = tokens.filter(t => memLower.includes(t)).length
    if (sharedTokens < 2) return false

    // Look for potential contradictions
    const newHasNegation  = /\b(not|no longer|deprecated|removed|disabled|false|never)\b/.test(content.toLowerCase())
    const memHasNegation  = /\b(not|no longer|deprecated|removed|disabled|false|never)\b/.test(memLower)
    if (newHasNegation !== memHasNegation) return true   // one negates, other doesn't

    // Different numeric values on same topic
    const newNums = content.match(/\d+\.?\d*/g) ?? []
    const memNums = mem.content.match(/\d+\.?\d*/g) ?? []
    const hasConflictingNums = newNums.length > 0 && memNums.length > 0 &&
      newNums.some(n => memNums.some(m => m !== n && parseFloat(m) !== parseFloat(n)))
    if (hasConflictingNums) return true

    return false
  })

  return candidates.sort((a, b) => b.relevanceScore - a.relevanceScore).slice(0, 5)
}

// ─────────────────────────────────────────────────────────────────────────────
// pruneOldMemories — remove memories older than maxAge days
// ─────────────────────────────────────────────────────────────────────────────

export async function pruneOldMemories(maxAgeDays: number = 90): Promise<number> {
  const all       = await idbGetAll<Memory>(STORE_NAME)
  const cutoff    = Date.now() - maxAgeDays * 86400000
  const toDelete  = all.filter(m => {
    // Never prune high-access or high-relevance memories
    if (m.accessCount > 5)    return false
    if (m.relevanceScore > 0.5) return false
    // Preferences are long-lived
    if (m.type === 'preference') return false
    return m.timestamp < cutoff
  })

  for (const mem of toDelete) {
    await idbDelete(STORE_NAME, mem.id)
  }

  return toDelete.length
}

// ─────────────────────────────────────────────────────────────────────────────
// exportMemories — export all memories as JSON string
// ─────────────────────────────────────────────────────────────────────────────

export async function exportMemories(): Promise<string> {
  const memories = await idbGetAll<Memory>(STORE_NAME)
  return JSON.stringify({
    version:   1,
    exported:  new Date().toISOString(),
    count:     memories.length,
    memories,
  }, null, 2)
}

// ─────────────────────────────────────────────────────────────────────────────
// importMemories — import memories from JSON string
// Merges with existing memories (by id deduplication).
// ─────────────────────────────────────────────────────────────────────────────

export async function importMemories(json: string): Promise<{ imported: number; skipped: number }> {
  let parsed: { memories: Memory[] }
  try {
    parsed = JSON.parse(json) as { memories: Memory[] }
  } catch {
    throw new Error('Invalid JSON — could not parse memory export')
  }

  if (!Array.isArray(parsed.memories)) {
    throw new Error('Invalid format — expected { memories: [...] }')
  }

  const existing = await idbGetAll<Memory>(STORE_NAME)
  const existingIds = new Set(existing.map(m => m.id))

  let imported = 0
  let skipped  = 0

  for (const mem of parsed.memories) {
    if (!mem.id || !mem.content || !mem.type) { skipped++; continue }
    if (existingIds.has(mem.id)) { skipped++; continue }

    // Sanitize the memory
    const safe: Memory = {
      id:             mem.id,
      content:        String(mem.content).slice(0, 2000),
      type:           (['fact', 'preference', 'episode', 'skill_note'].includes(mem.type)
                         ? mem.type : 'fact') as MemoryType,
      tags:           Array.isArray(mem.tags) ? mem.tags.slice(0, 20) : [],
      timestamp:      typeof mem.timestamp === 'number' ? mem.timestamp : Date.now(),
      accessCount:    typeof mem.accessCount === 'number' ? mem.accessCount : 0,
      relevanceScore: typeof mem.relevanceScore === 'number'
                        ? Math.min(1, Math.max(0, mem.relevanceScore)) : 1.0,
      source:         mem.source,
      updatedAt:      mem.updatedAt ?? Date.now(),
    }

    await idbPut<Memory>(STORE_NAME, safe)
    imported++
  }

  return { imported, skipped }
}

// ── Convenience: get all memories of a specific type ─────────────────────────

export async function recallByType(type: MemoryType, limit: number = 50): Promise<Memory[]> {
  const all = await idbGetAll<Memory>(STORE_NAME)
  return all
    .filter(m => m.type === type)
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, limit)
}

// ── Convenience: count memories by type ──────────────────────────────────────

export async function getMemoryStats(): Promise<Record<MemoryType | 'total', number>> {
  const all = await idbGetAll<Memory>(STORE_NAME)
  const stats: Record<string, number> = { total: all.length }
  for (const m of all) {
    stats[m.type] = (stats[m.type] ?? 0) + 1
  }
  return stats as Record<MemoryType | 'total', number>
}

// ── Convenience: update an existing memory ───────────────────────────────────

export async function updateMemory(id: string, updates: Partial<Omit<Memory, 'id'>>): Promise<void> {
  const existing = await idbGet<Memory>(STORE_NAME, id)
  if (!existing) throw new Error(`Memory ${id} not found`)
  const updated: Memory = { ...existing, ...updates, updatedAt: Date.now() }
  await idbPut<Memory>(STORE_NAME, updated)
}

// ── Convenience: delete a memory ─────────────────────────────────────────────

export async function forgetMemory(id: string): Promise<void> {
  await idbDelete(STORE_NAME, id)
}

// ── Reset (for testing / dev) ─────────────────────────────────────────────────

export async function clearAllMemories(): Promise<void> {
  await idbClear(STORE_NAME)
}

// ── Default export ────────────────────────────────────────────────────────────

const memoryStoreExports = {
  remember,
  recall,
  recallByType,
  checkpoint,
  getCheckpoint,
  listCheckpoints,
  getContradictions,
  pruneOldMemories,
  exportMemories,
  importMemories,
  getMemoryStats,
  updateMemory,
  forgetMemory,
  clearAllMemories,
}

export default memoryStoreExports
