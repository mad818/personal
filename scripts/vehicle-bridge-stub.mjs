#!/usr/bin/env node

const BRIDGE_URL =
  process.env.NEXUS_VEHICLE_BRIDGE_URL ??
  "http://127.0.0.1:3000/api/vehicle/telemetry";
const BRIDGE_ID =
  process.env.NEXUS_VEHICLE_BRIDGE_ID ?? "pixhawk-passive-bridge";
const BRIDGE_LABEL =
  process.env.NEXUS_VEHICLE_BRIDGE_LABEL ?? "Pixhawk passive bridge";
const BRIDGE_AUTHORITY =
  process.env.NEXUS_VEHICLE_BRIDGE_AUTHORITY === "advisory"
    ? "advisory"
    : "read_only";
const INTERVAL_MS = clampNumber(process.env.NEXUS_VEHICLE_BRIDGE_INTERVAL_MS, 2000);
const BAUD_RATE = clampNumber(process.env.NEXUS_VEHICLE_BAUD_RATE, 57600);
const TRANSPORT = process.env.NEXUS_VEHICLE_TRANSPORT ?? "usb_serial";
const PORT_HINT = process.env.NEXUS_VEHICLE_PORT_HINT ?? "COM7 / /dev/ttyACM0";

function clampNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

let tick = 0;

function buildFrame() {
  const now = Date.now();
  const phase = tick / 6;
  const batteryPercent = Math.max(28, 99 - tick * 0.2);
  const hdop = Number((1.1 + Math.abs(Math.sin(phase)) * 0.3).toFixed(2));
  const speed = Number((Math.max(0, Math.sin(phase) * 4)).toFixed(2));
  const homeDistance = Number((Math.max(0, Math.sin(phase / 2) * 9)).toFixed(1));
  const headingDeg = ((tick * 7) % 360 + 360) % 360;

  tick += 1;

  return {
    timestamp: now,
    vehicleId: "future-f450",
    heartbeat: {
      online: true,
      armed: false,
      mode: tick % 12 < 8 ? "LOITER" : "RTL",
      linkState: "online",
      health: hdop > 1.35 ? "warning" : "nominal",
    },
    position: {
      lat: 34.05221 + Math.sin(phase) * 0.00002,
      lon: -118.24372 + Math.cos(phase) * 0.00002,
      altitudeAglM: Number((Math.max(0, Math.sin(phase) * 1.4)).toFixed(2)),
      altitudeMslM: 312.4,
      groundSpeedMps: speed,
      climbRateMps: Number((Math.sin(phase / 3) * 0.4).toFixed(2)),
      headingDeg,
      fixType: "3D",
      satellites: 11,
      hdop,
    },
    battery: {
      percent: Number(batteryPercent.toFixed(1)),
      voltageV: Number((15.9 - tick * 0.003).toFixed(2)),
      currentA: Number((2.1 + Math.abs(Math.sin(phase)) * 0.9).toFixed(2)),
      failsafeThresholdPercent: 24,
    },
    link: {
      qualityPercent: 95,
      latencyMs: Number((32 + Math.abs(Math.sin(phase)) * 8).toFixed(0)),
      uplinkKbps: 128,
      downlinkKbps: 256,
    },
    mission: {
      profile: "Future hardware day observer",
      phase: speed > 0.5 ? "holding" : "idle",
      currentStep: speed > 0.5 ? 1 : 0,
      totalSteps: 1,
      homeDistanceM: homeDistance,
    },
    failsafes: {
      battery: batteryPercent <= 24,
      gps: hdop > 1.5,
      radio: false,
      geofence: false,
    },
    companion: {
      label: BRIDGE_LABEL,
      connected: true,
      route: TRANSPORT === "companion_link" ? "local" : "remote",
      cpuTempC: 39,
      gpuTempC: 0,
      aiModel: "bridge-observer",
      inferenceMs: 0,
    },
    recentEvents:
      tick % 20 === 0
        ? [
            {
              id: `stub-${now}`,
              ts: now,
              severity: "warning",
              message: `Passive bridge stub check-in from ${PORT_HINT} @ ${BAUD_RATE}`,
            },
          ]
        : [],
  };
}

async function postFrame() {
  const response = await fetch(BRIDGE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      bridgeId: BRIDGE_ID,
      bridgeLabel: BRIDGE_LABEL,
      authority: BRIDGE_AUTHORITY,
      frame: buildFrame(),
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`HTTP ${response.status}${body ? ` — ${body}` : ""}`);
  }

  return response.json().catch(() => null);
}

console.log(`[vehicle-bridge-stub] posting to ${BRIDGE_URL}`);
console.log(
  `[vehicle-bridge-stub] ${BRIDGE_LABEL} (${TRANSPORT}, ${PORT_HINT}, ${BAUD_RATE}, ${BRIDGE_AUTHORITY})`,
);

const timer = setInterval(async () => {
  try {
    await postFrame();
    process.stdout.write(".");
  } catch (error) {
    process.stdout.write("\n");
    console.error("[vehicle-bridge-stub] post failed", error);
  }
}, INTERVAL_MS);

const shutdown = () => {
  clearInterval(timer);
  process.stdout.write("\n");
  console.log("[vehicle-bridge-stub] stopped");
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
