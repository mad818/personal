"use client";

import { ShellBadge } from "@/components/ui/shell";

export interface AgentPlatformReadinessSnapshot {
  firecrawl?: boolean;
  markitdown?: boolean;
  timesfm?: {
    available?: boolean;
  };
  mcpGateway?: {
    configured?: boolean;
    allowlistCount?: number;
  };
}

export function AgentPlatformReadinessBadges({
  readiness,
}: {
  readiness: AgentPlatformReadinessSnapshot | null;
}) {
  if (!readiness) {
    return (
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
        <ShellBadge tone="muted">Platform readiness unknown</ShellBadge>
      </div>
    );
  }

  const timesfmConfigured = readiness?.timesfm?.available ?? false;
  const firecrawlConfigured = readiness?.firecrawl ?? false;
  const markitdownConfigured = readiness?.markitdown ?? false;
  const mcpConfigured = readiness?.mcpGateway?.configured ?? false;

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
      <ShellBadge tone={timesfmConfigured ? "success" : "muted"}>
        TimesFM {timesfmConfigured ? "configured" : "off"}
      </ShellBadge>
      <ShellBadge tone={firecrawlConfigured ? "success" : "muted"}>
        Firecrawl {firecrawlConfigured ? "key set" : "off"}
      </ShellBadge>
      <ShellBadge tone={markitdownConfigured ? "success" : "muted"}>
        MarkItDown {markitdownConfigured ? "found" : "off"}
      </ShellBadge>
      <ShellBadge tone={mcpConfigured ? "success" : "muted"}>
        MCP {mcpConfigured ? "configured" : "off"}
      </ShellBadge>
    </div>
  );
}
