import assert from "node:assert/strict";
import {
  combineFeedAbortSignals,
  isDedupeSafeGet,
  readJsonFeedResponse,
  summarizeFeedSignals,
} from "../lib/liveFeedReliability.ts";

const collectionGuard = (value) =>
  Boolean(
    value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Array.isArray(value.records),
  );

const verified = await readJsonFeedResponse(
  new Response(JSON.stringify({ records: [] }), {
    status: 200,
    headers: { "content-type": "application/json" },
  }),
  collectionGuard,
  "Feed unavailable.",
);
assert.deepEqual(verified, { records: [] });

await assert.rejects(
  () =>
    readJsonFeedResponse(
      new Response(JSON.stringify({ records: [] }), {
        status: 502,
        headers: { "content-type": "application/json" },
      }),
      collectionGuard,
      "Feed unavailable.",
    ),
  /Feed unavailable/,
);
await assert.rejects(
  () =>
    readJsonFeedResponse(
      new Response("{", { status: 200 }),
      collectionGuard,
      "Feed unavailable.",
    ),
  /Feed unavailable/,
);
await assert.rejects(
  () =>
    readJsonFeedResponse(
      new Response(JSON.stringify({ records: "not-an-array" }), {
        status: 200,
      }),
      collectionGuard,
      "Feed unavailable.",
    ),
  /Feed unavailable/,
);

const controller = new AbortController();
const combined = combineFeedAbortSignals(controller.signal, 60_000);
assert.equal(combined.aborted, false);
controller.abort();
assert.equal(combined.aborted, true);

assert.equal(isDedupeSafeGet("GET", {}), true);
assert.equal(
  isDedupeSafeGet("GET", { signal: AbortSignal.timeout(60_000) }),
  false,
);
assert.equal(isDedupeSafeGet("GET", { cache: "no-store" }), false);
assert.equal(isDedupeSafeGet("POST", {}), false);

const summary = summarizeFeedSignals({
  live: {
    lastAttemptAt: 100,
    lastSuccessAt: 100,
    lastFailureAt: null,
    lastError: null,
  },
  retained: {
    lastAttemptAt: 200,
    lastSuccessAt: 100,
    lastFailureAt: 200,
    lastError: "Refresh failed.",
  },
  unavailable: {
    lastAttemptAt: 300,
    lastSuccessAt: null,
    lastFailureAt: 300,
    lastError: "Unavailable.",
  },
  awaiting: {
    lastAttemptAt: null,
    lastSuccessAt: null,
    lastFailureAt: null,
    lastError: null,
  },
});

assert.deepEqual(summary.counts, {
  live: 1,
  retained: 1,
  unavailable: 1,
  awaiting: 1,
});
assert.equal(
  summary.items.find((item) => item.key === "retained")?.state,
  "retained",
);
assert.equal(
  summary.items.find((item) => item.key === "unavailable")?.state,
  "unavailable",
);

console.log(
  "ok live-feed-reliability-runtime (strict responses, linked cancellation, safe dedupe, and truthful signal states)",
);
