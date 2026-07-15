"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/apiFetch";
import type { ExternalToolBridgeSummary } from "@/lib/externalToolBridge";
import { MCPORTER_OPERATOR_GUIDANCE } from "@/lib/mcporterBridgeConstants";

export default function McpBridgeStatusCard() {
  const [bridge, setBridge] = useState<ExternalToolBridgeSummary | null>(null);
  const [gatewayNote, setGatewayNote] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const [statusRes, gatewayRes] = await Promise.allSettled([
          apiFetch("/api/status", { signal: AbortSignal.timeout(10_000) }),
          apiFetch("/api/mcp/gateway", { signal: AbortSignal.timeout(10_000) }),
        ]);
        if (statusRes.status === "fulfilled" && statusRes.value.ok) {
          const payload = (await statusRes.value.json()) as {
            readiness?: { externalTools?: ExternalToolBridgeSummary };
          };
          setBridge(payload.readiness?.externalTools ?? null);
        }
        if (gatewayRes.status === "fulfilled" && gatewayRes.value.ok) {
          const gateway = (await gatewayRes.value.json()) as {
            message?: string;
            liveExecutionReady?: boolean;
          };
          setGatewayNote(
            gateway.liveExecutionReady
              ? `${gateway.message ?? "MCP gateway live-ready."}`
              : (gateway.message ?? null),
          );
        }
      } catch {
        /* silent failure */
      }
    })();
  }, []);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        background: "var(--surf)",
        border: "1px solid var(--border)",
        borderRadius: "10px",
        padding: "12px",
      }}
    >
      <div>
        <div
          style={{ fontSize: "12px", fontWeight: 700, color: "var(--text)" }}
        >
          MCP bridge posture
        </div>
        <div
          style={{ fontSize: "10px", color: "var(--text3)", marginTop: "2px" }}
        >
          mcporter-aligned · bounded POST when allowlist configured
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))",
          gap: "6px",
        }}
      >
        {[
          {
            label: "Bridge",
            value: bridge?.status ?? "contract-only",
          },
          { label: "Descriptors", value: String(bridge?.counts.total ?? 2) },
          { label: "Ready", value: String(bridge?.counts.ready ?? 0) },
          { label: "Contract", value: "JSONC" },
        ].map((stat) => (
          <div
            key={stat.label}
            style={{
              background: "var(--surf2)",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              padding: "8px 10px",
            }}
          >
            <div style={{ fontSize: "9px", color: "var(--text3)" }}>
              {stat.label}
            </div>
            <div
              style={{
                marginTop: "4px",
                fontSize: "12px",
                fontWeight: 700,
                color: "var(--text)",
              }}
            >
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      {gatewayNote ? (
        <div style={{ fontSize: "10px", color: "var(--text3)" }}>
          {gatewayNote}
        </div>
      ) : null}

      <ul
        style={{
          margin: 0,
          paddingLeft: "16px",
          fontSize: "10px",
          color: "var(--text3)",
          display: "grid",
          gap: "4px",
        }}
      >
        {MCPORTER_OPERATOR_GUIDANCE.slice(0, 3).map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </div>
  );
}
