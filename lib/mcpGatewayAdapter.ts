import { buildMcporterBridgePatternSummary } from "@/lib/mcporterBridgePattern";

/**
 * Bounded tool allowlist — operator extends via NEXUS_MCP_ALLOWED_TOOLS (comma-separated).
 * Empty by default: no generic execution without explicit operator opt-in.
 */
export const MCP_TOOL_ALLOWLIST: readonly string[] = [];

export interface McpGatewayDescriptor {
  enabled: boolean;
  mode: "descriptor" | "health_probe";
  transport: "http";
  servers: Array<{
    id: string;
    label: string;
    enabled: boolean;
    auth: string;
  }>;
  operatorNote: string;
}

export function readMcpGatewayEnabled(): boolean {
  return (
    process.env.NEXUS_MCP_GATEWAY_ENABLED === "true" ||
    process.env.NEXUS_MCP_GATEWAY_ENABLED === "1"
  );
}

export function readMcpGatewayUrl(): string | null {
  return process.env.NEXUS_MCP_GATEWAY_URL?.trim() || null;
}

export function readMcpStepUpToken(): string | null {
  return process.env.NEXUS_MCP_STEP_UP_TOKEN?.trim() || null;
}

/** Returns true only if tool is explicitly in static or env-configured allowlist. */
export function validateMcpToolAllowlist(tool: string): boolean {
  const envTools = (process.env.NEXUS_MCP_ALLOWED_TOOLS ?? "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  const combined = [...MCP_TOOL_ALLOWLIST, ...envTools];
  return combined.length > 0 && combined.includes(tool);
}

export interface McpGatewayExecutionResult {
  ok: boolean;
  result?: unknown;
  error?: string;
  httpStatus: number;
}

/**
 * Bounded MCP gateway tool execution.
 * Requires: NEXUS_MCP_GATEWAY_ENABLED=1 + NEXUS_MCP_GATEWAY_URL + tool in allowlist.
 * Optional step-up: NEXUS_MCP_STEP_UP_TOKEN must match if set.
 */
export async function executeMcpGatewayTool(input: {
  tool: string;
  args: Record<string, unknown>;
  stepUpToken?: string;
}): Promise<McpGatewayExecutionResult> {
  if (!readMcpGatewayEnabled()) {
    return { ok: false, error: "MCP gateway not enabled (NEXUS_MCP_GATEWAY_ENABLED).", httpStatus: 501 };
  }

  const gatewayUrl = readMcpGatewayUrl();
  if (!gatewayUrl) {
    return { ok: false, error: "NEXUS_MCP_GATEWAY_URL not configured.", httpStatus: 503 };
  }

  const requiredToken = readMcpStepUpToken();
  if (requiredToken && input.stepUpToken !== requiredToken) {
    return { ok: false, error: "Step-up authorization required.", httpStatus: 403 };
  }

  if (!validateMcpToolAllowlist(input.tool)) {
    return {
      ok: false,
      error: `Tool "${input.tool}" not in MCP gateway allowlist. Set NEXUS_MCP_ALLOWED_TOOLS.`,
      httpStatus: 403,
    };
  }

  try {
    const callUrl = `${gatewayUrl.replace(/\/$/, "")}/tools/call`;
    const bearerToken = requiredToken ?? "nexus-gateway";
    const response = await fetch(callUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${bearerToken}`,
      },
      body: JSON.stringify({ name: input.tool, arguments: input.args }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) {
      return { ok: false, error: `MCP gateway returned HTTP ${response.status}.`, httpStatus: 502 };
    }

    const result = (await response.json()) as unknown;
    return { ok: true, result, httpStatus: 200 };
  } catch {
    return { ok: false, error: "MCP gateway call failed.", httpStatus: 502 };
  }
}

export function buildMcpGatewayDescriptor(): McpGatewayDescriptor {
  const summary = buildMcporterBridgePatternSummary();
  const enabled = readMcpGatewayEnabled();
  return {
    enabled,
    mode: enabled ? "health_probe" : "descriptor",
    transport: "http",
    servers: summary.servers.map((server) => ({
      id: server.id,
      label: server.label,
      enabled: server.enabled,
      auth: server.auth,
    })),
    operatorNote: enabled
      ? "Gateway probe enabled — no arbitrary tool execution; descriptor health only."
      : "Descriptor-only — set NEXUS_MCP_GATEWAY_ENABLED=1 for health probe.",
  };
}

export function buildMcpGatewayHealthSummary(): {
  ok: boolean;
  gateway: McpGatewayDescriptor;
  message: string;
  liveExecutionReady: boolean;
} {
  const gateway = buildMcpGatewayDescriptor();
  const allowlistCount = (process.env.NEXUS_MCP_ALLOWED_TOOLS ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean).length;
  const liveExecutionReady =
    gateway.enabled && Boolean(readMcpGatewayUrl()) && allowlistCount > 0;

  if (!gateway.enabled) {
    return {
      ok: true,
      gateway,
      liveExecutionReady: false,
      message: "MCP gateway disabled — mcporter descriptor contract only.",
    };
  }

  if (!liveExecutionReady) {
    return {
      ok: true,
      gateway,
      liveExecutionReady: false,
      message:
        "MCP gateway enabled but not live-ready — set NEXUS_MCP_GATEWAY_URL and NEXUS_MCP_ALLOWED_TOOLS.",
    };
  }

  const anyEnabled = gateway.servers.some((server) => server.enabled);
  return {
    ok: anyEnabled,
    gateway,
    liveExecutionReady: true,
    message:
      "MCP gateway live-ready — bounded POST /api/mcp/gateway with allowlisted tools.",
  };
}
