#!/usr/bin/env node
/* eslint-disable no-console */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  CAPABILITY_ASSURANCE_CONTRACTS,
  CAPABILITY_EVIDENCE_MAX_AGE_MS,
  buildCapabilityAssuranceSnapshot,
  buildCapabilityLearningProposals,
  capabilityEvidenceWeight,
  createClientReportedCapabilityOutcomeReceipt,
  createCapabilityOutcomeReceipt,
  reviewCapabilityLearningProposal,
  selectStrongestSafeCapabilityAction,
} from "../lib/capabilityAssurance.ts";
import {
  CAPABILITY_QA_CLEANUP_RECEIPT_LIMIT,
  parseTemporaryQaRunId,
  removeTemporaryQaReceiptsFromState,
} from "../lib/capabilityAssuranceStore.ts";
import {
  signCapabilityProtectedActionReceipt,
  verifyCapabilityProtectedActionReceipt,
} from "../lib/capabilityProtectedActionReceipt.mjs";

const root = process.cwd();
const now = Date.UTC(2026, 7, 3, 12, 0, 0);

function read(relativePath) {
  const fullPath = path.join(root, relativePath);
  assert.ok(fs.existsSync(fullPath), `missing ${relativePath}`);
  return fs.readFileSync(fullPath, "utf8");
}

function requireText(content, expected, label) {
  assert.ok(content.includes(expected), `${label}: missing ${expected}`);
}

function receipt(overrides = {}) {
  const finishedAt = overrides.finishedAt ?? now;
  return createCapabilityOutcomeReceipt(
    {
      capabilityId: "conversation-general",
      agent: "jansky",
      runId: `proof-${finishedAt}-${overrides.status ?? "verified"}`,
      route: "/hq",
      mode: "information",
      status: "verified",
      dataState: "live",
      startedAt: finishedAt - 1_000,
      finishedAt,
      durationMs: 1_000,
      contextChars: 1_200,
      toolCount: 0,
      riskTier: "tier0",
      providerPosture: "local",
      verificationRequired: true,
      verificationPassed: true,
      evidence: ["verification:passed"],
      failureCode: null,
      ...overrides,
    },
    Math.max(now, finishedAt),
  );
}

const registry = read("lib/assistantCapabilityRegistry.ts");
const seedBlock = registry.match(
  /const ASSISTANT_CAPABILITY_SEEDS:[\s\S]*?\n\];/,
)?.[0];
assert.ok(seedBlock, "assistant capability seed registry must exist");
const registryIds = [...seedBlock.matchAll(/^\s{4}id: "([^"]+)",$/gm)].map(
  (match) => match[1],
);
const contractIds = Object.keys(CAPABILITY_ASSURANCE_CONTRACTS);
assert.deepEqual(
  [...contractIds].sort(),
  [...registryIds].sort(),
  "assurance contracts must cover every canonical assistant capability exactly",
);
assert.equal(new Set(contractIds).size, 13, "expected 13 unique contracts");

for (const contract of Object.values(CAPABILITY_ASSURANCE_CONTRACTS)) {
  assert.ok(
    contract.summary.trim(),
    `${contract.capabilityId} needs a summary`,
  );
  assert.ok(
    contract.defaultRoute.startsWith("/"),
    "default route must be local",
  );
  assert.ok(
    !contract.defaultRoute.startsWith("//"),
    "protocol-relative route denied",
  );
  assert.ok(
    contract.information.length > 0,
    `${contract.capabilityId} needs information contracts`,
  );
  assert.ok(
    contract.actions.length > 0,
    `${contract.capabilityId} needs action contracts`,
  );
  assert.ok(
    contract.efficiency.targetDurationMs > 0,
    "duration target required",
  );
  assert.ok(
    contract.efficiency.targetContextChars > 0,
    "context target required",
  );
  for (const product of contract.information) {
    assert.ok(product.description.trim(), `${product.id} needs a description`);
    assert.ok(product.source, `${product.id} needs a source`);
    assert.ok(product.freshness, `${product.id} needs freshness semantics`);
    assert.ok(
      product.failureSemantics,
      `${product.id} needs failure semantics`,
    );
  }
  for (const action of contract.actions) {
    assert.ok(
      action.route.startsWith("/"),
      `${action.id} must use a local route`,
    );
    assert.ok(
      !action.route.startsWith("//"),
      `${action.id} denied protocol-relative route`,
    );
    assert.ok(action.expectedEffect.trim(), `${action.id} needs an effect`);
    assert.ok(action.verification.trim(), `${action.id} needs verification`);
    assert.ok(action.recovery.trim(), `${action.id} needs recovery`);
    if (action.riskTier === "tier2") {
      assert.equal(
        action.approvalRequired,
        true,
        `${action.id} tier2 action needs approval`,
      );
    }
  }
}

