import type { AgencyRoleAgentId } from "@/lib/agentRoleTaxonomy";

export type CompanySourceKind =
  | "nexus_native"
  | "codex_skill"
  | "mcp_tool"
  | "reference"
  | "translation_required";

export type CompanySourcePosture =
  | "native"
  | "adapted"
  | "review_first"
  | "external"
  | "translation_required";

export interface CompanySkillSource {
  id: string;
  label: string;
  url: string;
  kind: CompanySourceKind;
  posture: CompanySourcePosture;
  purpose: string;
  codexPath: string;
  chatgptPath: string;
}

export interface NexusCompanyDepartment {
  id: string;
  label: string;
  leadAgentId: AgencyRoleAgentId;
  supportAgentIds: AgencyRoleAgentId[];
  mission: string;
  deliverables: string[];
  exampleMission: string;
  sourceIds: string[];
  boundary: string;
}

export const COMPANY_AGENT_NAMES: Record<AgencyRoleAgentId, string> = {
  jansky: "MAX",
  orbit: "EL",
  nova: "DUSTIN",
  cipher: "HOPPER",
  flux: "LUCAS",
};

export const COMPANY_SKILL_SOURCES: readonly CompanySkillSource[] = [
  {
    id: "nexus-native",
    label: "Nexus native capabilities",
    url: "/skills?view=library&focus=skills-library",
    kind: "nexus_native",
    posture: "native",
    purpose: "Existing governed agents, workflows, memory, research, security, and operator controls.",
    codexPath: "Use the repository's AGENTS.md, project skills, and existing Nexus runtime.",
    chatgptPath: "Use a copied department brief or a focused Nexus app/MCP integration.",
  },
  {
    id: "graphify",
    label: "Graphify",
    url: "https://github.com/Graphify-Labs/graphify",
    kind: "codex_skill",
    posture: "review_first",
    purpose: "Optional local-first code and document knowledge graph; not the company org chart.",
    codexPath: "Review, pin, and install as project-local Codex tooling only if its graph workflow is needed.",
    chatgptPath: "Expose reviewed graph queries through an app/MCP tool; a normal chat cannot read local graph files by itself.",
  },
  {
    id: "superpowers",
    label: "Superpowers",
    url: "https://github.com/obra/superpowers",
    kind: "codex_skill",
    posture: "adapted",
    purpose: "Planning, TDD, debugging, review, and evidence-before-completion discipline.",
    codexPath: "Codex-compatible skill workflow; Nexus already adapts the process discipline.",
    chatgptPath: "Carry the workflow in the department brief or build a focused app workflow.",
  },
  {
    id: "mattpocock-skills",
    label: "Matt Pocock's Engineering Skills",
    url: "https://github.com/mattpocock/skills",
    kind: "codex_skill",
    posture: "review_first",
    purpose: "Composable discovery, domain-language, specification, TDD, diagnosis, architecture, implementation, and review workflows.",
    codexPath: "Select individual released skills after comparing them with Nexus's existing specs, gates, handoff, and issue workflow.",
    chatgptPath: "Use one bounded workflow as conversation guidance; tracker or file changes require an authorized app connection.",
  },
  {
    id: "mattpocock-deep-modules-pr",
    label: "TypeScript Deep Modules (PR #505)",
    url: "https://github.com/mattpocock/skills/pull/505",
    kind: "reference",
    posture: "review_first",
    purpose: "Merged but still in-progress dependency-cruiser setup for entry-point-only TypeScript modules, private subfolders, test boundaries, and cycle rejection.",
    codexPath: "Treat as an architecture experiment; inspect Nexus's real seams before any dependency install, scaffold, or check rewrite.",
    chatgptPath: "Use the final PR rules as a review brief; normal chat cannot install dependency-cruiser or enforce repository checks.",
  },
  {
    id: "davidondrej-skills",
    label: "David Ondrej's Agent Skills",
    url: "https://github.com/davidondrej/skills",
    kind: "codex_skill",
    posture: "review_first",
    purpose: "Agent orchestration, skill authoring, research/web, thinking/documentation, and operations/security workflow catalog.",
    codexPath: "Review one named skill at a time; never inherit shell hooks, self-scheduling, publishing, or server mutation automatically.",
    chatgptPath: "Translate a selected skill into a bounded brief or authorized app; normal chat cannot run hooks or machine/server operations.",
  },
  {
    id: "context7",
    label: "Context7",
    url: "https://github.com/upstash/context7",
    kind: "mcp_tool",
    posture: "external",
    purpose: "Current library documentation through MCP instead of stale model recall.",
    codexPath: "Connect as an MCP server after operator review and configuration.",
    chatgptPath: "Use an MCP-backed ChatGPT app when that server is available and authorized.",
  },
  {
    id: "anthropic-skills",
    label: "Anthropic skills collection",
    url: "https://github.com/anthropics/skills",
    kind: "translation_required",
    posture: "translation_required",
    purpose: "Skill Creator, MCP Builder, webapp testing, web artifacts, and brand-guideline patterns.",
    codexPath: "Review each workflow and translate useful parts into Codex-compatible project skills and Nexus gates.",
    chatgptPath: "Translate into a prompt, app workflow, or MCP tool; Claude install commands do not transfer directly.",
  },
  {
    id: "claude-mem",
    label: "Claude-Mem",
    url: "https://github.com/thedotmack/claude-mem",
    kind: "reference",
    posture: "adapted",
    purpose: "Cross-session memory patterns already adapted into bounded Nexus memory lanes.",
    codexPath: "Use Nexus memory and file-first context; do not add a duplicate background memory daemon.",
    chatgptPath: "Use explicit files, connected sources, or app state with clear retention controls.",
  },
  {
    id: "ui-ux-pro-max",
    label: "UI/UX Pro Max",
    url: "https://github.com/nextlevelbuilder/ui-ux-pro-max-skill",
    kind: "reference",
    posture: "adapted",
    purpose: "Design-system audit rules and UI/UX decision support.",
    codexPath: "Use as a reviewed audit reference alongside the Nexus taste contract.",
    chatgptPath: "Attach the relevant design brief or expose a focused design-review app workflow.",
  },
  {
    id: "taste-skill",
    label: "Taste Skill",
    url: "https://github.com/Leonxlnx/taste-skill",
    kind: "reference",
    posture: "adapted",
    purpose: "High-intent frontend direction already translated into the Nexus taste contract.",
    codexPath: "Follow docs/NEXUS_TASTE_CONTRACT.md and lib/nexusTasteContract.ts.",
    chatgptPath: "Include the approved design contract in the conversation or app context.",
  },
  {
    id: "transitions",
    label: "Transitions",
    url: "https://transitions.dev",
    kind: "reference",
    posture: "external",
    purpose: "Motion and transition references for deliberate, reduced-motion-safe interaction.",
    codexPath: "Use as a design reference; do not import animation code without review.",
    chatgptPath: "Share selected examples as visual references in a design conversation.",
  },
  {
    id: "emilkowalski-skills",
    label: "Emil's Design Engineering Skills",
    url: "https://github.com/emilkowalski/skills",
    kind: "codex_skill",
    posture: "review_first",
    purpose: "Animation decisions, strict motion review, audit planning, and precise design vocabulary.",
    codexPath: "Review selected skills under the Nexus taste contract; install only after an explicit operator decision.",
    chatgptPath: "Attach a selected design brief or expose a reviewed design-review app workflow; normal chat does not inherit local skills.",
  },
  {
    id: "frontend-slides",
    label: "Frontend Slides",
    url: "https://github.com/zarazhangrui/frontend-slides",
    kind: "codex_skill",
    posture: "review_first",
    purpose: "Visual style discovery, single-file HTML presentations, PowerPoint conversion, browser QA, and optional export workflows.",
    codexPath: "Use as an artifact-local workflow; review support files progressively and require approval before dependencies, export, or deployment.",
    chatgptPath: "Use an attached-file presentation workflow or authorized app; normal chat can draft the deck brief but cannot run local conversion scripts.",
  },
  {
    id: "last30days-skill",
    label: "Last30Days",
    url: "https://github.com/mvanhorn/last30days-skill",
    kind: "codex_skill",
    posture: "review_first",
    purpose: "Recent cross-source social, community, market, code, paper, news, and web research with engagement-aware ranking.",
    codexPath: "Pin and review the optional Codex skill, then run its preflight before any source access, credentials, or research.",
    chatgptPath: "Use a copied recent-research brief or a reviewed app/MCP integration; normal chat does not inherit its external source access.",
  },
  {
    id: "marketing-skills",
    label: "Marketing Skills",
    url: "https://github.com/coreyhaines31/marketingskills",
    kind: "translation_required",
    posture: "review_first",
    purpose: "Copy, CRO, SEO, analytics, launch, and growth workflow catalog.",
    codexPath: "Select and review individual workflows before translating them into Nexus role packs.",
    chatgptPath: "Use selected workflows as bounded briefs; do not load the entire catalog into every chat.",
  },
  {
    id: "social-media-skills",
    label: "Social Media Skills",
    url: "https://github.com/charlie947/social-media-skills",
    kind: "translation_required",
    posture: "review_first",
    purpose: "Post, short-form video, thumbnail, and channel workflow catalog.",
    codexPath: "Translate reviewed workflows into session-scoped role packs when a real publishing lane exists.",
    chatgptPath: "Use a selected platform brief and keep publishing as an explicit human action.",
  },
  {
    id: "claude-business-plugins",
    label: "Claude finance, small-business, and legal plugins",
    url: "https://claude.com/plugins",
    kind: "translation_required",
    posture: "translation_required",
    purpose: "Finance, reconciliation, audit, payroll, invoicing, contract, NDA, and compliance workflows.",
    codexPath: "Rebuild only reviewed, low-risk workflows as Nexus skills; Claude plugins are not Codex packages.",
    chatgptPath: "Use focused ChatGPT workflows or apps with professional-review and data-access boundaries.",
  },
] as const;

