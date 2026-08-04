import type {
  AssistantCapabilityId,
  GovernanceRiskTier,
} from "@/lib/governanceCatalog";

export const CAPABILITY_ASSURANCE_SCHEMA_VERSION =
  "capability-assurance.v1" as const;
export const CAPABILITY_CONTRACT_VERSION = 1 as const;
export const CAPABILITY_RECEIPT_LIMIT = 500;
export const CAPABILITY_PROPOSAL_LIMIT = 100;
export const CAPABILITY_EVIDENCE_MAX_AGE_MS = 90 * 24 * 60 * 60 * 1000;
export const CAPABILITY_EVIDENCE_HALF_LIFE_MS = 30 * 24 * 60 * 60 * 1000;

export type CapabilityReadinessState =
  | "unverified"
  | "ready"
  | "degraded"
  | "retained"
  | "unavailable"
  | "approval_required";

export type CapabilityInformationSource =
  | "session"
  | "local"
  | "protected_api"
  | "external_proxy";

export type CapabilityActionMode =
  | "navigate"
  | "prepare"
  | "propose"
  | "execute";

export type CapabilityOutcomeStatus =
  | "verified"
  | "degraded"
  | "failed"
  | "blocked";

export type CapabilityDataState =
  | "live"
  | "retained"
  | "unavailable"
  | "not_applicable";

export type CapabilityFailureCode =
  | "approval_required"
  | "contract_mismatch"
  | "provider_unavailable"
  | "prerequisite_unavailable"
  | "tool_failed"
  | "verification_failed"
  | "unknown";

export type CapabilityProviderPosture =
  | "local"
  | "free_byok"
  | "paid_byok"
  | "unknown";

export interface CapabilityInformationContract {
  id: string;
  label: string;
  description: string;
  source: CapabilityInformationSource;
  freshness: "live" | "session" | "durable";
  failureSemantics: "retain_verified" | "show_unavailable" | "show_unknown";
}

export interface CapabilityActionContract {
  id: string;
  label: string;
  description: string;
  mode: CapabilityActionMode;
  route: string;
  riskTier: GovernanceRiskTier;
  approvalRequired: boolean;
  localPreferred: boolean;
  prerequisites: readonly string[];
  expectedEffect: string;
  verification: string;
  recovery: string;
}

export interface CapabilityAssuranceContract {
  schemaVersion: typeof CAPABILITY_ASSURANCE_SCHEMA_VERSION;
  contractVersion: typeof CAPABILITY_CONTRACT_VERSION;
  capabilityId: AssistantCapabilityId;
  summary: string;
  defaultRoute: string;
  recoveryRoute: string;
  localFirst: boolean;
  efficiency: {
    targetDurationMs: number;
    targetContextChars: number;
    preferFreePath: boolean;
  };
  information: readonly CapabilityInformationContract[];
  actions: readonly CapabilityActionContract[];
}

export interface CapabilityOutcomeReceipt {
  schemaVersion: typeof CAPABILITY_ASSURANCE_SCHEMA_VERSION;
  id: string;
  runId: string;
  capabilityId: AssistantCapabilityId;
  agent: "jansky" | "orbit" | "nova" | "cipher" | "flux";
  route: string;
  mode: "information" | "action";
  actionId: string | null;
  status: CapabilityOutcomeStatus;
  dataState: CapabilityDataState;
  startedAt: number;
  finishedAt: number;
  durationMs: number;
  contextChars: number;
  toolCount: number;
  riskTier: GovernanceRiskTier;
  providerPosture: CapabilityProviderPosture;
  verificationRequired: boolean;
  verificationPassed: boolean;
  evidence: string[];
  failureCode: CapabilityFailureCode | null;
}

export interface CapabilityLearningProposal {
  schemaVersion: typeof CAPABILITY_ASSURANCE_SCHEMA_VERSION;
  id: string;
  capabilityId: AssistantCapabilityId;
  agent: CapabilityOutcomeReceipt["agent"];
  failureCode: CapabilityFailureCode;
  lesson: string;
  evidenceReceiptIds: string[];
  status: "proposed" | "approved" | "rejected";
  createdAt: number;
  reviewedAt: number | null;
  lastReinforcedAt: number;
  reinforcementCount: number;
}

