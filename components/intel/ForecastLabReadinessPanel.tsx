"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/apiFetch";
import {
  AgentPlatformReadinessBadges,
  type AgentPlatformReadinessSnapshot,
} from "@/components/ui/AgentPlatformReadinessBadges";
import { ShellStack } from "@/components/ui/shell";

export default function ForecastLabReadinessPanel() {
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

  return (
    <ShellStack gap="8px">
      <div style={{ fontSize: "11px", color: "var(--text3)" }}>
        Advisory forecasting and research enrichment — activate via env vars in
        `.env.example`.
      </div>
      <AgentPlatformReadinessBadges readiness={readiness} />
      {!readiness?.timesfm?.available ? (
        <div style={{ fontSize: "10px", color: "var(--text3)" }}>
          Set `TIMESFM_ENDPOINT` for `timesfm_forecast`. World Bank macro works
          with no key via `world_bank_macro`.
        </div>
      ) : null}
    </ShellStack>
  );
}
