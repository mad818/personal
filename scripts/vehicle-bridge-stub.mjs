#!/usr/bin/env node
/* eslint-disable no-console */

const args = new Set(process.argv.slice(2))
const shouldPost = args.has("--post")
const baseUrl = (process.env.NEXUS_RELEASE_BASE_URL || "http://127.0.0.1:3100").replace(/\/$/, "")
const bridgeId = process.env.NEXUS_VEHICLE_BRIDGE_ID || "pixhawk-passive-bridge"
const bridgeLabel = process.env.NEXUS_VEHICLE_BRIDGE_LABEL || "Pixhawk passive bridge"
const authority =
  process.env.NEXUS_VEHICLE_BRIDGE_AUTHORITY === "advisory" ? "advisory" : "read_only"
const transport = process.env.NEXUS_VEHICLE_TRANSPORT || "usb_serial"
const baudRate = Number(process.env.NEXUS_VEHICLE_BAUD_RATE || 57600)
const portHint = process.env.NEXUS_VEHICLE_PORT_HINT || "COM7 / /dev/ttyACM0"
const now = Date.now()

const payload = {
  schemaVersion: "nexus-vehicle-passive-bridge-v1",
  bridgeId,
  bridgeLabel,
  authority,
  transport,
  baudRate,
  portHint,
  safety: {
    mode: "dry_run_read_only",
    controlAuthority: false,
    contract: "Nexus does not arm, steer, or mode-switch the aircraft.",
  },
  frame: {
    timestamp: now,
    vehicleId: "future-f450-passive-stub",
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
      headingDeg: 247,
      fixType: "3D",
      satellites: 12,
      hdop: 0.9,
    },
    battery: {
      percent: 91,
      voltageV: 15.1,
      currentA: 0,
      failsafeThresholdPercent: 24,
    },
    link: {
      qualityPercent: 96,
      latencyMs: 34,
      uplinkKbps: 64,
      downlinkKbps: 128,
    },
    mission: {
      profile: "First hardware day passive bridge dry run",
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
      { id: "FL", health: "offline", rpm: 0 },
      { id: "FR", health: "offline", rpm: 0 },
      { id: "RL", health: "offline", rpm: 0 },
      { id: "RR", health: "offline", rpm: 0 },
    ],
    sensors: [
      { id: "imu", label: "IMU", sensorClass: "navigation", active: true, healthPercent: 98, latencyMs: 3 },
      { id: "gps", label: "GPS", sensorClass: "navigation", active: true, healthPercent: 94, latencyMs: 48 },
      { id: "rgb", label: "RGB", sensorClass: "perception", active: false, healthPercent: 0, latencyMs: 0 },
    ],
    cameras: [
      { id: "vc1", label: "Forward RGB", type: "RGB", status: "standby", resolution: "1920x1080", fps: 0 },
    ],
    companion: {
      label: "Passive bridge stub",
      connected: true,
      route: "local",
      cpuTempC: 41,
      gpuTempC: 0,
      aiModel: "none",
      inferenceMs: 0,
    },
    detections: {
      people: 0,
      vehicles: 0,
      obstacles: 0,
    },
    fusionConfidencePercent: 0,
    pipeline: [
      { name: "Input", latencyMs: 1, ok: true },
      { name: "Normalize", latencyMs: 1, ok: true },
      { name: "Review", latencyMs: 1, ok: true },
    ],
    recentEvents: [
      {
        id: `dry-run-${now}`,
        ts: now,
        severity: "info",
        message: "Passive bridge stub generated a dry-run telemetry frame.",
      },
    ],
  },
}

console.log(JSON.stringify(payload, null, 2))

if (!shouldPost) {
  console.log("")
  console.log("Dry run only. Add --post to send this passive frame to /api/vehicle/telemetry.")
  process.exit(0)
}

const headers = {
  "Content-Type": "application/json",
  Accept: "application/json",
}
if (process.env.NEXUS_TOKEN) {
  headers["x-nexus-internal-auth"] = process.env.NEXUS_TOKEN
}

const response = await fetch(`${baseUrl}/api/vehicle/telemetry`, {
  method: "POST",
  headers,
  body: JSON.stringify(payload),
})

const text = await response.text()
console.log("")
console.log(`POST ${response.status} ${response.statusText}`)
console.log(text)

if (!response.ok) {
  process.exitCode = 1
}
