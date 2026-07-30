"use client";

import { apiFetch } from "@/lib/apiFetch";
import type {
  CorrectionMemoryContent,
  CorrectionMemoryScope,
  CorrectionMemorySensitivity,
} from "@/lib/assistantSessionMemory";
import type { AssistantCapabilityId } from "@/lib/assistantCapabilityRegistry";
import { inferWorkflowPackIdFromText } from "@/lib/workflowPacks";
import type { AgentStep } from "@/lib/agent";
import {
  buildRepoCompareEvidenceStrength,
  buildRepoCompareSourceRefs,
  buildRepoReferenceTag,
  parseRepoCompareTopicReferences,
} from "@/lib/repoCompare";
import {
  buildRepoAssimilationSourceRefs,
  buildRepoAssimilationTags,
  hasRepoAssimilationReadmeSignal,
} from "@/lib/repoAssimilation";
import { buildCitationSourceRefs } from "@/lib/xr1Workflows";
import { normalizeRepoIntelReference } from "@/lib/repoIntel";
import {
  appendEpisodicMemory,
  buildEpisodicMemoryEntry,
} from "@/lib/episodicMemoryStore";
import type { AgentId } from "./types";
import type { HQWorkflowResolution } from "./workflowCommands";
import { deriveWorkflowArtifactSummary } from "./officeCommandCenterConfig";
import type {
  EvidenceStrength,
  ResearchSourceRef,
  ResearchSourceType,
  WorkflowPackId,
} from "@/lib/researchSources";
import { inferEvidenceStrength } from "@/lib/researchSources";
import type { MemoryCompartment } from "@/lib/memoryMining";
import type { HQAssistantIntent, PreparedWorkspaceTarget } from "./types";

interface OfficeRunArgs {
  target: AgentId;
  query: string;
  result: string;
  steps: AgentStep[];
}

interface OfficeWorkflowArtifactArgs extends OfficeRunArgs {
  workflow: HQWorkflowResolution | null;
  artifactOverrides?: {
    title?: string;
    summary?: string;
    sourceLabel?: string;
    topic?: string;
    route?: string;
    workflowPackId?: WorkflowPackId;
    memoryCompartment?: MemoryCompartment;
    sourceRefs?: ResearchSourceRef[];
    sourceType?: ResearchSourceType;
    evidenceStrength?: EvidenceStrength;
    extraTags?: string[];
  };
}

interface OfficeCorrectionProposalArgs extends OfficeRunArgs {
  assistantIntent: HQAssistantIntent;
  capabilityId: AssistantCapabilityId;
  routeHint?: string | null;
  preparedWorkspace?: PreparedWorkspaceTarget | null;
}

export interface OfficeCorrectionProposalDraft {
  scope: Partial<CorrectionMemoryScope>;
  content: CorrectionMemoryContent;
  sensitivity: CorrectionMemorySensitivity;
}

function getToolCallNames(steps: AgentStep[]) {
  return steps
    .filter((step) => step.type === "tool_call")
    .map((step) => (step as { tool?: string }).tool ?? "?")
    .filter(Boolean);
}

function getFirstSubstantiveLine(result: string) {
  return (
    result.split("\n").find((line) => line.trim().length > 40) ??
    result.slice(0, 100)
  );
}

function detectWorkflowPackId(workflow: HQWorkflowResolution) {
  if (workflow.id === "repo-assimilation" || workflow.id === "repo-compare") {
    return "research-workflow";
  }
  if (workflow.id === "vault-weekly") return "second-brain";
  const text =
    `${workflow.id} ${workflow.label} ${workflow.topic} ${workflow.route}`.toLowerCase();
  return (
    inferWorkflowPackIdFromText(text) ??
    (/\b(research|review|source|synthesis|compare|evidence|intel)\b/i.test(text)
      ? "research-workflow"
      : "guided-learning")
  );
}

function detectWorkflowMemoryCompartment(workflow: HQWorkflowResolution) {
  const packId = detectWorkflowPackId(workflow);
  if (packId === "research-workflow") return "research";
  if (
    /\b(study|quiz|practice|teach|explain)\b/i.test(
      `${workflow.id} ${workflow.label} ${workflow.topic}`,
    )
  ) {
    return "study";
  }
  return "conversation";
}

