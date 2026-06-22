/**
 * Episodic memory with recency decay (agentmemory / claude-mem patterns).
 * Client-side bounded store — complements passiveMemoryTrail strings.
 */

export interface EpisodicMemoryEntry {
  id: string;
  capturedAt: number;
  agent: string;
  query: string;
  summary: string;
  keywords: string[];
}

export const EPISODIC_MEMORY_MAX_ENTRIES = 48;
export const EPISODIC_RECENCY_HALF_LIFE_MS = 7 * 24 * 60 * 60 * 1000;

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/\W+/)
    .filter((token) => token.length > 2)
    .slice(0, 24);
}

function normalizeDedupeKey(entry: Pick<EpisodicMemoryEntry, "agent" | "query" | "summary">) {
  return `${entry.agent}|${entry.query.slice(0, 80)}|${entry.summary.slice(0, 120)}`
    .toLowerCase()
    .trim();
}

export function recencyDecayScore(capturedAt: number, now = Date.now()): number {
  const ageMs = Math.max(0, now - capturedAt);
  return Math.pow(0.5, ageMs / EPISODIC_RECENCY_HALF_LIFE_MS);
}

export function buildEpisodicMemoryEntry(args: {
  agent: string;
  query: string;
  summary: string;
  capturedAt?: number;
}): EpisodicMemoryEntry {
  const capturedAt = args.capturedAt ?? Date.now();
  const keywords = [
    ...new Set([
      ...tokenize(args.query),
      ...tokenize(args.summary),
      args.agent.toLowerCase(),
    ]),
  ].slice(0, 12);

  return {
    id: `ep_${capturedAt.toString(36)}`,
    capturedAt,
    agent: args.agent,
    query: args.query.trim(),
    summary: args.summary.trim(),
    keywords,
  };
}

export function appendEpisodicMemory(
  trail: EpisodicMemoryEntry[],
  entry: EpisodicMemoryEntry,
  maxEntries = EPISODIC_MEMORY_MAX_ENTRIES,
): EpisodicMemoryEntry[] {
  const key = normalizeDedupeKey(entry);
  const withoutDupes = trail.filter((item) => normalizeDedupeKey(item) !== key);
  return [entry, ...withoutDupes].slice(0, maxEntries);
}

export function scoreEpisodicRelevance(
  entry: EpisodicMemoryEntry,
  query: string,
  now = Date.now(),
): number {
  const tokens = new Set(tokenize(query));
  if (!tokens.size) return recencyDecayScore(entry.capturedAt, now) * 0.1;

  let overlap = 0;
  for (const keyword of entry.keywords) {
    if (tokens.has(keyword)) overlap += 1;
  }
  const overlapScore = overlap / Math.max(1, Math.min(tokens.size, entry.keywords.length));
  return overlapScore * 0.7 + recencyDecayScore(entry.capturedAt, now) * 0.3;
}

export function retrieveEpisodicMemories(
  trail: EpisodicMemoryEntry[],
  query: string,
  limit = 5,
): EpisodicMemoryEntry[] {
  if (!trail.length || !query.trim()) return [];
  return [...trail]
    .map((entry) => ({
      entry,
      score: scoreEpisodicRelevance(entry, query),
    }))
    .filter((row) => row.score > 0.08)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((row) => row.entry);
}

export function buildEpisodicMemoryPromptBlock(
  trail: EpisodicMemoryEntry[],
  query: string,
): string {
  const hits = retrieveEpisodicMemories(trail, query, 4);
  if (!hits.length) return "";

  const lines = hits.map((entry, index) => {
    const age = Math.round(
      (Date.now() - entry.capturedAt) / (60 * 60 * 1000),
    );
    return (
      `${index + 1}. [${entry.agent.toUpperCase()} · ${age}h ago] ` +
      `"${entry.query.slice(0, 64)}" → ${entry.summary.slice(0, 140)}`
    );
  });

  return (
    `\n\n[EPISODIC MEMORY — decay-weighted HQ recall]\n` +
    `${lines.join("\n")}\n` +
    `[END EPISODIC MEMORY]\n`
  );
}