export interface CapabilityAssuranceSnapshot {
  capabilityId: AssistantCapabilityId;
  readiness: CapabilityReadinessState;
  readinessReason: string;
  score: number;
  verifiedRuns: number;
  observedRuns: number;
  successRate: number | null;
  averageDurationMs: number | null;
  averageContextChars: number | null;
  lastObservedAt: number | null;
  lastVerifiedAt: number | null;
  knownWeakness: string | null;
  evidenceWeight: number;
  efficiencyPosture: "efficient" | "watch" | "unknown";
  strongestNextAction: CapabilityActionContract;
  approvedLearningCount: number;
  proposedLearningCount: number;
}

export interface CapabilityAssuranceState {
  schemaVersion: typeof CAPABILITY_ASSURANCE_SCHEMA_VERSION;
  receipts: CapabilityOutcomeReceipt[];
  proposals: CapabilityLearningProposal[];
}

const info = (
  id: string,
  label: string,
  description: string,
  source: CapabilityInformationSource,
  freshness: CapabilityInformationContract["freshness"],
  failureSemantics: CapabilityInformationContract["failureSemantics"],
): CapabilityInformationContract => ({
  id,
  label,
  description,
  source,
  freshness,
  failureSemantics,
});

const action = (
  id: string,
  label: string,
  description: string,
  mode: CapabilityActionMode,
  route: string,
  riskTier: GovernanceRiskTier,
  approvalRequired: boolean,
  localPreferred: boolean,
  prerequisites: readonly string[],
  expectedEffect: string,
  verification: string,
  recovery: string,
): CapabilityActionContract => ({
  id,
  label,
  description,
  mode,
  route,
  riskTier,
  approvalRequired,
  localPreferred,
  prerequisites,
  expectedEffect,
  verification,
  recovery,
});

const contract = (
  capabilityId: AssistantCapabilityId,
  summary: string,
  defaultRoute: string,
  recoveryRoute: string,
  information: readonly CapabilityInformationContract[],
  actions: readonly CapabilityActionContract[],
  targets: { durationMs: number; contextChars: number; localFirst?: boolean },
): CapabilityAssuranceContract => ({
  schemaVersion: CAPABILITY_ASSURANCE_SCHEMA_VERSION,
  contractVersion: CAPABILITY_CONTRACT_VERSION,
  capabilityId,
  summary,
  defaultRoute,
  recoveryRoute,
  localFirst: targets.localFirst ?? true,
  efficiency: {
    targetDurationMs: targets.durationMs,
    targetContextChars: targets.contextChars,
    preferFreePath: true,
  },
  information,
  actions,
});

export const CAPABILITY_ASSURANCE_CONTRACTS: Record<
  AssistantCapabilityId,
  CapabilityAssuranceContract
