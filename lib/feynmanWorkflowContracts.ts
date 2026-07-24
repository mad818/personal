import type { FeynmanWorkflowId } from "./feynmanResearch.ts";

export interface FeynmanWorkflowContract {
  workflow: FeynmanWorkflowId;
  label: string;
  outputMode: string;
  requiredSections: string[];
  writerInstructions: string[];
  verifierChecks: string[];
  reviewerChecks: string[];
  acceptanceChecks: string[];
  approvalBoundary: string;
}

export const FEYNMAN_WORKFLOW_CONTRACTS: Record<
  FeynmanWorkflowId,
  FeynmanWorkflowContract
> = {
  deepresearch: {
    workflow: "deepresearch",
    label: "Deep research brief",
    outputMode: "Operator-grade source synthesis",
    requiredSections: [
      "Scope",
      "Core claim",
      "Evidence ledger",
      "Counter-signals",
      "Operator takeaway",
      "Confidence and gaps",
    ],
    writerInstructions: [
      "Separate settled claims from inferences.",
      "Surface the highest-impact disagreement before the recommendation.",
      "End with one operator decision or next read.",
    ],
    verifierChecks: [
      "Every core claim maps to directly read source IDs.",
      "Unread discovered sources are never treated as support.",
    ],
    reviewerChecks: [
      "Flag overconfident conclusions when coverage is weak.",
      "Check whether the operator takeaway follows from the evidence.",
    ],
    acceptanceChecks: [
      "Includes a bounded scope statement.",
      "Includes at least one explicit counter-signal or states none was found.",
    ],
    approvalBoundary:
      "Read-only research workflow. Any downstream action stays operator-approved.",
  },
  "lit-review": {
    workflow: "lit-review",
    label: "Literature review",
    outputMode: "Literature evidence map",
    requiredSections: [
      "Research question",
      "Literature evidence map",
      "Consensus findings",
      "Disagreements",
      "Methodology quality",
      "Literature gap map",
      "Open questions",
    ],
    writerInstructions: [
      "Prefer papers, standards, official docs, and benchmarks over commentary.",
      "Group findings by consensus, disagreement, and methodology quality.",
      "State which source families were searched but not read.",
      "For each gap, name the coverage dimension, directly read source cluster, classification as observed coverage gap or possible research opportunity, competing explanation, and one bounded next-study question.",
      "Treat incomplete search or retrieval as a competing explanation, not evidence of novelty.",
    ],
    verifierChecks: [
      "Consensus claims require more than one directly read source when available.",
      "Methodology quality notes must cite paper or benchmark evidence.",
      "Gap claims require a directly read source cluster and cannot rely only on an unread source, missing search result, or one paper's future-work language.",
      "Observed coverage gaps and possible research opportunities must remain visibly distinct.",
    ],
    reviewerChecks: [
      "Flag single-paper conclusions as fragile.",
      "Flag missing methodology discussion as a major issue.",
      "Flag novelty overreach, duplicate gap rows, and gaps that may reflect incomplete retrieval.",
      "Check that every proposed next study follows from the evidence map and names a competing explanation.",
    ],
    acceptanceChecks: [
      "Contains a literature evidence map.",
      "Names methodology quality and open questions separately.",
      "Contains a literature gap map with evidence basis, coverage dimension, observed coverage gap versus possible research opportunity classification, competing explanation, and bounded next-study guidance.",
    ],
    approvalBoundary:
      "Read-only literature review. Scheduling future sweeps remains human-gated.",
  },
  review: {
    workflow: "review",
    label: "Peer review",
    outputMode: "Peer review verdict",
    requiredSections: [
      "Artifact under review",
      "Peer review verdict",
      "Major strengths",
      "Major concerns",
      "Minor concerns",
      "Revision plan",
    ],
    writerInstructions: [
      "Review the artifact as if preparing actionable peer feedback.",
      "Separate major concerns from minor presentation issues.",
      "Tie each revision request to evidence or a claim-audit finding.",
    ],
    verifierChecks: [
      "Reviewer claims about the artifact must map to supplied evidence.",
      "Unsupported criticism is labeled as reviewer inference.",
    ],
    reviewerChecks: [
      "Escalate fatal flaws that invalidate the artifact's central claim.",
      "Check that the revision plan addresses every major concern.",
    ],
    acceptanceChecks: [
      "Includes a peer review verdict.",
      "Includes major and minor concern buckets.",
    ],
    approvalBoundary:
      "Read-only review workflow. It may recommend revisions but does not edit files.",
  },
  audit: {
    workflow: "audit",
    label: "Claim and artifact audit",
    outputMode: "Claim-to-code trace",
    requiredSections: [
      "Audit target",
      "Claim-to-code trace",
      "Supported claims",
      "Unsupported claims",
      "Conflicts",
      "Remediation queue",
    ],
    writerInstructions: [
      "Compare claims against direct sources, docs, and public repository evidence.",
      "Keep claim-to-code trace entries separate from general source synthesis.",
      "Do not claim line-by-line paper-code parity unless code evidence was read.",
    ],
    verifierChecks: [
      "Each supported claim must cite directly read evidence.",
      "Repository claims require a repository source ID or stay unverifiable.",
    ],
    reviewerChecks: [
      "Flag any implementation claim without code evidence.",
      "Flag remediation items that require execution or external writes.",
    ],
    acceptanceChecks: [
      "Contains a claim-to-code trace.",
      "Separates supported and unsupported claims.",
    ],
    approvalBoundary:
      "Read-only audit. Code changes, execution, and external writes require explicit approval.",
  },
  replicate: {
    workflow: "replicate",
    label: "Replication plan",
    outputMode: "Replication readiness",
    requiredSections: [
      "Replication target",
      "Replication readiness",
      "Environment plan",
      "Data and code requirements",
      "Metrics and stop conditions",
      "Approval gate",
    ],
    writerInstructions: [
      "Produce an execution-ready plan without executing anything.",
      "List missing data, code, environment, and hardware requirements.",
      "Define metrics, failure criteria, and stop conditions before any run.",
    ],
    verifierChecks: [
      "Any data or code requirement must be sourced or marked unknown.",
      "Metrics and stop conditions must be measurable.",
    ],
    reviewerChecks: [
      "Flag hidden execution, installation, training, or paid-compute assumptions.",
      "Check whether the plan can be reviewed before any mutation.",
    ],
    acceptanceChecks: [
      "Contains replication readiness.",
      "Contains metrics, stop conditions, and approval gate.",
    ],
    approvalBoundary:
      "Plan only. Explicit operator approval is required before installs, scripts, training, paid compute, Docker, or local execution.",
  },
  recipe: {
    workflow: "recipe",
    label: "Implementation recipe",
    outputMode: "Implementation recipe",
    requiredSections: [
      "Objective",
      "Implementation recipe",
      "Method options",
      "Datasets and code anchors",
      "Verification plan",
      "Tradeoffs",
    ],
    writerInstructions: [
      "Rank implementable methods by local fit, evidence quality, and complexity.",
      "Name datasets and code anchors only when evidence supports them.",
      "Finish with a verification plan that does not require paid services.",
    ],
    verifierChecks: [
      "Each method option must have evidence or be labeled speculative.",
      "Verification steps must be local/free unless explicitly marked optional.",
    ],
    reviewerChecks: [
      "Flag recipes that omit validation or rollback.",
      "Flag hidden paid dependencies or unsafe execution assumptions.",
    ],
    acceptanceChecks: [
      "Contains ranked method options.",
      "Contains local verification plan and tradeoffs.",
    ],
    approvalBoundary:
      "Recipe output only. Any implementation or execution requires explicit operator approval.",
  },
  compare: {
    workflow: "compare",
    label: "Comparison matrix",
    outputMode: "Decision matrix",
    requiredSections: [
      "Options",
      "Decision matrix",
      "Evidence notes",
      "Recommendation",
      "Risks",
      "Tie-breakers",
    ],
    writerInstructions: [
      "Use comparable criteria across every option.",
      "Keep evidence notes separate from recommendation.",
      "State tie-breakers when evidence is too close or incomplete.",
    ],
    verifierChecks: [
      "Each option must use the same criteria.",
      "Recommendations must cite evidence or be labeled judgment.",
    ],
    reviewerChecks: [
      "Flag criteria drift between options.",
      "Flag recommendations that ignore risk rows.",
    ],
    acceptanceChecks: [
      "Contains a decision matrix.",
      "Includes risks and tie-breakers.",
    ],
    approvalBoundary:
      "Read-only comparison. Any downstream choice or action is operator-approved.",
  },
  draft: {
    workflow: "draft",
    label: "Research draft",
    outputMode: "Draft scaffold",
    requiredSections: [
      "Draft scaffold",
      "Abstract",
      "Background",
      "Evidence-backed argument",
      "Limitations",
      "Revision checklist",
    ],
    writerInstructions: [
      "Write a paper-style scaffold without hiding uncertainty.",
      "Keep unsupported claims out of the evidence-backed argument.",
      "End with a revision checklist based on verifier and reviewer findings.",
    ],
    verifierChecks: [
      "Every evidence-backed argument claim must map to directly read sources.",
      "Limitations must include coverage gaps.",
    ],
    reviewerChecks: [
      "Flag missing limitations or source overreach.",
      "Check that the revision checklist follows from audit findings.",
    ],
    acceptanceChecks: [
      "Contains a draft scaffold.",
      "Contains limitations and revision checklist.",
    ],
    approvalBoundary:
      "Draft output only. Publication, submission, or external writes require approval.",
  },
  autoresearch: {
    workflow: "autoresearch",
    label: "Autoresearch plan",
    outputMode: "Experiment loop proposal",
    requiredSections: [
      "Measurable objective",
      "Experiment loop proposal",
      "Variants",
      "Scoring rule",
      "Keep or reject policy",
      "Approval gate",
    ],
    writerInstructions: [
      "Define one measurable objective and a bounded variant set.",
      "Describe the scoring rule and keep/reject policy before any run.",
      "Keep the output as a proposal, not an enabled loop.",
    ],
    verifierChecks: [
      "Objective and scoring rule must be measurable.",
      "Variant count and stop conditions must be bounded.",
    ],
    reviewerChecks: [
      "Flag any implied autonomous execution.",
      "Flag missing rollback or stopping criteria.",
    ],
    acceptanceChecks: [
      "Contains experiment loop proposal.",
      "Contains measurable scoring and approval gate.",
    ],
    approvalBoundary:
      "Proposal only. Explicit operator approval is required before enabling loops, execution, external writes, or training.",
  },
  watch: {
    workflow: "watch",
    label: "Research watch",
    outputMode: "Watch cadence",
    requiredSections: [
      "Watch scope",
      "Watch cadence",
      "Source set",
      "Material-change rules",
      "Output expectation",
      "Scheduler approval gate",
    ],
    writerInstructions: [
      "Define what counts as a material change before any scheduler handoff.",
      "Name source families and cadence without creating a job.",
      "Keep output expectations reviewable and local-first.",
    ],
    verifierChecks: [
      "Material-change rules must be testable.",
      "Cadence must be explicit and bounded.",
    ],
    reviewerChecks: [
      "Flag any language that implies a recurring job is enabled before operator approval.",
      "Check whether the source set is small enough for review.",
    ],
    acceptanceChecks: [
      "Contains watch cadence.",
      "Contains scheduler approval gate.",
    ],
    approvalBoundary:
      "Explicit operator approval is required before creating or enabling recurrence. Once approved, the bounded public arXiv check runs without a model call and stores local review receipts.",
  },
};

