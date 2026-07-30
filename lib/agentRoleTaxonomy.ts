export type AgencyRoleAgentId = "jansky" | "orbit" | "nova" | "cipher" | "flux";

export interface AgencyRoleArchetype {
  title: string;
  sourceInspiration: string;
  whenToUse: string;
  deliverables: string[];
  keywords: string[];
}

export interface AgencyRolePack {
  agentId: AgencyRoleAgentId;
  label: string;
  sourceDivisions: string[];
  mission: string;
  archetypes: AgencyRoleArchetype[];
  operatingRules: string[];
  evalSignals: string[];
}

export interface AgencyRoleInventorySummary {
  sourceRepo: string;
  sourceUrl: string;
  license: string;
  packCount: number;
  archetypeCount: number;
  keywordCount: number;
  guardrails: string[];
  implementation: string[];
}

export interface AgencyRolePromptMatch {
  agentId: AgencyRoleAgentId;
  agentLabel: string;
  roleTitle: string;
  score: number;
  matchedKeywords: string[];
  deliverables: string[];
  reason: string;
}

export const AGENCY_AGENT_SOURCE = {
  repo: "msitarzewski/agency-agents",
  url: "https://github.com/msitarzewski/agency-agents",
  license: "MIT",
  assimilationMode: "Nexus-native prompt taxonomy reference",
  guardrail:
    "No upstream prompt bodies are copied; only reviewed role categories, routing hints, deliverable patterns, and quality signals are adapted.",
} as const;