> = {
  "conversation-general": contract(
    "conversation-general",
    "Direct conversation grounded in the active session and approved context.",
    "/hq?focus=hq-chronicle",
    "/hq?focus=hq-chronicle",
    [
      info(
        "direct-answer",
        "Direct answer",
        "A bounded answer using the active request and approved local context.",
        "session",
        "session",
        "show_unknown",
      ),
    ],
    [
      action(
        "answer",
        "Answer in HQ",
        "Respond without inventing an execution or persistence claim.",
        "execute",
        "/hq?focus=hq-chronicle",
        "tier0",
        false,
        true,
        ["active operator request"],
        "A direct operator-visible response is produced.",
        "The response completes without a failed runtime receipt.",
        "Return to HQ Chronicle and retry with a narrower request.",
      ),
    ],
    { durationMs: 20_000, contextChars: 24_000 },
  ),
  "guided-learning": contract(
    "guided-learning",
    "Assistant-first teaching with compact checkpoints and memory-aware review.",
    "/skills?view=brain&focus=skills-brain",
    "/resources?view=study",
    [
      info(
        "learning-context",
        "Learning context",
        "Study goals, approved memory, and current checkpoints.",
        "local",
        "durable",
        "retain_verified",
      ),
    ],
    [
      action(
        "prepare-study-loop",
        "Prepare study loop",
        "Open a bounded tutor lane with one strongest continuation.",
        "prepare",
        "/skills?view=brain&focus=skills-brain",
        "tier0",
        false,
        true,
        ["learning objective"],
        "A review, explanation, quiz, or practice loop is prepared.",
        "The next checkpoint is explicit and answerable.",
        "Open the Resources study workbench for manual review.",
      ),
    ],
    { durationMs: 30_000, contextChars: 32_000 },
  ),
  "prompt-optimization": contract(
    "prompt-optimization",
    "Session-only prompt refinement that never executes or persists the result.",
    "/skills?view=prompts&focus=skills-prompt-forge",
    "/skills?view=prompts&focus=skills-prompt-forge",
    [
      info(
        "prompt-diagnosis",
        "Prompt diagnosis",
        "Ambiguity, missing context, constraints, and output-shape findings.",
        "session",
        "session",
        "show_unknown",
      ),
    ],
    [
      action(
        "prepare-prompt",
        "Prepare optimized prompt",
        "Produce a session-only prompt for operator review.",
        "prepare",
        "/skills?view=prompts&focus=skills-prompt-forge",
        "tier0",
        false,
        true,
        ["source request"],
        "A revised prompt is displayed without execution.",
        "The output preserves stated intent and boundaries.",
        "Keep the original request and discard the revision.",
      ),
    ],
    { durationMs: 15_000, contextChars: 18_000 },
  ),
  "memory-palace": contract(
    "memory-palace",
    "Citation-first local recall across approved memory compartments.",
    "/vault?focus=vault-memory-conversation",
    "/command?focus=memory-spine",
    [
      info(
        "memory-recall",
        "Memory recall",
        "Approved local memories with source and freshness cues.",
        "local",
        "durable",
        "retain_verified",
      ),
    ],
    [
      action(
        "open-recall",
        "Open exact recall",
        "Navigate to the citation-first memory lane.",
        "navigate",
        "/vault?focus=vault-memory-conversation",
        "tier0",
        false,
        true,
        ["local memory index"],
        "The exact recall surface opens.",
        "The route and cited memory source resolve.",
        "Open COMMAND Memory Spine status.",
      ),
    ],
    { durationMs: 12_000, contextChars: 20_000 },
  ),
  "product-navigation": contract(
    "product-navigation",
    "Exact-session routing through the canonical Nexus surface registry.",
    "/resources?view=surfaces",
    "/resources?view=surfaces",
    [
      info(
        "surface-map",
        "Surface map",
        "Canonical routes, best-use guidance, and exact destinations.",
        "local",
        "durable",
        "show_unavailable",
      ),
    ],
    [
      action(
        "open-exact-session",
        "Open exact session",
        "Navigate only to a registered same-origin Nexus destination.",
        "navigate",
        "/resources?view=surfaces",
        "tier0",
        false,
        true,
        ["registered route"],
        "The selected Nexus surface opens.",
        "The destination passes exact-session validation.",
        "Return to the Field Manual surface map.",
      ),
    ],
    { durationMs: 3_000, contextChars: 8_000 },
  ),
  "repo-engineering": contract(
    "repo-engineering",
    "Repository-grounded analysis and approval-gated engineering work.",
    "/hq?focus=hq-console-shell",
    "/resources?view=architecture",
    [
      info(
        "repo-context",
        "Repository context",
        "Current files, architecture, impact, ownership, and verification posture.",
        "local",
        "session",
        "show_unknown",
      ),
    ],
    [
      action(
        "propose-repo-change",
        "Propose repository change",
        "Stage a bounded edit for operator approval and verification.",
        "propose",
        "/hq?focus=hq-console-shell",
        "tier1",
        true,
        true,
        ["repository context", "impact review", "verification plan"],
        "A reviewable change proposal is produced.",
        "The approved change passes its focused and TypeScript gates.",
        "Reject the proposal or restore the prior verified state.",
      ),
    ],
    { durationMs: 120_000, contextChars: 64_000 },
  ),
  "live-markets": contract(
    "live-markets",
    "Evidence-separated market monitoring with no autonomous trading.",
    "/alpha",
    "/command?focus=provider-health",
    [
      info(
        "market-snapshot",
        "Market snapshot",
        "Normalized quotes, sentiment, rates, and source freshness.",
        "external_proxy",
        "live",
        "retain_verified",
      ),
    ],
    [
      action(
        "prepare-market-review",
        "Prepare market review",
        "Open an evidence-backed thesis or watch review without execution.",
        "prepare",
        "/alpha?focus=alpha-market-review",
        "tier1",
        false,
        true,
        ["verified market source or retained snapshot"],
        "A review with observed inputs and verify-next checks is prepared.",
        "Sources, freshness, and missing evidence remain visible.",
        "Open provider health and keep the last verified snapshot.",
      ),
    ],
    { durationMs: 25_000, contextChars: 28_000 },
  ),
  "live-news": contract(
    "live-news",
    "Fresh or explicitly retained news intelligence with source attribution.",
    "/intel?view=news&focus=intel-news",
    "/command?focus=provider-health",
    [
      info(
        "news-feed",
        "News feed",
        "Normalized records with source, publication time, and availability state.",
        "external_proxy",
        "live",
        "retain_verified",
      ),
    ],
    [
      action(
        "open-news-intel",
        "Open news intelligence",
        "Navigate to the current or retained news lane.",
        "navigate",
        "/intel?view=news&focus=intel-news",
        "tier0",
        false,
        true,
        ["verified record or explicit unavailable state"],
        "The news lane opens with truthful freshness posture.",
        "Records have valid source and time fields.",
        "Open provider health and retain prior verified records.",
      ),
    ],
    { durationMs: 15_000, contextChars: 22_000 },
  ),
  "live-cyber": contract(
    "live-cyber",
    "Passive-first cyber intelligence with evidence and guarded remediation.",
    "/cyber?focus=cyber-triage",
    "/command?focus=provider-health",
    [
      info(
        "cyber-findings",
        "Cyber findings",
        "Normalized CVE, IOC, and defensive posture with source confidence.",
        "external_proxy",
        "live",
        "retain_verified",
      ),
    ],
    [
      action(
        "propose-cyber-response",
        "Propose defensive response",
        "Prepare a passive remediation or containment plan for approval.",
        "propose",
        "/cyber?focus=cyber-triage",
        "tier2",
        true,
        true,
        ["defensive evidence", "authorized scope"],
        "A reviewable defensive action plan is produced.",
        "Evidence, scope, and verification steps are explicit.",
        "Keep the finding advisory-only and archive the evidence.",
      ),
    ],
    { durationMs: 35_000, contextChars: 36_000 },
  ),
  "archive-continuity": contract(
    "archive-continuity",
    "Durable local filing and exact reopen without silent promotion.",
    "/vault",
    "/vault?focus=vault-memory-spine",
    [
      info(
        "archive-state",
        "Archive state",
        "Saved artifacts, source references, tags, and exact reopen targets.",
        "local",
        "durable",
        "retain_verified",
      ),
    ],
    [
      action(
        "propose-archive-write",
        "Propose archive write",
        "Prepare a durable artifact with provenance for operator review.",
        "propose",
        "/vault",
        "tier1",
        true,
        true,
        ["source evidence", "output target"],
        "A source-traced archive artifact is proposed.",
        "The artifact reopens at an exact VAULT target.",
        "Reject the proposal and preserve the source unchanged.",
      ),
    ],
    { durationMs: 20_000, contextChars: 28_000 },
  ),
  "reverse-engineering": contract(
    "reverse-engineering",
    "Passive, local-first binary triage with explicit authorization boundaries.",
    "/recon?focus=recon-binary",
    "/vault",
    [
      info(
        "binary-triage",
        "Binary triage",
        "Local metadata, strings, entropy, hashes, and bounded IOC hints.",
        "local",
        "session",
        "show_unavailable",
      ),
    ],
    [
      action(
        "prepare-binary-review",
        "Prepare binary review",
        "Open a passive analysis lane without executing the sample.",
        "prepare",
        "/recon?focus=recon-binary",
        "tier2",
        true,
        true,
        ["operator-owned sample", "passive scope"],
        "A bounded passive triage plan is prepared.",
        "No sample execution or offensive follow-through occurs.",
        "Archive metadata only and stop the analysis.",
      ),
    ],
    { durationMs: 45_000, contextChars: 40_000 },
  ),
  "second-brain": contract(
    "second-brain",
    "Review-first local knowledge refinement with immutable source evidence.",
    "/vault?focus=vault-memory-spine",
    "/resources?view=study",
    [
      info(
        "knowledge-state",
        "Knowledge state",
        "Raw evidence, staged proposals, approved notes, and unresolved friction.",
        "local",
        "durable",
        "retain_verified",
      ),
    ],
    [
      action(
        "propose-knowledge-promotion",
        "Propose knowledge promotion",
        "Stage a source-traced note without promoting it automatically.",
        "propose",
        "/vault?focus=vault-memory-spine",
        "tier1",
        true,
        true,
        ["immutable source", "human review"],
        "A reviewable knowledge proposal is staged.",
        "Source identity and contradictions remain intact.",
        "Reject the proposal and keep raw evidence unchanged.",
      ),
    ],
    { durationMs: 30_000, contextChars: 36_000 },
  ),
  "scheduler-governance": contract(
    "scheduler-governance",
    "Visible, cooldown-limited recurring work with explicit approval posture.",
    "/hq?focus=hq-scheduler-governance",
    "/command?focus=runtime-efficiency",
    [
      info(
        "scheduler-state",
        "Scheduler state",
        "Jobs, cooldowns, last-run evidence, and approval policy.",
        "local",
        "durable",
        "show_unavailable",
      ),
    ],
    [
      action(
        "propose-schedule-change",
        "Propose schedule change",
        "Prepare a bounded recurring-work change for operator approval.",
        "propose",
        "/hq?focus=hq-scheduler-governance",
        "tier1",
        true,
        true,
        ["job contract", "cooldown", "approval policy"],
        "A reviewable scheduler change is prepared.",
        "The job remains bounded, visible, and cooldown-limited.",
        "Disable the proposal and preserve the prior schedule.",
      ),
    ],
    { durationMs: 12_000, contextChars: 20_000 },
  ),
};