const general = CAPABILITY_ASSURANCE_CONTRACTS["conversation-general"];
assert.equal(
  buildCapabilityAssuranceSnapshot(general, [], [], now).readiness,
  "unverified",
);

const verified = receipt();
assert.equal(
  buildCapabilityAssuranceSnapshot(general, [verified], [], now).readiness,
  "ready",
);

const failed = receipt({
  runId: "proof-failed",
  status: "failed",
  dataState: "not_applicable",
  verificationPassed: false,
  failureCode: "verification_failed",
  finishedAt: now + 1,
});
assert.equal(
  buildCapabilityAssuranceSnapshot(general, [failed, verified], [], now + 1)
    .readiness,
  "degraded",
);

const retained = receipt({
  runId: "proof-retained",
  status: "degraded",
  dataState: "retained",
  verificationPassed: false,
  failureCode: "provider_unavailable",
  finishedAt: now + 2,
});
assert.equal(
  buildCapabilityAssuranceSnapshot(general, [retained, verified], [], now + 2)
    .readiness,
  "retained",
);

const unavailable = receipt({
  runId: "proof-unavailable",
  status: "failed",
  dataState: "unavailable",
  verificationPassed: false,
  failureCode: "provider_unavailable",
  finishedAt: now + 3,
});
assert.equal(
  buildCapabilityAssuranceSnapshot(general, [unavailable], [], now + 3)
    .readiness,
  "unavailable",
);

const approval = receipt({
  runId: "proof-approval",
  status: "blocked",
  dataState: "not_applicable",
  verificationPassed: false,
  failureCode: "approval_required",
  finishedAt: now + 4,
});
assert.equal(
  buildCapabilityAssuranceSnapshot(general, [approval], [], now + 4).readiness,
  "approval_required",
);

assert.equal(
  capabilityEvidenceWeight(now - CAPABILITY_EVIDENCE_MAX_AGE_MS - 1, now),
  0,
);
assert.ok(capabilityEvidenceWeight(now - 1_000, now) > 0.99);

const expiredFinishedAt =
  now - CAPABILITY_EVIDENCE_MAX_AGE_MS - 24 * 60 * 60 * 1000;
const expiredVerified = {
  ...receipt({ runId: "proof-expired-verified" }),
  id: `receipt-proof-expired-verified-${expiredFinishedAt}`,
  startedAt: expiredFinishedAt - 1_000,
  finishedAt: expiredFinishedAt,
};
const expiredSnapshot = buildCapabilityAssuranceSnapshot(
  general,
  [expiredVerified],
  [],
  now,
);
assert.equal(
  expiredSnapshot.readiness,
  "degraded",
  "expired evidence must remain visible as degraded instead of silently reverting to unverified",
);
assert.match(expiredSnapshot.readinessReason, /expired/i);
assert.match(expiredSnapshot.readinessReason, /91 days old/i);
assert.equal(expiredSnapshot.evidenceWeight, 0);
assert.equal(expiredSnapshot.lastObservedAt, expiredVerified.finishedAt);
assert.equal(expiredSnapshot.lastVerifiedAt, expiredVerified.finishedAt);

