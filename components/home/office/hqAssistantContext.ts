import { detectRouteFromPrompt } from "@/lib/chatCapabilityRouting";
import {
  findStrongestUnfinishedSession,
  type UnfinishedSessionMemory,
} from "@/lib/assistantSessionMemory";
import {
  getAssistantCapability,
  type AssistantCapabilityId,
} from "@/lib/assistantCapabilityRegistry";
import { governanceApprovalLabel } from "@/lib/governanceCatalog";
import { resolveAssistantIndexedRetrieval } from "@/lib/assistantIndexedRetrieval";
import { buildPreparedWorkspaceTarget, resolveAssistantWorkspaceForRoute } from "@/lib/assistantSessionRegistry";
import { getEngineeringPlaybook } from "@/lib/engineeringPlaybooks";
import { hasDeepResearchIntent } from "@/lib/deepResearch";
import { normalizeSessionHref } from "@/lib/exactSessionLinks";
import { getImpactRepairSession } from "@/lib/impactRepairSessions";
import type { SystemDesignId } from "@/lib/resourceSessionRegistry";
import {
  detectSpecScopeDrift,
  getSpecDrivenTemplate,
} from "@/lib/specDrivenDevelopment";
import {
  buildAssistantArchiveCue,
  buildAssistantExecutionAttachment,
} from "@/lib/assistantExecutionSignals";
import { mergeAssistantGuidance } from "@/lib/assistantGuidance";
import {
  detectLearningMission,
  TUTOR_PROFILES,
  type LearningMission,
} from "@/lib/learningMissions";
import { getSurfaceCapability, SURFACE_CAPABILITIES } from "@/lib/surfaceCapabilities";
import { getSystemDesignMap, SYSTEM_DESIGN_MAPS } from "@/lib/systemDesignMaps";
import {
  buildRepoComparePreparedWorkspace,
  hasRepoCompareSignal,
} from "@/lib/repoCompare";
import { hasSwitchOperatorSignal } from "@/lib/switchOperator";
import {
  buildRepoAssimilationPreparedWorkspace,
  hasRepoAssimilationSignal,
} from "@/lib/repoAssimilation";
import { buildRepoIntelPreparedWorkspace, hasRepoIntelSignal } from "@/lib/repoIntel";
import type { HQAnswerStyle } from "./types";
import type {
  AssistantGuidance,
  HQAssistantIntent,
  PreparedWorkspaceTarget,
} from "./types";

const RESEARCH_RE =
  /\b(?:research|investigate|investigation|evidence|sources|sweep|sweeps|compare|deep research|why does|why is|look into|analyze this)\b/i;
const WORKSPACE_ACTION_RE =
  /\b(?:open|show|take me to|bring me to|bring up|go to|route me to|switch to|use the|launch)\b/i;
const MEMORY_RECALL_RE =
  /\b(?:remember|recall|what do we know|what have we done|memory|vault|archive|saved clip|compiled page|notes)\b/i;
const ARCHIVE_CONTINUITY_RE =
  /\b(?:archive|file this|save this|vault|compiled page|second brain|obsidian|export|continuity)\b/i;
const API_OR_BOUNDARY_RE =
  /\b(?:api|route policy|auth|cookie|connector|middleware|security|boundary|provider|secret)\b/i;
const SECOND_BRAIN_RE =
  /\b(?:second brain|obsidian|heartbeat|moc|map of content|knowledge pack)\b/i;
const REVERSE_ENGINEERING_RE =
  /\b(?:reverse engineering|reverse-engineering|binary|ghidra|strings|entropy|ioc|sample|malware)\b/i;
const SCHEDULER_RE =
  /\b(?:scheduler|scheduled|cron|automation|auto(?:mate|mation)?|job|jobs)\b/i;
const MARKET_TERMS_RE =
  /\b(?:btc|eth|bitcoin|ethereum|crypto|stock|stocks|market|markets|watchlist|setup|trade|trading)\b/i;
const MARKET_REVIEW_RE =
  /\b(?:review|journal|postmortem|thesis|invalidation|loss review|operator notes|what to repeat|what to avoid|next rule|discipline)\b/i;
const OSINT_CASEFILE_RE =
  /\b(?:osint|casefile|passive dns|passive-dns|pdns|metadata|identity|social pivot|pivot opportunities)\b/i;
const FILE_PATH_RE =
  /\b(?:app|components|lib|store|hooks|scripts|tests|__tests__|docs)\/[A-Za-z0-9._/-]+\.(?:[cm]?tsx?|md|mjs|json)\b/;
