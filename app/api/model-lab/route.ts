import { NextRequest, NextResponse } from "next/server";
import { listModelLabRuns, saveModelLabRun } from "@/lib/assimilation/storage";
import type { ModelLabRun, ModelLabVariantResult } from "@/lib/assimilation/types";
import { modelLabCreateRequestSchema } from "@/lib/assimilation/contracts";
import {
  applyWorkbenchRateLimit,
  createWorkbenchMeta,
  parseWorkbenchPayload,
  workbenchJson,
} from "@/lib/assimilation/http";

export const dynamic = "force-dynamic";

const RATE_LIMIT = {
  bucket: "workbench-model-lab",
  windowMs: 60_000,
  maxAttempts: 30,
  includeBearerToken: false,
} as const;

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

export async function GET(req: NextRequest) {
  const meta = createWorkbenchMeta({
    surface: "blacksite-lab",
    simulation: "derived",
    warnings: [
      "Blacksite variant scores are heuristic pressure-test outputs and are not provider-backed benchmark runs.",
    ],
  });
  const rateLimited = applyWorkbenchRateLimit(req, RATE_LIMIT, meta);
  if (rateLimited) return rateLimited;

  const runs = await listModelLabRuns();
  return workbenchJson(meta, { runs });
}

export async function POST(req: NextRequest) {
  const meta = createWorkbenchMeta({
    surface: "blacksite-lab",
    simulation: "derived",
    warnings: [
      "Blacksite variant scores are heuristic pressure-test outputs and are not provider-backed benchmark runs.",
    ],
  });
  const rateLimited = applyWorkbenchRateLimit(req, RATE_LIMIT, meta);
  if (rateLimited) return rateLimited;

  const parsed = parseWorkbenchPayload(
    modelLabCreateRequestSchema,
    await req.json(),
    meta,
  );
  if (!parsed.ok) return parsed.response;

  const body = parsed.data;

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
  return workbenchJson(meta, { run });
}
