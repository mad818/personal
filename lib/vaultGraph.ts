// ── lib/vaultGraph.ts ─────────────────────────────────────────────────────────
// VAULT Knowledge Graph v2 (Block Q)
// Source inspiration: breferrari/obsidian-mind
//
// Builds a force-directed knowledge graph from VAULT items.
// Entity detection is heuristic (no AI). Graph construction is purely additive —
// never modifies vault items.

import type {
  VaultItemMetadata,
  VaultEdge,
  VaultGraphData,
  VaultIndex,
  VaultLintResult,
} from "@/components/home/office/types";

// ── Entity detection ──────────────────────────────────────────────────────────
// Extracts named entities from text using keyword patterns.
// Heuristic only — no API calls.

const ENTITY_PATTERNS = [
  /\b(bitcoin|btc|ethereum|eth|solana|sol|crypto|defi|nft|blockchain)\b/gi,
  /\b(CVE-\d{4}-\d+)\b/g,
  /\b(next\.?js|react|typescript|tailwind|zustand|vercel)\b/gi,
  /\b(OpenAI|Anthropic|Claude|GPT|Groq|Gemini|LLM|AI|ML)\b/gi,
  /\b(security|vulnerability|exploit|patch|zero.?day|ransomware)\b/gi,
  /\b(market|bull|bear|trade|portfolio|position|signal)\b/gi,
  /\b(Fed|FOMC|inflation|interest rate|recession|GDP)\b/gi,
];

export function detectEntities(text: string): string[] {
  const found = new Set<string>();
  for (const pattern of ENTITY_PATTERNS) {
    const matches = Array.from(text.matchAll(pattern));
    for (const m of matches) {
      found.add(m[0].toLowerCase());
    }
  }
  return Array.from(found);
}

// ── buildAdjacency ────────────────────────────────────────────────────────────
// Builds edges between vault items based on shared tags and entity co-occurrence.
export function buildAdjacency(
  nodes: VaultItemMetadata[],
  texts: Record<string, string>,
): VaultEdge[] {
  const edges: VaultEdge[] = [];
  const entityMap: Record<string, string[]> = {};

  // Extract entities per node
  for (const node of nodes) {
    const text = texts[node.id] ?? node.title ?? "";
    entityMap[node.id] = detectEntities(text + " " + node.tags.join(" "));
  }

  // Rule 1: never connect user vault items to agent vault items
  // Compare all pairs — O(n²) but vault items are typically < 500
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i];
      const b = nodes[j];
      // Rule 1: cross-namespace edges are noise — skip them
      if ((a.namespace ?? "user") !== (b.namespace ?? "user")) continue;
      const reasons: string[] = [];
      let weight = 0;

      // Shared tags
      const sharedTags = a.tags.filter((t) => b.tags.includes(t));
      if (sharedTags.length > 0) {
        weight += Math.min(0.5, sharedTags.length * 0.15);
        reasons.push(`shared tag: ${sharedTags.slice(0, 2).join(", ")}`);
      }

      // Same agent
      if (a.agentId && a.agentId === b.agentId) {
        weight += 0.1;
        reasons.push("same agent");
      }

      // Entity overlap
      const entA = new Set(entityMap[a.id] ?? []);
      const entB = new Set(entityMap[b.id] ?? []);
      const overlap = Array.from(entA).filter((e) => entB.has(e));
      if (overlap.length > 0) {
        weight += Math.min(0.4, overlap.length * 0.1);
        reasons.push(`entity overlap: ${overlap.slice(0, 2).join(", ")}`);
      }

      if (weight > 0.05) {
        const protectedEdge =
          a.visibility === "restricted" || b.visibility === "restricted";
        edges.push({
          source: a.id,
          target: b.id,
          weight: Math.min(1, weight),
          reason: protectedEdge
            ? "protected graph linkage"
            : reasons.join(" · "),
          kind: "heuristic",
          directed: false,
        });
      }
    }
  }

  return edges;
}

// ── findOrphans ───────────────────────────────────────────────────────────────
export function findOrphans(
  nodes: VaultItemMetadata[],
  edges: VaultEdge[],
): string[] {
  const connected = new Set<string>();
  for (const e of edges) {
    connected.add(e.source);
    connected.add(e.target);
  }
  return nodes.filter((n) => !connected.has(n.id)).map((n) => n.id);
}

// ── detectClusters ────────────────────────────────────────────────────────────
// Simple greedy clustering: nodes with weight > 0.3 edges form a cluster.
export function detectClusters(
  nodes: VaultItemMetadata[],
  edges: VaultEdge[],
): string[][] {
  const adjacency: Record<string, Set<string>> = {};
  for (const n of nodes) adjacency[n.id] = new Set();
  for (const e of edges) {
    if (e.weight >= 0.3) {
      adjacency[e.source]?.add(e.target);
      adjacency[e.target]?.add(e.source);
    }
  }

  const visited = new Set<string>();
  const clusters: string[][] = [];

  for (const node of nodes) {
    if (visited.has(node.id)) continue;
    // BFS to find the cluster
    const cluster: string[] = [];
    const queue = [node.id];
    while (queue.length > 0) {
      const curr = queue.shift()!;
      if (visited.has(curr)) continue;
      visited.add(curr);
      cluster.push(curr);
      for (const neighbor of Array.from(adjacency[curr] ?? [])) {
        if (!visited.has(neighbor)) queue.push(neighbor);
      }
    }
    if (cluster.length > 1) clusters.push(cluster);
  }

  return clusters;
}

