#!/usr/bin/env node
/* eslint-disable no-console */
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import {
  FEYNMAN_WATCH_LIMITS,
  buildFixtureSnapshot,
  createResearchWatch,
  formatWatchCheckResult,
  formatWatchList,
  hashSnapshot,
  listResearchWatches,
  normalizeWatchId,
  normalizeWatchLabel,
  normalizeWatchTopic,
  runResearchWatchCheck,
  sanitizeSnapshot,
  setResearchWatchStatus,
} from "../lib/feynmanResearchWatch.ts";

// ── normalizeWatchTopic ───────────────────────────────────────────────────────
assert.equal(normalizeWatchTopic("  AI safety research  "), "AI safety research");
assert.throws(() => normalizeWatchTopic(""));
assert.throws(() => normalizeWatchTopic("x".repeat(FEYNMAN_WATCH_LIMITS.maximumTopicLength + 1)));
assert.throws(() => normalizeWatchTopic("../secret"));

// ── normalizeWatchLabel ───────────────────────────────────────────────────────
const label = normalizeWatchLabel("Weekly AI safety check");
assert.equal(label, "Weekly AI safety check");
assert.throws(() => normalizeWatchLabel(""));

// ── normalizeWatchId ──────────────────────────────────────────────────────────
assert.equal(normalizeWatchId("ai-safety-weekly"), "ai-safety-weekly");
assert.equal(normalizeWatchId("watch-001"), "watch-001");
assert.throws(() => normalizeWatchId(""));
assert.throws(() => normalizeWatchId("UPPER_CASE"));
assert.throws(() => normalizeWatchId("has spaces"));
assert.throws(() => normalizeWatchId("x".repeat(65)));

// ── sanitizeSnapshot + hashSnapshot ──────────────────────────────────────────
const raw = "  Some content   with  extra   spaces  \n\nand newlines  ";
const sanitized = sanitizeSnapshot(raw);
assert.ok(!sanitized.includes("  "));
assert.ok(sanitized.length > 0);

const hash = hashSnapshot(sanitized);
assert.equal(hash.length, 16);
assert.ok(/^[a-f0-9]+$/.test(hash));

// Same input → same hash
assert.equal(hashSnapshot(sanitized), hashSnapshot(sanitized));

// Different input → different hash
const hash2 = hashSnapshot(sanitizeSnapshot("completely different content"));
assert.notEqual(hash, hash2);

// ── buildFixtureSnapshot ──────────────────────────────────────────────────────
const snap = buildFixtureSnapshot("AI safety research");
assert.ok(snap.includes("AI safety research"));
assert.ok(snap.includes("[stable]"));

// ── Snapshot truncation ───────────────────────────────────────────────────────
const longRaw = "x".repeat(FEYNMAN_WATCH_LIMITS.maximumSnapshotLength + 1_000);
const longSanitized = sanitizeSnapshot(longRaw);
assert.ok(longSanitized.length <= FEYNMAN_WATCH_LIMITS.maximumSnapshotLength);

// ── Full watch lifecycle with in-memory store ─────────────────────────────────
const tmpDir = path.join(os.tmpdir(), `nexus-watch-test-${Date.now()}`);

// Create
const watch = await createResearchWatch(
  "ai-safety-001",
  "AI Safety Weekly",
  "AI safety research and alignment",
  tmpDir,
);
assert.equal(watch.id, "ai-safety-001");
assert.equal(watch.label, "AI Safety Weekly");
assert.equal(watch.status, "enabled");
assert.equal(watch.snapshotHash, null);

// Duplicate id rejected
await assert.rejects(() =>
  createResearchWatch("ai-safety-001", "Dup", "topic", tmpDir),
);

// List
const watches = await listResearchWatches(tmpDir);
assert.equal(watches.length, 1);
assert.equal(watches[0].id, "ai-safety-001");

// Create a second watch
await createResearchWatch("ml-papers-002", "ML Papers", "machine learning papers", tmpDir);
const watches2 = await listResearchWatches(tmpDir);
assert.equal(watches2.length, 2);

// run_check — first check records hash, reports not changed (no baseline)
const check1 = await runResearchWatchCheck("ai-safety-001", tmpDir, {
  buildSnapshot: async (topic) => buildFixtureSnapshot(topic),
});
assert.equal(check1.watchId, "ai-safety-001");
assert.equal(check1.changed, false); // No previous hash → not changed
assert.ok(check1.currentHash.length === 16);
assert.ok(check1.receipt.includes("Research watch check"));
assert.ok(check1.receipt.includes("ai-safety-001"));

// run_check again with same snapshot — still not changed
const check2 = await runResearchWatchCheck("ai-safety-001", tmpDir, {
  buildSnapshot: async (topic) => buildFixtureSnapshot(topic),
});
assert.equal(check2.changed, false);

// run_check with different snapshot — changed
let callCount = 0;
const check3 = await runResearchWatchCheck("ai-safety-001", tmpDir, {
  buildSnapshot: async (topic) => {
    callCount += 1;
    return `Changed content for ${topic} at call ${callCount}`;
  },
});
assert.equal(check3.changed, true);

// Disable + run_check rejected
await setResearchWatchStatus("ai-safety-001", "disabled", tmpDir);
await assert.rejects(() => runResearchWatchCheck("ai-safety-001", tmpDir));

// Re-enable
await setResearchWatchStatus("ai-safety-001", "enabled", tmpDir);
const check4 = await runResearchWatchCheck("ai-safety-001", tmpDir, {
  buildSnapshot: async (topic) => buildFixtureSnapshot(topic),
});
assert.ok(check4.receipt.length > 0);

// formatWatchList
const wList = await listResearchWatches(tmpDir);
const listText = formatWatchList(wList);
assert.ok(listText.includes("ai-safety-001"));
assert.ok(listText.includes("AI Safety Weekly"));

// formatWatchCheckResult
const checkText = formatWatchCheckResult(check4);
assert.ok(checkText.length > 0);
assert.ok(checkText.length <= FEYNMAN_WATCH_LIMITS.maximumFormattedChars);

// formatWatchList bounded
const emptyList = formatWatchList([]);
assert.ok(emptyList.includes("No research watches"));

// Non-existent watch
await assert.rejects(() => runResearchWatchCheck("no-such-watch", tmpDir));
await assert.rejects(() => setResearchWatchStatus("no-such-watch", "enabled", tmpDir));

console.log(
  "ok feynman-research-watch (create/list/enable/disable/run_check, snapshot hashing, fixture snapshot, change detection, no background cron)",
);
