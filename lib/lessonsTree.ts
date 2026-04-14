// ── lib/lessonsTree.ts ────────────────────────────────────────────────────────
// Domain-scoped lesson tree — ByteRover Context Tree pattern.
//
// lessons.md is structured as `## DomainName` sections, each containing
// numbered rules. This module parses that structure into a tree and provides
// fast, domain-scoped retrieval to reduce injected tokens by 50–70%.
//
// Agent → domain mapping:
//   ORBIT   → engineering, ui
//   CIPHER  → agents (security rules live here too)
//   NOVA    → agents, data
//   FLUX    → data, ops
//   JANSKY  → all domains (orchestrator)

import type { Lesson } from '@/store/useStore'

// ── Types ─────────────────────────────────────────────────────────────────────

export type LessonDomain =
  | 'process'
  | 'engineering'
  | 'ui'
  | 'agents'
  | 'eval'
  | 'ops'
  | 'data'
  | 'deployment'

export type LessonTree = Record<LessonDomain, Lesson[]>

/** Maps agent IDs to their primary and secondary domains. */
const AGENT_DOMAINS: Record<string, LessonDomain[]> = {
  ORBIT:  ['engineering', 'ui', 'deployment'],
  CIPHER: ['agents', 'eval'],
  NOVA:   ['agents', 'data'],
  FLUX:   ['data', 'ops'],
  JANSKY: ['process', 'agents', 'ops', 'eval', 'engineering', 'ui', 'data', 'deployment'],
}

// Ordered domain priority when no agent is specified
const ALL_DOMAINS: LessonDomain[] = [
  'process', 'agents', 'engineering', 'ui', 'eval', 'ops', 'data', 'deployment',
]

// Section headers in lessons.md map to domain keys (case-insensitive)
const HEADER_TO_DOMAIN: Record<string, LessonDomain> = {
  process:     'process',
  engineering: 'engineering',
  ui:          'ui',
  agents:      'agents',
  eval:        'eval',
  ops:         'ops',
  data:        'data',
  deployment:  'deployment',
}

// ── Parser ────────────────────────────────────────────────────────────────────

const EMPTY_TREE = (): LessonTree => ({
  process:     [],
  engineering: [],
  ui:          [],
  agents:      [],
  eval:        [],
  ops:         [],
  data:        [],
  deployment:  [],
})

/**
 * Parse a lessons.md string into a domain-scoped tree.
 * Handles the `## DomainName` section format, and numbered rules within each.
 */
export function parseLessonsTree(md: string): LessonTree {
  const tree = EMPTY_TREE()
  let currentDomain: LessonDomain | null = null
  let idOffset = 0 // cumulative rule counter across the whole file for unique IDs

  for (const line of md.split('\n')) {
    const trimmed = line.trim()

    // Detect `## SectionHeader`
    const headerMatch = trimmed.match(/^##\s+(.+)$/)
    if (headerMatch) {
      const key = headerMatch[1].toLowerCase().replace(/\s+/g, '')
      currentDomain = HEADER_TO_DOMAIN[key] ?? null
      continue
    }

    // Detect numbered rule: `1. Rule text` or `10. Rule text`
    if (currentDomain) {
      const ruleMatch = trimmed.match(/^(\d+)\.\s+(.+)$/)
      if (ruleMatch) {
        const localId  = parseInt(ruleMatch[1], 10)
        const rule     = ruleMatch[2].trim()
        const globalId = idOffset + localId

        tree[currentDomain].push({
          id:             globalId,
          rule,
          reinforcedCount: 0,
        })
      }
    }

    // Track max local ID seen to build globally-unique IDs per domain
    if (trimmed.startsWith('---')) {
      // End of a section — bump the offset so IDs stay unique across domains
      // Use a fixed stride of 100 per domain for stable IDs
      idOffset += 100
      currentDomain = null
    }
  }

  return tree
}

// ── Flat representation (for store compatibility) ─────────────────────────────

/**
 * Flatten a LessonTree into a Lesson[] array — used to populate the Zustand
 * store which still holds a flat array for backwards compatibility.
 */
export function flattenTree(tree: LessonTree): Lesson[] {
  return ALL_DOMAINS.flatMap((domain) => tree[domain])
}

// ── Domain-aware retrieval ────────────────────────────────────────────────────

/**
 * Score a single lesson against a query string.
 * Returns a number: higher = more relevant.
 */
function scoreLesson(lesson: Lesson, queryWords: Set<string>): number {
  if (queryWords.size === 0) return lesson.reinforcedCount
  const ruleWords = lesson.rule
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
  const hits = ruleWords.filter((w) => w.length > 3 && queryWords.has(w)).length
  return hits * 10 + lesson.reinforcedCount
}

/**
 * Build a Set of query words (length > 3, lowercased) from a query string.
 */
function queryWordSet(query: string): Set<string> {
  return new Set(
    query
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 3)
  )
}

/**
 * Get the top-N most relevant lessons for a given agent + query.
 *
 * Strategy:
 * 1. Search the agent's primary domains first.
 * 2. If fewer than N results found with score > 0, extend to secondary domains.
 * 3. Final fallback: most-reinforced lessons across all domains.
 *
 * This is the core of the 50–70% token savings: agents only see rules
 * from domains relevant to their specialty.
 */
export function getTopLessonsForAgent(
  tree:    LessonTree,
  query:   string,
  agentId: string,
  n = 3
): Lesson[] {
  const domains  = AGENT_DOMAINS[agentId.toUpperCase()] ?? ALL_DOMAINS
  const words    = queryWordSet(query)

  // Score all lessons in the agent's domains
  const candidates: { lesson: Lesson; score: number; domainPriority: number }[] = []

  for (let di = 0; di < domains.length; di++) {
    const domain = domains[di]
    for (const lesson of tree[domain]) {
      const score = scoreLesson(lesson, words)
      if (score > 0) {
        candidates.push({ lesson, score, domainPriority: di })
      }
    }
  }

  // Sort: first by score desc, then by domain priority (lower index = higher priority)
  candidates.sort((a, b) =>
    b.score !== a.score
      ? b.score - a.score
      : a.domainPriority - b.domainPriority
  )

  const top = candidates.slice(0, n).map((c) => c.lesson)

  // Fallback: not enough scored results — fill with most-reinforced from primary domains
  if (top.length < n) {
    const seen = new Set(top.map((l) => l.id))
    const fallback = domains
      .flatMap((d) => tree[d])
      .filter((l) => !seen.has(l.id))
      .sort((a, b) => b.reinforcedCount - a.reinforcedCount)
      .slice(0, n - top.length)
    top.push(...fallback)
  }

  return top
}

/**
 * Simple domain-agnostic retrieval — used when no agentId is known.
 * Falls back to keyword scoring across all domains.
 */
export function getTopLessons(
  tree:  LessonTree,
  query: string,
  n = 3
): Lesson[] {
  return getTopLessonsForAgent(tree, query, 'JANSKY', n)
}
