import { NextRequest, NextResponse } from "next/server";
import { flattenZodIssues } from "@/lib/assimilation/contracts";
import { runtimeExperimentDecisionInputSchema } from "@/lib/runtimeExperimentContracts";
import {
  buildRuntimeExperimentWorkbenchMeta,
  readRuntimeExperimentPayload,
  recordRuntimeExperimentDecision,
} from "@/lib/runtimeExperimentLedger";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const limit = Math.max(
    5,
    Math.min(60, Number(url.searchParams.get("limit") ?? 12)),
  );
  const payload = readRuntimeExperimentPayload(limit);
  return NextResponse.json({
    status: "ok",
    ...payload,
    meta: buildRuntimeExperimentWorkbenchMeta(),
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const parsed = runtimeExperimentDecisionInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        error: "Runtime experiment decision is invalid.",
        issues: flattenZodIssues(parsed.error),
      },
      { status: 400 },
    );
  }

  const result = await recordRuntimeExperimentDecision(parsed.data);
  if (!result.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: result.error,
        reasons: result.reasons ?? [],
      },
      { status: result.status },
    );
  }

  return NextResponse.json({
    ok: true,
    decision: result.decision,
    meta: buildRuntimeExperimentWorkbenchMeta(),
  });
}
