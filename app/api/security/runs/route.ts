import { NextRequest, NextResponse } from "next/server";
import { listSecurityRuns, saveSecurityRun } from "@/lib/assimilation/storage";
import { securityRunSchema } from "@/lib/assimilation/contracts";
import {
  applyWorkbenchRateLimit,
  createWorkbenchMeta,
  parseWorkbenchPayload,
  workbenchJson,
} from "@/lib/assimilation/http";

export const dynamic = "force-dynamic";

const RATE_LIMIT = {
  bucket: "workbench-security-runs",
  windowMs: 60_000,
  maxAttempts: 45,
  includeBearerToken: false,
} as const;

export async function GET(req: NextRequest) {
  const meta = createWorkbenchMeta({
    surface: "security-doctrine",
    simulation: "seeded",
    warnings: [
      "Security run history is local to this workspace and may mix seeded examples with operator-entered records.",
    ],
  });
  const rateLimited = applyWorkbenchRateLimit(req, RATE_LIMIT, meta);
  if (rateLimited) return rateLimited;

  const runs = await listSecurityRuns();
  return workbenchJson(meta, { runs });
}

export async function POST(req: NextRequest) {
  const meta = createWorkbenchMeta({
    surface: "security-doctrine",
    simulation: "seeded",
    warnings: [
      "Security run history is local to this workspace and may mix seeded examples with operator-entered records.",
    ],
  });
  const rateLimited = applyWorkbenchRateLimit(req, RATE_LIMIT, meta);
  if (rateLimited) return rateLimited;

  const parsed = parseWorkbenchPayload(securityRunSchema, await req.json(), meta);
  if (!parsed.ok) return parsed.response;

  const saved = await saveSecurityRun(parsed.data);
  return workbenchJson(meta, { run: saved });
}
