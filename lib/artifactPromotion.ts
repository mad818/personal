import type { ArtifactContinuityMetadata } from "@/lib/artifactContinuity";
import { buildReverseEngineeringBriefDraft } from "@/lib/binaryTriage";

type PromotionStructure = "light" | "structured" | "document_heavy";

export interface ArtifactPromotionSignals {
  sourceCount: number;
  citationCount: number;
  structure: PromotionStructure;
  referencedDomains: string[];
  sectionHeadings: string[];
  documentHints: string[];
}

export interface PromotableArtifactLike {
  id: string;
  title: string;
  summary: string;
  content?: string;
  contentPreview?: string;
  contentWithheld?: boolean;
  sourceLabel: string;
  route?: string;
  topic?: string;
  workflowId?: string;
  workflowLabel?: string;
  layer: "raw" | "knowledge" | "output";
  domain: string;
  tags: string[];
  continuity: ArtifactContinuityMetadata;
  researchSignals?: ArtifactPromotionSignals;
}

export interface ArtifactPromotionEvaluation {
  eligible: boolean;
  reason: string;
  targetClass:
    | "study_brief"
    | "reverse_engineering_brief"
    | "research_brief"
    | null;
}

export interface ArtifactPromotionDraft {
  title: string;
  summary: string;
  topic: string;
  tags: string[];
  content: string;
  route: string;
  domain: string;
  sourceLabel: string;
}

function uniqueStrings(values: Array<string | null | undefined>) {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const normalized = value?.trim();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(normalized);
  }
  return result;
}

function truncateInline(text: string, max = 220) {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1).trimEnd()}…`;
}

function buildResearchBriefDraft(
  source: PromotableArtifactLike,
): ArtifactPromotionDraft {
  const carriedTags = source.tags.filter(
    (tag) =>
      tag !== "compiled" &&
      tag !== "research" &&
      tag !== "research-brief" &&
      tag !== "research-artifact" &&
      tag !== "derived-from-research-artifact",
  );
  const tags = uniqueStrings([
    ...carriedTags,
    "research-brief",
    "derived-from-research-artifact",
    source.continuity.continuityTag,
  ]);
  const displayTitle = source.topic?.trim() || source.title;
  const evidenceBits = uniqueStrings([
    source.researchSignals?.sourceCount
      ? `${source.researchSignals.sourceCount} source${source.researchSignals.sourceCount === 1 ? "" : "s"}`
      : null,
    source.researchSignals?.citationCount
      ? `${source.researchSignals.citationCount} citation cue${source.researchSignals.citationCount === 1 ? "" : "s"}`
      : null,
    source.researchSignals?.structure
      ? source.researchSignals.structure.replace(/_/g, " ")
      : null,
    source.continuity.workflowClass,
    source.continuity.workflowPackId,
    source.continuity.evidenceStrength,
  ]);
  const referencedDomains = source.researchSignals?.referencedDomains.length
    ? source.researchSignals.referencedDomains.join(", ")
    : "none recorded";
  const sectionHeadings = source.researchSignals?.sectionHeadings.length
    ? source.researchSignals.sectionHeadings.join(" · ")
    : "No explicit sections captured";
  const nextSteps = uniqueStrings([
    source.route
      ? `Return to ${source.route} for the active working lane.`
      : null,
    source.workflowLabel
      ? `Reuse the ${source.workflowLabel} workflow when widening the brief.`
      : null,
    source.continuity.workflowClass
      ? `Keep continuity in the ${source.continuity.workflowClass} lane instead of spawning a parallel note.`
      : "Keep continuity tied to the original mission instead of starting a parallel archive thread.",
    "Update the lower-order artifact if the evidence changes materially, then reopen this brief instead of duplicating it.",
  ]);

  return {
    title: `Research brief · ${displayTitle}`,
    summary: `Higher-order research brief derived from durable evidence · ${source.summary}`,
    topic: "Research brief",
    tags,
    route: source.route ?? "/vault",
    domain: source.domain,
    sourceLabel: "Research brief",
    content: [
      `# Research brief · ${displayTitle}`,
      "",
      "## Scope",
      "- Promoted from a durable research artifact so synthesis can compound without overwriting the lower-order evidence trail.",
      "- This brief stays local-first and deterministic. It summarizes the current artifact instead of inventing new claims.",
      "",
      "## Evidence posture",
      `- ${evidenceBits.join(" · ") || "Evidence posture unavailable"}`,
      `- Referenced domains: ${referencedDomains}`,
      `- Sections observed: ${sectionHeadings}`,
      "",
      "## Key findings",
      `- ${truncateInline(source.summary, 240)}`,
      `- ${truncateInline(source.contentPreview ?? source.content ?? source.summary, 260)}`,
      "",
      "## Continuity",
      source.continuity.continuityId
        ? `- Continuity id: ${source.continuity.continuityId}`
        : "- Continuity id was not available on the source artifact.",
      source.continuity.continuityTag
        ? `- Continuity tag: ${source.continuity.continuityTag}`
        : "- Continuity tag was not available on the source artifact.",
      source.continuity.sourceType
        ? `- Source type: ${source.continuity.sourceType}`
        : "- Source type unavailable.",
      source.sourceLabel
        ? `- Source lane: ${source.sourceLabel}`
        : "- Source lane unavailable.",
      "",
      "## Recommended next steps",
      ...nextSteps.map((step) => `- ${step}`),
      "",
      "## Reopen paths",
      source.route
        ? `- Origin lane: ${source.route}`
        : "- Origin lane unavailable.",
      "- VAULT durable artifacts: /vault?focus=vault-compiled-pages",
      "- Second-brain export: /vault?focus=vault-export-second-brain",
    ].join("\n"),
  };
}

