import type {
  VehicleArtifactManifest,
  VehicleBridgeStatus,
  VehicleBenchChecklistItem,
  VehicleTelemetryFrame,
} from "@/lib/vehicle/types";

export const VEHICLE_BENCH_CHECKLIST: VehicleBenchChecklistItem[] = [
  {
    id: "props-removed",
    category: "frame_power",
    label: "Props removed before power-on",
    detail: "No powered bench session starts with props mounted.",
  },
  {
    id: "battery-restraint",
    category: "frame_power",
    label: "Battery, XT60, and frame restraint confirmed",
    detail: "Power lead is secure and the airframe cannot walk off the bench.",
  },
  {
    id: "imu-orientation",
    category: "orientation",
    label: "FC orientation and IMU axes verified",
    detail:
      "Pitch, roll, and yaw move in the expected direction in the ground station.",
  },
  {
    id: "compass-calibration",
    category: "orientation",
    label: "Compass orientation and calibration confirmed",
    detail: "Compass offset looks sane before relying on navigation modes.",
  },
  {
    id: "rc-mapping",
    category: "radio_modes",
    label: "RC channels map correctly to expected controls",
    detail: "Throttle, roll, pitch, yaw, and aux switches are not cross-wired.",
  },
  {
    id: "mode-switches",
    category: "radio_modes",
    label: "Flight mode switch transitions are predictable",
    detail: "Stabilize, Loiter, RTL, and Land can be selected intentionally.",
  },
  {
    id: "gps-lock",
    category: "gps_home",
    label: "GPS has stable 3D lock and acceptable HDOP",
    detail: "Do not bench toward flight readiness on a weak GPS solution.",
  },
  {
    id: "home-point",
    category: "gps_home",
    label: "Home point and heading are believable",
    detail:
      "Home should not drift or point the wrong direction before field work.",
  },
  {
    id: "radio-failsafe",
    category: "failsafes",
    label: "Radio loss behavior matches the chosen failsafe",
    detail: "Failsafe posture is proven props-off before any real sortie.",
  },
  {
    id: "battery-failsafe",
    category: "failsafes",
    label: "Battery threshold and warning path reviewed",
    detail: "Low-battery posture is understood before first outdoor throttle.",
  },
];

export const VEHICLE_CHECKLIST_CATEGORY_LABELS: Record<
  VehicleBenchChecklistItem["category"],
  string
> = {
  frame_power: "Frame + Power",
  orientation: "Orientation",
  radio_modes: "Radio + Modes",
  gps_home: "GPS + Home",
  failsafes: "Failsafes",
};

export interface VehicleBenchChecklistProgress {
  completedCount: number;
  totalCount: number;
  percent: number;
  remainingCount: number;
  nextIncompleteLabel: string | null;
}

export function getVehicleBenchChecklistProgress(
  checklistState: Record<string, boolean>,
): VehicleBenchChecklistProgress {
  const completedCount = VEHICLE_BENCH_CHECKLIST.filter(
    (item) => checklistState[item.id],
  ).length;
  const totalCount = VEHICLE_BENCH_CHECKLIST.length;
  const remainingCount = totalCount - completedCount;
  const nextIncompleteLabel =
    VEHICLE_BENCH_CHECKLIST.find((item) => !checklistState[item.id])?.label ??
    null;

  return {
    completedCount,
    totalCount,
    percent:
      totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0,
    remainingCount,
    nextIncompleteLabel,
  };
}

