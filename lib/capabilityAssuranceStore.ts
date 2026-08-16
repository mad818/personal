import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { signCapabilityProtectedActionReceipt } from "./capabilityProtectedActionReceipt.mjs";
import {
  CAPABILITY_ASSURANCE_CONTRACTS,
  CAPABILITY_ASSURANCE_SCHEMA_VERSION,
  CAPABILITY_PROPOSAL_LIMIT,
  CAPABILITY_RECEIPT_LIMIT,
  buildCapabilityLearningProposals,
  createClientReportedCapabilityOutcomeReceipt,
  createCapabilityOutcomeReceipt,
  emptyCapabilityAssuranceState,
  reviewCapabilityLearningProposal,
  type CapabilityAssuranceState,
  type CapabilityLearningProposal,
  type CapabilityOutcomeReceipt,
} from "./capabilityAssurance.ts";

const CAPABILITY_IDS = new Set(Object.keys(CAPABILITY_ASSURANCE_CONTRACTS));
const AGENT_IDS = new Set(["jansky", "orbit", "nova", "cipher", "flux"]);
const FAILURE_CODES = new Set([
  "approval_required",
  "contract_mismatch",
  "provider_unavailable",
  "prerequisite_unavailable",
  "tool_failed",
  "verification_failed",
  "unknown",
]);

const DATA_ROOT = path.resolve(process.cwd(), "data", "capability-assurance");
const STATE_PATH = path.resolve(DATA_ROOT, "state.json");
const TEMP_PATH = path.resolve(DATA_ROOT, `.state-${process.pid}.tmp`);

export const CAPABILITY_QA_CLEANUP_RECEIPT_LIMIT = 8;

let writeQueue = Promise.resolve();

export interface CapabilityAssuranceReadResult {
  available: boolean;
  state: CapabilityAssuranceState;
  error: string | null;
}

function assertContainedPath(candidate: string) {
  const relative = path.relative(DATA_ROOT, path.resolve(candidate));
  if (
    relative === ".." ||
    relative.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relative)
  ) {
    throw new Error("Capability assurance path escaped its local data root.");
  }
  return candidate;
}

function normalizeProposal(value: unknown): CapabilityLearningProposal | null {
  if (!value || typeof value !== "object") return null;
  const input = value as Partial<CapabilityLearningProposal>;
  if (
    input.schemaVersion !== CAPABILITY_ASSURANCE_SCHEMA_VERSION ||
    typeof input.id !== "string" ||
    !/^learning-[a-z0-9:-]{1,140}$/.test(input.id) ||
    typeof input.capabilityId !== "string" ||
    !CAPABILITY_IDS.has(input.capabilityId) ||
    typeof input.agent !== "string" ||
    !AGENT_IDS.has(input.agent) ||
    typeof input.failureCode !== "string" ||
    !FAILURE_CODES.has(input.failureCode) ||
    typeof input.lesson !== "string" ||
    !Array.isArray(input.evidenceReceiptIds) ||
    !["proposed", "approved", "rejected"].includes(input.status ?? "") ||
    typeof input.createdAt !== "number" ||
    !Number.isFinite(input.createdAt) ||
    typeof input.lastReinforcedAt !== "number" ||
    !Number.isFinite(input.lastReinforcedAt) ||
    typeof input.reinforcementCount !== "number" ||
    !Number.isFinite(input.reinforcementCount)
  ) {
    return null;
  }
  return {
    ...(input as CapabilityLearningProposal),
    id: input.id.slice(0, 160),
    lesson: input.lesson.trim().slice(0, 240),
    evidenceReceiptIds: input.evidenceReceiptIds
      .filter((entry): entry is string => typeof entry === "string")
      .map((entry) => entry.slice(0, 160))
      .slice(0, 8),
    reviewedAt:
      typeof input.reviewedAt === "number" && Number.isFinite(input.reviewedAt)
        ? input.reviewedAt
        : null,
    reinforcementCount: Math.max(
      0,
      Math.min(1000, Math.round(input.reinforcementCount)),
    ),
  };
}

