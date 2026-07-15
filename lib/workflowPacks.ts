import type { HQAssistantIntent } from "@/components/home/office/types";
import type { LearningMission } from "@/lib/learningMissions";
import {
  getWorkflowPackGovernanceProfile,
  governanceApprovalLabel,
  governanceRiskLabel,
  type AssistantCapabilityId,
  type GovernanceProfile,
} from "@/lib/governanceCatalog";
import type { WorkflowPackId } from "@/lib/researchSources";

export interface WorkflowPackDefinition extends GovernanceProfile {
  id: WorkflowPackId;
  title: string;
  summary: string;
  objective: string;
  strongestContinuation: string;
  bestFitRoutes: string[];
  evidenceHeavy: boolean;
  writeHeavy: boolean;
  reviewHeavy: boolean;
}

function buildWorkflowPack(
  definition: Omit<WorkflowPackDefinition, keyof GovernanceProfile>,
): WorkflowPackDefinition {
  return {
    ...definition,
    ...getWorkflowPackGovernanceProfile(definition.id),
  };
}

const WORKFLOW_PACKS: Record<WorkflowPackId, WorkflowPackDefinition> = {
  "guided-learning": buildWorkflowPack({
    id: "guided-learning",
    title: "Guided learning",
    summary:
      "Teach directly first, then stage one checkpoint, quiz, or study continuation only if it materially helps.",
    objective:
      "Keep tutoring assistant-first, compact, and grounded in local memory when it improves the answer.",
    strongestContinuation:
      "Offer one small study step instead of a dashboard of options.",
    bestFitRoutes: ["/skills", "/vault", "/hq"],
    evidenceHeavy: false,
    writeHeavy: false,
    reviewHeavy: false,
  }),
  "research-workflow": buildWorkflowPack({
    id: "research-workflow",
    title: "Research workflow",
    summary:
      "Frame the question, review sources, compare evidence, and promote durable synthesis without duplicating briefs.",
    objective:
      "Keep research source-aware, continuity-backed, and staged into one strongest exact workspace.",
    strongestContinuation:
      "Prefer one source-review, evidence-analysis, or synthesis lane at a time.",
    bestFitRoutes: ["/intel", "/vault", "/resources", "/hq"],
    evidenceHeavy: true,
    writeHeavy: false,
    reviewHeavy: true,
  }),
  "reverse-engineering": buildWorkflowPack({
    id: "reverse-engineering",
    title: "Reverse-engineering workflow",
    summary:
      "Keep binary triage, evidence capture, durable prep, and brief reopening inside one continuous local loop.",
    objective:
      "Ground reverse-engineering work in the RECON workspace and reuse the durable brief when continuity matches.",
    strongestContinuation:
      "Reopen the active binary-analysis or RE-brief lane before creating a parallel thread.",
    bestFitRoutes: ["/recon", "/vault", "/hq"],
    evidenceHeavy: true,
    writeHeavy: false,
    reviewHeavy: true,
  }),
  "second-brain": buildWorkflowPack({
    id: "second-brain",
    title: "Second-brain workflow",
    summary:
      "Use local-first memory mining, archive continuity, and durable note shaping without manual maintenance clutter.",
    objective:
      "Keep memory work quiet, continuity-first, and aligned across HQ, VAULT, and export.",
    strongestContinuation:
      "Prefer one reopen, repair, or export lane instead of many archive actions at once.",
    bestFitRoutes: ["/vault", "/hq", "/resources"],
    evidenceHeavy: true,
    writeHeavy: true,
    reviewHeavy: true,
  }),
  "market-review": buildWorkflowPack({
    id: "market-review",
    title: "Market review",
    summary:
      "Keep market journaling thesis-led, durable, and decision-support only so prior setups can be reopened without drifting into automation.",
    objective:
      "Capture thesis, setup, invalidation, result, and operator notes in one governed market-review loop across ALPHA, HQ, and VAULT.",
    strongestContinuation:
      "Reopen the strongest prior market review or add one new review entry instead of widening into another market dashboard.",
    bestFitRoutes: ["/alpha", "/vault", "/hq", "/resources"],
    evidenceHeavy: true,
    writeHeavy: true,
    reviewHeavy: true,
  }),
  "release-ops": buildWorkflowPack({
    id: "release-ops",
    title: "Release operations",
    summary:
      "Focus on release posture, deployment standards, explicit targets, and rollback readiness instead of feature expansion.",
    objective:
      "Keep release work boundary-aware, target-explicit, and verified in order before staging or promotion.",
    strongestContinuation:
      "Advance the single blocking release gate before widening into another release task.",
    bestFitRoutes: ["/command", "/hq", "/resources"],
    evidenceHeavy: false,
    writeHeavy: true,
    reviewHeavy: true,
  }),
  "scheduler-governance": buildWorkflowPack({
    id: "scheduler-governance",
    title: "Scheduler governance",
    summary:
      "Keep recurring work compact: one strongest operational control, explicit state, and secondary actions behind disclosure.",
    objective:
      "Route automation work through the scheduler governance lane without adding command sprawl.",
    strongestContinuation:
      "Use one next control per job state and move the rest behind manage/details flows.",
    bestFitRoutes: ["/hq", "/command", "/skills", "/resources"],
    evidenceHeavy: false,
    writeHeavy: true,
    reviewHeavy: true,
  }),
  "cyber-triage": buildWorkflowPack({
    id: "cyber-triage",
    title: "Cyber triage baseline",
    summary:
      "Anchor current-threat work in one triage-first chamber, then hand evidence into RECON and VAULT through explicit operator staging.",
    objective:
      "Keep CYBER action-oriented, evidence-aware, and governed so follow-through never silently widens into write or automation behavior.",
    strongestContinuation:
      "Move from CYBER triage into RECON OPSEC or VAULT compiled evidence only one approved lane at a time.",
    bestFitRoutes: ["/cyber", "/recon", "/vault", "/hq"],
    evidenceHeavy: true,
    writeHeavy: false,
    reviewHeavy: true,
  }),
};