const failureOne = receipt({
  runId: "repeat-one",
  status: "failed",
  verificationPassed: false,
  failureCode: "tool_failed",
  finishedAt: now - 10,
});
const failureTwo = receipt({
  runId: "repeat-two",
  status: "failed",
  verificationPassed: false,
  failureCode: "tool_failed",
  finishedAt: now - 5,
});
assert.equal(buildCapabilityLearningProposals([failureOne], [], now).length, 0);
const proposals = buildCapabilityLearningProposals(
  [failureTwo, failureOne],
  [],
  now,
);
assert.equal(
  proposals.length,
  1,
  "two matching failures should propose one lesson",
);
const approved = reviewCapabilityLearningProposal(
  proposals[0],
  "approve",
  [failureTwo, failureOne],
  now,
);
assert.equal(approved.status, "approved");
assert.equal(approved.reinforcementCount, 2);
assert.throws(
  () =>
    reviewCapabilityLearningProposal(
      approved,
      "approve",
      [failureTwo, failureOne],
      now,
    ),
  /Only proposed/,
);
assert.throws(
  () =>
    reviewCapabilityLearningProposal(
      proposals[0],
      "approve",
      [failureOne],
      now,
    ),
  /two current matching/,
);
assert.equal(
  reviewCapabilityLearningProposal(proposals[0], "reject", [], now).status,
  "rejected",
);

const temporaryQa = receipt({
  runId: "qa-protected-action-proof",
  finishedAt: now + 20,
});
const unrelatedReceipt = receipt({
  runId: "operator-production-proof",
  finishedAt: now + 21,
});
const unrelatedQaReceipt = receipt({
  runId: "qa-unrelated-proof",
  finishedAt: now + 22,
});
const signedServerProof = createCapabilityOutcomeReceipt(
  {
    capabilityId: "archive-continuity",
    agent: "jansky",
    runId: "qa-protected-action-proof",
    route: "/resources?view=system",
    mode: "action",
    actionId: "remove-temporary-qa-evidence",
    status: "verified",
    dataState: "not_applicable",
    startedAt: now + 23,
    finishedAt: now + 23,
    durationMs: 0,
    contextChars: 0,
    toolCount: 0,
    riskTier: "tier1",
    providerPosture: "local",
    verificationRequired: true,
    verificationPassed: true,
    evidence: ["protected-action:explicit-confirmation"],
    failureCode: null,
    provenance: "server_protected_action",
    approvalGranted: true,
  },
  now + 23,
);
signedServerProof.proofSignature = signCapabilityProtectedActionReceipt(
  signedServerProof,
  "fixture-private-evidence-key",
);
assert.equal(
  verifyCapabilityProtectedActionReceipt(
    signedServerProof,
    "fixture-private-evidence-key",
  ),
  true,
  "cleanup fixture must carry a valid server protected-action signature",
);
const cleanupState = {
  schemaVersion: temporaryQa.schemaVersion,
  receipts: [
    temporaryQa,
    signedServerProof,
    unrelatedReceipt,
    unrelatedQaReceipt,
  ],
  proposals,
};
const cleanup = removeTemporaryQaReceiptsFromState(
  cleanupState,
  "qa-protected-action-proof",
);
assert.equal(cleanup.removedReceiptCount, 1);
assert.equal(cleanup.remainingReceiptCount, 3);
assert.deepEqual(
  cleanup.state.receipts.map((entry) => entry.runId),
  [
    "qa-protected-action-proof",
    "operator-production-proof",
    "qa-unrelated-proof",
  ],
  "cleanup must preserve unrelated receipts in their original order",
);
assert.strictEqual(
  cleanup.state.receipts[0],
  signedServerProof,
  "cleanup must preserve the signed server protected-action proof for the same run",
);
assert.throws(
  () =>
    removeTemporaryQaReceiptsFromState(
      cleanup.state,
      "qa-protected-action-proof",
    ),
  /client-reported QA run receipt not found/,
  "repeated cleanup must fail once no eligible temporary client evidence remains",
);
assert.deepEqual(
  cleanup.state.proposals,
  cleanupState.proposals,
  "temporary receipt cleanup must not mutate learning proposals",
);
assert.strictEqual(
  cleanup.state.proposals,
  cleanupState.proposals,
  "cleanup must preserve the proposal collection unchanged",
);
assert.equal(
  cleanupState.receipts.length,
  4,
  "cleanup must not mutate the input evidence state",
);
assert.equal(
  parseTemporaryQaRunId("qa-protected-action-proof"),
  "qa-protected-action-proof",
);
for (const invalidRunId of [
  "operator-production-proof",
  "qa-*",
  " qa-protected-action-proof",
  "qa-protected-action-proof ",
  "qa-proof?all=true",
  "qa-",
]) {
  assert.equal(parseTemporaryQaRunId(invalidRunId), null);
  assert.throws(
    () => removeTemporaryQaReceiptsFromState(cleanupState, invalidRunId),
    /Invalid temporary QA run identifier/,
  );
}
assert.throws(
  () => removeTemporaryQaReceiptsFromState(cleanupState, "qa-not-found"),
  /not found/,
);
const overLimitState = {
  ...cleanupState,
  receipts: Array.from(
    { length: CAPABILITY_QA_CLEANUP_RECEIPT_LIMIT + 1 },
    (_, index) => ({
      ...temporaryQa,
      id: `receipt-qa-over-limit-${index}`,
      runId: "qa-over-limit",
      finishedAt: now + 30 + index,
    }),
  ),
};
assert.throws(
  () => removeTemporaryQaReceiptsFromState(overLimitState, "qa-over-limit"),
  /bounded cleanup limit/,
);
const serializedCleanup = JSON.stringify({
  runId: cleanup.runId,
  removedReceiptCount: cleanup.removedReceiptCount,
  remainingReceiptCount: cleanup.remainingReceiptCount,
  preservedProposalCount: cleanup.state.proposals.length,
});
assert.ok(!serializedCleanup.includes("prompt"));
assert.ok(!serializedCleanup.includes("answer"));

