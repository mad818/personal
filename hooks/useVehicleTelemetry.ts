"use client"

import { useEffect, useMemo, useState, useSyncExternalStore } from "react"
import { apiFetch } from "@/lib/apiFetch"
import {
  getVehicleTelemetrySnapshot,
  setVehicleSimCompanionConnected,
  setVehicleSimCompanionRoute,
  setVehicleSimFlightMode,
  setVehicleSimSensorEnabled,
  setVehicleSimSpeedLimitKph,
  setVehicleSimWaypointCount,
  subscribeVehicleTelemetry,
  triggerVehicleSimEmergencyStop,
} from "@/lib/vehicle/simTelemetry"
import type {
  VehicleBridgeSnapshot,
  VehicleControlPosture,
  VehicleTelemetrySnapshot,
} from "@/lib/vehicle/types"
import { VEHICLE_BRIDGE_FRESHNESS_MS } from "@/lib/vehicle/types"

const BRIDGE_POLL_MS = 3_000

const EMPTY_BRIDGE_SNAPSHOT: VehicleBridgeSnapshot = {
  latestFrame: null,
  history: [],
  bridgeStatus: {
    available: false,
    fresh: false,
    bridgeId: null,
    bridgeLabel: null,
    authority: "read_only",
    lastIngestAt: null,
    ingestedFrames: 0,
    freshnessMs: null,
  },
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function isVehicleBridgeSnapshot(value: unknown): value is VehicleBridgeSnapshot {
  return isRecord(value) && isRecord(value.bridgeStatus)
}

function buildBridgeControlPosture(
  authority: VehicleBridgeSnapshot["bridgeStatus"]["authority"],
): VehicleControlPosture {
  return {
    surfaceAuthority: authority,
    commandAuthority: "read_only",
    flightCriticalEnabled: false,
    label: authority === "advisory" ? "Advisory bridge observer" : "Passive bridge observer",
    note: "Nexus is reading live bridge telemetry only. Flight-critical authority stays with the autopilot.",
  }
}

export function useVehicleTelemetry() {
  const simSnapshot = useSyncExternalStore(
    subscribeVehicleTelemetry,
    getVehicleTelemetrySnapshot,
    getVehicleTelemetrySnapshot,
  )
  const [bridgeSnapshot, setBridgeSnapshot] = useState<VehicleBridgeSnapshot>(EMPTY_BRIDGE_SNAPSHOT)
  const [replayIndex, setReplayIndex] = useState<number | null>(null)

  useEffect(() => {
    let active = true

    const refreshBridgeSnapshot = async () => {
      try {
        const response = await apiFetch("/api/vehicle/telemetry", {
          cache: "no-store",
        })
        if (!response.ok) return
        const payload = (await response.json()) as unknown
        if (active && isVehicleBridgeSnapshot(payload)) {
          setBridgeSnapshot(payload)
        }
      } catch {
        // Silent failure keeps the lab on simulation fallback.
      }
    }

    void refreshBridgeSnapshot()

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === "hidden") return
      void refreshBridgeSnapshot()
    }, BRIDGE_POLL_MS)

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        void refreshBridgeSnapshot()
      }
    }

    document.addEventListener("visibilitychange", handleVisibility)

    return () => {
      active = false
      window.clearInterval(intervalId)
      document.removeEventListener("visibilitychange", handleVisibility)
    }
  }, [])

  const bridgeStatus = useMemo(() => {
    const lastIngestAt = bridgeSnapshot.bridgeStatus.lastIngestAt
    const freshnessMs =
      lastIngestAt === null ? null : Math.max(0, Date.now() - lastIngestAt)

    return {
      ...bridgeSnapshot.bridgeStatus,
      fresh:
        freshnessMs !== null && freshnessMs <= VEHICLE_BRIDGE_FRESHNESS_MS,
      freshnessMs,
    }
  }, [bridgeSnapshot.bridgeStatus, simSnapshot.latestFrame.timestamp])

  const bridgeHistory =
    bridgeSnapshot.latestFrame && bridgeSnapshot.history.length === 0
      ? [bridgeSnapshot.latestFrame]
      : bridgeSnapshot.history

  const hasFreshBridgeFrame = bridgeStatus.fresh && bridgeSnapshot.latestFrame !== null
  const liveFrame: VehicleTelemetrySnapshot["latestFrame"] =
    hasFreshBridgeFrame
      ? bridgeSnapshot.latestFrame ?? simSnapshot.latestFrame
      : simSnapshot.latestFrame
  const liveHistory: VehicleTelemetrySnapshot["history"] =
    hasFreshBridgeFrame
      ? bridgeHistory.length > 0
        ? bridgeHistory
        : [liveFrame]
      : simSnapshot.history
  const resolvedReplayIndex =
    replayIndex === null ? null : clamp(replayIndex, 0, Math.max(0, liveHistory.length - 1))
  const activeFrame: VehicleTelemetrySnapshot["activeFrame"] =
    resolvedReplayIndex === null ? liveFrame : liveHistory[resolvedReplayIndex] ?? liveFrame
  const sourceMode: VehicleTelemetrySnapshot["sourceMode"] =
    resolvedReplayIndex !== null
      ? "replay"
      : hasFreshBridgeFrame
        ? "live_bridge"
        : "simulation"
  const controlPosture =
    hasFreshBridgeFrame
      ? buildBridgeControlPosture(bridgeStatus.authority)
      : simSnapshot.controlPosture

  const actions = useMemo(
    () => ({
      setReplayIndex: (index: number) => {
        setReplayIndex(clamp(index, 0, Math.max(0, liveHistory.length - 1)))
      },
      resumeLive: () => setReplayIndex(null),
      setFlightMode: setVehicleSimFlightMode,
      triggerEmergencyStop: triggerVehicleSimEmergencyStop,
      setSpeedLimitKph: setVehicleSimSpeedLimitKph,
      setWaypointCount: setVehicleSimWaypointCount,
      setSensorEnabled: setVehicleSimSensorEnabled,
      setCompanionRoute: setVehicleSimCompanionRoute,
      setCompanionConnected: setVehicleSimCompanionConnected,
    }),
    [liveHistory.length],
  )

  return {
    ...simSnapshot,
    activeFrame,
    latestFrame: liveFrame,
    history: liveHistory,
    sourceMode,
    replayIndex: resolvedReplayIndex,
    replayOffsetSeconds:
      resolvedReplayIndex === null ? 0 : Math.max(0, liveHistory.length - 1 - resolvedReplayIndex),
    controlPosture,
    bridgeStatus,
    actions,
  }
}