const RELEASE_RE =
  /\b(?:release|deploy|deployment|staging|stage|ship|shipping|docker|coolify|vps|rollback|promotion|handoff:pull|release:smoke)\b/i;
const CYBER_RE =
  /\b(?:cve|cves|kev|otx|vulnerability|vulnerabilities|threat|threats|exploit|malware|security advisory|zero-day|cyber)\b/i;
const REVERSE_ENGINEERING_RE =
  /\b(?:reverse engineering|reverse-engineering|binary|ghidra|strings|entropy|ioc|sample|malware)\b/i;
const SECOND_BRAIN_RE =
  /\b(?:second brain|obsidian|export|knowledge pack|continuity|compiled page|archive)\b/i;
const SCHEDULER_RE =
  /\b(?:scheduler|cron|automation|recurring|job|jobs|batch)\b/i;
const MARKET_REVIEW_RE =
  /\b(?:(?:btc|eth|bitcoin|ethereum|crypto|stock|stocks|market|markets|watchlist|setup|trade|trading).*(?:review|journal|postmortem|thesis|invalidation|loss review)|(?:review|journal|postmortem|thesis|invalidation|loss review).*(?:btc|eth|bitcoin|ethereum|crypto|stock|stocks|market|markets|watchlist|setup|trade|trading))\b/i;

export function getWorkflowPack(id: WorkflowPackId): WorkflowPackDefinition {
  return WORKFLOW_PACKS[id];
}

export function inferWorkflowPackIdFromText(
  input: string | null | undefined,
): WorkflowPackId | null {
  const value = input?.trim() ?? "";
  if (!value) return null;
  if (RELEASE_RE.test(value)) return "release-ops";
  if (CYBER_RE.test(value)) return "cyber-triage";
  if (REVERSE_ENGINEERING_RE.test(value)) return "reverse-engineering";
  if (SCHEDULER_RE.test(value)) return "scheduler-governance";
  if (SECOND_BRAIN_RE.test(value)) return "second-brain";
  if (MARKET_REVIEW_RE.test(value)) return "market-review";
  return null;
}

export function resolveWorkflowPackId(input: {
  assistantIntent: HQAssistantIntent;
  capabilityId: AssistantCapabilityId;
  learningMission?: LearningMission | null;
  query?: string;
}): WorkflowPackId | null {
  if (input.learningMission?.workflowPackId) {
    return input.learningMission.workflowPackId;
  }
  const fromQuery = inferWorkflowPackIdFromText(input.query);
  if (fromQuery) return fromQuery;
  switch (input.capabilityId) {
    case "live-cyber":
      return "cyber-triage";
    case "reverse-engineering":
      return "reverse-engineering";
    case "second-brain":
    case "memory-palace":
    case "archive-continuity":
      return "second-brain";
    case "scheduler-governance":
      return "scheduler-governance";
    case "guided-learning":
      return input.assistantIntent === "research"
        ? "research-workflow"
        : "guided-learning";
    default:
      return input.assistantIntent === "research" ? "research-workflow" : null;
  }
}

export function buildWorkflowPackPromptBlock(
  workflowPackId: WorkflowPackId | null | undefined,
) {
  if (!workflowPackId) return "";
  const pack = getWorkflowPack(workflowPackId);
  return [
    "",
    "[WORKFLOW PACK]",
    `- Pack: ${pack.title}.`,
    `- Summary: ${pack.summary}`,
    `- Objective: ${pack.objective}`,
    `- Strongest continuation rule: ${pack.strongestContinuation}`,
    `- Governance: ${governanceRiskLabel(pack.riskTier)} · ${governanceApprovalLabel(pack)}.`,
    `- Domains: ${pack.domainTags.join(", ")}.`,
    `- Best-fit routes: ${pack.bestFitRoutes.join(", ")}.`,
    `- Next governed move: ${pack.nextMove}`,
    "[END WORKFLOW PACK]",
    "",
  ].join("\n");
}
