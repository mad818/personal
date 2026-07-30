import {
  recencyDecayScore,
  scoreEpisodicRelevance,
  type EpisodicMemoryEntry,
} from "./episodicMemoryStore.ts";

export type EpisodicBenchmarkStrategy = "recency" | "keyword" | "hybrid";

export interface EpisodicBenchmarkCase {
  query: string;
  expectedId: string;
}

export interface EpisodicBenchmarkResult {
  strategy: EpisodicBenchmarkStrategy;
  correct: number;
  total: number;
  accuracy: number;
}

function queryTokens(query: string): Set<string> {
  return new Set(
    query
      .toLowerCase()
      .split(/\W+/)
      .filter((token) => token.length > 2),
  );
}

function keywordScore(entry: EpisodicMemoryEntry, query: string): number {
  const tokens = queryTokens(query);
  if (!tokens.size) return 0;
  const overlap = entry.keywords.filter((keyword) =>
    tokens.has(keyword),
  ).length;
  return overlap / Math.max(1, Math.min(tokens.size, entry.keywords.length));
}

function score(
  strategy: EpisodicBenchmarkStrategy,
  entry: EpisodicMemoryEntry,
  query: string,
  now: number,
): number {
  switch (strategy) {
    case "recency":
      return recencyDecayScore(entry.capturedAt, now);
    case "keyword":
      return keywordScore(entry, query);
    case "hybrid":
      return scoreEpisodicRelevance(entry, query, now);
  }
}

export function runEpisodicMemoryBenchmark(
  entries: EpisodicMemoryEntry[],
  cases: EpisodicBenchmarkCase[],
  now: number,
): EpisodicBenchmarkResult[] {
  return (["recency", "keyword", "hybrid"] as const).map((strategy) => {
    const correct = cases.reduce((total, benchmarkCase) => {
      const top = [...entries]
        .map((entry) => ({
          entry,
          score: score(strategy, entry, benchmarkCase.query, now),
        }))
        .sort(
          (a, b) =>
            b.score - a.score ||
            b.entry.capturedAt - a.entry.capturedAt ||
            a.entry.id.localeCompare(b.entry.id),
        )[0]?.entry;
      return total + (top?.id === benchmarkCase.expectedId ? 1 : 0);
    }, 0);
    return {
      strategy,
      correct,
      total: cases.length,
      accuracy: cases.length > 0 ? correct / cases.length : 0,
    };
  });
}
