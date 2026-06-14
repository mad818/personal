import {
  type VehicleCameraFeed,
  type VehicleControlPosture,
  type VehicleDetectionSummary,
  type VehicleFailsafeStatus,
  type VehicleFlightMode,
  type VehicleHealthEvent,
  type VehicleMissionPhase,
  type VehiclePipelineStage,
  type VehicleSensorId,
  type VehicleSensorStatus,
  type VehicleSimulationState,
  type VehicleTelemetryFrame,
  type VehicleTelemetrySnapshot,
} from "@/lib/vehicle/types"

const HISTORY_LIMIT = 180
const TICK_MS = 1_000
const VEHICLE_ID = "sim-f450-alpha"
const BASE_LAT = 34.05221
const BASE_LON = -118.24372
const BASE_ALTITUDE_AGL = 34

type Listener = () => void

export interface SimulatedTelemetryFrameInput {
  step: number
  timestamp?: number
  mode?: VehicleFlightMode
  profile?: string
  phase?: VehicleMissionPhase
  batteryPercent?: number
  linkQualityPercent?: number
  eventMessage?: string
}

const listeners = new Set<Listener>()

const CONTROL_POSTURE: VehicleControlPosture = {
  surfaceAuthority: "advisory",
  commandAuthority: "advisory",
  flightCriticalEnabled: false,
  label: "Sim-only advisory surface",
  note: "Nexus is simulating operator flows only. No flight-critical commands leave this surface.",
}

const SENSOR_CONFIG: Array<Pick<VehicleSensorStatus, "id" | "label" | "sensorClass">> = [
  { id: "rgb", label: "RGB", sensorClass: "perception" },
  { id: "nightVision", label: "Night Vision", sensorClass: "perception" },
  { id: "thermal", label: "Thermal", sensorClass: "perception" },
  { id: "lidar", label: "LiDAR", sensorClass: "range" },
  { id: "ultrasonic", label: "Ultrasonic", sensorClass: "range" },
  { id: "imu", label: "IMU", sensorClass: "navigation" },
  { id: "gps", label: "GPS", sensorClass: "navigation" },
]

const CAMERA_CONFIG: Array<Omit<VehicleCameraFeed, "status" | "fps"> & { sensorId?: VehicleSensorId }> = [
  { id: "vc1", label: "Forward RGB", type: "RGB", resolution: "1920×1080", sensorId: "rgb" },
  { id: "vc2", label: "Night Vision", type: "NV", resolution: "1920×1080", sensorId: "nightVision" },
  { id: "vc3", label: "Thermal", type: "Thermal", resolution: "1280×720", sensorId: "thermal" },
  { id: "vc4", label: "LiDAR", type: "LiDAR", resolution: "Depth grid", sensorId: "lidar" },
  { id: "vc5", label: "Wide Angle", type: "Wide", resolution: "1920×1080", sensorId: "rgb" },
  { id: "vc6", label: "Rear", type: "Rear", resolution: "1280×720" },
]

const PIPELINE_NAMES = ["Input", "Detection", "Classification", "Tracking", "Decision"] as const

const initialSimulation: VehicleSimulationState = {
  speedLimitKph: 42,
  waypointCount: 3,
  companionConnected: true,
  companionRoute: "local",
  sensorEnabled: {
    rgb: true,
    nightVision: true,
    thermal: true,
    lidar: true,
    ultrasonic: true,
    imu: true,
    gps: true,
  },
}

let intervalId: number | null = null
let step = 0
let replayIndex: number | null = null
let emergencyUntil = 0
let simulation = { ...initialSimulation }

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function round(value: number, digits = 1) {
  const scale = 10 ** digits
  return Math.round(value * scale) / scale
}

function seededUnit(seed: number) {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453
  return x - Math.floor(x)
}

function signedNoise(seed: number, amplitude: number) {
  return (seededUnit(seed) - 0.5) * 2 * amplitude
}

