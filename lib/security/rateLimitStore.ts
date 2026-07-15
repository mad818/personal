import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from "fs";
import { dirname, join, resolve } from "path";

const RATE_LIMIT_LEDGER_VERSION = 1;
const MAX_LEDGER_BYTES = 4_000_000;
export const DEFAULT_RATE_LIMIT_MAX_ENTRIES = 10_000;

export type RateLimitPersistenceMode =
  | "persistent"
  | "memory_degraded"
  | "memory_disabled";

export type RateLimitStoreEvent =
  | "none"
  | "invalid_ledger_reset"
  | "previous_snapshot_recovered"
  | "persistence_restored"
  | "persistence_unavailable";

type AttemptWindow = {
  count: number;
  resetAt: number;
};

type RateLimitLedgerEntry = AttemptWindow & {
  key: string;
};

type RateLimitLedger = {
  version: typeof RATE_LIMIT_LEDGER_VERSION;
  updatedAt: string;
  entries: RateLimitLedgerEntry[];
};

type LedgerReadResult =
  | { kind: "missing" }
  | { kind: "invalid" }
  | { kind: "valid"; buckets: Map<string, AttemptWindow> };

export type RateLimitStoreDecision =
  | {
      ok: true;
      remaining: number;
      persistence: RateLimitPersistenceMode;
    }
  | {
      ok: false;
      retryAfterSec: number;
      reason: "limit" | "capacity";
      persistence: RateLimitPersistenceMode;
    };

export interface RateLimitStoreOptions {
  ledgerPath?: string;
  maxEntries?: number;
  persistence?: "persistent" | "memory";
  now?: () => number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function isRateLimitKey(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[a-z0-9][a-z0-9._-]{0,95}:[a-f0-9]{64}$/i.test(value)
  );
}

function readLedger(
  ledgerPath: string,
  now: number,
  maxEntries: number,
): LedgerReadResult {
  if (!existsSync(ledgerPath)) return { kind: "missing" };

  try {
    if (statSync(ledgerPath).size > MAX_LEDGER_BYTES) {
      return { kind: "invalid" };
    }
    const parsed = JSON.parse(readFileSync(ledgerPath, "utf8")) as unknown;
    if (
      !isRecord(parsed) ||
      parsed.version !== RATE_LIMIT_LEDGER_VERSION ||
      !Array.isArray(parsed.entries) ||
      parsed.entries.length > maxEntries
    ) {
      return { kind: "invalid" };
    }

    const buckets = new Map<string, AttemptWindow>();
    for (const value of parsed.entries) {
      if (
        !isRecord(value) ||
        !isRateLimitKey(value.key) ||
        !Number.isSafeInteger(value.count) ||
        Number(value.count) <= 0 ||
        !Number.isSafeInteger(value.resetAt) ||
        Number(value.resetAt) <= 0 ||
        buckets.has(value.key)
      ) {
        return { kind: "invalid" };
      }
      if (Number(value.resetAt) > now) {
        buckets.set(value.key, {
          count: Number(value.count),
          resetAt: Number(value.resetAt),
        });
      }
    }
    return { kind: "valid", buckets };
  } catch {
    return { kind: "invalid" };
  }
}

function clampMaxEntries(value: number | undefined) {
  if (!Number.isSafeInteger(value) || Number(value) <= 0) {
    return DEFAULT_RATE_LIMIT_MAX_ENTRIES;
  }
  return Math.min(Number(value), 100_000);
}

export function defaultRateLimitLedgerPath() {
  return resolve(
    process.env.NEXUS_RATE_LIMIT_LEDGER_PATH ??
      join(process.cwd(), ".nexus", "rate-limit-ledger.json"),
  );
}

export class PersistentRateLimitStore {
  private readonly ledgerPath: string;
  private readonly previousPath: string;
  private readonly maxEntries: number;
  private readonly persistence: "persistent" | "memory";
  private readonly now: () => number;
  private readonly buckets = new Map<string, AttemptWindow>();
  private loaded = false;
  private mode: RateLimitPersistenceMode;
  private event: RateLimitStoreEvent = "none";

  constructor(options: RateLimitStoreOptions = {}) {
    this.ledgerPath = resolve(
      options.ledgerPath ?? defaultRateLimitLedgerPath(),
    );
    this.previousPath = `${this.ledgerPath}.previous`;
    this.maxEntries = clampMaxEntries(options.maxEntries);
    this.persistence = options.persistence ?? "persistent";
    this.now = options.now ?? Date.now;
    this.mode =
      this.persistence === "memory" ? "memory_disabled" : "memory_degraded";
  }

  private replaceBuckets(next: Map<string, AttemptWindow>) {
    this.buckets.clear();
    for (const [key, value] of next) this.buckets.set(key, value);
  }

