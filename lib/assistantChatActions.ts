import type { PreparedWorkspaceTarget } from "@/components/home/office/types";
import type {
  AssistantOperatorWorkflowFocus,
  AssistantOperatorWorkflowState,
} from "@/lib/assistantOperatorWorkflow";

export type AssistantAnswerMode =
  | "direct"
  | "direct_with_route"
  | "ask_route_choice"
  | "route_action";

export type AssistantChatActionKind =
  | "answer_here"
  | "open_workspace"
  | "retry_local"
  | "open_provider_health"
  | "reset_session"
  | "view_task_plan"
  | "review_proposed_edits"
  | "view_change_log"
  | "view_skill_invocations";

export type AssistantRecoveryActionId =
  | "retry_local"
  | "open_provider_health"
  | "reset_session";

export interface AssistantChatAction {
  kind: AssistantChatActionKind;
  label: string;
  detail?: string;
  href?: string;
  prompt?: string;
  workflowFocus?: AssistantOperatorWorkflowFocus;
}

export interface AssistantTurnReceiptItem {
  label: string;
  value: string;
}

export interface AssistantRuntimeReceipt {
  provider: string;
  model: string;
  networkMode: string;
  paidApisAllowed: boolean;
  localFastPath: boolean;
  filesChanged: boolean;
  recoveryCode: string | null;
}

export interface AssistantRecoveryAction {
  id: AssistantRecoveryActionId;
  label: string;
  detail: string;
  href?: string;
}

export interface AssistantFailureResolution {
  message: string;
  recoveryAction: AssistantRecoveryAction | null;
  diagnostic: string;
  recoveryCode: string | null;
}

export interface AssistantChatActionModel {
  answerMode: AssistantAnswerMode;
  routeHref: string | null;
  preparedWorkspace: PreparedWorkspaceTarget | null;
  operatorWorkflow: AssistantOperatorWorkflowState | null;
  runtimeReceipt: AssistantRuntimeReceipt | null;
  recoveryAction: AssistantRecoveryAction | null;
  diagnostic?: string;
  receiptTitle?: string;
  receiptItems?: AssistantTurnReceiptItem[];
  changedFiles?: string[];
  actions: AssistantChatAction[];
}

function humanizeAnswerMode(mode: AssistantAnswerMode) {
  if (mode === "direct_with_route") return "Answer + workspace";
  if (mode === "ask_route_choice") return "Operator choice";
  if (mode === "route_action") return "Workspace staged";
  return "Direct answer";
}

function summarizeToolPosture(workflow: AssistantOperatorWorkflowState | null) {
  if (!workflow || workflow.skillInvocations.length === 0) return "No tool run";

  const planned = workflow.skillInvocations.filter(
    (item) => item.status === "planned",
  ).length;
  const blocked = workflow.skillInvocations.filter(
    (item) => item.status === "blocked",
  ).length;
  const available = workflow.skillInvocations.filter(
    (item) => item.status === "available",
  ).length;

  return `${available} available / ${planned} planned / ${blocked} blocked`;
}

function summarizeRuntime(receipt: AssistantRuntimeReceipt | null) {
  if (!receipt) return null;
  if (receipt.localFastPath) return "Local fast path";
  return receipt.provider || "Unknown";
}

function summarizeRuntimeModel(receipt: AssistantRuntimeReceipt | null) {
  if (!receipt) return null;
  if (receipt.localFastPath) return "No model";
  return receipt.model || "Auto";
}

function summarizeRuntimePaidApis(receipt: AssistantRuntimeReceipt | null) {
  if (!receipt) return null;
  return receipt.paidApisAllowed ? "Allowed" : "Blocked";
}

function buildTurnReceipt(options: {
  answerMode: AssistantAnswerMode;
  routeHref: string | null;
  preparedWorkspace: PreparedWorkspaceTarget | null;
  operatorWorkflow: AssistantOperatorWorkflowState | null;
  runtimeReceipt: AssistantRuntimeReceipt | null;
  recoveryAction: AssistantRecoveryAction | null;
  changedFiles: string[];
}): AssistantTurnReceiptItem[] {
  const items: AssistantTurnReceiptItem[] = [
    {
      label: "Mode",
      value: humanizeAnswerMode(options.answerMode),
    },
  ];

  const runtime = summarizeRuntime(options.runtimeReceipt);
  const model = summarizeRuntimeModel(options.runtimeReceipt);
  const paidApis = summarizeRuntimePaidApis(options.runtimeReceipt);

  if (runtime) items.push({ label: "Runtime", value: runtime });
  if (model) items.push({ label: "Model", value: model });
  if (options.runtimeReceipt?.networkMode) {
    items.push({ label: "Network", value: options.runtimeReceipt.networkMode });
  }
  if (paidApis) items.push({ label: "Paid APIs", value: paidApis });

  items.push(
    {
      label: "Workspace",
      value:
        options.preparedWorkspace?.label ??
        (options.routeHref ? options.routeHref : "Not staged"),
    },
    {
      label: "Tools",
      value: summarizeToolPosture(options.operatorWorkflow),
    },
    {
      label: "Recovery",
      value: options.recoveryAction?.label ?? "None",
    },
    {
      label: "Files",
      value:
        options.runtimeReceipt?.filesChanged || options.changedFiles.length > 0
          ? `${options.changedFiles.length} changed`
          : "No file changes",
    },
  );

  return items;
}

