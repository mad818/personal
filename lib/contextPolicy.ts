import type {
  HQAssistantIntent,
  HQAnswerStyle,
} from "@/components/home/office/types";
import type { AssistantCapabilityId } from "@/lib/assistantCapabilityRegistry";
import type {
  ProjectContextSection,
  ProjectContextSlice,
} from "@/lib/contextSpine";
import type { LearningMission } from "@/lib/learningMissions";
import type { WorkflowPackId } from "@/lib/researchSources";

export type ContextLaneId =
  | "baseline"
  | "live_current"
  | "repo_work"
  | "research"
  | "study"
  | "workspace_action"
  | "archive_continuity"
  | "release_ops";

export type ContextAssetId =
  | "agents"
  | "state"
  | "standards"
  | "bible"
  | "stack"
  | "live_intel"
  | "workflow_pack"
  | "learning_mission"
  | "retrieval_docs"
  | "mined_memory"
  | "assistant_context"
  | "continuation"
  | "prepared_workspace"
  | "lessons";

export type ContextAssetBucket =
  | "baseline"
  | "lane"
  | "continuity"
  | "verification";

export interface ContextSelectionInput {
  query: string;
  answerStyle: HQAnswerStyle;
  assistantIntent: HQAssistantIntent;
  capabilityId: AssistantCapabilityId;
  routeHint?: string | null;
  filePath?: string | null;
  learningMission?: LearningMission | null;
  verifiedRetrievalRequired?: boolean;
  includeLessons?: boolean;
  includeLiveContext?: boolean;
  hasMinedMemory?: boolean;
  hasPreparedWorkspace?: boolean;
  hasContinuation?: boolean;
  hasVerificationDocs?: boolean;
}

export interface ContextAssetRequest {
  id: ContextAssetId;
  bucket: ContextAssetBucket;
  reason: string;
  section?: ProjectContextSection;
  slices?: string[];
}

export interface ContextAssetSkip {
  id: ContextAssetId;
  reason: string;
}

export interface ContextManifest {
  lane: ContextLaneId;
  baselineBudgetChars: number;
  laneBudgetChars: number;
  workflowPackId: WorkflowPackId | null;
  assets: ContextAssetRequest[];
  skippedAssets: ContextAssetSkip[];
}

export interface ContextLoadedAsset {
  id: ContextAssetId;
  bucket: ContextAssetBucket;
  reason: string;
  chars: number;
  compacted: boolean;
  skipped?: boolean;
}

export interface ContextLoadReport {
  lane: ContextLaneId;
  workflowPackId: WorkflowPackId | null;
  baselineBudgetChars: number;
  laneBudgetChars: number;
  totalChars: number;
  baselineChars: number;
  laneChars: number;
  selectedAssets: ContextLoadedAsset[];
  skippedAssets: ContextAssetSkip[];
}

export interface ContextRenderResult {
  context: string;
  report: ContextLoadReport;
}

export const BASELINE_CONTEXT_BUDGET = 900;

export const CONTEXT_LANE_BUDGETS: Record<ContextLaneId, number> = {
  baseline: 900,
  workspace_action: 1600,
  live_current: 2200,
  study: 3000,
  archive_continuity: 2800,
  repo_work: 3200,
  research: 3600,
  release_ops: 3200,
};

const RELEASE_RE =
  /\b(?:release|deploy|deployment|staging|stage|ship|shipping|docker|coolify|vps|rollback|promotion|handoff:pull|release:smoke)\b/i;

const PRODUCT_DIRECTION_RE =
  /\b(?:nexus|product|roadmap|strategy|positioning|direction|what should we build|who is this for|surface map)\b/i;

const UI_RE =
  /\b(?:ui|ux|layout|panel|drawer|screen|page|component|frontend|tailwind|css|style)\b/i;
const AGENT_RE =
  /\b(?:agent|prompt|runtime|tool call|assistant|hq|chronicle|memory|context|skill|workflow pack)\b/i;