  private ensureLoaded() {
    if (this.loaded) return;
    this.loaded = true;
    if (this.persistence === "memory") return;

    const now = this.now();
    const current = readLedger(this.ledgerPath, now, this.maxEntries);
    if (current.kind === "valid") {
      this.replaceBuckets(current.buckets);
      this.mode = "persistent";
      return;
    }

    const previous = readLedger(this.previousPath, now, this.maxEntries);
    if (previous.kind === "valid") {
      this.replaceBuckets(previous.buckets);
      this.event = "previous_snapshot_recovered";
      this.persist(this.event, true);
      return;
    }

    if (current.kind === "invalid" || previous.kind === "invalid") {
      this.event = "invalid_ledger_reset";
      this.persist(this.event);
      return;
    }

    this.persist("none");
  }

  private persist(
    successEvent: RateLimitStoreEvent = "none",
    preservePrevious = false,
  ) {
    if (this.persistence === "memory") return;

    const directory = dirname(this.ledgerPath);
    const temporaryPath = `${this.ledgerPath}.${process.pid}.${this.now()}.tmp`;
    const ledger: RateLimitLedger = {
      version: RATE_LIMIT_LEDGER_VERSION,
      updatedAt: new Date(this.now()).toISOString(),
      entries: Array.from(this.buckets, ([key, value]) => ({
        key,
        count: value.count,
        resetAt: value.resetAt,
      })),
    };

    try {
      mkdirSync(directory, { recursive: true });
      writeFileSync(temporaryPath, `${JSON.stringify(ledger)}\n`, {
        encoding: "utf8",
        flag: "wx",
        mode: 0o600,
      });
      if (existsSync(this.ledgerPath)) {
        if (preservePrevious) {
          rmSync(this.ledgerPath, { force: true });
        } else {
          rmSync(this.previousPath, { force: true });
          renameSync(this.ledgerPath, this.previousPath);
        }
      }
      try {
        renameSync(temporaryPath, this.ledgerPath);
      } catch (error) {
        if (!existsSync(this.ledgerPath) && existsSync(this.previousPath)) {
          renameSync(this.previousPath, this.ledgerPath);
        }
        throw error;
      }
      rmSync(this.previousPath, { force: true });
      const wasDegraded = this.mode === "memory_degraded";
      this.mode = "persistent";
      this.event =
        successEvent !== "none"
          ? successEvent
          : wasDegraded && this.event === "persistence_unavailable"
            ? "persistence_restored"
            : this.event;
    } catch {
      rmSync(temporaryPath, { force: true });
      this.mode = "memory_degraded";
      this.event = "persistence_unavailable";
    }
  }

  private pruneExpired(now: number) {
    let changed = false;
    for (const [key, value] of this.buckets) {
      if (value.resetAt <= now) {
        this.buckets.delete(key);
        changed = true;
      }
    }
    return changed;
  }

  private earliestRetryAfterSec(now: number) {
    let earliest = Number.POSITIVE_INFINITY;
    for (const value of this.buckets.values()) {
      earliest = Math.min(earliest, value.resetAt);
    }
    return Number.isFinite(earliest)
      ? Math.max(1, Math.ceil((earliest - now) / 1000))
      : 1;
  }

  consume(
    key: string,
    config: { maxAttempts: number; windowMs: number },
  ): RateLimitStoreDecision {
    this.ensureLoaded();
    const now = this.now();
    const pruned = this.pruneExpired(now);
    const current = this.buckets.get(key);

    if (current && current.count >= config.maxAttempts) {
      if (pruned) this.persist();
      return {
        ok: false,
        retryAfterSec: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
        reason: "limit",
        persistence: this.mode,
      };
    }

    if (!current && this.buckets.size >= this.maxEntries) {
      if (pruned) this.persist();
      return {
        ok: false,
        retryAfterSec: this.earliestRetryAfterSec(now),
        reason: "capacity",
        persistence: this.mode,
      };
    }

    const next = current
      ? { count: current.count + 1, resetAt: current.resetAt }
      : { count: 1, resetAt: now + config.windowMs };
    this.buckets.set(key, next);
    this.persist();

    return {
      ok: true,
      remaining: Math.max(0, config.maxAttempts - next.count),
      persistence: this.mode,
    };
  }

  getStatus() {
    this.ensureLoaded();
    const now = this.now();
    if (this.pruneExpired(now)) this.persist();
    return {
      mode: this.mode,
      event: this.event,
      entryCount: this.buckets.size,
      maxEntries: this.maxEntries,
    } as const;
  }
}

export function createDefaultRateLimitStore() {
  return new PersistentRateLimitStore({
    persistence:
      process.env.NEXUS_RATE_LIMIT_PERSISTENCE?.trim().toLowerCase() ===
      "memory"
        ? "memory"
        : "persistent",
  });
}
