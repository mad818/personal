// ── lib/knowledgeGraph.ts ──────────────────────────────────────────────────────
// NEXUS PRIME — Skill Knowledge Graph
//
// arscontexta-inspired skill graph: builds an adjacency map from skill
// relationships (shared category, overlapping tags, and explicit relatedSkills)
// and exposes BFS/DFS traversal, shortest-path, cluster detection, and hub
// identification.
//
// All computation is in-memory and client-side — no external deps.
//
// Usage:
//   import { buildGraph, getRelatedSkills, getSkillPath,
//            getSkillClusters, getHubSkills } from '@/lib/knowledgeGraph'

'use client'

import type { Skill } from '@/lib/skillEngine'

// ── Types ──────────────────────────────────────────────────────────────────────

/** Adjacency map: skillId → Map of connected skill IDs with edge weight */
export type SkillGraph = Map<string, Map<string, number>>

export interface GraphEdge {
  from:   string
  to:     string
  weight: number
  reason: 'explicit' | 'category' | 'tags'
}

export interface SkillCluster {
  id:       string       // cluster root representative skill ID
  skillIds: string[]
  label:    string       // derived from shared category or dominant tag
}

export interface HubSkill {
  skillId:     string
  skillName:   string
  connections: number
  centrality:  number   // 0-1, normalized degree centrality
}

export interface PathResult {
  path:   string[]   // ordered list of skill IDs from → to
  length: number     // hop count
  found:  boolean
}

// ── Graph construction ─────────────────────────────────────────────────────────

/**
 * buildGraph — create a weighted adjacency map from skill relationships.
 *
 * Edge weight rules:
 *   explicit relatedSkills link  →  weight 10 (strongest)
 *   same category                →  weight  5
 *   shared tag (per tag)         →  weight  2
 *
 * The graph is undirected (edges added in both directions).
 */
export function buildGraph(skills: Skill[]): SkillGraph {
  const graph: SkillGraph = new Map()
  const skillById = new Map<string, Skill>(skills.map(s => [s.id, s]))

  // Initialize adjacency maps for all skills
  skills.forEach(skill => {
    if (!graph.has(skill.id)) {
      graph.set(skill.id, new Map())
    }
  })

  function addEdge(fromId: string, toId: string, weight: number): void {
    if (fromId === toId) return
    if (!graph.has(fromId)) graph.set(fromId, new Map())
    if (!graph.has(toId))   graph.set(toId,   new Map())

    const fromMap = graph.get(fromId)!
    const toMap   = graph.get(toId)!
    // Accumulate weights (a pair may connect via multiple reasons)
    fromMap.set(toId, (fromMap.get(toId) ?? 0) + weight)
    toMap.set(fromId, (toMap.get(fromId) ?? 0) + weight)
  }

  skills.forEach(skill => {
    // 1. Explicit relatedSkills links (weight 10)
    ;(skill.relatedSkills ?? []).forEach(relId => {
      if (skillById.has(relId)) {
        addEdge(skill.id, relId, 10)
      }
    })

    // 2. Same category (weight 5)
    skills.forEach(other => {
      if (other.id !== skill.id && other.category === skill.category) {
        addEdge(skill.id, other.id, 5)
      }
    })

    // 3. Shared tags (weight 2 per shared tag)
    const skillTags = new Set((skill.tags ?? []).map((t: string) => t.toLowerCase()))
    skills.forEach(other => {
      if (other.id === skill.id) return
      const sharedCount = (other.tags ?? []).filter((t: string) =>
        skillTags.has(t.toLowerCase())
      ).length
      if (sharedCount > 0) {
        addEdge(skill.id, other.id, sharedCount * 2)
      }
    })
  })

  return graph
}

/**
 * getEdges — return all unique edges as a flat list (for debugging / visualization)
 */
export function getEdges(graph: SkillGraph, skills: Skill[]): GraphEdge[] {
  const skillById = new Map<string, Skill>(skills.map(s => [s.id, s]))
  const seen      = new Set<string>()
  const edges: GraphEdge[] = []

  Array.from(graph.entries()).forEach(([fromId, neighbors]) => {
    Array.from(neighbors.entries()).forEach(([toId, weight]) => {
      const key = [fromId, toId].sort().join('|')
      if (seen.has(key)) return
      seen.add(key)

      const fromSkill = skillById.get(fromId)
      const toSkill   = skillById.get(toId)

      // Classify the primary edge reason
      let reason: GraphEdge['reason'] = 'tags'
      if (
        (fromSkill?.relatedSkills ?? []).includes(toId) ||
        (toSkill?.relatedSkills   ?? []).includes(fromId)
      ) {
        reason = 'explicit'
      } else if (fromSkill?.category === toSkill?.category) {
        reason = 'category'
      }

      edges.push({ from: fromId, to: toId, weight, reason })
    })
  })

  return edges.sort((a, b) => b.weight - a.weight)
}

