// ── components/vehicle/ControlPanel ────────────────────────
// Simulation-first control interface for future vehicle bring-up.

"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { useVehicleTelemetry } from "@/hooks/useVehicleTelemetry"
import type { VehicleFlightMode } from "@/lib/vehicle/types"

const MODE_COLORS: Record<VehicleFlightMode, string> = {
  STABILIZE: "var(--gold)",
  LOITER: "#60a5fa",
  AUTO: "#10b981",
  RTL: "#818cf8",
  LAND: "#ef4444",
}

export default function ControlPanel() {
  const {
    activeFrame,
    bridgeStatus,
    controlPosture,
    simulation,
    sourceMode,
    actions,
  } = useVehicleTelemetry()
  const [eStopPulse, setEStopPulse] = useState(false)
  const liveBridgeMode = sourceMode === "live_bridge"
  const bridgeConnected = liveBridgeMode ? bridgeStatus.fresh : simulation.companionConnected
  const controlDisabled = liveBridgeMode

  useEffect(() => {
    if (activeFrame.heartbeat.mode !== "LAND") return
    setEStopPulse(true)
    const timeout = window.setTimeout(() => setEStopPulse(false), 1800)
    return () => window.clearTimeout(timeout)
  }, [activeFrame.heartbeat.mode])

  const handleEmergencyLand = () => {
    actions.triggerEmergencyStop()
    setEStopPulse(true)
  }

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
          Vehicle Control
        </div>
        <span
          style={{
            fontSize: "9px",
            fontWeight: 700,
            color:
              sourceMode === "replay"
                ? "#f59e0b"
                : liveBridgeMode
                  ? "#60a5fa"
                  : "#10b981",
          }}
        >
          {sourceMode === "replay"
            ? "Replay control view"
            : liveBridgeMode
              ? "Passive bridge view"
              : "Simulation authority only"}
        </span>
      </div>

      <div
        style={{
          background: "var(--surf2)",
          border: "1px solid var(--border)",
          borderRadius: "var(--rs)",
          padding: "10px 12px",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          flexWrap: "wrap",
        }}
      >
        <span style={{ fontSize: "11px" }}>🛰️</span>
        <span
          style={{ fontSize: "10px", fontWeight: 700, color: "var(--text)" }}
        >
          {liveBridgeMode ? "Live telemetry bridge" : "Companion bridge"}
        </span>
        <motion.span
          animate={{ opacity: bridgeConnected ? [1, 0.3, 1] : 1 }}
          transition={{ duration: 1.5, repeat: Infinity }}
          style={{
            width: "6px",
            height: "6px",
            borderRadius: "50%",
            background: bridgeConnected ? "#10b981" : "#ef4444",
            display: "inline-block",
            marginLeft: "4px",
          }}
        />
        <span
          style={{
            fontSize: "9px",
            color: bridgeConnected ? "#10b981" : "#ef4444",
            fontWeight: 700,
          }}
        >
          {bridgeConnected
            ? liveBridgeMode
              ? "BRIDGE FRESH"
              : "SIM ONLINE"
            : liveBridgeMode
              ? "BRIDGE STALE"
              : "SIM OFFLINE"}
        </span>
        <span
          style={{
            marginLeft: "auto",
            fontSize: "9px",
            fontFamily: "monospace",
            color: "var(--text3)",
          }}
        >
          {controlPosture.note}
        </span>
        {liveBridgeMode ? (
          <span
            style={{
              fontSize: "9px",
              fontWeight: 700,
              color: "#60a5fa",
            }}
          >
            Simulation knobs parked while bridge frames are fresh
          </span>
        ) : (
          <button
            onClick={() => actions.setCompanionConnected(!simulation.companionConnected)}
            style={{
              fontSize: "9px",
              padding: "2px 8px",
              borderRadius: "4px",
              border: "none",
              cursor: "pointer",
              background: simulation.companionConnected
                ? "rgba(239,68,68,0.15)"
                : "rgba(16,185,129,0.15)",
              color: simulation.companionConnected ? "#ef4444" : "#10b981",
            }}
          >
            {simulation.companionConnected ? "Disconnect sim" : "Reconnect sim"}
          </button>
        )}
      </div>

      <div>
        <div
          style={{
            fontSize: "9px",
            color: "var(--text3)",
            textTransform: "uppercase",
            letterSpacing: "0.5px",
            marginBottom: "6px",
          }}
        >
          Autopilot Mode
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "6px",
          }}
        >
          {(["STABILIZE", "LOITER", "AUTO", "RTL"] as VehicleFlightMode[]).map((mode) => (
            <button
              key={mode}
              disabled={controlDisabled}
              onClick={() => actions.setFlightMode(mode)}
              style={{
                padding: "8px",
                borderRadius: "var(--rs)",
                cursor: controlDisabled ? "not-allowed" : "pointer",
                fontWeight: 800,
                fontSize: "10px",
                background:
                  activeFrame.heartbeat.mode === mode ? `${MODE_COLORS[mode]}22` : "var(--surf2)",
                color:
                  activeFrame.heartbeat.mode === mode ? MODE_COLORS[mode] : "var(--text2)",
                border:
                  activeFrame.heartbeat.mode === mode
                    ? `1px solid ${MODE_COLORS[mode]}55`
                    : "1px solid var(--border)",
                opacity: controlDisabled ? 0.55 : 1,
              }}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      <motion.button
        whileTap={{ scale: 0.97 }}
        disabled={controlDisabled}
        onClick={handleEmergencyLand}
        animate={
          eStopPulse
            ? {
                boxShadow: [
                  "0 0 0 0 rgba(239,68,68,0)",
                  "0 0 0 12px rgba(239,68,68,0.3)",
                  "0 0 0 0 rgba(239,68,68,0)",
                ],
              }
            : {}
        }
        transition={eStopPulse ? { duration: 0.6, repeat: 2 } : {}}
        style={{
          width: "100%",
          padding: "14px",
          borderRadius: "var(--r)",
          cursor: controlDisabled ? "not-allowed" : "pointer",
          background: eStopPulse ? "#ef4444" : "rgba(239,68,68,0.15)",
          color: "#ef4444",
          fontSize: "15px",
          fontWeight: 900,
          letterSpacing: "1px",
          border: "2px solid #ef4444",
          transition: "background var(--t), text-shadow var(--t)",
          opacity: controlDisabled ? 0.55 : 1,
        }}
      >
        {liveBridgeMode
          ? "LIVE BRIDGE OBSERVER ONLY"
          : activeFrame.heartbeat.mode === "LAND"
            ? "SIM LANDING ACTIVE"
            : "SIM EMERGENCY LAND"}
      </motion.button>

      <div>
        <div
          style={{
            fontSize: "9px",
            color: "var(--text3)",
            textTransform: "uppercase",
            letterSpacing: "0.5px",
            marginBottom: "6px",
          }}
        >
          Mission Route — {simulation.waypointCount} simulated waypoint
          {simulation.waypointCount === 1 ? "" : "s"}
        </div>
        <div style={{ display: "flex", gap: "6px" }}>
          <button
            disabled={controlDisabled}
            onClick={() => actions.setWaypointCount(simulation.waypointCount + 1)}
            style={{
              flex: 1,
              padding: "7px",
              borderRadius: "var(--rs)",
              border: "1px solid var(--border)",
              background: "var(--surf2)",
              color: "var(--text2)",
              cursor: controlDisabled ? "not-allowed" : "pointer",
              fontSize: "10px",
              fontWeight: 700,
              opacity: controlDisabled ? 0.55 : 1,
            }}
          >
            + Sim waypoint
          </button>
          <button
            disabled={controlDisabled}
            onClick={() => actions.setWaypointCount(0)}
            style={{
              flex: 1,
              padding: "7px",
              borderRadius: "var(--rs)",
              border: "1px solid var(--border)",
              background: "var(--surf2)",
              color: "var(--text2)",
              cursor: controlDisabled ? "not-allowed" : "pointer",
              fontSize: "10px",
              fontWeight: 700,
              opacity: controlDisabled ? 0.55 : 1,
            }}
          >
            Clear route
          </button>
          <button
            disabled={controlDisabled}
            onClick={() => actions.setFlightMode("RTL")}
            style={{
              flex: 1,
              padding: "7px",
              borderRadius: "var(--rs)",
              border: "none",
              background: "var(--accent)",
              color: "#fff",
              cursor: controlDisabled ? "not-allowed" : "pointer",
              fontSize: "10px",
              fontWeight: 800,
              opacity: controlDisabled ? 0.55 : 1,
            }}
          >
            Sim RTL
          </button>
        </div>
      </div>

      <div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "6px",
          }}
        >
          <div
            style={{
              fontSize: "9px",
              color: "var(--text3)",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
            }}
          >
            Speed Limit
          </div>
          <div
            style={{
              fontSize: "14px",
              fontWeight: 900,
              color: "var(--accent2)",
              fontFamily: "monospace",
            }}
          >
            {simulation.speedLimitKph}{" "}
            <span
              style={{
                fontSize: "9px",
                fontWeight: 400,
                color: "var(--text3)",
              }}
            >
              km/h
            </span>
          </div>
        </div>
        <input
          type="range"
          min={0}
          max={60}
          value={simulation.speedLimitKph}
          disabled={controlDisabled}
          onChange={(event) => actions.setSpeedLimitKph(Number(event.target.value))}
          style={{ width: "100%", accentColor: "var(--accent)", opacity: controlDisabled ? 0.55 : 1 }}
        />
      </div>

      <div>
        <div
          style={{
            fontSize: "9px",
            color: "var(--text3)",
            textTransform: "uppercase",
            letterSpacing: "0.5px",
            marginBottom: "6px",
          }}
        >
          Sensor Inputs
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "4px",
          }}
        >
          {activeFrame.sensors.map((sensor) => (
            <button
              key={sensor.id}
              disabled={controlDisabled}
              onClick={() => actions.setSensorEnabled(sensor.id, !sensor.active)}
              style={{
                padding: "5px 6px",
                borderRadius: "5px",
                border: "none",
                cursor: controlDisabled ? "not-allowed" : "pointer",
                fontSize: "9px",
                fontWeight: 700,
                background: sensor.active
                  ? "rgba(16,185,129,0.15)"
                  : "var(--surf2)",
                color: sensor.active ? "#10b981" : "var(--text3)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                opacity: controlDisabled ? 0.55 : 1,
              }}
            >
              {sensor.active ? "●" : "○"} {sensor.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div
          style={{
            fontSize: "9px",
            color: "var(--text3)",
            textTransform: "uppercase",
            letterSpacing: "0.5px",
            marginBottom: "6px",
          }}
        >
          Companion Route
        </div>
        <div style={{ display: "flex", gap: "6px" }}>
          {(["local", "remote"] as const).map((route) => (
            <button
              key={route}
              disabled={controlDisabled}
              onClick={() => actions.setCompanionRoute(route)}
              style={{
                flex: 1,
                padding: "7px",
                borderRadius: "var(--rs)",
                border: "none",
                cursor: controlDisabled ? "not-allowed" : "pointer",
                fontSize: "10px",
                fontWeight: 800,
                background:
                  simulation.companionRoute === route
                    ? "rgba(129,140,248,0.2)"
                    : "var(--surf2)",
                color:
                  simulation.companionRoute === route ? "#818cf8" : "var(--text2)",
                opacity: controlDisabled ? 0.55 : 1,
              }}
            >
              {route === "local" ? "Local edge" : "Remote relay"}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
