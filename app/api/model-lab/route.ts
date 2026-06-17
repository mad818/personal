import { NextRequest, NextResponse } from "next/server";
import { listModelLabRuns, saveModelLabRun } from "@/lib/assimilation/storage";
import {
  flattenZodIssues,
  modelLabCreateRequestSchema,
} from "@/lib/assimilation/contracts";
import { buildPassiveModelSafetyRun } from "@/lib/modelSafetyEvaluation";

export const dynamic = "force-dynamic";

export async function GET() {
  const runs = await listModelLabRuns();
  return NextResponse.json({
    runs,
    meta: {
      support: "internal",
      surface: "model-lab-passive-safety",
      storage: "local-file",
      validation: "zod",
      simulation: {
        mode: "derived",
        label: "Passive local safety evaluation",
      },
      warnings: [
        "Model Lab never modifies model weights or applies steering vectors.",
        "No telemetry, model upload, or remote code execution is permitted.",
        "No raw jailbreak prompts, leaked system prompts, or public datasets are stored.",
      ],
      timestamp: Date.now(),
    },
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const parsed = modelLabCreateRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        error: "Passive Model Lab request is invalid.",
        issues: flattenZodIssues(parsed.error),
      },
      { status: 400 },
    );
  }

  const run = buildPassiveModelSafetyRun({
    id: `lab-${Date.now()}`,
    title: parsed.data.title,
    mutationFamilies: parsed.data.mutationFamilies,
    models: parsed.data.models,
    promptLabel: parsed.data.promptLabel,
    createdAt: new Date().toISOString(),
    operatorNotes: parsed.data.operatorNotes,
    sourceFamilies: parsed.data.sourceFamilies,
    threatProbe: parsed.data.threatProbe,
  });
  await saveModelLabRun(run);
  return NextResponse.json({ run });
}
