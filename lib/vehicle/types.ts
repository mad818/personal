export const VEHICLE_CONTRACT_FIELDS = [
  "heartbeat",
  "flight mode",
  "arming state",
  "GPS quality",
  "battery",
  "link quality",
  "mission status",
  "failsafes",
] as const
export const VEHICLE_BRIDGE_FRESHNESS_MS = 15_000

export type VehicleTelemetrySourceMode = "simulation" | "replay" | "live_bridge"
export type VehicleAuthorityClass = "read_only" | "advisory" | "command_capable"
export type VehicleLinkState = "online" | "degraded" | "lost"
export type VehicleHealthState = "nominal" | "warning" | "critical"
export type VehicleFixType = "NO_FIX" | "2D" | "3D" | "RTK"
export type VehicleFlightMode = "STABILIZE" | "LOITER" | "AUTO" | "RTL" | "LAND"
export type VehicleMissionPhase = "idle" | "enroute" | "holding" | "rtl" | "landing"
export type VehicleSensorClass = "perception" | "navigation" | "range"
export type VehicleBenchChecklistCategory =
  | "frame_power"
  | "orientation"
  | "radio_modes"
  | "gps_home"
  | "failsafes"
export type VehicleSensorId =
  | "rgb"
  | "nightVision"
  | "thermal"
  | "lidar"
  | "ultrasonic"
  | "imu"
  | "gps"
export type VehicleCameraType = "RGB" | "NV" | "Thermal" | "LiDAR" | "Wide" | "Rear"

export interface VehicleHeartbeat {
  online: boolean
  armed: boolean
  mode: VehicleFlightMode
  linkState: VehicleLinkState
  health: VehicleHealthState
}

export interface VehiclePosition {
  lat: number
  lon: number
  altitudeAglM: number
  altitudeMslM: number
  groundSpeedMps: number
  climbRateMps: number
  headingDeg: number
  fixType: VehicleFixType
  satellites: number
  hdop: number
}

export interface VehicleBattery {
  percent: number
  voltageV: number
  currentA: number
  failsafeThresholdPercent: number
}

export interface VehicleLinkStatus {
  qualityPercent: number
  latencyMs: number
  uplinkKbps: number
  downlinkKbps: number
}

export interface VehicleMissionStatus {
  profile: string
  phase: VehicleMissionPhase
  currentStep: number
  totalSteps: number
  homeDistanceM: number
}

export interface VehicleFailsafeStatus {
  battery: boolean
  gps: boolean
  radio: boolean
  geofence: boolean
}

export interface VehicleMotorStatus {
  id: "FL" | "FR" | "RL" | "RR"
  health: "ok" | "warning" | "offline"
  rpm: number
}

export interface VehicleSensorStatus {
  id: VehicleSensorId
  label: string
  sensorClass: VehicleSensorClass
  active: boolean
  healthPercent: number
  latencyMs: number
}

export interface VehicleCameraFeed {
  id: string
  label: string
  type: VehicleCameraType
  status: "active" | "standby" | "offline"
  resolution: string
  fps: number
}

export interface VehicleCompanionStatus {
  label: string
  connected: boolean
  route: "local" | "remote"
  cpuTempC: number
  gpuTempC: number
  aiModel: string
  inferenceMs: number
}

export interface VehicleDetectionSummary {
  people: number
  vehicles: number
  obstacles: number
}

export interface VehiclePipelineStage {
  name: string
  latencyMs: number
  ok: boolean
}

export interface VehicleHealthEvent {
  id: string
  ts: number
  severity: "info" | "warning" | "critical"
  message: string
}

export interface VehicleBenchChecklistItem {
  id: string
  category: VehicleBenchChecklistCategory
  label: string
  detail: string
}

export interface VehicleArtifactFile {
  kind:
    | "session_summary"
    | "telemetry_log"
    | "incident_timeline"
    | "sensor_bundle"
    | "preview_3d"
    | "parametric_source"
  filename: string
  note: string
}

export interface VehicleArtifactManifest {
  generatedAt: number
  vehicleId: string
  sourceMode: VehicleTelemetrySourceMode
  sessionLabel: string
  tags: string[]
  summary: string
  historyFrames: number
  latestMode: VehicleFlightMode
  files: VehicleArtifactFile[]
}

export interface VehicleBridgeStatus {
  available: boolean
  fresh: boolean
  bridgeId: string | null
  bridgeLabel: string | null
  authority: Extract<VehicleAuthorityClass, "read_only" | "advisory">
  lastIngestAt: number | null
  ingestedFrames: number
  freshnessMs: number | null
}

export interface VehicleBridgeSnapshot {
  latestFrame: VehicleTelemetryFrame | null
  history: VehicleTelemetryFrame[]
  bridgeStatus: VehicleBridgeStatus
}

export interface VehicleTelemetryFrame {
  timestamp: number
  vehicleId: string
  source: VehicleTelemetrySourceMode
  heartbeat: VehicleHeartbeat
  position: VehiclePosition
  battery: VehicleBattery
  link: VehicleLinkStatus
  mission: VehicleMissionStatus
  failsafes: VehicleFailsafeStatus
  motors: VehicleMotorStatus[]
  sensors: VehicleSensorStatus[]
  cameras: VehicleCameraFeed[]
  companion: VehicleCompanionStatus
  detections: VehicleDetectionSummary
  fusionConfidencePercent: number
  pipeline: VehiclePipelineStage[]
  recentEvents: VehicleHealthEvent[]
}

export interface VehicleReplayScenario {
  id: string
  label: string
  posture: "simulation_only"
  summary: string
  frames: VehicleTelemetryFrame[]
  vaultPackage: {
    title: string
    tags: string[]
    incidentType:
      | "routine_patrol"
      | "link_degradation"
      | "battery_return"
      | "operator_review"
  }
}

export interface VehicleControlPosture {
  surfaceAuthority: VehicleAuthorityClass
  commandAuthority: VehicleAuthorityClass
  flightCriticalEnabled: boolean
  label: string
  note: string
}

export interface VehicleSimulationState {
  speedLimitKph: number
  waypointCount: number
  companionConnected: boolean
  companionRoute: "local" | "remote"
  sensorEnabled: Record<VehicleSensorId, boolean>
}

export interface VehicleTelemetrySnapshot {
  activeFrame: VehicleTelemetryFrame
  latestFrame: VehicleTelemetryFrame
  history: VehicleTelemetryFrame[]
  historyLimit: number
  tickMs: number
  sourceMode: VehicleTelemetrySourceMode
  replayIndex: number | null
  replayOffsetSeconds: number
  controlPosture: VehicleControlPosture
  simulation: VehicleSimulationState
}
