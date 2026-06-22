import "server-only";

import { isFirecrawlConfigured } from "@/lib/firecrawlScrape";
import {
  readMcpGatewayEnabled,
  readMcpGatewayUrl,
} from "@/lib/mcpGatewayAdapter";
import { isMarkItDownConfigured } from "@/lib/markitdownSubprocess";
import { evaluateTimesFmReadiness } from "@/lib/timesFmForecast";

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

  return {
    firecrawl: isFirecrawlConfigured(),
    timesfm: evaluateTimesFmReadiness(),
    markitdown: isMarkItDownConfigured(),
    mcpGateway: {
      enabled: mcpEnabled,
      urlConfigured: mcpUrlConfigured,
      allowlistCount: mcpAllowlistCount,
      liveReady: mcpEnabled && mcpUrlConfigured && mcpAllowlistCount > 0,
    },
  };
}
