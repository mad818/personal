#!/usr/bin/env node
/* eslint-disable no-console */

import assert from "node:assert/strict";
import {
  buildRuntimeExperimentDecision,
  evaluateRuntimeExperimentKeepGate,
  parseRuntimeExperimentPayload,
  runtimeExperimentDecisionInputSchema,
} from "../lib/runtimeExperimentContracts.ts";

function makeRun({
  recommendation = "candidate_win",
  verdict = "improved",
  scoreDelta = 4,
  newFailures = [],
  failedChecks = [],
  failedCategories = [],
} = {}) {
  return {
    id: "rtx-run-review-fixture",
    createdAt: "2026-07-23T12:00:00.000Z",
    definition: {
      id: "rtx-definition-review-fixture",
      createdAt: "2026-07-23T11:59:00.000Z",
      title: "Bounded runtime candidate",
      variantKind: "memory_context_policy_delta",
      changeSummary: "Reduce context noise without widening runtime authority.",
      hypothesis: "A tighter context package improves reliability.",
      targetCategories: ["reliability"],
      operatorNotes: "Evidence only.",
    },
    baseline: {
      ts: "2026-07-23T11:58:00.000Z",
      score: 90,
      minScore: 85,
      ok: true,
      categories: {
        safety: { score: 90 },
        reliability: { score: 90 },
        ux: { score: 90 },
        observability: { score: 90 },
      },
      categoryThresholds: {
        safety: 80,
        reliability: 80,
        ux: 70,
        observability: 70,
      },
      failedChecks: [],
      failedCategories: [],
    },
    variant: {
      score: 94,
      categories: {
        safety: { score: 92 },
        reliability: { score: 95 },
        ux: { score: 92 },
        observability: { score: 94 },
      },
      categoryThresholds: {
        safety: 80,
        reliability: 80,
        ux: 70,
        observability: 70,
      },
      failedChecks,
      failedCategories,
      deltas: { safety: 2, reliability: 5, ux: 2, observability: 4 },
      notes: ["Fixture-only measured comparison."],
    },
    comparison: {
      scoreDelta,
      categoryDeltas: {
        safety: 2,
        reliability: 5,
        ux: 2,
        observability: 4,
      },
      newFailures,
      resolvedFailures: [],
      verdict,
      recommendation,
      summary: "Candidate comparison fixture.",
    },
  };
}

const candidate = makeRun();
assert.deepEqual(evaluateRuntimeExperimentKeepGate(candidate), {
  eligible: true,
  reasons: [],
});

const keep = buildRuntimeExperimentDecision(
  candidate,
  {
    runId: candidate.id,
    decision: "keep",
    rationale: "Benchmarks improved without threshold regressions.",
  },
  {
    id: "rtx-decision-keep",
    decidedAt: "2026-07-23T12:05:00.000Z",
  },
);
assert.equal(keep.decision, "keep");
assert.equal(keep.benchmark.keepEligible, true);
assert.equal(keep.definitionId, candidate.definition.id);

const reviewOnly = makeRun({
  recommendation: "review",
  verdict: "improved",
  scoreDelta: 1,
});
assert.equal(evaluateRuntimeExperimentKeepGate(reviewOnly).eligible, false);
assert.throws(
  () =>
    buildRuntimeExperimentDecision(
      reviewOnly,
      {
        runId: reviewOnly.id,
        decision: "keep",
        rationale: "Attempted premature promotion.",
      },
      {
        id: "rtx-decision-blocked",
        decidedAt: "2026-07-23T12:06:00.000Z",
      },
    ),
  /candidate_win/,
);

for (const decision of ["reject", "defer"]) {
  const record = buildRuntimeExperimentDecision(
    reviewOnly,
    {
      runId: reviewOnly.id,
      decision,
      rationale: `${decision} remains available after operator review.`,
    },
    {
      id: `rtx-decision-${decision}`,
      decidedAt: "2026-07-23T12:07:00.000Z",
    },
  );
  assert.equal(record.decision, decision);
  assert.equal(record.benchmark.keepEligible, false);
}

const regressed = makeRun({
  recommendation: "reject",
  verdict: "regressed",
  scoreDelta: -2,
  newFailures: ["safety:80"],
  failedChecks: [{ name: "authority boundary", category: "safety" }],
  failedCategories: [{ name: "safety", score: 72, threshold: 80 }],
});
const blockedGate = evaluateRuntimeExperimentKeepGate(regressed);
assert.equal(blockedGate.eligible, false);
assert.equal(blockedGate.reasons.length, 6);

assert.equal(
  runtimeExperimentDecisionInputSchema.safeParse({
    runId: candidate.id,
    decision: "keep",
    rationale: " ",
  }).success,
  false,
);

const payload = parseRuntimeExperimentPayload({
  latest: candidate,
  history: [candidate],
  definitions: [candidate.definition],
  decisions: [keep],
  latestDecision: keep,
  points: 1,
  summary: null,
});
assert.equal(payload.latestDecision?.decision, "keep");
assert.equal(payload.decisions.length, 1);

console.log(
  "ok runtime-experiment-review-runtime (keep, reject, defer, blocked, invalid)",
);
