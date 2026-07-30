import assert from "node:assert/strict";
import {
  clearLocalUsage,
  LOCAL_USAGE_MAX_ROUTES,
  LOCAL_USAGE_RETENTION_DAYS,
  LOCAL_USAGE_STORAGE_KEY,
  readLocalUsageStore,
  recordLocalUsageEvent,
  summarizeLocalUsage,
} from "../lib/localUsageAnalytics.ts";

class MemoryStorage {
  values = new Map();
  getItem(key) {
    return this.values.get(key) ?? null;
  }
  setItem(key, value) {
    this.values.set(key, value);
  }
  removeItem(key) {
    this.values.delete(key);
  }
}

const storage = new MemoryStorage();
const base = new Date("2026-07-27T12:00:00.000Z");
recordLocalUsageEvent(
  { name: "route_view", route: "/command" },
  { storage, now: base },
);
recordLocalUsageEvent(
  { name: "route_view", route: "/command" },
  { storage, now: base },
);
recordLocalUsageEvent(
  { name: "route_view", route: "/vault" },
  { storage, now: base },
);
recordLocalUsageEvent(
  { name: "agent_run", route: "/hq" },
  { storage, now: base },
);

const current = readLocalUsageStore(storage, base);
const summary = summarizeLocalUsage(current);
assert.equal(summary.totalEvents, 4);
assert.equal(summary.routeViews, 3);
assert.deepEqual(summary.topRoutes[0], { route: "/command", count: 2 });
assert.ok(!storage.getItem(LOCAL_USAGE_STORAGE_KEY).includes("query"));

assert.equal(
  recordLocalUsageEvent(
    { name: "route_view", route: "/vault?secret=value" },
    { storage, now: base },
  ),
  null,
);
assert.equal(
  recordLocalUsageEvent(
    { name: "bad event name", route: "/vault" },
    { storage, now: base },
  ),
  null,
);

for (let index = 0; index < LOCAL_USAGE_MAX_ROUTES + 5; index += 1) {
  recordLocalUsageEvent(
    { name: "custom", route: `/route-${index}` },
    { storage, now: base },
  );
}
assert.equal(
  readLocalUsageStore(storage, base).days[0].routes
    ? Object.keys(readLocalUsageStore(storage, base).days[0].routes).length
    : 0,
  LOCAL_USAGE_MAX_ROUTES,
);

const staleStorage = new MemoryStorage();
staleStorage.setItem(
  LOCAL_USAGE_STORAGE_KEY,
  JSON.stringify({
    schemaVersion: 1,
    updatedAt: "2026-06-01T00:00:00.000Z",
    days: [
      {
        day: "2026-06-01",
        events: { route_view: 1 },
        routes: { "/old": 1 },
      },
    ],
  }),
);
assert.equal(readLocalUsageStore(staleStorage, base).days.length, 0);
assert.equal(LOCAL_USAGE_RETENTION_DAYS, 30);
assert.equal(clearLocalUsage(storage), true);
assert.equal(storage.getItem(LOCAL_USAGE_STORAGE_KEY), null);

console.log(
  "ok local-usage-analytics-runtime (aggregate-only, bounded routes/days, invalid metadata rejected, clear supported)",
);
