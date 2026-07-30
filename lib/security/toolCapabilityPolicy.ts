import type { NextRequest } from "next/server";
import { readStepUpAuthState } from "@/lib/security/stepUpAuth";
import { readConnectorPolicy } from "@/lib/security/connectorPolicy";
import { readNetworkMode, type NetworkMode } from "@/lib/security/routePolicy";
import {
  NEXUS_HIGH_RISK_COOKIE,
  NEXUS_NETWORK_MODE_COOKIE,
  parseBooleanPolicyCookie,
  parseNetworkModeCookie,
} from "@/lib/security/runtimePolicyCookies";

export type ToolCapabilityClass =
  | "read"
  | "analyze"
  | "mutate"
  | "exec"
  | "networked";

export type ProtectedActionStatus =
  | "ready"
  | "revalidate"
  | "session_required"
  | "network_locked"
  | "high_risk_blocked"
  | "connector_limited"
  | "blocked_policy";

export type ProtectedActionKind =
  | "settings_writes"
  | "verification"
  | "tools_mutate_exec"
  | "tools_networked";

export type ProtectedActionDescriptor = {
  action: ProtectedActionKind;
  status: ProtectedActionStatus;
  capability?: ToolCapabilityClass;
  blockedReason?: string;
};

export type ProtectedActionContext = {
  session: Awaited<ReturnType<typeof readStepUpAuthState>>["session"];
  stepUp: Awaited<ReturnType<typeof readStepUpAuthState>>["stepUp"];
  sessionAuthenticated: boolean;
  stepUpActive: boolean;
  networkMode: NetworkMode;
  highRiskEnabled: boolean;
  connectorEnabled: number;
  connectorTotal: number;
};

const TOOL_CAPABILITY_REGISTRY: Record<string, ToolCapabilityClass> = {
  web_search: "networked",
  fetch_url: "networked",
  write_file: "mutate",
  read_file: "read",
  list_files: "read",
  calculate: "analyze",
  remember: "mutate",
  recall: "read",
  ask_max: "analyze",
  delegate_specialist: "analyze",
  read_project_file: "read",
  list_project_files: "read",
  list_design_skills: "read",
  resolve_design_skill: "read",
  list_go_to_market_skills: "read",
  resolve_go_to_market_skill: "read",
  patch_project_file: "mutate",
  create_project_file: "mutate",
  reddit_search: "networked",
  github_trending: "networked",
  analyze_repo: "analyze",
  compare_repos: "analyze",
  assimilate_repo: "analyze",
  deep_research: "networked",
  feynman_research: "networked",
  feynman_paper_rank: "analyze",
  feynman_paper_inspect: "networked",
  feynman_paper_ask: "networked",
  feynman_paper_code_audit: "networked",
  feynman_outputs: "read",
  rss_fetch: "networked",
  hf_papers_search: "networked",
  huggingface_inspect: "networked",
  open_meteo_weather: "networked",
  sec_edgar_search: "networked",
  log_lesson: "mutate",
  n8n_run_workflow: "exec",
};

export function getToolCapabilityClass(tool: string): ToolCapabilityClass {
  return TOOL_CAPABILITY_REGISTRY[tool] ?? "analyze";
}

export function requiresToolStepUp(
  toolOrCapability: string | ToolCapabilityClass,
) {
  const capability =
    TOOL_CAPABILITY_REGISTRY[toolOrCapability] ?? toolOrCapability;
  return capability === "mutate" || capability === "exec";
}

export async function readProtectedActionContext(
  req: NextRequest,
): Promise<ProtectedActionContext> {
  const stepUpState = await readStepUpAuthState(req);
  const connectorPolicy = readConnectorPolicy();
  const connectorEnabled =
    Object.values(connectorPolicy).filter(Boolean).length;
  const connectorTotal = Object.keys(connectorPolicy).length;
  const networkMode =
    parseNetworkModeCookie(req.cookies.get(NEXUS_NETWORK_MODE_COOKIE)?.value) ??
    readNetworkMode();
  const highRiskEnabled =
    parseBooleanPolicyCookie(req.cookies.get(NEXUS_HIGH_RISK_COOKIE)?.value) ??
    process.env.NEXUS_ENABLE_HIGH_RISK_TOOLS === "true";

  return {
    session: stepUpState.session,
    stepUp: stepUpState.stepUp,
    sessionAuthenticated: stepUpState.sessionAuthenticated,
    stepUpActive: stepUpState.stepUpActive,
    networkMode,
    highRiskEnabled,
    connectorEnabled,
    connectorTotal,
  };
}

export function resolveProtectedActionStatus(
  action: ProtectedActionKind,
  context: ProtectedActionContext,
): ProtectedActionStatus {
  if (!context.sessionAuthenticated) return "session_required";

  const phoneTierSession = context.session?.authTier === "phone";
  if (
    phoneTierSession &&
    (action === "settings_writes" ||
      action === "verification" ||
      action === "tools_mutate_exec" ||
      action === "tools_networked")
  ) {
    return "blocked_policy";
  }

  if (action === "settings_writes" || action === "verification") {
    return context.stepUpActive ? "ready" : "revalidate";
  }

  if (context.networkMode !== "connected") return "network_locked";
  if (!context.highRiskEnabled) return "high_risk_blocked";

  if (action === "tools_networked") {
    return context.connectorEnabled > 0 ? "ready" : "connector_limited";
  }

  return context.stepUpActive ? "ready" : "revalidate";
}

export function resolveProtectedActionBlockedReason(
  status: ProtectedActionStatus,
  options: { phoneTokenLimited?: boolean } = {},
) {
  switch (status) {
    case "revalidate":
      return "step_up_required";
    case "session_required":
      return "session_required";
    case "network_locked":
      return "network_locked";
    case "high_risk_blocked":
      return "high_risk_blocked";
    case "connector_limited":
      return "connector_limited";
    case "blocked_policy":
      return options.phoneTokenLimited
        ? "phone_token_limited"
        : "blocked_policy";
    default:
      return undefined;
  }
}

export function resolveProtectedActionDescriptor(
  action: ProtectedActionKind,
  context: ProtectedActionContext,
  options: {
    capability?: ToolCapabilityClass;
    blockedReason?: string;
  } = {},
): ProtectedActionDescriptor {
  const status = resolveProtectedActionStatus(action, context);
  const blockedReason =
    options.blockedReason ??
    resolveProtectedActionBlockedReason(status, {
      phoneTokenLimited:
        context.session?.authTier === "phone" && status === "blocked_policy",
    });

  return {
    action,
    status,
    capability: options.capability,
    ...(blockedReason ? { blockedReason } : {}),
  };
}
