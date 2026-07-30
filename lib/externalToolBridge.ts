import { resolveToolIsolationDescriptor } from "@/lib/security/toolIsolationPolicy";
import type { ToolCapabilityClass } from "@/lib/security/toolCapabilityPolicy";

export const EXTERNAL_TOOL_BRIDGE_VERSION = "external-tool-bridge.v1" as const;

export type ExternalToolId = "local_mcp_gateway" | "n8n_run_workflow";

export type ExternalToolBridgeStatus =
  | "contract-only"
  | "ready"
  | "blocked"
  | "adapter-offline"
  | "oauth-required";

export type ExternalToolAuthMetadata = {
  mode: "none" | "api_key" | "oauth";
  required: boolean;
  configured: boolean;
  tokenLocation: "none" | "server_env";
  status: "not-required" | "configured" | "missing" | "oauth-required";
  scopes?: string[];
};

export type ExternalToolDescriptor = {
  id: ExternalToolId;
  label: string;
  kind: "mcp_gateway" | "workflow_adapter";
  capability: ToolCapabilityClass;
  status: ExternalToolBridgeStatus;
  execution: "descriptor_only" | "isolation_exec";
  auth: ExternalToolAuthMetadata;
  policy: {
    publicRoute: false;
    genericExecution: false;
    allowlisted: boolean;
    isolationRequired: boolean;
    secretsRedacted: true;
  };
  adapter: {
    id: string;
    label: string;
    configured: boolean;
    available: boolean;
    reason: string | null;
  };
};

export type ExternalToolResultEnvelope = {
  version: typeof EXTERNAL_TOOL_BRIDGE_VERSION;
  toolId: ExternalToolId;
  status: "ok" | "blocked" | "error";
  result: string;
  metadata: {
    descriptorStatus: ExternalToolBridgeStatus;
    capability: ToolCapabilityClass;
    execution: ExternalToolDescriptor["execution"];
    adapterId: string;
    auth: Pick<
      ExternalToolAuthMetadata,
      "mode" | "required" | "configured" | "status"
    >;
    sanitized: true;
  };
};

export type ExternalToolBridgeSummary = {
  version: typeof EXTERNAL_TOOL_BRIDGE_VERSION;
  status: ExternalToolBridgeStatus;
  genericExecution: false;
  publicRoute: false;
  descriptors: ExternalToolDescriptor[];
  counts: {
    total: number;
    ready: number;
    contractOnly: number;
    blocked: number;
    adapterOffline: number;
    oauthRequired: number;
  };
};

function isTruthyEnv(value: string | undefined) {
  return value === "true" || value === "1" || value === "yes";
}

function isConfigured(value: string | undefined) {
  return Boolean(value && value.trim().length > 0);
}

function buildLocalMcpGatewayDescriptor(): ExternalToolDescriptor {
  const configured = isTruthyEnv(process.env.NEXUS_MCP_GATEWAY_ENABLED);
  const endpointConfigured = isConfigured(process.env.NEXUS_MCP_GATEWAY_URL);
  return {
    id: "local_mcp_gateway",
    label: "Local MCP gateway",
    kind: "mcp_gateway",
    capability: "exec",
    status: configured ? "oauth-required" : "contract-only",
    execution: "descriptor_only",
    auth: {
      mode: "oauth",
      required: true,
      configured: false,
      tokenLocation: "server_env",
      status: "oauth-required",
      scopes: ["mcp:tools:read", "mcp:tools:call"],
    },
    policy: {
      publicRoute: false,
      genericExecution: false,
      allowlisted: false,
      isolationRequired: true,
      secretsRedacted: true,
    },
    adapter: {
      id: "local_mcp_gateway_v1",
      label: "Descriptor-only MCP gateway contract",
      configured: configured && endpointConfigured,
      available: false,
      reason: configured ? "oauth_flow_not_configured" : "contract_only",
    },
  };
}

