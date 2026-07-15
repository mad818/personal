#!/usr/bin/env node
/* eslint-disable no-console */
import assert from "node:assert/strict";
import {
  FEYNMAN_WORKFLOW_CONTRACTS,
  getFeynmanWorkflowContract,
  renderFeynmanWorkflowContractForPrompt,
  renderFeynmanWorkflowContractForReport,
} from "../lib/feynmanWorkflowContracts.ts";
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

const expectedOutputModes = new Map([
  ["deepresearch", "Operator-grade source synthesis"],
  ["lit-review", "Literature evidence map"],
  ["review", "Peer review verdict"],
  ["audit", "Claim-to-code trace"],
  ["replicate", "Replication readiness"],
  ["recipe", "Implementation recipe"],
  ["compare", "Decision matrix"],
  ["draft", "Draft scaffold"],
  ["autoresearch", "Experiment loop proposal"],
  ["watch", "Watch cadence"],
]);

const seenWriterContracts = new Set();
const seenVerifierContracts = new Set();
const seenReviewerContracts = new Set();

const fixtureDeps = {
  searchPapers: async () => "Primary paper https://arxiv.org/abs/2602.13855",
  webSearch: async () =>
    "Official documentation https://example.com/docs and repository https://github.com/example/research",
  fetchUrl: async (url) =>
    `Directly read evidence from ${url}. The workflow contract is preserved in the report.`,
  write: async (prompt) => {
    assert.match(prompt, /WORKFLOW OUTPUT CONTRACT/);
    seenWriterContracts.add(prompt);
    return JSON.stringify({
      title: "Fixture workflow contract output",
      summary: "A source-grounded fixture summary.",
      synthesis: "The bounded workflow preserves source URLs [S1].",
      methodology: "Paper and web sources were read directly.",
      disagreements: "No fixture disagreement.",
      openQuestions: "How does this change with new evidence?",
      nextAction: "Review the workflow contract.",
      claims: [
        {
          claim: "The bounded workflow preserves source URLs.",
          sourceIds: ["S1"],
        },
      ],
    });
  },
  verify: async (prompt) => {
    assert.match(prompt, /WORKFLOW OUTPUT CONTRACT/);
    assert.match(prompt, /Verifier checks:/);
    seenVerifierContracts.add(prompt);
    return JSON.stringify({
      claims: [
        {
          id: "C1",
          claim: "The bounded workflow preserves source URLs.",
          sourceIds: ["S1"],
          verdict: "supported",
          rationale: "S1 was read directly.",
        },
      ],
    });
  },
  review: async (prompt) => {
    assert.match(prompt, /WORKFLOW OUTPUT CONTRACT/);
    assert.match(prompt, /approval boundary/i);
    seenReviewerContracts.add(prompt);
    return JSON.stringify({
      findings: [
        {
          severity: "minor",
          issue: "Fixture coverage is intentionally bounded.",
          recommendation: "Read more sources for production decisions.",
        },
      ],
    });
  },
};

assert.deepEqual(
  Object.keys(FEYNMAN_WORKFLOW_CONTRACTS).sort(),
  [...workflows].sort(),
);

for (const workflow of workflows) {
  const contract = getFeynmanWorkflowContract(workflow);
  assert.equal(contract.workflow, workflow);
  assert.ok(
    contract.requiredSections.length >= 5,
    `${workflow} needs sections`,
  );
  assert.ok(
    contract.acceptanceChecks.length >= 2,
    `${workflow} needs acceptance checks`,
  );
  assert.match(contract.approvalBoundary, /approval|operator|read-only/i);

  const promptContract = renderFeynmanWorkflowContractForPrompt(workflow);
  const reportContract = renderFeynmanWorkflowContractForReport(workflow);
  assert.match(promptContract, /Required sections:/);
  assert.match(promptContract, /Writer instructions:/);
  assert.match(promptContract, /Verifier checks:/);
  assert.match(promptContract, /Reviewer checks:/);
  assert.match(reportContract, /Acceptance checks:/);

  const expectedMode = expectedOutputModes.get(workflow);
  assert.equal(contract.outputMode, expectedMode);
  if (workflow !== "deepresearch") {
    assert.ok(
      contract.requiredSections.includes(expectedMode),
      `${workflow} must include its output mode as a required section`,
    );
  }

  const result = await runFeynmanResearch(
    workflow,
    `fixture ${workflow}`,
    fixtureDeps,
  );
  assert.ok(result.report.includes("## Workflow Contract"));
  assert.ok(result.report.includes(`- Output mode: ${contract.outputMode}`));
  assert.ok(result.report.includes(contract.approvalBoundary));
  for (const section of contract.requiredSections) {
    assert.ok(
      result.report.includes(section),
      `${workflow} report missing contract section ${section}`,
    );
  }
}

for (const workflow of ["replicate", "recipe", "autoresearch", "watch"]) {
  assert.match(
    getFeynmanWorkflowContract(workflow).approvalBoundary,
    /explicit operator approval/i,
  );
}

assert.equal(seenWriterContracts.size, workflows.length);
assert.equal(seenVerifierContracts.size, workflows.length);
assert.equal(seenReviewerContracts.size, workflows.length);

const degraded = await runFeynmanResearch("replicate", "fallback contract", {
  searchPapers: async () => "No papers found today.",
  webSearch: async () => "No results found.",
  fetchUrl: async () => "Could not fetch that URL.",
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
assert.match(degraded.report, /## Workflow Contract/);
assert.match(degraded.report, /Replication readiness/);
assert.match(degraded.report, /Explicit operator approval is required/);

console.log(
  "ok feynman-workflow-contracts-runtime (ten distinct contracts, three-stage injection, visible receipt, degraded fallback, explicit approval)",
);
