// ── lib/feynmanResearchWatch ──────────────────────────────────────────────────
// Operator-approved recurring watch: create, list, enable, disable approved
// watches stored in agent-workspace/feynman/watches.json.
// run_check compares a sanitized snapshot hash to detect material changes.
// No background cron — run_watch is an explicit action only.
//
// Adapted from feynman skills/watch/SKILL.md
// No paid APIs, no scheduled execution, no external side-effects.

import * as fs from "fs/promises";
import * as path from "path";
import * as crypto from "crypto";

export const FEYNMAN_WATCH_LIMITS = {
  maximumWatches: 50,
  maximumTopicLength: 256,
  maximumLabelLength: 120,
  maximumSnapshotLength: 8_000,
  maximumWatchesPerList: 50,
  maximumFormattedChars: 8_000,
} as const;

export type WatchStatus = "enabled" | "disabled";

export type ResearchWatch = {
  id: string;
  label: string;
  topic: string;
  status: WatchStatus;
  snapshotHash: string | null;
  snapshotAt: string | null;
  lastCheckedAt: string | null;
  lastChangedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type WatchCheckResult = {
  watchId: string;
  topic: string;
  changed: boolean;
  previousHash: string | null;
  currentHash: string;
  checkedAt: string;
  receipt: string;
};

export type ResearchWatchStore = {
  schemaVersion: 1;
  watches: ResearchWatch[];
};

export type ResearchWatchDeps = {
  now?: () => string;
  buildSnapshot?: (topic: string) => Promise<string>;
  readStore?: (filePath: string) => Promise<ResearchWatchStore>;
  writeStore?: (filePath: string, store: ResearchWatchStore) => Promise<void>;
};

// ── Validators ────────────────────────────────────────────────────────────────

export function normalizeWatchTopic(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) throw new Error("Watch topic is required.");
  if (trimmed.length > FEYNMAN_WATCH_LIMITS.maximumTopicLength) {
    throw new Error("Watch topic is too long.");
  }
  if (trimmed.includes("..") || trimmed.includes("\\")) {
    throw new Error("Watch topic contains invalid characters.");
  }
  return trimmed;
}

export function normalizeWatchLabel(raw: string): string {
  const trimmed = raw.trim().slice(0, FEYNMAN_WATCH_LIMITS.maximumLabelLength);
  if (!trimmed) throw new Error("Watch label is required.");
  return trimmed;
}

export function normalizeWatchId(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) throw new Error("Watch id is required.");
  if (!/^[a-z0-9-]{1,64}$/.test(trimmed)) {
    throw new Error(
      "Watch id must be lowercase alphanumeric with hyphens, max 64 chars.",
    );
  }
  return trimmed;
}

// ── Snapshot hashing ──────────────────────────────────────────────────────────
// Sanitize the snapshot by normalising whitespace before hashing so that
// insignificant formatting differences don't register as material changes.

export function sanitizeSnapshot(raw: string): string {
  return raw
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, FEYNMAN_WATCH_LIMITS.maximumSnapshotLength);
}

export function hashSnapshot(sanitized: string): string {
  return crypto.createHash("sha256").update(sanitized).digest("hex").slice(0, 16);
}

// ── Default fixture snapshot (for tests; no network) ─────────────────────────

export function buildFixtureSnapshot(topic: string): string {
  return `Fixture snapshot for topic: ${topic.slice(0, 120)} [stable]`;
}

// ── Storage helpers ───────────────────────────────────────────────────────────

function resolveStorePath(workspace: string): string {
  return path.join(workspace, "feynman", "watches.json");
}

const EMPTY_STORE: ResearchWatchStore = {
  schemaVersion: 1,
  watches: [],
};

async function defaultReadStore(
  filePath: string,
): Promise<ResearchWatchStore> {
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    const parsed = JSON.parse(raw) as ResearchWatchStore;
    if (!Array.isArray(parsed.watches)) return EMPTY_STORE;
    return parsed;
  } catch {
    return { ...EMPTY_STORE, watches: [] };
  }
}

async function defaultWriteStore(
  filePath: string,
  store: ResearchWatchStore,
): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(store, null, 2), "utf-8");
}

// ── Format helpers ────────────────────────────────────────────────────────────

function formatWatch(watch: ResearchWatch): string {
  return [
    `id: ${watch.id}`,
    `label: ${watch.label}`,
    `topic: ${watch.topic.slice(0, 80)}`,
    `status: ${watch.status}`,
    `snapshotHash: ${watch.snapshotHash ?? "none"}`,
    `lastCheckedAt: ${watch.lastCheckedAt ?? "never"}`,
    `lastChangedAt: ${watch.lastChangedAt ?? "never"}`,
  ].join(" | ");
}

export function formatWatchList(watches: ResearchWatch[]): string {
  if (!watches.length) return "No research watches exist yet.";
  const lines = watches
    .slice(0, FEYNMAN_WATCH_LIMITS.maximumWatchesPerList)
    .map((w, i) => `${i + 1}. ${formatWatch(w)}`);
  return lines.join("\n");
}

