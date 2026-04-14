import {
  VEHICLE_BRIDGE_FRESHNESS_MS,
} from "@/lib/vehicle/types"
import type {
  VehicleBridgeSnapshot,
  VehicleBridgeStatus,
  VehicleCameraFeed,
  VehicleFlightMode,
  VehicleSensorId,
  VehicleSensorStatus,
  VehicleTelemetryFrame,
} from "@/lib/vehicle/types"

const BRIDGE_HISTORY_LIMIT = 180

type IngestBody = {
  bridgeId: string
  bridgeLabel?: string
  authority?: "read_only" | "advisory"
  frame?: unknown
}

type BridgeState = {
  latestFrame: VehicleTelemetryFrame | null
  history: VehicleTelemetryFrame[]
  bridgeStatus: VehicleBridgeStatus
}

const SENSOR_DEFAULTS: Array<Pick<VehicleSensorStatus, "id" | "label" | "sensorClass">> = [
  { id: "rgb", label: "RGB", sensorClass: "perception" },
  { id: "nightVision", label: "Night Vision", sensorClass: "perception" },
  { id: "thermal", label: "Thermal", sensorClass: "perception" },
  { id: "lidar", label: "LiDAR", sensorClass: "range" },
  { id: "ultrasonic", label: "Ultrasonic", sensorClass: "range" },
  { id: "imu", label: "IMU", sensorClass: "navigation" },
  { id: "gps", label: "GPS", sensorClass: "navigation" },
]

const CAMERA_DEFAULTS: VehicleCameraFeed[] = [
  { id: "vc1", label: "Forward RGB", type: "RGB", status: "active", resolution: "1920×1080", fps: 24 },
  { id: "vc2", label: "Night Vision", type: "NV", status: "active", resolution: "1920×1080", fps: 24 },
  { id: "vc3", label: "Thermal", type: "Thermal", status: "active", resolution: "1280×720", fps: 24 },
  { id: "vc4", label: "LiDAR", type: "LiDAR", status: "active", resolution: "Depth grid", fps: 12 },
  { id: "vc5", label: "Wide Angle", type: "Wide", status: "standby", resolution: "1920×1080", fps: 18 },
  { id: "vc6", label: "Rear", type: "Rear", status: "active", resolution: "1280×720", fps: 18 },
]

let bridgeState: BridgeState = {
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function asNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback
}

function asBoolean(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback
}

function asString(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value : fallback
}

