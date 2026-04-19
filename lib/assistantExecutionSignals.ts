import type { AssistantGuidance, HQAssistantIntent } from "@/components/home/office/types";
import {
  getAssistantCapability,
  type AssistantCapabilityId,
} from "@/lib/assistantCapabilityRegistry";
import type {
  EngineeringPlaybookId,
  SpecTemplateId,
  SystemDesignId,
} from "@/lib/resourceSessionRegistry";
import type {
  UnfinishedSessionArtifactClass,
  UnfinishedSessionMemory,
} from "@/lib/assistantSessionMemory";

const RISKY_WORK_RE =
  /\b(?:refactor|rewrite|migrate|auth|middleware|provider|runtime|boundary|security|session|cookie|persist|deployment|release|verify|blast radius|store|state|route policy|connector)\b/i;
const ARCHIVE_REPAIR_RE =
  /\b(?:route-less|untagged|orphan|orphans|repair the archive|archive repair|file this|save this|stewardship|continuity)\b/i;

export interface AssistantRiskyWorkSignal {
  risky: boolean;
  confidence: number;
  reasons: string[];
}

export interface AssistantExecutionAttachment {
  signal: AssistantRiskyWorkSignal;
  cue: AssistantGuidance | null;
  preferredPreparedHref: string | null;
}

function getArtifactLabel(artifactClass: UnfinishedSessionArtifactClass | null | undefined) {
  switch (artifactClass) {
    case "reverse_engineering":
      return "reverse-engineering continuity";
    case "second_brain":
      return "second-brain continuity";
    case "archive":
      return "archive continuity";
    case "repo_work":
      return "repo-work continuity";
    case "scheduler":
      return "scheduler continuity";
    default:
      return "continuity";
  }
}

export function detectAssistantRiskyWork(opts: {
  input: string;
  intent: HQAssistantIntent;
  capabilityId: AssistantCapabilityId;
  routeHint?: string | null;
  filePath?: string | null;
  systemId?: SystemDesignId | null;
  playbookId?: EngineeringPlaybookId | null;
  specId?: SpecTemplateId | null;
  hasImpactSeed?: boolean;
}) : AssistantRiskyWorkSignal {
  let score = 0;
  const reasons: string[] = [];
  const capability = getAssistantCapability(opts.capabilityId);

  if (opts.intent === "repo_work" || opts.intent === "workflow") {
    score += 24;
    reasons.push("engineering intent");
  }
  if (capability.governance.riskTier === "tier2") {
    score += 26;
    reasons.push("high-risk capability");
  } else if (capability.governance.riskTier === "tier1") {
    score += 12;
    reasons.push("moderate-risk capability");
  }
  if (capability.governance.approvalRequired) {
    score += 12;
    reasons.push("approval-gated continuation");
  }
  if (capability.governance.operatorOnly) {
    score += 8;
    reasons.push("operator-only posture");
  }
  if (opts.filePath) {
    score += 18;
    reasons.push("file path attached");
  }
  if (opts.systemId) {
    score += 12;
    reasons.push("system ownership detected");
  }
  if (opts.playbookId) {
    score += 8;
    reasons.push("playbook anchor available");
  }
  if (opts.specId) {
    score += 8;
    reasons.push("spec anchor available");
  }
  if (opts.hasImpactSeed) {
    score += 10;
    reasons.push("impact seed available");
  }
  if (RISKY_WORK_RE.test(opts.input)) {
    score += 22;
    reasons.push("high-blast-radius language");
  }
  if (/^\/(?:hq|command|security|recon|vault)/.test(opts.routeHint ?? "")) {
    score += 6;
  }

  return {
    risky: score >= 60,
    confidence: Math.max(0, Math.min(100, score)),
    reasons,
  };
}

export function buildAssistantExecutionAttachment(opts: {
  input: string;
  intent: HQAssistantIntent;
  capabilityId: AssistantCapabilityId;
  routeHint?: string | null;
  filePath?: string | null;
  systemId?: SystemDesignId | null;
  playbookId?: EngineeringPlaybookId | null;
  specId?: SpecTemplateId | null;
  hasImpactSeed?: boolean;
}) : AssistantExecutionAttachment {
  const signal = detectAssistantRiskyWork(opts);
  if (!signal.risky) {
    return { signal, cue: null, preferredPreparedHref: null };
  }

  const preferredPreparedHref = opts.hasImpactSeed && opts.filePath
    ? `/resources?view=impact&file=${encodeURIComponent(opts.filePath)}`
    : opts.systemId
      ? `/resources?view=system&system=${opts.systemId}`
      : opts.specId
        ? `/resources?view=specs&spec=${opts.specId}`
        : opts.playbookId
          ? `/resources?view=playbooks&playbook=${opts.playbookId}`
          : null;

  const cue = preferredPreparedHref
    ? {
        kind: "execution" as const,
        tone: "positive" as const,
        title: "Execution context attached",
        detail:
          "This turn looks high-blast-radius, so Nexus quietly attached bounded execution context before widening the work.",
        href: preferredPreparedHref,
        priority: 70,
      }
    : null;

  return {
    signal,
    cue,
    preferredPreparedHref,
  };
}

export function buildAssistantArchiveCue(opts: {
  input: string;
  capabilityId: AssistantCapabilityId;
  unfinishedSession?: UnfinishedSessionMemory | null;
  preparedWorkspaceHref?: string | null;
}) : AssistantGuidance | null {
  const lowerInput = opts.input.toLowerCase();
  const session = opts.unfinishedSession;

  if (
    session &&
    (opts.capabilityId === "archive-continuity" ||
      opts.capabilityId === "reverse-engineering" ||
      opts.capabilityId === "second-brain")
  ) {
    return {
      kind: "archive",
      tone: "neutral",
      title: "Archive continuity",
      detail: `Matching ${getArtifactLabel(
        session.artifactClass,
      )} already exists from "${session.sourceQuery}", so Nexus can resume that durable thread instead of starting a duplicate lane.`,
      href: opts.preparedWorkspaceHref ?? undefined,
      priority: 60,
    };
  }

  if (ARCHIVE_REPAIR_RE.test(lowerInput) && opts.preparedWorkspaceHref?.includes("/vault?focus=")) {
    return {
      kind: "archive",
      tone: "neutral",
      title: "Archive cue",
      detail:
        "A durable archive repair lane is relevant to this turn, so Nexus kept the strongest VAULT session staged behind the assistant.",
      href: opts.preparedWorkspaceHref,
      priority: 58,
    };
  }

  if (
    opts.capabilityId === "reverse-engineering" &&
    opts.preparedWorkspaceHref?.includes("compiledFilter=reverse-engineering")
  ) {
    return {
      kind: "archive",
      tone: "neutral",
      title: "Archive cue",
      detail:
        "Reverse-engineering continuity is already durable here, so the assistant is biasing toward the existing prep/brief loop instead of a fresh artifact.",
      href: opts.preparedWorkspaceHref,
      priority: 62,
    };
  }

  return null;
}
