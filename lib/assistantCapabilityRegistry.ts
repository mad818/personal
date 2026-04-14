import type {
  EngineeringPlaybookId,
  SpecTemplateId,
  SurfaceCapabilityId,
  SystemDesignId,
} from "@/lib/resourceSessionRegistry";
import {
  getAssistantCapabilityGovernanceProfile,
  governanceRiskTierToAssistantRisk,
  isGovernanceAutoStageSafe,
  type AssistantCapabilityId,
  type GovernanceContinuationMode,
  type GovernanceProfile,
} from "@/lib/governanceCatalog";
import {
  normalizeCanonicalRoutePath,
} from "@/lib/assistantCanonicalRegistry";
import type { HQAssistantIntent, HQAnswerStyle } from "@/components/home/office/types";

export {
  CANONICAL_ROUTE_ALIASES,
  CANONICAL_SIMPLE_FOCUS_ROUTES,
  CANONICAL_SEGMENTED_ROUTE_RULES,
  type CanonicalSegmentedViewRule,
} from "@/lib/assistantCanonicalRegistry";
export type { AssistantCapabilityId } from "@/lib/governanceCatalog";

export type AssistantCapabilityRisk = "low" | "moderate" | "high";

export interface AssistantCapabilityDefinition {
  id: AssistantCapabilityId;
  title: string;
  summary: string;
  intents: readonly HQAssistantIntent[];
  answerStyles: readonly HQAnswerStyle[];
  route: string;
  defaultExactHref: string;
  surfaceId?: SurfaceCapabilityId;
  systemId?: SystemDesignId;
  playbookId?: EngineeringPlaybookId;
  specId?: SpecTemplateId;
  risk: AssistantCapabilityRisk;
  governance: GovernanceProfile;
  keywords: readonly string[];
  filePathHints?: readonly string[];
  liveDomain?: "markets" | "news" | "cyber" | "project";
}

export interface AssistantCapabilityMatch {
  capability: AssistantCapabilityDefinition;
  governance: GovernanceProfile;
  continuationAutoStageSafe: boolean;
  nextMoveMode: GovernanceContinuationMode;
  confidence: number;
  matchedKeywords: string[];
}

const CAPABILITY_ALIASES: Record<string, AssistantCapabilityId> = {
  "market-analysis": "live-markets",
  "market-monitoring": "live-markets",
  "intel-latest": "live-news",
  "cyber-latest": "live-cyber",
  "archive-memory": "archive-continuity",
  "knowledge-export": "second-brain",
  "reverse-engineering-memory": "reverse-engineering",
  tutoring: "guided-learning",
  learning: "guided-learning",
  study: "guided-learning",
  "memory-palace": "memory-palace",
};

type AssistantCapabilitySeed = Omit<
  AssistantCapabilityDefinition,
  "governance"
>;

function buildGovernedCapability(
  capability: AssistantCapabilitySeed,
): AssistantCapabilityDefinition {
  const governance = getAssistantCapabilityGovernanceProfile(capability.id);
  return {
    ...capability,
    governance,
    risk: governanceRiskTierToAssistantRisk(governance.riskTier),
  };
}