function resolveN8nStatus(): ExternalToolBridgeStatus {
  const isolation = resolveToolIsolationDescriptor("n8n_run_workflow", "exec");
  if (isolation.status === "blocked") return "blocked";
  if (isolation.status === "unavailable") return "adapter-offline";
  if (!isConfigured(process.env.N8N_BASE_URL)) return "adapter-offline";
  return "ready";
}

function buildN8nDescriptor(): ExternalToolDescriptor {
  const isolation = resolveToolIsolationDescriptor("n8n_run_workflow", "exec");
  const baseConfigured = isConfigured(process.env.N8N_BASE_URL);
  const apiKeyConfigured = isConfigured(process.env.N8N_API_KEY);
  return {
    id: "n8n_run_workflow",
    label: "n8n workflow runner",
    kind: "workflow_adapter",
    capability: "exec",
    status: resolveN8nStatus(),
    execution: "isolation_exec",
    auth: {
      mode: "api_key",
      required: false,
      configured: apiKeyConfigured,
      tokenLocation: "server_env",
      status: apiKeyConfigured ? "configured" : "not-required",
    },
    policy: {
      publicRoute: false,
      genericExecution: false,
      allowlisted: true,
      isolationRequired: true,
      secretsRedacted: true,
    },
    adapter: {
      id: isolation.adapter.id,
      label: isolation.adapter.label,
      configured: baseConfigured,
      available: isolation.status === "ready" && baseConfigured,
      reason:
        isolation.blockedReason ??
        isolation.adapter.reason ??
        (baseConfigured ? null : "n8n_base_url_missing"),
    },
  };
}

function summarizeStatus(
  counts: ExternalToolBridgeSummary["counts"],
): ExternalToolBridgeStatus {
  if (counts.ready > 0) return "ready";
  if (counts.oauthRequired > 0) return "oauth-required";
  if (counts.blocked > 0) return "blocked";
  if (counts.adapterOffline > 0) return "adapter-offline";
  return "contract-only";
}

export function listExternalToolDescriptors(): ExternalToolDescriptor[] {
  return [buildLocalMcpGatewayDescriptor(), buildN8nDescriptor()];
}

export function readExternalToolBridgeSummary(): ExternalToolBridgeSummary {
  const descriptors = listExternalToolDescriptors();
  const counts = descriptors.reduce<ExternalToolBridgeSummary["counts"]>(
    (acc, descriptor) => {
      acc.total += 1;
      if (descriptor.status === "ready") acc.ready += 1;
      if (descriptor.status === "contract-only") acc.contractOnly += 1;
      if (descriptor.status === "blocked") acc.blocked += 1;
      if (descriptor.status === "adapter-offline") acc.adapterOffline += 1;
      if (descriptor.status === "oauth-required") acc.oauthRequired += 1;
      return acc;
    },
    {
      total: 0,
      ready: 0,
      contractOnly: 0,
      blocked: 0,
      adapterOffline: 0,
      oauthRequired: 0,
    },
  );

  return {
    version: EXTERNAL_TOOL_BRIDGE_VERSION,
    status: summarizeStatus(counts),
    genericExecution: false,
    publicRoute: false,
    descriptors,
    counts,
  };
}

export function buildExternalToolResultEnvelope(input: {
  toolId: ExternalToolId;
  status: ExternalToolResultEnvelope["status"];
  result: string;
}): ExternalToolResultEnvelope {
  const descriptor =
    listExternalToolDescriptors().find(
      (candidate) => candidate.id === input.toolId,
    ) ?? buildN8nDescriptor();
  return {
    version: EXTERNAL_TOOL_BRIDGE_VERSION,
    toolId: input.toolId,
    status: input.status,
    result: input.result,
    metadata: {
      descriptorStatus: descriptor.status,
      capability: descriptor.capability,
      execution: descriptor.execution,
      adapterId: descriptor.adapter.id,
      auth: {
        mode: descriptor.auth.mode,
        required: descriptor.auth.required,
        configured: descriptor.auth.configured,
        status: descriptor.auth.status,
      },
      sanitized: true,
    },
  };
}
