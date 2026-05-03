import type { PrivacyShieldStatus } from "@/store/useStore";
import type { ExternalToolBridgeSummary } from "@/lib/externalToolBridge";

export type TrustDiagnosticsPayload = {
  runtime?: {
    online?: boolean;
  };
  auth?: {
    authenticated?: boolean;
    stepUpActive?: boolean;
    sessionRemainingSeconds?: number | null;
    stepUpRemainingSeconds?: number | null;
  };
  trust?: {
    networkMode?: string;
    highRiskEnabled?: boolean;
    connectorExposure?: {
      enabled?: number;
      total?: number;
    };
    toolIsolation?: {
      status?: "not_required" | "ready" | "unavailable" | "blocked";
      adapterReady?: boolean;
      requiredExecTools?: number;
      approvedExecTools?: number;
      reason?: string | null;
    };
    externalTools?: ExternalToolBridgeSummary;
    protectedActions?: {
      settingsWrites?: string | { status?: string; blockedReason?: string };
      verification?: string | { status?: string; blockedReason?: string };
      mutateExecTools?: string | { status?: string; blockedReason?: string };
      networkedTools?: string | { status?: string; blockedReason?: string };
    };
  };
};

export type TrustProviderPosture = {
  noAiLaneAvailable?: boolean;
  runtimeReachable?: boolean | null;
};

export type TrustPostureRow = {
  label: string;
  value: string;
};

function readProtectedActionStatus(
  raw?: string | { status?: string; blockedReason?: string },
) {
  if (typeof raw === "string") return raw;
  return raw?.status;
}

function formatProtectedActionStatus(
  raw?: string | { status?: string; blockedReason?: string },
) {
  const status = readProtectedActionStatus(raw);
  switch (raw) {
    case "ready":
      return "ready";
    case "revalidate":
      return "revalidate";
    case "session_required":
      return "re-auth";
    case "network_locked":
      return "network locked";
    case "high_risk_blocked":
    case "blocked_policy":
      return "policy blocked";
    case "connector_limited":
      return "connector limited";
    default:
      switch (status) {
        case "ready":
          return "ready";
        case "revalidate":
          return "revalidate";
        case "session_required":
          return "re-auth";
        case "network_locked":
          return "network locked";
        case "high_risk_blocked":
        case "blocked_policy":
          return "policy blocked";
        case "connector_limited":
          return "connector limited";
        default:
          return "unknown";
      }
  }
}

function formatToolIsolationStatus(
  isolation?: TrustDiagnosticsPayload["trust"] extends infer Trust
    ? Trust extends { toolIsolation?: infer ToolIsolation }
      ? ToolIsolation
      : never
    : never,
) {
  const status = isolation?.status ?? "not_required";
  const requiredExecTools = isolation?.requiredExecTools ?? 0;
  const approvedExecTools = isolation?.approvedExecTools ?? 0;

  switch (status) {
    case "ready":
      return requiredExecTools > 0
        ? `${approvedExecTools}/${requiredExecTools} exec sandboxed`
        : "exec sandboxed";
    case "blocked":
      return isolation?.reason ? `blocked · ${isolation.reason}` : "blocked";
    case "unavailable":
      return isolation?.reason
        ? `adapter offline · ${isolation.reason}`
        : "adapter offline";
    case "not_required":
    default:
      return requiredExecTools > 0 ? "sandbox pending" : "not required";
  }
}

function formatExternalToolBridgeStatus(summary?: ExternalToolBridgeSummary) {
  if (!summary) return "unknown";
  const { counts } = summary;
  switch (summary.status) {
    case "ready":
      return counts.contractOnly > 0
        ? `${counts.ready}/${counts.total} ready · contract`
        : `${counts.ready}/${counts.total} ready`;
    case "oauth-required":
      return "oauth required";
    case "blocked":
      return counts.blocked > 0 ? `${counts.blocked} blocked` : "blocked";
    case "adapter-offline":
      return "adapter offline";
    case "contract-only":
    default:
      return "contract-only";
  }
}