export const NEXUS_COMPANY_DEPARTMENTS: readonly NexusCompanyDepartment[] = [
  {
    id: "command-operations",
    label: "Command & Operations",
    leadAgentId: "jansky",
    supportAgentIds: ["orbit", "nova", "cipher", "flux"],
    mission: "Turn company-wide intent into bounded specialist missions and synthesize one operator-facing decision.",
    deliverables: ["mission frame", "owner handoff", "acceptance verdict"],
    exampleMission: "Plan the smallest verified company-wide launch using the existing Nexus agents and controls.",
    sourceIds: ["nexus-native", "superpowers", "mattpocock-skills", "davidondrej-skills"],
    boundary: "MAX delegates at most three advisory specialist missions and remains the only operator-facing synthesizer.",
  },
  {
    id: "engineering",
    label: "Engineering",
    leadAgentId: "orbit",
    supportAgentIds: ["jansky", "cipher", "nova"],
    mission: "Design, build, test, document, and review the smallest safe product change.",
    deliverables: ["implementation plan", "verified patch", "review evidence"],
    exampleMission: "Build a Nexus feature with current documentation, tests, security review, and proof before completion.",
    sourceIds: ["superpowers", "mattpocock-skills", "mattpocock-deep-modules-pr", "davidondrej-skills", "context7", "anthropic-skills", "graphify", "claude-mem"],
    boundary: "All code stays project-native, provider calls stay behind lib/ai.ts, and external tools are optional and review-gated.",
  },
  {
    id: "design",
    label: "Design",
    leadAgentId: "orbit",
    supportAgentIds: ["nova", "jansky"],
    mission: "Turn product intent into a coherent interface that follows the approved Nexus visual contract.",
    deliverables: ["design direction", "interaction specification", "visual QA"],
    exampleMission: "Design and review a focused Nexus interface with deliberate hierarchy, motion, accessibility, and brand fit.",
    sourceIds: ["ui-ux-pro-max", "taste-skill", "transitions", "emilkowalski-skills", "frontend-slides", "anthropic-skills"],
    boundary: "References inform the work; the Nexus taste contract and current product shell remain authoritative.",
  },
  {
    id: "research-knowledge",
    label: "Research & Knowledge",
    leadAgentId: "nova",
    supportAgentIds: ["jansky", "orbit", "cipher"],
    mission: "Collect current evidence, separate fact from inference, and file reusable knowledge through existing lanes.",
    deliverables: ["source ledger", "evidence brief", "knowledge handoff"],
    exampleMission: "Research a decision with current primary sources, identify uncertainty, and produce a reusable Nexus brief.",
    sourceIds: ["last30days-skill", "davidondrej-skills", "graphify", "context7", "claude-mem", "nexus-native"],
    boundary: "Graphify is optional repo intelligence; durable knowledge follows Nexus source and retention controls.",
  },
  {
    id: "marketing-social",
    label: "Marketing & Social",
    leadAgentId: "nova",
    supportAgentIds: ["flux", "jansky", "orbit"],
    mission: "Research audiences, shape credible campaigns, and measure content without automatic publishing.",
    deliverables: ["campaign brief", "content package", "measurement plan"],
    exampleMission: "Create a source-backed launch campaign and social package for Nexus with clear metrics and human approval before publishing.",
    sourceIds: ["last30days-skill", "frontend-slides", "marketing-skills", "social-media-skills", "anthropic-skills"],
    boundary: "No surprise posting, impersonation, purchased engagement, or claims that cannot be supported.",
  },
  {
    id: "finance-business",
    label: "Finance & Business",
    leadAgentId: "flux",
    supportAgentIds: ["jansky", "cipher", "nova"],
    mission: "Turn costs, cash flow, operations, and subscription replacement into reviewable decisions.",
    deliverables: ["cost model", "scenario comparison", "review checklist"],
    exampleMission: "Model a free/local business workflow, compare costs and risks, and flag every item requiring professional review.",
    sourceIds: ["claude-business-plugins", "nexus-native"],
    boundary: "Outputs are planning aids, not accounting, tax, payroll, audit, or investment advice.",
  },
  {
    id: "legal-trust",
    label: "Legal & Trust",
    leadAgentId: "cipher",
    supportAgentIds: ["jansky", "orbit", "nova"],
    mission: "Review contracts, policy, compliance, licensing, privacy, and security boundaries with explicit escalation.",
    deliverables: ["issue list", "risk classification", "professional-review handoff"],
    exampleMission: "Review a proposed Nexus workflow for legal, privacy, licensing, and compliance risks without presenting the result as legal advice.",
    sourceIds: ["claude-business-plugins", "anthropic-skills", "nexus-native"],
    boundary: "Nexus can organize issues and evidence but cannot replace qualified legal or compliance counsel.",
  },
] as const;

