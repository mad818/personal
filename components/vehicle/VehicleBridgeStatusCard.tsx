"use client";

import { useVehicleTelemetry } from "@/hooks/useVehicleTelemetry";

function formatBridgeAge(freshnessMs: number | null) {
  if (freshnessMs === null) return "No bridge ingest yet";
  if (freshnessMs < 1_000) return "Just now";
  if (freshnessMs < 60_000) return `${Math.round(freshnessMs / 1_000)}s ago`;
  return `${Math.round(freshnessMs / 60_000)}m ago`;
}

function labelSourceMode(mode: "simulation" | "replay" | "live_bridge") {
  if (mode === "replay") return "Replay buffer";
  if (mode === "live_bridge") return "Fresh live bridge";
  return "Simulation fallback";
}

export default function VehicleBridgeStatusCard() {
  const { bridgeStatus, sourceMode } = useVehicleTelemetry();

  const statusColor =
    sourceMode === "live_bridge"
      ? "#10b981"
      : bridgeStatus.available
        ? "#f59e0b"
        : "var(--text3)";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            fontSize: "10px",
            fontWeight: 700,
            color: "var(--accent)",
            textTransform: "uppercase",
            letterSpacing: "1px",
          }}
        >
          Passive Bridge
        </div>
        <span
          style={{
            fontSize: "9px",
            fontWeight: 700,
            padding: "2px 8px",
            borderRadius: "999px",
            background:
              sourceMode === "live_bridge"
                ? "rgba(16,185,129,0.15)"
                : "rgba(245,158,11,0.15)",
            color: statusColor,
          }}
        >
          {labelSourceMode(sourceMode)}
        </span>
        <span
          style={{
            fontSize: "9px",
            fontWeight: 700,
            padding: "2px 8px",
            borderRadius: "999px",
            background: "rgba(96,165,250,0.14)",
            color: "#60a5fa",
          }}
        >
          Read-only only
        </span>
      </div>

      <div
        style={{
          background: "var(--surf2)",
          border: "1px solid var(--border)",
          borderRadius: "var(--rs)",
          padding: "10px 12px",
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          gap: "8px",
        }}
      >
        <div>
          <div
            style={{
              fontSize: "9px",
              color: "var(--text3)",
              textTransform: "uppercase",
            }}
          >
            Bridge
          </div>
          <div
            style={{ fontSize: "12px", fontWeight: 800, color: "var(--text)" }}
          >
            {bridgeStatus.bridgeLabel ??
              bridgeStatus.bridgeId ??
              "Simulation only"}
          </div>
        </div>
        <div>
          <div
            style={{
              fontSize: "9px",
              color: "var(--text3)",
              textTransform: "uppercase",
            }}
          >
            Last ingest
          </div>
          <div
            style={{ fontSize: "12px", fontWeight: 800, color: statusColor }}
          >
            {formatBridgeAge(bridgeStatus.freshnessMs)}
          </div>
        </div>
        <div>
          <div
            style={{
              fontSize: "9px",
              color: "var(--text3)",
              textTransform: "uppercase",
            }}
          >
            Authority
          </div>
          <div
            style={{ fontSize: "12px", fontWeight: 800, color: "var(--text)" }}
          >
            {bridgeStatus.authority === "advisory"
              ? "Advisory ingest"
              : "Passive observer"}
          </div>
        </div>
        <div>
          <div
            style={{
              fontSize: "9px",
              color: "var(--text3)",
              textTransform: "uppercase",
            }}
          >
            Frames ingested
          </div>
          <div
            style={{ fontSize: "12px", fontWeight: 800, color: "var(--text)" }}
          >
            {bridgeStatus.ingestedFrames}
          </div>
        </div>
      </div>

      <div
        style={{
          background: "var(--surf2)",
          border: "1px solid var(--border)",
          borderRadius: "var(--rs)",
          padding: "10px 12px",
        }}
      >
        <div
          style={{
            fontSize: "9px",
            color: "var(--text3)",
            textTransform: "uppercase",
            letterSpacing: "0.5px",
            marginBottom: "8px",
          }}
        >
          Local bridge contract
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <div style={{ fontSize: "10px", color: "var(--text2)" }}>
            <strong>POST</strong>{" "}
            <span style={{ fontFamily: "monospace", color: "#60a5fa" }}>
              /api/vehicle/telemetry
            </span>{" "}
            ingests normalized passive telemetry from a local bridge process.
          </div>
          <div style={{ fontSize: "10px", color: "var(--text2)" }}>
            <strong>GET</strong>{" "}
            <span style={{ fontFamily: "monospace", color: "#60a5fa" }}>
              /api/vehicle/telemetry
            </span>{" "}
            returns the latest merged bridge snapshot for the operator UI.
          </div>
          <div
            style={{ fontSize: "10px", color: "var(--text3)", lineHeight: 1.5 }}
          >
            Nexus never becomes the flight controller in this lane. Fresh bridge
            data can replace the simulation view, but arming, stabilization, and
            failsafes stay outside the app.
          </div>
        </div>
      </div>
    </div>
  );
}