const VOICE_LAB_RE =
  /\b(?:voice lab|voice profile|voice project|audio briefing|render as audio|dictation|microphone|tts|text to speech|clone voice|voice runtime)\b/i;
const VULNERABILITY_REVIEW_RE =
  /\b(?:vulnerability review|security review|appsec|secure code review|taint|ssrf|xss|unsafe file access|auth bypass|logic security|injection)\b/i;
const ARCHITECTURE_INTELLIGENCE_RE =
  /\b(?:blast radius|dependency graph|impact graph|ownership|hotspots?|high coupling|circular dependencies|isolated files|security scan|architecture intelligence|codeflow)\b/i;
const PRIVACY_SHIELD_RE =
  /\b(?:privacy shield|anonymiz|mask sensitive|surrogate|de-anonymiz|cloud-bound privacy|protect identifiers)\b/i;

type AssistantContextKind =
  | "surface"
  | "system"
  | "playbook"
  | "spec"
  | "impact";

export interface HQAssistantContextAttachment {
  kind: AssistantContextKind;
  title: string;
  href: string;
  summary: string;
  confidence: number;
}

export interface HQAssistantContextResolution {
  intent: HQAssistantIntent;
  capabilityId: AssistantCapabilityId;
  learningMission: LearningMission | null;
  contextAttachments: HQAssistantContextAttachment[];
  preparedWorkspace: PreparedWorkspaceTarget | null;
  assistantGuidance: AssistantGuidance[];
  promptBlock: string;
  preparedWorkspaceBlock: string;
  continuationBlock: string;
}

function detectSurfaceIdFromRoute(routeHint: string | null | undefined) {
  if (!routeHint) return null;
  const normalized = normalizeSessionHref(routeHint).split("?")[0] ?? routeHint;
  switch (normalized) {
    case "/hq":
      return "hq";
    case "/command":
      return "command";
    case "/intel":
      return "intel";
    case "/alpha":
      return "alpha";
    case "/cyber":
      return "cyber";
    case "/recon":
      return "recon";
    case "/vault":
      return "vault";
    case "/vehicle":
      return "vehicle";
    case "/resources":
      return "resources";
    case "/security":
      return "security";
    case "/skills":
      return "skills";
    default:
      return null;
  }
}

function detectSurfaceIdFromPrompt(input: string) {
  const lower = input.toLowerCase();
  if (VOICE_LAB_RE.test(lower) || ARCHITECTURE_INTELLIGENCE_RE.test(lower)) {
    return "resources";
  }
  if (VULNERABILITY_REVIEW_RE.test(lower)) {
    return "cyber";
  }
  if (PRIVACY_SHIELD_RE.test(lower)) {
    return "command";
  }
  const match = SURFACE_CAPABILITIES.find((surface) => {
    if (surface.id === "hq") {
      return /\b(?:hq|home|strategium|chronicle|scheduler)\b/i.test(lower);
    }
    return (
      lower.includes(surface.id) ||
      surface.title.toLowerCase() === lower.trim() ||
      surface.subsections.some((section) => lower.includes(section.label.toLowerCase()))
    );
  });
  return match?.id ?? null;
}

function detectAssistantIntent(
  input: string,
  answerStyle: HQAnswerStyle,
  routeHint: string | null | undefined,
): HQAssistantIntent {
  if (answerStyle === "workflow") return "workflow";
  if (answerStyle === "learning") return "learning";
  if (answerStyle === "live_current") return "live_current";
  if (answerStyle === "repo_work") return "repo_work";
  if (answerStyle === "product_help") {
    return WORKSPACE_ACTION_RE.test(input) && (routeHint || detectSurfaceIdFromPrompt(input))
      ? "workspace_action"
      : "product_help";
  }
  if (ARCHIVE_CONTINUITY_RE.test(input)) return "archive_continuity";
  if (MEMORY_RECALL_RE.test(input)) return "memory_recall";
  if (WORKSPACE_ACTION_RE.test(input) && (routeHint || detectSurfaceIdFromPrompt(input))) {
    return "workspace_action";
  }
  if (RESEARCH_RE.test(input)) return "research";
  return "conversation";
}

function findSystemMapBySurfaceId(surfaceId: string | null) {
  if (!surfaceId) return null;
  const bySurface = SYSTEM_DESIGN_MAPS.find((entry) =>
    entry.surfaces.some((surface) => surface.toLowerCase() === surfaceId.toLowerCase()),
  );
  if (bySurface) return bySurface;
  switch (surfaceId) {
    case "hq":
      return getSystemDesignMap("hq-mission-flow");
    case "command":
      return getSystemDesignMap("ai-runtime-boundary");
    case "vault":
      return getSystemDesignMap("memory-spine");
    case "recon":
      return getSystemDesignMap("recon-boundary");
    case "vehicle":
      return getSystemDesignMap("vehicle-bridge");
    default:
      return null;
  }
}

