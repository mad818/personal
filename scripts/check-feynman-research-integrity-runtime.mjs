#!/usr/bin/env node
/* eslint-disable no-console */
import assert from "node:assert/strict";
import { runFeynmanResearch } from "../lib/feynmanResearch.ts";
import { parseFeynmanResearchIntegrityInput } from "../lib/feynmanResearchIntegrity.ts";

const noExperiments = parseFeynmanResearchIntegrityInput({
  experimentIntakeDeclaration: "no_experiments_declared",
});
const experimentProvenance = [
  {
    experimentId: "EXP-1",
    objective: "Measure whether the bounded fixture preserves source IDs.",
    evidenceRefs: ["fixture-run.json"],
    plannedVsExecuted: ["Planned one run; executed one run."],
    negativeResults: [],
    knownLimitations: ["Synthetic deterministic fixture only."],
  },
];
const declaredExperiment = parseFeynmanResearchIntegrityInput({
  experimentIntakeDeclaration: "experiments_declared",
  experimentProvenanceJson: JSON.stringify(experimentProvenance),
});

assert.throws(() =>
  parseFeynmanResearchIntegrityInput({
    experimentIntakeDeclaration: "unknown",
  }),
);
assert.throws(() =>
  parseFeynmanResearchIntegrityInput({
    experimentIntakeDeclaration: "no_experiments_declared",
    experimentProvenanceJson: JSON.stringify(experimentProvenance),
  }),
);
assert.throws(() =>
  parseFeynmanResearchIntegrityInput({
    experimentIntakeDeclaration: "experiments_declared",
    experimentProvenanceJson: "[",
  }),
);
assert.throws(() =>
  parseFeynmanResearchIntegrityInput({
    experimentIntakeDeclaration: "experiments_declared",
    experimentProvenanceJson: JSON.stringify([
      ...experimentProvenance,
      experimentProvenance[0],
    ]),
  }),
);

function fixtureDeps(experimentIds = []) {
  return {
    searchPapers: async () =>
      [
        "https://arxiv.org/abs/2602.13855",
        "https://arxiv.org/abs/2602.13856",
      ].join("\n"),
    webSearch: async () =>
      [
        "https://example.gov/research",
        "https://example.edu/method",
        "https://github.com/example/research",
      ].join("\n"),
    fetchUrl: async (url) => `Directly read fixture evidence from ${url}.`,
    write: async () =>
      JSON.stringify({
        title: "Integrity fixture",
        summary: "A bounded integrity fixture.",
        synthesis: "The fixture preserves directly read source evidence [S1].",
        methodology: "The fixture uses deterministic source reads.",
        disagreements: "No fixture disagreement.",
        openQuestions: "What changes with non-fixture evidence?",
        nextAction: "Review the integrity passport.",
        claims: [
          {
            claim: "The fixture preserves directly read source evidence.",
            sourceIds: ["S1"],
            experimentIds,
          },
        ],
      }),
    verify: async () =>
      JSON.stringify({
        claims: [
          {
            id: "C1",
            claim: "The fixture preserves directly read source evidence.",
            sourceIds: ["S1"],
            experimentIds,
            verdict: "supported",
            rationale: "S1 was read directly.",
          },
        ],
      }),
    review: async () => JSON.stringify({ findings: [] }),
  };
}