export function buildVehicleOpsBrief({
  activeFrame,
  historyFrames,
  checklistState,
  bridgeStatus,
}: {
  activeFrame: VehicleTelemetryFrame;
  historyFrames: number;
  checklistState: Record<string, boolean>;
  bridgeStatus: Pick<
    VehicleBridgeStatus,
    "available" | "fresh" | "bridgeLabel" | "ingestedFrames" | "freshnessMs"
  >;
}): string {
  const checklist = getVehicleBenchChecklistProgress(checklistState);
  const bridgeLabel = bridgeStatus.bridgeLabel ?? "simulation fallback";
  const bridgeAge =
    bridgeStatus.freshnessMs === null
      ? "no bridge ingest yet"
      : bridgeStatus.freshnessMs < 60_000
        ? `${Math.round(bridgeStatus.freshnessMs / 1_000)}s ago`
        : `${Math.round(bridgeStatus.freshnessMs / 60_000)}m ago`;

  return [
    `Vehicle ops brief — ${new Date(activeFrame.timestamp).toLocaleString()}`,
    `Checklist: ${checklist.completedCount}/${checklist.totalCount} complete (${checklist.percent}%).`,
    checklist.nextIncompleteLabel
      ? `Next incomplete item: ${checklist.nextIncompleteLabel}.`
      : "Bench checklist complete for the current props-off pass.",
    `Bridge: ${bridgeStatus.fresh ? "fresh passive bridge" : bridgeStatus.available ? "stale bridge fallback" : "simulation fallback"} via ${bridgeLabel} (${bridgeAge}, ${bridgeStatus.ingestedFrames} ingested frames).`,
    `Flight posture: ${activeFrame.heartbeat.mode} · battery ${activeFrame.battery.percent.toFixed(0)}% · GPS ${activeFrame.position.fixType} with ${activeFrame.position.satellites} sats.`,
    `Retention: ${historyFrames} shared frames in replay buffer for future Vault packaging.`,
    "Next operator flow: bench validation -> passive bridge confirmation -> drone compliance review -> Vault artifact package.",
  ].join(" ");
}

export function buildVehicleArtifactManifest(
  activeFrame: VehicleTelemetryFrame,
  history: VehicleTelemetryFrame[],
): VehicleArtifactManifest {
  const latestTs = new Date(activeFrame.timestamp)
    .toISOString()
    .replace(/[:]/g, "-");
  const sessionLabel = `f450-bench-${latestTs}`;
  const issues = activeFrame.recentEvents.filter(
    (event) => event.severity !== "info",
  ).length;

  return {
    generatedAt: Date.now(),
    vehicleId: activeFrame.vehicleId,
    sourceMode: activeFrame.source,
    sessionLabel,
    tags: [
      "vehicle",
      "f450",
      "bench",
      activeFrame.heartbeat.mode.toLowerCase(),
      activeFrame.source === "simulation" ? "simulated" : activeFrame.source,
      issues > 0 ? "review-needed" : "nominal",
    ],
    summary:
      issues > 0
        ? `${issues} non-info event${issues === 1 ? "" : "s"} captured. Review failsafe posture before live bridge work.`
        : "Nominal simulated bench session ready for future Vault archival conventions.",
    historyFrames: history.length,
    latestMode: activeFrame.heartbeat.mode,
    files: [
      {
        kind: "session_summary",
        filename: `${sessionLabel}.summary.json`,
        note: "Top-line session posture, health state, and operator notes.",
      },
      {
        kind: "telemetry_log",
        filename: `${sessionLabel}.telemetry.jsonl`,
        note: "Replay-friendly normalized telemetry frames from the shared vehicle contract.",
      },
      {
        kind: "incident_timeline",
        filename: `${sessionLabel}.incidents.json`,
        note: "Warning and critical events with timestamps for post-flight review.",
      },
      {
        kind: "sensor_bundle",
        filename: `${sessionLabel}.sensors.json`,
        note: "Camera, sensor, and fusion posture snapshot at session end.",
      },
      {
        kind: "preview_3d",
        filename: `${sessionLabel}.preview.glb`,
        note: "Optional future 3D preview asset for fit-checking mounts, enclosures, or airframe attachments locally.",
      },
      {
        kind: "parametric_source",
        filename: `${sessionLabel}.preview.py`,
        note: "Optional future parametric/source file used to regenerate or revise the local 3D preview artifact.",
      },
    ],
  };
}