// ── Traversal ──────────────────────────────────────────────────────────────────

/**
 * getRelatedSkills — BFS traversal from a skill up to `depth` hops.
 * Returns skill IDs sorted by proximity (hop count) then edge weight.
 *
 * @param graph    Pre-built skill graph
 * @param skillId  Starting node
 * @param depth    Maximum hops (default 2)
 */
export function getRelatedSkills(
  graph:   SkillGraph,
  skillId: string,
  depth:   number = 2
): string[] {
  if (!graph.has(skillId)) return []

  const visited = new Set<string>([skillId])
  const result: Array<{ id: string; hops: number; weight: number }> = []
  let frontier  = [skillId]

  for (let hop = 1; hop <= depth; hop++) {
    const nextFrontier: string[] = []
    frontier.forEach(node => {
      const neighbors = graph.get(node) ?? new Map<string, number>()
      Array.from(neighbors.entries()).forEach(([neighborId, weight]) => {
        if (!visited.has(neighborId)) {
          visited.add(neighborId)
          result.push({ id: neighborId, hops: hop, weight })
          nextFrontier.push(neighborId)
        }
      })
    })
    frontier = nextFrontier
    if (frontier.length === 0) break
  }

  // Sort: fewest hops first, then highest weight
  result.sort((a, b) => a.hops - b.hops || b.weight - a.weight)
  return result.map(r => r.id)
}

/**
 * getSkillPath — BFS shortest path between two skills.
 * Returns the ordered list of skill IDs traversed, inclusive of both ends.
 */
export function getSkillPath(
  graph:  SkillGraph,
  fromId: string,
  toId:   string
): PathResult {
  if (fromId === toId) return { path: [fromId], length: 0, found: true }
  if (!graph.has(fromId) || !graph.has(toId)) {
    return { path: [], length: -1, found: false }
  }

  // BFS with parent tracking
  const parent  = new Map<string, string>([[fromId, '']])
  const queue   = [fromId]

  while (queue.length > 0) {
    const current   = queue.shift()!
    const neighbors = graph.get(current) ?? new Map<string, number>()

    const found = Array.from(neighbors.keys()).some(neighborId => {
      if (parent.has(neighborId)) return false
      parent.set(neighborId, current)

      if (neighborId === toId) {
        return true   // signal found
      }

      queue.push(neighborId)
      return false
    })

    if (found) {
      // Reconstruct path
      const path: string[] = []
      let   node            = toId
      while (node !== '') {
        path.unshift(node)
        node = parent.get(node) ?? ''
      }
      return { path, length: path.length - 1, found: true }
    }
  }

  return { path: [], length: -1, found: false }
}

// ── Clustering ────────────────────────────────────────────────────────────────

/**
 * getSkillClusters — group skills into clusters by connectivity.
 *
 * Uses Union-Find (disjoint sets) on edges with weight >= minWeight.
 * Each cluster is labelled by the dominant category among its members.
 */
