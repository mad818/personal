"use client";

import dynamic from "next/dynamic";
import VehicleBridgeStatusCard from "@/components/vehicle/VehicleBridgeStatusCard";
import VehicleConnectorOnboardingCard from "@/components/vehicle/VehicleConnectorOnboardingCard";
import { useVehicleTelemetry } from "@/hooks/useVehicleTelemetry";
import { VEHICLE_CONTRACT_FIELDS } from "@/lib/vehicle/types";
import {
  OpsField,
  OpsInspector,
  OpsRail,
  OpsStrip,
  OpsWorkplane,
  ShellBadge,
  ShellPage,
  ShellStack,
} from "@/components/ui/shell";
import MissionHandoffStrip from "@/components/ui/MissionHandoffStrip";
import SurfaceFocusStrip from "@/components/ui/SurfaceFocusStrip";
import { useSessionHrefAutoHeal } from "@/hooks/useSessionHrefAutoHeal";
import { useSurfaceFocusScroll } from "@/hooks/useSurfaceFocusScroll";
import { getOpsLayoutDescriptor } from "@/lib/opsLayoutRegistry";

const BenchBringUpChecklist = dynamic(
  () => import("@/components/vehicle/BenchBringUpChecklist"),
  { ssr: false },
);
const CameraArray = dynamic(() => import("@/components/vehicle/CameraArray"), {
  ssr: false,
});
const ControlPanel = dynamic(() => import("@/components/vehicle/ControlPanel"), {
  ssr: false,
});
const DroneOpsLaunchpad = dynamic(
  () => import("@/components/vehicle/DroneOpsLaunchpad"),
  { ssr: false },
);
const FirstHardwareDayCard = dynamic(
  () => import("@/components/vehicle/FirstHardwareDayCard"),
  { ssr: false },
);
const RadarSweep = dynamic(() => import("@/components/vehicle/RadarSweep"), {
  ssr: false,
});
const SensorFusion = dynamic(() => import("@/components/vehicle/SensorFusion"), {
  ssr: false,
});
const SensorHealthRadial = dynamic(
  () => import("@/components/vehicle/SensorHealthRadial"),
  { ssr: false },
);
const TelemetryChart = dynamic(
  () => import("@/components/vehicle/TelemetryChart"),
  { ssr: false },
);
const TelemetryPanel = dynamic(
  () => import("@/components/vehicle/TelemetryPanel"),
  { ssr: false },
);
const VehicleArtifactManifestCard = dynamic(
  () => import("@/components/vehicle/VehicleArtifactManifestCard"),
  { ssr: false },
);

const READINESS_PHASES = [
  {
    eyebrow: "Phase 0",
    title: "Simulate first",
    description:
      "Finish telemetry contracts, replay, and operator UX before a single prop turns.",
  },
  {
    eyebrow: "Phase 1",
    title: "Bench the F450",
    description:
      "Power, orientation, RC mapping, GPS, and failsafes get validated with props off.",
  },
  {
    eyebrow: "Phase 2",
    title: "Mission review",
    description:
      "Nexus graduates into a post-flight archive, route review, and alert console.",
  },
];

const STACK_LAYERS = [
  "Autopilot owns stabilization, arming, failsafes, and flight modes.",
  "Companion compute handles telemetry bridging, recording, and future perception work.",
  "Nexus stays the operator console, not the flight-critical controller.",
];

const GUARDRAILS = [
  "No flight-critical loops in Next.js or the desktop shell.",
  "Manual and assisted flight get proven before autonomy or lidar work.",
  "Radar readiness stays passive and advisory-only until a later hardware lane exists.",
  "Every control must be labeled read-only, advisory, or command-capable.",
  "Flight logs and incidents should land in Vault for replay later.",
];

const RADAR_READINESS_SEQUENCE = [
  "Capture",
  "Preprocess",
  "Detect",
  "Track",
  "Review",
];

