// ── components/vehicle/CameraArray ─────────────────────────
// Shared multi-camera feed display for the vehicle simulation source.

"use client"

import { useEffect, useMemo, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { useVehicleTelemetry } from "@/hooks/useVehicleTelemetry"
import type { VehicleCameraType } from "@/lib/vehicle/types"

const TYPE_COLORS: Record<VehicleCameraType, string> = {
  RGB: "#10b981",
  NV: "#4ade80",
  Thermal: "#f59e0b",
  LiDAR: "#818cf8",
  Wide: "#60a5fa",
  Rear: "#a78bfa",
}

function CameraOverlay({ type }: { type: VehicleCameraType }) {
  if (type === "NV") {
    return (
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background: "rgba(22,163,74,0.12)",
          backgroundImage:
            "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(74,222,128,0.04) 3px, rgba(74,222,128,0.04) 6px)",
        }}
      />
    )
  }

  if (type === "Thermal") {
    return (
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background:
            "linear-gradient(160deg, rgba(59,130,246,0.1) 0%, rgba(245,158,11,0.1) 50%, rgba(239,68,68,0.14) 100%)",
        }}
      />
    )
  }

  if (type === "LiDAR") {
    return (
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            backgroundImage:
              "radial-gradient(circle, rgba(129,140,248,0.2) 1px, transparent 1px)",
            backgroundSize: "10px 10px",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(90deg, rgba(129,140,248,0.06) 1px, transparent 1px), linear-gradient(180deg, rgba(129,140,248,0.06) 1px, transparent 1px)",
            backgroundSize: "20px 20px",
          }}
        />
      </div>
    )
  }

  if (type === "Wide") {
    return (
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background:
            "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.35) 100%)",
        }}
      />
    )
  }

  return null
}