export function formatWatchCheckResult(result: WatchCheckResult): string {
  return result.receipt;
}

// ── Actions ───────────────────────────────────────────────────────────────────

export async function createResearchWatch(
  rawId: string,
  rawLabel: string,
  rawTopic: string,
  workspace: string,
  deps: ResearchWatchDeps = {},
): Promise<ResearchWatch> {
  const id = normalizeWatchId(rawId);
  const label = normalizeWatchLabel(rawLabel);
  const topic = normalizeWatchTopic(rawTopic);
  const now = deps.now ?? (() => new Date().toISOString());
  const readStore = deps.readStore ?? defaultReadStore;
  const writeStore = deps.writeStore ?? defaultWriteStore;

  const storePath = resolveStorePath(workspace);
  const store = await readStore(storePath);

  if (store.watches.length >= FEYNMAN_WATCH_LIMITS.maximumWatches) {
    throw new Error(
      `Watch limit reached (${FEYNMAN_WATCH_LIMITS.maximumWatches}). Disable or remove existing watches first.`,
    );
  }
  if (store.watches.some((w) => w.id === id)) {
    throw new Error(`A watch with id "${id}" already exists.`);
  }

  const ts = now();
  const watch: ResearchWatch = {
    id,
    label,
    topic,
    status: "enabled",
    snapshotHash: null,
    snapshotAt: null,
    lastCheckedAt: null,
    lastChangedAt: null,
    createdAt: ts,
    updatedAt: ts,
  };

  store.watches.push(watch);
  await writeStore(storePath, store);
  return watch;
}

export async function listResearchWatches(
  workspace: string,
  deps: ResearchWatchDeps = {},
): Promise<ResearchWatch[]> {
  const readStore = deps.readStore ?? defaultReadStore;
  const storePath = resolveStorePath(workspace);
  const store = await readStore(storePath);
  return store.watches.slice(0, FEYNMAN_WATCH_LIMITS.maximumWatchesPerList);
}

export async function setResearchWatchStatus(
  rawId: string,
  status: WatchStatus,
  workspace: string,
  deps: ResearchWatchDeps = {},
): Promise<ResearchWatch> {
  const id = normalizeWatchId(rawId);
  const now = deps.now ?? (() => new Date().toISOString());
  const readStore = deps.readStore ?? defaultReadStore;
  const writeStore = deps.writeStore ?? defaultWriteStore;

  const storePath = resolveStorePath(workspace);
  const store = await readStore(storePath);
  const watch = store.watches.find((w) => w.id === id);
  if (!watch) throw new Error(`Watch "${id}" not found.`);

  watch.status = status;
  watch.updatedAt = now();
  await writeStore(storePath, store);
  return watch;
}

export async function runResearchWatchCheck(
  rawId: string,
  workspace: string,
  deps: ResearchWatchDeps = {},
): Promise<WatchCheckResult> {
  const id = normalizeWatchId(rawId);
  const now = deps.now ?? (() => new Date().toISOString());
  const readStore = deps.readStore ?? defaultReadStore;
  const writeStore = deps.writeStore ?? defaultWriteStore;
  const buildSnapshot = deps.buildSnapshot ?? ((topic) => Promise.resolve(buildFixtureSnapshot(topic)));

  const storePath = resolveStorePath(workspace);
  const store = await readStore(storePath);
  const watch = store.watches.find((w) => w.id === id);
  if (!watch) throw new Error(`Watch "${id}" not found.`);
  if (watch.status !== "enabled") {
    throw new Error(`Watch "${id}" is disabled. Enable it before running a check.`);
  }

  const rawSnapshot = await buildSnapshot(watch.topic);
  const sanitized = sanitizeSnapshot(rawSnapshot);
  const currentHash = hashSnapshot(sanitized);
  const checkedAt = now();

  const changed = watch.snapshotHash !== null && watch.snapshotHash !== currentHash;

  watch.snapshotHash = currentHash;
  watch.snapshotAt = checkedAt;
  watch.lastCheckedAt = checkedAt;
  if (changed) watch.lastChangedAt = checkedAt;
  watch.updatedAt = checkedAt;

  await writeStore(storePath, store);

  const receipt = [
    `Research watch check`,
    `Watch: ${id} — ${watch.label}`,
    `Topic: ${watch.topic.slice(0, 80)}`,
    `Changed: ${changed ? "yes — new hash differs from baseline" : "no — hash matches baseline"}`,
    `Current hash: ${currentHash}`,
    `Previous hash: ${watch.snapshotHash ?? "none (first check)"}`,
    `Checked: ${checkedAt}`,
  ].join("\n");

  return {
    watchId: id,
    topic: watch.topic,
    changed,
    previousHash: changed ? watch.snapshotHash : watch.snapshotHash,
    currentHash,
    checkedAt,
    receipt,
  };
}