function isReleaseLane(input: ContextSelectionInput) {
  return RELEASE_RE.test(input.query) ||
    input.capabilityId === "scheduler-governance";
}

function isProductDirectionalResearch(query: string) {
  return PRODUCT_DIRECTION_RE.test(query);
}

function selectRepoDomainSlice(input: ContextSelectionInput): ProjectContextSlice<"standards"> {
  const normalizedFile = input.filePath?.replace(/\\/g, "/") ?? "";
  if (
    normalizedFile.startsWith("scripts/") ||
    normalizedFile.startsWith("docs/deployment/") ||
    normalizedFile.includes("docker") ||
    RELEASE_RE.test(input.query)
  ) {
    return "deployment";
  }
  if (
    normalizedFile.startsWith("components/") ||
    normalizedFile.startsWith("app/") ||
    UI_RE.test(input.query)
  ) {
    return "ui";
  }
  if (
    normalizedFile.startsWith("lib/agent") ||
    normalizedFile.startsWith("lib/ai") ||
    normalizedFile.startsWith("components/home/office/") ||
    AGENT_RE.test(input.query)
  ) {
    return "agents";
  }
  return "agents";
}

function pushAsset(
  assets: ContextAssetRequest[],
  skipped: ContextAssetSkip[],
  request: ContextAssetRequest,
  nonBaselineLimit: { value: number },
) {
  const isBaseline = request.bucket === "baseline";
  if (!isBaseline && nonBaselineLimit.value >= 5) {
    skipped.push({
      id: request.id,
      reason: "Skipped because the lane already selected 5 non-baseline context blocks.",
    });
    return;
  }
  assets.push(request);
  if (!isBaseline) nonBaselineLimit.value += 1;
}

export function resolveContextLane(
  input: Pick<
    ContextSelectionInput,
    "answerStyle" | "assistantIntent" | "capabilityId" | "query" | "learningMission"
  >,
): ContextLaneId {
  if (isReleaseLane({ ...input, routeHint: null })) {
    return "release_ops";
  }
  if (input.answerStyle === "live_current" || input.assistantIntent === "live_current") {
    return "live_current";
  }
  if (input.answerStyle === "repo_work" || input.assistantIntent === "repo_work") {
    return "repo_work";
  }
  if (
    input.answerStyle === "learning" ||
    input.assistantIntent === "learning" ||
    input.learningMission?.workflowPackId === "guided-learning"
  ) {
    return "study";
  }
  if (input.assistantIntent === "research") {
    return "research";
  }
  if (
    input.assistantIntent === "archive_continuity" ||
    input.assistantIntent === "memory_recall"
  ) {
    return "archive_continuity";
  }
  if (
    input.assistantIntent === "workspace_action" ||
    input.assistantIntent === "product_help" ||
    input.answerStyle === "product_help"
  ) {
    return "workspace_action";
  }
  return "baseline";
}