export function formatTrustRemaining(seconds?: number | null) {
  if (typeof seconds !== "number" || seconds <= 0) return "expired";
  if (seconds >= 3600) return `${Math.ceil(seconds / 3600)}h`;
  if (seconds >= 60) return `${Math.ceil(seconds / 60)}m`;
  return `${seconds}s`;
}

export function buildTrustPostureRows(input: {
  diagnostics: TrustDiagnosticsPayload | null;
  providerPosture: TrustProviderPosture;
  privacyShieldStatus: PrivacyShieldStatus | null;
}): TrustPostureRow[] {
  const networkMode = input.diagnostics?.trust?.networkMode ?? "local";
  const connectorEnabled = input.diagnostics?.trust?.connectorExposure?.enabled ?? 0;
  const connectorTotal = input.diagnostics?.trust?.connectorExposure?.total ?? 0;
  const sessionState = input.diagnostics?.auth?.authenticated ? "session armed" : "locked";
  const stepUpState = input.diagnostics?.auth?.stepUpActive
    ? `step-up ${formatTrustRemaining(input.diagnostics?.auth?.stepUpRemainingSeconds)}`
    : "step-up idle";
  const providerState = input.providerPosture.noAiLaneAvailable
    ? "provider degraded"
    : input.providerPosture.runtimeReachable
      ? "provider ready"
      : "runtime offline";

  return [
    { label: "Session", value: sessionState },
    { label: "Step-up", value: stepUpState },
    { label: "Network", value: networkMode },
    {
      label: "Connectors",
      value: connectorTotal > 0 ? `${connectorEnabled}/${connectorTotal} enabled` : "local only",
    },
    {
      label: "High-risk",
      value: input.diagnostics?.trust?.highRiskEnabled ? "enabled" : "blocked",
    },
    {
      label: "Isolation",
      value: formatToolIsolationStatus(input.diagnostics?.trust?.toolIsolation),
    },
    {
      label: "External tools",
      value: formatExternalToolBridgeStatus(input.diagnostics?.trust?.externalTools),
    },
    {
      label: "Privacy",
      value: input.privacyShieldStatus?.active
        ? input.privacyShieldStatus.dispatchMode === "blocked"
          ? `blocked · ${input.privacyShieldStatus.protectedCount}`
          : `${input.privacyShieldStatus.protectedCount} shielded · ${Object.keys(input.privacyShieldStatus.classCounts ?? {}).length} classes`
        : "idle",
    },
    { label: "Providers", value: providerState },
  ];
}

export function buildTrustActionRows(input: {
  diagnostics: TrustDiagnosticsPayload | null;
}): TrustPostureRow[] {
  const isolation = input.diagnostics?.trust?.toolIsolation;
  const externalTools = input.diagnostics?.trust?.externalTools;
  const actions = input.diagnostics?.trust?.protectedActions;
  return [
    {
      label: "Settings writes",
      value: formatProtectedActionStatus(actions?.settingsWrites),
    },
    {
      label: "Verification",
      value: formatProtectedActionStatus(actions?.verification),
    },
    {
      label: "Mutate / exec tools",
      value: formatProtectedActionStatus(actions?.mutateExecTools),
    },
    {
      label: "Networked tools",
      value: formatProtectedActionStatus(actions?.networkedTools),
    },
    {
      label: "Exec isolation",
      value:
        isolation?.status === "ready"
          ? formatToolIsolationStatus(isolation)
          : isolation?.reason
            ? `${isolation.status ?? "unavailable"} · ${isolation.reason}`
            : formatToolIsolationStatus(isolation),
    },
    {
      label: "MCP bridge",
      value: formatExternalToolBridgeStatus(externalTools),
    },
  ];
}

export function summarizeTrustState(diagnostics: TrustDiagnosticsPayload | null) {
  return diagnostics?.auth?.authenticated ? "trusted" : "gated";
}