function normalizeState(value: unknown): CapabilityAssuranceState | null {
  if (!value || typeof value !== "object") return null;
  const input = value as Partial<CapabilityAssuranceState>;
  if (
    input.schemaVersion !== CAPABILITY_ASSURANCE_SCHEMA_VERSION ||
    !Array.isArray(input.receipts) ||
    !Array.isArray(input.proposals)
  ) {
    return null;
  }
  const receipts: CapabilityOutcomeReceipt[] = [];
  for (const candidate of input.receipts.slice(0, CAPABILITY_RECEIPT_LIMIT)) {
    try {
      const raw = candidate as CapabilityOutcomeReceipt;
      if (
        typeof raw.finishedAt !== "number" ||
        !Number.isFinite(raw.finishedAt) ||
        raw.finishedAt <= 0 ||
        raw.finishedAt > Date.now() + 5 * 60 * 1000
      ) {
        continue;
      }
      receipts.push(createCapabilityOutcomeReceipt(raw, raw.finishedAt));
    } catch {
      // A malformed receipt cannot enter readiness or reinforcement evidence.
    }
  }
  const proposals = input.proposals
    .map(normalizeProposal)
    .filter((entry): entry is CapabilityLearningProposal => Boolean(entry))
    .slice(0, CAPABILITY_PROPOSAL_LIMIT);
  return {
    schemaVersion: CAPABILITY_ASSURANCE_SCHEMA_VERSION,
    receipts,
    proposals,
  };
}

export async function readCapabilityAssuranceState(): Promise<CapabilityAssuranceReadResult> {
  try {
    const raw = await readFile(assertContainedPath(STATE_PATH), "utf8");
    const normalized = normalizeState(JSON.parse(raw));
    if (!normalized) {
      return {
        available: false,
        state: emptyCapabilityAssuranceState(),
        error:
          "Capability assurance evidence is unreadable and was not replaced.",
      };
    }
    return { available: true, state: normalized, error: null };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return {
        available: true,
        state: emptyCapabilityAssuranceState(),
        error: null,
      };
    }
    return {
      available: false,
      state: emptyCapabilityAssuranceState(),
      error: "Capability assurance evidence is unavailable.",
    };
  }
}

async function writeState(state: CapabilityAssuranceState) {
  await mkdir(assertContainedPath(DATA_ROOT), { recursive: true });
  const body = `${JSON.stringify(state, null, 2)}\n`;
  await writeFile(assertContainedPath(TEMP_PATH), body, {
    encoding: "utf8",
    flag: "w",
  });
  await rename(assertContainedPath(TEMP_PATH), assertContainedPath(STATE_PATH));
}