const CAPABILITY_IDS = new Set<AssistantCapabilityId>(
  Object.keys(CAPABILITY_ASSURANCE_CONTRACTS) as AssistantCapabilityId[],
);
const AGENT_IDS = new Set<CapabilityOutcomeReceipt["agent"]>([
  "jansky",
  "orbit",
  "nova",
  "cipher",
  "flux",
]);
const STATUSES = new Set<CapabilityOutcomeStatus>([
  "verified",
  "degraded",
  "failed",
  "blocked",
]);
const DATA_STATES = new Set<CapabilityDataState>([
  "live",
  "retained",
  "unavailable",
  "not_applicable",
]);
const FAILURE_CODES = new Set<CapabilityFailureCode>([
  "approval_required",
  "contract_mismatch",
  "provider_unavailable",
  "prerequisite_unavailable",
  "tool_failed",
  "verification_failed",
  "unknown",
]);
const PROVIDER_POSTURES = new Set<CapabilityProviderPosture>([
  "local",
  "free_byok",
  "paid_byok",
  "unknown",
]);
const RISK_TIERS = new Set<GovernanceRiskTier>(["tier0", "tier1", "tier2"]);

function boundedInteger(value: unknown, min: number, max: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.round(value)));
}

function sanitizeEvidence(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => entry.trim().toLowerCase())
    .filter((entry) => /^[a-z0-9][a-z0-9:_-]{0,79}$/.test(entry))
    .slice(0, 12);
}