export default function CameraArray() {
  const { activeFrame } = useVehicleTelemetry()
  const cameras = activeFrame.cameras
  const [activeId, setActiveId] = useState<string>("")
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    if (!cameras.length) return
    if (!cameras.some((camera) => camera.id === activeId)) {
      setActiveId(cameras[0].id)
    }
  }, [activeId, cameras])

  const activeCamera = useMemo(
    () => cameras.find((camera) => camera.id === activeId) ?? cameras[0],
    [activeId, cameras],
  )
  const expandedCamera = expandedId
    ? cameras.find((camera) => camera.id === expandedId) ?? null
    : null

  return (
    <div>
      <div
        style={{
          fontSize: "10px",
          fontWeight: 700,
          color: "var(--accent)",
          textTransform: "uppercase",
          letterSpacing: "1px",
          marginBottom: "10px",
        }}
      >
        Multi-Spectrum Camera Array —{" "}
        {cameras.filter((camera) => camera.status === "active").length} Active
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(6, 1fr)",
          gap: "8px",
        }}
      >
        {cameras.map((camera) => {
          const isActive = camera.id === activeId
          return (
            <div
              key={camera.id}
              onClick={() => {
                setActiveId(camera.id)
                setExpandedId(camera.id)
              }}
              style={{
                position: "relative",
                background: "#060405",
                border: `1px solid ${isActive ? "var(--accent)" : "var(--border)"}`,
                borderRadius: "var(--rs)",
                overflow: "hidden",
                cursor: "pointer",
                boxShadow: isActive ? "0 0 10px 2px rgba(196,72,90,0.3)" : "none",
                transition: "box-shadow var(--t), border-color var(--t)",
              }}
            >
              <CameraOverlay type={camera.type} />

              <div
                style={{
                  height: "80px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  position: "relative",
                  zIndex: 1,
                  opacity: camera.status === "offline" ? 0.45 : 1,
                }}
              >
                <span style={{ fontSize: "18px", opacity: 0.3 }}>📹</span>
                <span
                  style={{
                    fontSize: "8px",
                    color: "var(--text3)",
                    marginTop: "4px",
                    fontFamily: "monospace",
                  }}
                >
                  {camera.status === "offline" ? "offline" : `${camera.fps} fps`}
                </span>
              </div>

              <div
                style={{
                  position: "absolute",
                  top: "5px",
                  right: "5px",
                  zIndex: 2,
                }}
              >
                <span
                  style={{
                    width: "5px",
                    height: "5px",
                    borderRadius: "50%",
                    background:
                      camera.status === "active"
                        ? "#10b981"
                        : camera.status === "standby"
                          ? "#f59e0b"
                          : "#6b7280",
                    display: "inline-block",
                  }}
                />
              </div>

              <div
                style={{
                  padding: "4px 5px",
                  borderTop: "1px solid var(--border)",
                  background: "rgba(0,0,0,0.6)",
                  position: "relative",
                  zIndex: 1,
                }}
              >
                <div
                  style={{
                    fontSize: "8px",
                    fontWeight: 700,
                    color: TYPE_COLORS[camera.type],
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {camera.type}
                </div>
                <div
                  style={{
                    fontSize: "7px",
                    color: "var(--text3)",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {camera.label}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {activeCamera ? (
        <div
          style={{
            marginTop: "8px",
            display: "flex",
            gap: "6px",
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <span style={{ fontSize: "9px", color: "var(--text3)" }}>Active:</span>
          <span style={{ fontSize: "10px", fontWeight: 700, color: "var(--text2)" }}>
            {activeCamera.label}
          </span>
          <span
            style={{
              fontSize: "9px",
              padding: "1px 6px",
              borderRadius: "3px",
              background: `${TYPE_COLORS[activeCamera.type]}22`,
              color: TYPE_COLORS[activeCamera.type],
            }}
          >
            {activeCamera.type}
          </span>
          <span style={{ fontSize: "9px", color: "var(--text3)", marginLeft: "auto" }}>
            {activeCamera.resolution} · {activeCamera.status}
          </span>
        </div>
      ) : null}

      <AnimatePresence>
        {expandedCamera ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 9999,
              background: "rgba(0,0,0,0.92)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
            }}
            onClick={() => setExpandedId(null)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              onClick={(event) => event.stopPropagation()}
              style={{
                background: "#060405",
                border: `1px solid ${TYPE_COLORS[expandedCamera.type]}`,
                borderRadius: "var(--r)",
                width: "80vw",
                maxWidth: "900px",
                overflow: "hidden",
                boxShadow: `0 0 30px 5px ${TYPE_COLORS[expandedCamera.type]}33`,
              }}
            >
              <div
                style={{
                  padding: "10px 14px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  borderBottom: `1px solid ${TYPE_COLORS[expandedCamera.type]}44`,
                }}
              >
                <span
                  style={{
                    fontWeight: 800,
                    fontSize: "13px",
                    color: "var(--text)",
                  }}
                >
                  {expandedCamera.label}
                </span>
                <span
                  style={{
                    fontSize: "10px",
                    fontWeight: 700,
                    padding: "1px 8px",
                    borderRadius: "4px",
                    background: `${TYPE_COLORS[expandedCamera.type]}22`,
                    color: TYPE_COLORS[expandedCamera.type],
                  }}
                >
                  {expandedCamera.type}
                </span>
                <button
                  onClick={() => setExpandedId(null)}
                  style={{
                    marginLeft: "auto",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--text2)",
                    fontSize: "20px",
                  }}
                >
                  ✕
                </button>
              </div>
              <div
                style={{
                  position: "relative",
                  height: "420px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "12px",
                }}
              >
                <CameraOverlay type={expandedCamera.type} />
                <span
                  style={{
                    fontSize: "52px",
                    opacity: 0.2,
                    position: "relative",
                    zIndex: 1,
                  }}
                >
                  📹
                </span>
                <span
                  style={{
                    fontSize: "13px",
                    color: "var(--text3)",
                    position: "relative",
                    zIndex: 1,
                  }}
                >
                  {expandedCamera.label} — {expandedCamera.status}
                </span>
                <span
                  style={{
                    fontSize: "10px",
                    color: "var(--text3)",
                    fontFamily: "monospace",
                    position: "relative",
                    zIndex: 1,
                  }}
                >
                  {expandedCamera.resolution} · {expandedCamera.fps}fps
                </span>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}
