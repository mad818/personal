export const LOCAL_USAGE_STORAGE_KEY = "nexus.local-usage-analytics.v1";
export const LOCAL_USAGE_RETENTION_DAYS = 30;
export const LOCAL_USAGE_MAX_ROUTES = 32;

const EVENT_NAME_PATTERN = /^[a-z][a-z0-9_-]{0,39}$/;
const ROUTE_PATTERN = /^\/[a-z0-9/_-]{0,79}$/i;

export type LocalUsageEventName = "route_view" | "agent_run" | "custom";

export interface LocalUsageDayBucket {
  day: string;
  events: Record<string, number>;
  routes: Record<string, number>;
}

export interface LocalUsageStore {
  schemaVersion: 1;
  updatedAt: string;
  days: LocalUsageDayBucket[];
}

export interface LocalUsageSummary {
  totalEvents: number;
  routeViews: number;
  activeDays: number;
  topRoutes: Array<{ route: string; count: number }>;
  dailyTotals: Array<{ day: string; count: number }>;
}

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function emptyStore(now: Date): LocalUsageStore {
  return {
    schemaVersion: 1,
    updatedAt: now.toISOString(),
    days: [],
  };
}

function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function isCountMap(value: unknown): value is Record<string, number> {
  return (
    Boolean(value) &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.values(value as Record<string, unknown>).every(
      (count) => Number.isInteger(count) && Number(count) > 0,
    )
  );
}

function parseStore(raw: string | null, now: Date): LocalUsageStore {
  if (!raw) return emptyStore(now);
  try {
    const parsed = JSON.parse(raw) as Partial<LocalUsageStore>;
    if (
      parsed.schemaVersion !== 1 ||
      !Array.isArray(parsed.days) ||
      typeof parsed.updatedAt !== "string"
    ) {
      return emptyStore(now);
    }
    const cutoff = new Date(now);
    cutoff.setUTCDate(cutoff.getUTCDate() - LOCAL_USAGE_RETENTION_DAYS + 1);
    const cutoffDay = dayKey(cutoff);
    const days = parsed.days
      .filter(
        (bucket): bucket is LocalUsageDayBucket =>
          Boolean(bucket) &&
          typeof bucket.day === "string" &&
          /^\d{4}-\d{2}-\d{2}$/.test(bucket.day) &&
          bucket.day >= cutoffDay &&
          isCountMap(bucket.events) &&
          isCountMap(bucket.routes),
      )
      .slice(-LOCAL_USAGE_RETENTION_DAYS);
    return {
      schemaVersion: 1,
      updatedAt: parsed.updatedAt,
      days,
    };
  } catch {
    return emptyStore(now);
  }
}

function boundedRouteCounts(
  routes: Record<string, number>,
): Record<string, number> {
  return Object.fromEntries(
    Object.entries(routes)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, LOCAL_USAGE_MAX_ROUTES),
  );
}

export function recordLocalUsageEvent(
  input: {
    name: LocalUsageEventName | string;
    route?: string;
  },
  options: {
    storage?: StorageLike;
    now?: Date;
  } = {},
): LocalUsageStore | null {
  const name = input.name.trim().toLowerCase();
  if (!EVENT_NAME_PATTERN.test(name)) return null;
  const route = input.route?.trim() ?? "";
  if (route && !ROUTE_PATTERN.test(route)) return null;
  const storage =
    options.storage ??
    (typeof window !== "undefined" ? window.localStorage : undefined);
  if (!storage) return null;
  const now = options.now ?? new Date();
  try {
    const store = parseStore(storage.getItem(LOCAL_USAGE_STORAGE_KEY), now);
    const today = dayKey(now);
    const existing = store.days.find((bucket) => bucket.day === today);
    const bucket: LocalUsageDayBucket = existing
      ? {
          ...existing,
          events: { ...existing.events },
          routes: { ...existing.routes },
        }
      : { day: today, events: {}, routes: {} };
    bucket.events[name] = (bucket.events[name] ?? 0) + 1;
    if (route) bucket.routes[route] = (bucket.routes[route] ?? 0) + 1;
    bucket.routes = boundedRouteCounts(bucket.routes);
    const next: LocalUsageStore = {
      schemaVersion: 1,
      updatedAt: now.toISOString(),
      days: [...store.days.filter((entry) => entry.day !== today), bucket]
        .sort((a, b) => a.day.localeCompare(b.day))
        .slice(-LOCAL_USAGE_RETENTION_DAYS),
    };
    storage.setItem(LOCAL_USAGE_STORAGE_KEY, JSON.stringify(next));
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("nexus-local-usage-updated"));
    }
    return next;
  } catch {
    return null;
  }
}

export function readLocalUsageStore(
  storageInput?: StorageLike,
  now = new Date(),
): LocalUsageStore {
  const storage =
    storageInput ??
    (typeof window !== "undefined" ? window.localStorage : undefined);
  if (!storage) return emptyStore(now);
  try {
    return parseStore(storage.getItem(LOCAL_USAGE_STORAGE_KEY), now);
  } catch {
    return emptyStore(now);
  }
}

export function summarizeLocalUsage(store: LocalUsageStore): LocalUsageSummary {
  const routeCounts = new Map<string, number>();
  let totalEvents = 0;
  let routeViews = 0;
  const dailyTotals = store.days.map((bucket) => {
    const count = Object.values(bucket.events).reduce(
      (total, value) => total + value,
      0,
    );
    totalEvents += count;
    routeViews += bucket.events.route_view ?? 0;
    for (const [route, routeCount] of Object.entries(bucket.routes)) {
      routeCounts.set(route, (routeCounts.get(route) ?? 0) + routeCount);
    }
    return { day: bucket.day, count };
  });
  const topRoutes = [...routeCounts.entries()]
    .map(([route, count]) => ({ route, count }))
    .sort((a, b) => b.count - a.count || a.route.localeCompare(b.route))
    .slice(0, 8);
  return {
    totalEvents,
    routeViews,
    activeDays: store.days.length,
    topRoutes,
    dailyTotals,
  };
}

export function clearLocalUsage(storageInput?: StorageLike): boolean {
  const storage =
    storageInput ??
    (typeof window !== "undefined" ? window.localStorage : undefined);
  if (!storage) return false;
  try {
    storage.removeItem(LOCAL_USAGE_STORAGE_KEY);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("nexus-local-usage-updated"));
    }
    return true;
  } catch {
    return false;
  }
}
