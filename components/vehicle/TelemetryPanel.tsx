// ── components/vehicle/TelemetryPanel ──────────────────────
// Real-time vehicle telemetry display: metrics, status, diagnostics.

"use client";
// speed, heading, GPS, battery, motor status, CPU/GPU temp, AI model, obstacles.

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  DEFAULT_VEHICLE_REPLAY_SCENARIO,
  VEHICLE_REPLAY_SCENARIOS,
} from "@/lib/vehicle/flightReplayScenarios";
import type { VehicleTelemetryFrame } from "@/lib/vehicle/types";

interface Telemetry {
  speed: number;
  heading: number;
  lat: number;
  lng: number;
  battery: number;
  motorFL: string;
  motorFR: string;
  motorRL: string;
  motorRR: string;
  cpuTemp: number;
  gpuTemp: number;
  aiModel: string;
  inferenceMs: number;
  obstacleCount: number;
  signalStrength: number;
}

const INITIAL: Telemetry = {
  speed: 12.4,
  heading: 247,
  lat: 34.05221,
  lng: -118.24372,
  battery: 82,
  motorFL: "OK",
  motorFR: "OK",
  motorRL: "OK",
  motorRR: "WARN",
  cpuTemp: 61,
  gpuTemp: 74,
  aiModel: "YOLOv8-nano",
  inferenceMs: 18,
  obstacleCount: 3,
  signalStrength: 87,
};

function headingToLabel(h: number): string {
  if (h >= 337.5 || h < 22.5) return "N";
  if (h < 67.5) return "NE";
  if (h < 112.5) return "E";
  if (h < 157.5) return "SE";
  if (h < 202.5) return "S";
  if (h < 247.5) return "SW";
  if (h < 292.5) return "W";
  return "NW";
}

function motorStatusFromFrame(frame: VehicleTelemetryFrame, motorId: "FL" | "FR" | "RL" | "RR") {
  const health = frame.motors.find((motor) => motor.id === motorId)?.health ?? "warning";
  return health === "ok" ? "OK" : health === "offline" ? "OFF" : "WARN";
}

function frameToTelemetry(frame: VehicleTelemetryFrame): Telemetry {
  return {
    speed: frame.position.groundSpeedMps * 3.6,
    heading: frame.position.headingDeg,
    lat: frame.position.lat,
    lng: frame.position.lon,
    battery: frame.battery.percent,
    motorFL: motorStatusFromFrame(frame, "FL"),
    motorFR: motorStatusFromFrame(frame, "FR"),
    motorRL: motorStatusFromFrame(frame, "RL"),
    motorRR: motorStatusFromFrame(frame, "RR"),
    cpuTemp: frame.companion.cpuTempC,
    gpuTemp: frame.companion.gpuTempC,
    aiModel: frame.companion.aiModel,
    inferenceMs: frame.companion.inferenceMs,
    obstacleCount: frame.detections.obstacles,
    signalStrength: frame.link.qualityPercent,
  };
}

