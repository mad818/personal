"use client";

import { ShellBadge } from "@/components/ui/shell";

export interface AgentPlatformReadinessSnapshot {
  firecrawl?: boolean;
  markitdown?: boolean;
  timesfm?: {
    available?: boolean;
    endpointUrl?: string | null;
  };
  mcpGateway?: {
    liveReady?: boolean;
    allowlistCount?: number;
  };
}

export function AgentPlatformReadinessBadges({
  readiness,
  compact = false,
}: {
  readiness: AgentPlatformReadinessSnapshot | null;
  compact?: boolean;
}) {
  if (!readiness) {
    return (
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
        <ShellBadge tone="muted">Platform readiness unknown</ShellBadge>
      </div>
    );
  }

  const timesfmReady = readiness?.timesfm?.available ?? false;
  const firecrawlReady = readiness?.firecrawl ?? false;
  const markitdownReady = readiness?.markitdown ?? false;
  const mcpReady = readiness?.mcpGateway?.liveReady ?? false;

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
      <ShellBadge tone={timesfmReady ? "success" : "muted"}>
        TimesFM {timesfmReady ? "ready" : "off"}
      </ShellBadge>
      <ShellBadge tone={firecrawlReady ? "success" : "muted"}>
        Firecrawl {firecrawlReady ? "BYOK" : "off"}
      </ShellBadge>
      <ShellBadge tone={markitdownReady ? "success" : "muted"}>
        MarkItDown {markitdownReady ? "ready" : "off"}
      </ShellBadge>
      <ShellBadge tone={mcpReady ? "success" : "muted"}>
        MCP {mcpReady ? "live" : "descriptor"}
      </ShellBadge>
      {!compact && timesfmReady && readiness?.timesfm?.endpointUrl ? (
        <span
          style={{ fontSize: "10px", color: "var(--text3)", width: "100%" }}
        >
          Endpoint: {readiness.timesfm.endpointUrl}
        </span>
      ) : null}
    </div>
  );
}