function sanitizeRoute(value: unknown, fallback: string) {
  if (typeof value !== "string") return fallback;
  const route = value.trim();
  if (!route.startsWith("/") || route.startsWith("//") || route.length > 180) {
    return fallback;
  }
  return route;
}

function sanitizeRunId(value: unknown, now: number) {
  if (typeof value !== "string") return `run-${now}`;
  const clean = value
    .trim()
    .replace(/[^a-zA-Z0-9._:-]/g, "")
    .slice(0, 96);
  return clean || `run-${now}`;
}

export function createCapabilityOutcomeReceipt(
  input: Partial<CapabilityOutcomeReceipt> & {
    capabilityId: AssistantCapabilityId;
  },
  now = Date.now(),
): CapabilityOutcomeReceipt {
  if (!CAPABILITY_IDS.has(input.capabilityId)) {
    throw new Error("Unknown capability assurance contract.");
  }
  const contractValue = CAPABILITY_ASSURANCE_CONTRACTS[input.capabilityId];
  const agent = AGENT_IDS.has(input.agent as CapabilityOutcomeReceipt["agent"])
    ? (input.agent as CapabilityOutcomeReceipt["agent"])
    : "jansky";
  const status = STATUSES.has(input.status as CapabilityOutcomeStatus)
    ? (input.status as CapabilityOutcomeStatus)
    : "failed";
  const dataState = DATA_STATES.has(input.dataState as CapabilityDataState)
    ? (input.dataState as CapabilityDataState)
    : "not_applicable";
  const startedAt = boundedInteger(
    input.startedAt,
    now - 24 * 60 * 60 * 1000,
    now,
  );
  const finishedAt = boundedInteger(input.finishedAt, startedAt, now);
  const runId = sanitizeRunId(input.runId, now);
  const failureCode = FAILURE_CODES.has(
    input.failureCode as CapabilityFailureCode,
  )
    ? (input.failureCode as CapabilityFailureCode)
    : status === "verified"
      ? null
      : "unknown";
  const providerPosture = PROVIDER_POSTURES.has(
    input.providerPosture as CapabilityProviderPosture,
  )
    ? (input.providerPosture as CapabilityProviderPosture)
    : "unknown";
  const riskTier = RISK_TIERS.has(input.riskTier as GovernanceRiskTier)
    ? (input.riskTier as GovernanceRiskTier)
    : (contractValue.actions[0]?.riskTier ?? "tier0");
  const mode = input.mode === "action" ? "action" : "information";
  const actionId =
    mode === "action" &&
    typeof input.actionId === "string" &&
    contractValue.actions.some((entry) => entry.id === input.actionId)
      ? input.actionId
      : null;
  const verificationRequired = Boolean(input.verificationRequired);
  const verificationPassed = verificationRequired
    ? Boolean(input.verificationPassed)
    : status === "verified";

  return {
    schemaVersion: CAPABILITY_ASSURANCE_SCHEMA_VERSION,
    id: `receipt-${runId}-${finishedAt}`.slice(0, 150),
    runId,
    capabilityId: input.capabilityId,
    agent,
    route: sanitizeRoute(input.route, contractValue.defaultRoute),
    mode,
    actionId,
    status,
    dataState,
    startedAt,
    finishedAt,
    durationMs: boundedInteger(
      input.durationMs ?? finishedAt - startedAt,
      0,
      24 * 60 * 60 * 1000,
    ),
    contextChars: boundedInteger(input.contextChars, 0, 1_000_000),
    toolCount: boundedInteger(input.toolCount, 0, 100),
    riskTier,
    providerPosture,
    verificationRequired,
    verificationPassed,
    evidence: sanitizeEvidence(input.evidence),
    failureCode,
  };
}

