import type { AssistantCapabilityId } from "@/lib/assistantCapabilityRegistry";
import type {
  TutorProfileId,
  LearningMissionMode,
} from "@/lib/learningMissions";
import type { MemoryCompartment } from "@/lib/memoryMining";
import type {
  EvidenceStrength,
  ResearchSourceRef,
  ResearchSourceType,
  WorkflowPackId,
} from "@/lib/researchSources";
import {
  buildReverseEngineeringContinuityIdentity,
  buildReverseEngineeringContinuityTag,
  isBinaryTriageMemoryArtifact,
  isReverseEngineeringBriefArtifact,
} from "@/lib/binaryTriage";
import { trimRepeatedEdgeCharacter } from "@/lib/security/textSafety";

export type ArtifactContinuityClass =
  | "generic"
  | "archive_note"
  | "learning_note"
  | "study_brief"
  | "review_sheet"
  | "quiz_set"
  | "reverse_engineering_prep"
  | "reverse_engineering_brief"
  | "research_artifact"
  | "research_brief";

export type ArtifactContinuityPromotionKind =
  | "study_brief"
  | "reverse_engineering_brief"
  | "research_brief"
  | null;

export interface ArtifactContinuityMetadata {
  artifactClass: ArtifactContinuityClass;
  continuityId: string | null;
  continuityTag: string | null;
  sourceQuery: string | null;
  capability: AssistantCapabilityId | null;
  routeOrigin: string | null;
  workflowClass: string | null;
  workflowPackId: WorkflowPackId | null;
  memoryCompartment: MemoryCompartment | null;
  learningMissionMode: LearningMissionMode | null;
  tutorProfile: TutorProfileId | null;
  repoMemoryBinding: string | null;
  sourceRefs: ResearchSourceRef[];
  sourceType: ResearchSourceType | null;
  evidenceStrength: EvidenceStrength | null;
  missionHints: string[];
  relatedLinkSeeds: string[];
  promotionKind: ArtifactContinuityPromotionKind;
  qualitySignals: string[];
}

interface ArtifactContinuityInput {
  title: string;
  summary: string;
  tags: string[];
  route?: string | null;
  topic?: string | null;
  sourceLabel?: string | null;
  workflowId?: string | null;
  workflowLabel?: string | null;
  content?: string | null;
  workflowPackId?: WorkflowPackId | null;
  memoryCompartment?: MemoryCompartment | null;
  learningMissionMode?: LearningMissionMode | null;
  tutorProfile?: TutorProfileId | null;
  repoMemoryBinding?: string | null;
  sourceRefs?: ResearchSourceRef[];
  sourceType?: ResearchSourceType | null;
  evidenceStrength?: EvidenceStrength | null;
}

export interface ArtifactContinuityComparable extends ArtifactContinuityInput {
  id?: string;
  continuity?: ArtifactContinuityMetadata | null;
}

export interface RankedArtifactMatch<T extends ArtifactContinuityComparable> {
  item: T;
  score: number;
  reasons: string[];
}

