// ── hooks/useLessons.ts ────────────────────────────────────────────────────────
// Fetches the shared standards rules via /api/project, parses them into a
// domain-scoped LessonTree (ByteRover Context Tree pattern), and populates the
// Zustand store.
//
// Retrieval is agent-aware: ORBIT only searches engineering/ui/deployment,
// CIPHER searches agents/eval, NOVA searches agents/data, etc.
// This cuts injected tokens by 50–70% versus injecting all rules.
//
// Usage:
//   useLessons()  — mount once in GlobalDataLoader
//
// Retrieval helpers (re-exported for convenience):
//   getTopLessonsForAgent(tree, query, agentId, n)
//   getTopLessons(tree, query, n)

'use client'

import { useEffect, useRef } from 'react'
import { useStore } from '@/store/useStore'
import { apiFetch } from '@/lib/apiFetch'
import {
  parseLessonsTree,
  flattenTree,
  getTopLessons,
  getTopLessonsForAgent,
  type LessonTree,
} from '@/lib/lessonsTree'

// Re-export retrieval helpers so callers can import from one place
export { getTopLessons, getTopLessonsForAgent }
export type { LessonTree }

// ── Store bridge ──────────────────────────────────────────────────────────────
// The Zustand store holds a flat Lesson[] for backwards compatibility.
// We additionally keep the structured tree in module-level memory for fast
// domain-scoped retrieval without repeated parsing.

let _cachedTree: LessonTree | null = null

/** Returns the last-parsed lesson tree, or null if not yet loaded. */
export function getLessonTree(): LessonTree | null {
  return _cachedTree
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useLessons(): void {
  const setLessons = useStore((s) => s.setLessons)
  const fetchedRef = useRef(false)
  const standardSlices = [
    "process",
    "engineering",
    "ui",
    "agents",
    "eval",
    "ops",
    "data",
    "deployment",
  ] as const

  useEffect(() => {
    if (fetchedRef.current) return
    fetchedRef.current = true

    const load = async () => {
      try {
        const parts = await Promise.all(
          standardSlices.map(async (slice) => {
            const res = await apiFetch(`/api/project?section=standards&slice=${slice}`)
            if (!res.ok) return ''
            const data = (await res.json()) as { content?: string }
            return data.content ?? ''
          }),
        )
        const md = parts.filter(Boolean).join('\n\n')
        if (!md) return

        const tree    = parseLessonsTree(md)
        const flat    = flattenTree(tree)

        if (flat.length > 0) {
          _cachedTree = tree
          setLessons(flat)
        }
      } catch {
        // Silent failure — lessons are non-critical enhancement
      }
    }

    void load()
  }, [setLessons])
}
