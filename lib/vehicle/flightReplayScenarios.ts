import type { VehicleReplayScenario } from "@/lib/vehicle/types";
import { makeSimulatedTelemetryFrame } from "@/lib/vehicle/simTelemetry";

const SCENARIO_START = 1_777_870_000_000;

function scenarioFrame(
  scenarioOffset: number,
  step: number,
  options: Omit<
    Parameters<typeof makeSimulatedTelemetryFrame>[0],
    "step" | "timestamp"
  >,
) {
  return makeSimulatedTelemetryFrame({
    ...options,
    step: scenarioOffset + step,
    timestamp: SCENARIO_START + scenarioOffset * 10_000 + step * 2_000,
  });
}

export const VEHICLE_REPLAY_SCENARIOS: VehicleReplayScenario[] = [
  {
    id: "perimeter-patrol-review",
    label: "Perimeter patrol review",
    posture: "simulation_only",
    summary:
      "Simulated patrol orbit with operator review, local inference notes, and no flight-control authority.",
    frames: [0, 1, 2, 3, 4].map((step) =>
      scenarioFrame(10, step, {
        mode: "LOITER",
        profile: "Perimeter patrol review",
        phase: step < 4 ? "holding" : "rtl",
        eventMessage:
          step === 0
            ? "Perimeter review replay started from simulation."
            : step === 4
              ? "Operator marks patrol clear and returns to review queue."
              : "Drone maintains simulated patrol orbit.",
      }),
    ),
    vaultPackage: {
      title: "Vehicle replay - perimeter patrol review",
      tags: ["vehicle", "simulation", "perimeter", "review-first"],
      incidentType: "routine_patrol",
    },
  },
  {
    id: "link-degradation-review",
    label: "Link degradation drill",
    posture: "simulation_only",
    summary:
      "Simulated link-quality drop that keeps Nexus advisory while autopilot failsafe ownership remains explicit.",
    frames: [0, 1, 2, 3, 4].map((step) =>
      scenarioFrame(30, step, {
        mode: step < 3 ? "AUTO" : "RTL",
        profile: "Link degradation drill",
        phase: step < 3 ? "enroute" : "rtl",
        linkQualityPercent: step < 2 ? 72 : step === 2 ? 48 : 32,
        eventMessage:
          step < 2
            ? "Telemetry link nominal in simulated mission leg."
            : step === 2
              ? "Link degrading. Nexus keeps advisory review posture."
              : "Autopilot owns return-to-launch failsafe path.",
      }),
    ),
    vaultPackage: {
      title: "Vehicle replay - link degradation drill",
      tags: ["vehicle", "simulation", "link-quality", "failsafe"],
      incidentType: "link_degradation",
    },
  },
  {
    id: "battery-return-review",
    label: "Battery return review",
    posture: "simulation_only",
    summary:
      "Simulated battery descent and return sequence for reviewing thresholds before hardware arrives.",
    frames: [0, 1, 2, 3, 4].map((step) =>
      scenarioFrame(50, step, {
        mode: step < 2 ? "LOITER" : "RTL",
        profile: "Battery return review",
        phase: step < 2 ? "holding" : step < 4 ? "rtl" : "landing",
        batteryPercent: step < 2 ? 34 - step * 2 : 27 - step,
        eventMessage:
          step < 2
            ? "Battery trend under review in simulation."
            : step < 4
              ? "Return path simulated before failsafe threshold."
              : "Landing posture reviewed without command output.",
      }),
    ),
    vaultPackage: {
      title: "Vehicle replay - battery return review",
      tags: ["vehicle", "simulation", "battery", "rtl"],
      incidentType: "battery_return",
    },
  },
  {
    id: "operator-incident-review",
    label: "Operator incident package",
    posture: "simulation_only",
    summary:
      "Simulated incident review package with camera, telemetry, and operator note context ready for Vault.",
    frames: [0, 1, 2, 3, 4].map((step) =>
      scenarioFrame(70, step, {
        mode: step < 3 ? "AUTO" : "LOITER",
        profile: "Operator incident package",
        phase: step < 3 ? "enroute" : "holding",
        eventMessage:
          step === 0
            ? "Operator tags a simulated incident for later review."
            : step === 3
              ? "Drone holds while operator reviews evidence package."
              : "Telemetry and sensor bundle remain review-only.",
      }),
    ),
    vaultPackage: {
      title: "Vehicle replay - operator incident package",
      tags: ["vehicle", "simulation", "incident", "vault-package"],
      incidentType: "operator_review",
    },
  },
];

export const DEFAULT_VEHICLE_REPLAY_SCENARIO =
  VEHICLE_REPLAY_SCENARIOS.find(
    (scenario) => scenario.id === "perimeter-patrol-review",
  ) ?? VEHICLE_REPLAY_SCENARIOS[0];