function withWriteLock<T>(operation: () => Promise<T>): Promise<T> {
  const result = writeQueue.then(operation, operation);
  writeQueue = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

export function parseTemporaryQaRunId(value: unknown): string | null {
  if (typeof value !== "string" || value !== value.trim()) return null;
  return /^qa-[a-zA-Z0-9._:-]{1,92}$/.test(value) ? value : null;
}

export function removeTemporaryQaReceiptsFromState(
  state: CapabilityAssuranceState,
  runIdInput: unknown,
) {
  const runId = parseTemporaryQaRunId(runIdInput);
  if (!runId) {
    throw new Error("Invalid temporary QA run identifier.");
  }
  const removedReceiptCount = state.receipts.filter(
    (entry) => entry.runId === runId && entry.provenance === "client_reported",
  ).length;
  if (removedReceiptCount === 0) {
    throw new Error("Temporary client-reported QA run receipt not found.");
  }
  if (removedReceiptCount > CAPABILITY_QA_CLEANUP_RECEIPT_LIMIT) {
    throw new Error("Temporary QA run exceeds the bounded cleanup limit.");
  }
  const receipts = state.receipts.filter(
    (entry) => entry.runId !== runId || entry.provenance !== "client_reported",
  );
  return {
    runId,
    removedReceiptCount,
    remainingReceiptCount: receipts.length,
    state: {
      ...state,
      receipts,
      proposals: state.proposals,
    } satisfies CapabilityAssuranceState,
  };
}

export function appendCapabilityOutcomeReceipt(
  input: Partial<CapabilityOutcomeReceipt> & {
    capabilityId: CapabilityOutcomeReceipt["capabilityId"];
  },
) {
  return withWriteLock(async () => {
    const current = await readCapabilityAssuranceState();
    if (!current.available) {
      throw new Error(
        current.error ?? "Capability assurance evidence unavailable.",
      );
    }
    const receipt = createClientReportedCapabilityOutcomeReceipt(input);
    const receipts = [
      receipt,
      ...current.state.receipts.filter((entry) => entry.id !== receipt.id),
    ].slice(0, CAPABILITY_RECEIPT_LIMIT);
    const newProposals = buildCapabilityLearningProposals(
      receipts,
      current.state.proposals,
    );
    const proposals = [...newProposals, ...current.state.proposals].slice(
      0,
      CAPABILITY_PROPOSAL_LIMIT,
    );
    const next: CapabilityAssuranceState = {
      schemaVersion: CAPABILITY_ASSURANCE_SCHEMA_VERSION,
      receipts,
      proposals,
    };
    await writeState(next);
    return { receipt, proposals: newProposals, state: next };
  });
}

export function reviewStoredCapabilityLearning(
  proposalId: string,
  decision: "approve" | "reject",
) {
  return withWriteLock(async () => {
    const current = await readCapabilityAssuranceState();
    if (!current.available) {
      throw new Error(
        current.error ?? "Capability assurance evidence unavailable.",
      );
    }
    const index = current.state.proposals.findIndex(
      (entry) => entry.id === proposalId,
    );
    if (index < 0) throw new Error("Capability learning proposal not found.");
    const reviewed = reviewCapabilityLearningProposal(
      current.state.proposals[index],
      decision,
      current.state.receipts,
    );
    const proposals = [...current.state.proposals];
    proposals[index] = reviewed;
    const next: CapabilityAssuranceState = {
      ...current.state,
      proposals,
    };
    await writeState(next);
    return { proposal: reviewed, state: next };
  });
}

export function removeTemporaryQaCapabilityReceipts(runId: unknown) {
  return withWriteLock(async () => {
    const current = await readCapabilityAssuranceState();
    if (!current.available) {
      throw new Error(
        current.error ?? "Capability assurance evidence unavailable.",
      );
    }
    const result = removeTemporaryQaReceiptsFromState(current.state, runId);
    await writeState(result.state);
    return {
      runId: result.runId,
      removedReceiptCount: result.removedReceiptCount,
      remainingReceiptCount: result.remainingReceiptCount,
      preservedProposalCount: result.state.proposals.length,
    };
  });
}

export function removeTemporaryQaCapabilityReceiptsWithProof(
  runId: unknown,
  evidenceKey: string,
) {
  return withWriteLock(async () => {
    if (typeof evidenceKey !== "string" || evidenceKey.length < 16) {
      throw new Error(
        "A private evidence key is required for protected-action proof.",
      );
    }
    const current = await readCapabilityAssuranceState();
    if (!current.available) {
      throw new Error(
        current.error ?? "Capability assurance evidence unavailable.",
      );
    }
    const cleanup = removeTemporaryQaReceiptsFromState(current.state, runId);
    const finishedAt = Date.now();
    const unsignedReceipt = createCapabilityOutcomeReceipt(
      {
        capabilityId: "archive-continuity",
        agent: "jansky",
        runId: cleanup.runId,
        route: "/resources?view=system",
        mode: "action",
        actionId: "remove-temporary-qa-evidence",
        status: "verified",
        dataState: "not_applicable",
        startedAt: finishedAt,
        finishedAt,
        durationMs: 0,
        contextChars: 0,
        toolCount: 0,
        riskTier: "tier1",
        providerPosture: "local",
        verificationRequired: true,
        verificationPassed: true,
        evidence: [
          "protected-action:desktop-step-up",
          "protected-action:explicit-confirmation",
          "cleanup:exact-run",
        ],
        failureCode: null,
        provenance: "server_protected_action",
        approvalGranted: true,
      },
      finishedAt,
    );
    const proofReceipt: CapabilityOutcomeReceipt = {
      ...unsignedReceipt,
      proofSignature: signCapabilityProtectedActionReceipt(
        unsignedReceipt,
        evidenceKey,
      ),
    };
    const next: CapabilityAssuranceState = {
      schemaVersion: CAPABILITY_ASSURANCE_SCHEMA_VERSION,
      receipts: [proofReceipt, ...cleanup.state.receipts].slice(
        0,
        CAPABILITY_RECEIPT_LIMIT,
      ),
      proposals: cleanup.state.proposals,
    };
    await writeState(next);
    return {
      runId: cleanup.runId,
      removedReceiptCount: cleanup.removedReceiptCount,
      remainingReceiptCount: next.receipts.length,
      preservedProposalCount: next.proposals.length,
      proofReceiptId: proofReceipt.id,
    };
  });
}

export const CAPABILITY_ASSURANCE_STORAGE = {
  schemaVersion: CAPABILITY_ASSURANCE_SCHEMA_VERSION,
  relativeRoot: "data/capability-assurance",
  relativeStatePath: "data/capability-assurance/state.json",
  receiptLimit: CAPABILITY_RECEIPT_LIMIT,
  proposalLimit: CAPABILITY_PROPOSAL_LIMIT,
} as const;
