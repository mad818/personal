"use client";

import CameraArray from "@/components/vehicle/CameraArray";
import BenchBringUpChecklist from "@/components/vehicle/BenchBringUpChecklist";
import ControlPanel from "@/components/vehicle/ControlPanel";
import RadarSweep from "@/components/vehicle/RadarSweep";
import SensorFusion from "@/components/vehicle/SensorFusion";
import SensorHealthRadial from "@/components/vehicle/SensorHealthRadial";
import TelemetryChart from "@/components/vehicle/TelemetryChart";
import TelemetryPanel from "@/components/vehicle/TelemetryPanel";
import DroneOpsLaunchpad from "@/components/vehicle/DroneOpsLaunchpad";
import FirstHardwareDayCard from "@/components/vehicle/FirstHardwareDayCard";
import VehicleArtifactManifestCard from "@/components/vehicle/VehicleArtifactManifestCard";
import VehicleBridgeStatusCard from "@/components/vehicle/VehicleBridgeStatusCard";
import VehicleConnectorOnboardingCard from "@/components/vehicle/VehicleConnectorOnboardingCard";
import { useVehicleTelemetry } from "@/hooks/useVehicleTelemetry";
import { VEHICLE_CONTRACT_FIELDS } from "@/lib/vehicle/types";
import {
  SectionLabel,
  ShellBadge,
  ShellGrid,
  ShellPage,
  ShellPanel,
  ShellStack,
} from "@/components/ui/shell";
import MissionHandoffStrip from "@/components/ui/MissionHandoffStrip";
import SurfaceFocusStrip from "@/components/ui/SurfaceFocusStrip";
import { useSessionHrefAutoHeal } from "@/hooks/useSessionHrefAutoHeal";
import { useSurfaceFocusScroll } from "@/hooks/useSurfaceFocusScroll";

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

  return (
    <ShellPage
      width="wide"
      surface="vehicle"
      eyebrow="Internal mobility lab"
      title="VEHICLE LAB"
      description="A cleaner internal staging area for future airframe work: simulated telemetry now, F450 mission operations later."
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
            description="You landed on VEHICLE with bridge posture in focus so passive telemetry readiness is visible before broader lab review."
          />
        ) : null}

        {focus === "vehicle-connector-onboarding" ? (
          <SurfaceFocusStrip
            title="Focused session: connector onboarding"
            description="You landed on VEHICLE with the future Pixhawk / ArduPilot onboarding lane in focus so hardware-arrival prep starts at the right panel."
          />
        ) : null}

        {focus === "vehicle-bench-checklist" ? (
          <SurfaceFocusStrip
            title="Focused session: bench checklist"
            description="You landed on VEHICLE with the props-off checklist in focus so first-day validation starts where it should."
          />
        ) : null}

        {focus === "vehicle-artifact-convention" ? (
          <SurfaceFocusStrip
            title="Focused session: session bundles and artifacts"
            description="You landed on VEHICLE with artifact packaging in focus so future session bundles and render briefs start at the archive-ready lane."
          />
        ) : null}

        <ShellGrid columns="minmax(0, 1.06fr) minmax(320px, 0.94fr)" align="start">
          <ShellPanel tone="hero">
            <SectionLabel detail="What this lane becomes once the drone arrives">
              Readiness brief
            </SectionLabel>
            <div className="nexus-shell-copy">
              <p>
                The F450 gives us room for a real flight stack, telemetry, GPS,
                and later companion compute. Nexus should meet it as an
                operator console first, then grow into replay, mission review,
                sensor fusion, and later passive radar review once the aircraft is stable.
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
          </ShellPanel>

          <ShellStack>
            <ShellPanel tone="muted">
              <SectionLabel detail="How the future system stays safe">
                Flight architecture
              </SectionLabel>
              <ul className="nexus-shell-kicker-list" aria-label="Flight architecture">
                {STACK_LAYERS.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </ShellPanel>

            <ShellPanel>
              <SectionLabel detail="No-repeat rules for later hardware work">
                Guardrails
              </SectionLabel>
              <ul className="nexus-shell-kicker-list" aria-label="Vehicle guardrails">
                {GUARDRAILS.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </ShellPanel>

            <div id="vehicle-bridge-status">
              <ShellPanel tone="muted">
                <SectionLabel detail="Fresh bridge frames override simulation without making Nexus flight-critical">
                  Bridge status
                </SectionLabel>
                <VehicleBridgeStatusCard />
              </ShellPanel>
            </div>

            <div id="vehicle-connector-onboarding">
              <ShellPanel tone="muted">
                <SectionLabel detail="Save the future Pixhawk / ArduPilot profile before the hardware arrives">
                  Connector onboarding
                </SectionLabel>
                <VehicleConnectorOnboardingCard />
              </ShellPanel>
            </div>

            <ShellPanel tone="muted">
              <SectionLabel detail={`${history.length} shared frames retained for replay`}>
                Future telemetry contract
              </SectionLabel>
              <div className="nexus-shell-copy" style={{ marginBottom: "10px" }}>
                <p>
                  Vehicle Lab is now backed by one shared telemetry contract,
                  so simulation, replay, and fresh bridge frames all resolve
                  through the same operator-facing shape.
                </p>
              </div>
              <div className="nexus-shell-inline-list" aria-label="Telemetry contract">
                {VEHICLE_CONTRACT_FIELDS.map((item) => (
                  <span key={item} className="nexus-shell-inline-chip">
                    {item}
                  </span>
                ))}
              </div>
            </ShellPanel>
          </ShellStack>
        </ShellGrid>

        <ShellGrid columns="minmax(0, 1.08fr) 320px" align="start">
          <div className="nexus-shell-embed">
            <SectionLabel detail="Visual and sensor feeds">Camera array</SectionLabel>
            <CameraArray />
          </div>
          <div className="nexus-shell-embed">
            <SectionLabel detail="Spatial contact awareness">Radar sweep</SectionLabel>
            <RadarSweep />
            <div className="nexus-shell-copy nexus-shell-copy--compact" style={{ marginTop: "10px" }}>
              Radar remains a future passive sensor lane here: {RADAR_READINESS_SEQUENCE.join(" → ")}.
              Use the vocabulary to stage readiness and archive notes, not to imply RF control or flight-critical authority.
            </div>
          </div>
        </ShellGrid>

        <div className="nexus-shell-embed">
          <SectionLabel detail="Trend line for future flight logs">Telemetry trend</SectionLabel>
          <TelemetryChart />
        </div>

        <ShellGrid columns="minmax(280px, 0.86fr) minmax(300px, 0.92fr) minmax(280px, 1.12fr)" align="start">
          <div className="nexus-shell-embed">
            <SectionLabel detail="Live status and health">Telemetry</SectionLabel>
            <TelemetryPanel />
          </div>

          <div className="nexus-shell-embed">
            <SectionLabel detail="Mode, route, and cutout handling">Control panel</SectionLabel>
            <ControlPanel />
          </div>

          <ShellStack>
            <div className="nexus-shell-embed">
              <SectionLabel detail="Sensor trust and latency posture">
                Sensor health
              </SectionLabel>
              <SensorHealthRadial />
            </div>
            <div className="nexus-shell-embed">
              <SectionLabel detail="What later lidar and vision work will feed">
                Sensor fusion
              </SectionLabel>
              <SensorFusion />
            </div>
          </ShellStack>
        </ShellGrid>

        <ShellPanel tone="muted">
          <SectionLabel detail="Bench -> bridge -> compliance -> archive">
            Drone ops launchpad
          </SectionLabel>
          <DroneOpsLaunchpad />
        </ShellPanel>

        <ShellGrid columns="minmax(320px, 0.98fr) minmax(320px, 1.02fr)" align="start">
          <div id="vehicle-bench-checklist" className="nexus-shell-embed">
            <SectionLabel detail="Persistent props-off validation before any real sortie">
              Bench checklist
            </SectionLabel>
            <BenchBringUpChecklist />
          </div>
          <div id="vehicle-first-hardware-day" className="nexus-shell-embed">
            <SectionLabel detail="Arrival-day checklist plus recovery flows when the first bridge session misbehaves">
              First hardware day
            </SectionLabel>
            <FirstHardwareDayCard />
          </div>
        </ShellGrid>

        <div id="vehicle-artifact-convention" className="nexus-shell-embed">
          <div id="vehicle-flight-session-bundles" />
          <SectionLabel detail="What future flight sessions should package into Vault and how to import them later">
            Session bundles
          </SectionLabel>
          <VehicleArtifactManifestCard />
        </div>
      </ShellStack>
    </ShellPage>
  );
}
