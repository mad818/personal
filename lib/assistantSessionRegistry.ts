import { normalizeSessionHref } from "@/lib/exactSessionLinks";
import {
  getExactSessionGovernanceProfile,
} from "@/lib/governanceCatalog";
import type { HQAssistantIntent, PreparedWorkspaceTarget } from "@/components/home/office/types";

export type AssistantWorkspaceId =
  | "hq-strategium"
  | "hq-chronicle"
  | "hq-console-shell"
  | "hq-scheduler-governance"
  | "command-provider-health"
  | "command-runtime-efficiency"
  | "command-agent-health"
  | "command-memory-spine"
  | "intel-news"
  | "intel-world"
  | "intel-sweeps"
  | "alpha-prices"
  | "alpha-market-review"
  | "alpha-scanner"
  | "cyber-triage"
  | "cyber-vuln-review"
  | "cyber-drone"
  | "recon-lookup"
  | "recon-repo-intel"
  | "recon-binary"
  | "recon-opsec"
  | "vault-memory-spine"
  | "vault-memory-project"
  | "vault-memory-conversation"
  | "vault-memory-general"
  | "vault-memory-research"
  | "vault-memory-study"
  | "vault-stewardship"
  | "vault-compiled-pages"
  | "vault-export-second-brain"
  | "resources-voice-lab"
  | "resources-impact-graph"
  | "resources-impact-security"
  | "vehicle-connector-onboarding"
  | "vehicle-artifact-convention"
  | "security-doctrine"
  | "security-ai-surface"
  | "skills-forge"
  | "skills-brain";

interface AssistantWorkspaceEntry extends PreparedWorkspaceTarget {
  id: AssistantWorkspaceId;
  route: string;
}

