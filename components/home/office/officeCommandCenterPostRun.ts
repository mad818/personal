"use client";

import { apiFetch } from "@/lib/apiFetch";
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
  const text = `${workflow.id} ${workflow.label} ${workflow.topic} ${workflow.route}`.toLowerCase();
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
  if (/\b(study|quiz|practice|teach|explain)\b/i.test(`${workflow.id} ${workflow.label} ${workflow.topic}`)) {
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
  const repoAssimilationMetadata = resolveRepoAssimilationMetadata(workflow, result);
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
  const evidenceStrength = artifactOverrides?.evidenceStrength ?? (repoAssimilationMetadata
    ? repoAssimilationMetadata.evidenceStrength
    : repoCompareMetadata
      ? repoCompareMetadata.evidenceStrength
    : workflowPackId === "research-workflow"
      ? inferEvidenceStrength({
          sourceType: "memory-spine",
          sourceCount: sourceRefs.length,
          citationCount: sourceRefs.filter((sourceRef) => sourceRef.sourceType === "citation").length,
        })
      : "unverified");

  void apiFetch("/api/memory/pages", {
    method: "POST",
    body: JSON.stringify({
      title:
        artifactOverrides?.title ??
        `${workflow.label} — ${workflow.topic.slice(0, 96)}`,
      summary: artifactOverrides?.summary ?? deriveWorkflowArtifactSummary(result),
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
  const toolCallCount = steps.filter((step) => step.type === "tool_call").length;
  const firstLine = getFirstSubstantiveLine(result);
  return `${target.toUpperCase()} handled "${query.slice(0, 60).trim()}…" with ${toolCallCount} tool call${toolCallCount === 1 ? "" : "s"}. ${firstLine.trim().slice(0, 150)}`;
}

export function buildOfficeRunLessonProposal({
  query,
  result,
  steps,
  target,
}: OfficeRunArgs) {
  const toolCallCount = steps.filter((step) => step.type === "tool_call").length;
  if (toolCallCount < 2 || result.length < 150) return null;
  const firstLine = getFirstSubstantiveLine(result);
  return `When handling "${query.slice(0, 60).trim()}…" style queries, ${target.toUpperCase()} used ${toolCallCount} tool calls. Key pattern: ${firstLine.trim().slice(0, 120)}`;
}
