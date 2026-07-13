import { detectAgent } from "@/components/home/office/prompts";
import type {
  AgentId,
  HQAnswerStyle,
  HQAssistantIntent,
  PreparedWorkspaceTarget,
} from "@/components/home/office/types";
import {
  resolveHQAnswerStylePlan,
  resolveHQTargetAgent,
} from "@/components/home/office/hqAnswerStyle";
import {
  detectRouteFromPrompt,
  type NexusRoute,
} from "@/lib/chatCapabilityRouting";
import {
  detectAssistantCapability,
  type AssistantCapabilityId,
} from "@/lib/assistantCapabilityRegistry";
import {
  getAssistantWorkspace,
  normalizePreparedWorkspaceTarget,
  resolveAssistantWorkspaceForRoute,
} from "@/lib/assistantSessionRegistry";
import {
  getAgentToolCatalog,
  type AgentToolCatalog,
} from "@/lib/agent";
import {
  buildAssistantChatActionModel,
  createLocalFastPathRuntimeReceipt,
  normalizeAssistantFailureMessage,
  resolveAssistantFailure,
  type AssistantAnswerMode,
  type AssistantChatActionModel,
} from "@/lib/assistantChatActions";
import {
  buildAssistantOperatorWorkflowState,
  type AssistantOperatorWorkflowState,
} from "@/lib/assistantOperatorWorkflow";
import {
  buildTeamOrchestrationPlan,
  formatTeamOrchestrationBlock,
  type TeamOrchestrationPlan,
} from "@/lib/teamOrchestration";

export interface AssistantDispatchPlan {
  input: string;
  intent: HQAssistantIntent;
  agent: AgentId;
  capabilityId: AssistantCapabilityId;
  answerStyle: HQAnswerStyle;
  answerMode: AssistantAnswerMode;
  routeHref: string | null;
  preparedWorkspace: PreparedWorkspaceTarget | null;
  toolCatalog: AgentToolCatalog;
  contextBlock: string;
  actionModel: AssistantChatActionModel;
  operatorWorkflow: AssistantOperatorWorkflowState;
  orchestrationPlan: TeamOrchestrationPlan | null;
  localReply: string | null;
  operatorChoiceNeeded: boolean;
  routeReason: string | null;
}

export interface AssistantDispatchOptions {
  forceAnswerHere?: boolean;
  forceRouteAction?: boolean;
  localInferenceDegraded?: boolean;
}

const WORKSPACE_ACTION_RE =
  /\b(?:open|show|take me to|bring me to|bring up|go to|route me to|switch to|launch|stage|jump to)\b/i;
const AMBIGUOUS_ROUTE_RE =
  /\b(?:where|which tab|which page|can you|should i|best place|better to|directly|answer here|open tab)\b/i;
const DIRECT_QUESTION_RE =
  /\b(?:what|why|how|when|who|explain|summarize|audit|research|fix|implement|review|compare|analyze|analyse)\b/i;