export function capabilityEvidenceWeight(timestamp: number, now = Date.now()) {
  const age = Math.max(0, now - timestamp);
  if (age > CAPABILITY_EVIDENCE_MAX_AGE_MS) return 0;
  return Math.pow(0.5, age / CAPABILITY_EVIDENCE_HALF_LIFE_MS);
}

function average(values: number[]) {
  if (values.length === 0) return null;
  return Math.round(
    values.reduce((sum, value) => sum + value, 0) / values.length,
  );
}

function failureSummary(code: CapabilityFailureCode | null) {
  const summaries: Record<CapabilityFailureCode, string> = {
    approval_required: "The strongest action still needs operator approval.",
    contract_mismatch:
      "Runtime evidence did not match the declared capability contract.",
    provider_unavailable: "The required provider path was unavailable.",
    prerequisite_unavailable: "A declared prerequisite was unavailable.",
    tool_failed: "A required tool did not complete successfully.",
    verification_failed: "The outcome did not pass its verification contract.",
    unknown: "The latest failure does not yet have a precise classification.",
  };
  return code ? summaries[code] : null;
}

function actionRank(
  value: CapabilityActionContract,
  readiness: CapabilityReadinessState,
) {
  let score = value.localPreferred ? 30 : 0;
  if (!value.approvalRequired) score += 24;
  if (value.riskTier === "tier0") score += 20;
  if (value.riskTier === "tier2") score -= 20;
  if (value.mode === "navigate") score += 16;
  if (value.mode === "prepare") score += 12;
  if (value.mode === "execute") score += readiness === "ready" ? 10 : -16;
  if (readiness === "approval_required" && value.approvalRequired) score += 10;
  if (readiness === "unavailable" && value.mode !== "navigate") score -= 30;
  return score;
}

export function selectStrongestSafeCapabilityAction(
  contractValue: CapabilityAssuranceContract,
  readiness: CapabilityReadinessState,
) {
  return [...contractValue.actions].sort(
    (left, right) =>
      actionRank(right, readiness) - actionRank(left, readiness) ||
      left.id.localeCompare(right.id),
  )[0];
}