const ASSISTANT_CAPABILITY_SEEDS: AssistantCapabilitySeed[] = [
  {
    id: "conversation-general",
    title: "General conversation",
    summary: "Answer directly, stay natural, and avoid dragging in internal scaffolding unless it clearly helps.",
    intents: ["conversation", "memory_recall"],
    answerStyles: ["conversational"],
    route: "/hq",
    defaultExactHref: "/hq?focus=hq-chronicle",
    surfaceId: "hq",
    systemId: "hq-mission-flow",
    risk: "low",
    keywords: ["hello", "help", "question", "chat", "assist"],
  },
  {
    id: "guided-learning",
    title: "Guided learning",
    summary: "Use assistant-first tutoring, compact checkpoints, and one strongest study continuation without adding a separate classroom UI.",
    intents: ["learning", "memory_recall", "product_help"],
    answerStyles: ["learning", "conversational", "product_help"],
    route: "/skills",
    defaultExactHref: "/skills?view=brain&focus=skills-brain",
    surfaceId: "skills",
    systemId: "memory-spine",
    playbookId: "second-brain-heartbeat",
    specId: "second-brain-system",
    risk: "low",
    keywords: [
      "teach me",
      "explain",
      "quiz me",
      "practice",
      "study plan",
      "study",
      "review what we know",
      "learn",
      "learning",
    ],
  },
  {
    id: "memory-palace",
    title: "Memory palace",
    summary: "Use local-first mined memory compartments and durable artifacts quietly when prior work should shape the answer.",
    intents: ["memory_recall", "archive_continuity", "learning"],
    answerStyles: ["conversational", "learning", "workflow"],
    route: "/vault",
    defaultExactHref: "/vault?focus=vault-memory-conversation",
    surfaceId: "vault",
    systemId: "memory-spine",
    playbookId: "second-brain-heartbeat",
    specId: "second-brain-system",
    risk: "moderate",
    keywords: [
      "what do we know",
      "what have we done",
      "memory palace",
      "project memory",
      "conversation memory",
      "general memory",
      "recall",
      "remember",
      "review what we know",
    ],
  },
  {
    id: "product-navigation",
    title: "Product guidance",
    summary: "Explain Nexus routes, panels, and next steps without forcing the user to browse Resources manually.",
    intents: ["product_help", "workspace_action"],
    answerStyles: ["product_help", "workflow"],
    route: "/hq",
    defaultExactHref: "/hq?focus=hq-strategium",
    surfaceId: "hq",
    systemId: "hq-mission-flow",
    risk: "low",
    keywords: [
      "where is",
      "how do i use",
      "tab",
      "page",
      "route",
      "screen",
      "view",
      "settings",
      "drawer",
      "navigate",
      "open",
      "show me",
    ],
  },
  {
    id: "repo-engineering",
    title: "Repo engineering",
    summary: "Attach the safest engineering context: blast radius, system ownership, read-first files, and spec/playbook anchors.",
    intents: ["repo_work", "research"],
    answerStyles: ["repo_work", "workflow"],
    route: "/hq",
    defaultExactHref: "/hq?focus=hq-console-shell",
    surfaceId: "hq",
    systemId: "ai-runtime-boundary",
    playbookId: "safe-refactor",
    specId: "feature-build",
    risk: "high",
    keywords: [
      "repo",
      "repository",
      "codebase",
      "refactor",
      "implement",
      "fix",
      "debug",
      "component",
      "hook",
      "api route",
      "blast radius",
      "typescript",
      "next.js",
    ],
    filePathHints: ["app/", "components/", "lib/", "store/", "hooks/", "tests/"],
  },
  {
    id: "live-markets",
    title: "Live markets",
    summary: "Use verified ALPHA-first market context and treat freshness as non-optional.",
    intents: ["live_current", "research"],
    answerStyles: ["live_current"],
    route: "/alpha",
    defaultExactHref: "/alpha?view=prices&focus=alpha-prices",
    surfaceId: "alpha",
    systemId: "ai-runtime-boundary",
    risk: "moderate",
    liveDomain: "markets",
    keywords: [
      "btc",
      "bitcoin",
      "eth",
      "ethereum",
      "price",
      "prices",
      "market",
      "markets",
      "crypto",
      "watchlist",
      "scanner",
      "momentum",
    ],
  },
  {
    id: "live-news",
    title: "Live external context",
    summary: "Use verified INTEL-first news and world context for latest/current questions.",
    intents: ["live_current", "research"],
    answerStyles: ["live_current", "workflow"],
    route: "/intel",
    defaultExactHref: "/intel?view=news&focus=intel-news",
    surfaceId: "intel",
    systemId: "hq-mission-flow",
    risk: "moderate",
    liveDomain: "news",
    keywords: [
      "latest",
      "current",
      "news",
      "headline",
      "headlines",
      "today",
      "recent",
      "world",
      "breaking",
      "update",
      "updates",
    ],
  },
  {
    id: "live-cyber",
    title: "Live cyber posture",
    summary: "Use verified CYBER-first triage and CVE posture for current threat or vulnerability questions.",
    intents: ["live_current", "research"],
    answerStyles: ["live_current", "workflow"],
    route: "/cyber",
    defaultExactHref: "/cyber?view=triage&focus=cyber-triage",
    surfaceId: "cyber",
    systemId: "ai-runtime-boundary",
    playbookId: "security-boundary-audit",
    specId: "api-integration",
    risk: "high",
    liveDomain: "cyber",
    keywords: [
      "cve",
      "vulnerability",
      "threat",
      "kev",
      "otx",
      "malware",
      "exploit",
      "security advisory",
      "cyber",
      "zero-day",
    ],
  },
  {
    id: "archive-continuity",
    title: "Archive continuity",
    summary: "Use VAULT continuity and memory posture quietly when the user is trying to save, recall, or repair durable work.",
    intents: ["archive_continuity", "memory_recall"],
    answerStyles: ["conversational", "workflow", "repo_work"],
    route: "/vault",
    defaultExactHref: "/vault?focus=vault-memory-spine",
    surfaceId: "vault",
    systemId: "memory-spine",
    playbookId: "second-brain-heartbeat",
    specId: "second-brain-system",
    risk: "moderate",
    keywords: [
      "vault",
      "archive",
      "memory",
      "remember",
      "recall",
      "save this",
      "file this",
      "compiled page",
      "continuity",
    ],
  },
  {
    id: "reverse-engineering",
    title: "Reverse engineering",
    summary: "Treat RECON triage, RE briefs, and maintenance as one continuous loop instead of one-off panel work.",
    intents: ["research", "archive_continuity", "workspace_action"],
    answerStyles: ["repo_work", "workflow", "conversational"],
    route: "/recon",
    defaultExactHref: "/recon?view=binary&focus=recon-binary",
    surfaceId: "recon",
    systemId: "recon-boundary",
    playbookId: "reverse-engineering-follow-through",
    specId: "reverse-engineering-memory",
    risk: "high",
    keywords: [
      "reverse engineering",
      "binary",
      "ghidra",
      "strings",
      "entropy",
      "ioc",
      "malware",
      "sample",
      "triage",
    ],
  },
  {
    id: "second-brain",
    title: "Second brain",
    summary: "Keep Obsidian export, heartbeat, and note-shaping behavior in the background until the user needs it.",
    intents: ["archive_continuity", "product_help", "workspace_action"],
    answerStyles: ["conversational", "product_help", "workflow"],
    route: "/vault",
    defaultExactHref: "/vault?focus=vault-export-second-brain",
    surfaceId: "vault",
    systemId: "memory-spine",
    playbookId: "second-brain-heartbeat",
    specId: "second-brain-system",
    risk: "moderate",
    keywords: [
      "second brain",
      "obsidian",
      "heartbeat",
      "map of content",
      "moc",
      "export",
      "knowledge pack",
      "vault export",
    ],
  },
  {
    id: "scheduler-governance",
    title: "Scheduler governance",
    summary: "Keep automation and recurring-work posture behind the assistant instead of forcing a separate operations mode.",
    intents: ["workflow", "workspace_action", "product_help"],
    answerStyles: ["workflow", "product_help"],
    route: "/hq",
    defaultExactHref: "/hq?focus=hq-scheduler-governance",
    surfaceId: "hq",
    systemId: "scheduler-governance",
    playbookId: "safe-refactor",
    risk: "moderate",
    keywords: ["scheduler", "cron", "automation", "job", "jobs", "recurring"],
  },
];

