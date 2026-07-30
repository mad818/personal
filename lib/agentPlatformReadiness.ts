import "server-only";

import { isFirecrawlConfigured } from "@/lib/firecrawlReadiness";
import {
  readMcpGatewayEnabled,
  readMcpGatewayUrl,
} from "@/lib/mcpGatewayAdapter";
import { isMarkItDownConfigured } from "@/lib/markitdownReadiness";
import { evaluateTimesFmReadiness } from "@/lib/timesFmReadiness";

export function readMcpAllowlistCount(): number {
  return (process.env.NEXUS_MCP_ALLOWED_TOOLS ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean).length;
}

export function readAgentPlatformReadiness() {
  const mcpEnabled = readMcpGatewayEnabled();
  const mcpUrlConfigured = Boolean(readMcpGatewayUrl());
  const mcpAllowlistCount = readMcpAllowlistCount();
  const timesfm = evaluateTimesFmReadiness();

  return {
    firecrawl: isFirecrawlConfigured(),
    timesfm: {
      available: timesfm.available,
      advisoryOnly: timesfm.advisoryOnly,
      model: timesfm.model,
    },
    markitdown: isMarkItDownConfigured(),
    mcpGateway: {
      enabled: mcpEnabled,
      urlConfigured: mcpUrlConfigured,
      allowlistCount: mcpAllowlistCount,
      configured: mcpEnabled && mcpUrlConfigured && mcpAllowlistCount > 0,
    },
  };
}
