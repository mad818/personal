#!/usr/bin/env node
/* eslint-disable no-console */
import assert from "node:assert/strict";
import {
  buildInitialFeynmanResearchQueries,
  buildRefinementFeynmanResearchQueries,
  prioritizeFeynmanCandidateUrls,
  renderFeynmanResearchQuery,
  runFeynmanProgressiveResearch,
} from "../lib/feynmanProgressiveResearch.ts";

const now = Date.UTC(2026, 5, 14, 12, 0, 0);
const initial = buildInitialFeynmanResearchQueries(
  "deepresearch",
  "fixture progressive research",
  now,
);
assert.ok(initial.length >= 2 && initial.length <= 4);
assert.equal(new Set(initial.map((query) => query.query.toLowerCase())).size, initial.length);
assert.ok(initial.some((query) => query.recencyDays));
assert.ok(initial.some((query) => query.domainFilters?.length));

const rendered = renderFeynmanResearchQuery(
  {
    id: "filtered",
    wave: "refinement",
    angle: "authoritative",
    query: "fixture evidence",
    recencyDays: 30,
    domainFilters: [".gov", ".edu", "arxiv.org"],
  },
  now,
);
assert.match(rendered, /after:2026-05-15/);
assert.match(rendered, /site:\.gov/);
assert.match(rendered, /site:arxiv\.org/);

assert.deepEqual(
  prioritizeFeynmanCandidateUrls([
    "https://example.com/blog",
    "https://github.com/example/research",
    "https://agency.gov/report",
    "https://arxiv.org/abs/2606.00001",
  ]),
  [
    "https://agency.gov/report",
    "https://arxiv.org/abs/2606.00001",
    "https://github.com/example/research",
    "https://example.com/blog",
  ],
);

const refinement = buildRefinementFeynmanResearchQueries({
  workflow: "deepresearch",
  topic: "fixture progressive research",
  initialQueries: initial,
  webResults: [
    {
      query: "fixture progressive research",
      renderedQuery: "fixture progressive research",
      wave: "initial",
      angle: "landscape",
      result: "Promising Vector Atlas methodology https://example.com/atlas",
    },
  ],
  coverage: {
    thresholds: {
      discoveredSources: 5,
      directlyReadSources: 3,
      highConfidenceDirectSources: 2,
    },
    discoveredSources: 1,
    directlyReadSources: 1,
    highConfidenceDirectSources: 0,
    queryWaves: 1,
    initialQueries: 4,
    refinementQueries: 0,
    refinementRequired: true,
    sufficient: false,
    gaps: ["discovered sources 1/5", "high-confidence direct sources 0/2"],
  },
  now,
});
assert.ok(refinement.length > 0 && refinement.length <= 3);
assert.ok(refinement.some((query) => /vector|atlas/i.test(query.query)));
assert.ok(
  refinement.every(
    (query) =>
      !initial.some(
        (initialQuery) =>
          initialQuery.query.trim().toLowerCase() === query.query.trim().toLowerCase(),
      ),
  ),
);

let activeSearches = 0;
let maxActiveSearches = 0;
let activeReads = 0;
let maxActiveReads = 0;
let searchCalls = 0;
const sleep = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

const progressive = await runFeynmanProgressiveResearch({
  workflow: "deepresearch",
  topic: "fixture progressive research",
  now,
  deps: {
    searchPapers: async () => {
      activeSearches += 1;
      maxActiveSearches = Math.max(maxActiveSearches, activeSearches);
      await sleep(12);
      activeSearches -= 1;
      return "Paper signal https://example.com/paper";
    },
    webSearch: async (query) => {
      searchCalls += 1;
      activeSearches += 1;
      maxActiveSearches = Math.max(maxActiveSearches, activeSearches);
      await sleep(12);
      activeSearches -= 1;
      if (searchCalls <= 4) {
        return `Initial result https://example.com/initial-${searchCalls}`;
      }
      return [
        "Official evidence https://agency.gov/report",
        "Academic evidence https://university.edu/paper",
        "Paper evidence https://arxiv.org/abs/2606.00001",
      ].join("\n");
    },
    fetchUrl: async (url) => {
      activeReads += 1;
      maxActiveReads = Math.max(maxActiveReads, activeReads);
      await sleep(8);
      activeReads -= 1;
      return `Direct evidence from ${url}`;
    },
  },
});

assert.ok(maxActiveSearches >= 4, `expected parallel searches, saw ${maxActiveSearches}`);
assert.ok(maxActiveReads >= 2, `expected parallel reads, saw ${maxActiveReads}`);
assert.equal(progressive.coverage.queryWaves, 2);
assert.equal(progressive.coverage.refinementRequired, true);
assert.equal(progressive.coverage.sufficient, true);
assert.ok(progressive.webResults.length <= 7);
assert.ok(progressive.fetchedSources.length <= 8);
assert.ok(progressive.webResults.some((result) => result.wave === "refinement"));

let strongSearchCalls = 0;
const strong = await runFeynmanProgressiveResearch({
  workflow: "audit",
  topic: "strong fixture",
  now,
  deps: {
    searchPapers: async () => "https://arxiv.org/abs/2606.00002",
    webSearch: async () => {
      strongSearchCalls += 1;
      return [
        "https://agency.gov/one",
        "https://university.edu/two",
        "https://docs.example.com/three",
        "https://example.com/four",
        "https://example.org/five",
      ].join("\n");
    },
    fetchUrl: async (url) => `Direct evidence from ${url}`,
  },
});
assert.equal(strong.coverage.refinementRequired, false);
assert.equal(strong.coverage.queryWaves, 1);
assert.equal(strongSearchCalls, 4);

const weak = await runFeynmanProgressiveResearch({
  workflow: "watch",
  topic: "weak fixture",
  now,
  deps: {
    searchPapers: async () => {
      throw new Error("offline");
    },
    webSearch: async () => "No results found.",
    fetchUrl: async () => {
      throw new Error("offline");
    },
  },
});
assert.equal(weak.coverage.sufficient, false);
assert.equal(weak.coverage.queryWaves, 2);
assert.ok(weak.coverage.gaps.length >= 3);
assert.ok(weak.failures.length > 0);

console.log("ok feynman-progressive-research-runtime (parallel waves, refinement, filters, coverage, hard caps)");
