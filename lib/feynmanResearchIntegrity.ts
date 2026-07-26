import type {
  FeynmanClaimAudit,
  FeynmanResearchResult,
  FeynmanReviewFinding,
  FeynmanSource,
  FeynmanWorkflowId,
} from "./feynmanResearch.ts";
import type { FeynmanProgressiveCoverage } from "./feynmanProgressiveResearch.ts";

export type FeynmanExperimentIntakeDeclaration =
  | "no_experiments_declared"
  | "experiments_declared";

export interface FeynmanExperimentProvenanceRecord {
  experimentId: string;
  objective: string;
  evidenceRefs: string[];
  plannedVsExecuted: string[];
  negativeResults: string[];
  knownLimitations: string[];
}

export interface FeynmanResearchIntegrityInput {
  experimentIntakeDeclaration?: FeynmanExperimentIntakeDeclaration;
  experimentProvenance: FeynmanExperimentProvenanceRecord[];
}

export type FeynmanIntegrityIssueSeverity = "blocking" | "review";

export interface FeynmanIntegrityIssue {
  code: string;
  severity: FeynmanIntegrityIssueSeverity;
  message: string;
}

export interface FeynmanResearchIntegrityPassport {
  version: 1;
  workflow: FeynmanWorkflowId;
  taskType: "open-ended" | "outcome-gradable";
  dataAccess: {
    level: "raw";
    operatorInput: "topic_or_artifact_reference";
    directlyReadEvidenceRequired: true;
    supportPolicy: "verified_direct_sources_only";
  };
  sources: {
    discovered: number;
    directlyRead: number;
    notRead: number;
    highConfidenceDirect: number;
  };
  claims: {
    total: number;
    supported: number;
    partial: number;
    conflicting: number;
    unsupported: number;
    unverifiable: number;
    experimentBacked: number;
  };
  experimentIntake: {
    declaration: FeynmanExperimentIntakeDeclaration | "undeclared";
    registeredExperimentIds: string[];
    provenanceRecords: number;
  };
  reproducibility: {
    posture: "recorded_not_replay_proof";
    contractVersion: "nexus-feynman-integrity-v1";
    replayGuarantee: false;
    queryWaves: number;
    evidenceThresholds: FeynmanProgressiveCoverage["thresholds"];
  };
  crossModel: {
    posture: "not_run";
    independentVerification: false;
  };
  issues: FeynmanIntegrityIssue[];
  status: "pass" | "needs_review" | "blocked";
}

const OUTCOME_GRADABLE_WORKFLOWS = new Set<FeynmanWorkflowId>([
  "review",
  "audit",
  "replicate",
  "autoresearch",
]);

const EXPERIMENT_ID_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;
const MAX_PROVENANCE_JSON_LENGTH = 24_000;
const MAX_EXPERIMENTS = 12;
const MAX_LIST_ITEMS = 12;
const MAX_TEXT_LENGTH = 600;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function cleanRequiredText(value: unknown, label: string) {
  if (typeof value !== "string") throw new Error(`${label} must be text.`);
  const cleaned = value.trim();
  if (!cleaned || cleaned.length > MAX_TEXT_LENGTH) {
    throw new Error(`${label} is invalid.`);
  }
  return cleaned;
}

function cleanStringList(value: unknown, label: string) {
  if (!Array.isArray(value) || value.length > MAX_LIST_ITEMS) {
    throw new Error(`${label} must be a bounded list.`);
  }
  return value.map((item, index) =>
    cleanRequiredText(item, `${label}[${index}]`),
  );
}