export function buildAssistantChatActionModel(options: {
  answerMode: AssistantAnswerMode;
  routeHref: string | null;
  preparedWorkspace: PreparedWorkspaceTarget | null;
  sourceText?: string;
  operatorWorkflow?: AssistantOperatorWorkflowState | null;
  runtimeReceipt?: AssistantRuntimeReceipt | null;
  recoveryAction?: AssistantRecoveryAction | null;
  diagnostic?: string;
  changedFiles?: string[];
}): AssistantChatActionModel {
  const actions: AssistantChatAction[] = [];
  const workspace = options.preparedWorkspace;
  const routeHref = workspace?.href ?? options.routeHref;
  const operatorWorkflow = options.operatorWorkflow ?? null;
  const changedFiles = options.changedFiles ?? [];
  const runtimeReceipt = options.runtimeReceipt ?? null;

  if (options.answerMode === "ask_route_choice") {
    actions.push({
      kind: "answer_here",
      label: "Answer here",
      prompt: options.sourceText,
      detail: "Keep this in chat and avoid switching tabs.",
    });
  }

  if (
    routeHref &&
    (options.answerMode === "ask_route_choice" ||
      options.answerMode === "direct_with_route" ||
      options.answerMode === "route_action")
  ) {
    actions.push({
      kind: "open_workspace",
      label: workspace?.label ?? "Open workspace",
      href: routeHref,
      detail: workspace?.detail ?? "Open the most relevant workspace.",
    });
  }

  if (options.recoveryAction) {
    actions.push({
      kind: options.recoveryAction.id,
      label: options.recoveryAction.label,
      href: options.recoveryAction.href,
      detail: options.recoveryAction.detail,
    });
  }

  const showWorkflowActions =
    operatorWorkflow &&
    (operatorWorkflow.phase !== "answer" ||
      operatorWorkflow.reviewRequired ||
      operatorWorkflow.proposedEdits.length > 0 ||
      operatorWorkflow.changeLog.length > 0 ||
      operatorWorkflow.skillInvocations.length > 0);

  if (showWorkflowActions && operatorWorkflow.taskPlan.length > 0) {
    actions.push({
      kind: "view_task_plan",
      label: "View task plan",
      workflowFocus: "task_plan",
      detail: "Show the assistant's current step plan.",
    });
  }

  if (showWorkflowActions && operatorWorkflow.proposedEdits.length > 0) {
    actions.push({
      kind: "review_proposed_edits",
      label: "Review proposed edits",
      workflowFocus: "proposed_edits",
      detail:
        "Show the review-gated edit posture. Actual diffs stay in ProposedEditPanel.",
    });
  }

  if (showWorkflowActions && operatorWorkflow.changeLog.length > 0) {
    actions.push({
      kind: "view_change_log",
      label: "View change log",
      workflowFocus: "change_log",
      detail: "Show dispatch and tool-posture changes for this assistant turn.",
    });
  }

  if (showWorkflowActions && operatorWorkflow.skillInvocations.length > 0) {
    actions.push({
      kind: "view_skill_invocations",
      label: "View skills/tools",
      workflowFocus: "skill_invocations",
      detail: "Show which tools are available, planned, or blocked.",
    });
  }

  return {
    answerMode: options.answerMode,
    routeHref,
    preparedWorkspace: workspace,
    operatorWorkflow,
    runtimeReceipt,
    recoveryAction: options.recoveryAction ?? null,
    diagnostic: options.diagnostic,
    receiptTitle: "Turn receipt",
    receiptItems: buildTurnReceipt({
      answerMode: options.answerMode,
      routeHref,
      preparedWorkspace: workspace,
      operatorWorkflow,
      runtimeReceipt,
      recoveryAction: options.recoveryAction ?? null,
      changedFiles,
    }),
    changedFiles,
    actions,
  };
}

export function createLocalFastPathRuntimeReceipt(): AssistantRuntimeReceipt {
  return {
    provider: "local-fast-path",
    model: "not used",
    networkMode: "browser",
    paidApisAllowed: false,
    localFastPath: true,
    filesChanged: false,
    recoveryCode: null,
  };
}

export function mergeAssistantRuntimeReceipt(
  actionModel: AssistantChatActionModel,
  runtimeReceipt: AssistantRuntimeReceipt | null,
): AssistantChatActionModel {
  if (!runtimeReceipt) return actionModel;

  return {
    ...actionModel,
    runtimeReceipt,
    receiptItems: buildTurnReceipt({
      answerMode: actionModel.answerMode,
      routeHref: actionModel.routeHref,
      preparedWorkspace: actionModel.preparedWorkspace,
      operatorWorkflow: actionModel.operatorWorkflow,
      runtimeReceipt,
      recoveryAction: actionModel.recoveryAction,
      changedFiles: actionModel.changedFiles ?? [],
    }),
  };
}