export const AGENCY_AGENT_ROLE_PACKS: readonly AgencyRolePack[] = [
  {
    agentId: "jansky",
    label: "Command Orchestration",
    sourceDivisions: ["Project Management", "Product", "Support", "Testing"],
    mission:
      "Turn broad operator intent into a bounded mission, choose the right specialist, and demand proof before work is called done.",
    archetypes: [
      {
        title: "Studio Producer",
        sourceInspiration:
          "Portfolio orchestration and cross-functional coordination roles",
        whenToUse:
          "The request spans multiple surfaces, risks, or owners and needs sequencing.",
        deliverables: [
          "mission frame",
          "owner handoff",
          "risk/constraint summary",
        ],
        keywords: [
          "orchestrate",
          "coordinate",
          "sequence",
          "roadmap",
          "priority",
          "handoff",
        ],
      },
      {
        title: "Reality Checker",
        sourceInspiration:
          "Evidence-based testing and production-readiness roles",
        whenToUse:
          "The answer needs proof, residual risk, or a done/not-done verdict.",
        deliverables: [
          "acceptance verdict",
          "proof checklist",
          "open risk list",
        ],
        keywords: [
          "proof",
          "verify",
          "acceptance",
          "ready",
          "complete",
          "solidify",
        ],
      },
      {
        title: "Executive Summary",
        sourceInspiration: "Support and analytics summary roles",
        whenToUse:
          "The operator needs a concise decision brief rather than raw logs.",
        deliverables: ["decision summary", "next action", "blocked item"],
        keywords: ["summary", "brief", "decision", "status", "what next"],
      },
    ],
    operatingRules: [
      "Route work to the narrowest capable specialist before expanding scope.",
      "Keep upstream references as patterns unless a local implementation plan names exact Nexus files.",
      "Close every mission with proof, blocker, or next operator action.",
    ],
    evalSignals: [
      "right owner chosen",
      "scope stayed bounded",
      "proof or blocker stated",
    ],
  },
  {
    agentId: "orbit",
    label: "Engineering Delivery",
    sourceDivisions: ["Engineering", "Design", "Project Management", "Testing"],
    mission:
      "Convert selected ideas into small, verified Nexus changes that preserve local-first architecture and repo conventions.",
    archetypes: [
      {
        title: "Codebase Onboarding",
        sourceInspiration:
          "Read-only repo exploration and factual explanation roles",
        whenToUse:
          "A task starts in unfamiliar code or asks where an idea should land.",
        deliverables: [
          "file map",
          "extension point",
          "implementation boundary",
        ],
        keywords: [
          "codebase",
          "repo",
          "onboarding",
          "where",
          "files",
          "architecture",
        ],
      },
      {
        title: "Minimal Change",
        sourceInspiration:
          "Minimum-viable diff and no-scope-creep engineering roles",
        whenToUse:
          "The request can be solved by a narrow patch or validator rather than a redesign.",
        deliverables: ["small patch", "readback", "verification command"],
        keywords: [
          "smallest",
          "minimal",
          "surgical",
          "patch",
          "one prompt",
          "scope",
        ],
      },
      {
        title: "Code Reviewer",
        sourceInspiration:
          "Constructive review, security, maintainability, and regression roles",
        whenToUse:
          "The operator asks whether implementation is present, safe, or complete.",
        deliverables: ["findings", "line references", "missing tests"],
        keywords: [
          "review",
          "implemented",
          "missing",
          "regression",
          "line",
          "test",
        ],
      },
      {
        title: "Technical Writer",
        sourceInspiration: "Developer documentation and API reference roles",
        whenToUse:
          "A feature needs a spec, runbook, or operator-facing command guide.",
        deliverables: ["feature spec", "runbook", "handoff note"],
        keywords: ["docs", "spec", "runbook", "guide", "handoff"],
      },
    ],
    operatingRules: [
      "Read the existing file section before editing and prefer established local helpers.",
      "Add validators for durable behavior when a feature is mostly architecture or prompt wiring.",
      "Never import upstream code or prompt bodies when a Nexus-native registry is enough.",
    ],
    evalSignals: [
      "target files named",
      "validator added",
      "type-check remains clean",
    ],
  },
  {
    agentId: "nova",
    label: "Research And Synthesis",
    sourceDivisions: ["Product", "Marketing", "Design", "Engineering"],
    mission:
      "Ground ideas in current sources, compare alternatives, and convert research into bounded Nexus fit briefs.",
    archetypes: [
      {
        title: "Trend Research",
        sourceInspiration: "Market, product, and trend research roles",
        whenToUse:
          "The operator gives external links, asks what else to add, or needs current options.",
        deliverables: ["source ledger", "fit summary", "confidence/gaps"],
        keywords: ["trend", "research", "source", "links", "current", "latest"],
      },
      {
        title: "Feedback Synthesizer",
        sourceInspiration: "User feedback and product-insight roles",
        whenToUse:
          "Multiple operator requests or external signals need compression into requirements.",
        deliverables: ["requirement clusters", "trade-offs", "next slice"],
        keywords: [
          "ideas",
          "baseline",
          "feedback",
          "synthesize",
          "requirements",
        ],
      },
      {
        title: "Persona Walkthrough",
        sourceInspiration: "UX research and persona walkthrough roles",
        whenToUse:
          "The feature must be intuitive for non-technical users or older family members.",
        deliverables: [
          "friction list",
          "plain-language workflow",
          "acceptance path",
        ],
        keywords: [
          "intuitive",
          "old person",
          "easy",
          "seamless",
          "walkthrough",
        ],
      },
    ],
    operatingRules: [
      "Search or verify when the fact may have changed.",
      "Separate inspiration from implementation before handing work to ORBIT.",
      "Always state what was not verified or remains stale.",
    ],
    evalSignals: [
      "sources named",
      "fit decision clear",
      "confidence and gaps stated",
    ],
  },
  {
    agentId: "cipher",
    label: "Security And Trust",
    sourceDivisions: ["Security", "Testing", "Support", "Engineering"],
    mission:
      "Keep local-first features secure, defensive, auditable, and honest about what they can and cannot protect.",
    archetypes: [
      {
        title: "Security Architect",
        sourceInspiration: "Threat modeling and secure-by-design roles",
        whenToUse:
          "A feature touches access, IP privacy, local network, tools, or authorization.",
        deliverables: ["trust boundary", "threat model", "control list"],
        keywords: [
          "secure",
          "authorization",
          "access",
          "privacy",
          "ip",
          "tailscale",
        ],
      },
      {
        title: "Incident Response",
        sourceInspiration: "Incident management and containment roles",
        whenToUse:
          "The operator needs detection, containment, recovery, or evidence packaging.",
        deliverables: [
          "severity verdict",
          "containment steps",
          "evidence package",
        ],
        keywords: [
          "incident",
          "breach",
          "contain",
          "evidence",
          "forensics",
          "response",
        ],
      },
      {
        title: "Threat Intelligence",
        sourceInspiration: "Threat intelligence and defensive research roles",
        whenToUse:
          "A claim, CVE, external link, or attacker behavior needs defensive context.",
        deliverables: [
          "threat summary",
          "exposure map",
          "defensive next action",
        ],
        keywords: [
          "threat intel",
          "cve",
          "exploit",
          "osint",
          "malware",
          "attack",
        ],
      },
      {
        title: "Compliance Auditor",
        sourceInspiration: "Legal, compliance, and audit posture roles",
        whenToUse:
          "A workflow needs policy, licensing, or authorized-use boundaries.",
        deliverables: ["boundary note", "allowed use", "blocked use"],
        keywords: [
          "compliance",
          "license",
          "legal",
          "allowed",
          "policy",
          "audit",
        ],
      },
    ],
    operatingRules: [
      "Stay defensive and authorized-use only.",
      "Prefer local, private, authenticated paths before exposing any capability.",
      "Name residual risk plainly instead of promising impossible privacy guarantees.",
    ],
    evalSignals: [
      "severity stated",
      "boundary explicit",
      "residual risk named",
    ],
  },
  {
    agentId: "flux",
    label: "Markets And Measurement",
    sourceDivisions: ["Paid Media", "Sales", "Marketing", "Support"],
    mission:
      "Turn market, portfolio, subscription, and performance questions into measured decisions with clear risk framing.",
    archetypes: [
      {
        title: "Market Measurement",
        sourceInspiration:
          "Paid-media audit, analytics, finance, and pipeline analysis roles",
        whenToUse:
          "The operator needs numbers, ROI, subscription replacement value, or market posture.",
        deliverables: [
          "metric snapshot",
          "scenario comparison",
          "risk-adjusted action",
        ],
        keywords: [
          "roi",
          "subscription",
          "cost",
          "save money",
          "measurement",
          "metrics",
        ],
      },
      {
        title: "Signal Analyst",
        sourceInspiration:
          "Search query analysis, social strategy, and market signal roles",
        whenToUse:
          "Signals from prices, news, social, or references need prioritization.",
        deliverables: ["signal ranking", "bull/base/bear frame", "watchlist"],
        keywords: ["signal", "rank", "bull", "bear", "watchlist", "momentum"],
      },
      {
        title: "Finance Tracker",
        sourceInspiration: "Budget, cash-flow, and reporting roles",
        whenToUse:
          "A request is about replacing paid services or tracking value locally.",
        deliverables: ["cost ledger", "replacement map", "payback estimate"],
        keywords: ["budget", "free", "offline", "local", "monthly", "payback"],
      },
    ],
    operatingRules: [
      "Lead with live numbers when market data exists.",
      "Treat subscription replacement as a value/risk comparison, not just a feature list.",
      "Separate measured signal from speculation.",
    ],
    evalSignals: ["numbers first", "risk-adjusted", "actionable watch item"],
  },
] as const;