export default function VehiclePage() {
  const { normalizedParams } = useSessionHrefAutoHeal();
  const { controlPosture, history, sourceMode } = useVehicleTelemetry();
  const focus = normalizedParams.get("focus");

  const focusTargetId =
    focus === "vehicle-bridge-status" ||
    focus === "vehicle-connector-onboarding" ||
    focus === "vehicle-bench-checklist" ||
    focus === "vehicle-artifact-convention"
      ? focus
      : null;

  useSurfaceFocusScroll(focusTargetId);
  const vehicleLayout = getOpsLayoutDescriptor("vehicle");

  return (
    <ShellPage
      width="wide"
      surface="vehicle"
      eyebrow="Systems readiness lab"
      title="Systems lab"
      description="Telemetry, readiness, and bundles on one systems lab."
      actions={
        <>
          <ShellBadge tone="accent">Internal lab</ShellBadge>
          <ShellBadge tone="muted">
            {sourceMode === "replay"
              ? "Replay active"
              : sourceMode === "live_bridge"
                ? "Live bridge feed"
                : "Live sim feed"}
          </ShellBadge>
          <ShellBadge tone="success">{controlPosture.label}</ShellBadge>
        </>
      }
    >
      <ShellStack>
        <MissionHandoffStrip
          surface="vehicle"
          mission={normalizedParams.get("mission")}
          from={normalizedParams.get("from")}
          source={normalizedParams.get("source")}
        />

        {focus === "vehicle-bridge-status" ? (
          <SurfaceFocusStrip
            title="Focused session: bridge status"
            description="Bridge readiness opens first."
          />
        ) : null}

        {focus === "vehicle-connector-onboarding" ? (
          <SurfaceFocusStrip
            title="Focused session: connector onboarding"
            description="Arrival prep opens first."
          />
        ) : null}

        {focus === "vehicle-bench-checklist" ? (
          <SurfaceFocusStrip
            title="Focused session: bench checklist"
            description="Checklist opens first."
          />
        ) : null}

        {focus === "vehicle-artifact-convention" ? (
          <SurfaceFocusStrip
            title="Focused session: session bundles and artifacts"
            description="Bundle lane opens first."
          />
        ) : null}

        <div className="nexus-surface-chamber-shell">
          <div className="nexus-surface-chamber-shell__body">
            <OpsWorkplane className={`nexus-surface-chamber-shell__lead ${vehicleLayout.workplaneClass}`}>
              <OpsField
                title="Readiness brief"
                detail="What this lane becomes once the drone arrives"
              >
                <div className="nexus-shell-copy">
                  <p>
                    The F450 gives us room for a real flight stack, telemetry, GPS,
                    and later companion compute. Nexus should meet it as an operator
                    console first, then grow into replay and mission review once the aircraft is stable.
                  </p>
                </div>
                <div className="nexus-shell-lab-grid" aria-label="Vehicle readiness phases">
                  {READINESS_PHASES.map((phase) => (
                    <div key={phase.title} className="nexus-shell-lab-card">
                      <span className="nexus-shell-lab-card__eyebrow">{phase.eyebrow}</span>
                      <div className="nexus-shell-lab-card__title">{phase.title}</div>
                      <p className="nexus-shell-lab-card__description">
                        {phase.description}
                      </p>
                    </div>
                  ))}
                </div>
              </OpsField>
            </OpsWorkplane>

            <OpsRail className={`nexus-surface-chamber-shell__support ${vehicleLayout.railClass}`}>
              <ShellStack>
                <OpsField title="Flight architecture" detail="How the future system stays safe" tone="muted" compact>
                  <ul className="nexus-shell-kicker-list" aria-label="Flight architecture">
                    {STACK_LAYERS.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </OpsField>

                <OpsField title="Guardrails" detail="No-repeat rules for later hardware work" compact>
                  <ul className="nexus-shell-kicker-list" aria-label="Vehicle guardrails">
                    {GUARDRAILS.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </OpsField>

                <div id="vehicle-bridge-status">
                  <OpsField
                    title="Bridge status"
                    detail="Fresh bridge frames override simulation without making Nexus flight-critical"
                    tone="muted"
                    compact
                  >
                    <VehicleBridgeStatusCard />
                  </OpsField>
                </div>

                <div id="vehicle-connector-onboarding">
                  <OpsField
                    title="Connector onboarding"
                    detail="Save the future Pixhawk / ArduPilot profile before the hardware arrives"
                    tone="muted"
                    compact
                  >
                    <VehicleConnectorOnboardingCard />
                  </OpsField>
                </div>

                <OpsField
                  title="Future telemetry contract"
                  detail={`${history.length} shared frames retained for replay`}
                  tone="muted"
                  compact
                >
                  <div className="nexus-shell-copy nexus-shell-copy--compact" style={{ marginBottom: "10px" }}>
                    <p>
                      Simulation, replay, and fresh bridge frames now resolve through one telemetry shape.
                    </p>
                  </div>
                  <div className="nexus-shell-inline-list" aria-label="Telemetry contract">
                    {VEHICLE_CONTRACT_FIELDS.map((item) => (
                      <span key={item} className="nexus-shell-inline-chip">
                        {item}
                      </span>
                    ))}
                  </div>
                </OpsField>
              </ShellStack>
            </OpsRail>
          </div>
        </div>

        <div className="nexus-surface-chamber-shell">
          <div className="nexus-surface-chamber-shell__body">
            <OpsWorkplane className={`nexus-surface-chamber-shell__lead ${vehicleLayout.workplaneClass}`}>
              <ShellStack gap="12px">
                <OpsField
                  title="Sensor table"
                  detail="Visual feeds and passive radar readiness"
                >
                  <CameraArray />
                </OpsField>
                <OpsField
                  title="Radar sweep"
                  detail="Spatial contact awareness and future passive review"
                  tone="muted"
                >
                  <RadarSweep />
                  <div className="nexus-shell-copy nexus-shell-copy--compact">
                    Radar stays a future passive lane here: {RADAR_READINESS_SEQUENCE.join(" → ")}.
                    Use it to stage readiness and archive notes, not RF control.
                  </div>
                </OpsField>
              </ShellStack>
            </OpsWorkplane>

            <OpsRail className={`nexus-surface-chamber-shell__support ${vehicleLayout.railClass}`}>
              <ShellStack gap="12px">
                <OpsField
                  title="Telemetry trend"
                  detail="Flight-log shaped trend review"
                  tone="muted"
                  compact
                >
                  <TelemetryChart />
                </OpsField>
                <OpsField
                  title="Sensor trust"
                  detail="Health, latency, and fusion posture"
                  compact
                >
                  <ShellStack gap="12px">
                    <SensorHealthRadial />
                    <SensorFusion />
                  </ShellStack>
                </OpsField>
                <OpsField
                  title="Operator note"
                  detail="Readiness stays louder than instrumentation density"
                  tone="muted"
                  compact
                >
                  <div className="nexus-shell-copy nexus-shell-copy--compact">
                    Keep telemetry, control, and launch decisions on one systems table.
                    Bench validation and archive packaging stay adjacent to the live stack.
                  </div>
                </OpsField>
              </ShellStack>
            </OpsRail>
          </div>
        </div>

        <div className="nexus-surface-continuity-strip">
          <OpsStrip className={vehicleLayout.continuityClass}>
            <div className="nexus-surface-chamber-shell__body">
              <div className="nexus-surface-chamber-shell__lead">
                <ShellStack gap="12px">
                  <OpsField
                    title="Flight operations"
                    detail="Live telemetry, mode posture, and cutout handling"
                  >
                    <div className="nexus-ops-composite-grid">
                      <TelemetryPanel />
                      <ControlPanel />
                    </div>
                  </OpsField>
                  <OpsField
                    title="Launch and archive"
                    detail="Bench, bridge, compliance, and durable session packaging"
                    tone="muted"
                  >
                    <DroneOpsLaunchpad />
                    <div id="vehicle-artifact-convention">
                      <div id="vehicle-flight-session-bundles" />
                      <VehicleArtifactManifestCard />
                    </div>
                  </OpsField>
                </ShellStack>
              </div>
              <OpsInspector className={`nexus-surface-chamber-shell__support ${vehicleLayout.inspectorClass}`}>
                <ShellStack gap="12px">
                  <OpsField
                    id="vehicle-bench-checklist"
                    title="Bench checklist"
                    detail="Persistent props-off validation before any real sortie"
                    compact
                  >
                    <BenchBringUpChecklist />
                  </OpsField>
                  <OpsField
                    title="First hardware day"
                    detail="Arrival-day checklist and recovery flows for the first bridge session"
                    tone="muted"
                    compact
                  >
                    <div id="vehicle-first-hardware-day">
                      <FirstHardwareDayCard />
                    </div>
                  </OpsField>
                </ShellStack>
              </OpsInspector>
            </div>
          </OpsStrip>
        </div>
      </ShellStack>
    </ShellPage>
  );
}