export function selectContextAssets(input: ContextSelectionInput & {
  workflowPackId: WorkflowPackId | null;
}): ContextManifest {
  const lane = resolveContextLane(input);
  const assets: ContextAssetRequest[] = [];
  const skippedAssets: ContextAssetSkip[] = [];
  const nonBaselineLimit = { value: 0 };

  pushAsset(
    assets,
    skippedAssets,
    {
      id: "agents",
      bucket: "baseline",
      reason: "Compact AGENTS operating summary is always loaded.",
      section: "agents",
      slices: ["ritual", "rules"],
    },
    nonBaselineLimit,
  );

  const stateSlices =
    lane === "release_ops"
      ? ["release-posture", "blockers", "environment"]
      : ["latest", "blockers", "next-up"];
  pushAsset(
    assets,
    skippedAssets,
    {
      id: "state",
      bucket: "baseline",
      reason: "Current system state is always loaded in compact form.",
      section: "state",
      slices: stateSlices,
    },
    nonBaselineLimit,
  );

  switch (lane) {
    case "live_current":
      if (input.includeLiveContext) {
        pushAsset(
          assets,
          skippedAssets,
          {
            id: "live_intel",
            bucket: "lane",
            reason: "Live-current turns load filtered live intel.",
          },
          nonBaselineLimit,
        );
      }
      pushAsset(
        assets,
        skippedAssets,
        {
          id: "assistant_context",
          bucket: "lane",
          reason: "One assistant capability/context pack stays attached to the live turn.",
        },
        nonBaselineLimit,
      );
      if (input.hasVerificationDocs) {
        pushAsset(
          assets,
          skippedAssets,
          {
            id: "retrieval_docs",
            bucket: "verification",
            reason: "Verified live turns load one verification layer.",
          },
          nonBaselineLimit,
        );
      }
      break;
    case "workspace_action":
      pushAsset(
        assets,
        skippedAssets,
        {
          id: "assistant_context",
          bucket: "lane",
          reason: "Workspace-action turns load one surface/capability summary.",
        },
        nonBaselineLimit,
      );
      if (input.hasPreparedWorkspace) {
        pushAsset(
          assets,
          skippedAssets,
          {
            id: "prepared_workspace",
            bucket: "lane",
            reason: "Workspace-action turns stage one prepared exact workspace.",
          },
          nonBaselineLimit,
        );
      }
      break;
    case "repo_work":
      pushAsset(
        assets,
        skippedAssets,
        {
          id: "standards",
          bucket: "lane",
          reason: "Repo work loads process, engineering, and one domain standard slice.",
          section: "standards",
          slices: ["process", "engineering", selectRepoDomainSlice(input)],
        },
        nonBaselineLimit,
      );
      pushAsset(
        assets,
        skippedAssets,
        {
          id: "stack",
          bucket: "lane",
          reason: "Repo work loads one stack context block.",
        },
        nonBaselineLimit,
      );
      pushAsset(
        assets,
        skippedAssets,
        {
          id: "assistant_context",
          bucket: "lane",
          reason: "Repo work keeps one contextual attachment pack instead of many prompt fragments.",
        },
        nonBaselineLimit,
      );
      if (input.hasPreparedWorkspace) {
        pushAsset(
          assets,
          skippedAssets,
          {
            id: "prepared_workspace",
            bucket: "lane",
            reason: "Repo work stages one strongest exact workspace.",
          },
          nonBaselineLimit,
        );
      }
      if (input.hasContinuation) {
        pushAsset(
          assets,
          skippedAssets,
          {
            id: "continuation",
            bucket: "continuity",
            reason: "Repo work may load one resume/continuity layer when prior implementation work exists.",
          },
          nonBaselineLimit,
        );
      }
      if (input.includeLessons) {
        pushAsset(
          assets,
          skippedAssets,
          {
            id: "lessons",
            bucket: "lane",
            reason: "Repo work may load one compact lessons block from standards.",
          },
          nonBaselineLimit,
        );
      }
      break;
    case "research":
      if (input.workflowPackId) {
        pushAsset(
          assets,
          skippedAssets,
          {
            id: "workflow_pack",
            bucket: "lane",
            reason: "Research turns load one workflow pack.",
          },
          nonBaselineLimit,
        );
      }
      pushAsset(
        assets,
        skippedAssets,
        {
          id: "assistant_context",
          bucket: "lane",
          reason: "Research turns keep one capability/context summary.",
        },
        nonBaselineLimit,
      );
      if (input.hasMinedMemory) {
        pushAsset(
          assets,
          skippedAssets,
          {
            id: "mined_memory",
            bucket: "continuity",
            reason: "Research turns load one source-aware memory layer.",
          },
          nonBaselineLimit,
        );
      }
      if (input.hasVerificationDocs) {
        pushAsset(
          assets,
          skippedAssets,
          {
            id: "retrieval_docs",
            bucket: "verification",
            reason: "Research turns load one verification layer.",
          },
          nonBaselineLimit,
        );
      }
      if (input.hasPreparedWorkspace) {
        pushAsset(
          assets,
          skippedAssets,
          {
            id: "prepared_workspace",
            bucket: "lane",
            reason: "Research turns stage one prepared workspace.",
          },
          nonBaselineLimit,
        );
      }
      if (isProductDirectionalResearch(input.query)) {
        pushAsset(
          assets,
          skippedAssets,
          {
            id: "bible",
            bucket: "lane",
            reason: "Product-direction research may load one PROJECT_BIBLE slice.",
            section: "bible",
            slices: ["direction"],
          },
          nonBaselineLimit,
        );
      } else {
        skippedAssets.push({
          id: "bible",
          reason: "Skipped because the research turn is not product-directional.",
        });
      }
      break;
    case "study":
      if (input.learningMission) {
        pushAsset(
          assets,
          skippedAssets,
          {
            id: "learning_mission",
            bucket: "lane",
            reason: "Study turns load one learning mission block.",
          },
          nonBaselineLimit,
        );
      }
      if (input.workflowPackId) {
        pushAsset(
          assets,
          skippedAssets,
          {
            id: "workflow_pack",
            bucket: "lane",
            reason: "Study turns can load one workflow pack behind the mission.",
          },
          nonBaselineLimit,
        );
      }
      pushAsset(
        assets,
        skippedAssets,
        {
          id: "assistant_context",
          bucket: "lane",
          reason: "Study turns keep one assistant capability/context summary.",
        },
        nonBaselineLimit,
      );
      if (input.hasMinedMemory) {
        pushAsset(
          assets,
          skippedAssets,
          {
            id: "mined_memory",
            bucket: "continuity",
            reason: "Study turns load one study/research memory layer.",
          },
          nonBaselineLimit,
        );
      }
      if (input.hasPreparedWorkspace) {
        pushAsset(
          assets,
          skippedAssets,
          {
            id: "prepared_workspace",
            bucket: "lane",
            reason: "Study turns stage one prepared workspace.",
          },
          nonBaselineLimit,
        );
      }
      break;
    case "archive_continuity":
      pushAsset(
        assets,
        skippedAssets,
        {
          id: "assistant_context",
          bucket: "lane",
          reason: "Archive turns load one continuity/reopen pack.",
        },
        nonBaselineLimit,
      );
      if (input.hasMinedMemory) {
        pushAsset(
          assets,
          skippedAssets,
          {
            id: "mined_memory",
            bucket: "continuity",
            reason: "Archive turns load one memory compartment summary.",
          },
          nonBaselineLimit,
        );
      }
      if (input.hasContinuation) {
        pushAsset(
          assets,
          skippedAssets,
          {
            id: "continuation",
            bucket: "continuity",
            reason: "Archive turns keep one continuity/reopen cue.",
          },
          nonBaselineLimit,
        );
      }
      if (input.hasPreparedWorkspace) {
        pushAsset(
          assets,
          skippedAssets,
          {
            id: "prepared_workspace",
            bucket: "lane",
            reason: "Archive turns stage one exact workspace behind the assistant.",
          },
          nonBaselineLimit,
        );
      }
      break;
    case "release_ops":
      pushAsset(
        assets,
        skippedAssets,
        {
          id: "standards",
          bucket: "lane",
          reason: "Release ops loads deployment standards only.",
          section: "standards",
          slices: ["deployment"],
        },
        nonBaselineLimit,
      );
      if (input.workflowPackId) {
        pushAsset(
          assets,
          skippedAssets,
          {
            id: "workflow_pack",
            bucket: "lane",
            reason: "Release turns load one release-ops workflow pack.",
          },
          nonBaselineLimit,
        );
      }
      pushAsset(
        assets,
        skippedAssets,
        {
          id: "assistant_context",
          bucket: "lane",
          reason: "Release turns keep one capability/context summary.",
        },
        nonBaselineLimit,
      );
      if (input.hasPreparedWorkspace) {
        pushAsset(
          assets,
          skippedAssets,
          {
            id: "prepared_workspace",
            bucket: "lane",
            reason: "Release turns stage one release workspace.",
          },
          nonBaselineLimit,
        );
      }
      break;
    case "baseline":
    default:
      pushAsset(
        assets,
        skippedAssets,
        {
          id: "assistant_context",
          bucket: "lane",
          reason: "Baseline conversation keeps one compact assistant context pack when it helps.",
        },
        nonBaselineLimit,
      );
      break;
  }

  return {
    lane,
    baselineBudgetChars: BASELINE_CONTEXT_BUDGET,
    laneBudgetChars: CONTEXT_LANE_BUDGETS[lane],
    workflowPackId: input.workflowPackId,
    assets,
    skippedAssets,
  };
}