const ASSISTANT_WORKSPACES: AssistantWorkspaceEntry[] = [
  {
    id: "hq-strategium",
    route: "/hq",
    href: "/hq?focus=hq-strategium",
    label: "Open HQ strategium",
    detail:
      "Prepared the HQ strategium so mission posture, fronts, and the operator overview are ready first.",
  },
  {
    id: "hq-chronicle",
    route: "/hq",
    href: "/hq?focus=hq-chronicle",
    label: "Open HQ chronicle",
    detail:
      "Prepared the HQ chronicle so the live assistant loop and reply continuity are ready first.",
  },
  {
    id: "hq-console-shell",
    route: "/hq",
    href: "/hq?focus=hq-console-shell",
    label: "Open HQ console shell",
    detail:
      "Prepared the live HQ shell so runtime posture, scene state, and shell controls are ready first.",
  },
  {
    id: "hq-scheduler-governance",
    route: "/hq",
    href: "/hq?focus=hq-scheduler-governance",
    label: "Open scheduler governance",
    detail:
      "Prepared the scheduler governance session so automation posture, approval gates, and saved review views are ready before risky follow-through widens.",
  },
  {
    id: "command-provider-health",
    route: "/command",
    href: "/command?focus=provider-health",
    label: "Open provider health",
    detail:
      "Prepared COMMAND provider health so the live provider chain, local runtime reachability, and one-shot operator posture are ready first.",
  },
  {
    id: "command-runtime-efficiency",
    route: "/command",
    href: "/command?focus=runtime-efficiency",
    label: "Open COMMAND runtime",
    detail:
      "Prepared COMMAND runtime efficiency so prompt, provider, and verification posture are ready first.",
  },
  {
    id: "command-agent-health",
    route: "/command",
    href: "/command?focus=agent-health",
    label: "Open agent health",
    detail:
      "Prepared COMMAND agent health so regressions and verification drift are ready first.",
  },
  {
    id: "command-memory-spine",
    route: "/command",
    href: "/command?focus=memory-spine",
    label: "Open memory spine",
    detail:
      "Prepared the local memory lane so citations, sync posture, and durable recall are ready first.",
  },
  {
    id: "intel-news",
    route: "/intel",
    href: "/intel?view=news&focus=intel-news",
    label: "Open INTEL news",
    detail:
      "Prepared INTEL news so current narrative and headline context are ready first.",
  },
  {
    id: "intel-world",
    route: "/intel",
    href: "/intel?view=world&focus=intel-world",
    label: "Open INTEL world",
    detail:
      "Prepared INTEL world so geopolitical posture and broader external context are ready first.",
  },
  {
    id: "intel-sweeps",
    route: "/intel",
    href: "/intel?view=sweeps&focus=intel-sweeps",
    label: "Open INTEL sweeps",
    detail:
      "Prepared INTEL sweeps so structured investigation and evidence review are ready first.",
  },
  {
    id: "alpha-prices",
    route: "/alpha",
    href: "/alpha?view=prices&focus=alpha-prices",
    label: "Open ALPHA prices",
    detail:
      "Prepared the public-market price grid so fast market context is ready first.",
  },
  {
    id: "alpha-market-review",
    route: "/alpha",
    href: "/alpha?view=watchlist&focus=alpha-market-review",
    label: "Open ALPHA market review",
    detail:
      "Prepared the governed market-review lane so thesis continuity, durable lessons, and the next review entry are ready first.",
  },
  {
    id: "alpha-scanner",
    route: "/alpha",
    href: "/alpha?view=scanner&focus=alpha-scanner",
    label: "Open ALPHA scanner",
    detail:
      "Prepared the momentum scanner so execution-oriented market triage is ready first.",
  },
  {
    id: "cyber-triage",
    route: "/cyber",
    href: "/cyber?view=triage&focus=cyber-triage",
    label: "Open CYBER triage",
    detail:
      "Prepared the governed triage-first cyber lane so correlated vulnerability posture is ready first and RECON or VAULT follow-through stays explicitly operator staged.",
  },
  {
    id: "cyber-drone",
    route: "/cyber",
    href: "/cyber?view=drone&focus=cyber-drone",
    label: "Open drone compliance",
    detail:
      "Prepared the paired drone-compliance lane so review work is ready without leaving the assistant flow or widening into ungated action.",
  },
  {
    id: "cyber-vuln-review",
    route: "/cyber",
    href: "/cyber?view=vuln-review&focus=cyber-vuln-review",
    label: "Open vuln review",
    detail:
      "Prepared the defensive repo-security review lane so local code findings, call paths, and exact repair cues are ready before the investigation widens.",
  },
  {
    id: "recon-lookup",
    route: "/recon",
    href: "/recon?view=osint&focus=recon-lookup",
    label: "Open RECON lookup",
    detail:
      "Prepared the target-led recon lane so lookup work is ready first.",
  },
  {
    id: "recon-repo-intel",
    route: "/recon",
    href: "/recon?view=osint&focus=recon-repo-intel",
    label: "Open RECON repo intel",
    detail:
      "Prepared the read-only repo-intel lane so public GitHub metadata, stack signals, and a compact ORBIT handoff brief are ready first.",
  },
  {
    id: "recon-binary",
    route: "/recon",
    href: "/recon?view=binary&focus=recon-binary",
    label: "Open binary triage",
    detail:
      "Prepared the local binary triage lane so suspicious-file analysis is ready first and deeper reverse-engineering stays explicitly gated.",
  },
  {
    id: "recon-opsec",
    route: "/recon",
    href: "/recon?view=opsec&focus=recon-opsec",
    label: "Open RECON OPSEC",
    detail:
      "Prepared the OPSEC lane so trust-boundary and exposure checks are ready first before broader investigation widens.",
  },
  {
    id: "vault-memory-spine",
    route: "/vault",
    href: "/vault?focus=vault-memory-spine",
    label: "Open VAULT memory spine",
    detail:
      "Prepared the vault memory lane so durable recall and archive continuity are ready first.",
  },
  {
    id: "vault-memory-project",
    route: "/vault",
    href: "/vault?focus=vault-memory-project",
    label: "Open project memory",
    detail:
      "Prepared the project-memory compartment so repo-grounded facts, decisions, and open loops are ready first.",
  },
  {
    id: "vault-memory-conversation",
    route: "/vault",
    href: "/vault?focus=vault-memory-conversation",
    label: "Open conversation memory",
    detail:
      "Prepared the conversation-memory compartment so prior session continuity and review context are ready first.",
  },
  {
    id: "vault-memory-general",
    route: "/vault",
    href: "/vault?focus=vault-memory-general",
    label: "Open general memory",
    detail:
      "Prepared the general-memory compartment so broader notes and evergreen references are ready first.",
  },
  {
    id: "vault-memory-research",
    route: "/vault",
    href: "/vault?focus=vault-memory-research",
    label: "Open research memory",
    detail:
      "Prepared the research-memory compartment so source-backed notes, evidence lanes, and literature-review continuity are ready first.",
  },
  {
    id: "vault-memory-study",
    route: "/vault",
    href: "/vault?focus=vault-memory-study",
    label: "Open study memory",
    detail:
      "Prepared the study-memory compartment so checkpoints, synthesis loops, and compact next-session follow-through are ready first.",
  },
  {
    id: "vault-stewardship",
    route: "/vault",
    href: "/vault?focus=vault-stewardship",
    label: "Open VAULT stewardship",
    detail:
      "Prepared the archive-health lane so route continuity, tags, and orphan recovery are ready first.",
  },
  {
    id: "vault-compiled-pages",
    route: "/vault",
    href: "/vault?focus=vault-compiled-pages",
    label: "Open compiled pages",
    detail:
      "Prepared the compiled-memory lane so durable artifacts and follow-on archive work are ready first.",
  },
  {
    id: "vault-export-second-brain",
    route: "/vault",
    href: "/vault?focus=vault-export-second-brain",
    label: "Open second-brain export",
    detail:
      "Prepared the scoped second-brain export session so Obsidian-ready export work is ready first.",
  },
  {
    id: "resources-voice-lab",
    route: "/resources",
    href: "/resources?view=voice-lab",
    label: "Open Voice Lab",
    detail:
      "Prepared the local-first voice workbench so profiles, dictation, and audio briefing projects are ready before broader experimentation widens.",
  },
  {
    id: "resources-impact-graph",
    route: "/resources",
    href: "/resources?view=impact&impactMode=graph",
    label: "Open architecture graph",
    detail:
      "Prepared the graph-first impact lane so dependency topology, blast radius, and ownership context are ready before edits widen.",
  },
  {
    id: "resources-impact-security",
    route: "/resources",
    href: "/resources?view=impact&impactMode=security",
    label: "Open project security scan",
    detail:
      "Prepared the local security-scan lane so secrets, dangerous sinks, and coupling hotspots are visible before code changes continue.",
  },
  {
    id: "vehicle-connector-onboarding",
    route: "/vehicle",
    href: "/vehicle?focus=vehicle-connector-onboarding",
    label: "Open connector onboarding",
    detail:
      "Prepared the future-hardware onboarding lane so readiness work is ready first.",
  },
  {
    id: "vehicle-artifact-convention",
    route: "/vehicle",
    href: "/vehicle?focus=vehicle-artifact-convention",
    label: "Open vehicle artifacts",
    detail:
      "Prepared the artifact lane so session bundles, render briefs, and durability rules are ready first.",
  },
  {
    id: "security-doctrine",
    route: "/security",
    href: "/security?view=doctrine&focus=security-doctrine",
    label: "Open SECURITY controls",
    detail:
      "Prepared the controls lane so boundary review and protected-action posture are ready first.",
  },
  {
    id: "security-ai-surface",
    route: "/security",
    href: "/security?view=ai&focus=security-ai-surface",
    label: "Open AI surface audit",
    detail:
      "Prepared the AI-surface review lane so prompt, retrieval, and persistence posture are ready first.",
  },
  {
    id: "skills-forge",
    route: "/skills",
    href: "/skills?view=forge&focus=skills-forge",
    label: "Open Workflow Forge",
    detail:
      "Prepared the internal workflow-forge lane so process shaping is ready first.",
  },
  {
    id: "skills-brain",
    route: "/skills",
    href: "/skills?view=brain&focus=skills-brain",
    label: "Open System Brain",
    detail:
      "Prepared the learning-control lane so tutor profiles, defaults, and knowledge controls are ready first.",
  },
];