export function buildCapabilityAssuranceSnapshot(
  contractValue: CapabilityAssuranceContract,
  receipts: readonly CapabilityOutcomeReceipt[],
  proposals: readonly CapabilityLearningProposal[] = [],
  now = Date.now(),
): CapabilityAssuranceSnapshot {
  const observed = receipts
    .filter((entry) => entry.capabilityId === contractValue.capabilityId)
    .filter((entry) => capabilityEvidenceWeight(entry.finishedAt, now) > 0)
    .sort((left, right) => right.finishedAt - left.finishedAt);
  const verified = observed.filter(
    (entry) => entry.status === "verified" && entry.verificationPassed,
  );
  const latest = observed[0] ?? null;
  const latestVerified = verified[0] ?? null;
  const failed = observed.filter(
    (entry) => entry.status === "failed" || entry.status === "degraded",
  );
  const evidenceWeight = Number(
    verified
      .reduce(
        (sum, entry) => sum + capabilityEvidenceWeight(entry.finishedAt, now),
        0,
      )
      .toFixed(2),
  );

  let readiness: CapabilityReadinessState = "unverified";
  let readinessReason =
    "No recent verified outcome exists for this capability.";
  if (
    latest?.status === "blocked" &&
    latest.failureCode === "approval_required"
  ) {
    readiness = "approval_required";
    readinessReason =
      "The next valid action is available only after operator approval.";
  } else if (latest?.dataState === "retained" && latestVerified) {
    readiness = "retained";
    readinessReason =
      "Current data is unavailable; the last verified evidence is retained.";
  } else if (
    latest?.dataState === "unavailable" ||
    latest?.failureCode === "prerequisite_unavailable" ||
    latest?.failureCode === "provider_unavailable"
  ) {
    readiness = latestVerified ? "degraded" : "unavailable";
    readinessReason = latestVerified
      ? "A prior verified outcome exists, but the current provider or prerequisite is unavailable."
      : "The current provider or prerequisite is unavailable and no retained proof exists.";
  } else if (
    latest &&
    (latest.status === "failed" ||
      latest.status === "degraded" ||
      (latest.verificationRequired && !latest.verificationPassed))
  ) {
    readiness = "degraded";
    readinessReason = "Recent execution or verification evidence is degraded.";
  } else if (evidenceWeight >= 0.5 && latestVerified) {
    readiness = "ready";
    readinessReason =
      "Recent verified evidence satisfies the capability contract.";
  }

  const successRate = observed.length
    ? Math.round((verified.length / observed.length) * 100)
    : null;
  const averageDurationMs = average(observed.map((entry) => entry.durationMs));
  const averageContextChars = average(
    observed.map((entry) => entry.contextChars),
  );
  const durationEfficient =
    averageDurationMs !== null &&
    averageDurationMs <= contractValue.efficiency.targetDurationMs;
  const contextEfficient =
    averageContextChars !== null &&
    averageContextChars <= contractValue.efficiency.targetContextChars;
  const efficiencyPosture =
    observed.length === 0
      ? "unknown"
      : durationEfficient && contextEfficient
        ? "efficient"
        : "watch";
  const score = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        evidenceWeight * 38 +
          (successRate ?? 0) * 0.42 +
          (efficiencyPosture === "efficient" ? 20 : 0) -
          failed.length * 8,
      ),
    ),
  );
  const relevantProposals = proposals.filter(
    (entry) => entry.capabilityId === contractValue.capabilityId,
  );

  return {
    capabilityId: contractValue.capabilityId,
    readiness,
    readinessReason,
    score,
    verifiedRuns: verified.length,
    observedRuns: observed.length,
    successRate,
    averageDurationMs,
    averageContextChars,
    lastObservedAt: latest?.finishedAt ?? null,
    lastVerifiedAt: latestVerified?.finishedAt ?? null,
    knownWeakness: failureSummary(latest?.failureCode ?? null),
    evidenceWeight,
    efficiencyPosture,
    strongestNextAction: selectStrongestSafeCapabilityAction(
      contractValue,
      readiness,
    ),
    approvedLearningCount: relevantProposals.filter(
      (entry) => entry.status === "approved",
    ).length,
    proposedLearningCount: relevantProposals.filter(
      (entry) => entry.status === "proposed",
    ).length,
  };
}