function parseExperimentRecord(
  value: unknown,
  index: number,
): FeynmanExperimentProvenanceRecord {
  if (!isRecord(value)) {
    throw new Error(`experimentProvenance[${index}] must be an object.`);
  }
  const experimentId = cleanRequiredText(
    value.experimentId,
    `experimentProvenance[${index}].experimentId`,
  );
  if (!EXPERIMENT_ID_RE.test(experimentId)) {
    throw new Error(`experimentProvenance[${index}].experimentId is invalid.`);
  }
  const evidenceRefs = cleanStringList(
    value.evidenceRefs,
    `experimentProvenance[${index}].evidenceRefs`,
  );
  if (evidenceRefs.length === 0) {
    throw new Error(
      `experimentProvenance[${index}].evidenceRefs requires evidence.`,
    );
  }
  return {
    experimentId,
    objective: cleanRequiredText(
      value.objective,
      `experimentProvenance[${index}].objective`,
    ),
    evidenceRefs,
    plannedVsExecuted: cleanStringList(
      value.plannedVsExecuted,
      `experimentProvenance[${index}].plannedVsExecuted`,
    ),
    negativeResults: cleanStringList(
      value.negativeResults,
      `experimentProvenance[${index}].negativeResults`,
    ),
    knownLimitations: cleanStringList(
      value.knownLimitations,
      `experimentProvenance[${index}].knownLimitations`,
    ),
  };
}

export function parseFeynmanResearchIntegrityInput(input: {
  experimentIntakeDeclaration?: string;
  experimentProvenanceJson?: string;
}): FeynmanResearchIntegrityInput {
  const declaration = input.experimentIntakeDeclaration?.trim();
  if (
    declaration &&
    declaration !== "no_experiments_declared" &&
    declaration !== "experiments_declared"
  ) {
    throw new Error("Experiment intake declaration is invalid.");
  }

  const rawJson = input.experimentProvenanceJson?.trim() ?? "";
  if (rawJson.length > MAX_PROVENANCE_JSON_LENGTH) {
    throw new Error("Experiment provenance payload is too large.");
  }

  let experimentProvenance: FeynmanExperimentProvenanceRecord[] = [];
  if (rawJson) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(rawJson);
    } catch {
      throw new Error("Experiment provenance payload is invalid JSON.");
    }
    if (!Array.isArray(parsed) || parsed.length > MAX_EXPERIMENTS) {
      throw new Error("Experiment provenance must be a bounded array.");
    }
    experimentProvenance = parsed.map(parseExperimentRecord);
    const ids = new Set(
      experimentProvenance.map((record) => record.experimentId),
    );
    if (ids.size !== experimentProvenance.length) {
      throw new Error("Experiment provenance IDs must be unique.");
    }
  }

  if (
    declaration === "no_experiments_declared" &&
    experimentProvenance.length
  ) {
    throw new Error(
      "Experiment provenance conflicts with the no-experiments declaration.",
    );
  }

  return {
    ...(declaration
      ? {
          experimentIntakeDeclaration:
            declaration as FeynmanExperimentIntakeDeclaration,
        }
      : {}),
    experimentProvenance,
  };
}

export function normalizeFeynmanExperimentIds(value: unknown) {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(
      value
        .map((item) => (typeof item === "string" ? item.trim() : ""))
        .filter(Boolean)
        .map((item) =>
          EXPERIMENT_ID_RE.test(item) ? item : "__invalid_experiment_id__",
        ),
    ),
  ).slice(0, 8);
}

function experimentClaimIssues(
  claims: FeynmanClaimAudit[],
  integrityInput: FeynmanResearchIntegrityInput,
) {
  const registeredIds = new Set(
    integrityInput.experimentProvenance.map((item) => item.experimentId),
  );
  const declaration =
    integrityInput.experimentIntakeDeclaration ?? "undeclared";
  const issues: FeynmanIntegrityIssue[] = [];
  const experimentClaims = claims.filter(
    (claim) => claim.experimentIds.length > 0,
  );

  if (declaration === "undeclared" && experimentClaims.length > 0) {
    issues.push({
      code: "experiment_intake_undeclared",
      severity: "blocking",
      message:
        "Experiment intake was not declared; experiment-backed conclusions cannot pass.",
    });
  }
  if (
    declaration === "experiments_declared" &&
    integrityInput.experimentProvenance.length === 0
  ) {
    issues.push({
      code: "experiment_provenance_missing",
      severity: "blocking",
      message:
        "Experiments were declared but no bounded provenance records were supplied.",
    });
  }
  if (
    declaration === "no_experiments_declared" &&
    experimentClaims.length > 0
  ) {
    issues.push({
      code: "experiment_claim_declaration_conflict",
      severity: "blocking",
      message:
        "One or more claims cite experiments even though the intake declares no experiments.",
    });
  }
  const unknownIds = Array.from(
    new Set(
      experimentClaims.flatMap((claim) =>
        claim.experimentIds.filter((id) => !registeredIds.has(id)),
      ),
    ),
  );
  if (unknownIds.length > 0) {
    issues.push({
      code: "experiment_provenance_unknown_id",
      severity: "blocking",
      message: `Experiment-backed claims reference unregistered IDs: ${unknownIds.join(", ")}.`,
    });
  }
  return issues;
}

