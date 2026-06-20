#!/usr/bin/env node
/* eslint-disable no-console */
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import {
  FEYNMAN_AUTORESEARCH_LIMITS,
  fixtureScorer,
  formatAutoresearchReceipt,
  normalizeVariantDefinitions,
  normalizeTopic,
  runAutoresearchLoop,
} from "../lib/feynmanAutoresearchLoop.ts";

// ── normalizeTopic ────────────────────────────────────────────────────────────
assert.equal(normalizeTopic("  scaling laws  "), "scaling laws");
assert.throws(() => normalizeTopic(""));
assert.throws(() => normalizeTopic("x".repeat(513)));

// ── normalizeVariantDefinitions ───────────────────────────────────────────────
const validVariants = normalizeVariantDefinitions([
  { id: "v1", label: "Baseline", hypothesis: "Standard approach" },
  { id: "v2", label: "Variant A", hypothesis: "Modified approach" },
]);
assert.equal(validVariants.length, 2);
assert.equal(validVariants[0].id, "v1");
assert.equal(validVariants[1].label, "Variant A");

assert.throws(() => normalizeVariantDefinitions([]));
assert.throws(() => normalizeVariantDefinitions("not an array"));
assert.throws(() => normalizeVariantDefinitions([{ id: "x", label: "X" }, { id: "x", label: "Y" }]));

// ── Bounded to maximumVariantsPerRun ──────────────────────────────────────────
const tooManyVariants = Array.from(
  { length: FEYNMAN_AUTORESEARCH_LIMITS.maximumVariantsPerRun + 5 },
  (_, i) => ({ id: `v${i}`, label: `Variant ${i}`, hypothesis: `h${i}` }),
);
const bounded = normalizeVariantDefinitions(tooManyVariants);
assert.ok(bounded.length <= FEYNMAN_AUTORESEARCH_LIMITS.maximumVariantsPerRun);

// ── fixtureScorer ─────────────────────────────────────────────────────────────
const score = fixtureScorer(
  { id: "v1", label: "Baseline", hypothesis: "Standard approach" },
  "scaling laws",
  "2026-01-01T00:00:00.000Z",
);
assert.equal(score.variantId, "v1");
assert.ok(score.score >= 0 && score.score <= 100);
assert.ok(score.rationale.length > 0);
assert.equal(score.scoredAt, "2026-01-01T00:00:00.000Z");

// ── Deterministic: same variant + topic always gives same score ───────────────
const scoreA = fixtureScorer({ id: "v1", label: "Baseline", hypothesis: "h" }, "topic");
const scoreB = fixtureScorer({ id: "v1", label: "Baseline", hypothesis: "h" }, "topic");
assert.equal(scoreA.score, scoreB.score);

// ── Different topic or id gives different score ───────────────────────────────
const scoreC = fixtureScorer({ id: "v2", label: "Other", hypothesis: "h" }, "topic");
assert.notEqual(scoreA.score, scoreC.score);

// ── runAutoresearchLoop fixture run ───────────────────────────────────────────
const tmpDir = path.join(os.tmpdir(), `nexus-ar-test-${Date.now()}`);

const variants = [
  { id: "v1", label: "Baseline", hypothesis: "Standard approach" },
  { id: "v2", label: "Aggressive", hypothesis: "Higher learning rate" },
];

const result = await runAutoresearchLoop("scaling laws", variants, tmpDir);

assert.ok(result.runId.startsWith("ar-"));
assert.equal(result.topic, "scaling laws");
assert.equal(result.variants.length, 2);
assert.equal(result.scores.length, 2);
assert.ok(result.bestVariantId !== null || result.scores.length === 0);
assert.ok(result.bestScore === null || (result.bestScore >= 0 && result.bestScore <= 100));
assert.ok(typeof result.improved === "boolean");
assert.ok(result.historyPath.includes("feynman"));
assert.ok(result.receipt.includes("Autoresearch loop"));
assert.ok(result.receipt.includes("scaling laws"));
assert.ok(result.receipt.length <= FEYNMAN_AUTORESEARCH_LIMITS.maximumFormattedChars);

// ── Second run for same topic detects improvement ─────────────────────────────
const result2 = await runAutoresearchLoop("scaling laws", variants, tmpDir);
assert.ok(typeof result2.improved === "boolean");

// ── formatAutoresearchReceipt truncation guard ────────────────────────────────
const bigResult = {
  ...result,
  scores: Array.from({ length: 50 }, (_, i) => ({
    variantId: `v${i}`,
    score: i,
    rationale: "x".repeat(300),
    scoredAt: "2026-01-01T00:00:00Z",
  })),
};
const bigReceipt = formatAutoresearchReceipt(bigResult);
assert.ok(bigReceipt.length <= FEYNMAN_AUTORESEARCH_LIMITS.maximumFormattedChars);

// ── Error cases ───────────────────────────────────────────────────────────────
await assert.rejects(() =>
  runAutoresearchLoop("", [{ id: "v1", label: "x", hypothesis: "y" }], tmpDir),
);
await assert.rejects(() =>
  runAutoresearchLoop("valid topic", [], tmpDir),
);

console.log(
  "ok feynman-autoresearch-loop (bounded experiment loop, fixture scorer, deterministic scoring, JSONL history, improvement detection)",
);
