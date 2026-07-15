import { readExternalToolBridgeSummary } from "@/lib/externalToolBridge";
import { MCPORTER_OPERATOR_GUIDANCE } from "@/lib/mcporterBridgeConstants";

export { MCPORTER_OPERATOR_GUIDANCE } from "@/lib/mcporterBridgeConstants";

export const MCPORTER_BRIDGE_PATTERN_VERSION =
  "mcporter-bridge-pattern.v1" as const;

export type McporterTransport = "stdio" | "http" | "sse";

export interface McporterServerDescriptor {
  id: string;
  label: string;
  transport: McporterTransport;
  auth: "none" | "oauth" | "bearer";
  enabled: boolean;
  notes: string;
}

export interface McporterBridgePatternSummary {
  version: typeof MCPORTER_BRIDGE_PATTERN_VERSION;
  configFormat: "jsonc";
  descriptorOnly: true;
  alignedWith: "steipete/mcporter";
  servers: McporterServerDescriptor[];
  operatorGuidance: string[];
  nexusBridgeStatus: ReturnType<typeof readExternalToolBridgeSummary>["status"];
}

export function buildMcporterBridgePatternSummary(): McporterBridgePatternSummary {
  const bridge = readExternalToolBridgeSummary();
  const gatewayEnabled =
    process.env.NEXUS_MCP_GATEWAY_ENABLED === "true" ||
    process.env.NEXUS_MCP_GATEWAY_ENABLED === "1";

  return {
    version: MCPORTER_BRIDGE_PATTERN_VERSION,
    configFormat: "jsonc",
    descriptorOnly: true,
    alignedWith: "steipete/mcporter",
    servers: [
      {
        id: "local_mcp_gateway",
        label: "Local MCP gateway",
        transport: "http",
        auth: "oauth",
        enabled: gatewayEnabled,
        notes:
          "Descriptor-only in Nexus v1. Mirrors mcporter JSONC server entries without bundling CLI execution.",
      },
    ],
    operatorGuidance: [...MCPORTER_OPERATOR_GUIDANCE],
    nexusBridgeStatus: bridge.status,
  };
}

export function buildMcporterOperatorBrief(): string {
  const summary = buildMcporterBridgePatternSummary();
  return (
    `[MCPORTER BRIDGE PATTERN — descriptor only]\n` +
    `Status: ${summary.nexusBridgeStatus}\n` +
    `Config: ${summary.configFormat} server entries · OAuth-aware · no generic execution\n` +
    `${summary.operatorGuidance.map((line, index) => `${index + 1}. ${line}`).join("\n")}\n` +
    `[END MCPORTER BRIDGE PATTERN]\n`
  );
}
