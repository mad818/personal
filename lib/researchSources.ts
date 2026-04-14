export type WorkflowPackId =
  | "guided-learning"
  | "research-workflow"
  | "reverse-engineering"
  | "second-brain"
  | "market-review"
  | "release-ops"
  | "scheduler-governance"
  | "cyber-triage";

export type ResearchSourceType =
  | "local-note"
  | "local-pdf"
  | "vault-artifact"
  | "citation"
  | "repo-memory"
  | "memory-spine"
  | "unknown";

export type EvidenceStrength =
  | "unverified"
  | "contextual"
  | "source-backed"
  | "synthesis-ready";

export type ResearchArtifactClass =
  | "source_note"
  | "evidence_card"
  | "synthesis_brief"
  | "review_brief";

export interface ResearchSourceRef {
  id: string;
  title: string;
  sourceType: ResearchSourceType;
  evidenceStrength: EvidenceStrength;
  href?: string | null;
  inferred?: boolean;
}

export function inferEvidenceStrength(input: {
  citationCount?: number | null;
  sourceCount?: number | null;
  inferred?: boolean;
  sourceType?: ResearchSourceType | null;
}) : EvidenceStrength {
  if (input.inferred) return "unverified";
  if ((input.citationCount ?? 0) > 0 || (input.sourceCount ?? 0) > 1) {
    return "synthesis-ready";
  }
  if (
    input.sourceType === "local-note" ||
    input.sourceType === "local-pdf" ||
    input.sourceType === "citation" ||
    input.sourceType === "vault-artifact"
  ) {
    return "source-backed";
  }
  if (input.sourceType === "repo-memory" || input.sourceType === "memory-spine") {
    return "contextual";
  }
  return "unverified";
}
