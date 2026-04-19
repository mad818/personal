import type { AgentId, HQAssistantIntent, PreparedWorkspaceTarget } from "@/components/home/office/types";
import type { ResearchSourceRef } from "@/lib/researchSources";
import { buildCitationSourceRefs } from "@/lib/xr1Workflows";

export interface VaultCaptureSuggestion {
  title: string;
  summary: string;
  tags: string[];
  routeHint?: string | null;
  sourceRefs: ResearchSourceRef[];
}

function trimInline(value: string, max = 180) {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= max) return normalized;
  return `${normalized.slice(0, max - 1).trimEnd()}…`;
}

function firstMeaningfulLine(value: string) {
  return (
    value
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find((line) => line.length > 0) ?? ""
  );
}

function routeFromPreparedWorkspace(preparedWorkspace?: PreparedWorkspaceTarget | null) {
  const href = preparedWorkspace?.href?.trim();
  if (!href) return null;
  try {
    return new URL(href, "http://nexus.local").pathname;
  } catch {
    return href.startsWith("/") ? href.split("?")[0] ?? href : null;
  }
}

function inferCaptureTags(input: {
  query: string;
  result: string;
  agentId: AgentId;
  assistantIntent?: HQAssistantIntent;
}) {
  const signal = `${input.query} ${input.result}`.toLowerCase();
  const tags = [
    "hq-capture",
    input.agentId,
    input.assistantIntent ?? "conversation",
  ];

  if (/\b(signal|signals)\b/.test(signal)) tags.push("signal");
  if (/\b(decision|recommend|verdict|pick|choose)\b/.test(signal)) tags.push("decision");
  if (/\b(threat|incident|containment|evidence|ioc|cve)\b/.test(signal)) tags.push("threat");
  if (/\b(research|brief|findings|counter-signals|sources?)\b/.test(signal)) tags.push("research");
  if (/\b(playbook|rule|operator|next step|repair)\b/.test(signal)) tags.push("operator-note");

  return Array.from(new Set(tags));
}

export function buildVaultCaptureSuggestion(input: {
  query: string;
  result: string;
  agentId: AgentId;
  assistantIntent?: HQAssistantIntent;
  preparedWorkspace?: PreparedWorkspaceTarget | null;
  suppress?: boolean;
}): VaultCaptureSuggestion | null {
  if (input.suppress) return null;
  if (input.result.trim().length < 160) return null;

  const classifierSignal = `${input.query}\n${input.result}`.toLowerCase();
  const looksStructured =
    /^[-*]\s+/m.test(input.result) ||
    /^\d+\.\s+/m.test(input.result) ||
    /^#+\s+/m.test(input.result);
  const looksReusable = /\b(signal|decision|recommend|threat|research|brief|takeaway|verdict|repair|operator|watch items|evidence)\b/.test(
    classifierSignal,
  );

  if (!looksStructured && !looksReusable) return null;

  const titleSeed = firstMeaningfulLine(input.result).replace(/^#+\s*/, "");
  const title =
    trimInline(titleSeed || input.query || `${input.agentId.toUpperCase()} archive capture`, 88);
  const summary = trimInline(
    input.result
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, 2)
      .join(" "),
    200,
  );

  return {
    title,
    summary,
    tags: inferCaptureTags(input),
    routeHint: routeFromPreparedWorkspace(input.preparedWorkspace),
    sourceRefs: buildCitationSourceRefs([input.result]).slice(0, 6),
  };
}