export function buildCapabilityAssuranceSnapshots(
  receipts: readonly CapabilityOutcomeReceipt[],
  proposals: readonly CapabilityLearningProposal[] = [],
  now = Date.now(),
) {
  return Object.values(CAPABILITY_ASSURANCE_CONTRACTS).map((entry) =>
    buildCapabilityAssuranceSnapshot(entry, receipts, proposals, now),
  );
}

function learningText(code: CapabilityFailureCode) {
  const lessons: Record<CapabilityFailureCode, string> = {
    approval_required:
      "Surface the approval boundary before attempting the protected action.",
    contract_mismatch:
      "Reconcile runtime behavior with the declared information and action contract before reuse.",
    provider_unavailable:
      "Prefer a ready local or retained path and display provider unavailability explicitly.",
    prerequisite_unavailable:
      "Check and display required prerequisites before presenting the capability as ready.",
    tool_failed:
      "Treat tool failure as a degraded outcome and offer the declared recovery path.",
    verification_failed:
      "Do not reinforce or claim success until the capability verification contract passes.",
    unknown:
      "Classify the failure precisely before allowing it to shape future capability behavior.",
  };
  return lessons[code];
}

export function buildCapabilityLearningProposals(
  receipts: readonly CapabilityOutcomeReceipt[],
  existing: readonly CapabilityLearningProposal[] = [],
  now = Date.now(),
) {
  const groups = new Map<string, CapabilityOutcomeReceipt[]>();
  for (const receipt of receipts) {
    if (!receipt.failureCode || receipt.status === "verified") continue;
    if (capabilityEvidenceWeight(receipt.finishedAt, now) === 0) continue;
    const key = `${receipt.capabilityId}:${receipt.failureCode}`;
    const current = groups.get(key) ?? [];
    current.push(receipt);
    groups.set(key, current);
  }

  const proposals: CapabilityLearningProposal[] = [];
  for (const [key, evidence] of groups) {
    if (evidence.length < 2) continue;
    if (existing.some((entry) => entry.id === `learning-${key}`)) continue;
    const newest = [...evidence].sort(
      (left, right) => right.finishedAt - left.finishedAt,
    );
    const first = newest[0];
    proposals.push({
      schemaVersion: CAPABILITY_ASSURANCE_SCHEMA_VERSION,
      id: `learning-${key}`,
      capabilityId: first.capabilityId,
      agent: first.agent,
      failureCode: first.failureCode ?? "unknown",
      lesson: learningText(first.failureCode ?? "unknown"),
      evidenceReceiptIds: newest.slice(0, 8).map((entry) => entry.id),
      status: "proposed",
      createdAt: now,
      reviewedAt: null,
      lastReinforcedAt: newest[0].finishedAt,
      reinforcementCount: newest.length,
    });
  }
  return proposals;
}

export function reviewCapabilityLearningProposal(
  proposal: CapabilityLearningProposal,
  decision: "approve" | "reject",
  receipts: readonly CapabilityOutcomeReceipt[],
  now = Date.now(),
): CapabilityLearningProposal {
  if (proposal.status !== "proposed") {
    throw new Error("Only proposed capability learnings can be reviewed.");
  }
  const evidence = receipts.filter((entry) =>
    proposal.evidenceReceiptIds.includes(entry.id),
  );
  const qualifying = evidence.filter(
    (entry) =>
      entry.capabilityId === proposal.capabilityId &&
      entry.failureCode === proposal.failureCode &&
      entry.status !== "verified" &&
      capabilityEvidenceWeight(entry.finishedAt, now) > 0,
  );
  if (decision === "approve" && qualifying.length < 2) {
    throw new Error(
      "Capability learning needs two current matching outcome receipts.",
    );
  }
  return {
    ...proposal,
    status: decision === "approve" ? "approved" : "rejected",
    reviewedAt: now,
    lastReinforcedAt:
      qualifying.reduce(
        (latest, entry) => Math.max(latest, entry.finishedAt),
        proposal.lastReinforcedAt,
      ) || proposal.lastReinforcedAt,
    reinforcementCount: Math.max(
      proposal.reinforcementCount,
      qualifying.length,
    ),
  };
}

export function emptyCapabilityAssuranceState(): CapabilityAssuranceState {
  return {
    schemaVersion: CAPABILITY_ASSURANCE_SCHEMA_VERSION,
    receipts: [],
    proposals: [],
  };
}
