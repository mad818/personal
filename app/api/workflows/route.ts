import { NextRequest, NextResponse } from "next/server";
import { listWorkflows, saveWorkflow } from "@/lib/assimilation/storage";
import type { WorkflowDefinition } from "@/lib/assimilation/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const workflows = await listWorkflows();
  return NextResponse.json({ workflows });
}

export async function POST(req: NextRequest) {
  const workflow = (await req.json()) as WorkflowDefinition;
  const saved = await saveWorkflow(workflow);
  return NextResponse.json({ workflow: saved });
}
