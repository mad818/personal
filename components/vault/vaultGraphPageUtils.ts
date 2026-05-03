"use client";

import type {
  AgentId,
  VaultGraphData,
  VaultItemMetadata,
} from "@/components/home/office/types";
import type { ArtifactClassification } from "@/lib/artifactClassification";
import type { ArtifactContinuityMetadata } from "@/lib/artifactContinuity";

export interface CompiledMemoryPageSummary {
  documentMetadata?: {
    originLabel?: string;
    mimeType?: string;
    pageCount?: number;
    metadataWithheld?: boolean;
  };
  researchSignals: {
    sourceCount: number;
    citationCount: number;
    structure: "light" | "structured" | "document_heavy";
    referencedDomains: string[];
    sectionHeadings: string[];
    documentHints: string[];
    signalsWithheld?: boolean;
  };
  id: string;
  title: string;
  summary: string;
  contentPreview: string;
  source: "workflow" | "manual" | "scheduler";
  sourceLabel: string;
  workflowId?: string;
  workflowLabel?: string;
  agentId?: string;
  route?: string;
  topic?: string;
  layer: "raw" | "knowledge" | "output";
  domain: string;
  visibility: "safe" | "internal" | "restricted";
  tags: string[];
  continuity: ArtifactContinuityMetadata;
  artifactClassification: ArtifactClassification;
  createdAt: number;
  updatedAt: number;
  content?: string;
  contentWithheld?: boolean;
}

const GRAPH_AGENT_IDS: AgentId[] = ["jansky", "orbit", "nova", "cipher", "flux"];

export type GraphSourceFilter = "all" | "clips" | "compiled";
export type GraphVisibilityFilter = "all" | "safe" | "sensitive" | "restricted";

export const VAULT_GRAPH_FILTERS_STORAGE_KEY = "nexus:vault-graph-filters:v1";

export const GRAPH_TYPE_COLORS: Record<string, string> = {
  note: "#4f6ef7",
  report: "#10b981",
  clip: "#f59e0b",
  task: "#ef4444",
  other: "#6875a0",
};

export const GRAPH_VISIBILITY_COLORS: Record<"safe" | "internal" | "restricted", string> = {
  safe: "#10b981",
  internal: "#f59e0b",
  restricted: "#ef4444",
};

export const GRAPH_FILTER_PRESETS: Array<{
  id: string;
  label: string;
  source: GraphSourceFilter;
  visibility: GraphVisibilityFilter;
}> = [
  { id: "balanced", label: "Balanced", source: "all", visibility: "all" },
  { id: "safe-only", label: "Safe only", source: "all", visibility: "safe" },
  { id: "compiled-research", label: "Compiled research", source: "compiled", visibility: "all" },
  { id: "restricted-topology", label: "Restricted topology", source: "all", visibility: "restricted" },
];

export function buildVaultGraphFocusHref(input?: {
  nodeId?: string | null;
  graphAudit?: string | null;
}) {
  const params = new URLSearchParams();
  params.set("focus", "vault-graph-focus");
  const nodeId = input?.nodeId?.trim();
  const graphAudit = input?.graphAudit?.trim();
  if (nodeId) {
    params.set("nodeId", nodeId);
  }
  if (graphAudit) {
    params.set("graphAudit", graphAudit);
  }
  return `/vault?${params.toString()}`;
}

function isGraphSourceFilter(value: unknown): value is GraphSourceFilter {
  return value === "all" || value === "clips" || value === "compiled";
}

function isGraphVisibilityFilter(value: unknown): value is GraphVisibilityFilter {
  return (
    value === "all" ||
    value === "safe" ||
    value === "sensitive" ||
    value === "restricted"
  );
}

export function coerceStoredGraphFilters(value: unknown): {
  source: GraphSourceFilter;
  visibility: GraphVisibilityFilter;
} | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as { source?: unknown; visibility?: unknown };
  return isGraphSourceFilter(candidate.source) &&
    isGraphVisibilityFilter(candidate.visibility)
    ? {
        source: candidate.source,
        visibility: candidate.visibility,
      }
    : null;
}

export function resetGraphFiltersToBalanced() {
  return {
    source: "all" as GraphSourceFilter,
    visibility: "all" as GraphVisibilityFilter,
  };
}