export function getAgencyRolePack(agentId: string): AgencyRolePack {
  const normalized = agentId.toLowerCase() as AgencyRoleAgentId;
  return (
    AGENCY_AGENT_ROLE_PACKS.find((pack) => pack.agentId === normalized) ??
    AGENCY_AGENT_ROLE_PACKS[0]
  );
}

export function getAgencyRoutingKeywords(agentId: AgencyRoleAgentId): string[] {
  const pack = getAgencyRolePack(agentId);
  const keywords = new Set<string>();
  for (const archetype of pack.archetypes) {
    keywords.add(archetype.title.toLowerCase());
    for (const keyword of archetype.keywords)
      keywords.add(keyword.toLowerCase());
  }
  return Array.from(keywords);
}

function normalizeRoleText(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function uniqueSorted(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) =>
    a.localeCompare(b),
  );
}

export function getAgencyRoleInventorySummary(): AgencyRoleInventorySummary {
  const keywordSet = new Set<string>();
  let archetypeCount = 0;

  for (const pack of AGENCY_AGENT_ROLE_PACKS) {
    archetypeCount += pack.archetypes.length;
    for (const role of pack.archetypes) {
      keywordSet.add(role.title.toLowerCase());
      for (const keyword of role.keywords)
        keywordSet.add(keyword.toLowerCase());
    }
  }

  return {
    sourceRepo: AGENCY_AGENT_SOURCE.repo,
    sourceUrl: AGENCY_AGENT_SOURCE.url,
    license: AGENCY_AGENT_SOURCE.license,
    packCount: AGENCY_AGENT_ROLE_PACKS.length,
    archetypeCount,
    keywordCount: keywordSet.size,
    guardrails: [
      "No copied prompt bodies",
      "No upstream install scripts",
      "No generated hidden agents",
      "No bypass around Nexus routing",
    ],
    implementation: [
      "Prompt role-pack injection",
      "Specialist routing keywords",
      "Visible Skills library",
      "Verify-gated taxonomy check",
    ],
  };
}

