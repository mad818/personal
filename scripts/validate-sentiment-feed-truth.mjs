import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { executeFearGreed } from "../lib/fearGreedServer.ts";
import { isFearGreedSuccess } from "../lib/fearGreedTypes.ts";

const root = resolve(import.meta.dirname, "..");
const read = (path) => readFileSync(resolve(root, path), "utf8");
const providerPayload = {
  name: "Fear and Greed Index",
  data: [
    {
      value: "27",
      value_classification: "Fear",
      timestamp: "1784419200",
    },
    {
      value: "35",
      value_classification: "Fear",
      timestamp: "1784332800",
    },
    {
      value: "invalid",
      value_classification: "Unknown",
      timestamp: "1784246400",
    },
  ],
};

function jsonResponse(value, status = 200, headers = {}) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
}

let providerCalls = 0;
let providerUrl = "";
const valid = await executeFearGreed({
  fetchImpl: async (input) => {
    providerCalls += 1;
    providerUrl = String(input);
    return jsonResponse(providerPayload);
  },
});
assert.equal(providerCalls, 1);
assert.match(providerUrl, /limit=30/);
assert.equal(valid.status, 200);
assert.equal(valid.body.ok, true);
assert.equal(valid.body.ok ? valid.body.current.value : null, 27);
assert.equal(valid.body.ok ? valid.body.current.classification : null, "Fear");
assert.equal(valid.body.ok ? valid.body.history.length : 0, 2);
assert.equal(
  valid.body.ok ? valid.body.current.timestamp : null,
  "2026-07-19T00:00:00.000Z",
);

const invalidCurrent = await executeFearGreed({
  fetchImpl: async () =>
    jsonResponse({
      data: [
        { ...providerPayload.data[0], value: "101" },
        providerPayload.data[1],
      ],
    }),
});
assert.deepEqual(invalidCurrent, {
  status: 502,
  body: {
    ok: false,
    error: "Fear & Greed sentiment is temporarily unavailable.",
  },
});

const malformedNumericCurrent = await executeFearGreed({
  fetchImpl: async () =>
    jsonResponse({
      data: [{ ...providerPayload.data[0], value: "27junk" }],
    }),
});
assert.equal(malformedNumericCurrent.status, 502);

const malformedJson = await executeFearGreed({
  fetchImpl: async () => new Response("{", { status: 200 }),
});
assert.equal(malformedJson.status, 502);

const oversized = await executeFearGreed({
  maxResponseBytes: 16,
  fetchImpl: async () =>
    jsonResponse(providerPayload, 200, { "content-length": "4096" }),
});
assert.equal(oversized.status, 502);

const providerHttpFailure = await executeFearGreed({
  fetchImpl: async () => jsonResponse({ detail: "private" }, 503),
});
assert.equal(providerHttpFailure.status, 502);
assert.doesNotMatch(JSON.stringify(providerHttpFailure.body), /private/);

const networkFailure = await executeFearGreed({
  fetchImpl: async () => {
    throw new Error("private network detail");
  },
});
assert.equal(networkFailure.status, 502);
assert.doesNotMatch(JSON.stringify(networkFailure.body), /private network/);
assert.equal(isFearGreedSuccess(valid.body), true);
assert.equal(isFearGreedSuccess(networkFailure.body), false);

const [
  route,
  server,
  hook,
  loader,
  globalHook,
  statusRing,
  heatmap,
  store,
  packageJson,
  task,
  spec,
  lesson,
] = [
  read("app/api/fear-greed/route.ts"),
  read("lib/fearGreedServer.ts"),
  read("hooks/useFearGreed.ts"),
  read("components/ui/DataLoader.tsx"),
  read("hooks/useGlobalData.ts"),
  read("components/command/SystemStatusRing.tsx"),
  read("components/command/ThreatHeatmap.tsx"),
  read("store/useStore.ts"),
  read("package.json"),
  read("tasks/todo.md"),
  read("specs/features/sentiment-feed-truth.md"),
  read("tasks/lessons.md"),
];

assert.match(route, /protectedJson/);
assert.match(route, /checkRateLimit/);
assert.match(route, /applyRateLimitHeaders/);
assert.match(route, /createCache<FearGreedSuccess>/);
assert.match(route, /executeFearGreed/);
assert.match(server, /limit=30&format=json/);
assert.doesNotMatch(server, /Promise\.all/);
assert.match(server, /DEFAULT_TIMEOUT_MS = 8_000/);
assert.match(server, /DEFAULT_MAX_RESPONSE_BYTES = 128 \* 1024/);
assert.doesNotMatch(hook, /https?:\/\//);
assert.match(hook, /response\.ok/);
assert.match(hook, /isFearGreedSuccess/);
assert.match(hook, /setFearGreed/);
assert.match(hook, /setSignals/);
assert.match(hook, /requestIdRef/);
assert.match(hook, /updateFeedStatus\("fearGreed"/);
assert.match(loader, /useFearGreed/);
assert.match(loader, /startVisiblePolling\([\s\S]*"fearGreed"/);
assert.doesNotMatch(
  globalHook,
  /fetchFearGreed|\/api\/fear-greed|setFearGreed/,
);
assert.match(statusRing, /signals\.fg/);
assert.doesNotMatch(statusRing, /:\s*50/);
assert.match(statusRing, /segment\.value !== null/);
assert.match(statusRing, /role="alert"/);
assert.match(statusRing, /role="status"/);
assert.match(statusRing, /Retry sentiment/);
assert.match(heatmap, /signals\.fg/);
assert.doesNotMatch(heatmap, /:\s*50/);
assert.match(heatmap, /value: null/);
assert.match(heatmap, /rowIndex === MARKET_ROW_INDEX/);
assert.match(heatmap, /currentOnlyRow\(score\)/);
assert.match(heatmap, /cell\.value \?\? "—"/);
assert.match(store, /\| 'fearGreed'/);
assert.match(store, /fearGreed:\s+\{ lastAttemptAt:/);
assert.match(packageJson, /sentiment-feed:truth:check/);
assert.match(packageJson, /npm run sentiment-feed:truth:check/);
assert.match(task, /SENTIMENT-FEED-TRUTH/);
assert.match(spec, /missing sentiment as unknown/);
assert.match(lesson, /Missing sentiment evidence is unknown, not neutral/);

console.log(
  "ok sentiment-feed-truth (single bounded provider call, normalized snapshot, shared stores, retained data, unknown scoring, safe failures, and accessible retry)",
);