function buildEvents(
  batteryPercent: number,
  linkQuality: number,
  missionPhase: VehicleMissionPhase,
  failsafes: VehicleFailsafeStatus,
  now: number,
) {
  const events: VehicleHealthEvent[] = [
    {
      id: `evt-source-${now}`,
      ts: now,
      severity: "info",
      message: "Simulation feed active",
    },
  ]

  if (missionPhase === "landing") {
    events.unshift({
      id: `evt-land-${now}`,
      ts: now,
      severity: "warning",
      message: "Emergency landing path simulated. Verify the control boundary before live bridge work.",
    })
  }

  if (batteryPercent <= 28 || failsafes.battery) {
    events.unshift({
      id: `evt-batt-${now}`,
      ts: now,
      severity: "warning",
      message: "Battery approaching failsafe threshold. Treat as advisory only.",
    })
  }

  if (linkQuality <= 45 || failsafes.radio) {
    events.unshift({
      id: `evt-link-${now}`,
      ts: now,
      severity: "critical",
      message: "Link quality degraded. Future live bridge must fail safe to autopilot.",
    })
  }

  return events.slice(0, 3)
}

function buildSensors(now: number) {
  return SENSOR_CONFIG.map((sensor, index) => {
    const enabled = simulation.sensorEnabled[sensor.id]
    const latencyBase =
      sensor.id === "gps"
        ? 48
        : sensor.id === "lidar"
          ? 16
          : sensor.id === "imu"
            ? 3
            : 10

    return {
      ...sensor,
      active: enabled,
      healthPercent: enabled ? clamp(Math.round(92 + signedNoise(now / 1000 + index, 8)), 76, 100) : 0,
      latencyMs: enabled ? clamp(Math.round(latencyBase + signedNoise(now / 1000 + index * 2, 4)), 1, 80) : 0,
    }
  })
}

function buildCameras(now: number) {
  return CAMERA_CONFIG.map((camera, index) => {
    const active = camera.sensorId ? simulation.sensorEnabled[camera.sensorId] : true
    const status: VehicleCameraFeed["status"] =
      !simulation.companionConnected ? "offline" : active ? "active" : "standby"

    return {
      ...camera,
      status,
      fps: status === "active" ? clamp(Math.round(24 + signedNoise(now / 1000 + index * 3, 6)), 18, 36) : 0,
    }
  })
}

function buildPipeline(now: number, companionConnected: boolean) {
  return PIPELINE_NAMES.map((name, index) => ({
    name,
    latencyMs: companionConnected
      ? clamp(Math.round(4 + index * 4 + signedNoise(now / 1000 + index, 3)), 2, 40)
      : 0,
    ok: companionConnected,
  }))
}

function buildDetections(now: number, mode: VehicleFlightMode): VehicleDetectionSummary {
  const activityBoost = mode === "AUTO" ? 1 : 0

  return {
    people: clamp(Math.round(2 + signedNoise(now / 1000, 2) + activityBoost), 0, 6),
    vehicles: clamp(Math.round(1 + signedNoise(now / 1000 + 1, 2) + activityBoost), 0, 5),
    obstacles: clamp(Math.round(1 + signedNoise(now / 1000 + 2, 1.5)), 0, 4),
  }
}

