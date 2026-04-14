// ── components/vehicle/SensorHealthRadial ──────────────────
// Radial health indicator for the shared vehicle sensor contract.

"use client"

import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts"
import { CHART, TOOLTIP_STYLE } from "@/lib/chartTheme"
import { useVehicleTelemetry } from "@/hooks/useVehicleTelemetry"

export default function SensorHealthRadial() {
  const { activeFrame } = useVehicleTelemetry()
  const sensors = activeFrame.sensors.map((sensor) => ({
    subject: sensor.label,
    health: sensor.healthPercent,
  }))

  return (
    <div
      style={{
        background: CHART.surf,
        border: `1px solid ${CHART.border}`,
        borderRadius: "10px",
        padding: "14px 16px",
      }}
    >
      <div
        style={{
          fontSize: "11px",
          fontWeight: 700,
          color: CHART.text2,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          marginBottom: "6px",
        }}
      >
        Sensor System Health
      </div>

      <ResponsiveContainer width="100%" height={230}>
        <RadarChart data={sensors} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
          <PolarGrid stroke={CHART.border} />
          <PolarAngleAxis
            dataKey="subject"
            tick={{ fill: CHART.text2, fontSize: 9, fontFamily: "monospace" }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 100]}
            tick={{ fill: CHART.text3, fontSize: 8, fontFamily: "monospace" }}
            axisLine={false}
            tickCount={5}
          />
          <Radar
            dataKey="health"
            stroke={CHART.rose}
            strokeWidth={2}
            fill={CHART.rose}
            fillOpacity={0.2}
            dot={{ fill: CHART.rose, r: 3, strokeWidth: 0 }}
          />
          <Tooltip {...TOOLTIP_STYLE} formatter={(value: unknown) => [`${value}%`, "Health"]} />
        </RadarChart>
      </ResponsiveContainer>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "5px 10px" }}>
        {activeFrame.sensors.map((sensor) => {
          const color =
            sensor.healthPercent >= 95
              ? CHART.emerald
              : sensor.healthPercent >= 88
                ? CHART.gold
                : CHART.red
          return (
            <div
              key={sensor.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "5px",
                minWidth: "120px",
              }}
            >
              <div
                style={{
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  background: sensor.active ? color : CHART.text3,
                }}
              />
              <span
                style={{
                  fontSize: "9px",
                  color: CHART.text2,
                  fontFamily: "monospace",
                }}
              >
                {sensor.label}
              </span>
              <span
                style={{
                  fontSize: "9px",
                  color: sensor.active ? color : CHART.text3,
                  fontFamily: "monospace",
                  marginLeft: "auto",
                }}
              >
                {sensor.active ? `${sensor.healthPercent}%` : "OFF"}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