function findSystemMapByFilePath(filePath: string | null) {
  if (!filePath) return null;
  const normalized = filePath.replace(/\\/g, "/");
  return (
    SYSTEM_DESIGN_MAPS.find((entry) =>
      [...entry.impactSeedFiles, ...entry.readFirst, ...entry.entryPoints].some(
        (candidate) =>
          normalized.startsWith(candidate.replace(/\\/g, "/")) ||
          candidate.replace(/\\/g, "/").startsWith(normalized),
      ),
    ) ?? null
  );
}

function buildSurfaceAttachment(surfaceId: string | null) {
  if (!surfaceId) return null;
  const surface = getSurfaceCapability(surfaceId);
  return {
    kind: "surface" as const,
    title: surface.title,
    href: surface.jumpActions[0]?.href ?? surface.route,
    summary: surface.tagline,
    confidence: 72,
  };
}

function buildSystemAttachment(systemId: string | null) {
  if (!systemId) return null;
  const system = getSystemDesignMap(systemId);
  return {
    kind: "system" as const,
    title: system.title,
    href: `/resources?view=system&system=${system.id}`,
    summary: system.summary,
    confidence: 76,
  };
}

function buildPlaybookAttachment(playbookId: string | null, confidence = 70) {
  if (!playbookId) return null;
  const playbook = getEngineeringPlaybook(playbookId);
  return {
    kind: "playbook" as const,
    title: playbook.title,
    href: `/resources?view=playbooks&playbook=${playbook.id}`,
    summary: playbook.objective,
    confidence,
  };
}

function buildSpecAttachment(specId: string | null, confidence = 68) {
  if (!specId) return null;
  const spec = getSpecDrivenTemplate(specId);
  return {
    kind: "spec" as const,
    title: spec.title,
    href: `/resources?view=specs&spec=${spec.id}`,
    summary: spec.objective,
    confidence,
  };
}

function buildImpactAttachment(filePath: string | null) {
  if (!filePath) return null;
  const repair = getImpactRepairSession(filePath);
  return {
    kind: "impact" as const,
    title: filePath,
    href: `/resources?view=impact&file=${encodeURIComponent(filePath)}`,
    summary: repair
      ? `${repair.label} after reviewing likely touched files.`
      : "Seed Impact with the primary file before widening the change.",
    confidence: 82,
  };
}

function selectPlaybookId(
  intent: HQAssistantIntent,
  input: string,
  routeHint: string | null | undefined,
  filePath: string | null,
) {
  if (hasDeepResearchIntent(input)) {
    return "deep-research-briefing";
  }
  if (hasSwitchOperatorSignal(input)) {
    return null;
  }
  if (MARKET_TERMS_RE.test(input) && MARKET_REVIEW_RE.test(input)) {
    return "market-review-loop";
  }
  if (VULNERABILITY_REVIEW_RE.test(input)) {
    return "vulnerability-review-loop";
  }
  if (PRIVACY_SHIELD_RE.test(input)) {
    return "privacy-shield-posture";
  }
  if (VOICE_LAB_RE.test(input)) {
    return "voice-lab-local";
  }
  if (ARCHITECTURE_INTELLIGENCE_RE.test(input)) {
    return "architecture-intelligence-lane";
  }
  if (OSINT_CASEFILE_RE.test(input)) {
    return "osint-casefile-loop";
  }
  if (!filePath && hasRepoCompareSignal(input)) {
    return "repo-compare-briefing";
  }
  if (!filePath && hasRepoAssimilationSignal(input)) {
    return "repo-assimilation-briefing";
  }
  if (!filePath && hasRepoIntelSignal(input)) {
    return "repo-intel-briefing";
  }
  if (/\b(?:radar|sensor fusion|sensor-fusion|vehicle session bundle)\b/i.test(input)) {
    return "radar-readiness-session";
  }
  if (REVERSE_ENGINEERING_RE.test(input)) return "reverse-engineering-follow-through";
  if (SECOND_BRAIN_RE.test(input)) return "second-brain-heartbeat";
  if (intent === "repo_work" && API_OR_BOUNDARY_RE.test(input)) {
    return "security-boundary-audit";
  }
  if (intent === "repo_work") return "safe-refactor";
  if (intent === "archive_continuity") return "second-brain-heartbeat";
  if (intent === "workflow" && SCHEDULER_RE.test(input)) return "safe-refactor";
  if (routeHint?.startsWith("/recon")) return "security-boundary-audit";
  return null;
}

