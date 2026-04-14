// ── components/vehicle/SensorFusion ────────────────────────
// Shared fusion summary driven by the vehicle telemetry contract.

"use client"

import { motion } from "framer-motion"
import { useVehicleTelemetry } from "@/hooks/useVehicleTelemetry"

export default function SensorFusion() {
  const { activeFrame } = useVehicleTelemetry()

  const activeSensors = activeFrame.sensors.filter((sensor) => sensor.active).length
  const totalLatency = activeFrame.pipeline.reduce((total, stage) => total + stage.latencyMs, 0)
  const confidence = activeFrame.fusionConfidencePercent
  const confidenceColor =
    confidence > 85 ? "#10b981" : confidence > 70 ? "#f59e0b" : "#ef4444"

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      <div
        style={{
          fontSize: "10px",
          fontWeight: 700,
          color: "var(--accent)",
          textTransform: "uppercase",
          letterSpacing: "1px",
        }}
      >
        Sensor Fusion
      </div>

      <div
        style={{
          background: "var(--surf2)",
          border: "1px solid var(--border)",
          borderRadius: "var(--r)",
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
          Active Sensors — {activeSensors}/{activeFrame.sensors.length}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          {activeFrame.sensors.map((sensor) => (
            <div
              key={sensor.id}
              style={{ display: "flex", alignItems: "center", gap: "6px" }}
            >
              <span
                style={{
                  fontSize: "10px",
                  fontWeight: 600,
                  color: "var(--text)",
                  width: "92px",
                }}
              >
                {sensor.label}
              </span>
              <span
                style={{
                  fontSize: "11px",
                  color: sensor.active ? "#10b981" : "#6b7280",
                  fontWeight: 700,
                }}
              >
                {sensor.active ? "OK" : "OFF"}
              </span>
              <span
                style={{
                  fontSize: "9px",
                  color: "var(--text3)",
                  marginLeft: "auto",
                }}
              >
                {sensor.active ? `${sensor.latencyMs}ms` : "disabled"}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div
        style={{
          background: "var(--surf2)",
          border: "1px solid var(--border)",
          borderRadius: "var(--r)",
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
          Detection Summary
        </div>
        <div
          style={{
            fontSize: "11px",
            color: "var(--text2)",
            marginBottom: "8px",
            lineHeight: 1.6,
          }}
        >
          <span style={{ fontWeight: 800, color: "var(--accent)" }}>
            {activeFrame.detections.people}
          </span>{" "}
          people ·{" "}
          <span style={{ fontWeight: 800, color: "var(--accent2)" }}>
            {activeFrame.detections.vehicles}
          </span>{" "}
          vehicles ·{" "}
          <span style={{ fontWeight: 800, color: "#f59e0b" }}>
            {activeFrame.detections.obstacles}
          </span>{" "}
          obstacle{activeFrame.detections.obstacles !== 1 ? "s" : ""}
        </div>
        <div style={{ marginBottom: "4px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "4px",
            }}
          >
            <span
              style={{
                fontSize: "9px",
                color: "var(--text3)",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              Fusion Confidence
            </span>
            <span
              style={{
                fontSize: "13px",
                fontWeight: 900,
                color: confidenceColor,
                fontFamily: "monospace",
              }}
            >
              {confidence.toFixed(0)}%
            </span>
          </div>
          <div
            style={{
              height: "4px",
              background: "var(--surf3)",
              borderRadius: "2px",
              overflow: "hidden",
            }}
          >
            <motion.div
              animate={{ width: `${confidence}%` }}
              transition={{ duration: 0.4 }}
              style={{
                height: "100%",
                background: confidenceColor,
                borderRadius: "2px",
              }}
            />
          </div>
        </div>
      </div>

      <div
        style={{
          background: "var(--surf2)",
          border: "1px solid var(--border)",
          borderRadius: "var(--r)",
          padding: "10px 12px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "8px",
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
            Processing Pipeline
          </div>
          <span
            style={{
              fontSize: "10px",
              fontWeight: 700,
              fontFamily: "monospace",
              color: "var(--accent2)",
            }}
          >
            {totalLatency}ms total
          </span>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "4px",
            overflowX: "auto",
          }}
        >
          {activeFrame.pipeline.map((stage, index) => (
            <div
              key={stage.name}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  background: stage.ok
                    ? "rgba(16,185,129,0.12)"
                    : "rgba(239,68,68,0.12)",
                  border: `1px solid ${stage.ok ? "#10b98133" : "#ef444433"}`,
                  borderRadius: "5px",
                  padding: "5px 8px",
                  textAlign: "center",
                  minWidth: "68px",
                }}
              >
                <div
                  style={{
                    fontSize: "8px",
                    color: stage.ok ? "#10b981" : "#ef4444",
                    fontWeight: 700,
                  }}
                >
                  {stage.name}
                </div>
                <div
                  style={{
                    fontSize: "10px",
                    fontWeight: 900,
                    color: "var(--text)",
                    fontFamily: "monospace",
                  }}
                >
                  {stage.latencyMs}ms
                </div>
              </div>
              {index < activeFrame.pipeline.length - 1 ? (
                <motion.span
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1, repeat: Infinity, delay: index * 0.2 }}
                  style={{
                    fontSize: "12px",
                    color: "var(--accent)",
                    flexShrink: 0,
                  }}
                >
                  →
                </motion.span>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