export function getFeynmanWorkflowContract(workflow: FeynmanWorkflowId) {
  return FEYNMAN_WORKFLOW_CONTRACTS[workflow];
}

function renderList(items: string[]) {
  return items.map((item) => `- ${item}`).join("\n");
}

export function renderFeynmanWorkflowContractForPrompt(
  workflow: FeynmanWorkflowId,
) {
  const contract = getFeynmanWorkflowContract(workflow);
  return [
    `Output mode: ${contract.outputMode}`,
    "Required sections:",
    renderList(contract.requiredSections),
    "Writer instructions:",
    renderList(contract.writerInstructions),
    "Verifier checks:",
    renderList(contract.verifierChecks),
    "Reviewer checks:",
    renderList(contract.reviewerChecks),
    `Approval boundary: ${contract.approvalBoundary}`,
  ].join("\n");
}

export function renderFeynmanWorkflowContractForReport(
  workflow: FeynmanWorkflowId,
) {
  const contract = getFeynmanWorkflowContract(workflow);
  return [
    `- Contract: ${contract.label}`,
    `- Output mode: ${contract.outputMode}`,
    `- Required sections: ${contract.requiredSections.join("; ")}`,
    `- Acceptance checks: ${contract.acceptanceChecks.join("; ")}`,
    `- Approval boundary: ${contract.approvalBoundary}`,
  ].join("\n");
}