function buildFrame(previous: VehicleTelemetryFrame | null, now: number): VehicleTelemetryFrame {
  const mode: VehicleFlightMode =
    emergencyUntil > now
      ? "LAND"
      : previous?.heartbeat.mode ?? "LOITER"

  const targetSpeedKph =
    mode === "AUTO"
      ? 28
      : mode === "RTL"
        ? 22
        : mode === "LAND"
          ? 8
          : mode === "STABILIZE"
            ? 18
            : 12

  const speedLimitMps = simulation.speedLimitKph / 3.6
  const groundSpeedMps = clamp(
    round(
      clamp(targetSpeedKph / 3.6, 0, speedLimitMps) +
        signedNoise(step + 3, 0.7),
      2,
    ),
    0,
    speedLimitMps,
  )

  const headingDeg = round(
    ((previous?.position.headingDeg ?? 247) + signedNoise(step + 5, mode === "LOITER" ? 4 : 9) + 360) % 360,
    1,
  )

  const headingRad = (headingDeg * Math.PI) / 180
  const distanceM = groundSpeedMps * (TICK_MS / 1_000)
  const metersPerDegreeLat = 111_111
  const metersPerDegreeLon = metersPerDegreeLat * Math.max(0.3, Math.cos((previous?.position.lat ?? BASE_LAT) * (Math.PI / 180)))
  const lat = round((previous?.position.lat ?? BASE_LAT) + (Math.cos(headingRad) * distanceM) / metersPerDegreeLat, 5)
  const lon = round((previous?.position.lon ?? BASE_LON) + (Math.sin(headingRad) * distanceM) / metersPerDegreeLon, 5)

  const altitudeAglM = clamp(
    round(
      (previous?.position.altitudeAglM ?? BASE_ALTITUDE_AGL) +
        (mode === "LAND" ? -0.8 : signedNoise(step + 7, 0.9)),
      1,
    ),
    6,
    46,
  )

  const batteryPercent = clamp(round((previous?.battery.percent ?? 91) - 0.12 - Math.max(0, groundSpeedMps - 4) * 0.01, 1), 14, 100)
  const batteryVoltage = round(14.8 * (batteryPercent / 100) + 1.2, 2)
  const currentA = round(clamp(9 + groundSpeedMps * 1.4 + signedNoise(step + 9, 1.8), 5, 28), 1)
  const linkQuality = clamp(Math.round(88 + signedNoise(step + 11, 9)), 28, 99)
  const latencyMs = clamp(Math.round(42 + signedNoise(step + 13, 24)), 18, 160)
  const missionPhase: VehicleMissionPhase =
    mode === "RTL"
      ? "rtl"
      : mode === "LAND"
        ? "landing"
        : simulation.waypointCount > 0
          ? "enroute"
          : "holding"

  const failsafes: VehicleFailsafeStatus = {
    battery: batteryPercent <= 24,
    gps: !simulation.sensorEnabled.gps,
    radio: linkQuality <= 35,
    geofence: altitudeAglM >= 44,
  }

  const sensors = buildSensors(now)
  const cameras = buildCameras(now)
  const pipeline = buildPipeline(now, simulation.companionConnected)
  const detections = buildDetections(now, mode)
  const fusionConfidencePercent = simulation.companionConnected
    ? clamp(Math.round(90 + signedNoise(step + 15, 8)), 72, 99)
    : 0

  return {
    timestamp: now,
    vehicleId: VEHICLE_ID,
    source: "simulation",
    heartbeat: {
      online: true,
      armed: mode !== "LAND",
      mode,
      linkState: linkQuality <= 35 ? "lost" : linkQuality <= 55 ? "degraded" : "online",
      health: failsafes.battery || failsafes.radio ? "warning" : "nominal",
    },
    position: {
      lat,
      lon,
      altitudeAglM,
      altitudeMslM: round(altitudeAglM + 312, 1),
      groundSpeedMps,
      climbRateMps: round(mode === "LAND" ? -0.8 : signedNoise(step + 17, 0.7), 2),
      headingDeg,
      fixType: simulation.sensorEnabled.gps ? "3D" : "2D",
      satellites: simulation.sensorEnabled.gps ? clamp(Math.round(12 + signedNoise(step + 19, 2)), 8, 16) : 4,
      hdop: simulation.sensorEnabled.gps ? round(clamp(0.9 + signedNoise(step + 21, 0.3), 0.7, 1.9), 2) : 2.8,
    },
    battery: {
      percent: batteryPercent,
      voltageV: batteryVoltage,
      currentA,
      failsafeThresholdPercent: 24,
    },
    link: {
      qualityPercent: linkQuality,
      latencyMs,
      uplinkKbps: clamp(Math.round(118 + signedNoise(step + 23, 14)), 52, 180),
      downlinkKbps: clamp(Math.round(164 + signedNoise(step + 25, 28)), 72, 260),
    },
    mission: {
      profile: "Bench Loop Alpha",
      phase: missionPhase,
      currentStep: simulation.waypointCount === 0 ? 0 : (step % Math.max(1, simulation.waypointCount)) + 1,
      totalSteps: simulation.waypointCount,
      homeDistanceM: clamp(Math.round(84 + signedNoise(step + 27, 26)), 18, 220),
    },
    failsafes,
    motors: [
      { id: "FL", health: "ok", rpm: clamp(Math.round(1400 + groundSpeedMps * 110 + signedNoise(step + 29, 90)), 900, 3200) },
      { id: "FR", health: "ok", rpm: clamp(Math.round(1420 + groundSpeedMps * 108 + signedNoise(step + 31, 90)), 900, 3200) },
      { id: "RL", health: "ok", rpm: clamp(Math.round(1380 + groundSpeedMps * 112 + signedNoise(step + 33, 90)), 900, 3200) },
      {
        id: "RR",
        health: batteryPercent <= 30 ? "warning" : "ok",
        rpm: clamp(Math.round(1410 + groundSpeedMps * 106 + signedNoise(step + 35, 90)), 900, 3200),
      },
    ],
    sensors,
    cameras,
    companion: {
      label: "Companion bridge (simulated)",
      connected: simulation.companionConnected,
      route: simulation.companionRoute,
      cpuTempC: simulation.companionConnected ? clamp(Math.round(54 + signedNoise(step + 37, 8)), 40, 82) : 0,
      gpuTempC: simulation.companionConnected ? clamp(Math.round(63 + signedNoise(step + 39, 10)), 46, 88) : 0,
      aiModel: simulation.companionRoute === "local" ? "edge-detect-qwen" : "remote-analysis-proxy",
      inferenceMs: simulation.companionConnected ? clamp(Math.round(18 + signedNoise(step + 41, 7)), 10, 38) : 0,
    },
    detections,
    fusionConfidencePercent,
    pipeline,
    recentEvents: buildEvents(batteryPercent, linkQuality, missionPhase, failsafes, now),
  }
}

