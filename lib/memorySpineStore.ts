import "server-only";

import { readFile, writeFile } from "fs/promises";
import { join } from "path";
import type { LearningEntry } from "@/lib/agentLearnings";
import {
  buildMemorySpineItems,
  buildMemorySpineSnapshotFromItems,
  searchMemorySpine,
  type MemoryLayer,
  type MemorySpineItem,
  type MemorySpineSnapshot,
} from "@/lib/memorySpine";
import { listCompiledMemoryPageItems } from "@/lib/memoryPagesStore";
import {
  readProjectMemoryItems,
  syncProjectMemoryFromSpine,
} from "@/lib/projectMemory";
import type { AgentRunArtifact, Article, ModeBriefing } from "@/store/useStore";

export interface PersistedMemorySpineClientState {
  items: MemorySpineItem[];
  syncedAt: string | null;
}

export interface PersistedMemorySpineStats {
  syncedAt: string | null;
  syncAgeMinutes: number | null;
  snapshot: MemorySpineSnapshot;
  freeFirst: true;
  localOnly: true;
  persistence: {
    raw: "browser_sync" | "none";
    knowledge: "agent_learnings_jsonl" | "none";
    output: "browser_sync" | "none";
  };
}

const MEMORY_SPINE_SNAPSHOT_PATH = join(
  process.cwd(),
  "tasks",
  "memory-spine-snapshot.json",
);
const AGENT_LEARNINGS_PATH = join(
  process.cwd(),
  "tasks",
  "agent-learnings.jsonl",
);

function emptyClientState(): PersistedMemorySpineClientState {
  return {
    items: [],
    syncedAt: null,
  };
}

function dedupeByLatest<T>(
  items: T[],
  getId: (item: T) => string,
  getTimestamp: (item: T) => number,
  limit: number,
): T[] {
  const map = new Map<string, T>();

  for (const item of items) {
    const id = getId(item);
    const existing = map.get(id);
    if (!existing || getTimestamp(item) >= getTimestamp(existing)) {
      map.set(id, item);
    }
  }

  return Array.from(map.values())
    .sort((a, b) => getTimestamp(b) - getTimestamp(a))
    .slice(0, limit);
}

async function readRawClientState(): Promise<PersistedMemorySpineClientState> {
  try {
    const raw = await readFile(MEMORY_SPINE_SNAPSHOT_PATH, "utf8");
    const parsed = JSON.parse(raw) as {
      items?: MemorySpineItem[];
      savedArticles?: Article[];
      agentRunHistory?: AgentRunArtifact[];
      modeBriefings?: ModeBriefing[];
      syncedAt?: string | null;
    };

    if (Array.isArray(parsed.items)) {
      return {
        items: parsed.items,
        syncedAt: typeof parsed.syncedAt === "string" ? parsed.syncedAt : null,
      };
    }

    const migratedItems = buildMemorySpineItems({
      savedArticles: Array.isArray(parsed.savedArticles) ? parsed.savedArticles : [],
      agentLearnings: {},
      agentRunHistory: Array.isArray(parsed.agentRunHistory)
        ? parsed.agentRunHistory
        : [],
      modeBriefings: Array.isArray(parsed.modeBriefings) ? parsed.modeBriefings : [],
    });

    return {
      items: migratedItems,
      syncedAt: typeof parsed.syncedAt === "string" ? parsed.syncedAt : null,
    };
  } catch {
    return emptyClientState();
  }
}

async function readLearningEntries(): Promise<LearningEntry[]> {
  try {
    const raw = await readFile(AGENT_LEARNINGS_PATH, "utf8");
    const entries: LearningEntry[] = [];

    for (const line of raw.split("\n")) {
      if (!line.trim() || line.includes('"_manifest"')) continue;
      try {
        entries.push(JSON.parse(line) as LearningEntry);
      } catch {
        // Skip malformed lines.
      }
    }

    return entries.sort((a, b) => b.ts - a.ts).slice(0, 200);
  } catch {
    return [];
  }
}

function groupLearningsByAgent(entries: LearningEntry[]) {
  return entries.reduce<Record<string, LearningEntry[]>>((acc, entry) => {
    const key = entry.agent.toLowerCase();
    acc[key] = [...(acc[key] ?? []), entry];
    return acc;
  }, {});
}

export async function syncPersistedMemorySpineClientState(input: {
  savedArticles: Article[];
  agentRunHistory: AgentRunArtifact[];
  modeBriefings: ModeBriefing[];
}) {
  const previous = await readRawClientState();
  const nextItems = buildMemorySpineItems({
    savedArticles: input.savedArticles,
    agentLearnings: {},
    agentRunHistory: input.agentRunHistory,
    modeBriefings: input.modeBriefings,
  });
  const next: PersistedMemorySpineClientState = {
    items: dedupeByLatest(
      [...nextItems, ...previous.items],
      (item) => item.id,
      (item) => item.timestamp,
      160,
    ),
    syncedAt: new Date().toISOString(),
  };

  await writeFile(
    MEMORY_SPINE_SNAPSHOT_PATH,
    JSON.stringify(next, null, 2),
    "utf8",
  );

  return next;
}

export async function readPersistedMemorySpineSources(): Promise<{
  items: MemorySpineItem[];
  syncedAt: string | null;
}> {
  const [clientState, learnings, pageItems] = await Promise.all([
    readRawClientState(),
    readLearningEntries(),
    listCompiledMemoryPageItems(80),
  ]);
  const learningItems = buildMemorySpineItems({
    savedArticles: [],
    agentLearnings: groupLearningsByAgent(learnings),
    agentRunHistory: [],
    modeBriefings: [],
  });
  const baseItems = dedupeByLatest(
    [...clientState.items, ...learningItems, ...pageItems],
    (item) => item.id,
    (item) => item.timestamp,
    320,
  );
  await syncProjectMemoryFromSpine({
    items: baseItems,
    syncedAt: clientState.syncedAt,
  });
  const projectMemoryItems = await readProjectMemoryItems();

  return {
    syncedAt: clientState.syncedAt,
    items: dedupeByLatest(
      [...baseItems, ...projectMemoryItems],
      (item) => item.id,
      (item) => item.timestamp,
      320,
    ),
  };
}

export async function readPersistedMemorySpineStats(): Promise<PersistedMemorySpineStats> {
  const { items, syncedAt } = await readPersistedMemorySpineSources();
  const snapshot = buildMemorySpineSnapshotFromItems(items);
  const syncAgeMinutes = syncedAt
    ? Math.max(
        0,
        Math.round((Date.now() - new Date(syncedAt).getTime()) / 60000),
      )
    : null;

  return {
    syncedAt,
    syncAgeMinutes,
    snapshot,
    freeFirst: true,
    localOnly: true,
    persistence: {
      raw: snapshot.countsByLayer.raw > 0 ? "browser_sync" : "none",
      knowledge:
        snapshot.countsByLayer.knowledge > 0 ? "agent_learnings_jsonl" : "none",
      output: snapshot.countsByLayer.output > 0 ? "browser_sync" : "none",
    },
  };
}

export async function searchPersistedMemorySpine(options?: {
  query?: string;
  layer?: MemoryLayer | "all";
  limit?: number;
  includeRestricted?: boolean;
}) {
  const stats = await readPersistedMemorySpineStats();
  return {
    ...stats,
    items: searchMemorySpine(stats.snapshot, options),
  };
}