function selectSpecId(
  intent: HQAssistantIntent,
  input: string,
  filePath: string | null,
) {
  if (REVERSE_ENGINEERING_RE.test(input)) return "reverse-engineering-memory";
  if (SECOND_BRAIN_RE.test(input) || intent === "archive_continuity") {
    return "second-brain-system";
  }
  if (
    intent === "repo_work" &&
    (API_OR_BOUNDARY_RE.test(input) || filePath?.startsWith("app/api/"))
  ) {
    return "api-integration";
  }
  if (intent === "repo_work") return "feature-build";
  return null;
}

function selectPreparedWorkspace(
  intent: HQAssistantIntent,
  input: string,
  routeHint: string | null | undefined,
  surfaceId: string | null,
  filePath: string | null,
  capabilityId: AssistantCapabilityId | null,
  preferredPreparedHref: string | null,
  learningMission: LearningMission | null,
  unfinishedSessions: UnfinishedSessionMemory[],
): PreparedWorkspaceTarget | null {
  if (hasDeepResearchIntent(input)) {
    return buildPreparedWorkspaceTarget(
      "/intel?view=sweeps&focus=intel-sweeps",
      "Open INTEL deep research",
      "Prepared the INTEL/NOVA lane so the bounded deep-research engine can run without widening into a new dashboard or generic archive detour.",
    );
  }

  if (hasSwitchOperatorSignal(input)) {
    return buildPreparedWorkspaceTarget(
      "/command?focus=provider-health",
      "Open provider health",
      "Prepared the explicit operator lane so provider posture, runtime reachability, and one-shot queue orchestration are ready before a bounded operator run starts.",
    );
  }

  if (!filePath && hasRepoCompareSignal(input)) {
    return buildRepoComparePreparedWorkspace();
  }

  if (!filePath && hasRepoAssimilationSignal(input)) {
    return buildRepoAssimilationPreparedWorkspace();
  }

  if (!filePath && hasRepoIntelSignal(input)) {
    return buildRepoIntelPreparedWorkspace();
  }

  if (
    !filePath &&
    intent === "research" &&
    /\b(?:compare|versus|vs|which is better|tradeoffs?)\b/i.test(input) &&
    !hasRepoCompareSignal(input)
  ) {
    return buildPreparedWorkspaceTarget(
      "/intel?view=sweeps&focus=intel-sweeps",
      "Open INTEL compare",
      "Prepared the general compare lane so non-repo option analysis stays in INTEL instead of drifting into the RECON repo workflow.",
    );
  }

  if (MARKET_TERMS_RE.test(input) && MARKET_REVIEW_RE.test(input)) {
    return buildPreparedWorkspaceTarget(
      "/alpha?view=watchlist&focus=alpha-market-review",
      "Open ALPHA market review",
      "Prepared the lesson-capture lane so prior market reviews, repeat-or-avoid guidance, and the next governed entry are ready before broader tape browsing.",
    );
  }

  if (VULNERABILITY_REVIEW_RE.test(input)) {
    return buildPreparedWorkspaceTarget(
      "/cyber?view=vuln-review&focus=cyber-vuln-review",
      "Open CYBER vulnerability review",
      "Prepared the defensive review lane so local code context, security heuristics, and the exact repair path are ready before the assistant widens into broader cyber triage.",
    );
  }

  if (PRIVACY_SHIELD_RE.test(input)) {
    return buildPreparedWorkspaceTarget(
      "/command?focus=provider-health",
      "Open provider health",
      "Prepared the provider-health lane so cloud-bound privacy posture, runtime reachability, and anonymization status are visible before the next sensitive run leaves the local boundary.",
    );
  }

  if (VOICE_LAB_RE.test(input)) {
    return buildPreparedWorkspaceTarget(
      "/resources?view=voice-lab",
      "Open Voice Lab",
      "Prepared the local-first voice lane so dictation, browser fallback speech, and optional runtime-powered audio projects stay in one bounded workspace.",
    );
  }

  if (ARCHITECTURE_INTELLIGENCE_RE.test(input)) {
    const impactMode = /security|secret|eval|shell|xss|ssrf|token|credential/i.test(input)
      ? "security"
      : "graph";
    const href = filePath
      ? `/resources?view=impact&file=${encodeURIComponent(filePath)}&impactMode=${impactMode}`
      : `/resources?view=impact&impactMode=${impactMode}`;
    return buildPreparedWorkspaceTarget(
      href,
      impactMode === "security" ? "Open Impact security lane" : "Open Impact graph lane",
      impactMode === "security"
        ? "Prepared the local architecture-security lane so sinks, secrets, and risky boundaries can be reviewed without sending code outside the repo."
        : "Prepared the architecture-intelligence lane so graph shape, ownership, hotspots, and likely blast radius are visible before implementation starts.",
    );
  }

  if (
    OSINT_CASEFILE_RE.test(input) &&
    (intent === "archive_continuity" || intent === "memory_recall")
  ) {
    return buildPreparedWorkspaceTarget(
      "/vault?focus=vault-compiled-pages&workflowId=osint-casefile",
      "Open OSINT casefile archive",
      "Prepared the durable OSINT casefile lane so prior passive-first case progression is ready before live collection widens again.",
    );
  }

  const unfinishedMatch = findStrongestUnfinishedSession(unfinishedSessions, {
    input,
    intent,
    routeHint,
    capability: capabilityId,
  });
  if (unfinishedMatch) return unfinishedMatch;

  if (preferredPreparedHref) {
    if (preferredPreparedHref.includes("/resources?view=impact&file=")) {
      return buildPreparedWorkspaceTarget(
        preferredPreparedHref,
        "Open Impact seed",
        "Prepared the blast-radius lane so risky changes stay anchored before implementation widens.",
      );
    }
    if (preferredPreparedHref.includes("/resources?view=system&system=")) {
      return buildPreparedWorkspaceTarget(
        preferredPreparedHref,
        "Open system map",
        "Prepared the system-ownership lane so risky changes stay attached to the correct boundary first.",
      );
    }
    if (preferredPreparedHref.includes("/resources?view=specs&spec=")) {
      return buildPreparedWorkspaceTarget(
        preferredPreparedHref,
        "Open working spec",
        "Prepared the active spec so risky work stays scoped before the assistant widens the task.",
      );
    }
    if (preferredPreparedHref.includes("/resources?view=playbooks&playbook=")) {
      return buildPreparedWorkspaceTarget(
        preferredPreparedHref,
        "Open playbook",
        "Prepared the execution playbook so risky work stays anchored to the intended operating pattern.",
      );
    }
  }

  if (intent === "archive_continuity") {
    if (REVERSE_ENGINEERING_RE.test(input)) {
      return buildPreparedWorkspaceTarget(
        "/vault?focus=vault-compiled-pages&compiledFilter=reverse-engineering",
        "Open RE maintenance",
        "Prepared the reverse-engineering maintenance lane so durable artifact repair is ready first.",
      );
    }
    if (SECOND_BRAIN_RE.test(input)) {
      return buildPreparedWorkspaceTarget(
        "/vault?focus=vault-export-second-brain",
        "Open second-brain export",
        "Prepared the scoped export lane so second-brain upkeep is ready first.",
      );
    }
    return resolveAssistantWorkspaceForRoute("/vault", intent);
  }

  if (intent === "learning" && learningMission) {
    const profile = TUTOR_PROFILES[learningMission.profile];
    return buildPreparedWorkspaceTarget(
      learningMission.preparedWorkspaceHref,
      `Open ${profile.title}`,
      `Prepared the ${profile.title.toLowerCase()} lane so ${learningMission.mode} work can continue without leaving the assistant-first flow.`,
    );
  }

  if (intent === "memory_recall") {
    if (/citation|cite|source|sources/i.test(input)) {
      return resolveAssistantWorkspaceForRoute("/command", intent);
    }
    return resolveAssistantWorkspaceForRoute("/vault", intent);
  }

  if (intent === "repo_work" && filePath) {
    const repair = getImpactRepairSession(filePath);
    if (repair) return repair;
    return buildPreparedWorkspaceTarget(
      `/resources?view=impact&file=${encodeURIComponent(filePath)}`,
      "Open Impact seed",
      "Prepared the blast-radius lane so the likely touched files are ready first.",
    );
  }

  if (intent === "live_current") {
    if (/btc|eth|price|market|markets|stocks?|crypto/i.test(input)) {
      return resolveAssistantWorkspaceForRoute("/alpha", "live_current");
    }
    if (/headline|headlines|news|breaking/i.test(input)) {
      return resolveAssistantWorkspaceForRoute("/intel", "live_current");
    }
    if (/cve|kev|vulnerability|threat|cyber/i.test(input)) {
      return resolveAssistantWorkspaceForRoute("/cyber", "live_current");
    }
    return resolveAssistantWorkspaceForRoute(routeHint ?? "/intel", intent);
  }

  if (intent === "research") {
    if (REVERSE_ENGINEERING_RE.test(input)) {
      return buildPreparedWorkspaceTarget(
        "/recon?view=binary&focus=recon-binary",
        "Open binary triage",
        "Prepared the local binary-triage lane so investigation can widen there.",
      );
    }
    if (/opsec|header|headers|dns|lookup|osint/i.test(input) || OSINT_CASEFILE_RE.test(input)) {
      if (routeHint?.startsWith("/cyber")) {
        return resolveAssistantWorkspaceForRoute("/cyber", intent);
      }
      return resolveAssistantWorkspaceForRoute("/recon", intent);
    }
    return resolveAssistantWorkspaceForRoute(routeHint ?? "/intel", intent);
  }

  if (intent === "workspace_action" || intent === "product_help") {
    if (REVERSE_ENGINEERING_RE.test(input)) {
      return buildPreparedWorkspaceTarget(
        "/recon?view=binary&focus=recon-binary",
        "Open binary triage",
        "Prepared the local suspicious-file lane so the requested reverse-engineering workspace is ready.",
      );
    }
    if (SECOND_BRAIN_RE.test(input)) {
      return buildPreparedWorkspaceTarget(
        "/vault?focus=vault-export-second-brain",
        "Open second-brain export",
        "Prepared the scoped export lane so the second-brain workspace is ready.",
      );
    }
    if (SCHEDULER_RE.test(input)) {
      return buildPreparedWorkspaceTarget(
        "/hq?focus=hq-scheduler-governance",
        "Open scheduler governance",
        "Prepared the scheduler lane so automation posture and saved review views are ready.",
      );
    }
    return resolveAssistantWorkspaceForRoute(routeHint ?? (surfaceId ? `/${surfaceId}` : null), intent);
  }

  if (intent === "workflow" && SCHEDULER_RE.test(input)) {
    return resolveAssistantWorkspaceForRoute("/hq", intent);
  }

  return resolveAssistantWorkspaceForRoute(routeHint ?? (surfaceId ? `/${surfaceId}` : null), intent);
}

