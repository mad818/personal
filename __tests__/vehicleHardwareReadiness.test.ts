import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildVehicleFlightSessionBundle,
  buildVehicleSessionVaultDraft,
  DEFAULT_VEHICLE_CONNECTOR_PROFILE,
  parseVehicleFlightSessionBundle,
} from "@/lib/vehicle/hardwareReadiness";
import type { VehicleTelemetryFrame } from "@/lib/vehicle/types";

function buildTelemetryFrame(): VehicleTelemetryFrame {
  const timestamp = Date.parse("2026-04-13T18:10:00.000Z");

  return {
    timestamp,
    vehicleId: "f450-lab",
    source: "simulation",
    heartbeat: {
      online: true,
      armed: false,
      mode: "LOITER",
      linkState: "online",
      health: "nominal",
    },
    position: {
      lat: 34.0522,
      lon: -118.2437,
      altitudeAglM: 1.4,
      altitudeMslM: 112.8,
      groundSpeedMps: 0,
      climbRateMps: 0,
      headingDeg: 92,
      fixType: "3D",
      satellites: 15,
      hdop: 0.8,
    },
    battery: {
      percent: 86,
      voltageV: 15.6,
      currentA: 4.3,
      failsafeThresholdPercent: 25,
    },
    link: {
      qualityPercent: 94,
      latencyMs: 48,
      uplinkKbps: 128,
      downlinkKbps: 256,
    },
    mission: {
      profile: "Bench validation",
      phase: "holding",
      currentStep: 1,
      totalSteps: 3,
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
    sensors: [
      {
        id: "rgb",
        label: "Front RGB",
        sensorClass: "perception",
        active: true,
        healthPercent: 98,
        latencyMs: 30,
      },
      {
        id: "imu",
        label: "Primary IMU",
        sensorClass: "navigation",
        active: true,
        healthPercent: 97,
        latencyMs: 4,
      },
    ],
    cameras: [
      {
        id: "front-rgb",
        label: "Front RGB",
        type: "RGB",
        status: "active",
        resolution: "1920x1080",
        fps: 30,
      },
    ],
    companion: {
      label: "Jetson Orin Nano",
      connected: true,
      route: "local",
      cpuTempC: 54,
      gpuTempC: 47,
      aiModel: "nexus-vision",
      inferenceMs: 41,
    },
    detections: {
      people: 0,
      vehicles: 0,
      obstacles: 0,
    },
    fusionConfidencePercent: 88,
    pipeline: [
      { name: "capture", latencyMs: 12, ok: true },
      { name: "fusion", latencyMs: 22, ok: true },
    ],
    recentEvents: [
      {
        id: "bench-start",
        ts: timestamp - 15_000,
        severity: "info",
        message: "Bench session started.",
      },
    ],
  };
}

function buildBridgeStatus() {
  return {
    available: true,
    fresh: true,
    bridgeId: "pixhawk-passive-bridge",
    bridgeLabel: "Pixhawk passive bridge",
    authority: "read_only" as const,
    ingestedFrames: 48,
    freshnessMs: 1_200,
  };
}

describe("vehicle hardware readiness", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-13T18:15:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("parses legacy v1 session bundles without radar data", () => {
    const activeFrame = buildTelemetryFrame();
    const bundle = buildVehicleFlightSessionBundle({
      activeFrame,
      history: [activeFrame],
      bridgeStatus: buildBridgeStatus(),
      benchChecklistState: {},
      firstHardwareDayChecklistState: {},
      connectorProfile: DEFAULT_VEHICLE_CONNECTOR_PROFILE,
    });

    const parsed = parseVehicleFlightSessionBundle(JSON.stringify(bundle));

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      throw new Error(parsed.message);
    }

    expect(parsed.bundle.schemaVersion).toBe("nexus-vehicle-session-v1");
    expect(parsed.bundle.radar).toBeUndefined();
  });

  it("keeps advisory radar notes backward compatible in new v1 bundles", () => {
    const activeFrame = buildTelemetryFrame();
    const bundle = buildVehicleFlightSessionBundle({
      activeFrame,
      history: [activeFrame],
      bridgeStatus: buildBridgeStatus(),
      benchChecklistState: {},
      firstHardwareDayChecklistState: {},
      connectorProfile: DEFAULT_VEHICLE_CONNECTOR_PROFILE,
      radar: {
        modeLabel: "Passive sector sweep",
        processingStage: "detect",
        summary: "Review the passive radar contacts before promoting them into a broader vehicle narrative.",
        fusionNote: "Cross-check against EO overlays before treating the sweep as trustworthy.",
        artifactLabels: ["sector-a", "fusion-pass-01"],
      },
    });

    const parsed = parseVehicleFlightSessionBundle(bundle);

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      throw new Error(parsed.message);
    }

    expect(parsed.bundle.schemaVersion).toBe("nexus-vehicle-session-v1");
    expect(parsed.bundle.radar).toEqual({
      modeLabel: "Passive sector sweep",
      processingStage: "detect",
      summary:
        "Review the passive radar contacts before promoting them into a broader vehicle narrative.",
      fusionNote: "Cross-check against EO overlays before treating the sweep as trustworthy.",
      artifactLabels: ["sector-a", "fusion-pass-01"],
    });

    const draft = buildVehicleSessionVaultDraft(parsed.bundle, "Vehicle Lab");

    expect(draft.tags).toContain("radar-readiness");
    expect(draft.content).toContain("## Radar readiness");
    expect(draft.content).toContain("Processing stage: Detect");
    expect(draft.content).toContain("Artifact labels: sector-a, fusion-pass-01");
  });
});
