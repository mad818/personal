"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/apiFetch";
import { designTokens } from "@/lib/designTokens";
import { buildSecurityPostureRollup } from "@/lib/securityPostureRollup";

interface StatusPayload {
  summary?: {
    networkMode?: string;
    highRiskRoutesEnabled?: boolean;
    tokenConfigured?: boolean;
    localData?: { posture?: string; summary?: string };
  };
  readiness?: {
    toolIsolation?: {
      status?: string;
      adapterReady?: boolean;
      blockedReason?: string | null;
    };
  };
}

export default function SecurityPostureStrip() {
  const [payload, setPayload] = useState<StatusPayload | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const response = await apiFetch("/api/status", {
          signal: AbortSignal.timeout(10_000),
        });
        if (!response.ok) return;
        setPayload((await response.json()) as StatusPayload);
      } catch {
        setPayload(null);
      }
    })();
  }, []);

  const rollup = useMemo(() => {
    if (!payload) return null;
    return buildSecurityPostureRollup({
      networkMode: payload.summary?.networkMode,
      highRiskRoutesEnabled: payload.summary?.highRiskRoutesEnabled,
      tokenConfigured: payload.summary?.tokenConfigured,
      toolIsolation: payload.readiness?.toolIsolation,
      localData: payload.summary?.localData,
    });
  }, [payload]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "6px",
        background: "var(--surf)",
        border: "1px solid var(--border)",
        borderRadius: "10px",
        padding: "10px 12px",
      }}
    >
      <div>
        <div
          style={{ fontSize: "12px", fontWeight: 700, color: "var(--text)" }}
        >
          Security posture
        </div>
        <div
          style={{ fontSize: "10px", color: "var(--text3)", marginTop: "2px" }}
        >
          Local trust, isolation, and operator-token readiness
        </div>
      </div>

      {rollup ? (
        <>
          <div style={{ fontSize: "11px", color: "var(--text)" }}>
            {rollup.headline}
          </div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "10px", color: "var(--text3)" }}>
              Network · {rollup.networkMode}
            </span>
            <span style={{ fontSize: "10px", color: "var(--text3)" }}>
              Isolation · {rollup.toolIsolationStatus}
            </span>
            <span
              style={{
                fontSize: "10px",
                color: rollup.tokenConfigured
                  ? designTokens.success
                  : designTokens.warning,
              }}
            >
              Token · {rollup.tokenConfigured ? "configured" : "missing"}
            </span>
          </div>
          {rollup.advisories.length > 0 ? (
            <ul
              style={{
                margin: 0,
                paddingLeft: "16px",
                fontSize: "10px",
                color: "var(--text3)",
              }}
            >
              {rollup.advisories.map((advisory) => (
                <li key={advisory}>{advisory}</li>
              ))}
            </ul>
          ) : null}
        </>
      ) : (
        <div style={{ fontSize: "10px", color: "var(--text3)" }}>
          Posture summary unavailable — protected status route did not respond.
        </div>
      )}
    </div>
  );
}
