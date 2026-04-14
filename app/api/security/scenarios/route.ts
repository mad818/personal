import { NextRequest, NextResponse } from "next/server";
import {
  listSecurityScenarios,
  saveSecurityScenario,
} from "@/lib/assimilation/storage";
import { securityScenarioSchema } from "@/lib/assimilation/contracts";
import {
  applyWorkbenchRateLimit,
  createWorkbenchMeta,
  parseWorkbenchPayload,
  workbenchJson,
} from "@/lib/assimilation/http";

export const dynamic = "force-dynamic";

const RATE_LIMIT = {
  bucket: "workbench-security-scenarios",
  windowMs: 60_000,
  maxAttempts: 45,
  includeBearerToken: false,
} as const;

export async function GET(req: NextRequest) {
  const meta = createWorkbenchMeta({
    surface: "security-doctrine",
    simulation: "seeded",
    warnings: [
      "Security doctrine entries are locally persisted and may begin from seeded baseline scenarios.",
    ],
  });
  const rateLimited = applyWorkbenchRateLimit(req, RATE_LIMIT, meta);
  if (rateLimited) return rateLimited;

  const scenarios = await listSecurityScenarios();
  return workbenchJson(meta, { scenarios });
}

export async function POST(req: NextRequest) {
  const meta = createWorkbenchMeta({
    surface: "security-doctrine",
    simulation: "seeded",
    warnings: [
      "Security doctrine entries are locally persisted and may begin from seeded baseline scenarios.",
    ],
  });
  const rateLimited = applyWorkbenchRateLimit(req, RATE_LIMIT, meta);
  if (rateLimited) return rateLimited;

  const parsed = parseWorkbenchPayload(
    securityScenarioSchema,
    await req.json(),
    meta,
  );
  if (!parsed.ok) return parsed.response;

  const saved = await saveSecurityScenario(parsed.data);
  return workbenchJson(meta, { scenario: saved });
}