function buildStudyBriefDraft(
  source: PromotableArtifactLike,
): ArtifactPromotionDraft {
  const carriedTags = source.tags.filter(
    (tag) =>
      tag !== "learning-note" &&
      tag !== "study-brief" &&
      tag !== "quiz-set" &&
      tag !== "review-sheet",
  );
  const tags = uniqueStrings([
    ...carriedTags,
    "study-brief",
    "derived-from-learning-note",
    source.continuity.continuityTag,
  ]);
  const displayTitle = source.topic?.trim() || source.title;
  const checkpoints = uniqueStrings([
    source.continuity.learningMissionMode
      ? `Learning mode: ${source.continuity.learningMissionMode}`
      : null,
    source.continuity.tutorProfile
      ? `Tutor profile: ${source.continuity.tutorProfile}`
      : null,
    source.continuity.memoryCompartment
      ? `Memory compartment: ${source.continuity.memoryCompartment}`
      : null,
    source.continuity.workflowPackId
      ? `Workflow pack: ${source.continuity.workflowPackId}`
      : null,
  ]);

  return {
    title: `Study brief · ${displayTitle}`,
    summary: `Higher-order study brief derived from durable learning context · ${source.summary}`,
    topic: "Study brief",
    tags,
    route: source.route ?? "/vault",
    domain: source.domain,
    sourceLabel: "Study brief",
    content: [
      `# Study brief · ${displayTitle}`,
      "",
      "## Scope",
      "- Promoted from a durable learning note so guided learning can compound without duplicating the lower-order context.",
      "- This brief stays deterministic and source-backed where possible; inferred carry-forward should remain labeled as inferred.",
      "",
      "## What to keep in view",
      `- ${truncateInline(source.summary, 220)}`,
      `- ${truncateInline(source.contentPreview ?? source.content ?? source.summary, 240)}`,
      "",
      "## Study posture",
      ...(checkpoints.length > 0
        ? checkpoints.map((checkpoint) => `- ${checkpoint}`)
        : [
            "- No explicit study posture metadata was available on the source note.",
          ]),
      "",
      "## Continuity",
      source.continuity.continuityId
        ? `- Continuity id: ${source.continuity.continuityId}`
        : "- Continuity id was not available on the source note.",
      source.continuity.continuityTag
        ? `- Continuity tag: ${source.continuity.continuityTag}`
        : "- Continuity tag was not available on the source note.",
      "",
      "## Recommended next steps",
      "- Reopen the lower-order learning note if the concept changes materially, then refresh this study brief instead of creating a duplicate.",
      "- Keep the next study continuation compact: one checkpoint, one quiz, or one practice step.",
      source.route
        ? `- Origin lane: ${source.route}`
        : "- Origin lane unavailable.",
      "",
      "## Reopen paths",
      "- VAULT durable artifacts: /vault?focus=vault-compiled-pages",
      "- Memory compartments: /vault?focus=vault-memory-conversation",
      "- Internal tutor controls: /skills?view=brain&focus=skills-brain",
    ].join("\n"),
  };
}