function summarizeAttachment(attachment: HQAssistantContextAttachment) {
  const kindLabel =
    attachment.kind === "surface"
      ? "Surface"
      : attachment.kind === "system"
        ? "System"
        : attachment.kind === "playbook"
          ? "Playbook"
          : attachment.kind === "spec"
            ? "Spec"
            : "Impact";
  return `- ${kindLabel}: ${attachment.title} — ${attachment.summary}`;
}

function buildPromptBlock(
  intent: HQAssistantIntent,
  attachments: HQAssistantContextAttachment[],
  assistantGuidance: AssistantGuidance[],
  capabilityLabel?: string | null,
  capabilityConfidence?: number,
) {
  const promptAttachments = attachments.slice(0, 1);
  const promptGuidance = assistantGuidance
    .filter((guidance) => guidance.kind !== "continuation")
    .slice(0, 2);

  if (promptAttachments.length === 0 && promptGuidance.length === 0) {
    return "";
  }

  const lines = [
    "",
    "[ASSISTANT-FIRST INTERNAL CONTEXT]",
    "Use this quietly only when it improves the answer.",
    "- Answer the user first in normal assistant language.",
    "- Do not narrate Resources, Specs, Playbooks, Impact, or internal routing unless it materially helps.",
    `- Detected assistant intent: ${intent}.`,
  ];

  if (capabilityLabel) {
    lines.push(
      `- Ranked internal capability: ${capabilityLabel}${
        typeof capabilityConfidence === "number"
          ? ` (${Math.round(capabilityConfidence)}% match)`
          : ""
      }.`,
    );
  }

  if (promptAttachments.length > 0) {
    lines.push("- Relevant Nexus context:");
    lines.push(...promptAttachments.map(summarizeAttachment));
  }

  if (promptGuidance.length > 0) {
    lines.push("- State-led guidance:");
    lines.push(
      ...promptGuidance.map(
        (guidance) => `- ${guidance.title}: ${guidance.detail}`,
      ),
    );
  }

  lines.push("[END ASSISTANT-FIRST INTERNAL CONTEXT]", "");
  return lines.join("\n");
}