const LOCAL_REPLY_RE =
  /^(?:hi|hello|hey|yo|sup|what'?s up|good (?:morning|afternoon|evening)|ping|test|testing|ok|okay|k|thanks|thank you|thx)[!. ]*$/i;
const LOCAL_SIGNAL_RE = /^(?:ping|test|testing)[!. ]*$/i;
const LOCAL_ACK_RE = /^(?:ok|okay|k|thanks|thank you|thx)[!. ]*$/i;
const PROMPT_OPTIMIZATION_RE =
  /\b(?:lyra|prompt optimizer|prompt optimization|prompt forge|optimi[sz]e (?:this |my )?prompt|improve (?:this |my )?prompt|rewrite (?:this |my )?prompt)\b/i;

function resolveIntent(style: HQAnswerStyle, routeHint: NexusRoute | null): HQAssistantIntent {
  if (style === "learning") return "learning";
  if (style === "live_current") return "live_current";
  if (style === "repo_work") return "repo_work";
  if (style === "workflow") return "workflow";
  if (style === "product_help") return routeHint ? "workspace_action" : "product_help";
  return "conversation";
}

function resolveAnswerMode(
  input: string,
  routeHint: NexusRoute | null,
  style: HQAnswerStyle,
  options: AssistantDispatchOptions = {},
) {
  if (!routeHint) return "direct" as const;
  if (PROMPT_OPTIMIZATION_RE.test(input)) return "route_action" as const;
  if (options.forceRouteAction) return "route_action" as const;
  if (options.forceAnswerHere) return "direct_with_route" as const;
  if (WORKSPACE_ACTION_RE.test(input)) return "route_action" as const;
  if (AMBIGUOUS_ROUTE_RE.test(input) && !DIRECT_QUESTION_RE.test(input)) {
    return "ask_route_choice" as const;
  }
  if (style === "product_help" && !DIRECT_QUESTION_RE.test(input)) {
    return "ask_route_choice" as const;
  }
  return "direct_with_route" as const;
}

function buildRouteReason(
  mode: AssistantAnswerMode,
  target: PreparedWorkspaceTarget | null,
) {
  if (!target) return null;
  if (mode === "route_action") return `${target.label} is the requested workspace.`;
  if (mode === "ask_route_choice") {
    return `${target.label} may be more useful than answering only in chat.`;
  }
  if (mode === "direct_with_route") {
    return `${target.label} is staged as the relevant follow-through lane.`;
  }
  return null;
}

function resolveLocalReply(input: string, answerStyle: HQAnswerStyle) {
  const trimmed = input.trim();
  if (answerStyle !== "conversational" || !LOCAL_REPLY_RE.test(trimmed)) {
    return null;
  }
  if (LOCAL_SIGNAL_RE.test(trimmed)) {
    return "Signal is good. The local chat path is responsive; deeper tasks still go through the review-gated agent runtime.";
  }
  if (LOCAL_ACK_RE.test(trimmed)) {
    return "Got it. I am here when you are ready for the next move.";
  }
  return "Hey. I am here and the local command room is awake. Ask me a question, send me to a workspace, or hand me a task and I will keep edits review-gated before anything changes.";
}

function resolvePreparedWorkspace(
  input: string,
  routeHint: NexusRoute | null,
  intent: HQAssistantIntent,
) {
  const lower = input.toLowerCase();
  if (routeHint === "/command" && lower.includes("provider health")) {
    return getAssistantWorkspace("command-provider-health");
  }
  if (routeHint === "/command" && lower.includes("agent health")) {
    return getAssistantWorkspace("command-agent-health");
  }
  if (routeHint === "/command" && /runtime|efficiency|provider/.test(lower)) {
    return getAssistantWorkspace("command-runtime-efficiency");
  }
  if (routeHint === "/cyber" && /vulnerabilit|review/.test(lower)) {
    return getAssistantWorkspace("cyber-vuln-review");
  }
  if (routeHint === "/intel" && /deep research|sweep|research/.test(lower)) {
    return getAssistantWorkspace("intel-sweeps");
  }
  if (
    routeHint === "/internal/skills" &&
    PROMPT_OPTIMIZATION_RE.test(input)
  ) {
    return getAssistantWorkspace("skills-prompt-forge");
  }
  return resolveAssistantWorkspaceForRoute(routeHint, intent);
}

function buildContextBlock(plan: {
  answerMode: AssistantAnswerMode;
  routeReason: string | null;
  preparedWorkspace: PreparedWorkspaceTarget | null;
  capabilityTitle: string;
  capabilitySummary: string;
  operatorWorkflow: AssistantOperatorWorkflowState;
  orchestrationPlan: TeamOrchestrationPlan | null;
}) {
  const workspace = plan.preparedWorkspace;
  const workflow = plan.operatorWorkflow;
  const proposedEditPosture = workflow.proposedEdits.length
    ? workflow.proposedEdits
        .map((edit) => `${edit.label}: ${edit.diffState}, approval via ${edit.approvalSurface}`)
        .join("; ")
    : "none";
  const visibleTools = workflow.skillInvocations.length
    ? workflow.skillInvocations
        .map((item) => `${item.label} (${item.status})`)
        .join("; ")
    : "none";
  const orchestrationBlock = plan.orchestrationPlan
    ? formatTeamOrchestrationBlock(plan.orchestrationPlan)
    : "";
  return `

[ASSISTANT DISPATCH PLAN]
Capability: ${plan.capabilityTitle} — ${plan.capabilitySummary}
Answer mode: ${plan.answerMode}
${workspace ? `Prepared workspace: ${workspace.label} (${workspace.href}) — ${workspace.detail}` : "Prepared workspace: none"}
${plan.routeReason ? `Route reason: ${plan.routeReason}` : "Route reason: none"}
If answer mode is ask_route_choice, ask one short question offering to answer here or open the prepared workspace. If answer mode is direct_with_route, answer directly first and mention the prepared workspace only if it helps the operator continue.
[END ASSISTANT DISPATCH PLAN]

[OPERATOR WORKFLOW]
Phase: ${workflow.phaseLabel}
Review required: ${workflow.reviewRequired ? "yes" : "no"}
Proposed edit posture: ${proposedEditPosture}
Visible skills/tools: ${visibleTools}
Do not claim code was changed unless a tool result proves it. For project edits, propose or stage the diff first and wait for the operator-approved ProposedEditPanel flow before any apply.
[END OPERATOR WORKFLOW]
${orchestrationBlock}
`;
}

export function resolveAssistantDispatch(
  input: string,
  options: AssistantDispatchOptions = {},
): AssistantDispatchPlan {
  const cleanInput = input.trim();
  const routeHint = detectRouteFromPrompt(cleanInput);
  const answerStylePlan = resolveHQAnswerStylePlan(cleanInput);
  const detectedAgent = detectAgent(cleanInput);
  const candidateAgent = resolveHQTargetAgent(answerStylePlan, detectedAgent);
  const intent = resolveIntent(answerStylePlan.style, routeHint);
  const capabilityMatch = detectAssistantCapability({
    input: cleanInput,
    intent,
    answerStyle: answerStylePlan.style,
    routeHint,
  });
  const orchestrationPlan =
    capabilityMatch.capability.id === "prompt-optimization"
      ? null
      : buildTeamOrchestrationPlan(cleanInput, candidateAgent);
  const agent: AgentId =
    capabilityMatch.capability.id === "prompt-optimization" || orchestrationPlan
      ? "jansky"
      : candidateAgent;
  const answerMode = resolveAnswerMode(
    cleanInput,
    routeHint,
    answerStylePlan.style,
    options,
  );
  const preparedWorkspace = normalizePreparedWorkspaceTarget(
    resolvePreparedWorkspace(cleanInput, routeHint, intent),
  );
  const routeReason = buildRouteReason(answerMode, preparedWorkspace);
  const toolCatalog = getAgentToolCatalog(agent, cleanInput);
  const localReply = resolveLocalReply(cleanInput, answerStylePlan.style);
  const operatorWorkflow = buildAssistantOperatorWorkflowState({
    input: cleanInput,
    answerMode,
    intent,
    agent,
    capabilityId: capabilityMatch.capability.id,
    preparedWorkspace,
    toolCatalog,
    localInferenceDegraded: options.localInferenceDegraded,
  });
  const actionModel = buildAssistantChatActionModel({
    answerMode,
    routeHref: preparedWorkspace?.href ?? routeHint,
    preparedWorkspace,
    sourceText: cleanInput,
    operatorWorkflow,
    runtimeReceipt: localReply ? createLocalFastPathRuntimeReceipt() : null,
  });

  return {
    input: cleanInput,
    intent,
    agent,
    capabilityId: capabilityMatch.capability.id,
    answerStyle: answerStylePlan.style,
    answerMode,
    routeHref: preparedWorkspace?.href ?? routeHint,
    preparedWorkspace,
    toolCatalog,
    actionModel,
    operatorWorkflow,
    orchestrationPlan,
    localReply,
    contextBlock: buildContextBlock({
      answerMode,
      routeReason,
      preparedWorkspace,
      capabilityTitle: capabilityMatch.capability.title,
      capabilitySummary: capabilityMatch.capability.summary,
      operatorWorkflow,
      orchestrationPlan,
    }),
    operatorChoiceNeeded: answerMode === "ask_route_choice",
    routeReason,
  };
}

export {
  buildAssistantChatActionModel,
  normalizeAssistantFailureMessage,
  resolveAssistantFailure,
};

export const ASSISTANT_DISPATCH_CHECKS = [
  {
    prompt: "Hello",
    expectedMode: "direct",
    expectedLocalReply: true,
    expectedWorkflowPhase: "answer",
  },
  {
    prompt: "Ping",
    expectedMode: "direct",
    expectedLocalReply: true,
    expectedWorkflowPhase: "answer",
  },
  {
    prompt: "Thanks",
    expectedMode: "direct",
    expectedLocalReply: true,
    expectedWorkflowPhase: "answer",
  },
  {
    prompt: "What can you do?",
    expectedMode: "direct",
    expectedWorkflowPhase: "answer",
  },
  {
    prompt: "Show provider health",
    expectedRoute: "/command?focus=provider-health",
    expectedMode: "route_action",
  },
  {
    prompt: "Should I use Command for provider health?",
    expectedMode: "ask_route_choice",
  },
  {
    prompt: "Explain provider health",
    expectedMode: "direct_with_route",
  },
  {
    prompt: "Research latest CVEs",
    expectedIntent: "live_current",
  },
  {
    prompt: "Fix this component",
    expectedIntent: "repo_work",
    expectedWorkflowPhase: "review",
  },
  {
    prompt: "Research this dependency, implement the adapter, and audit the security boundary",
    expectedAgent: "jansky",
    expectedOrchestrator: true,
  },
  {
    prompt: "Use Lyra to optimize this prompt",
    expectedRoute: "/skills?view=prompts&focus=skills-prompt-forge",
    expectedMode: "route_action",
    expectedAgent: "jansky",
    expectedCapability: "prompt-optimization",
  },
] as const;