export function makeSimulatedTelemetryFrame(input: SimulatedTelemetryFrameInput): VehicleTelemetryFrame {
  const originalStep = step
  const originalEmergencyUntil = emergencyUntil
  const now = input.timestamp ?? Date.now() + input.step * TICK_MS
  const mode = input.mode ?? "LOITER"

  try {
    emergencyUntil = 0
    step = Math.max(0, input.step - 1)
    const previous = buildFrame(null, now - TICK_MS)

    step = input.step
    const frame = buildFrame(
      {
        ...previous,
        heartbeat: {
          ...previous.heartbeat,
          mode,
        },
      },
      now,
    )

    const batteryPercent = input.batteryPercent ?? frame.battery.percent
    const linkQualityPercent = input.linkQualityPercent ?? frame.link.qualityPercent
    const failsafes: VehicleFailsafeStatus = {
      ...frame.failsafes,
      battery: batteryPercent <= frame.battery.failsafeThresholdPercent,
      radio: linkQualityPercent <= 35,
    }
    const event: VehicleHealthEvent | null = input.eventMessage
      ? {
          id: `scenario-${input.step}-${now}`,
          ts: now,
          severity: failsafes.battery || failsafes.radio ? "warning" : "info",
          message: input.eventMessage,
        }
      : null

    return {
      ...frame,
      source: "replay",
      heartbeat: {
        ...frame.heartbeat,
        mode,
        linkState:
          linkQualityPercent <= 35
            ? "lost"
            : linkQualityPercent <= 55
              ? "degraded"
              : "online",
        health: failsafes.battery || failsafes.radio ? "warning" : frame.heartbeat.health,
      },
      battery: {
        ...frame.battery,
        percent: batteryPercent,
      },
      link: {
        ...frame.link,
        qualityPercent: linkQualityPercent,
      },
      mission: {
        ...frame.mission,
        profile: input.profile ?? frame.mission.profile,
        phase: input.phase ?? frame.mission.phase,
      },
      failsafes,
      recentEvents: event ? [event, ...frame.recentEvents].slice(0, 3) : frame.recentEvents,
    }
  } finally {
    step = originalStep
    emergencyUntil = originalEmergencyUntil
  }
}

function buildSeedHistory() {
  const seeded: VehicleTelemetryFrame[] = []
  let previous: VehicleTelemetryFrame | null = null
  const start = Date.now() - 29 * TICK_MS

  for (let index = 0; index < 30; index += 1) {
    step += 1
    const frame = buildFrame(previous, start + index * TICK_MS)
    seeded.push(frame)
    previous = frame
  }

  return seeded
}

