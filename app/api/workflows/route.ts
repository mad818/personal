import { NextRequest, NextResponse } from "next/server";
import { listWorkflows, saveWorkflow } from "@/lib/assimilation/storage";
import { workflowDefinitionSchema } from "@/lib/assimilation/contracts";
import {
  applyWorkbenchRateLimit,
  createWorkbenchMeta,
  parseWorkbenchPayload,
  workbenchJson,
} from "@/lib/assimilation/http";

export const dynamic = "force-dynamic";

const RATE_LIMIT = {
  bucket: "workbench-workflows",
  windowMs: 60_000,
  maxAttempts: 60,
  includeBearerToken: false,
} as const;

export async function GET(req: NextRequest) {
  const meta = createWorkbenchMeta({
    surface: "workflow-forge",
    simulation: "seeded",
    warnings: [
      "Workflow templates are persisted locally and initially bootstrapped from repo seed data.",
    ],
  });
  const rateLimited = applyWorkbenchRateLimit(req, RATE_LIMIT, meta);
  if (rateLimited) return rateLimited;

  const workflows = await listWorkflows();
  return workbenchJson(meta, { workflows });
}

export async function POST(req: NextRequest) {
  const meta = createWorkbenchMeta({
    surface: "workflow-forge",
    simulation: "seeded",
    warnings: [
      "Workflow templates are persisted locally and initially bootstrapped from repo seed data.",
    ],
  });
  const rateLimited = applyWorkbenchRateLimit(req, RATE_LIMIT, meta);
  if (rateLimited) return rateLimited;

  const parsed = parseWorkbenchPayload(
    workflowDefinitionSchema,
    await req.json(),
    meta,
  );
  if (!parsed.ok) return parsed.response;

  const saved = await saveWorkflow(parsed.data);
  return workbenchJson(meta, { workflow: saved });
}
