// ── components/vehicle/TelemetryChart ──────────────────────
// Shared chart and replay controls for the vehicle telemetry buffer.

"use client"

import { useMemo } from "react"
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import {
  AXIS_STYLE,
  CHART,
  GRID_STYLE,
  SERIES_COLORS,
  TOOLTIP_STYLE,
} from "@/lib/chartTheme"
import { useVehicleTelemetry } from "@/hooks/useVehicleTelemetry"

function labelSourceMode(mode: "simulation" | "replay" | "live_bridge") {
  if (mode === "replay") return "Replay buffer"
  if (mode === "live_bridge") return "Live bridge"
  return "Live simulation"
}

export default function TelemetryChart() {
  const {
    activeFrame,
    history,
    replayIndex,
    replayOffsetSeconds,
    sourceMode,
    actions,
  } = useVehicleTelemetry()

  const data = useMemo(() => {
    const visible = history.slice(-30)

    return visible.map((frame, index) => ({
      label: index === visible.length - 1 ? "now" : `-${visible.length - 1 - index}s`,
      Speed: Math.round(frame.position.groundSpeedMps * 3.6 * 10) / 10,
      Battery: Math.round(frame.battery.percent * 10) / 10,
      Altitude: Math.round(frame.position.altitudeAglM * 10) / 10,
    }))
  }, [history])

  const sliderValue = replayIndex ?? Math.max(0, history.length - 1)

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
          display: "flex",
          alignItems: "center",
          gap: "10px",
          flexWrap: "wrap",
          marginBottom: "10px",
        }}
      >
        <div
          style={{
            fontSize: "11px",
            fontWeight: 700,
            color: CHART.text2,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}
        >
          Telemetry Buffer
        </div>
        <span
          style={{
            fontSize: "9px",
            fontWeight: 700,
            color: sourceMode === "replay" ? "#f59e0b" : "#10b981",
          }}
        >
          {labelSourceMode(sourceMode)}
        </span>
        <span style={{ fontSize: "9px", color: CHART.text3 }}>
          {sourceMode === "replay"
            ? `${replayOffsetSeconds}s behind live`
            : `${history.length} buffered frames ready for replay`}
        </span>
        <span style={{ marginLeft: "auto", fontSize: "10px", color: CHART.text2 }}>
          Active frame: {activeFrame.position.altitudeAglM.toFixed(1)}m ·{" "}
          {activeFrame.battery.percent.toFixed(0)}%
        </span>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <ComposedChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -8 }}>
          <defs>
            <linearGradient id="vehicleSpeedGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={SERIES_COLORS[0]} stopOpacity={0.25} />
              <stop offset="95%" stopColor={SERIES_COLORS[0]} stopOpacity={0} />
            </linearGradient>
            <linearGradient id="vehicleBattGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={SERIES_COLORS[1]} stopOpacity={0.25} />
              <stop offset="95%" stopColor={SERIES_COLORS[1]} stopOpacity={0} />
            </linearGradient>
            <linearGradient id="vehicleAltGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={SERIES_COLORS[2]} stopOpacity={0.25} />
              <stop offset="95%" stopColor={SERIES_COLORS[2]} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid {...GRID_STYLE} vertical={false} />
          <XAxis
            dataKey="label"
            tick={AXIS_STYLE}
            tickLine={false}
            axisLine={{ stroke: CHART.border }}
          />
          <YAxis tick={AXIS_STYLE} tickLine={false} axisLine={false} />
          <Tooltip {...TOOLTIP_STYLE} />
          <Legend
            iconSize={8}
            wrapperStyle={{
              fontSize: "10px",
              fontFamily: "monospace",
              color: CHART.text2,
              paddingTop: "8px",
            }}
          />
          <Area type="monotone" dataKey="Speed" fill="url(#vehicleSpeedGrad)" stroke="none" />
          <Area type="monotone" dataKey="Battery" fill="url(#vehicleBattGrad)" stroke="none" />
          <Area type="monotone" dataKey="Altitude" fill="url(#vehicleAltGrad)" stroke="none" />
          <Line type="monotone" dataKey="Speed" stroke={SERIES_COLORS[0]} strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="Battery" stroke={SERIES_COLORS[1]} strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="Altitude" stroke={SERIES_COLORS[2]} strokeWidth={2} dot={false} />
        </ComposedChart>
      </ResponsiveContainer>

      <div
        style={{
          marginTop: "12px",
          display: "flex",
          gap: "10px",
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <button
          onClick={() => {
            if (sourceMode === "replay") {
              actions.resumeLive()
              return
            }
            actions.setReplayIndex(Math.max(0, history.length - 10))
          }}
          style={{
            padding: "6px 10px",
            borderRadius: "999px",
            border: "1px solid var(--border)",
            background:
              sourceMode === "replay"
                ? "rgba(16,185,129,0.12)"
                : "rgba(245,158,11,0.12)",
            color: sourceMode === "replay" ? "#10b981" : "#f59e0b",
            cursor: "pointer",
            fontSize: "10px",
            fontWeight: 800,
          }}
        >
          {sourceMode === "replay" ? "Follow live feed" : "Enter replay"}
        </button>

        <div style={{ flex: 1, minWidth: "220px" }}>
          <input
            type="range"
            min={0}
            max={Math.max(0, history.length - 1)}
            value={sliderValue}
            onChange={(event) => actions.setReplayIndex(Number(event.target.value))}
            style={{ width: "100%", accentColor: "var(--accent)" }}
            aria-label="Replay telemetry history"
          />
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: "8px",
              color: CHART.text3,
              marginTop: "4px",
            }}
          >
            <span>Oldest</span>
            <span>Replay cursor</span>
            <span>Newest</span>
          </div>
        </div>
      </div>
    </div>
  )
}
