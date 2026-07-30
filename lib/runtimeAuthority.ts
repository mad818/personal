export type RuntimeAuthorityId =
  | "current_operator_request"
  | "live_code_and_verification"
  | "repo_governance"
  | "durable_project_context"
  | "historical_memory";

export type RuntimeLifecycleStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "cancelled"
  | "interrupted";

export type RuntimeHarnessProfileId =
  | "local_conservative"
  | "hosted_review_gated"
  | "compatibility_guarded";

export interface RuntimeAuthorityEntry {
  id: RuntimeAuthorityId;
  rank: number;
  label: string;
  rule: string;
}
export interface RuntimeProtectedInvariant {
  id: string;
  label: string;
  rule: string;
}

export interface RuntimeHarnessProfile {
  id: RuntimeHarnessProfileId;
  label: string;
  providerPosture: "local" | "hosted" | "compatibility";
  mutationPosture: "approval_required";
  evidencePosture: "required";
  maxConcurrentAgents: number;
}

export interface RuntimeContinuityReceipt {
  schemaVersion: 1;
  runId: string;
  status: RuntimeLifecycleStatus;
  harnessProfile: RuntimeHarnessProfileId;
  summary: string;
  changes: string[];
  evidence: string[];
  risks: string[];
  blockers: string[];
  verificationPassed: boolean;
  completedAt: string;
}

export const NEXUS_RUNTIME_AUTHORITY: readonly RuntimeAuthorityEntry[] = [
  {
    id: "current_operator_request",
    rank: 1,
    label: "Current operator request",
    rule: "Follow the operator's latest explicit request unless it conflicts with a protected invariant.",
  },
  {
    id: "live_code_and_verification",
    rank: 2,
    label: "Live code and verification",
    rule: "Treat current files, runtime behavior, and fresh verification evidence as the source of implementation truth.",
  },
  {
    id: "repo_governance",
    rank: 3,
    label: "Repository governance",
    rule: "Follow AGENTS.md, security rules, architecture rules, and task lessons.",
  },
  {
    id: "durable_project_context",
    rank: 4,
    label: "Durable project context",
    rule: "Use the canonical handoff, system state, feature specs, and active task plan.",
  },
  {
    id: "historical_memory",
    rank: 5,
    label: "Historical memory",
    rule: "Use older notes only when they do not conflict with fresher authority.",
  },
] as const;

export const NEXUS_PROTECTED_INVARIANTS: readonly RuntimeProtectedInvariant[] =
  [
    {
      id: "free-local",
      label: "Free and local first",
      rule: "Do not add Nexus-side charges, required subscriptions, or paid-provider defaults.",
    },
    {
      id: "approval-gated-mutation",
      label: "Approval-gated mutation",
      rule: "Treat high-risk writes and execution as review-required operations.",
    },
    {
      id: "provider-boundary",
      label: "Provider boundary",
      rule: "Route AI calls through the shared Nexus AI layer and never expose provider credentials.",
    },
    {
      id: "evidence-first-completion",
      label: "Evidence-first completion",
      rule: "Report summary, changes, evidence, risks, and blockers for completed work.",
    },
    {
      id: "verification-before-done",
      label: "Verification before done",
      rule: "Never claim completion without fresh verification evidence.",
    },
  ] as const;

export const RUNTIME_COMPLETION_SECTIONS = [
  "SUMMARY",
  "CHANGES",
  "EVIDENCE",
  "RISKS",
  "BLOCKERS",
] as const;

export const RUNTIME_HARNESS_PROFILES: readonly RuntimeHarnessProfile[] = [
  {
    id: "local_conservative",
    label: "Local conservative",
    providerPosture: "local",
    mutationPosture: "approval_required",
    evidencePosture: "required",
    maxConcurrentAgents: 3,
  },
  {
    id: "hosted_review_gated",
    label: "Hosted review gated",
    providerPosture: "hosted",
    mutationPosture: "approval_required",
    evidencePosture: "required",
    maxConcurrentAgents: 2,
  },
  {
    id: "compatibility_guarded",
    label: "Compatibility guarded",
    providerPosture: "compatibility",
    mutationPosture: "approval_required",
    evidencePosture: "required",
    maxConcurrentAgents: 1,
  },
] as const;

