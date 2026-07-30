import assert from "node:assert/strict";
import {
  buildEpisodicMemoryEntry,
} from "../lib/episodicMemoryStore.ts";
import {
  runEpisodicMemoryBenchmark,
} from "../lib/episodicMemoryBenchmark.ts";

const now = Date.parse("2026-07-27T20:00:00.000Z");
const day = 24 * 60 * 60 * 1_000;
const fixtures = [
  ["orbit-azure", "ORBIT", "configure azure provider", "Azure endpoint and deployment routing", 9],
  ["flux-risk", "FLUX", "position risk plan", "Drawdown sizing and stop discipline", 7],
  ["cipher-cve", "CIPHER", "dependency security", "Patch the high severity package alert", 5],
  ["nova-paper", "NOVA", "research paper audit", "Verify citations against source passages", 3],
  ["jansky-plan", "JANSKY", "mission sequence", "Plan capability closure in bounded tranches", 1],
].map(([id, agent, query, summary, ageDays]) => ({
  ...buildEpisodicMemoryEntry({
    agent: String(agent),
    query: String(query),
    summary: String(summary),
    capturedAt: now - Number(ageDays) * day,
  }),
  id: String(id),
}));
const cases = [
  { query: "azure endpoint deployment", expectedId: "orbit-azure" },
  { query: "drawdown position sizing", expectedId: "flux-risk" },
  { query: "dependency package security patch", expectedId: "cipher-cve" },
  { query: "paper citation source verification", expectedId: "nova-paper" },
  { query: "bounded mission capability plan", expectedId: "jansky-plan" },
];

const results = runEpisodicMemoryBenchmark(fixtures, cases, now);
const byStrategy = Object.fromEntries(
  results.map((result) => [result.strategy, result]),
);
assert.equal(byStrategy.keyword.correct, cases.length);
assert.equal(byStrategy.hybrid.correct, cases.length);
assert.ok(byStrategy.recency.correct < byStrategy.hybrid.correct);
assert.equal(byStrategy.hybrid.accuracy, 1);

console.log(
  `ok episodic-memory-benchmark (cases=${cases.length}; recency=${byStrategy.recency.accuracy.toFixed(2)}; keyword=${byStrategy.keyword.accuracy.toFixed(2)}; hybrid=${byStrategy.hybrid.accuracy.toFixed(2)})`,
);