export function getArtifactPromotionEvaluation(
  source: PromotableArtifactLike,
): ArtifactPromotionEvaluation {
  const promotionKind = source.continuity.promotionKind;
  if (!promotionKind) {
    return {
      eligible: false,
      reason: "This artifact does not advertise a higher-order promotion path.",
      targetClass: null,
    };
  }

  if (!source.continuity.continuityId && !source.continuity.continuityTag) {
    return {
      eligible: false,
      reason:
        "Promotion requires continuity identity so the higher-order brief can reopen safely.",
      targetClass: promotionKind,
    };
  }

  if (source.contentWithheld && !source.content) {
    return {
      eligible: false,
      reason:
        "Promotion needs readable durable content so the higher-order brief can stay evidence-backed.",
      targetClass: promotionKind,
    };
  }

  if (promotionKind === "reverse_engineering_brief") {
    const hasEvidence =
      source.continuity.qualitySignals.includes("hash-anchored") ||
      source.continuity.qualitySignals.includes("ioc-anchored") ||
      (source.content?.length ?? source.contentPreview?.length ?? 0) > 120;
    return hasEvidence
      ? {
          eligible: true,
          reason:
            "Reverse-engineering prep is continuity-backed and has enough triage evidence to promote.",
          targetClass: "reverse_engineering_brief",
        }
      : {
          eligible: false,
          reason:
            "Reverse-engineering promotion needs stronger triage evidence before a brief is useful.",
          targetClass: "reverse_engineering_brief",
        };
  }

  if (promotionKind === "study_brief") {
    const hasEvidence =
      source.continuity.qualitySignals.includes("study-ready") ||
      source.continuity.qualitySignals.includes("sectioned") ||
      (source.content?.length ?? source.contentPreview?.length ?? 0) > 140;
    return hasEvidence
      ? {
          eligible: true,
          reason:
            "Learning note is continuity-backed and has enough structured context to promote into a study brief.",
          targetClass: "study_brief",
        }
      : {
          eligible: false,
          reason:
            "Study promotion needs stronger structure before a higher-order brief is useful.",
          targetClass: "study_brief",
        };
  }

  const sourceCount = source.researchSignals?.sourceCount ?? 0;
  const citationCount = source.researchSignals?.citationCount ?? 0;
  const structure = source.researchSignals?.structure ?? "light";
  const hasEvidence =
    citationCount > 0 ||
    source.continuity.qualitySignals.includes("cited") ||
    source.continuity.qualitySignals.includes("sectioned");
  const hasEnoughShape =
    structure !== "light" ||
    sourceCount > 1 ||
    (source.researchSignals?.sectionHeadings.length ?? 0) > 1;

  return hasEvidence && hasEnoughShape
    ? {
        eligible: true,
        reason:
          "Research artifact has continuity, evidence, and enough structure to justify a higher-order brief.",
        targetClass: "research_brief",
      }
    : {
        eligible: false,
        reason:
          "Research promotion needs citations or stronger structure before it should produce a brief.",
        targetClass: "research_brief",
      };
}

export function buildArtifactPromotionDraft(
  source: PromotableArtifactLike,
): ArtifactPromotionDraft | null {
  const evaluation = getArtifactPromotionEvaluation(source);
  if (!evaluation.eligible || !evaluation.targetClass) return null;

  if (evaluation.targetClass === "reverse_engineering_brief") {
    const draft = buildReverseEngineeringBriefDraft({
      title: source.title,
      summary: source.summary,
      content: source.content ?? source.contentPreview ?? source.summary,
      tags: source.tags,
    });
    return {
      ...draft,
      route: "/recon",
      domain: "cyber",
      sourceLabel: "Reverse engineering brief",
    };
  }

  if (evaluation.targetClass === "study_brief") {
    return buildStudyBriefDraft(source);
  }

  return buildResearchBriefDraft(source);
}

export function findExistingPromotionTarget<T extends PromotableArtifactLike>(
  source: PromotableArtifactLike,
  candidates: T[],
) {
  const evaluation = getArtifactPromotionEvaluation(source);
  if (!evaluation.eligible || !evaluation.targetClass) return null;

  const draft = buildArtifactPromotionDraft(source);
  if (!draft) return null;

  return (
    candidates.find((candidate) => {
      if (candidate.id === source.id) return false;
      if (candidate.continuity.artifactClass !== evaluation.targetClass)
        return false;
      if (
        source.continuity.continuityId &&
        candidate.continuity.continuityId === source.continuity.continuityId
      ) {
        return true;
      }
      if (
        source.continuity.continuityTag &&
        (candidate.continuity.continuityTag ===
          source.continuity.continuityTag ||
          candidate.tags.includes(source.continuity.continuityTag))
      ) {
        return true;
      }
      return candidate.title === draft.title;
    }) ?? null
  );
}