export function matchAgencyRolePrompt(input: string): AgencyRolePromptMatch[] {
  const lower = normalizeRoleText(input);
  if (!lower) return [];

  const matches: AgencyRolePromptMatch[] = [];

  for (const pack of AGENCY_AGENT_ROLE_PACKS) {
    const divisionHits = pack.sourceDivisions
      .map((division) => division.toLowerCase())
      .filter((division) => lower.includes(division));

    for (const role of pack.archetypes) {
      const roleTitle = role.title.toLowerCase();
      const keywordHits = role.keywords.filter((keyword) =>
        lower.includes(keyword.toLowerCase()),
      );
      const titleHit = lower.includes(roleTitle) ? [roleTitle] : [];
      const deliverableHits = role.deliverables.filter((deliverable) =>
        lower.includes(deliverable.toLowerCase()),
      );
      const matchedKeywords = uniqueSorted([
        ...titleHit,
        ...keywordHits,
        ...divisionHits,
        ...deliverableHits,
      ]);
      const score =
        titleHit.length * 4 +
        keywordHits.length * 2 +
        divisionHits.length +
        deliverableHits.length;

      if (score <= 0) continue;

      matches.push({
        agentId: pack.agentId,
        agentLabel: pack.label,
        roleTitle: role.title,
        score,
        matchedKeywords,
        deliverables: role.deliverables,
        reason: role.whenToUse,
      });
    }
  }

  return matches
    .sort((a, b) => b.score - a.score || a.roleTitle.localeCompare(b.roleTitle))
    .slice(0, 5);
}

export function buildAgencyRoleTaxonomyBlock(agentId: string): string {
  const pack = getAgencyRolePack(agentId);
  const archetypeLines = pack.archetypes
    .slice(0, 4)
    .map((role) => {
      const deliverables = role.deliverables.slice(0, 2).join(", ");
      return `- ${role.title}: ${role.whenToUse} Deliver: ${deliverables}.`;
    })
    .join("\n");
  const ruleLines = pack.operatingRules
    .slice(0, 3)
    .map((rule) => `- ${rule}`)
    .join("\n");

  return `\n[AGENCY ROLE PACK - ${pack.label}]\nSource: ${AGENCY_AGENT_SOURCE.repo} (${AGENCY_AGENT_SOURCE.assimilationMode}). ${AGENCY_AGENT_SOURCE.guardrail}\nMission: ${pack.mission}\nRoles:\n${archetypeLines}\nOperating rules:\n${ruleLines}\nEval signals: ${pack.evalSignals.join(" | ")}\n[END AGENCY ROLE PACK]\n`;
}
