"use client";

import { apiFetch } from "@/lib/apiFetch";
import { inferWorkflowPackIdFromText } from "@/lib/workflowPacks";
import type { AgentStep } from "@/lib/agent";
import type { AgentId } from "./types";
import type { HQWorkflowResolution } from "./workflowCommands";
import { deriveWorkflowArtifactSummary } from "./officeCommandCenterConfig";

interface OfficeRunArgs {
  target: AgentId;
  query: string;
  result: string;
  steps: AgentStep[];
}

interface OfficeWorkflowArtifactArgs extends OfficeRunArgs {
  workflow: HQWorkflowResolution | null;
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

export function queueOfficeRunSideEffects({
  query,
  result,
  steps,
  target,
  workflow,
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

  void apiFetch("/api/memory/pages", {
    method: "POST",
    body: JSON.stringify({
      title: `${workflow.label} — ${workflow.topic.slice(0, 96)}`,
      summary: deriveWorkflowArtifactSummary(result),
      content: result,
      source: "workflow",
      sourceLabel: `Workflow page · ${workflow.label}`,
      workflowId: workflow.id,
      workflowLabel: workflow.label,
      agentId: target,
      route: workflow.route,
      topic: workflow.topic,
      workflowPackId: detectWorkflowPackId(workflow),
      memoryCompartment: detectWorkflowMemoryCompartment(workflow),
      sourceType: "memory-spine",
      evidenceStrength:
        detectWorkflowPackId(workflow) === "research-workflow"
          ? "contextual"
          : "unverified",
      tags: [
        "workflow-artifact",
        workflow.id,
        workflow.source,
        target,
        workflow.route.replace(/^\//, ""),
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
