// app/api/legal-compliance/drone/route.ts
// POST /api/legal-compliance/drone
//
// Parallel 5-agent compliance check for drone operations.
// Pattern from ai-legal-claude: sequential classification -> parallel agents -> weighted aggregation.
//
// Agents (weights sum to 1.0):
//   faa         0.30  FAA Part 107, Part 101, LAANC, waivers
//   state       0.20  State-specific drone laws (all 50 states + DC)
//   local       0.20  City/county ordinances, park rules, school zones
//   airspace    0.20  Controlled airspace, TFRs, NOTAMs, altitude limits
//   operational 0.10  Night, weather, BVLOS, payload, incident reporting
//
// Rate limit: 10 req/min

import { NextRequest, NextResponse } from "next/server";
import type { DroneComplianceCheck, DroneComplianceResult, DroneAgentResult } from "@/components/home/office/types";
import { callInternalAi } from "@/lib/internalAi";

const RATE_WINDOW_MS = 60_000;
const RATE_LIMIT     = 10;
const ipMap          = new Map<string, { count: number; resetAt: number }>();

function checkRate(ip: string): boolean {
  const now   = Date.now();
  const entry = ipMap.get(ip);
  if (!entry || now > entry.resetAt) {
    ipMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

// Agent configs: key, name, weight, focused prompt
const AGENT_CONFIGS: Array<{
  key:    keyof DroneComplianceResult["agents"];
  name:   string;
  weight: number;
  prompt: (c: DroneComplianceCheck) => string;
}> = [
  {
    key: "faa", name: "FAA Compliance Agent", weight: 0.30,
    prompt: (c) => `You are an FAA drone regulations expert. Analyze for federal compliance.
OPERATION: ${c.location.city}, ${c.location.state} | ${c.operationType} | ${c.droneWeight}lbs | ${c.altitude}ft AGL | night:${c.nightOps} | near airport:${c.nearAirport}${c.additionalContext ? ` | ${c.additionalContext}` : ""}
Check: Part 107, Part 101, Remote ID (Sept 2023), LAANC authorization, altitude limits, waiver requirements, registration (>0.55lb), COA if needed.
Respond ONLY with valid JSON: {"score":<0-100>,"findings":["..."],"violations":["..."],"citations":["14 CFR Part 107.XX"]}`,
  },
  {
    key: "state", name: "State Law Agent", weight: 0.20,
    prompt: (c) => `You are a state drone law expert for ${c.location.state}.
OPERATION: ${c.location.city}, ${c.location.state} | ${c.operationType} | ${c.droneWeight}lbs | night:${c.nightOps}${c.additionalContext ? ` | ${c.additionalContext}` : ""}
Check ${c.location.state} laws: state registration/permits, privacy/surveillance laws, critical infrastructure restrictions, state park rules, preemption clauses, 2023-2026 legislation.
Respond ONLY with valid JSON: {"score":<0-100>,"findings":["..."],"violations":["..."],"citations":["${c.location.state} Code Section XX"]}`,
  },
  {
    key: "local", name: "Local Ordinance Agent", weight: 0.20,
    prompt: (c) => `You are a local drone ordinance expert for ${c.location.city}, ${c.location.state}.
OPERATION: ${c.operationType} | night:${c.nightOps}${c.additionalContext ? ` | ${c.additionalContext}` : ""}
Check: ${c.location.city} municipal ordinances, park restrictions, school zones, noise ordinances, commercial filming permits, private property overflight. Note if specific ordinances are unknown and flag for verification.
Respond ONLY with valid JSON: {"score":<0-100>,"findings":["..."],"violations":["..."],"citations":["${c.location.city} Municipal Code XX.XX"]}`,
  },
  {
    key: "airspace", name: "Airspace Agent", weight: 0.20,
    prompt: (c) => `You are an airspace management expert.
OPERATION: ${c.location.city}, ${c.location.state} | ${c.altitude}ft AGL | near airport:${c.nearAirport} | ${c.operationType}${c.additionalContext ? ` | ${c.additionalContext}` : ""}
Analyze: airspace class (B/C/D/E/G), LAANC auto vs manual waiver, TFR considerations, Special Use Airspace, 400ft rule and structure exceptions, airport proximity, helicopter routes, NOTAM checking.
Respond ONLY with valid JSON: {"score":<0-100>,"findings":["..."],"violations":["..."],"citations":["14 CFR 91.XXX","LAANC UAS Facility Map"]}`,
  },
  {
    key: "operational", name: "Operational Safety Agent", weight: 0.10,
    prompt: (c) => `You are a drone operational safety expert.
OPERATION: ${c.operationType} | ${c.droneWeight}lbs | night:${c.nightOps} | near airport:${c.nearAirport} | ${c.altitude}ft AGL${c.additionalContext ? ` | ${c.additionalContext}` : ""}
Evaluate: night lighting (CFR 107.29), visual observer, weather minimums (3sm vis/500ft below clouds), pre-flight checklist, insurance needs, payload/CG, battery planning, incident reporting (CFR 107.9 - >$500 damage).
Respond ONLY with valid JSON: {"score":<0-100>,"findings":["..."],"violations":["..."],"citations":["14 CFR 107.29","FAA AC 107-2B"]}`,
  },
];

async function runAgent(
  config: typeof AGENT_CONFIGS[number],
  check: DroneComplianceCheck,
  origin: string,
): Promise<DroneAgentResult> {
  try {
    const aiResult = await callInternalAi({
      origin,
      messages: [{ role: "user", content: config.prompt(check) }],
      maxTokens: 600,
    });
    if (!aiResult.ok) throw new Error(`AI HTTP ${aiResult.status}`);
    const raw = aiResult.text;
    let parsed: { score?: number; findings?: string[]; violations?: string[]; citations?: string[] } = {};
    try {
      const match = raw.match(/\{[\s\S]*\}/);
      if (match) parsed = JSON.parse(match[0]);
    } catch {
      parsed = { score: 50, findings: [raw.slice(0, 200)], violations: [], citations: [] };
    }
    return {
      agentName:  config.name,
      score:      Math.min(100, Math.max(0, parsed.score ?? 50)),
      weight:     config.weight,
      findings:   parsed.findings   ?? [],
      violations: parsed.violations ?? [],
      citations:  parsed.citations  ?? [],
    };
  } catch {
    return {
      agentName: config.name, score: 50, weight: config.weight,
      findings:  ["Agent analysis unavailable - check AI provider connection"],
      violations: [], citations: [],
    };
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const ip = req.headers.get("x-forwarded-for") ?? "local";
  if (!checkRate(ip)) {
    return NextResponse.json({ error: "rate limited - max 10 checks/min" }, { status: 429 });
  }

  let check: DroneComplianceCheck;
  try {
    check = await req.json() as DroneComplianceCheck;
  } catch {
    return NextResponse.json({ error: "invalid request body" }, { status: 400 });
  }

  if (!check?.location?.city || !check?.location?.state) {
    return NextResponse.json({ error: "location.city and location.state are required" }, { status: 400 });
  }

  // Phase 1 (ai-legal-claude pattern): parallel agent dispatch
  const [faa, state, local, airspace, operational] = await Promise.all(
    AGENT_CONFIGS.map(config => runAgent(config, check, req.nextUrl.origin))
  );

  // Phase 2: weighted aggregation (0.30 + 0.20 + 0.20 + 0.20 + 0.10 = 1.00)
  const agents = { faa, state, local, airspace, operational };
  const overallScore = Math.round(
    Object.values(agents).reduce((sum, a) => sum + a.score * a.weight, 0)
  );

  const status: DroneComplianceResult["status"] =
    overallScore >= 80 ? "compliant" :
    overallScore >= 55 ? "review-required" : "likely-violation";

  const allViolations = Object.values(agents).flatMap(a => a.violations);
  const topIssues     = allViolations.slice(0, 6);

  const recommendations: string[] = [];
  if (faa.score < 70)         recommendations.push("Review FAA Part 107 requirements and obtain LAANC authorization if near controlled airspace");
  if (state.score < 70)       recommendations.push(`Verify ${check.location.state} state drone law compliance before flight`);
  if (local.score < 70)       recommendations.push(`Check ${check.location.city} municipal ordinances and obtain any required local permits`);
  if (airspace.score < 70)    recommendations.push("Check NOTAMs and TFRs in ForeFlight or FAA DroneZone before each flight");
  if (operational.score < 70) recommendations.push("Review FAA AC 107-2B operational safety requirements for this mission type");
  if (check.nightOps)         recommendations.push("Night ops require anti-collision lighting visible for 3 statute miles (14 CFR 107.29)");
  if (check.droneWeight > 55) recommendations.push("Drones over 55 lbs require FAA Section 44807 exemption - not covered under Part 107");
  if (check.altitude > 400)   recommendations.push("Above 400 ft AGL requires authorization unless within 400 ft of a structure (14 CFR 107.51)");

  const result: DroneComplianceResult = {
    overallScore, status, checkedAt: Date.now(),
    location: check.location,
    agents, topIssues, recommendations,
  };

  return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
}
