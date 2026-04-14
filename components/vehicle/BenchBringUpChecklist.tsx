"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  getVehicleBenchChecklistProgress,
  VEHICLE_BENCH_CHECKLIST,
  VEHICLE_CHECKLIST_CATEGORY_LABELS,
} from "@/lib/vehicle/readiness"
import {
  areVehicleChecklistStatesEqual,
  normalizeVehicleChecklistState,
} from "@/lib/vehicle/hardwareReadiness"
import { useStore } from "@/store/useStore"

const BENCH_CATEGORIES = [
  "frame_power",
  "orientation",
  "radio_modes",
  "gps_home",
  "failsafes",
] as const

export default function BenchBringUpChecklist() {
  const checklistState = useStore((state) => state.settings.vehicleBenchChecklist ?? {})
  const toggleItem = useStore((state) => state.toggleVehicleBenchChecklistItem)
  const resetChecklist = useStore((state) => state.resetVehicleBenchChecklist)
  const updateSettings = useStore((state) => state.updateSettings)
  const [healedState, setHealedState] = useState(false)

  const normalizedChecklistState = useMemo(
    () =>
      normalizeVehicleChecklistState(
        checklistState,
        VEHICLE_BENCH_CHECKLIST.map((item) => item.id),
      ),
    [checklistState],
  )

  useEffect(() => {
    if (
      areVehicleChecklistStatesEqual(
        checklistState,
        normalizedChecklistState,
        VEHICLE_BENCH_CHECKLIST.map((item) => item.id),
      )
    ) return
    updateSettings({ vehicleBenchChecklist: normalizedChecklistState })
    setHealedState(true)
  }, [checklistState, normalizedChecklistState, updateSettings])

  const progress = getVehicleBenchChecklistProgress(normalizedChecklistState)

  const copyChecklist = useCallback(() => {
    const timestamp = new Date().toISOString().slice(0, 16).replace("T", " ")
    const lines = [`# F450 Bench Bring-Up — ${timestamp}`, "", "> Props off only.", ""]

    BENCH_CATEGORIES.forEach((category) => {
      const items = VEHICLE_BENCH_CHECKLIST.filter((item) => item.category === category)
      if (!items.length) return
      lines.push(`## ${VEHICLE_CHECKLIST_CATEGORY_LABELS[category]}`)
      items.forEach((item) => {
        lines.push(`- [${normalizedChecklistState[item.id] ? "x" : " "}] ${item.label} — ${item.detail}`)
      })
      lines.push("")
    })

    navigator.clipboard.writeText(lines.join("\n")).catch(() => {})
  }, [normalizedChecklistState])

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
        <div
          style={{
            fontSize: "10px",
            fontWeight: 700,
            color: "var(--accent)",
            textTransform: "uppercase",
            letterSpacing: "1px",
          }}
        >
          F450 Bench Bring-Up
        </div>
        <span
          style={{
            fontSize: "9px",
            fontWeight: 700,
            padding: "2px 8px",
            borderRadius: "999px",
            background: "rgba(245,158,11,0.12)",
            color: "#f59e0b",
          }}
        >
          Props off only
        </span>
        {healedState ? (
          <span
            style={{
              fontSize: "9px",
              fontWeight: 700,
              padding: "2px 8px",
              borderRadius: "999px",
              background: "rgba(16,185,129,0.15)",
              color: "#10b981",
            }}
          >
            State repaired
          </span>
        ) : null}
        <span style={{ marginLeft: "auto", fontSize: "10px", color: "var(--text3)" }}>
          {progress.completedCount}/{progress.totalCount} complete
        </span>
      </div>

      <div
        style={{
          height: "4px",
          borderRadius: "999px",
          background: "var(--border)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${progress.percent}%`,
            height: "100%",
            background: progress.remainingCount === 0 ? "#10b981" : "var(--accent)",
            transition: "width var(--t)",
          }}
        />
      </div>

      <div
        style={{
          display: "flex",
          gap: "8px",
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <span style={{ fontSize: "10px", color: "var(--text2)" }}>
          Use this to make the first bench session boring and repeatable before any real throttle.
        </span>
        <button
          type="button"
          onClick={copyChecklist}
          style={{
            marginLeft: "auto",
            height: "24px",
            padding: "0 8px",
            borderRadius: "6px",
            border: "1px solid var(--border2)",
            background: "transparent",
            color: "var(--text2)",
            cursor: "pointer",
            fontSize: "10px",
            fontWeight: 700,
          }}
        >
          Copy
        </button>
        <button
          type="button"
          onClick={resetChecklist}
          style={{
            height: "24px",
            padding: "0 8px",
            borderRadius: "6px",
            border: "1px solid var(--border2)",
            background: "transparent",
            color: "var(--text3)",
            cursor: "pointer",
            fontSize: "10px",
            fontWeight: 700,
          }}
        >
          Reset
        </button>
      </div>

      {BENCH_CATEGORIES.map((category) => {
        const items = VEHICLE_BENCH_CHECKLIST.filter((item) => item.category === category)
        const checked = items.filter((item) => normalizedChecklistState[item.id]).length

        return (
          <div key={category}>
            <div
              style={{
                fontSize: "10px",
                fontWeight: 700,
                color: "var(--text3)",
                marginBottom: "6px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              {VEHICLE_CHECKLIST_CATEGORY_LABELS[category]}
              <span style={{ fontSize: "9px", color: checked === items.length ? "#10b981" : "var(--text3)" }}>
                {checked}/{items.length}
              </span>
            </div>
            {items.map((item) => (
              <label
                key={item.id}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "8px",
                  marginBottom: "7px",
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={Boolean(normalizedChecklistState[item.id])}
                  onChange={() => toggleItem(item.id)}
                  style={{ marginTop: "2px", accentColor: "var(--accent)", flexShrink: 0 }}
                />
                <span style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                  <span
                    style={{
                      fontSize: "11px",
                      lineHeight: 1.35,
                      color: normalizedChecklistState[item.id] ? "var(--text3)" : "var(--text2)",
                      textDecoration: normalizedChecklistState[item.id] ? "line-through" : "none",
                    }}
                  >
                    {item.label}
                  </span>
                  <span style={{ fontSize: "9px", color: "var(--text3)" }}>{item.detail}</span>
                </span>
              </label>
            ))}
          </div>
        )
      })}
    </div>
  )
}
