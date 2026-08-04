import { NextRequest } from "next/server";
import {
  CAPABILITY_ASSURANCE_CONTRACTS,
  type CapabilityFailureCode,
  type CapabilityOutcomeReceipt,
} from "@/lib/capabilityAssurance";
import {
  appendCapabilityOutcomeReceipt,
  readCapabilityAssuranceState,
} from "@/lib/capabilityAssuranceStore";
import type { LearningEntry } from "@/lib/agentLearnings";
import type { AgentId } from "@/components/home/office/types";
import type { AssistantCapabilityId } from "@/lib/governanceCatalog";
import { protectedJson } from "@/lib/protectedApi";
import {
  applyRateLimitHeaders,
  checkRateLimit,
} from "@/lib/security/rateLimit";

const RATE_LIMIT = {
  bucket: "api-agent-learnings-compatibility",
  windowMs: 60_000,
  maxAttempts: 30,
  includeBearerToken: false,
} as const;
const AGENTS = new Set<AgentId>(["jansky", "orbit", "nova", "cipher", "flux"]);
const CAPABILITY_IDS = new Set(
  Object.keys(CAPABILITY_ASSURANCE_CONTRACTS) as AssistantCapabilityId[],
);

function rateLimit(req: NextRequest) {
  const state = checkRateLimit(req, RATE_LIMIT);
  if (state.ok) return null;
  const response = protectedJson(
    { ok: false, available: false, error: "Learning evidence rate limited." },
    { status: 429 },
  );
  applyRateLimitHeaders(response, RATE_LIMIT, state.retryAfterSec);
  return response;
}

function toLearningEntry(
  proposal: Awaited<
    ReturnType<typeof readCapabilityAssuranceState>
  >["state"]["proposals"][number],
): LearningEntry {
  return {
    id: proposal.id,
    ts: proposal.reviewedAt ?? proposal.createdAt,
    agent: proposal.agent,
    category: "correction",
    queryType: "general",
    summary: proposal.lesson,
    proposedFix: proposal.lesson,
    applied: proposal.status === "approved",
    status: proposal.status,
    evidenceReceiptIds: proposal.evidenceReceiptIds,
    reinforcementCount: proposal.reinforcementCount,
    lastVerifiedAt: proposal.lastReinforcedAt,
  };
}

export async function GET(req: NextRequest) {
  const limited = rateLimit(req);
  if (limited) return limited;
  const params = new URL(req.url).searchParams;
  const requestedAgent = params.get("agent");
  const agent = requestedAgent as AgentId | null;
  if (agent && !AGENTS.has(agent)) {
    return protectedJson(
      { ok: false, available: false, error: "Invalid agent." },
      { status: 400 },
    );
  }
  const rawLimit = Number(params.get("limit") ?? 20);
  const limit = Number.isInteger(rawLimit)
    ? Math.min(50, Math.max(1, rawLimit))
    : 20;
  const result = await readCapabilityAssuranceState();
  if (!result.available) {
    return protectedJson(
      { ok: false, available: false, error: result.error },
      { status: 503 },
    );
  }
  const entries = result.state.proposals
    .filter((entry) => entry.status === "approved")
    .filter((entry) => !agent || entry.agent === agent)
    .sort(
      (left, right) =>
        (right.reviewedAt ?? right.createdAt) -
        (left.reviewedAt ?? left.createdAt),
    )
    .slice(0, limit)
    .map(toLearningEntry);
  return protectedJson({
    ok: true,
    available: true,
    entries,
    count: entries.length,
    source: "capability-assurance",
  });
}

export async function POST(req: NextRequest) {
  const limited = rateLimit(req);
  if (limited) return limited;
  try {
    const body = (await req.json()) as {
      agent?: unknown;
      capabilityId?: unknown;
      runId?: unknown;
      route?: unknown;
      outcome?: unknown;
      verificationPassed?: unknown;
      verificationRequired?: unknown;
      contextChars?: unknown;
      toolCount?: unknown;
      durationMs?: unknown;
      providerPosture?: unknown;
      dataState?: unknown;
      failureCode?: unknown;
    };
    const agent = AGENTS.has(body.agent as AgentId)
      ? (body.agent as AgentId)
      : "jansky";
    const capabilityId = CAPABILITY_IDS.has(
      body.capabilityId as AssistantCapabilityId,
    )
      ? (body.capabilityId as AssistantCapabilityId)
      : "conversation-general";
    const verificationPassed = Boolean(body.verificationPassed);
    const status: CapabilityOutcomeReceipt["status"] =
      body.outcome === "failure"
        ? "failed"
        : verificationPassed
          ? "verified"
          : "degraded";
    const failureCode =
      typeof body.failureCode === "string"
        ? (body.failureCode as CapabilityFailureCode)
        : status === "verified"
          ? null
          : "verification_failed";
    const result = await appendCapabilityOutcomeReceipt({
      capabilityId,
      agent,
      runId:
        typeof body.runId === "string" ? body.runId : `legacy-${Date.now()}`,
      route:
        typeof body.route === "string"
          ? body.route
          : CAPABILITY_ASSURANCE_CONTRACTS[capabilityId].defaultRoute,
      mode: "information",
      status,
      dataState:
        body.dataState === "live" ||
        body.dataState === "retained" ||
        body.dataState === "unavailable"
          ? body.dataState
          : "not_applicable",
      verificationRequired: Boolean(body.verificationRequired),
      verificationPassed,
      contextChars:
        typeof body.contextChars === "number" ? body.contextChars : 0,
      toolCount: typeof body.toolCount === "number" ? body.toolCount : 0,
      durationMs: typeof body.durationMs === "number" ? body.durationMs : 0,
      providerPosture:
        body.providerPosture === "local" ||
        body.providerPosture === "free_byok" ||
        body.providerPosture === "paid_byok"
          ? body.providerPosture
          : "unknown",
      failureCode,
      evidence: ["compatibility:agent-learnings"],
    });
    return protectedJson({
      ok: true,
      available: true,
      outcomeId: result.receipt.id,
      proposedLearningIds: result.proposals.map((entry) => entry.id),
    });
  } catch (error) {
    return protectedJson(
      {
        ok: false,
        available: false,
        error:
          error instanceof Error
            ? error.message.slice(0, 180)
            : "Learning evidence request failed.",
      },
      { status: 400 },
    );
  }
}
