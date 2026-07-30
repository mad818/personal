import type {
  AgentId,
  HQAssistantIntent,
  PreparedWorkspaceTarget,
} from "@/components/home/office/types";
import type { AgentToolCatalog } from "@/lib/agent";

export type AssistantWorkflowPhase =
  | "answer"
  | "plan"
  | "review"
  | "apply_ready"
  | "blocked"
  | "recovery";

export type AssistantOperatorWorkflowFocus =
  | "task_plan"
  | "proposed_edits"
  | "change_log"
  | "skill_invocations";

type AssistantWorkflowItemStatus = "queued" | "active" | "blocked" | "done";

export interface AssistantTaskPlanItem {
  id: string;
  label: string;
  status: AssistantWorkflowItemStatus;
}

export interface AssistantProposedEditSummary {
  id: string;
  label: string;
  files: string[];
  risk: "low" | "medium" | "high";
  requiresApproval: true;
  approvalSurface: "proposed_edit_panel";
  diffState: "pending_tool_run" | "pending_operator_review" | "none";
}

export interface AssistantChangeLogEntry {
  id: string;
  label: string;
  detail: string;
}

export interface AssistantSkillInvocationSummary {
  id: string;
  label: string;
  status: "available" | "planned" | "blocked";
  source: "tool_catalog" | "dispatch";
}

export interface AssistantOperatorWorkflowState {
  phase: AssistantWorkflowPhase;
  reviewRequired: boolean;
  phaseLabel: string;
  summary: string;
  defaultFocus: AssistantOperatorWorkflowFocus;
  taskPlan: AssistantTaskPlanItem[];
  proposedEdits: AssistantProposedEditSummary[];
  changeLog: AssistantChangeLogEntry[];
  skillInvocations: AssistantSkillInvocationSummary[];
}

type AssistantWorkflowAnswerMode =
  | "direct"
  | "direct_with_route"
  | "ask_route_choice"
  | "route_action";

interface BuildAssistantOperatorWorkflowOptions {
  input: string;
  answerMode: AssistantWorkflowAnswerMode;
  intent: HQAssistantIntent;
  agent: AgentId;
  capabilityId: string;
  preparedWorkspace: PreparedWorkspaceTarget | null;
  toolCatalog: AgentToolCatalog;
  localInferenceDegraded?: boolean;
}

const EDIT_INTENT_RE =
  /\b(?:fix|implement|edit|change|refactor|patch|create|remove|wire|update|build|write|component|file|code)\b/i;

function hasTool(toolCatalog: AgentToolCatalog, name: string) {
  return toolCatalog.tools.some((tool) => tool.name === name);
}

function buildTaskPlan(options: {
  phase: AssistantWorkflowPhase;
  preparedWorkspace: PreparedWorkspaceTarget | null;
}): AssistantTaskPlanItem[] {
  if (options.phase === "recovery") {
    return [
      {
        id: "serve",
        label: "Start Ollama (`ollama serve`).",
        status: "active",
      },
      {
        id: "model",
        label: "Install or select a local model in Settings.",
        status: "queued",
      },
      {
        id: "proof",
        label: "Run Check local AI from HQ or COMMAND.",
        status: "queued",
      },
    ];
  }

  if (options.phase === "review") {
    return [
      {
        id: "understand",
        label: "Read the operator request and identify the affected workspace.",
        status: "done",
      },
      {
        id: "inspect",
        label: "Use read/list tools before proposing a change.",
        status: "active",
      },
      {
        id: "propose",
        label: "Queue the diff through proposed edits for review.",
        status: "queued",
      },
      {
        id: "approval",
        label: "Wait for explicit operator approval before apply.",
        status: "blocked",
      },
    ];
  }

  if (options.phase === "plan") {
    return [
      {
        id: "orient",
        label: "Answer in chat or stage the relevant workspace.",
        status: "active",
      },
      {
        id: "workspace",
        label: options.preparedWorkspace
          ? `Keep ${options.preparedWorkspace.label.replace(/^Open\s+/i, "")} visible for follow-through.`
          : "Keep the current workspace in view.",
        status: options.preparedWorkspace ? "queued" : "done",
      },
    ];
  }

  return [
    {
      id: "answer",
      label: "Answer directly in chat.",
      status: "active",
    },
  ];
}

