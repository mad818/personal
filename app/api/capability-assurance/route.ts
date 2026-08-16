import { NextRequest } from "next/server";
import {
  CAPABILITY_ASSURANCE_CONTRACTS,
  CAPABILITY_ASSURANCE_SCHEMA_VERSION,
  buildCapabilityAssuranceSnapshots,
  type CapabilityLearningProposal,
  type CapabilityOutcomeReceipt,
} from "@/lib/capabilityAssurance";
import {
  appendCapabilityOutcomeReceipt,
  readCapabilityAssuranceState,
  removeTemporaryQaCapabilityReceiptsWithProof,
  reviewStoredCapabilityLearning,
} from "@/lib/capabilityAssuranceStore";
import type { AssistantCapabilityId } from "@/lib/governanceCatalog";
import { protectedJson } from "@/lib/protectedApi";
import {
  applyRateLimitHeaders,
  checkRateLimit,
} from "@/lib/security/rateLimit";
import { applyProtectedActionHeaders } from "@/lib/security/protectedActionTelemetry";
import { requireStepUpForAction } from "@/lib/security/stepUpAuth";

const RATE_LIMIT = {
  bucket: "api-capability-assurance",
  windowMs: 60_000,
  maxAttempts: 60,
  includeBearerToken: false,
} as const;

const CAPABILITY_IDS = new Set(
  Object.keys(CAPABILITY_ASSURANCE_CONTRACTS) as AssistantCapabilityId[],
);

function rateLimit(req: NextRequest) {
  const state = checkRateLimit(req, RATE_LIMIT);
  if (state.ok) return null;
  const response = protectedJson(
    {
      ok: false,
      available: false,
      error: "Capability assurance is rate limited. Try again shortly.",
    },
    { status: 429 },
  );
  applyRateLimitHeaders(response, RATE_LIMIT, state.retryAfterSec);
  return response;
}

function parseCapabilityId(value: unknown): AssistantCapabilityId | null {
  return typeof value === "string" &&
    CAPABILITY_IDS.has(value as AssistantCapabilityId)
    ? (value as AssistantCapabilityId)
    : null;
}

function filterPayload(
  capabilityId: AssistantCapabilityId | null,
  receipts: CapabilityOutcomeReceipt[],
  proposals: CapabilityLearningProposal[],
) {
  return {
    contracts: capabilityId
      ? [CAPABILITY_ASSURANCE_CONTRACTS[capabilityId]]
      : Object.values(CAPABILITY_ASSURANCE_CONTRACTS),
    snapshots: buildCapabilityAssuranceSnapshots(receipts, proposals).filter(
      (entry) => !capabilityId || entry.capabilityId === capabilityId,
    ),
    recentReceipts: receipts
      .filter((entry) => !capabilityId || entry.capabilityId === capabilityId)
      .slice(0, 30),
    proposals: proposals
      .filter((entry) => !capabilityId || entry.capabilityId === capabilityId)
      .slice(0, 30),
  };
}

export async function GET(req: NextRequest) {
  const limited = rateLimit(req);
  if (limited) return limited;
  const requested = new URL(req.url).searchParams.get("capability");
  const capabilityId = requested ? parseCapabilityId(requested) : null;
  if (requested && !capabilityId) {
    return protectedJson(
      { ok: false, available: false, error: "Unknown capability." },
      { status: 400 },
    );
  }
  const result = await readCapabilityAssuranceState();
  if (!result.available) {
    return protectedJson(
      {
        ok: false,
        available: false,
        schemaVersion: CAPABILITY_ASSURANCE_SCHEMA_VERSION,
        error: result.error,
      },
      { status: 503 },
    );
  }
  return protectedJson({
    ok: true,
    available: true,
    schemaVersion: CAPABILITY_ASSURANCE_SCHEMA_VERSION,
    generatedAt: Date.now(),
    ...filterPayload(
      capabilityId,
      result.state.receipts,
      result.state.proposals,
    ),
  });
}

export async function POST(req: NextRequest) {
  const limited = rateLimit(req);
  if (limited) return limited;
  try {
    const body = (await req.json()) as {
      action?: unknown;
      receipt?: Partial<CapabilityOutcomeReceipt>;
      proposalId?: unknown;
      decision?: unknown;
      runId?: unknown;
      confirmation?: unknown;
    };
    if (body.action === "record_outcome") {
      const capabilityId = parseCapabilityId(body.receipt?.capabilityId);
      if (!capabilityId) {
        return protectedJson(
          { ok: false, available: false, error: "Unknown capability." },
          { status: 400 },
        );
      }
      const result = await appendCapabilityOutcomeReceipt({
        ...body.receipt,
        capabilityId,
        provenance: "client_reported",
        approvalGranted: false,
        proofSignature: null,
      });
      return protectedJson({
        ok: true,
        available: true,
        receipt: result.receipt,
        proposedLearningIds: result.proposals.map((entry) => entry.id),
      });
    }
    if (body.action === "review_learning") {
      if (
        typeof body.proposalId !== "string" ||
        !/^learning-[a-z0-9:-]{1,140}$/.test(body.proposalId) ||
        (body.decision !== "approve" && body.decision !== "reject")
      ) {
        return protectedJson(
          { ok: false, available: false, error: "Invalid learning review." },
          { status: 400 },
        );
      }
      const result = await reviewStoredCapabilityLearning(
        body.proposalId,
        body.decision,
      );
      return protectedJson({
        ok: true,
        available: true,
        proposal: result.proposal,
      });
    }
    if (body.action === "remove_temporary_qa_receipts") {
      const stepUpRequired = await requireStepUpForAction(req, {
        action: "settings_writes",
        capability: "mutate",
      });
      if (stepUpRequired) return stepUpRequired;
      if (body.confirmation !== "REMOVE_TEMPORARY_QA_RECEIPTS") {
        const response = protectedJson(
          {
            ok: false,
            available: false,
            error: "Explicit temporary QA cleanup confirmation is required.",
            protectedAction: {
              action: "settings_writes" as const,
              capability: "mutate" as const,
              status: "blocked_policy" as const,
              blockedReason: "explicit_confirmation_required",
            },
          },
          { status: 400 },
        );
        applyProtectedActionHeaders(response, {
          action: "settings_writes",
          capability: "mutate",
          status: "blocked_policy",
          blockedReason: "explicit_confirmation_required",
        });
        return response;
      }
      const result = await removeTemporaryQaCapabilityReceiptsWithProof(
        body.runId,
        process.env.NEXUS_EVIDENCE_KEY ?? "",
      );
      const protectedAction = {
        action: "settings_writes" as const,
        capability: "mutate" as const,
        status: "ready" as const,
      };
      const response = protectedJson({
        ok: true,
        available: true,
        cleanup: result,
        protectedAction,
      });
      applyProtectedActionHeaders(response, protectedAction);
      return response;
    }
    return protectedJson(
      { ok: false, available: false, error: "Unsupported assurance action." },
      { status: 400 },
    );
  } catch (error) {
    const message =
      error instanceof Error && error.message.length <= 180
        ? error.message
        : "Capability assurance request failed.";
    return protectedJson(
      { ok: false, available: false, error: message },
      { status: 400 },
    );
  }
}