export function enforceFeynmanExperimentProvenance(
  claims: FeynmanClaimAudit[],
  integrityInput: FeynmanResearchIntegrityInput,
) {
  const registeredIds = new Set(
    integrityInput.experimentProvenance.map((item) => item.experimentId),
  );
  const declaration =
    integrityInput.experimentIntakeDeclaration ?? "undeclared";

  return claims.map((claim) => {
    if (claim.experimentIds.length === 0) return claim;
    const valid =
      declaration === "experiments_declared" &&
      integrityInput.experimentProvenance.length > 0 &&
      claim.experimentIds.every((id) => registeredIds.has(id));
    if (valid) return claim;
    return {
      ...claim,
      verdict: "unverifiable" as const,
      rationale: `${claim.rationale} Experiment provenance is undeclared, contradictory, missing, or references an unregistered experiment ID.`,
    };
  });
}

export function enforceFeynmanClaimEvidence(
  claims: FeynmanClaimAudit[],
  sources: FeynmanSource[],
) {
  const acceptedIds = new Set(
    sources.filter((source) => source.accepted).map((source) => source.id),
  );
  return claims.map((claim) => {
    const acceptedCount = claim.sourceIds.filter((id) =>
      acceptedIds.has(id),
    ).length;
    if (
      claim.verdict === "unsupported" ||
      claim.verdict === "conflicting" ||
      acceptedCount === claim.sourceIds.length
    ) {
      return claim;
    }
    const verdict: FeynmanClaimAudit["verdict"] =
      acceptedCount > 0 ? "partial" : "unverifiable";
    return {
      ...claim,
      verdict,
      rationale: `${claim.rationale} Deterministic source validation found ${acceptedCount} directly read reference(s) among ${claim.sourceIds.length} claimed source ID(s).`,
    };
  });
}

function claimCounts(claims: FeynmanClaimAudit[]) {
  return {
    total: claims.length,
    supported: claims.filter((claim) => claim.verdict === "supported").length,
    partial: claims.filter((claim) => claim.verdict === "partial").length,
    conflicting: claims.filter((claim) => claim.verdict === "conflicting")
      .length,
    unsupported: claims.filter((claim) => claim.verdict === "unsupported")
      .length,
    unverifiable: claims.filter((claim) => claim.verdict === "unverifiable")
      .length,
    experimentBacked: claims.filter((claim) => claim.experimentIds.length > 0)
      .length,
  };
}

function uniqueIssues(issues: FeynmanIntegrityIssue[]) {
  const seen = new Set<string>();
  return issues.filter((issue) => {
    if (seen.has(issue.code)) return false;
    seen.add(issue.code);
    return true;
  });
}

