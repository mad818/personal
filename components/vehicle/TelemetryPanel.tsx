// ── components/vehicle/TelemetryPanel ──────────────────────
// Shared vehicle telemetry display: metrics, posture, diagnostics.

"use client"

import { motion } from "framer-motion"
import { useVehicleTelemetry } from "@/hooks/useVehicleTelemetry"

function headingToLabel(headingDeg: number) {
  if (headingDeg >= 337.5 || headingDeg < 22.5) return "N"
  if (headingDeg < 67.5) return "NE"
  if (headingDeg < 112.5) return "E"
  if (headingDeg < 157.5) return "SE"
  if (headingDeg < 202.5) return "S"
  if (headingDeg < 247.5) return "SW"
  if (headingDeg < 292.5) return "W"
  return "NW"
}

function formatCoordinate(value: number, positive: string, negative: string) {
  return `${Math.abs(value).toFixed(5)}°${value >= 0 ? positive : negative}`
}

function labelSourceMode(mode: "simulation" | "replay" | "live_bridge") {
  if (mode === "replay") return "Replay"
  if (mode === "live_bridge") return "Live bridge"
  return "Simulation"
}

export default function TelemetryPanel() {
  const { activeFrame, bridgeStatus, sourceMode, controlPosture, replayOffsetSeconds } = useVehicleTelemetry()
  const latestEvent = activeFrame.recentEvents[0]

  const batteryColor =
    activeFrame.battery.percent > 50
      ? "#10b981"
      : activeFrame.battery.percent > activeFrame.battery.failsafeThresholdPercent
        ? "#f59e0b"
        : "#ef4444"

  const metrics = [
    {
      label: "Speed",
      value: `${(activeFrame.position.groundSpeedMps * 3.6).toFixed(1)}`,
      unit: "km/h",
      color: "var(--text)",
      icon: "🛫",
      alert: false,
    },
    {
      label: "Heading",
      value: `${Math.round(activeFrame.position.headingDeg)}°`,
      unit: headingToLabel(activeFrame.position.headingDeg),
      color: "var(--accent2)",
      icon: "🧭",
      alert: false,
    },
    {
      label: "Battery",
      value: `${activeFrame.battery.percent.toFixed(0)}`,
      unit: "%",
      color: batteryColor,
      icon: "🔋",
      alert: activeFrame.failsafes.battery,
    },
    {
      label: "Altitude",
      value: `${activeFrame.position.altitudeAglM.toFixed(1)}`,
      unit: "m AGL",
      color: "var(--text)",
      icon: "📏",
      alert: activeFrame.failsafes.geofence,
    },
    {
      label: "CPU Temp",
      value: `${activeFrame.companion.cpuTempC.toFixed(0)}`,
      unit: "°C",
      color: activeFrame.companion.cpuTempC > 75 ? "#ef4444" : "#10b981",
      icon: "💻",
      alert: activeFrame.companion.cpuTempC > 75,
    },
    {
      label: "GPU Temp",
      value: `${activeFrame.companion.gpuTempC.toFixed(0)}`,
      unit: "°C",
      color: activeFrame.companion.gpuTempC > 82 ? "#ef4444" : "#10b981",
      icon: "🖥️",
      alert: activeFrame.companion.gpuTempC > 82,
    },
    {
      label: "Inference",
      value: `${activeFrame.companion.inferenceMs.toFixed(0)}`,
      unit: "ms",
      color: "var(--accent2)",
      icon: "🤖",
      alert: !activeFrame.companion.connected,
    },
    {
      label: "Link",
      value: `${activeFrame.link.qualityPercent.toFixed(0)}`,
      unit: "%",
      color: activeFrame.link.qualityPercent > 60 ? "#10b981" : "#f59e0b",
      icon: "📡",
      alert: activeFrame.failsafes.radio,
    },
  ]

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          marginBottom: "12px",
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
          Vehicle Telemetry
        </div>
        <span
          style={{
            fontSize: "9px",
            fontWeight: 700,
            padding: "2px 8px",
            borderRadius: "999px",
            background:
              sourceMode === "replay"
                ? "rgba(245,158,11,0.15)"
                : "rgba(16,185,129,0.15)",
            color: sourceMode === "replay" ? "#f59e0b" : "#10b981",
          }}
        >
          {labelSourceMode(sourceMode)}
        </span>
        <span
          style={{
            fontSize: "9px",
            color: "var(--text3)",
          }}
        >
          {sourceMode === "replay"
            ? `${replayOffsetSeconds}s behind live`
            : controlPosture.label}
        </span>
      </div>

      <div
        style={{
          background: "var(--surf2)",
          border: "1px solid var(--border)",
          borderRadius: "var(--rs)",
          padding: "8px 12px",
          marginBottom: "10px",
          display: "flex",
          gap: "8px",
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <span style={{ fontSize: "12px" }}>📍</span>
        <span
          style={{
            fontSize: "9px",
            color: "var(--text3)",
            textTransform: "uppercase",
            letterSpacing: "0.5px",
          }}
        >
          GPS
        </span>
        <span
          style={{
            fontSize: "11px",
            fontWeight: 700,
            fontFamily: "monospace",
            color: "var(--accent2)",
          }}
        >
          {formatCoordinate(activeFrame.position.lat, "N", "S")},{" "}
          {formatCoordinate(activeFrame.position.lon, "E", "W")}
        </span>
        <span
          style={{
            marginLeft: "auto",
            fontSize: "9px",
            color:
              activeFrame.position.fixType === "3D" ? "#10b981" : "#f59e0b",
            fontWeight: 700,
          }}
        >
          {activeFrame.position.fixType} FIX · {activeFrame.position.satellites} sats
        </span>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "6px",
          marginBottom: "10px",
        }}
      >
        {metrics.map((metric) => (
          <motion.div
            key={metric.label}
            animate={
              metric.alert
                ? {
                    boxShadow: [
                      "0 0 0 1px var(--border)",
                      "0 0 6px 2px rgba(239,68,68,0.4)",
                      "0 0 0 1px var(--border)",
                    ],
                  }
                : {}
            }
            transition={metric.alert ? { duration: 1.2, repeat: Infinity } : {}}
            style={{
              background: "var(--surf2)",
              border: `1px solid ${metric.alert ? "#ef444466" : "var(--border)"}`,
              borderRadius: "var(--rs)",
              padding: "8px 10px",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "14px", marginBottom: "2px" }}>
              {metric.icon}
            </div>
            <div
              style={{
                fontSize: "9px",
                color: "var(--text3)",
                textTransform: "uppercase",
                letterSpacing: "0.4px",
                marginBottom: "2px",
              }}
            >
              {metric.label}
            </div>
            <div
              style={{
                fontSize: "20px",
                fontWeight: 900,
                color: metric.color,
                fontFamily: "monospace",
                lineHeight: 1,
              }}
            >
              {metric.value}
            </div>
            <div
              style={{
                fontSize: "8px",
                color: "var(--text3)",
                marginTop: "1px",
              }}
            >
              {metric.unit}
            </div>
          </motion.div>
        ))}
      </div>

      <div
        style={{
          background: "var(--surf2)",
          border: "1px solid var(--border)",
          borderRadius: "var(--rs)",
          padding: "8px 12px",
          marginBottom: "10px",
        }}
      >
        <div
          style={{
            fontSize: "9px",
            color: "var(--text3)",
            textTransform: "uppercase",
            letterSpacing: "0.5px",
            marginBottom: "6px",
          }}
        >
          Motor Status
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "4px",
          }}
        >
          {activeFrame.motors.map((motor) => (
            <div
              key={motor.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "5px",
                background: "var(--surf)",
                padding: "4px 8px",
                borderRadius: "4px",
              }}
            >
              <span
                style={{
                  fontSize: "9px",
                  color: "var(--text3)",
                  fontWeight: 700,
                }}
              >
                {motor.id}
              </span>
              <span
                style={{
                  width: "5px",
                  height: "5px",
                  borderRadius: "50%",
                  background: motor.health === "ok" ? "#10b981" : "#f59e0b",
                  display: "inline-block",
                }}
              />
              <span
                style={{
                  fontSize: "9px",
                  fontWeight: 700,
                  color: motor.health === "ok" ? "#10b981" : "#f59e0b",
                }}
              >
                {motor.health.toUpperCase()}
              </span>
              <span
                style={{
                  marginLeft: "auto",
                  fontSize: "9px",
                  fontFamily: "monospace",
                  color: "var(--text3)",
                }}
              >
                {motor.rpm} rpm
              </span>
            </div>
          ))}
        </div>
      </div>

      <div
        style={{
          background: "var(--surf2)",
          border: "1px solid var(--border)",
          borderRadius: "var(--rs)",
          padding: "8px 12px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            flexWrap: "wrap",
          }}
        >
          <span style={{ fontSize: "12px" }}>🧠</span>
          <div>
            <div
              style={{
                fontSize: "9px",
                color: "var(--text3)",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              Companion Lane
            </div>
            <div
              style={{
                fontSize: "11px",
                fontWeight: 700,
                color: "var(--accent2)",
                fontFamily: "monospace",
              }}
            >
              {activeFrame.companion.aiModel}
            </div>
          </div>
          <div style={{ marginLeft: "auto", textAlign: "right" }}>
            <div style={{ fontSize: "9px", color: "var(--text3)" }}>Route</div>
            <div
              style={{
                fontSize: "11px",
                fontWeight: 800,
                color:
                  activeFrame.companion.route === "local" ? "#10b981" : "#818cf8",
              }}
            >
              {activeFrame.companion.route === "local"
                ? "Local edge"
                : "Remote relay"}
            </div>
          </div>
          <span
            style={{
              fontSize: "9px",
              fontWeight: 700,
              padding: "2px 8px",
              borderRadius: "4px",
              background: activeFrame.companion.connected
                ? "rgba(16,185,129,0.15)"
                : "rgba(239,68,68,0.15)",
              color: activeFrame.companion.connected ? "#10b981" : "#ef4444",
            }}
          >
            {sourceMode === "live_bridge"
              ? bridgeStatus.fresh
                ? "BRIDGE FRESH"
                : "BRIDGE STALE"
              : activeFrame.companion.connected
                ? "SIM ONLINE"
                : "SIM OFFLINE"}
          </span>
        </div>
        {latestEvent ? (
          <div
            style={{
              marginTop: "10px",
              fontSize: "10px",
              color:
                latestEvent.severity === "critical"
                  ? "#ef4444"
                  : latestEvent.severity === "warning"
                    ? "#f59e0b"
                    : "var(--text2)",
            }}
          >
            {latestEvent.message}
          </div>
        ) : null}
      </div>
    </div>
  )
}