function compactText(text: string, maxChars: number) {
  const trimmed = text.trim();
  if (!trimmed) {
    return { text: "", compacted: false, chars: 0 };
  }
  if (trimmed.length <= maxChars) {
    return { text: trimmed, compacted: false, chars: trimmed.length };
  }
  const clipped = `${trimmed.slice(0, Math.max(0, maxChars - 40)).trimEnd()}\n[CONTEXT COMPACTED]\n`;
  return { text: clipped, compacted: true, chars: clipped.length };
}

function pushWithinBudget(args: {
  items: ContextLoadedAsset[];
  skipped: ContextAssetSkip[];
  request: ContextAssetRequest;
  content: string;
  usedChars: number;
  budgetChars: number;
}) {
  const trimmed = args.content.trim();
  if (!trimmed) {
    args.skipped.push({
      id: args.request.id,
      reason: `Skipped because the ${args.request.id} asset was empty.`,
    });
    return { text: "", usedChars: args.usedChars };
  }
  const remaining = args.budgetChars - args.usedChars;
  if (remaining <= 64) {
    args.skipped.push({
      id: args.request.id,
      reason: `Skipped because the ${args.request.bucket} budget was exhausted.`,
    });
    return { text: "", usedChars: args.usedChars };
  }
  const next = compactText(trimmed, remaining);
  args.items.push({
    id: args.request.id,
    bucket: args.request.bucket,
    reason: args.request.reason,
    chars: next.chars,
    compacted: next.compacted,
  });
  return {
    text: next.text,
    usedChars: args.usedChars + next.chars,
  };
}