function normalizeList(values: string[], fallback: string) {
  const normalized = Array.from(
    new Set(values.map((value) => value.trim()).filter(Boolean)),
  );
  return normalized.length > 0 ? normalized : [fallback];
}

export function resolveRuntimeHarnessProfile(
  provider: string | null | undefined,
): RuntimeHarnessProfile {
  const normalized = provider?.trim().toLowerCase() ?? "";
  if (
    normalized.includes("ollama") ||
    normalized.includes("local") ||
    normalized.includes("vllm") ||
    normalized.includes("turboquant")
  ) {
    return RUNTIME_HARNESS_PROFILES[0];
  }
  if (
    normalized.includes("anthropic") ||
    normalized.includes("openai") ||
    normalized.includes("groq") ||
    normalized.includes("minimax") ||
    normalized.includes("cloud")
  ) {
    return RUNTIME_HARNESS_PROFILES[1];
  }
  return RUNTIME_HARNESS_PROFILES[2];
}

export function reconcileRuntimeLifecycle(input: {
  status: RuntimeLifecycleStatus;
  lastHeartbeatAt?: number | null;
  now?: number;
  staleAfterMs?: number;
}) {
  const now = input.now ?? Date.now();
  const staleAfterMs = Math.max(1_000, input.staleAfterMs ?? 90_000);
  const lastHeartbeatAt = input.lastHeartbeatAt ?? null;
  const stale =
    input.status === "running" &&
    (lastHeartbeatAt === null || now - lastHeartbeatAt > staleAfterMs);

  if (stale) {
    return {
      status: "interrupted" as const,
      stale: true,
      reason: "stale_heartbeat" as const,
    };
  }

  return {
    status: input.status,
    stale: false,
    reason: null,
  };
}

export function buildRuntimeAuthorityPromptBlock() {
  const authority = NEXUS_RUNTIME_AUTHORITY.map(
    (entry) => `${entry.rank}. ${entry.label}: ${entry.rule}`,
  ).join("\n");
  const invariants = NEXUS_PROTECTED_INVARIANTS.map(
    (entry) => `- ${entry.label}: ${entry.rule}`,
  ).join("\n");

  return `\n\n== RUNTIME AUTHORITY AND CONTINUITY ==\nAuthority order:\n${authority}\n\nProtected invariants:\n${invariants}\n\nCompletion contract: ${RUNTIME_COMPLETION_SECTIONS.join(", ")}.\nRunning work with a stale heartbeat is interrupted, never silently completed.\n== END RUNTIME AUTHORITY AND CONTINUITY ==`;
}

export function buildRuntimeContinuityReceipt(input: {
  runId: string;
  status: RuntimeLifecycleStatus;
  summary: string;
  changes: string[];
  evidence: string[];
  risks: string[];
  blockers: string[];
  provider?: string | null;
  verificationPassed: boolean;
  completedAt?: string;
}): RuntimeContinuityReceipt {
  return {
    schemaVersion: 1,
    runId: input.runId,
    status: input.status,
    harnessProfile: resolveRuntimeHarnessProfile(input.provider).id,
    summary: input.summary.trim() || "Runtime run completed without a summary.",
    changes: normalizeList(input.changes, "No project files changed."),
    evidence: normalizeList(
      input.evidence,
      "No verification evidence recorded.",
    ),
    risks: normalizeList(input.risks, "No elevated runtime risks recorded."),
    blockers: normalizeList(input.blockers, "No active blockers."),
    verificationPassed: input.verificationPassed,
    completedAt: input.completedAt ?? new Date().toISOString(),
  };
}
