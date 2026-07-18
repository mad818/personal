#!/usr/bin/env node
/* eslint-disable no-console */
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  FEYNMAN_RESEARCH_WATCH_LIMITS,
  FeynmanResearchWatchError,
  buildFeynmanResearchWatchUrl,
  compareFeynmanResearchWatchEntries,
  listFeynmanResearchWatches,
  normalizeFeynmanResearchWatchId,
  normalizeFeynmanResearchWatchTopic,
  parseFeynmanResearchWatchAtom,
  runFeynmanResearchWatch,
} from "../lib/feynmanResearchWatch.ts";

function entry({
  id,
  title,
  published = "2026-06-01T10:00:00Z",
  updated = published,
}) {
  return `
  <entry>
    <id>http://arxiv.org/abs/${id}</id>
    <updated>${updated}</updated>
    <published>${published}</published>
    <title>${title}</title>
    <summary>Bounded evidence for ${title} &amp; evaluation.</summary>
    <author><name>Ada Example</name></author>
    <category term="cs.AI" />
  </entry>`;
}

function feed(...entries) {
  return `<?xml version="1.0" encoding="UTF-8"?>
  <feed xmlns="http://www.w3.org/2005/Atom">${entries.join("\n")}</feed>`;
}

const baselineFeed = feed(
  entry({ id: "2606.00001v1", title: "Local Agent Safety" }),
);
const changedFeed = feed(
  entry({
    id: "2606.00001v2",
    title: "Local Agent Safety Revised",
    updated: "2026-06-02T10:00:00Z",
  }),
  entry({ id: "2606.00002v1", title: "Bounded Research Agents" }),
);

assert.equal(normalizeFeynmanResearchWatchId("job-watch_1"), "job-watch_1");
assert.equal(
  normalizeFeynmanResearchWatchTopic("  local AI safety?!  "),
  "local AI safety",
);
assert.throws(
  () => normalizeFeynmanResearchWatchId("../unsafe"),
  FeynmanResearchWatchError,
);
assert.throws(
  () =>
    normalizeFeynmanResearchWatchTopic(
      "x".repeat(FEYNMAN_RESEARCH_WATCH_LIMITS.maximumTopicChars + 1),
    ),
  FeynmanResearchWatchError,
);

const query = buildFeynmanResearchWatchUrl("local AI safety");
assert.equal(query.origin, "https://export.arxiv.org");
assert.equal(query.pathname, "/api/query");
assert.equal(query.searchParams.get("search_query"), 'all:"local AI safety"');
assert.equal(query.searchParams.get("max_results"), "12");
assert.equal(query.searchParams.get("sortBy"), "submittedDate");
assert.equal(query.searchParams.get("sortOrder"), "descending");

const parsed = parseFeynmanResearchWatchAtom(baselineFeed);
assert.equal(parsed.length, 1);
assert.equal(parsed[0].id, "2606.00001");
assert.equal(parsed[0].sourceUrl, "https://arxiv.org/abs/2606.00001v1");
assert.deepEqual(parsed[0].authors, ["Ada Example"]);
assert.deepEqual(parsed[0].categories, ["cs.AI"]);
assert.match(parsed[0].summary, /& evaluation/);
assert.throws(
  () => parseFeynmanResearchWatchAtom("<!DOCTYPE feed><feed />"),
  FeynmanResearchWatchError,
);
assert.throws(
  () =>
    parseFeynmanResearchWatchAtom(
      feed(entry({ id: "2606.00001v1", title: "Bad", updated: "later" })),
    ),
  FeynmanResearchWatchError,
);
assert.deepEqual(compareFeynmanResearchWatchEntries(parsed, parsed), []);

const root = await mkdtemp(path.join(os.tmpdir(), "nexus-feynman-watch-"));
const dataFile = path.join(root, "watches.json");
let now = 10_000;
let fetchCount = 0;
let nextFeed = baselineFeed;
let shouldFail = false;
const deps = {
  dataFile,
  now: () => now,
  sleep: async () => undefined,
  fetchImpl: async (url) => {
    fetchCount += 1;
    assert.equal(new URL(url).origin, "https://export.arxiv.org");
    if (shouldFail) throw new Error("offline fixture");
    return new Response(nextFeed, {
      status: 200,
      headers: { "Content-Type": "application/atom+xml" },
    });
  },
};