export function renderContextBundle(args: {
  manifest: ContextManifest;
  contentByAsset: Partial<Record<ContextAssetId, string>>;
}): ContextRenderResult {
  const selectedAssets: ContextLoadedAsset[] = [];
  const skippedAssets = [...args.manifest.skippedAssets];
  const baselineChunks: string[] = [];
  const laneChunks: string[] = [];
  let baselineChars = 0;
  let laneChars = 0;

  for (const request of args.manifest.assets.filter((entry) => entry.bucket === "baseline")) {
    const next = pushWithinBudget({
      items: selectedAssets,
      skipped: skippedAssets,
      request,
      content: args.contentByAsset[request.id] ?? "",
      usedChars: baselineChars,
      budgetChars: args.manifest.baselineBudgetChars,
    });
    baselineChars = next.usedChars;
    if (next.text) baselineChunks.push(next.text);
  }

  for (const request of args.manifest.assets.filter((entry) => entry.bucket !== "baseline")) {
    const next = pushWithinBudget({
      items: selectedAssets,
      skipped: skippedAssets,
      request,
      content: args.contentByAsset[request.id] ?? "",
      usedChars: laneChars,
      budgetChars: args.manifest.laneBudgetChars,
    });
    laneChars = next.usedChars;
    if (next.text) laneChunks.push(next.text);
  }

  const blocks = [...baselineChunks, ...laneChunks].filter(Boolean);
  return {
    context: blocks.length > 0 ? `\n\n${blocks.join("\n\n")}\n` : "",
    report: {
      lane: args.manifest.lane,
      workflowPackId: args.manifest.workflowPackId,
      baselineBudgetChars: args.manifest.baselineBudgetChars,
      laneBudgetChars: args.manifest.laneBudgetChars,
      totalChars: baselineChars + laneChars,
      baselineChars,
      laneChars,
      selectedAssets,
      skippedAssets,
    },
  };
}
