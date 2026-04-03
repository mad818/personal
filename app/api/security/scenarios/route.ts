import { NextRequest, NextResponse } from "next/server";
import {
  listSecurityScenarios,
  saveSecurityScenario,
} from "@/lib/assimilation/storage";
import type { SecurityScenario } from "@/lib/assimilation/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const scenarios = await listSecurityScenarios();
  return NextResponse.json({ scenarios });
}

export async function POST(req: NextRequest) {
  const scenario = (await req.json()) as SecurityScenario;
  const saved = await saveSecurityScenario(scenario);
  return NextResponse.json({ scenario: saved });
}
