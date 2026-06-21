import type { AgentId } from "@/components/home/office/types";
import { detectAgent } from "@/components/home/office/prompts";

export interface TeamOrchestrationPhase {
  phase: number;
  owner: AgentId;
  ownerLabel: string;
  objective: string;
  exitCriteria: string;
}

export interface TeamOrchestrationPlan {
  lead: AgentId;
  headline: string;
  phases: TeamOrchestrationPhase[];
}

const AGENT_LABEL: Record<AgentId, string> = {
  jansky: "MAX",
  orbit: "EL",
  nova: "DUSTIN",
  cipher: "HOPPER",
  flux: "LUCAS",
};

const MULTI_DOMAIN_RE =
  /\b(?:and also|as well as|both .+ and|research .+ (?:then|and) (?:fix|patch|implement)|fix .+ (?:then|and) (?:research|audit)|security .+ market|market .+ security|code .+ research|implement .+ verify|audit .+ patch)\b/i;

const CROSS_LANE_KEYWORDS: Array<{ lane: AgentId; keywords: string[] }> = [
  { lane: "orbit", keywords: ["fix", "implement", "patch", "code", "bug", "refactor"] },
  { lane: "nova", keywords: ["research", "paper", "verify", "fact-check", "sources"] },
  { lane: "cipher", keywords: ["cve", "security", "vuln", "audit", "exploit", "threat"] },
  { lane: "flux", keywords: ["price", "market", "btc", "crypto", "thesis", "trade"] },
];

function lanesInQuery(query: string): AgentId[] {
  const lower = query.toLowerCase();
  const lanes = CROSS_LANE_KEYWORDS.filter((entry) =>
    entry.keywords.some((keyword) => lower.includes(keyword)),
  ).map((entry) => entry.lane);
  return [...new Set(lanes)];
}

export function detectTeamOrchestrationNeed(query: string): boolean {
  const clean = query.trim();
  if (clean.length < 24) return false;
  const lanes = lanesInQuery(clean);
  if (lanes.length >= 2) return true;
  return MULTI_DOMAIN_RE.test(clean);
}

export function buildTeamOrchestrationPlan(
  query: string,
  primaryAgent?: AgentId | null,
): TeamOrchestrationPlan | null {
  if (!detectTeamOrchestrationNeed(query)) return null;

  const detected = primaryAgent ?? detectAgent(query);
  const lead: AgentId = detected === "flux" || detected === "cipher" ? "jansky" : detected;
  const lanes = lanesInQuery(query);
  const specialists = lanes.filter((lane) => lane !== lead);

  const phases: TeamOrchestrationPhase[] = [
    {
      phase: 1,
      owner: lead,
      ownerLabel: AGENT_LABEL[lead],
      objective: "Frame mission, constraints, and acceptance before specialists run.",
      exitCriteria: "Constraint Cage posted · owner assigned · risks named",
    },
  ];

  specialists.forEach((owner, index) => {
    phases.push({
      phase: index + 2,
      owner,
      ownerLabel: AGENT_LABEL[owner],
      objective: `Execute the ${AGENT_LABEL[owner]} lane only — no scope bleed.`,
      exitCriteria: "Lane output cites evidence or files touched",
    });
  });

  phases.push({
    phase: phases.length + 1,
    owner: lead === "orbit" ? "jansky" : lead,
    ownerLabel: AGENT_LABEL[lead === "orbit" ? "jansky" : lead],
    objective: "Verify/fix loop — confirm done-when or escalate blocker to PM.",
    exitCriteria: "Proof checklist green or explicit blocker for operator",
  });

  return {
    lead,
    headline: `Phased squad run · ${specialists.length + 1} owner${specialists.length === 0 ? "" : "s"}`,
    phases,
  };
}

export function formatTeamOrchestrationBlock(plan: TeamOrchestrationPlan): string {
  const lines = plan.phases.map(
    (phase) =>
      `${phase.phase}. ${phase.ownerLabel} — ${phase.objective} (exit: ${phase.exitCriteria})`,
  );
  return (
    `\n[TEAM ORCHESTRATION — phased single-lead]\n` +
    `Lead: ${AGENT_LABEL[plan.lead]} · ${plan.headline}\n` +
    `${lines.join("\n")}\n` +
    `Do not parallelize writes. Hand off between phases with one-line status.\n` +
    `[END TEAM ORCHESTRATION]\n`
  );
}