export const ASSISTANT_CAPABILITIES: AssistantCapabilityDefinition[] =
  ASSISTANT_CAPABILITY_SEEDS.map(buildGovernedCapability);

function normalizeRoutePath(route: string | null | undefined) {
  return normalizeCanonicalRoutePath(route);
}

function normalizePrompt(input: string) {
  return input.toLowerCase().replace(/\s+/g, " ").trim();
}

function countKeywordHits(input: string, keywords: readonly string[]) {
  const matched = keywords.filter((keyword) => input.includes(keyword.toLowerCase()));
  return {
    matched,
    score: matched.length * 9,
  };
}

export function resolveAssistantCapabilityId(
  value: string | null | undefined,
): AssistantCapabilityId | null {
  if (!value) return null;
  const normalized = CAPABILITY_ALIASES[value] ?? value;
  return ASSISTANT_CAPABILITIES.some((capability) => capability.id === normalized)
    ? (normalized as AssistantCapabilityId)
    : null;
}

export function getAssistantCapability(id: AssistantCapabilityId) {
  const match = ASSISTANT_CAPABILITIES.find((capability) => capability.id === id);
  return match ?? ASSISTANT_CAPABILITIES[0];
}

export function detectAssistantCapability(opts: {
  input: string;
  intent: HQAssistantIntent;
  answerStyle: HQAnswerStyle;
  routeHint?: string | null;
  filePath?: string | null;
}) : AssistantCapabilityMatch {
  const normalizedInput = normalizePrompt(opts.input);
  const routePath = normalizeRoutePath(opts.routeHint);

  let best: AssistantCapabilityMatch | null = null;

  for (const capability of ASSISTANT_CAPABILITIES) {
    let score = 0;
    if (capability.intents.includes(opts.intent)) score += 34;
    if (capability.answerStyles.includes(opts.answerStyle)) score += 20;
    if (routePath && normalizeRoutePath(capability.route) === routePath) score += 18;
    if (
      opts.filePath &&
      capability.filePathHints?.some((hint) => opts.filePath?.replace(/\\/g, "/").startsWith(hint))
    ) {
      score += 18;
    }
    const keywordHits = countKeywordHits(normalizedInput, capability.keywords);
    score += keywordHits.score;

    if (opts.answerStyle === "live_current" && capability.liveDomain) score += 10;

    if (!best || score > best.confidence) {
      best = {
        capability,
        governance: capability.governance,
        continuationAutoStageSafe: isGovernanceAutoStageSafe(
          capability.governance,
        ),
        nextMoveMode: capability.governance.continuationMode,
        confidence: Math.max(0, Math.min(100, score)),
        matchedKeywords: keywordHits.matched,
      };
    }
  }

  return best ?? {
    capability: ASSISTANT_CAPABILITIES[0],
    governance: ASSISTANT_CAPABILITIES[0].governance,
    continuationAutoStageSafe: isGovernanceAutoStageSafe(
      ASSISTANT_CAPABILITIES[0].governance,
    ),
    nextMoveMode: ASSISTANT_CAPABILITIES[0].governance.continuationMode,
    confidence: 0,
    matchedKeywords: [],
  };
}