function asMode(value: unknown, fallback: VehicleFlightMode): VehicleFlightMode {
  return value === "STABILIZE" ||
    value === "LOITER" ||
    value === "AUTO" ||
    value === "RTL" ||
    value === "LAND"
    ? value
    : fallback
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function buildBaselineFrame(now: number): VehicleTelemetryFrame {
  return {
    timestamp: now,
    vehicleId: "bridge-f450-alpha",
    source: "live_bridge",
    heartbeat: {
      online: true,
      armed: false,
      mode: "LOITER",
      linkState: "online",
      health: "nominal",
    },
    position: {
      lat: 34.05221,
      lon: -118.24372,
      altitudeAglM: 0,
      altitudeMslM: 312,
      groundSpeedMps: 0,
      climbRateMps: 0,
      headingDeg: 0,
      fixType: "3D",
      satellites: 10,
      hdop: 1.2,
    },
    battery: {
      percent: 100,
      voltageV: 16.8,
      currentA: 0,
      failsafeThresholdPercent: 24,
    },
    link: {
      qualityPercent: 100,
      latencyMs: 25,
      uplinkKbps: 128,
      downlinkKbps: 128,
    },
    mission: {
      profile: "Passive bridge observer",
      phase: "idle",
      currentStep: 0,
      totalSteps: 0,
      homeDistanceM: 0,
    },
    failsafes: {
      battery: false,
      gps: false,
      radio: false,
      geofence: false,
    },
    motors: [
      { id: "FL", health: "ok", rpm: 0 },
      { id: "FR", health: "ok", rpm: 0 },
      { id: "RL", health: "ok", rpm: 0 },
      { id: "RR", health: "ok", rpm: 0 },
    ],
    sensors: SENSOR_DEFAULTS.map((sensor) => ({
      ...sensor,
      active: true,
      healthPercent: 100,
      latencyMs: sensor.id === "gps" ? 40 : 10,
    })),
    cameras: CAMERA_DEFAULTS,
    companion: {
      label: "Passive bridge",
      connected: true,
      route: "local",
      cpuTempC: 0,
      gpuTempC: 0,
      aiModel: "bridge-observer",
      inferenceMs: 0,
    },
    detections: {
      people: 0,
      vehicles: 0,
      obstacles: 0,
    },
    fusionConfidencePercent: 0,
    pipeline: [
      { name: "Input", latencyMs: 4, ok: true },
      { name: "Detection", latencyMs: 0, ok: true },
      { name: "Classification", latencyMs: 0, ok: true },
      { name: "Tracking", latencyMs: 0, ok: true },
      { name: "Decision", latencyMs: 0, ok: true },
    ],
    recentEvents: [],
  }
}

function normalizeFrame(frame: unknown, previous: VehicleTelemetryFrame | null, bridgeLabel?: string): VehicleTelemetryFrame {
  const now = Date.now()
  const base = previous ?? buildBaselineFrame(now)
  if (!isRecord(frame)) {
    return {
      ...base,
      timestamp: now,
      source: "live_bridge",
      companion: {
        ...base.companion,
        label: bridgeLabel ?? base.companion.label,
      },
    }
  }

  const heartbeat = isRecord(frame.heartbeat) ? frame.heartbeat : {}
  const position = isRecord(frame.position) ? frame.position : {}
  const battery = isRecord(frame.battery) ? frame.battery : {}
  const link = isRecord(frame.link) ? frame.link : {}
  const mission = isRecord(frame.mission) ? frame.mission : {}
  const failsafes = isRecord(frame.failsafes) ? frame.failsafes : {}
  const detections = isRecord(frame.detections) ? frame.detections : {}
  const companion = isRecord(frame.companion) ? frame.companion : {}

  const motors = Array.isArray(frame.motors) ? frame.motors : base.motors
  const sensors = Array.isArray(frame.sensors) ? frame.sensors : base.sensors
  const cameras = Array.isArray(frame.cameras) ? frame.cameras : base.cameras
  const pipeline = Array.isArray(frame.pipeline) ? frame.pipeline : base.pipeline
  const recentEvents = Array.isArray(frame.recentEvents) ? frame.recentEvents : base.recentEvents

  return {
    ...base,
    timestamp: asNumber(frame.timestamp, now),
    vehicleId: asString(frame.vehicleId, base.vehicleId),
    source: "live_bridge",
    heartbeat: {
      online: asBoolean(heartbeat.online, base.heartbeat.online),
      armed: asBoolean(heartbeat.armed, base.heartbeat.armed),
      mode: asMode(heartbeat.mode, base.heartbeat.mode),
      linkState:
        heartbeat.linkState === "online" ||
        heartbeat.linkState === "degraded" ||
        heartbeat.linkState === "lost"
          ? heartbeat.linkState
          : base.heartbeat.linkState,
      health:
        heartbeat.health === "nominal" ||
        heartbeat.health === "warning" ||
        heartbeat.health === "critical"
          ? heartbeat.health
          : base.heartbeat.health,
    },
    position: {
      lat: asNumber(position.lat, base.position.lat),
      lon: asNumber(position.lon, base.position.lon),
      altitudeAglM: asNumber(position.altitudeAglM, base.position.altitudeAglM),
      altitudeMslM: asNumber(position.altitudeMslM, base.position.altitudeMslM),
      groundSpeedMps: clamp(asNumber(position.groundSpeedMps, base.position.groundSpeedMps), 0, 80),
      climbRateMps: asNumber(position.climbRateMps, base.position.climbRateMps),
      headingDeg: clamp(asNumber(position.headingDeg, base.position.headingDeg), 0, 360),
      fixType:
        position.fixType === "NO_FIX" ||
        position.fixType === "2D" ||
        position.fixType === "3D" ||
        position.fixType === "RTK"
          ? position.fixType
          : base.position.fixType,
      satellites: clamp(asNumber(position.satellites, base.position.satellites), 0, 40),
      hdop: asNumber(position.hdop, base.position.hdop),
    },
    battery: {
      percent: clamp(asNumber(battery.percent, base.battery.percent), 0, 100),
      voltageV: asNumber(battery.voltageV, base.battery.voltageV),
      currentA: asNumber(battery.currentA, base.battery.currentA),
      failsafeThresholdPercent: clamp(
        asNumber(battery.failsafeThresholdPercent, base.battery.failsafeThresholdPercent),
        0,
        100,
      ),
    },
    link: {
      qualityPercent: clamp(asNumber(link.qualityPercent, base.link.qualityPercent), 0, 100),
      latencyMs: clamp(asNumber(link.latencyMs, base.link.latencyMs), 0, 5000),
      uplinkKbps: clamp(asNumber(link.uplinkKbps, base.link.uplinkKbps), 0, 100000),
      downlinkKbps: clamp(asNumber(link.downlinkKbps, base.link.downlinkKbps), 0, 100000),
    },
    mission: {
      profile: asString(mission.profile, base.mission.profile),
      phase:
        mission.phase === "idle" ||
        mission.phase === "enroute" ||
        mission.phase === "holding" ||
        mission.phase === "rtl" ||
        mission.phase === "landing"
          ? mission.phase
          : base.mission.phase,
      currentStep: Math.max(0, asNumber(mission.currentStep, base.mission.currentStep)),
      totalSteps: Math.max(0, asNumber(mission.totalSteps, base.mission.totalSteps)),
      homeDistanceM: Math.max(0, asNumber(mission.homeDistanceM, base.mission.homeDistanceM)),
    },
    failsafes: {
      battery: asBoolean(failsafes.battery, base.failsafes.battery),
      gps: asBoolean(failsafes.gps, base.failsafes.gps),
      radio: asBoolean(failsafes.radio, base.failsafes.radio),
      geofence: asBoolean(failsafes.geofence, base.failsafes.geofence),
    },
    motors: motors
      .filter(isRecord)
      .map((motor, index) => ({
        id:
          motor.id === "FL" || motor.id === "FR" || motor.id === "RL" || motor.id === "RR"
            ? motor.id
            : base.motors[index]?.id ?? "FL",
        health:
          motor.health === "ok" || motor.health === "warning" || motor.health === "offline"
            ? motor.health
            : base.motors[index]?.health ?? "ok",
        rpm: Math.max(0, asNumber(motor.rpm, base.motors[index]?.rpm ?? 0)),
      })),
    sensors: sensors
      .filter(isRecord)
      .map((sensor, index) => {
        const fallback = base.sensors[index] ?? base.sensors[0]
        return {
          id: asString(sensor.id, fallback.id) as VehicleSensorId,
          label: asString(sensor.label, fallback.label),
          sensorClass:
            sensor.sensorClass === "perception" ||
            sensor.sensorClass === "navigation" ||
            sensor.sensorClass === "range"
              ? sensor.sensorClass
              : fallback.sensorClass,
          active: asBoolean(sensor.active, fallback.active),
          healthPercent: clamp(asNumber(sensor.healthPercent, fallback.healthPercent), 0, 100),
          latencyMs: clamp(asNumber(sensor.latencyMs, fallback.latencyMs), 0, 5000),
        }
      }),
    cameras: cameras
      .filter(isRecord)
      .map((camera, index) => {
        const fallback = base.cameras[index] ?? base.cameras[0]
        return {
          id: asString(camera.id, fallback.id),
          label: asString(camera.label, fallback.label),
          type:
            camera.type === "RGB" ||
            camera.type === "NV" ||
            camera.type === "Thermal" ||
            camera.type === "LiDAR" ||
            camera.type === "Wide" ||
            camera.type === "Rear"
              ? camera.type
              : fallback.type,
          status:
            camera.status === "active" || camera.status === "standby" || camera.status === "offline"
              ? camera.status
              : fallback.status,
          resolution: asString(camera.resolution, fallback.resolution),
          fps: Math.max(0, asNumber(camera.fps, fallback.fps)),
        }
      }),
    companion: {
      label: asString(companion.label, bridgeLabel ?? base.companion.label),
      connected: asBoolean(companion.connected, base.companion.connected),
      route: companion.route === "local" || companion.route === "remote" ? companion.route : base.companion.route,
      cpuTempC: asNumber(companion.cpuTempC, base.companion.cpuTempC),
      gpuTempC: asNumber(companion.gpuTempC, base.companion.gpuTempC),
      aiModel: asString(companion.aiModel, base.companion.aiModel),
      inferenceMs: Math.max(0, asNumber(companion.inferenceMs, base.companion.inferenceMs)),
    },
    detections: {
      people: Math.max(0, asNumber(detections.people, base.detections.people)),
      vehicles: Math.max(0, asNumber(detections.vehicles, base.detections.vehicles)),
      obstacles: Math.max(0, asNumber(detections.obstacles, base.detections.obstacles)),
    },
    fusionConfidencePercent: clamp(
      asNumber(frame.fusionConfidencePercent, base.fusionConfidencePercent),
      0,
      100,
    ),
    pipeline: pipeline.filter(isRecord).map((stage, index) => {
      const fallback = base.pipeline[index] ?? base.pipeline[0]
      return {
        name: asString(stage.name, fallback.name),
        latencyMs: Math.max(0, asNumber(stage.latencyMs, fallback.latencyMs)),
        ok: asBoolean(stage.ok, fallback.ok),
      }
    }),
    recentEvents: recentEvents.filter(isRecord).map((event, index) => {
      const fallback = base.recentEvents[index] ?? {
        id: `bridge-event-${now}-${index}`,
        ts: now,
        severity: "info" as const,
        message: "Bridge event",
      }
      return {
        id: asString(event.id, fallback.id),
        ts: asNumber(event.ts, fallback.ts),
        severity:
          event.severity === "info" ||
          event.severity === "warning" ||
          event.severity === "critical"
            ? event.severity
            : fallback.severity,
        message: asString(event.message, fallback.message),
      }
    }),
  }
}

export function ingestVehicleBridgePayload(body: IngestBody) {
  const now = Date.now()
  const frame = normalizeFrame(body.frame, bridgeState.latestFrame, body.bridgeLabel)
  const authority = body.authority ?? "read_only"

  bridgeState = {
    latestFrame: frame,
    history: [...bridgeState.history.slice(-(BRIDGE_HISTORY_LIMIT - 1)), frame],
    bridgeStatus: {
      available: true,
      fresh: true,
      bridgeId: body.bridgeId,
      bridgeLabel: body.bridgeLabel ?? body.bridgeId,
      authority,
      lastIngestAt: now,
      ingestedFrames: bridgeState.bridgeStatus.ingestedFrames + 1,
      freshnessMs: 0,
    },
  }

  return getVehicleBridgeSnapshot()
}

export function getVehicleBridgeSnapshot(): VehicleBridgeSnapshot {
  const now = Date.now()
  const lastIngestAt = bridgeState.bridgeStatus.lastIngestAt
  const freshnessMs = lastIngestAt === null ? null : Math.max(0, now - lastIngestAt)
  const fresh = freshnessMs !== null && freshnessMs <= VEHICLE_BRIDGE_FRESHNESS_MS

  return {
    latestFrame: bridgeState.latestFrame,
    history: bridgeState.history,
    bridgeStatus: {
      ...bridgeState.bridgeStatus,
      fresh,
      freshnessMs,
    },
  }
}

export function validateVehicleBridgeBody(body: unknown) {
  if (!isRecord(body)) return { ok: false as const, message: "Body must be an object." }
  if (typeof body.bridgeId !== "string" || !body.bridgeId.trim()) {
    return { ok: false as const, message: "bridgeId is required." }
  }
  if (
    body.authority !== undefined &&
    body.authority !== "read_only" &&
    body.authority !== "advisory"
  ) {
    return { ok: false as const, message: "authority must be read_only or advisory." }
  }

  return {
    ok: true as const,
    body: {
      bridgeId: body.bridgeId.trim(),
      bridgeLabel:
        typeof body.bridgeLabel === "string" && body.bridgeLabel.trim()
          ? body.bridgeLabel.trim()
          : undefined,
      authority: body.authority as "read_only" | "advisory" | undefined,
      frame: body.frame,
    },
  }
}