try {
  const baseline = await runFeynmanResearchWatch(
    { id: "job-watch-local-safety", topic: "local AI safety" },
    deps,
  );
  assert.equal(baseline.networkUsed, true);
  assert.equal(baseline.receipt.status, "baseline");
  assert.equal(baseline.receipt.entryCount, 1);

  now += 1_000;
  const cached = await runFeynmanResearchWatch(
    { id: "job-watch-local-safety", topic: "local AI safety" },
    deps,
  );
  assert.equal(cached.networkUsed, false);
  assert.equal(cached.receipt.status, "cached");
  assert.equal(fetchCount, 1);

  const sharedCache = await runFeynmanResearchWatch(
    { id: "job-watch-shared-cache", topic: "local AI safety" },
    deps,
  );
  assert.equal(sharedCache.networkUsed, false);
  assert.equal(sharedCache.receipt.status, "baseline");
  assert.equal(fetchCount, 1);

  now += FEYNMAN_RESEARCH_WATCH_LIMITS.cacheMs + 1;
  nextFeed = changedFeed;
  const changed = await runFeynmanResearchWatch(
    { id: "job-watch-local-safety", topic: "local AI safety" },
    deps,
  );
  assert.equal(changed.networkUsed, true);
  assert.equal(changed.receipt.status, "changed");
  assert.equal(changed.receipt.newCount, 1);
  assert.equal(changed.receipt.updatedCount, 1);

  const beforeFailure = changed.watch.current;
  now += FEYNMAN_RESEARCH_WATCH_LIMITS.cacheMs + 1;
  shouldFail = true;
  await assert.rejects(
    () =>
      runFeynmanResearchWatch(
        { id: "job-watch-local-safety", topic: "local AI safety" },
        deps,
      ),
    (error) =>
      error instanceof FeynmanResearchWatchError && error.kind === "network",
  );
  const afterFailure = await listFeynmanResearchWatches(deps);
  const failed = afterFailure.watches.find(
    (watch) => watch.id === "job-watch-local-safety",
  );
  assert.equal(failed.lastStatus, "error");
  assert.deepEqual(failed.current, beforeFailure);
  assert.match(failed.lastError, /request failed/i);

  const retentionFile = path.join(root, "retention.json");
  let retentionNow = 5_000;
  const retentionDeps = {
    dataFile: retentionFile,
    now: () => retentionNow,
    sleep: async () => undefined,
    fetchImpl: async () => new Response(baselineFeed, { status: 200 }),
  };
  await runFeynmanResearchWatch(
    { id: "job-watch-retention", topic: "bounded agents" },
    retentionDeps,
  );
  for (let index = 0; index < 45; index += 1) {
    retentionNow += 1_000;
    await runFeynmanResearchWatch(
      { id: "job-watch-retention", topic: "bounded agents" },
      retentionDeps,
    );
  }
  const retained = await listFeynmanResearchWatches(retentionDeps);
  assert.equal(
    retained.watches[0].history.length,
    FEYNMAN_RESEARCH_WATCH_LIMITS.maximumReceiptsPerWatch,
  );

  await writeFile(dataFile, '{"version":1,"watches":"corrupt"}', "utf8");
  await assert.rejects(
    () => listFeynmanResearchWatches(deps),
    (error) =>
      error instanceof FeynmanResearchWatchError && error.kind === "storage",
  );
  assert.equal(
    await readFile(dataFile, "utf8"),
    '{"version":1,"watches":"corrupt"}',
  );
} finally {
  await rm(root, { recursive: true, force: true });
}

console.log(
  "ok feynman-research-watch-runtime (fixed arXiv query, safe Atom parsing, baseline and material changes, daily cache, bounded retention, failed-fetch preservation, corrupt-store rejection)",
);
