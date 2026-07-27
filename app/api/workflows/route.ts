import { NextRequest, NextResponse } from "next/server";
import { listWorkflows, saveWorkflow } from "@/lib/assimilation/storage";
import { parseWorkflowDefinition } from "@/lib/workflowDefinition";

export const dynamic = "force-dynamic";

export async function GET() {
  const workflows = await listWorkflows();
  return NextResponse.json({ workflows });
}

export async function POST(req: NextRequest) {
  try {
    const workflow = parseWorkflowDefinition(await req.json());
    const saved = await saveWorkflow(workflow);
    return NextResponse.json({ workflow: saved });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Workflow payload invalid.",
      },
      { status: 400 },
    );
  }
}