function buildPreparedWorkspacePromptBlock(
  preparedWorkspace: PreparedWorkspaceTarget | null,
) {
  if (!preparedWorkspace) return "";
  return [
    "",
    "[PREPARED WORKSPACE]",
    `- Workspace: ${preparedWorkspace.label}.`,
    `- Why it is staged: ${preparedWorkspace.detail}`,
    "- If the user asked what to use next, acknowledge that this exact workspace is ready without forcing a route change.",
    "[END PREPARED WORKSPACE]",
    "",
  ].join("\n");
}

function buildContinuationCue(
  session: UnfinishedSessionMemory | null,
  preparedWorkspace: PreparedWorkspaceTarget | null,
) {
  if (!session || !preparedWorkspace) return null;
  return {
    kind: "continuation",
    tone: "info",
    title: "Continuation restored",
    detail: `This turn matched unfinished work from "${session.sourceQuery}". ${preparedWorkspace.label} stays staged so the previous flow can continue without reopening the route from scratch.`,
    href: preparedWorkspace.href,
    priority: 82,
  } satisfies AssistantGuidance;
}

function buildGovernanceCue(
  capabilityId: AssistantCapabilityId,
  preparedWorkspace: PreparedWorkspaceTarget | null,
) {
  if (!preparedWorkspace) return null;
  const capability = getAssistantCapability(capabilityId);
  const profile = capability.governance;
  if (!profile.approvalRequired) return null;
  return {
    kind: "execution",
    tone: profile.continuationMode === "human_gated_workflow" ? "caution" : "info",
    title:
      profile.continuationMode === "human_gated_workflow"
        ? "Operator approval required"
        : "Reviewed continuation staged",
    detail:
      profile.continuationMode === "human_gated_workflow"
        ? `${capability.title} stays assistant-first. ${preparedWorkspace.label} is staged, but risky write or automation follow-through must stay behind explicit operator approval.`
        : `${capability.title} keeps ${governanceApprovalLabel(profile).toLowerCase()} posture, so Nexus stages the exact session without silently widening into write-capable follow-through.`,
    href: preparedWorkspace.href,
    priority: profile.continuationMode === "human_gated_workflow" ? 84 : 72,
  } satisfies AssistantGuidance;
}

