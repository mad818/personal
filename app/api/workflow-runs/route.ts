import { NextRequest, NextResponse } from "next/server";
import {
  listRegistryItems,
  listWorkflowRuns,
  listWorkflows,
  saveRegistryItem,
  saveWorkflowRun,
} from "@/lib/assimilation/storage";
import type {
  ArtifactStatus,
  OutputArtifact,
  RegistryItem,
  WorkflowDefinition,
  WorkflowRun,
} from "@/lib/assimilation/types";
import { workflowRunRequestSchema } from "@/lib/assimilation/contracts";
import {
  applyWorkbenchRateLimit,
  createWorkbenchMeta,
  parseWorkbenchPayload,
  workbenchError,
  workbenchJson,
} from "@/lib/assimilation/http";

export const dynamic = "force-dynamic";

const RATE_LIMIT = {
  bucket: "workbench-workflow-runs",
  windowMs: 60_000,
  maxAttempts: 45,
  includeBearerToken: false,
} as const;

function artifactTarget(detail: string): OutputArtifact["target"] {
  const lower = detail.toLowerCase();
  if (lower.includes("vault")) return "vault";
  if (lower.includes("download")) return "download";
  if (lower.includes("review")) return "review";
  return "notification";
}

function buildRun(workflow: WorkflowDefinition): WorkflowRun {
  const runId = `run-${workflow.id}-${Date.now()}`;
  const startedAt = new Date().toISOString();
  const steps = workflow.nodes.map((node, index) => {
    const durationMs = 320 + index * 110;
    return {
      id: `${workflow.id}-step-${node.id}`,
      label: node.title,
      kind: node.type,
      status: "completed" as const,
      startedAt,
      finishedAt: new Date(Date.now() + durationMs).toISOString(),
      durationMs,
      summary: `${node.title} completed with ${workflow.approvalMode} posture.`,
    };
  });
  const artifacts: OutputArtifact[] = workflow.nodes
    .filter((node) => node.type === "sink")
    .map((node, index) => {
      const status: ArtifactStatus =
        workflow.approvalMode === "human_gate" ? "draft" : "approved";
      return {
        id: `${workflow.id}-artifact-${index}`,
        workflowId: workflow.id,
        workflowRunId: runId,
        title: `${workflow.name} — ${node.title}`,
        kind: "evidence_pack",
        target: artifactTarget(node.detail),
        status,
        summary: node.detail,
        createdAt: new Date().toISOString(),
      };
    });

  return {
    id: runId,
    workflowId: workflow.id,
    workflowName: workflow.name,
    status: "completed",
    startedAt,
    finishedAt: new Date().toISOString(),
    durationMs: steps.reduce((sum, step) => sum + step.durationMs, 0),
    theater: workflow.theater,
    summary: `${workflow.name} ran through ${steps.length} nodes and produced ${artifacts.length} artifact(s).`,
    steps,
    artifacts,
  };
}

async function createArtifactItems(run: WorkflowRun) {
  const existing = await listRegistryItems();
  await Promise.all(
    run.artifacts.map(async (artifact) => {
      const next: RegistryItem = {
        id: `${artifact.id}-registry`,
        title: artifact.title,
        type: artifact.kind,
        summary: artifact.summary,
        owner: "Workflow Forge",
        custody: "Vault",
        costTier: "free_local",
        status: artifact.status === "approved" ? "ready" : "draft",
        license: "Internal",
        tags: [run.theater, "workflow-artifact"],
        savedFilter: "artifacts",
        lastReviewedAt: new Date().toISOString(),
        notes: `Derived from ${run.workflowName}. Existing registry count: ${existing.length}.`,
      };
      await saveRegistryItem(next);
    }),
  );
}

export async function GET(req: NextRequest) {
  const meta = createWorkbenchMeta({
    surface: "workflow-runs",
    simulation: "derived",
    warnings: [
      "Workflow run steps and artifact summaries are currently synthesized from the saved graph definition.",
    ],
  });
  const rateLimited = applyWorkbenchRateLimit(req, RATE_LIMIT, meta);
  if (rateLimited) return rateLimited;

  const runs = await listWorkflowRuns();
  return workbenchJson(meta, { runs });
}

export async function POST(req: NextRequest) {
  const meta = createWorkbenchMeta({
    surface: "workflow-runs",
    simulation: "derived",
    warnings: [
      "Workflow run steps and artifact summaries are currently synthesized from the saved graph definition.",
    ],
  });
  const rateLimited = applyWorkbenchRateLimit(req, RATE_LIMIT, meta);
  if (rateLimited) return rateLimited;

  const parsed = parseWorkbenchPayload(
    workflowRunRequestSchema,
    await req.json(),
    meta,
  );
  if (!parsed.ok) return parsed.response;

  const workflows = await listWorkflows();
  const workflow = workflows.find((entry) => entry.id === parsed.data.workflowId);
  if (!workflow) {
    return workbenchError(meta, {
      status: 404,
      code: "not_found",
      message: "Workflow not found.",
    });
  }
  const run = buildRun(workflow);
  await saveWorkflowRun(run);
  await createArtifactItems(run);
  return workbenchJson(meta, { run });
}
