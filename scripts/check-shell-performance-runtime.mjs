import assert from "node:assert/strict";
import {
  ALL_SHELL_DATA_CAPABILITIES,
  getShellPerformancePlan,
} from "../lib/shellPerformance.ts";
import { createVisiblePollingCoordinator } from "../lib/visiblePolling.ts";

function assertSameMembers(actual, expected, label) {
  assert.deepEqual(
    [...actual].sort(),
    [...expected].sort(),
    label,
  );
}

const commandPlan = getShellPerformancePlan("/command");
assertSameMembers(
  commandPlan.routeOwned,
  ["articles", "cves", "fearGreed", "prices", "worldRisk"],
  "COMMAND must keep its route-owned data immediate.",
);
assertSameMembers(
  commandPlan.immediate,
  ["globalData"],
  "COMMAND must immediately load its world/system context.",
);
assertSameMembers(
  commandPlan.deferred,
  [],
  "COMMAND must not duplicate its route-owned polling in the root shell.",
);

const hqPlan = getShellPerformancePlan("/hq");
assertSameMembers(
  hqPlan.routeOwned,
  [],
  "HQ does not own route-local data loaders.",
);
assertSameMembers(
  hqPlan.immediate,
  [],
  "HQ background intelligence must not block the first interactive frame.",
);
assertSameMembers(
  hqPlan.deferred,
  ALL_SHELL_DATA_CAPABILITIES,
  "HQ must retain every background intelligence capability after warm-up.",
);
assert.ok(
  hqPlan.deferTimeoutMs <= 3_000,
  "Deferred capabilities must have a bounded activation timeout.",
);

const cyberPlan = getShellPerformancePlan("/cyber");
assertSameMembers(
  cyberPlan.routeOwned,
  ["articles", "cves", "otx"],
  "CYBER must keep its evidence loaders immediate.",
);
assertSameMembers(
  cyberPlan.immediate,
  ["globalData"],
  "CYBER must immediately load threat-intelligence context.",
);
assertSameMembers(
  cyberPlan.deferred,
  ["fearGreed", "prices", "worldRisk"],
  "CYBER must retain unrelated background monitoring after warm-up.",
);

function createFakeEnvironment() {
  const intervals = new Map();
  const listeners = {
    online: new Set(),
    policy: new Set(),
    visibility: new Set(),
  };
  let nextIntervalId = 1;
  let hidden = false;
  let internetAvailable = true;
  let internetPollingPaused = false;

  return {
    environment: {
      addOnlineListener(listener) {
        listeners.online.add(listener);
        return () => listeners.online.delete(listener);
      },
      addPolicyListener(listener) {
        listeners.policy.add(listener);
        return () => listeners.policy.delete(listener);
      },
      addVisibilityListener(listener) {
        listeners.visibility.add(listener);
        return () => listeners.visibility.delete(listener);
      },
      canUseInternet: () => internetAvailable,
      clearInterval(intervalId) {
        intervals.delete(intervalId);
      },
      isHidden: () => hidden,
      isInternetPollingPaused: () => internetPollingPaused,
      setInterval(listener) {
        const id = nextIntervalId++;
        intervals.set(id, listener);
        return id;
      },
    },
    emit(kind) {
      for (const listener of listeners[kind]) listener();
    },
    getIntervalCount: () => intervals.size,
    setHidden(value) {
      hidden = value;
    },
    setInternetAvailable(value) {
      internetAvailable = value;
    },
    setInternetPollingPaused(value) {
      internetPollingPaused = value;
    },
  };
}

const fake = createFakeEnvironment();
const coordinator = createVisiblePollingCoordinator(fake.environment);
let firstRuns = 0;
let duplicateRuns = 0;

const unsubscribeFirst = coordinator.subscribe({
  intervalMs: 60_000,
  internetRequired: true,
  key: "prices",
  run: () => {
    firstRuns += 1;
  },
});
const unsubscribeDuplicate = coordinator.subscribe({
  intervalMs: 60_000,
  internetRequired: true,
  key: "prices",
  run: () => {
    duplicateRuns += 1;
  },
});

await Promise.resolve();
assert.equal(firstRuns, 1, "The first subscriber must run immediately.");
assert.equal(duplicateRuns, 0, "A duplicate subscriber must not duplicate the run.");
assert.equal(fake.getIntervalCount(), 1, "Duplicate subscribers must share one timer.");
assert.equal(coordinator.getSnapshot().prices.subscribers, 2);

fake.setHidden(true);
fake.emit("visibility");
await Promise.resolve();
assert.equal(firstRuns, 1, "Hidden documents must not poll.");

fake.setHidden(false);
fake.setInternetPollingPaused(true);
fake.emit("visibility");
await Promise.resolve();
assert.equal(firstRuns, 1, "Paused internet policy must suppress polling.");

fake.setInternetPollingPaused(false);
unsubscribeFirst();
fake.emit("online");
await Promise.resolve();
assert.equal(
  duplicateRuns,
  1,
  "The remaining subscriber must take over without creating a second timer.",
);

unsubscribeDuplicate();
assert.equal(fake.getIntervalCount(), 0, "The shared timer must stop after the last subscriber leaves.");
assert.deepEqual(coordinator.getSnapshot(), {});

console.log(
  "Shell performance runtime OK (route activation, bounded warm-up, and polling deduplication).",
);