function buildSkillInvocations(options: {
  phase: AssistantWorkflowPhase;
  toolCatalog: AgentToolCatalog;
}): AssistantSkillInvocationSummary[] {
  if (options.phase === "answer") return [];

  const entries: AssistantSkillInvocationSummary[] = [];
  if (hasTool(options.toolCatalog, "read_project_file")) {
    entries.push({
      id: "read-project-file",
      label: "Project file read",
      status: "available",
      source: "tool_catalog",
    });
  }
  if (hasTool(options.toolCatalog, "list_project_files")) {
    entries.push({
      id: "list-project-files",
      label: "Project file listing",
      status: "available",
      source: "tool_catalog",
    });
  }
  if (hasTool(options.toolCatalog, "propose_project_edit")) {
    entries.push({
      id: "propose-project-edit",
      label: "Review-gated project edit",
      status: "planned",
      source: "tool_catalog",
    });
  }
  if (
    hasTool(options.toolCatalog, "patch_project_file") ||
    hasTool(options.toolCatalog, "create_project_file")
  ) {
    entries.push({
      id: "direct-mutation-tools",
      label: "Direct mutation tools remain approval-gated",
      status: "blocked",
      source: "dispatch",
    });
  }
  if (
    hasTool(options.toolCatalog, "web_search") ||
    hasTool(options.toolCatalog, "fetch_url") ||
    hasTool(options.toolCatalog, "deep_research")
  ) {
    entries.push({
      id: "research-tools",
      label: "Research and source-reading tools",
      status: "available",
      source: "tool_catalog",
    });
  }
  if (hasTool(options.toolCatalog, "delegate_specialist")) {
    entries.push({
      id: "central-orchestrator-workers",
      label: "Bounded specialist handoffs",
      status: "planned",
      source: "tool_catalog",
    });
  }

  return entries;
}

function buildChangeLog(options: {
  phase: AssistantWorkflowPhase;
  agent: AgentId;
  capabilityId: string;
  toolCatalog: AgentToolCatalog;
}): AssistantChangeLogEntry[] {
  if (options.phase === "answer") return [];

  return [
    {
      id: "dispatch",
      label: "Dispatch resolved",
      detail: `${options.agent.toUpperCase()} with capability ${options.capabilityId}.`,
    },
    {
      id: "tool-posture",
      label: "Tool posture",
      detail: `Catalog ${options.toolCatalog.id}; write-capable tools stay review-gated.`,
    },
  ];
}

export function buildAssistantOperatorWorkflowState(
  options: BuildAssistantOperatorWorkflowOptions,
): AssistantOperatorWorkflowState {
  if (options.localInferenceDegraded) {
    const taskPlan = buildTaskPlan({
      phase: "recovery",
      preparedWorkspace: null,
    });
    return {
      phase: "recovery",
      reviewRequired: false,
      phaseLabel: "Local AI recovery",
      summary:
        "Intel dashboards remain available. Restore Ollama before running agent tools or model-backed chat.",
      defaultFocus: "task_plan",
      taskPlan,
      proposedEdits: [],
      changeLog: [],
      skillInvocations: [],
    };
  }

  const editIntent =
    EDIT_INTENT_RE.test(options.input) || options.intent === "repo_work";
  const reviewRequired =
    editIntent && hasTool(options.toolCatalog, "propose_project_edit");
  const phase: AssistantWorkflowPhase = reviewRequired
    ? "review"
    : options.answerMode === "route_action" ||
        options.answerMode === "ask_route_choice" ||
        Boolean(options.preparedWorkspace)
      ? "plan"
      : "answer";
  const proposedEdits: AssistantProposedEditSummary[] = reviewRequired
    ? [
        {
          id: "review-gated-project-edit",
          label: "Review-gated project edit",
          files: ["Selected after project inspection"],
          risk: "medium",
          requiresApproval: true,
          approvalSurface: "proposed_edit_panel",
          diffState: "pending_tool_run",
        },
      ]
    : [];
  const taskPlan = buildTaskPlan({
    phase,
    preparedWorkspace: options.preparedWorkspace,
  });
  const skillInvocations = buildSkillInvocations({
    phase,
    toolCatalog: options.toolCatalog,
  });
  const changeLog = buildChangeLog({
    phase,
    agent: options.agent,
    capabilityId: options.capabilityId,
    toolCatalog: options.toolCatalog,
  });

  return {
    phase,
    reviewRequired,
    phaseLabel:
      phase === "review"
        ? "Review-gated operator run"
        : phase === "plan"
          ? "Workspace staging"
          : "Direct answer",
    summary: reviewRequired
      ? "The assistant can inspect and propose a diff, but the existing ProposedEditPanel remains the approval surface before any file changes."
      : phase === "plan"
        ? "The assistant has staged the relevant workspace while keeping the answer path visible."
        : "The assistant should answer directly without adding workflow chrome.",
    defaultFocus: reviewRequired ? "proposed_edits" : "task_plan",
    taskPlan,
    proposedEdits,
    changeLog,
    skillInvocations,
  };
}

export function shouldShowAssistantOperatorWorkflow(
  workflow: AssistantOperatorWorkflowState | null | undefined,
) {
  if (!workflow) return false;
  return (
    workflow.phase !== "answer" ||
    workflow.reviewRequired ||
    workflow.proposedEdits.length > 0 ||
    workflow.changeLog.length > 0 ||
    workflow.skillInvocations.length > 0
  );
}