function extractStructuredError(error: unknown): {
  code: string | null;
  message: string | null;
  raw: string;
} {
  if (error && typeof error === "object") {
    const record = error as Record<string, unknown>;
    const nested =
      record.error && typeof record.error === "object"
        ? (record.error as Record<string, unknown>)
        : record;
    const code =
      typeof nested.code === "string"
        ? nested.code
        : typeof record.code === "string"
          ? record.code
          : null;
    const message =
      typeof nested.message === "string"
        ? nested.message
        : typeof record.message === "string"
          ? record.message
          : null;

    if (code || message) {
      return {
        code,
        message,
        raw: message ?? code ?? "Something went wrong.",
      };
    }
  }

  const raw =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "Something went wrong.";

  const jsonStart = raw.indexOf("{");
  if (jsonStart >= 0) {
    try {
      const parsed = JSON.parse(raw.slice(jsonStart)) as unknown;
      return extractStructuredError(parsed);
    } catch {
      // Keep the original message when the error text only contains a brace.
    }
  }

  return { code: null, message: null, raw };
}

export function resolveAssistantFailure(error: unknown): AssistantFailureResolution {
  const structured = extractStructuredError(error);
  const raw = structured.message ?? structured.raw;
  const code = structured.code;
  const codeLower = code?.toLowerCase() ?? "";
  const lower = raw.toLowerCase();

  if (
    codeLower === "session_required" ||
    lower.includes("unauthorized") ||
    lower.includes("session_required") ||
    lower.includes("401")
  ) {
    return {
      message:
        "Session required: the assistant route is locked behind the local session. Re-enter the Homefront token, then retry.",
      recoveryAction: {
        id: "reset_session",
        label: "Reset session",
        href: "/",
        detail: "Return to the local access gate and refresh the protected session.",
      },
      diagnostic: raw,
      recoveryCode: code ?? "session_required",
    };
  }

  if (
    codeLower === "ollama_unavailable" ||
    codeLower === "ollama_required" ||
    (lower.includes("ollama") &&
      (lower.includes("unreachable") ||
        lower.includes("not running") ||
        lower.includes("connection refused") ||
        lower.includes("offline")))
  ) {
    return {
      message:
        "Ollama is not reachable. Start `ollama serve`, confirm a local model is installed, then retry the assistant.",
      recoveryAction: {
        id: "retry_local",
        label: "Retry local",
        detail: "Try the same prompt again through the local Ollama lane.",
      },
      diagnostic: raw,
      recoveryCode: code ?? "ollama_unavailable",
    };
  }

  if (
    codeLower === "model_missing" ||
    codeLower === "model_not_found" ||
    codeLower === "resolved_model_mismatch" ||
    (lower.includes("not installed") && lower.includes("model")) ||
    (lower.includes("model") && lower.includes("missing"))
  ) {
    return {
      message: `${raw} Open provider health and use the detected local model, or install the requested Ollama model.`,
      recoveryAction: {
        id: "open_provider_health",
        label: "Open provider health",
        href: "/command?focus=provider-health",
        detail: "Review the resolved local model and provider chain.",
      },
      diagnostic: raw,
      recoveryCode: code ?? "model_missing",
    };
  }

  if (
    codeLower === "network_locked" ||
    codeLower === "paid_provider_blocked" ||
    codeLower === "provider_policy_blocked" ||
    codeLower === "provider_unavailable" ||
    codeLower === "connector_limited" ||
    codeLower === "high_risk_blocked" ||
    codeLower === "tool_risk_gate_blocked" ||
    lower.includes("network policy") ||
    lower.includes("network_locked") ||
    lower.includes("paid_provider_blocked") ||
    lower.includes("paid provider") ||
    lower.includes("connector") ||
    lower.includes("connector_limited") ||
    lower.includes("high-risk") ||
    lower.includes("high_risk_blocked") ||
    lower.includes("isolation") ||
    lower.includes("sandbox") ||
    lower.includes("all ai providers unavailable") ||
    lower.includes("provider")
  ) {
    return {
      message:
        lower.includes("all ai providers unavailable") || lower.includes("provider")
          ? "The active provider lane is unavailable. Review provider health, local model resolution, and network posture before retrying."
          : raw.startsWith("Error:")
            ? raw
            : `Assistant error: ${raw}`,
      recoveryAction: {
        id: "open_provider_health",
        label: "Open provider health",
        href: "/command?focus=provider-health",
        detail: "Inspect provider, network, connector, and tool-gate posture.",
      },
      diagnostic: raw,
      recoveryCode: code ?? "provider_or_policy_blocked",
    };
  }

  return {
    message: raw.startsWith("Error:") ? raw : `Assistant error: ${raw}`,
    recoveryAction: null,
    diagnostic: raw,
    recoveryCode: code,
  };
}

export function normalizeAssistantFailureMessage(error: unknown) {
  return resolveAssistantFailure(error).message;
}