function slugify(value: string) {
  return trimRepeatedEdgeCharacter(
    value.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    "-",
  ).slice(0, 64);
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

function normalizeCapability(
  route: string | null | undefined,
): AssistantCapabilityId | null {
  switch (route) {
    case "/recon":
      return "reverse-engineering";
    case "/vault":
      return "archive-continuity";
    case "/hq":
      return "conversation-general";
    case "/skills":
      return "guided-learning";
    default:
      return null;
  }
}

function normalizeWorkflowClass(input: ArtifactContinuityInput) {
  const haystack = [
    input.workflowId,
    input.workflowLabel,
    input.topic,
    input.sourceLabel,
    input.title,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (
    /\b(binary triage|reverse-engineering|ghidra|malware|sample)\b/i.test(
      haystack,
    )
  ) {
    return "reverse-engineering";
  }
  if (
    /\b(repo-assimilation|assimilate-repo|repo assimilation)\b/i.test(haystack)
  ) {
    return "repo-assimilation";
  }
  if (/\b(repo-compare|compare-repos|repo compare)\b/i.test(haystack)) {
    return "repo-compare";
  }
  if (/\b(deepresearch|compare|lit-review|research|review)\b/i.test(haystack)) {
    return "research";
  }
  if (/\b(threat-hunt|evidence pack|brief)\b/i.test(haystack)) {
    return "briefing";
  }
  if (
    /\b(second brain|obsidian|heartbeat|export|maintenance)\b/i.test(haystack)
  ) {
    return "archive-maintenance";
  }
  if (
    /\b(teach|explain|study|quiz|practice|review sheet|study brief|lesson)\b/i.test(
      haystack,
    )
  ) {
    return "guided-learning";
  }
  return input.workflowId ? slugify(input.workflowId) : null;
}

function hasLearningSignals(input: ArtifactContinuityInput) {
  const haystack = [
    input.title,
    input.summary,
    input.topic ?? "",
    input.workflowId ?? "",
    input.workflowLabel ?? "",
    input.sourceLabel ?? "",
    input.tags.join(" "),
  ]
    .join(" ")
    .toLowerCase();
  return /\b(teach|explain|study|quiz|practice|review sheet|study brief|lesson|quiz set|learning)\b/i.test(
    haystack,
  );
}

function buildLearningContinuityIdentity(input: ArtifactContinuityInput) {
  const anchor =
    input.workflowId ?? input.topic ?? input.sourceLabel ?? input.title;
  return slugify(anchor || input.summary || "learning-artifact");
}

function hasResearchSignals(input: ArtifactContinuityInput) {
  const haystack = [
    input.title,
    input.summary,
    input.topic ?? "",
    input.workflowId ?? "",
    input.workflowLabel ?? "",
    input.sourceLabel ?? "",
    input.tags.join(" "),
  ]
    .join(" ")
    .toLowerCase();
  return /\b(deepresearch|compare|lit-review|research|review|brief|evidence pack|repo-assimilation|assimilate-repo|repo assimilation|repo-compare|compare-repos|repo compare|vault-librarian|vault librarian)\b/i.test(
    haystack,
  );
}

function buildResearchContinuityIdentity(input: ArtifactContinuityInput) {
  const anchor =
    input.workflowId ??
    input.topic ??
    input.sourceLabel ??
    input.route ??
    input.title;
  return slugify(anchor || input.summary || "research-artifact");
}

function buildSourceQuery(input: ArtifactContinuityInput) {
  return (
    input.topic?.trim() ||
    input.workflowLabel?.trim() ||
    input.workflowId?.trim() ||
    input.title.trim() ||
    null
  );
}

function buildMissionHints(
  input: ArtifactContinuityInput,
  artifactClass: ArtifactContinuityClass,
  capability: AssistantCapabilityId | null,
  workflowClass: string | null,
) {
  return uniqueStrings([
    input.route ? `route:${input.route}` : null,
    input.topic ? `topic:${slugify(input.topic)}` : null,
    capability ? `capability:${capability}` : null,
    workflowClass ? `workflow-class:${workflowClass}` : null,
    input.workflowPackId ? `workflow-pack:${input.workflowPackId}` : null,
    artifactClass ? `artifact:${artifactClass}` : null,
    input.memoryCompartment ? `compartment:${input.memoryCompartment}` : null,
    input.learningMissionMode
      ? `learning-mode:${input.learningMissionMode}`
      : null,
    input.tutorProfile ? `tutor:${input.tutorProfile}` : null,
    input.repoMemoryBinding ? `repo-memory:${input.repoMemoryBinding}` : null,
    input.sourceLabel ? `source:${slugify(input.sourceLabel)}` : null,
    input.sourceType ? `source-type:${input.sourceType}` : null,
    input.evidenceStrength ? `evidence:${input.evidenceStrength}` : null,
  ]);
}

function buildRelatedLinkSeeds(
  input: ArtifactContinuityInput,
  continuityId: string | null,
  capability: AssistantCapabilityId | null,
  workflowClass: string | null,
  artifactClass: ArtifactContinuityClass,
) {
  const tagSeeds = input.tags
    .filter((tag) => tag.length > 2)
    .slice(0, 8)
    .map((tag) => `tag:${slugify(tag)}`);

  return uniqueStrings([
    continuityId ? `continuity:${continuityId}` : null,
    input.route ? `route:${input.route}` : null,
    input.topic ? `topic:${slugify(input.topic)}` : null,
    input.workflowId ? `workflow:${slugify(input.workflowId)}` : null,
    workflowClass ? `workflow-class:${workflowClass}` : null,
    input.workflowPackId ? `workflow-pack:${input.workflowPackId}` : null,
    capability ? `capability:${capability}` : null,
    input.memoryCompartment ? `compartment:${input.memoryCompartment}` : null,
    input.learningMissionMode
      ? `learning-mode:${input.learningMissionMode}`
      : null,
    input.tutorProfile ? `tutor:${input.tutorProfile}` : null,
    input.repoMemoryBinding ? `repo-memory:${input.repoMemoryBinding}` : null,
    input.sourceLabel ? `source:${slugify(input.sourceLabel)}` : null,
    input.sourceType ? `source-type:${input.sourceType}` : null,
    artifactClass ? `artifact:${artifactClass}` : null,
    ...tagSeeds,
  ]);
}

function buildQualitySignals(
  input: ArtifactContinuityInput,
  artifactClass: ArtifactContinuityClass,
  workflowClass: string | null,
  capability: AssistantCapabilityId | null,
) {
  const signals = new Set<string>();
  if (input.route) signals.add(`route:${input.route}`);
  if (input.workflowId) signals.add(`workflow:${input.workflowId}`);
  if (workflowClass) signals.add(`workflow-class:${workflowClass}`);
  if (capability) signals.add(`capability:${capability}`);
  if (input.workflowPackId)
    signals.add(`workflow-pack:${input.workflowPackId}`);
  if (input.memoryCompartment)
    signals.add(`compartment:${input.memoryCompartment}`);
  if (input.learningMissionMode)
    signals.add(`learning-mode:${input.learningMissionMode}`);
  if (input.tutorProfile) signals.add(`tutor:${input.tutorProfile}`);
  if (input.repoMemoryBinding)
    signals.add(`repo-memory:${input.repoMemoryBinding}`);
  if (input.sourceType) signals.add(`source-type:${input.sourceType}`);
  if (input.evidenceStrength) signals.add(`evidence:${input.evidenceStrength}`);
  if (input.tags.length > 0)
    signals.add(`tagged:${Math.min(input.tags.length, 6)}`);
  if (/https?:\/\//i.test(input.content ?? "")) signals.add("cited");
  if (/^#{1,6}\s/m.test(input.content ?? "")) signals.add("sectioned");
  if (/\bsha-?256\b|\bsha-?1\b/i.test(input.content ?? ""))
    signals.add("hash-anchored");
  if (
    /\bioc candidates\b|\burls:\b|\bdomains:\b|\bipv4:\b|\bemails:\b/i.test(
      input.content ?? "",
    )
  ) {
    signals.add("ioc-anchored");
  }
  if (
    /\bbrief\b/i.test(`${input.title} ${input.summary} ${input.topic ?? ""}`)
  ) {
    signals.add("brief-shaped");
  }
  if (artifactClass === "reverse_engineering_prep") signals.add("promotable");
  if (artifactClass === "research_artifact") signals.add("research-ready");
  if (artifactClass === "learning_note") signals.add("study-ready");
  return Array.from(signals);
}

export function buildArtifactContinuityMetadata(
  input: ArtifactContinuityInput,
): ArtifactContinuityMetadata {
  if (isReverseEngineeringBriefArtifact(input)) {
    const continuityId = buildReverseEngineeringContinuityIdentity({
      title: input.title,
      summary: input.summary,
      content: input.content ?? "",
      tags: input.tags,
    });
    const capability: AssistantCapabilityId = "reverse-engineering";
    const workflowClass =
      normalizeWorkflowClass(input) ?? "reverse-engineering";
    return {
      artifactClass: "reverse_engineering_brief",
      continuityId,
      continuityTag: buildReverseEngineeringContinuityTag({
        title: input.title,
        summary: input.summary,
        content: input.content ?? "",
        tags: input.tags,
      }),
      sourceQuery: buildSourceQuery(input),
      capability,
      routeOrigin: input.route?.trim() || null,
      workflowClass,
      workflowPackId: input.workflowPackId ?? null,
      memoryCompartment: input.memoryCompartment ?? null,
      learningMissionMode: input.learningMissionMode ?? null,
      tutorProfile: input.tutorProfile ?? null,
      repoMemoryBinding: input.repoMemoryBinding ?? null,
      sourceRefs: input.sourceRefs ?? [],
      sourceType: input.sourceType ?? null,
      evidenceStrength: input.evidenceStrength ?? null,
      missionHints: buildMissionHints(
        input,
        "reverse_engineering_brief",
        capability,
        workflowClass,
      ),
      relatedLinkSeeds: buildRelatedLinkSeeds(
        input,
        continuityId,
        capability,
        workflowClass,
        "reverse_engineering_brief",
      ),
      promotionKind: null,
      qualitySignals: buildQualitySignals(
        input,
        "reverse_engineering_brief",
        workflowClass,
        capability,
      ),
    };
  }

  if (isBinaryTriageMemoryArtifact(input)) {
    const continuityId = buildReverseEngineeringContinuityIdentity({
      title: input.title,
      summary: input.summary,
      content: input.content ?? "",
      tags: input.tags,
    });
    const capability: AssistantCapabilityId = "reverse-engineering";
    const workflowClass =
      normalizeWorkflowClass(input) ?? "reverse-engineering";
    return {
      artifactClass: "reverse_engineering_prep",
      continuityId,
      continuityTag: buildReverseEngineeringContinuityTag({
        title: input.title,
        summary: input.summary,
        content: input.content ?? "",
        tags: input.tags,
      }),
      sourceQuery: buildSourceQuery(input),
      capability,
      routeOrigin: input.route?.trim() || null,
      workflowClass,
      workflowPackId: input.workflowPackId ?? null,
      memoryCompartment: input.memoryCompartment ?? null,
      learningMissionMode: input.learningMissionMode ?? null,
      tutorProfile: input.tutorProfile ?? null,
      repoMemoryBinding: input.repoMemoryBinding ?? null,
      sourceRefs: input.sourceRefs ?? [],
      sourceType: input.sourceType ?? null,
      evidenceStrength: input.evidenceStrength ?? null,
      missionHints: buildMissionHints(
        input,
        "reverse_engineering_prep",
        capability,
        workflowClass,
      ),
      relatedLinkSeeds: buildRelatedLinkSeeds(
        input,
        continuityId,
        capability,
        workflowClass,
        "reverse_engineering_prep",
      ),
      promotionKind: "reverse_engineering_brief",
      qualitySignals: buildQualitySignals(
        input,
        "reverse_engineering_prep",
        workflowClass,
        capability,
      ),
    };
  }

  if (hasLearningSignals(input)) {
    const artifactClass: ArtifactContinuityClass = /\bquiz\b/i.test(
      `${input.title} ${input.summary} ${input.topic ?? ""}`,
    )
      ? "quiz_set"
      : /\breview sheet\b/i.test(
            `${input.title} ${input.summary} ${input.topic ?? ""}`,
          )
        ? "review_sheet"
        : /\bstudy brief\b/i.test(
              `${input.title} ${input.summary} ${input.topic ?? ""}`,
            )
          ? "study_brief"
          : "learning_note";
    const continuityId = buildLearningContinuityIdentity(input);
    const capability: AssistantCapabilityId =
      input.route === "/vault" ? "memory-palace" : "guided-learning";
    const workflowClass = normalizeWorkflowClass(input) ?? "guided-learning";
    return {
      artifactClass,
      continuityId,
      continuityTag: continuityId
        ? `continuity:learning:${continuityId}`
        : null,
      sourceQuery: buildSourceQuery(input),
      capability,
      routeOrigin: input.route?.trim() || null,
      workflowClass,
      workflowPackId: input.workflowPackId ?? null,
      memoryCompartment: input.memoryCompartment ?? null,
      learningMissionMode: input.learningMissionMode ?? null,
      tutorProfile: input.tutorProfile ?? null,
      repoMemoryBinding: input.repoMemoryBinding ?? null,
      sourceRefs: input.sourceRefs ?? [],
      sourceType: input.sourceType ?? null,
      evidenceStrength: input.evidenceStrength ?? null,
      missionHints: buildMissionHints(
        input,
        artifactClass,
        capability,
        workflowClass,
      ),
      relatedLinkSeeds: buildRelatedLinkSeeds(
        input,
        continuityId,
        capability,
        workflowClass,
        artifactClass,
      ),
      promotionKind: artifactClass === "learning_note" ? "study_brief" : null,
      qualitySignals: buildQualitySignals(
        input,
        artifactClass,
        workflowClass,
        capability,
      ),
    };
  }

  if (hasResearchSignals(input)) {
    const artifactClass =
      input.workflowId === "repo-assimilation" ||
      input.workflowId === "repo-compare" ||
      /\bbrief\b/i.test(`${input.title} ${input.summary} ${input.topic ?? ""}`)
        ? "research_brief"
        : "research_artifact";
    const continuityId = buildResearchContinuityIdentity(input);
    const capability = normalizeCapability(input.route);
    const workflowClass = normalizeWorkflowClass(input) ?? "research";
    return {
      artifactClass,
      continuityId,
      continuityTag: continuityId
        ? `continuity:research:${continuityId}`
        : null,
      sourceQuery: buildSourceQuery(input),
      capability,
      routeOrigin: input.route?.trim() || null,
      workflowClass,
      workflowPackId: input.workflowPackId ?? null,
      memoryCompartment: input.memoryCompartment ?? null,
      learningMissionMode: input.learningMissionMode ?? null,
      tutorProfile: input.tutorProfile ?? null,
      repoMemoryBinding: input.repoMemoryBinding ?? null,
      sourceRefs: input.sourceRefs ?? [],
      sourceType: input.sourceType ?? null,
      evidenceStrength: input.evidenceStrength ?? null,
      missionHints: buildMissionHints(
        input,
        artifactClass,
        capability,
        workflowClass,
      ),
      relatedLinkSeeds: buildRelatedLinkSeeds(
        input,
        continuityId,
        capability,
        workflowClass,
        artifactClass,
      ),
      promotionKind:
        artifactClass === "research_artifact" ? "research_brief" : null,
      qualitySignals: buildQualitySignals(
        input,
        artifactClass,
        workflowClass,
        capability,
      ),
    };
  }

  const capability = normalizeCapability(input.route);
  const workflowClass = normalizeWorkflowClass(input);
  return {
    artifactClass: "archive_note",
    continuityId: null,
    continuityTag: null,
    sourceQuery: buildSourceQuery(input),
    capability,
    routeOrigin: input.route?.trim() || null,
    workflowClass,
    workflowPackId: input.workflowPackId ?? null,
    memoryCompartment: input.memoryCompartment ?? null,
    learningMissionMode: input.learningMissionMode ?? null,
    tutorProfile: input.tutorProfile ?? null,
    repoMemoryBinding: input.repoMemoryBinding ?? null,
    sourceRefs: input.sourceRefs ?? [],
    sourceType: input.sourceType ?? null,
    evidenceStrength: input.evidenceStrength ?? null,
    missionHints: buildMissionHints(
      input,
      "archive_note",
      capability,
      workflowClass,
    ),
    relatedLinkSeeds: buildRelatedLinkSeeds(
      input,
      null,
      capability,
      workflowClass,
      "archive_note",
    ),
    promotionKind: null,
    qualitySignals: buildQualitySignals(
      input,
      "archive_note",
      workflowClass,
      capability,
    ),
  };
}

function ensureContinuityMetadata(
  item: ArtifactContinuityComparable,
): ArtifactContinuityMetadata {
  const existingContinuity: ArtifactContinuityMetadata | null =
    item.continuity ?? null;
  return (
    existingContinuity ??
    buildArtifactContinuityMetadata({
      title: item.title,
      summary: item.summary,
      tags: item.tags,
      route: item.route,
      topic: item.topic,
      sourceLabel: item.sourceLabel,
      workflowId: item.workflowId,
      workflowLabel: item.workflowLabel,
      content: item.content,
    })
  );
}

function countShared(left: string[], right: string[]) {
  if (left.length === 0 || right.length === 0) return 0;
  const rightSet = new Set(right);
  let count = 0;
  for (const value of left) {
    if (rightSet.has(value)) count += 1;
  }
  return count;
}

function isSameArtifact(
  left: ArtifactContinuityComparable,
  right: ArtifactContinuityComparable,
) {
  if (left.id && right.id) return left.id === right.id;
  return left.title === right.title && left.summary === right.summary;
}

export function rankRelatedArtifacts<T extends ArtifactContinuityComparable>(
  current: T,
  items: T[],
  limit = 4,
): RankedArtifactMatch<T>[] {
  const currentMeta = ensureContinuityMetadata(current);

  return items
    .filter((candidate) => !isSameArtifact(current, candidate))
    .map((candidate) => {
      const candidateMeta = ensureContinuityMetadata(candidate);
      let score = 0;
      const reasons: string[] = [];

      if (
        currentMeta.continuityId &&
        candidateMeta.continuityId &&
        currentMeta.continuityId === candidateMeta.continuityId
      ) {
        score += 120;
        reasons.push("shared continuity");
      } else if (
        currentMeta.continuityTag &&
        candidateMeta.continuityTag &&
        currentMeta.continuityTag === candidateMeta.continuityTag
      ) {
        score += 72;
        reasons.push("same continuity tag");
      }

      if (
        currentMeta.workflowClass &&
        candidateMeta.workflowClass &&
        currentMeta.workflowClass === candidateMeta.workflowClass
      ) {
        score += 32;
        reasons.push("same workflow lane");
      }

      if (
        currentMeta.routeOrigin &&
        candidateMeta.routeOrigin &&
        currentMeta.routeOrigin === candidateMeta.routeOrigin
      ) {
        score += 24;
        reasons.push("same route");
      }

      if (
        currentMeta.capability &&
        candidateMeta.capability &&
        currentMeta.capability === candidateMeta.capability
      ) {
        score += 20;
        reasons.push("same capability");
      }

      if (
        currentMeta.memoryCompartment &&
        candidateMeta.memoryCompartment &&
        currentMeta.memoryCompartment === candidateMeta.memoryCompartment
      ) {
        score += 18;
        reasons.push("same memory compartment");
      }

      if (
        currentMeta.learningMissionMode &&
        candidateMeta.learningMissionMode &&
        currentMeta.learningMissionMode === candidateMeta.learningMissionMode
      ) {
        score += 14;
        reasons.push("same learning mode");
      }

      if (
        currentMeta.sourceQuery &&
        candidateMeta.sourceQuery &&
        currentMeta.sourceQuery === candidateMeta.sourceQuery
      ) {
        score += 12;
        reasons.push("same mission query");
      }

      const sharedMissionHints = countShared(
        currentMeta.missionHints,
        candidateMeta.missionHints,
      );
      if (sharedMissionHints > 0) {
        score += Math.min(24, sharedMissionHints * 8);
        reasons.push("mission continuity");
      }

      const sharedLinkSeeds = countShared(
        currentMeta.relatedLinkSeeds,
        candidateMeta.relatedLinkSeeds,
      );
      if (sharedLinkSeeds > 0) {
        score += Math.min(28, sharedLinkSeeds * 7);
        reasons.push("shared link seeds");
      }

      const sharedTags = countShared(current.tags, candidate.tags);
      if (sharedTags > 0) {
        score += Math.min(16, sharedTags * 4);
        reasons.push("shared tags");
      }

      if (
        current.sourceLabel &&
        candidate.sourceLabel &&
        current.sourceLabel === candidate.sourceLabel
      ) {
        score += 6;
        reasons.push("same source");
      }

      return {
        item: candidate,
        score,
        reasons: uniqueStrings(reasons),
      };
    })
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, limit);
}
