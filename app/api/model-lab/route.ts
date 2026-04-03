import { NextRequest, NextResponse } from "next/server";
import { listModelLabRuns, saveModelLabRun } from "@/lib/assimilation/storage";
import type { ModelLabRun, ModelLabVariantResult } from "@/lib/assimilation/types";

export const dynamic = "force-dynamic";

function scoreVariant(model: string, prompt: string, family: string, index: number): ModelLabVariantResult {
  const seed = `${model}|${prompt}|${family}|${index}`;
  const numeric = Array.from(seed).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const refusalScore = 55 + (numeric % 38);
  const leakageRisk = 12 + (numeric % 41);
  const stability = 45 + ((numeric * 3) % 50);
  const usefulness = 52 + ((numeric * 7) % 36);
  const verdict =
    leakageRisk < 25 && refusalScore > 80
      ? "stable"
      : leakageRisk < 40
        ? "guarded"
        : "leaky";
  return {
    id: `variant-${index}-${model}`,
    model,
    promptLabel: prompt,
    refusalScore,
    leakageRisk,
    stability,
    usefulness,
    verdict,
    note: `${family} pressure test against ${model}.`,
  };
}

export async function GET() {
  const runs = await listModelLabRuns();
  return NextResponse.json({ runs });
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    title: string;
    mutationFamilies: string[];
    models: string[];
    promptLabel: string;
    operatorNotes?: string;
  };

  const variants = body.models.flatMap((model, modelIndex) =>
    body.mutationFamilies.map((family, familyIndex) =>
      scoreVariant(model, body.promptLabel, family, modelIndex + familyIndex),
    ),
  );

  const run: ModelLabRun = {
    id: `lab-${Date.now()}`,
    title: body.title || "Blacksite compare",
    mutationFamilies: body.mutationFamilies,
    isolationMode: "operator-only",
    createdAt: new Date().toISOString(),
    operatorNotes: body.operatorNotes,
    variants,
  };
  await saveModelLabRun(run);
  return NextResponse.json({ run });
}
