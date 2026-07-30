"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/apiFetch";
import {
  AgentPlatformReadinessBadges,
  type AgentPlatformReadinessSnapshot,
} from "@/components/ui/AgentPlatformReadinessBadges";
import { ShellButton, ShellStack } from "@/components/ui/shell";

export default function ForecastLabReadinessPanel() {
  const [readiness, setReadiness] =
    useState<AgentPlatformReadinessSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadReadiness = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await apiFetch("/api/status", {
        signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok) {
        throw new Error("status_unavailable");
      }
      const payload = (await response.json()) as {
        readiness?: { agentPlatform?: AgentPlatformReadinessSnapshot };
      };
      if (!payload.readiness?.agentPlatform) {
        throw new Error("readiness_missing");
      }
      setReadiness(payload.readiness.agentPlatform);
    } catch {
      setError(
        "Platform readiness refresh failed; the last verified posture, if any, is retained and configuration is not inferred.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadReadiness();
  }, [loadReadiness]);

  return (
    <ShellStack gap="8px">
      <div style={{ fontSize: "11px", color: "var(--text3)" }}>
        Advisory forecasting and research enrichment — activate via env vars in
        `.env.example`.
      </div>
      {loading && !readiness ? (
        <div role="status" style={{ fontSize: "10px", color: "var(--text3)" }}>
          Checking platform readiness…
        </div>
      ) : null}
      <AgentPlatformReadinessBadges readiness={readiness} />
      {readiness && !readiness.timesfm?.available ? (
        <div style={{ fontSize: "10px", color: "var(--text3)" }}>
          Set `TIMESFM_ENDPOINT` to advertise an operator-managed advisory
          forecast endpoint. Nexus does not call it from this panel.
        </div>
      ) : null}
      {error ? (
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div role="alert" style={{ fontSize: "10px", color: "var(--text3)" }}>
            {error}
          </div>
          <ShellButton onClick={loadReadiness} disabled={loading}>
            Retry
          </ShellButton>
        </div>
      ) : null}
    </ShellStack>
  );
}