// ── computeRelevanceDecay ─────────────────────────────────────────────────────
// Reduces edge weight for old connections (items > 30 days old).
export function computeRelevanceDecay(
  edges: VaultEdge[],
  nodes: VaultItemMetadata[],
): VaultEdge[] {
  const nodeAge: Record<string, number> = {};
  const now = Date.now();
  for (const n of nodes) {
    nodeAge[n.id] = Math.min(1, (now - n.timestamp) / (30 * 24 * 3600 * 1000));
  }
  return edges.map((e) => ({
    ...e,
    weight:
      e.kind === "archive_link"
        ? e.weight
        : e.weight *
          (1 - 0.3 * Math.max(nodeAge[e.source] ?? 0, nodeAge[e.target] ?? 0)),
  }));
}

function mergeGraphEdges(edges: VaultEdge[]) {
  const deduped = new Map<string, VaultEdge>();
  for (const edge of edges) {
    const key = `${edge.source}->${edge.target}:${edge.kind ?? "heuristic"}`;
    const current = deduped.get(key);
    if (!current || edge.weight > current.weight) {
      deduped.set(key, edge);
    }
  }
  return Array.from(deduped.values());
}

// ── buildVaultGraph ───────────────────────────────────────────────────────────
// Main entry point — builds the full graph from raw vault items.
export function buildVaultGraph(
  items: VaultItemMetadata[],
  texts: Record<string, string> = {},
  archiveEdges: VaultEdge[] = [],
): VaultGraphData {
  if (items.length === 0) {
    return {
      nodes: [],
      edges: [],
      clusters: [],
      orphans: [],
      builtAt: Date.now(),
    };
  }
  const rawEdges = mergeGraphEdges([
    ...buildAdjacency(items, texts),
    ...archiveEdges,
  ]);
  const edges = computeRelevanceDecay(rawEdges, items);
  const clusters = detectClusters(items, edges);
  const orphans = findOrphans(items, edges);
  return { nodes: items, edges, clusters, orphans, builtAt: Date.now() };
}

// Rule 4: buildVaultIndex
// Builds a lightweight index of TLDRs for fast query routing.
// Agents scan TLDRs first — only load the full item if relevant.
export function buildVaultIndex(items: VaultItemMetadata[]): VaultIndex {
  return {
    builtAt: Date.now(),
    entries: items.map((n) => ({
      id: n.id,
      title: n.title,
      tldr: n.tldr ?? n.title,
      tags: n.tags,
      namespace: n.namespace ?? "user",
    })),
  };
}

// Rule 7: runVaultLint
// Checks for contradictions, stale claims (>60 days), orphan pages, and gap topics.
export function runVaultLint(
  items: VaultItemMetadata[],
  edges: VaultEdge[],
): VaultLintResult {
  const now = Date.now();
  const STALE_MS = 60 * 24 * 3600 * 1000;

  // Stale claims: items older than 60 days
  const staleClaims = items
    .filter((n) => now - n.timestamp > STALE_MS)
    .map((n) => ({ id: n.id, title: n.title, ageMs: now - n.timestamp }));

  // Orphan pages: nodes with zero edges
  const connected = new Set<string>();
  const degreeCount: Record<string, number> = {};
  const inboundArchiveLinks: Record<string, number> = {};
  for (const e of edges) {
    connected.add(e.source);
    connected.add(e.target);
  }
  for (const item of items) {
    degreeCount[item.id] = 0;
    inboundArchiveLinks[item.id] = 0;
  }
  for (const edge of edges) {
    degreeCount[edge.source] = (degreeCount[edge.source] ?? 0) + 1;
    degreeCount[edge.target] = (degreeCount[edge.target] ?? 0) + 1;
    if (edge.kind === "archive_link" && edge.directed) {
      inboundArchiveLinks[edge.target] =
        (inboundArchiveLinks[edge.target] ?? 0) + 1;
    }
  }
  const orphanPages = items
    .filter((n) => !connected.has(n.id))
    .map((n) => n.id);
  const underlinkedPages = items
    .filter(
      (item) =>
        !orphanPages.includes(item.id) && (degreeCount[item.id] ?? 0) === 1,
    )
    .map((item) => item.id);
  const noBacklinkPages = items
    .filter(
      (item) =>
        !orphanPages.includes(item.id) &&
        (inboundArchiveLinks[item.id] ?? 0) === 0,
    )
    .map((item) => item.id);

  // Gap topics: tags that appear on only 1 item (thin coverage)
  const tagCount: Record<string, number> = {};
  for (const n of items) {
    for (const t of n.tags) tagCount[t] = (tagCount[t] ?? 0) + 1;
  }
  const gapTopics = Object.entries(tagCount)
    .filter(([, count]) => count < 2)
    .map(([tag]) => tag);

  // Contradictions: items sharing a tag but biasCheck disagreements
  const contradictions: VaultLintResult["contradictions"] = [];
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const a = items[i];
      const b = items[j];
      if ((a.namespace ?? "user") !== (b.namespace ?? "user")) continue;
      const sharedTags = a.tags.filter((t) => b.tags.includes(t));
      if (sharedTags.length === 0) continue;
      // Simple heuristic: if both have biasCheck entries, flag for human review
      if (
        a.biasCheck?.counterArguments?.length &&
        b.biasCheck?.counterArguments?.length
      ) {
        contradictions.push({
          ids: [a.id, b.id],
          reason: `Both items tagged [${sharedTags[0]}] have recorded counter-arguments — manual review recommended`,
        });
      }
    }
  }

  return {
    contradictions,
    staleClaims,
    orphanPages,
    underlinkedPages,
    noBacklinkPages,
    gapTopics,
    checkedAt: now,
  };
}