const clean = await runFeynmanResearch(
  "deepresearch",
  "clean integrity fixture",
  fixtureDeps(),
  noExperiments,
);
assert.equal(clean.integrityPassport.status, "pass");
assert.equal(
  clean.integrityPassport.experimentIntake.declaration,
  "no_experiments_declared",
);
assert.equal(clean.integrityPassport.claims.supported, 1);
assert.match(clean.report, /## Research Integrity Passport/);
assert.match(clean.report, /replay guarantee no/i);
assert.match(clean.report, /independent verification no/i);

const undeclared = await runFeynmanResearch(
  "deepresearch",
  "undeclared integrity fixture",
  fixtureDeps(),
);
assert.equal(undeclared.integrityPassport.status, "pass");
assert.equal(
  undeclared.integrityPassport.experimentIntake.declaration,
  "undeclared",
);

const validExperiment = await runFeynmanResearch(
  "audit",
  "declared experiment fixture",
  fixtureDeps(["EXP-1"]),
  declaredExperiment,
);
assert.equal(validExperiment.claims[0]?.verdict, "supported");
assert.equal(validExperiment.integrityPassport.status, "pass");
assert.deepEqual(
  validExperiment.integrityPassport.experimentIntake.registeredExperimentIds,
  ["EXP-1"],
);

const declaredWithoutRecords = await runFeynmanResearch(
  "audit",
  "missing experiment provenance fixture",
  fixtureDeps(["EXP-1"]),
  parseFeynmanResearchIntegrityInput({
    experimentIntakeDeclaration: "experiments_declared",
  }),
);
assert.equal(declaredWithoutRecords.claims[0]?.verdict, "unverifiable");
assert.equal(declaredWithoutRecords.integrityPassport.status, "blocked");
assert.ok(
  declaredWithoutRecords.integrityPassport.issues.some(
    (issue) => issue.code === "experiment_provenance_missing",
  ),
);

const declarationConflict = await runFeynmanResearch(
  "audit",
  "no experiments conflict fixture",
  fixtureDeps(["EXP-1"]),
  noExperiments,
);
assert.equal(declarationConflict.claims[0]?.verdict, "unverifiable");
assert.equal(declarationConflict.integrityPassport.status, "blocked");
assert.ok(
  declarationConflict.integrityPassport.issues.some(
    (issue) => issue.code === "experiment_claim_declaration_conflict",
  ),
);

const unknownExperiment = await runFeynmanResearch(
  "audit",
  "unknown experiment fixture",
  fixtureDeps(["EXP-2"]),
  declaredExperiment,
);
assert.equal(unknownExperiment.claims[0]?.verdict, "unverifiable");
assert.equal(unknownExperiment.integrityPassport.status, "blocked");
assert.ok(
  unknownExperiment.integrityPassport.issues.some(
    (issue) => issue.code === "experiment_provenance_unknown_id",
  ),
);

const invalidExperimentId = await runFeynmanResearch(
  "audit",
  "invalid experiment id fixture",
  fixtureDeps(["invalid experiment id"]),
  declaredExperiment,
);
assert.equal(invalidExperimentId.claims[0]?.verdict, "unverifiable");
assert.equal(invalidExperimentId.integrityPassport.status, "blocked");

const sourceMismatchDeps = fixtureDeps();
sourceMismatchDeps.verify = async () =>
  JSON.stringify({
    claims: [
      {
        id: "C1",
        claim: "The fixture preserves directly read source evidence.",
        sourceIds: ["S99"],
        experimentIds: [],
        verdict: "supported",
        rationale: "The model returned an unknown source ID.",
      },
    ],
  });
const sourceMismatch = await runFeynmanResearch(
  "audit",
  "unknown source fixture",
  sourceMismatchDeps,
  noExperiments,
);
assert.equal(sourceMismatch.claims[0]?.verdict, "unverifiable");
assert.equal(sourceMismatch.integrityPassport.status, "needs_review");
assert.ok(
  sourceMismatch.integrityPassport.issues.some(
    (issue) => issue.code === "claim_support_gap",
  ),
);

const degraded = await runFeynmanResearch(
  "deepresearch",
  "degraded integrity fixture",
  {
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
  },
  noExperiments,
);
assert.equal(degraded.integrityPassport.status, "blocked");
assert.ok(
  degraded.integrityPassport.issues.some(
    (issue) => issue.code === "no_direct_evidence",
  ),
);
assert.ok(
  degraded.integrityPassport.issues.some(
    (issue) => issue.code === "degraded_pipeline",
  ),
);

console.log(
  "ok feynman-research-integrity-runtime (pass, undeclared, declared, source mismatch, experiment mismatch, invalid-id, and degraded receipts)",
);