const selected = selectStrongestSafeCapabilityAction(general, "unverified");
assert.equal(selected.approvalRequired, false);
assert.equal(selected.riskTier, "tier0");
assert.equal(selected.localPreferred, true);

const serializedReceipt = JSON.stringify(
  createCapabilityOutcomeReceipt(
    {
      capabilityId: "conversation-general",
      runId: "privacy-proof",
      route: "https://malicious.example/escape",
      evidence: ["verification:passed", "raw secret content"],
      status: "verified",
      verificationPassed: true,
    },
    now,
  ),
);
assert.ok(
  !serializedReceipt.includes("prompt"),
  "receipts must not contain prompts",
);

const forgedClientReceipt = createClientReportedCapabilityOutcomeReceipt(
  {
    capabilityId: "archive-continuity",
    runId: "qa-forged-client-proof",
    mode: "action",
    actionId: "remove-temporary-qa-evidence",
    status: "verified",
    verificationRequired: true,
    verificationPassed: true,
    provenance: "server_protected_action",
    approvalGranted: true,
    proofSignature: "a".repeat(64),
  },
  now,
);
assert.equal(forgedClientReceipt.provenance, "client_reported");
assert.equal(forgedClientReceipt.approvalGranted, false);
assert.equal(forgedClientReceipt.proofSignature, null);
assert.equal(
  verifyCapabilityProtectedActionReceipt(
    forgedClientReceipt,
    "fixture-private-evidence-key",
  ),
  false,
);

const serverReceipt = createCapabilityOutcomeReceipt(
  {
    capabilityId: "archive-continuity",
    runId: "qa-server-proof",
    mode: "action",
    actionId: "remove-temporary-qa-evidence",
    status: "verified",
    verificationRequired: true,
    verificationPassed: true,
    provenance: "server_protected_action",
    approvalGranted: true,
  },
  now,
);
serverReceipt.proofSignature = signCapabilityProtectedActionReceipt(
  serverReceipt,
  "fixture-private-evidence-key",
);
assert.equal(
  verifyCapabilityProtectedActionReceipt(
    serverReceipt,
    "fixture-private-evidence-key",
  ),
  true,
);
assert.ok(
  !serializedReceipt.includes("answer"),
  "receipts must not contain answers",
);
assert.ok(
  !serializedReceipt.includes("query"),
  "receipts must not contain queries",
);
assert.ok(
  !serializedReceipt.includes("malicious.example"),
  "external receipt routes must be rejected",
);

