"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/apiFetch";
import {
  AgentPlatformReadinessBadges,
  type AgentPlatformReadinessSnapshot,
} from "@/components/ui/AgentPlatformReadinessBadges";

export default function AgentPlatformStrip() {
  const [readiness, setReadiness] =
    useState<AgentPlatformReadinessSnapshot | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const response = await apiFetch("/api/status", {
          signal: AbortSignal.timeout(10_000),
        });
        if (!response.ok) return;
        const payload = (await response.json()) as {
          readiness?: { agentPlatform?: AgentPlatformReadinessSnapshot };
        };
        setReadiness(payload.readiness?.agentPlatform ?? null);
      } catch {
        /* silent failure */
      }
    })();
  }, []);

  if (!readiness) return null;

  const anyReady =
    readiness.firecrawl ||
    readiness.markitdown ||
    readiness.timesfm?.available ||
    readiness.mcpGateway?.liveReady;

  return (
    <div
      className="nexus-hq-platform-strip"
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: "8px",
        padding: "8px 10px",
        borderRadius: "8px",
        border: "1px solid var(--border)",
        background: "var(--surf2)",
        fontSize: "10px",
        color: "var(--text3)",
      }}
    >
      <span style={{ fontWeight: 600, color: "var(--text2)" }}>
        Platform lanes
      </span>
      <AgentPlatformReadinessBadges readiness={readiness} compact />
      {!anyReady ? (
        <span>Configure BYOK lanes in Settings — see `.env.example`.</span>
      ) : null}
    </div>
  );
}