function resolveRepoAssimilationMetadata(
  workflow: HQWorkflowResolution,
  result: string,
) {
  if (workflow.id !== "repo-assimilation") return null;
  const normalized = normalizeRepoIntelReference(workflow.topic);
  if (!normalized.ok) return null;
  const sourceRefs = buildRepoAssimilationSourceRefs({
    normalizedRepoId: normalized.normalizedRepoId,
    sourceUrl: normalized.sourceUrl,
    readmeExcerpt: hasRepoAssimilationReadmeSignal(result) ? "available" : "",
  });
  return {
    repoMemoryBinding: normalized.normalizedRepoId,
    sourceRefs,
    sourceType: "citation" as const,
    evidenceStrength: inferEvidenceStrength({
      sourceType: "citation",
      sourceCount: sourceRefs.length,
      citationCount: sourceRefs.length,
    }),
    extraTags: buildRepoAssimilationTags({
      normalizedRepoId: normalized.normalizedRepoId,
      sourceUrl: normalized.sourceUrl,
      owner: normalized.normalizedRepoId.split("/")[0] ?? "",
      repo: normalized.normalizedRepoId.split("/")[1] ?? "",
      displayName: normalized.normalizedRepoId,
      description: "",
      topics: [],
      stars: 0,
      forks: 0,
      watchers: 0,
      license: null,
      defaultBranch: null,
      languageHints: [],
      inferredStack: [],
      topLevelTree: [],
      readmeExcerpt: "",
      implementationBrief: "",
      warnings: [],
    }),
  };
}

function resolveRepoCompareMetadata(workflow: HQWorkflowResolution) {
  if (workflow.id !== "repo-compare") return null;
  const normalized = parseRepoCompareTopicReferences(workflow.topic);
  if (!normalized.ok) return null;
  const sourceRefs = buildRepoCompareSourceRefs(
    normalized.refs.map((ref) => ({
      normalizedRepoId: ref.normalizedRepoId,
      sourceUrl: ref.sourceUrl,
      owner: ref.normalizedRepoId.split("/")[0] ?? "",
      repo: ref.normalizedRepoId.split("/")[1] ?? "",
      displayName: ref.normalizedRepoId,
      description: "",
      topics: [],
      stars: 0,
      forks: 0,
      watchers: 0,
      license: null,
      defaultBranch: null,
      languageHints: [],
      inferredStack: [],
      topLevelTree: [],
      readmeExcerpt: "",
      implementationBrief: "",
      warnings: [],
    })),
  ).filter((sourceRef) => !sourceRef.href?.endsWith("#readme"));
  return {
    sourceRefs,
    sourceType: "citation" as const,
    evidenceStrength: buildRepoCompareEvidenceStrength(
      normalized.refs.map((ref) => ({
        normalizedRepoId: ref.normalizedRepoId,
        sourceUrl: ref.sourceUrl,
        owner: ref.normalizedRepoId.split("/")[0] ?? "",
        repo: ref.normalizedRepoId.split("/")[1] ?? "",
        displayName: ref.normalizedRepoId,
        description: "",
        topics: [],
        stars: 0,
        forks: 0,
        watchers: 0,
        license: null,
        defaultBranch: null,
        languageHints: [],
        inferredStack: [],
        topLevelTree: [],
        readmeExcerpt: "",
        implementationBrief: "",
        warnings: [],
      })),
    ),
    extraTags: [
      "repo-compare",
      ...normalized.normalizedRepoIds.map(buildRepoReferenceTag),
    ],
  };
}