const assuranceRoute = read("app/api/capability-assurance/route.ts");
const compatibilityRoute = read("app/api/agent-learnings/route.ts");
const store = read("lib/capabilityAssuranceStore.ts");
const agent = read("lib/agent.ts");
const panel = read("components/ui/CapabilityAssurancePanel.tsx");
const routePolicy = read("lib/security/routePolicy.ts");
const browserOpsRoute = read("app/api/recon/status/route.ts");
const forecastHook = read("hooks/useForecastEvalReadiness.ts");
const schedulerHook = read("hooks/useSchedulerEfficiencyReadiness.ts");
const forecastCard = read("components/alpha/ForecastLabCard.tsx");
const gitignore = read(".gitignore");
const packageJson = JSON.parse(read("package.json"));

requireText(
  assuranceRoute,
  'body.action === "record_outcome"',
  "record outcome API",
);
requireText(
  assuranceRoute,
  'body.action === "review_learning"',
  "learning review API",
);
requireText(
  assuranceRoute,
  'body.action === "remove_temporary_qa_receipts"',
  "temporary QA cleanup API",
);
requireText(
  assuranceRoute,
  'body.confirmation !== "REMOVE_TEMPORARY_QA_RECEIPTS"',
  "explicit QA cleanup confirmation",
);
requireText(
  assuranceRoute,
  'action: "settings_writes"',
  "step-up protected QA cleanup",
);
requireText(
  compatibilityRoute,
  'entry.status === "approved"',
  "approved learning boundary",
);
requireText(
  store.replace(/\s+/g, " "),
  '"data", "capability-assurance"',
  "fixed local evidence root",
);
requireText(store, "assertContainedPath", "contained evidence storage");
requireText(
  store,
  "removeTemporaryQaReceiptsFromState",
  "exact-run temporary QA cleanup",
);
requireText(agent, 'action: "record_outcome"', "run receipt integration");
requireText(
  panel,
  "Existing verified evidence remains visible",
  "retained UI failure semantics",
);
requireText(
  panel,
  "Only evidence-linked proposals can be reviewed",
  "approval UI boundary",
);
requireText(
  routePolicy,
  '"/api/capability-assurance"',
  "protected assurance route",
);
requireText(
  browserOpsRoute,
  "buildBrowserOpsReadinessSnapshot",
  "browser readiness route",
);
requireText(
  forecastHook,
  "/api/metrics/runtime-eval?limit=",
  "owned forecast envelope",
);
requireText(
  schedulerHook,
  "/api/metrics/runtime-eval?limit=",
  "owned scheduler envelope",
);
assert.ok(
  !forecastHook.includes("/api/metrics/runtime-eval/forecast"),
  "forecast readiness must not call an absent route",
);
assert.ok(
  !schedulerHook.includes("/api/metrics/runtime-eval/scheduler-efficiency"),
  "scheduler readiness must not call an absent route",
);
assert.ok(
  !forecastCard.includes("/api/metrics/runtime-eval/forecast/run"),
  "forecast UI must not offer an absent action",
);
requireText(
  gitignore,
  "data/capability-assurance/",
  "private local evidence ignore",
);
assert.ok(
  packageJson.scripts?.["capability:assurance:check"],
  "missing assurance gate",
);
assert.ok(
  String(
    packageJson.scripts?.["agent-platform:readiness:check"] ?? "",
  ).includes("capability:assurance:check"),
  "agent platform gate must include assurance gate",
);
assert.ok(
  String(packageJson.scripts.verify ?? "").includes(
    "agent-platform:readiness:check",
  ),
  "canonical verify must include the agent platform gate",
);

for (const mount of [
  ["app/command/page.tsx", "command-capability-assurance"],
  ["app/skills/page.tsx", "Learning from verified outcomes"],
  [
    "components/resources/SurfaceCapabilitiesConsole.tsx",
    "Capability truth manual",
  ],
]) {
  requireText(read(mount[0]), mount[1], `${mount[0]} assurance mount`);
}

console.log(
  `ok capability assurance (${contractIds.length} contracts, 6 readiness states, approval-gated reinforcement)`,
);