export default function TelemetryPanel() {
  const [liveTelemetry, setLiveTelemetry] = useState<Telemetry>(INITIAL);
  const [activeScenarioId, setActiveScenarioId] = useState(
    DEFAULT_VEHICLE_REPLAY_SCENARIO.id,
  );
  const [scenarioFrameIndex, setScenarioFrameIndex] = useState(0);
  const activeScenario =
    VEHICLE_REPLAY_SCENARIOS.find((scenario) => scenario.id === activeScenarioId) ??
    DEFAULT_VEHICLE_REPLAY_SCENARIO;

  useEffect(() => {
    const id = setInterval(() => {
      setLiveTelemetry((prev) => ({
        ...prev,
        speed: Math.max(
          0,
          Math.min(30, prev.speed + (Math.random() - 0.5) * 0.8),
        ),
        heading: (prev.heading + (Math.random() - 0.5) * 2 + 360) % 360,
        lat: prev.lat + (Math.random() - 0.5) * 0.00002,
        lng: prev.lng + (Math.random() - 0.5) * 0.00002,
        battery: Math.max(0, prev.battery - 0.002),
        cpuTemp: Math.max(
          40,
          Math.min(95, prev.cpuTemp + (Math.random() - 0.5) * 0.5),
        ),
        gpuTemp: Math.max(
          50,
          Math.min(95, prev.gpuTemp + (Math.random() - 0.5) * 0.5),
        ),
        inferenceMs: Math.max(
          10,
          Math.min(60, prev.inferenceMs + (Math.random() - 0.5) * 2),
        ),
        obstacleCount: Math.max(
          0,
          Math.min(
            10,
            prev.obstacleCount +
              (Math.random() < 0.1 ? Math.round(Math.random() - 0.4) : 0),
          ),
        ),
        signalStrength: Math.max(
          0,
          Math.min(100, prev.signalStrength + (Math.random() - 0.5) * 2),
        ),
      }));
    }, 600);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    setScenarioFrameIndex(0);
  }, [activeScenarioId]);

  useEffect(() => {
    const frameCount = activeScenario.frames.length;
    if (frameCount <= 1) return undefined;

    const id = setInterval(() => {
      setScenarioFrameIndex((index) => (index + 1) % frameCount);
    }, 1200);

    return () => clearInterval(id);
  }, [activeScenario.id, activeScenario.frames.length]);

  const scenarioFrame =
    activeScenario.frames[scenarioFrameIndex % Math.max(1, activeScenario.frames.length)];
  const t = scenarioFrame ? frameToTelemetry(scenarioFrame) : liveTelemetry;

  const batteryColor =
    t.battery > 50 ? "#10b981" : t.battery > 20 ? "#f59e0b" : "#ef4444";
  const cpuAlert = t.cpuTemp > 80;
  const gpuAlert = t.gpuTemp > 80;
  const battAlert = t.battery < 20;

  const metrics = [
    {
      label: "Speed",
      value: `${t.speed.toFixed(1)}`,
      unit: "km/h",
      color: "var(--text)",
      icon: "🚗",
      alert: false,
    },
    {
      label: "Heading",
      value: `${Math.round(t.heading)}°`,
      unit: headingToLabel(t.heading),
      color: "var(--accent2)",
      icon: "🧭",
      alert: false,
    },
    {
      label: "Battery",
      value: `${t.battery.toFixed(0)}`,
      unit: "%",
      color: batteryColor,
      icon: "🔋",
      alert: battAlert,
    },
    {
      label: "Obstacles",
      value: `${t.obstacleCount}`,
      unit: "nearby",
      color: t.obstacleCount > 5 ? "#ef4444" : "var(--text)",
      icon: "⚠️",
      alert: t.obstacleCount > 5,
    },
    {
      label: "CPU Temp",
      value: `${t.cpuTemp.toFixed(0)}`,
      unit: "°C",
      color: cpuAlert ? "#ef4444" : "#10b981",
      icon: "💻",
      alert: cpuAlert,
    },
    {
      label: "GPU Temp",
      value: `${t.gpuTemp.toFixed(0)}`,
      unit: "°C",
      color: gpuAlert ? "#ef4444" : "#10b981",
      icon: "🖥️",
      alert: gpuAlert,
    },
    {
      label: "Inference",
      value: `${t.inferenceMs.toFixed(0)}`,
      unit: "ms",
      color: "var(--accent2)",
      icon: "🤖",
      alert: false,
    },
    {
      label: "Signal",
      value: `${t.signalStrength.toFixed(0)}`,
      unit: "%",
      color: t.signalStrength > 60 ? "#10b981" : "#f59e0b",
      icon: "📡",
      alert: t.signalStrength < 30,
    },
  ];

  return (
    <div>
      <div
        style={{
          fontSize: "10px",
          fontWeight: 700,
          color: "var(--accent)",
          textTransform: "uppercase",
          letterSpacing: "1px",
          marginBottom: "12px",
        }}
      >
        Vehicle Telemetry
      </div>

      <section
        data-testid="vehicle-replay-scenarios"
        style={{
          background: "rgba(59,130,246,0.08)",
          border: "1px solid rgba(59,130,246,0.22)",
          borderRadius: "var(--rs)",
          padding: "10px 12px",
          marginBottom: "10px",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: "8px",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "8px",
          }}
        >
          <div>
            <div
              style={{
                fontSize: "9px",
                color: "#93c5fd",
                textTransform: "uppercase",
                letterSpacing: "0.8px",
                fontWeight: 800,
              }}
            >
              Scenario replay
            </div>
            <div style={{ fontSize: "10px", color: "var(--text3)", marginTop: "3px" }}>
              Simulation only. Nexus does not arm, steer, or mode-switch an aircraft.
            </div>
          </div>
          <span
            style={{
              fontSize: "9px",
              color: "#bfdbfe",
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: "0.6px",
            }}
          >
            Frame {scenarioFrameIndex + 1}/{activeScenario.frames.length}
          </span>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
            gap: "6px",
            marginBottom: "8px",
          }}
        >
          {VEHICLE_REPLAY_SCENARIOS.map((scenario) => {
            const active = scenario.id === activeScenario.id;
            return (
              <button
                key={scenario.id}
                type="button"
                aria-pressed={active}
                onClick={() => setActiveScenarioId(scenario.id)}
                style={{
                  border: active ? "1px solid rgba(147,197,253,0.56)" : "1px solid var(--border)",
                  background: active ? "rgba(147,197,253,0.16)" : "rgba(255,255,255,0.03)",
                  color: active ? "#dbeafe" : "var(--text2)",
                  borderRadius: "999px",
                  padding: "7px 9px",
                  fontSize: "9px",
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  cursor: "pointer",
                }}
              >
                {scenario.label}
              </button>
            );
          })}
        </div>
        <div style={{ fontSize: "10px", color: "var(--text3)", lineHeight: 1.55 }}>
          {activeScenario.summary}
          {scenarioFrame?.recentEvents[0]?.message ? (
            <span style={{ color: "#bfdbfe" }}> Current: {scenarioFrame.recentEvents[0].message}</span>
          ) : null}
        </div>
      </section>

      {/* GPS row */}
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
          {t.lat.toFixed(5)}°N, {Math.abs(t.lng).toFixed(5)}°W
        </span>
        <span
          style={{
            marginLeft: "auto",
            fontSize: "9px",
            color: "#10b981",
            fontWeight: 700,
          }}
        >
          3D FIX
        </span>
      </div>

      {/* Metrics grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "6px",
          marginBottom: "10px",
        }}
      >
        {metrics.map((m) => (
          <motion.div
            key={m.label}
            animate={
              m.alert
                ? {
                    boxShadow: [
                      "0 0 0 1px var(--border)",
                      "0 0 6px 2px rgba(239,68,68,0.4)",
                      "0 0 0 1px var(--border)",
                    ],
                  }
                : {}
            }
            transition={m.alert ? { duration: 1.2, repeat: Infinity } : {}}
            style={{
              background: "var(--surf2)",
              border: `1px solid ${m.alert ? "#ef444466" : "var(--border)"}`,
              borderRadius: "var(--rs)",
              padding: "8px 10px",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "14px", marginBottom: "2px" }}>
              {m.icon}
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
              {m.label}
            </div>
            <div
              style={{
                fontSize: "20px",
                fontWeight: 900,
                color: m.color,
                fontFamily: "monospace",
                lineHeight: 1,
              }}
            >
              {m.value}
            </div>
            <div
              style={{
                fontSize: "8px",
                color: "var(--text3)",
                marginTop: "1px",
              }}
            >
              {m.unit}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Motor status */}
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
          {[
            { label: "FL", val: t.motorFL },
            { label: "FR", val: t.motorFR },
            { label: "RL", val: t.motorRL },
            { label: "RR", val: t.motorRR },
          ].map((m) => (
            <div
              key={m.label}
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
                {m.label}
              </span>
              <span
                style={{
                  width: "5px",
                  height: "5px",
                  borderRadius: "50%",
                  background: m.val === "OK" ? "#10b981" : "#f59e0b",
                  display: "inline-block",
                }}
              />
              <span
                style={{
                  fontSize: "9px",
                  fontWeight: 700,
                  color: m.val === "OK" ? "#10b981" : "#f59e0b",
                }}
              >
                {m.val}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* AI model status */}
      <div
        style={{
          background: "var(--surf2)",
          border: "1px solid var(--border)",
          borderRadius: "var(--rs)",
          padding: "8px 12px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "12px" }}>🤖</span>
          <div>
            <div
              style={{
                fontSize: "9px",
                color: "var(--text3)",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              AI Model
            </div>
            <div
              style={{
                fontSize: "11px",
                fontWeight: 700,
                color: "var(--accent2)",
                fontFamily: "monospace",
              }}
            >
              {t.aiModel}
            </div>
          </div>
          <div style={{ marginLeft: "auto", textAlign: "right" }}>
            <div style={{ fontSize: "9px", color: "var(--text3)" }}>
              Inference
            </div>
            <div
              style={{
                fontSize: "14px",
                fontWeight: 900,
                color: "var(--text)",
                fontFamily: "monospace",
              }}
            >
              {t.inferenceMs.toFixed(0)}
              <span
                style={{
                  fontSize: "9px",
                  color: "var(--text3)",
                  fontWeight: 400,
                }}
              >
                ms
              </span>
            </div>
          </div>
          <span
            style={{
              fontSize: "9px",
              fontWeight: 700,
              padding: "2px 8px",
              borderRadius: "4px",
              background: "rgba(16,185,129,0.15)",
              color: "#10b981",
            }}
          >
            RUNNING
          </span>
        </div>
      </div>
    </div>
  );
}