export function getCompanySource(sourceId: string): CompanySkillSource {
  return COMPANY_SKILL_SOURCES.find((source) => source.id === sourceId) ?? COMPANY_SKILL_SOURCES[0];
}

export function getCompanyDepartment(departmentId: string): NexusCompanyDepartment {
  return NEXUS_COMPANY_DEPARTMENTS.find((department) => department.id === departmentId) ?? NEXUS_COMPANY_DEPARTMENTS[0];
}

export function buildCompanyMissionBrief(departmentId: string): string {
  const department = getCompanyDepartment(departmentId);
  const lead = COMPANY_AGENT_NAMES[department.leadAgentId];
  const support = department.supportAgentIds.map((agentId) => COMPANY_AGENT_NAMES[agentId]).join(", ");
  return [
    `Run this as the ${department.label} department for Nexus Prime.`,
    `Objective: ${department.exampleMission}`,
    `Operating model: MAX coordinates. ${lead} owns the specialist work. Support: ${support}.`,
    `Required deliverables: ${department.deliverables.join(", ")}.`,
    `Boundary: ${department.boundary}`,
    "Use the smallest coherent workflow. Treat linked skill repositories as reviewed references, not hidden authority or proof of installation.",
    "Return one decision, a bounded plan, the deliverable, risks or assumptions, and how the result should be verified.",
  ].join("\n");
}

export function getCompanyMapSummary() {
  return {
    departmentCount: NEXUS_COMPANY_DEPARTMENTS.length,
    sourceCount: COMPANY_SKILL_SOURCES.length,
    nativeOrAdaptedCount: COMPANY_SKILL_SOURCES.filter((source) => source.posture === "native" || source.posture === "adapted").length,
    translationRequiredCount: COMPANY_SKILL_SOURCES.filter((source) => source.posture === "translation_required").length,
  };
}