const ROUTE_DEFAULT_WORKSPACES: Record<string, AssistantWorkspaceId> = {
  "/hq": "hq-chronicle",
  "/command": "command-runtime-efficiency",
  "/intel": "intel-news",
  "/alpha": "alpha-prices",
  "/cyber": "cyber-triage",
  "/resources": "resources-impact-graph",
  "/recon": "recon-lookup",
  "/vault": "vault-memory-spine",
  "/vehicle": "vehicle-artifact-convention",
  "/security": "security-doctrine",
  "/skills": "skills-forge",
};

const ROUTE_INTENT_WORKSPACE_OVERRIDES: Partial<
  Record<string, Partial<Record<HQAssistantIntent, AssistantWorkspaceId>>>
> = {
  "/hq": {
    conversation: "hq-chronicle",
    product_help: "hq-strategium",
    repo_work: "hq-console-shell",
    workflow: "hq-scheduler-governance",
    workspace_action: "hq-strategium",
  },
  "/command": {
    live_current: "command-runtime-efficiency",
    memory_recall: "command-memory-spine",
    repo_work: "command-runtime-efficiency",
  },
  "/intel": {
    research: "intel-sweeps",
    live_current: "intel-news",
  },
  "/alpha": {
    live_current: "alpha-prices",
    research: "alpha-scanner",
  },
  "/recon": {
    research: "recon-lookup",
    workspace_action: "recon-lookup",
    repo_work: "recon-repo-intel",
  },
  "/resources": {
    product_help: "resources-impact-graph",
    repo_work: "resources-impact-graph",
    workspace_action: "resources-voice-lab",
  },
  "/vault": {
    learning: "vault-memory-study",
    archive_continuity: "vault-memory-spine",
    memory_recall: "vault-memory-spine",
    product_help: "vault-compiled-pages",
    research: "vault-memory-research",
  },
  "/skills": {
    learning: "skills-brain",
    memory_recall: "skills-brain",
    product_help: "skills-brain",
  },
  "/vehicle": {
    archive_continuity: "vehicle-artifact-convention",
  },
  "/security": {
    repo_work: "security-ai-surface",
  },
};