export function getSkillClusters(
  graph:     SkillGraph,
  skills:    Skill[],
  minWeight: number = 5
): SkillCluster[] {
  const parent    = new Map<string, string>()
  const skillById = new Map<string, Skill>(skills.map(s => [s.id, s]))

  // Initialize union-find
  skills.forEach(skill => {
    parent.set(skill.id, skill.id)
  })

  function find(id: string): string {
    if (!parent.has(id)) return id
    if (parent.get(id) !== id) {
      parent.set(id, find(parent.get(id)!))
    }
    return parent.get(id)!
  }

  function union(a: string, b: string): void {
    const ra = find(a)
    const rb = find(b)
    if (ra !== rb) parent.set(ra, rb)
  }

  // Union all strongly connected pairs
  Array.from(graph.entries()).forEach(([fromId, neighbors]) => {
    Array.from(neighbors.entries()).forEach(([toId, weight]) => {
      if (weight >= minWeight) {
        union(fromId, toId)
      }
    })
  })

  // Group by root
  const clusterMap = new Map<string, string[]>()
  skills.forEach(skill => {
    const root = find(skill.id)
    if (!clusterMap.has(root)) clusterMap.set(root, [])
    clusterMap.get(root)!.push(skill.id)
  })

  // Build cluster objects
  const clusters: SkillCluster[] = []
  Array.from(clusterMap.entries()).forEach(([root, memberIds]) => {
    const members = memberIds
      .map(id => skillById.get(id))
      .filter((s): s is Skill => s !== undefined)

    if (members.length === 0) return

    // Find the highest-level skill as cluster representative
    const rep = members.reduce((best, s) => s.level > best.level ? s : best, members[0])

    // Dominant category
    const catCount: Record<string, number> = {}
    members.forEach(m => {
      catCount[m.category] = (catCount[m.category] ?? 0) + 1
    })
    const dominantCat =
      Object.entries(catCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'Unknown'

    clusters.push({
      id:       rep.id,
      skillIds: memberIds,
      label:    memberIds.length > 1
        ? `${dominantCat} (${memberIds.length} skills)`
        : (skillById.get(root)?.name ?? root),
    })
  })

  // Sort by cluster size descending
  return clusters.sort((a, b) => b.skillIds.length - a.skillIds.length)
}

// ── Hub detection ─────────────────────────────────────────────────────────────

/**
 * getHubSkills — find the most highly connected skills (knowledge hubs).
 *
 * Returns skills sorted by degree centrality (normalized by max possible degree).
 */
export function getHubSkills(
  graph:          SkillGraph,
  skills:         Skill[],
  topK:           number = 5,
  minConnections: number = 1
): HubSkill[] {
  const skillById  = new Map<string, Skill>(skills.map(s => [s.id, s]))
  const maxDegree  = Math.max(1, skills.length - 1)
  const hubs: HubSkill[] = []

  Array.from(graph.entries()).forEach(([skillId, neighbors]) => {
    const connections = neighbors.size
    if (connections < minConnections) return

    const skill = skillById.get(skillId)
    hubs.push({
      skillId,
      skillName:   skill?.name ?? skillId,
      connections,
      centrality:  parseFloat((connections / maxDegree).toFixed(4)),
    })
  })

  return hubs
    .sort((a, b) => b.connections - a.connections || b.centrality - a.centrality)
    .slice(0, topK)
}

// ── Wikilink helpers ──────────────────────────────────────────────────────────

/**
 * getWikilinks — given a text string and a list of skills, find all skill
 * names mentioned in the text and return them as [[wikilink]] style references.
 */
export function getWikilinks(
  text:   string,
  skills: Skill[]
): Array<{ name: string; id: string; start: number; end: number }> {
  const results: Array<{ name: string; id: string; start: number; end: number }> = []
  const textLower = text.toLowerCase()

  skills.forEach(skill => {
    const nameLower = skill.name.toLowerCase()
    let   searchFrom = 0
    while (true) {
      const pos = textLower.indexOf(nameLower, searchFrom)
      if (pos === -1) break
      results.push({ name: skill.name, id: skill.id, start: pos, end: pos + skill.name.length })
      searchFrom = pos + 1
    }
  })

  return results.sort((a, b) => a.start - b.start)
}

/**
 * renderWithWikilinks — insert [[SkillName]] markers around skill mentions in text.
 */
export function renderWithWikilinks(text: string, skills: Skill[]): string {
  const links = getWikilinks(text, skills)
  if (links.length === 0) return text

  let result  = ''
  let lastEnd = 0
  const seen  = new Set<string>()

  links.forEach(link => {
    if (seen.has(link.id)) return  // don't double-link
    result  += text.slice(lastEnd, link.start)
    result  += `[[${link.name}]]`
    lastEnd  = link.end
    seen.add(link.id)
  })

  result += text.slice(lastEnd)
  return result
}

// ── Serialization ─────────────────────────────────────────────────────────────

/**
 * serializeGraph — convert SkillGraph to a JSON-friendly adjacency list.
 */
export function serializeGraph(graph: SkillGraph): Record<string, Record<string, number>> {
  const out: Record<string, Record<string, number>> = {}
  Array.from(graph.entries()).forEach(([from, neighbors]) => {
    out[from] = {}
    Array.from(neighbors.entries()).forEach(([to, weight]) => {
      out[from][to] = weight
    })
  })
  return out
}

/**
 * deserializeGraph — restore a SkillGraph from a serialized adjacency list.
 */
export function deserializeGraph(raw: Record<string, Record<string, number>>): SkillGraph {
  const graph: SkillGraph = new Map()
  Object.entries(raw).forEach(([from, neighbors]) => {
    const map = new Map<string, number>()
    Object.entries(neighbors).forEach(([to, weight]) => {
      map.set(to, weight)
    })
    graph.set(from, map)
  })
  return graph
}

// ── Default export ────────────────────────────────────────────────────────────

const knowledgeGraphExports = {
  buildGraph,
  getEdges,
  getRelatedSkills,
  getSkillPath,
  getSkillClusters,
  getHubSkills,
  getWikilinks,
  renderWithWikilinks,
  serializeGraph,
  deserializeGraph,
}

export default knowledgeGraphExports
