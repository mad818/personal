#!/usr/bin/env node
/* eslint-disable no-console */
import assert from "node:assert/strict";
import {
  formatFeynmanPaperRank,
  parseFeynmanPaperRankInput,
  rankFeynmanPapers,
} from "../lib/feynmanPaperRank.ts";

const parsed = parseFeynmanPaperRankInput(
  "local-first agent memory",
  JSON.stringify([
    {
      id: "local",
      title: "Local-first agent memory",
      abstract:
        "A controlled study with a dataset, benchmark metrics, confidence intervals, and limitations.",
      year: 2026,
      citationCount: 12,
      graphPrestige: 80,
      codeUrl: "https://example.test/code",
      dataUrl: "https://example.test/data",
      reproducibilityText:
        "Docker environment, configuration, random seed, setup instructions, and checkpoints.",
    },
    {
      id: "remote",
      title: "Unrelated remote database survey",
      year: 2020,
      citationCount: 3,
    },
  ]),
);
assert.equal(parsed.candidates.length, 2);
const ranked = rankFeynmanPapers(parsed.topic, parsed.candidates);
assert.equal(ranked.ranked[0]?.candidate.id, "local");
assert.equal(
  ranked.ranked[0]?.signals.find((signal) => signal.id === "graphPrestige")
    ?.value,
  80,
);
assert.equal(
  ranked.ranked[0]?.signals.find((signal) => signal.id === "reproducibility")
    ?.value,
  100,
);

const missing = rankFeynmanPapers("transparent systems", [
  { title: "Transparent systems" },
  { title: "Opaque services" },
]);
assert.equal(missing.ranked[0]?.score, 100);
assert.equal(missing.ranked[0]?.availableWeight, 0.3);
assert.deepEqual(missing.ranked[0]?.missingSignals, [
  "Citation impact",
  "Graph prestige",
  "Citation velocity",
  "Methodology evidence",
  "Reproducibility",
]);

const citationRank = rankFeynmanPapers("memory", [
  { id: "low", title: "Memory", citationCount: 1 },
  { id: "high", title: "Memory", citationCount: 100 },
]);
assert.equal(citationRank.ranked[0]?.candidate.id, "high");

const currentYear = new Date().getUTCFullYear();
const velocityRank = rankFeynmanPapers("memory", [
  {
    id: "older",
    title: "Memory",
    citationCount: 10,
    year: currentYear - 9,
  },
  {
    id: "newer",
    title: "Memory",
    citationCount: 10,
    year: currentYear,
  },
]);
assert.equal(velocityRank.ranked[0]?.candidate.id, "newer");

const stable = rankFeynmanPapers("memory", [
  { id: "first", title: "Memory" },
  { id: "second", title: "Memory" },
]);
assert.deepEqual(
  stable.ranked.map((item) => item.candidate.id),
  ["first", "second"],
);

assert.throws(() => parseFeynmanPaperRankInput("topic", "not json"));
assert.throws(() =>
  parseFeynmanPaperRankInput("topic", JSON.stringify([{ title: "Only one" }])),
);
assert.throws(() =>
  parseFeynmanPaperRankInput(
    "topic",
    JSON.stringify([{ title: "One" }, { title: "Two", invented: true }]),
  ),
);
assert.throws(() =>
  parseFeynmanPaperRankInput(
    "topic",
    JSON.stringify([{ title: "One" }, { title: "Two", citationCount: -1 }]),
  ),
);

const report = formatFeynmanPaperRank(ranked);
assert.match(report, /^# Feynman PaperRank/m);
assert.match(report, /## Ranked reading order/);
assert.match(report, /## Score audit/);
assert.match(report, /## Formula/);
assert.match(report, /Missing components are excluded/);
assert.match(report, /not peer review/);
assert.match(report, /did not fetch or validate/);

console.log(
  "ok feynman-paper-rank-runtime (validation, deterministic scoring, missing-signal denominator, stable order, honest report)",
);