export function getAssistantWorkspace(id: AssistantWorkspaceId): AssistantWorkspaceEntry {
  const match = ASSISTANT_WORKSPACES.find((entry) => entry.id === id);
  if (match) return match;
  return ASSISTANT_WORKSPACES[0];
}

export function getAssistantWorkspaceGovernance(id: AssistantWorkspaceId) {
  return getExactSessionGovernanceProfile(id);
}

export function findAssistantWorkspaceByHref(href: string | null | undefined) {
  if (!href) return null;
  const normalized = normalizeSessionHref(href);
  return (
    ASSISTANT_WORKSPACES.find(
      (entry) => normalizeSessionHref(entry.href) === normalized,
    ) ?? null
  );
}

export function resolveAssistantWorkspaceForRoute(
  route: string | null | undefined,
  intent: HQAssistantIntent,
): PreparedWorkspaceTarget | null {
  if (!route) return null;
  const normalizedRoute = normalizeSessionHref(route).split("?")[0] ?? route;
  const id =
    ROUTE_INTENT_WORKSPACE_OVERRIDES[normalizedRoute]?.[intent] ??
    ROUTE_DEFAULT_WORKSPACES[normalizedRoute];
  return id ? getAssistantWorkspace(id) : null;
}

export function buildPreparedWorkspaceTarget(
  href: string,
  label: string,
  detail: string,
): PreparedWorkspaceTarget {
  return {
    href: normalizeSessionHref(href),
    label,
    detail,
  };
}

export function normalizePreparedWorkspaceTarget(
  target: PreparedWorkspaceTarget | null | undefined,
): PreparedWorkspaceTarget | null {
  if (!target?.href) return null;
  const fromRegistry = findAssistantWorkspaceByHref(target.href);
  if (fromRegistry) return fromRegistry;
  return {
    href: normalizeSessionHref(target.href),
    label: target.label,
    detail: target.detail,
  };
}