function buildContinuationPromptBlock(
  session: UnfinishedSessionMemory | null,
  preparedWorkspace: PreparedWorkspaceTarget | null,
) {
  if (!session || !preparedWorkspace) return "";
  return [
    "",
    "[CONTINUATION]",
    `- This turn matches unfinished work from: ${session.sourceQuery}.`,
    `- Reopen target: ${preparedWorkspace.label}.`,
    `- Continuity rule: continue the existing thread before creating a parallel workspace or duplicate artifact.`,
    "[END CONTINUATION]",
    "",
  ].join("\n");
}

export function resolveHQAssistantContext(opts: {
  input: string;
  answerStyle: HQAnswerStyle;
  routeHint?: string | null;
  unfinishedSessions?: UnfinishedSessionMemory[];
}) : HQAssistantContextResolution {
  const routeHint = opts.routeHint ?? detectRouteFromPrompt(opts.input);
  const learningMission = detectLearningMission(opts.input);
  const surfaceId =
    detectSurfaceIdFromRoute(routeHint) ?? detectSurfaceIdFromPrompt(opts.input);
  const filePath = opts.input.match(FILE_PATH_RE)?.[0] ?? null;
  const intent = detectAssistantIntent(opts.input, opts.answerStyle, routeHint);
  const indexedRetrieval = resolveAssistantIndexedRetrieval({
    input: opts.input,
    intent,
    answerStyle: opts.answerStyle,
    routeHint,
    filePath,
  });
  const unfinishedContinuation = findStrongestUnfinishedSession(
    opts.unfinishedSessions ?? [],
    {
      input: opts.input,
      intent,
      routeHint,
      capability: indexedRetrieval.capabilityId,
    },
  );

  const systemMap =
    findSystemMapByFilePath(filePath) ?? findSystemMapBySurfaceId(surfaceId);
  const playbookId = selectPlaybookId(intent, opts.input, routeHint, filePath);
  const specId = selectSpecId(intent, opts.input, filePath);
  const capability = getAssistantCapability(indexedRetrieval.capabilityId);
  const impactAttachment = buildImpactAttachment(filePath);
  const executionAttachment = buildAssistantExecutionAttachment({
    input: opts.input,
    intent,
    capabilityId: indexedRetrieval.capabilityId,
    routeHint,
    filePath,
    systemId: (systemMap?.id ?? null) as SystemDesignId | null,
    playbookId,
    specId,
    hasImpactSeed: Boolean(impactAttachment),
  });

  const indexedAttachments = indexedRetrieval.documents.map((document) => ({
    kind: document.kind,
    title: document.title,
    href: document.href,
    summary: document.summary,
    confidence: document.confidence,
  }));

  const manualAttachments = [
    intent === "conversation" ? null : buildSurfaceAttachment(surfaceId),
    intent === "repo_work" || intent === "product_help" || intent === "research"
      ? buildSystemAttachment(systemMap?.id ?? null)
      : intent === "live_current"
        ? buildSurfaceAttachment(surfaceId ?? "intel")
        : null,
    intent === "repo_work" ? impactAttachment : null,
    playbookId ? buildPlaybookAttachment(playbookId, intent === "repo_work" ? 74 : 66) : null,
    specId ? buildSpecAttachment(specId, intent === "repo_work" ? 71 : 64) : null,
  ]
    .filter((entry): entry is HQAssistantContextAttachment => Boolean(entry));

  const rankedAttachments = [...indexedAttachments, ...manualAttachments]
    .reduce<HQAssistantContextAttachment[]>((acc, attachment) => {
      if (acc.some((entry) => entry.href === attachment.href)) return acc;
      acc.push(attachment);
      return acc;
    }, [])
    .sort((a, b) => b.confidence - a.confidence);

  const pinnedAttachments = manualAttachments.filter(
    (attachment) => attachment.kind === "playbook",
  );
  const attachments = [...pinnedAttachments]
    .concat(
      rankedAttachments.filter(
        (attachment) =>
          !pinnedAttachments.some((pinned) => pinned.href === attachment.href),
      ),
    )
    .slice(0, 3)
    .sort((a, b) => b.confidence - a.confidence);

  const preparedWorkspace =
    selectPreparedWorkspace(
      intent,
      opts.input,
      routeHint,
      surfaceId,
      filePath,
      indexedRetrieval.capabilityId,
      executionAttachment.preferredPreparedHref,
      learningMission,
      opts.unfinishedSessions ?? [],
    ) ??
    buildPreparedWorkspaceTarget(
      capability.defaultExactHref,
      `Open ${capability.title}`,
      `Prepared ${capability.title.toLowerCase()} so the most relevant exact workspace is ready behind the assistant.`,
    );
  const learningCue = learningMission
    ? ({
        kind: "learning",
        tone: "positive",
        title: `${TUTOR_PROFILES[learningMission.profile].title} ready`,
        detail:
          learningMission.workflowPackId === "research-workflow"
            ? `This turn is classified as ${learningMission.mode}. Answer directly first, then offer one compact source-review, synthesis, or writing continuation for ${learningMission.subject}.`
            : `This turn is classified as ${learningMission.mode}. Answer directly first, then offer one compact checkpoint or study step for ${learningMission.subject}.`,
        href: preparedWorkspace?.href,
        priority: 76,
      } satisfies AssistantGuidance)
    : null;
  const continuityCue = buildContinuationCue(
    unfinishedContinuation,
    preparedWorkspace,
  );
  const governanceCue = buildGovernanceCue(
    indexedRetrieval.capabilityId,
    preparedWorkspace,
  );
  const archiveCue = buildAssistantArchiveCue({
    input: opts.input,
    capabilityId: indexedRetrieval.capabilityId,
    unfinishedSession: unfinishedContinuation,
    preparedWorkspaceHref: preparedWorkspace?.href ?? null,
  });
  const scopeDriftCue = detectSpecScopeDrift(
    specId ? getSpecDrivenTemplate(specId) : null,
    opts.input,
  );
  const assistantGuidance = mergeAssistantGuidance(
    learningCue,
    continuityCue,
    governanceCue,
    archiveCue,
    executionAttachment.cue,
    scopeDriftCue
      ? {
          kind: "scope_drift" as const,
          tone: "caution" as const,
          title: scopeDriftCue.title,
          detail: scopeDriftCue.detail,
          href: specId ? `/resources?view=specs&spec=${specId}` : undefined,
          priority: 90,
        }
      : null,
  );

  return {
    intent,
    capabilityId: capability.id,
    learningMission,
    contextAttachments: attachments,
    preparedWorkspace,
    assistantGuidance,
    promptBlock: buildPromptBlock(
      intent,
      attachments,
      assistantGuidance,
      capability.title,
      indexedRetrieval.capabilityConfidence,
    ),
    preparedWorkspaceBlock: buildPreparedWorkspacePromptBlock(preparedWorkspace),
    continuationBlock: buildContinuationPromptBlock(
      unfinishedContinuation,
      preparedWorkspace,
    ),
  };
}
