#!/usr/bin/env node
/* eslint-disable no-console */
import assert from "node:assert/strict";
import { runFeynmanResearch } from "../lib/feynmanResearch.ts";

const workflows = [
  "deepresearch",
  "lit-review",
  "review",
  "audit",
  "replicate",
  "recipe",
  "compare",
  "draft",
  "autoresearch",
  "watch",
];

const fixtureDeps = {
  searchPapers: async () => "Primary paper https://arxiv.org/abs/2602.13855",
  webSearch: async () =>
    "Official documentation https://example.com/docs and repository https://github.com/example/research",
  fetchUrl: async (url) =>
    `Directly read evidence from ${url}. The bounded workflow preserves source URLs and audits claims.`,
  write: async () =>
    JSON.stringify({
      title: "Fixture research output",
      summary: "A source-grounded fixture summary.",
      synthesis: "The bounded workflow preserves source URLs [S1].",
      methodology: "Paper and web sources were read directly.",
      disagreements: "No fixture disagreement.",
      openQuestions: "How does this change with new evidence?",
      nextAction: "Review the strongest source.",
      claims: [
        {
          claim: "The bounded workflow preserves source URLs.",
          sourceIds: ["S1"],
        },
      ],
    }),
  verify: async () =>
    JSON.stringify({
      claims: [
        {
          id: "C1",
          claim: "The bounded workflow preserves source URLs.",
          sourceIds: ["S1"],
          verdict: "supported",
          rationale: "S1 was read directly.",
        },
      ],
    }),
  review: async () =>
    JSON.stringify({
      findings: [
        {
          severity: "minor",
          issue: "Fixture coverage is intentionally bounded.",
          recommendation: "Read more sources for production decisions.",
        },
      ],
    }),
};

for (const workflow of workflows) {
  const result = await runFeynmanResearch(
    workflow,
    `fixture ${workflow}`,
    fixtureDeps,
  );
  for (const heading of [
    "## Research Plan",
    "## Evidence Ledger",
    "## Claim Audit",
    "## Reviewer Findings",
    "## Research Integrity Passport",
    "## Coverage Status",
    "## Provenance",
    "## Execution Gate",
  ]) {
    assert.ok(
      result.report.includes(heading),
      `${workflow} missing ${heading}`,
    );
  }
  assert.equal(result.claims[0]?.verdict, "supported");
  assert.ok(result.report.includes("- Query waves:"));
  assert.ok(result.report.includes("- Coverage sufficient:"));
  assert.ok(result.coverage.queryWaves >= 1 && result.coverage.queryWaves <= 2);
  assert.equal(
    result.approvalRequired,
    ["replicate", "autoresearch", "watch"].includes(workflow),
    `${workflow} approval posture mismatch`,
  );
}

const degraded = await runFeynmanResearch("audit", "degraded fixture", {
  searchPapers: async () => {
    throw new Error("offline");
  },
  webSearch: async () => {
    throw new Error("offline");
  },
  fetchUrl: async () => {
    throw new Error("offline");
  },
  write: async () => {
    throw new Error("offline");
  },
  verify: async () => {
    throw new Error("offline");
  },
  review: async () => {
    throw new Error("offline");
  },
});

assert.equal(degraded.stageStatus.researcher, "degraded");
assert.equal(degraded.stageStatus.writer, "degraded");
assert.equal(degraded.stageStatus.verifier, "degraded");
assert.equal(degraded.stageStatus.reviewer, "degraded");
assert.equal(degraded.coverage.sufficient, false);
assert.equal(degraded.integrityPassport.status, "blocked");
assert.ok(degraded.report.includes("No directly read source was available"));
assert.match(degraded.report, /explicit operator approval/i);

console.log("ok feynman-runtime (10 workflows plus degraded fallback)");