export function buildFeynmanResearchIntegrityPassport(input: {
  workflow: FeynmanWorkflowId;
  sources: FeynmanSource[];
  claims: FeynmanClaimAudit[];
  findings: FeynmanReviewFinding[];
  coverage: FeynmanProgressiveCoverage;
  failures: string[];
  stageStatus: FeynmanResearchResult["stageStatus"];
  integrityInput: FeynmanResearchIntegrityInput;
}): FeynmanResearchIntegrityPassport {
  const directlyRead = input.sources.filter((source) => source.accepted).length;
  const counts = claimCounts(input.claims);
  const issues: FeynmanIntegrityIssue[] = experimentClaimIssues(
    input.claims,
    input.integrityInput,
  );

  if (directlyRead === 0) {
    issues.push({
      code: "no_direct_evidence",
      severity: "blocking",
      message: "No directly read source is available to support conclusions.",
    });
  } else if (!input.coverage.sufficient) {
    issues.push({
      code: "coverage_below_threshold",
      severity: "review",
      message: "The bounded source pass did not meet its evidence threshold.",
    });
  }
  if (
    input.failures.length > 0 ||
    Object.values(input.stageStatus).some((status) => status === "degraded")
  ) {
    issues.push({
      code: "degraded_pipeline",
      severity: "review",
      message:
        "One or more collection or model stages degraded; deterministic fallback evidence is visible.",
    });
  }
  if (counts.unsupported + counts.unverifiable > 0) {
    issues.push({
      code: "claim_support_gap",
      severity: "review",
      message:
        "One or more claims remain unsupported or unverifiable after the claim audit.",
    });
  }
  if (input.findings.some((finding) => finding.severity === "fatal")) {
    issues.push({
      code: "fatal_review_finding",
      severity: "blocking",
      message: "The reviewer identified a fatal issue in the artifact.",
    });
  } else if (input.findings.some((finding) => finding.severity === "major")) {
    issues.push({
      code: "major_review_finding",
      severity: "review",
      message: "The reviewer identified at least one major issue.",
    });
  }

  const unique = uniqueIssues(issues);
  const status = unique.some((issue) => issue.severity === "blocking")
    ? "blocked"
    : unique.length > 0
      ? "needs_review"
      : "pass";
  const declaration =
    input.integrityInput.experimentIntakeDeclaration ?? "undeclared";

  return {
    version: 1,
    workflow: input.workflow,
    taskType: OUTCOME_GRADABLE_WORKFLOWS.has(input.workflow)
      ? "outcome-gradable"
      : "open-ended",
    dataAccess: {
      level: "raw",
      operatorInput: "topic_or_artifact_reference",
      directlyReadEvidenceRequired: true,
      supportPolicy: "verified_direct_sources_only",
    },
    sources: {
      discovered: input.sources.length,
      directlyRead,
      notRead: input.sources.length - directlyRead,
      highConfidenceDirect: input.sources.filter(
        (source) => source.accepted && source.confidence === "high",
      ).length,
    },
    claims: counts,
    experimentIntake: {
      declaration,
      registeredExperimentIds: input.integrityInput.experimentProvenance.map(
        (item) => item.experimentId,
      ),
      provenanceRecords: input.integrityInput.experimentProvenance.length,
    },
    reproducibility: {
      posture: "recorded_not_replay_proof",
      contractVersion: "nexus-feynman-integrity-v1",
      replayGuarantee: false,
      queryWaves: input.coverage.queryWaves,
      evidenceThresholds: input.coverage.thresholds,
    },
    crossModel: {
      posture: "not_run",
      independentVerification: false,
    },
    issues: unique,
    status,
  };
}

export function formatFeynmanResearchIntegrityPassport(
  passport: FeynmanResearchIntegrityPassport,
) {
  return [
    `- Status: ${passport.status}`,
    `- Task type: ${passport.taskType}`,
    `- Data access: ${passport.dataAccess.level}; support policy ${passport.dataAccess.supportPolicy}; directly-read evidence required`,
    `- Sources: ${passport.sources.directlyRead} directly read; ${passport.sources.notRead} not read; ${passport.sources.highConfidenceDirect} high-confidence direct`,
    `- Claims: ${passport.claims.supported} supported; ${passport.claims.partial} partial; ${passport.claims.conflicting} conflicting; ${passport.claims.unsupported} unsupported; ${passport.claims.unverifiable} unverifiable`,
    `- Experiment intake: ${passport.experimentIntake.declaration}; ${passport.experimentIntake.provenanceRecords} provenance record(s); ${passport.claims.experimentBacked} experiment-backed claim(s)`,
    `- Reproducibility: ${passport.reproducibility.posture}; replay guarantee ${passport.reproducibility.replayGuarantee ? "yes" : "no"}`,
    `- Cross-model check: ${passport.crossModel.posture}; independent verification ${passport.crossModel.independentVerification ? "yes" : "no"}`,
    "- Issues:",
    ...(passport.issues.length > 0
      ? passport.issues.map(
          (issue) =>
            `  - ${issue.severity.toUpperCase()} · ${issue.code}: ${issue.message}`,
        )
      : ["  - none"]),
  ].join("\n");
}