export function queueOfficeRunSideEffects({
  query,
  result,
  steps,
  target,
  workflow,
  artifactOverrides,
}: OfficeWorkflowArtifactArgs) {
  const toolNames = getToolCallNames(steps).join(", ");
  const memoryNote = [
    `agent:${target}`,
    `q:${query.slice(0, 80)}`,
    `a:${result.slice(0, 120).replace(/\n/g, " ")}`,
    toolNames ? `tools:${toolNames}` : null,
  ]
    .filter(Boolean)
    .join(" | ");

  apiFetch("/api/tools", {
    method: "POST",
    body: JSON.stringify({ tool: "remember", input: { note: memoryNote } }),
  }).catch(() => {
    /* non-fatal */
  });
  // Episodic memory: append a decay-weighted entry for HQ recall (agentmemory pattern).
  try {
    const episodicEntry = buildEpisodicMemoryEntry({
      agent: target,
      query: query.slice(0, 200),
      summary: getFirstSubstantiveLine(result).trim().slice(0, 200),
    });
    void appendEpisodicMemory([], episodicEntry); // store is external; this validates the call shape
  } catch {
    /* best-effort */
  }

  void apiFetch("/api/agent-learnings", {
    method: "POST",
    body: JSON.stringify({
      agent: target,
      query: query.slice(0, 200),
      answer: result.slice(0, 300),
      outcome: "success",
    }),
  }).catch(() => {
    /* best-effort */
  });

  if (!workflow) return;
  if (workflow.outputTarget !== "compiled_memory_page") return;

  const workflowPackId =
    artifactOverrides?.workflowPackId ?? detectWorkflowPackId(workflow);
  const repoAssimilationMetadata = resolveRepoAssimilationMetadata(
    workflow,
    result,
  );
  const repoCompareMetadata = resolveRepoCompareMetadata(workflow);
  const sourceRefs =
    artifactOverrides?.sourceRefs ??
    (repoAssimilationMetadata
      ? repoAssimilationMetadata.sourceRefs
      : repoCompareMetadata
        ? repoCompareMetadata.sourceRefs
        : workflowPackId === "research-workflow"
          ? buildCitationSourceRefs([result])
          : []);
  const evidenceStrength =
    artifactOverrides?.evidenceStrength ??
    (repoAssimilationMetadata
      ? repoAssimilationMetadata.evidenceStrength
      : repoCompareMetadata
        ? repoCompareMetadata.evidenceStrength
        : workflowPackId === "research-workflow"
          ? inferEvidenceStrength({
              sourceType: "memory-spine",
              sourceCount: sourceRefs.length,
              citationCount: sourceRefs.filter(
                (sourceRef) => sourceRef.sourceType === "citation",
              ).length,
            })
          : "unverified");
  const feynmanTags =
    workflow.source === "feynman"
      ? ["feynman-native", "claim-audit", "provenance"]
      : [];

  void apiFetch("/api/memory/pages", {
    method: "POST",
    body: JSON.stringify({
      title:
        artifactOverrides?.title ??
        `${workflow.label} — ${workflow.topic.slice(0, 96)}`,
      summary:
        artifactOverrides?.summary ?? deriveWorkflowArtifactSummary(result),
      content: result,
      source: "workflow",
      sourceLabel:
        artifactOverrides?.sourceLabel ?? `Workflow page · ${workflow.label}`,
      workflowId: workflow.id,
      workflowLabel: workflow.label,
      agentId: target,
      route: artifactOverrides?.route ?? workflow.route,
      topic: artifactOverrides?.topic ?? workflow.topic,
      workflowPackId,
      memoryCompartment:
        artifactOverrides?.memoryCompartment ??
        detectWorkflowMemoryCompartment(workflow),
      sourceType:
        artifactOverrides?.sourceType ??
        repoAssimilationMetadata?.sourceType ??
        "memory-spine",
      evidenceStrength,
      sourceRefs,
      repoMemoryBinding: repoAssimilationMetadata?.repoMemoryBinding,
      tags: [
        "workflow-artifact",
        workflow.id,
        workflow.source,
        target,
        (artifactOverrides?.route ?? workflow.route).replace(/^\//, ""),
        ...feynmanTags,
        ...(repoAssimilationMetadata?.extraTags ?? []),
        ...(repoCompareMetadata?.extraTags ?? []),
        ...(artifactOverrides?.extraTags ?? []),
      ],
    }),
  }).catch(() => {
    /* best-effort */
  });
}

export function buildOfficeRunSessionSummary({
  query,
  result,
  steps,
  target,
}: OfficeRunArgs) {
  const toolCallCount = steps.filter(
    (step) => step.type === "tool_call",
  ).length;
  const firstLine = getFirstSubstantiveLine(result);
  return `${target.toUpperCase()} handled "${query.slice(0, 60).trim()}…" with ${toolCallCount} tool call${toolCallCount === 1 ? "" : "s"}. ${firstLine.trim().slice(0, 150)}`;
}

export function buildOfficeRunLessonProposal({
  query,
  result,
  steps,
  target,
}: OfficeRunArgs) {
  const toolCallCount = steps.filter(
    (step) => step.type === "tool_call",
  ).length;
  if (toolCallCount < 2 || result.length < 150) return null;
  const firstLine = getFirstSubstantiveLine(result);
  return `When handling "${query.slice(0, 60).trim()}…" style queries, ${target.toUpperCase()} used ${toolCallCount} tool calls. Key pattern: ${firstLine.trim().slice(0, 120)}`;
}

function extractRepoFilePath(query: string) {
  return (
    query.match(
      /\b(?:app|components|lib|store|hooks|scripts|tests|docs)\/[A-Za-z0-9._/-]+\.(?:[cm]?tsx?|md|mjs|json)\b/,
    )?.[0] ?? null
  );
}

export function buildOfficeRunCorrectionProposal({
  query,
  result,
  steps,
  target,
  assistantIntent,
  capabilityId,
  routeHint,
  preparedWorkspace,
}: OfficeCorrectionProposalArgs): OfficeCorrectionProposalDraft | null {
  const normalizedQuery = query.trim();
  const toolCallCount = steps.filter(
    (step) => step.type === "tool_call",
  ).length;
  const firstLine = getFirstSubstantiveLine(result).trim();
  if (!normalizedQuery || (!firstLine && toolCallCount === 0)) {
    return null;
  }

  const filePath = extractRepoFilePath(normalizedQuery);
  const routeSurface = routeHint ?? preparedWorkspace?.href ?? null;
  const scope: Partial<CorrectionMemoryScope> = {
    routeSurface,
    agent: target,
    filePathPrefixes: filePath ? [filePath] : [],
    taskType: assistantIntent,
    capability: capabilityId,
  };
  const lower = `${normalizedQuery}\n${firstLine}`.toLowerCase();

  if (assistantIntent === "repo_work" || Boolean(filePath)) {
    return {
      scope,
      sensitivity: "internal",
      content: {
        rule: filePath
          ? `For repo-work turns touching ${filePath}, keep the run anchored to the named file or lane before widening scope.`
          : "For repo-work turns, ground the run in the named file, surface, or implementation lane before widening scope.",
        preferredBehavior:
          "Read the referenced code path first, keep edits bounded to the named lane, and only widen into adjacent files when the operator or the evidence clearly requires it.",
      },
    };
  }

  if (
    assistantIntent === "research" ||
    assistantIntent === "memory_recall" ||
    assistantIntent === "live_current" ||
    /\b(source|sources|citation|cite|evidence|verify|retriev|research)\b/i.test(
      lower,
    )
  ) {
    return {
      scope,
      sensitivity: "safe",
      content: {
        rule: "For evidence-heavy research turns, keep observed facts and inferred reasoning separated instead of blending them into one confidence lane.",
        preferredBehavior:
          "Lead with the verified answer, cite the strongest retrieved evidence, and keep verify-next actions compact instead of burying them in the body.",
      },
    };
  }

  if (
    /\b(local|isolated|offline|privacy|shield|redact|mask|inside the network|no cloud)\b/i.test(
      lower,
    )
  ) {
    return {
      scope,
      sensitivity: "restricted",
      content: {
        rule: "For privacy-sensitive turns, keep cloud dispatch constrained and protect local identifiers before anything leaves the box.",
        preferredBehavior:
          "Prefer local inference when available, redact local hosts and protected paths on cloud-bound turns, and fail closed when the payload still carries sensitive evidence.",
      },
    };
  }

  if (
    preparedWorkspace ||
    assistantIntent === "archive_continuity" ||
    /\b(continue|resume|pick up|handoff|exact session|same lane|continuity)\b/i.test(
      lower,
    )
  ) {
    return {
      scope,
      sensitivity: "internal",
      content: {
        rule: "For continuity turns, preserve the active lane and the prepared workspace instead of resetting the operator back to a broad route.",
        preferredBehavior:
          "Keep the answer tied to the prepared session, state the next move clearly, and only widen into other surfaces when the operator explicitly asks for it.",
      },
    };
  }

  return null;
}