function toGraphAgentId(agentId?: string): AgentId | undefined {
  return agentId && GRAPH_AGENT_IDS.includes(agentId as AgentId)
    ? (agentId as AgentId)
    : undefined;
}

export function toCompiledPageGraphNode(
  page: CompiledMemoryPageSummary,
): VaultItemMetadata {
  const documentHeavy =
    page.researchSignals.structure === "document_heavy" ||
    Boolean(page.documentMetadata?.pageCount) ||
    page.researchSignals.documentHints.length >= 2;
  const sourceType: VaultItemMetadata["sourceType"] =
    documentHeavy || page.documentMetadata?.mimeType?.includes("pdf")
      ? "paper"
      : page.source === "manual" && page.researchSignals.structure === "light"
        ? "note"
        : "report";

  return {
    id: `page:${page.id}`,
    title: page.title,
    tags:
      page.visibility === "restricted"
        ? []
        : page.tags.filter(Boolean).slice(0, 10),
    timestamp: page.updatedAt,
    agentId: toGraphAgentId(page.agentId),
    type: sourceType === "note" ? "note" : "report",
    visibility: page.visibility,
    originKind: "compiled_page",
    namespace: "user",
    sourceType,
    tldr:
      page.visibility === "restricted"
        ? "Restricted compiled memory page."
        : page.summary,
  };
}

function matchesGraphSourceFilter(
  node: VaultItemMetadata,
  filter: GraphSourceFilter,
) {
  if (filter === "all") return true;
  if (filter === "clips") return node.originKind === "saved_article";
  return node.originKind === "compiled_page";
}

function matchesGraphVisibilityFilter(
  node: VaultItemMetadata,
  filter: GraphVisibilityFilter,
) {
  const visibility = node.visibility ?? "safe";
  if (filter === "all") return true;
  if (filter === "safe") return visibility === "safe";
  if (filter === "restricted") return visibility === "restricted";
  return visibility === "internal" || visibility === "restricted";
}

export function filterVaultGraph(
  graph: VaultGraphData | null,
  sourceFilter: GraphSourceFilter,
  visibilityFilter: GraphVisibilityFilter,
): VaultGraphData | null {
  if (!graph) return null;
  const nodes = graph.nodes.filter(
    (node) =>
      matchesGraphSourceFilter(node, sourceFilter) &&
      matchesGraphVisibilityFilter(node, visibilityFilter),
  );
  const nodeIds = new Set(nodes.map((node) => node.id));
  const edges = graph.edges.filter(
    (edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target),
  );
  const clusters = graph.clusters
    .map((cluster) => cluster.filter((id) => nodeIds.has(id)))
    .filter((cluster) => cluster.length > 1);
  const orphans = graph.orphans.filter((id) => nodeIds.has(id));
  return {
    ...graph,
    nodes,
    edges,
    clusters,
    orphans,
  };
}

export function buildCompiledPageGraphText(page: CompiledMemoryPageSummary) {
  if (page.visibility === "restricted") {
    return [
      "restricted compiled memory page",
      page.layer,
      page.domain,
      page.workflowLabel ?? "",
    ]
      .filter(Boolean)
      .join(" ");
  }

  return [
    page.title,
    page.summary,
    page.contentPreview,
    page.topic ?? "",
    page.workflowLabel ?? "",
    page.sourceLabel,
    page.artifactClassification.artifactType,
    page.artifactClassification.parserHint,
    page.artifactClassification.sensitivity,
    page.documentMetadata?.metadataWithheld ? "" : page.documentMetadata?.originLabel ?? "",
    page.documentMetadata?.metadataWithheld ? "" : page.documentMetadata?.mimeType ?? "",
    page.documentMetadata?.metadataWithheld || !page.documentMetadata?.pageCount
      ? ""
      : `${page.documentMetadata.pageCount} pages`,
    page.researchSignals.signalsWithheld
      ? ""
      : page.researchSignals.referencedDomains.join(" "),
    page.researchSignals.signalsWithheld
      ? ""
      : page.researchSignals.sectionHeadings.join(" "),
  ]
    .filter(Boolean)
    .join(" ");
}