let history = buildSeedHistory()
let latestFrame = history[history.length - 1]

function buildSnapshot(): VehicleTelemetrySnapshot {
  const resolvedReplayIndex =
    replayIndex === null
      ? null
      : clamp(replayIndex, 0, Math.max(0, history.length - 1))

  const activeFrame = resolvedReplayIndex === null ? latestFrame : history[resolvedReplayIndex]

  return {
    activeFrame,
    latestFrame,
    history,
    historyLimit: HISTORY_LIMIT,
    tickMs: TICK_MS,
    sourceMode: resolvedReplayIndex === null ? "simulation" : "replay",
    replayIndex: resolvedReplayIndex,
    replayOffsetSeconds: resolvedReplayIndex === null ? 0 : history.length - 1 - resolvedReplayIndex,
    controlPosture: CONTROL_POSTURE,
    simulation,
  }
}

let snapshot = buildSnapshot()

function publish() {
  snapshot = buildSnapshot()
  listeners.forEach((listener) => listener())
}

function advanceSimulation(now: number) {
  step += 1

  if (emergencyUntil <= now && latestFrame.heartbeat.mode === "LAND" && simulation.waypointCount > 0) {
    latestFrame = {
      ...latestFrame,
      heartbeat: { ...latestFrame.heartbeat, mode: "LOITER" },
    }
  }

  const frame = buildFrame(latestFrame, now)
  latestFrame = frame
  history = [...history.slice(-(HISTORY_LIMIT - 1)), frame]
  publish()
}

function ensureTicker() {
  if (intervalId || typeof window === "undefined") return

  intervalId = window.setInterval(() => {
    advanceSimulation(Date.now())
  }, TICK_MS)
}

function updateSimulation(mutator: () => void) {
  mutator()
  advanceSimulation(Date.now())
}

export function subscribeVehicleTelemetry(listener: Listener) {
  listeners.add(listener)
  ensureTicker()

  return () => {
    listeners.delete(listener)

    if (!listeners.size && intervalId) {
      clearInterval(intervalId)
      intervalId = null
    }
  }
}

export function getVehicleTelemetrySnapshot() {
  return snapshot
}

export function setVehicleReplayIndex(index: number) {
  replayIndex = clamp(index, 0, Math.max(0, history.length - 1))
  publish()
}

export function resumeLiveVehicleTelemetry() {
  replayIndex = null
  publish()
}

export function setVehicleSimFlightMode(mode: VehicleFlightMode) {
  updateSimulation(() => {
    emergencyUntil = 0
    latestFrame = {
      ...latestFrame,
      heartbeat: { ...latestFrame.heartbeat, mode },
    }
  })
}

export function triggerVehicleSimEmergencyStop() {
  updateSimulation(() => {
    emergencyUntil = Date.now() + 8_000
    latestFrame = {
      ...latestFrame,
      heartbeat: { ...latestFrame.heartbeat, mode: "LAND" },
    }
  })
}

export function setVehicleSimSpeedLimitKph(speedLimitKph: number) {
  updateSimulation(() => {
    simulation = {
      ...simulation,
      speedLimitKph: clamp(Math.round(speedLimitKph), 0, 60),
    }
  })
}

export function setVehicleSimWaypointCount(waypointCount: number) {
  updateSimulation(() => {
    simulation = {
      ...simulation,
      waypointCount: clamp(Math.round(waypointCount), 0, 12),
    }
  })
}

export function setVehicleSimSensorEnabled(id: VehicleSensorId, enabled: boolean) {
  updateSimulation(() => {
    simulation = {
      ...simulation,
      sensorEnabled: {
        ...simulation.sensorEnabled,
        [id]: enabled,
      },
    }
  })
}

export function setVehicleSimCompanionRoute(route: "local" | "remote") {
  updateSimulation(() => {
    simulation = {
      ...simulation,
      companionRoute: route,
    }
  })
}

export function setVehicleSimCompanionConnected(connected: boolean) {
  updateSimulation(() => {
    simulation = {
      ...simulation,
      companionConnected: connected,
    }
  })
}
