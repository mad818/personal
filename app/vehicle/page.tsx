"use client";

import CameraArray from "@/components/vehicle/CameraArray";
import ControlPanel from "@/components/vehicle/ControlPanel";
import RadarSweep from "@/components/vehicle/RadarSweep";
import SensorFusion from "@/components/vehicle/SensorFusion";
import SensorHealthRadial from "@/components/vehicle/SensorHealthRadial";
import TelemetryChart from "@/components/vehicle/TelemetryChart";
import TelemetryPanel from "@/components/vehicle/TelemetryPanel";
import {
  SectionLabel,
  ShellBadge,
  ShellGrid,
  ShellPage,
  ShellPanel,
  ShellStack,
} from "@/components/ui/shell";

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
  "Every control must be labeled read-only, advisory, or command-capable.",
  "Flight logs and incidents should land in Vault for replay later.",
];

export default function VehiclePage() {
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
          <ShellBadge tone="muted">F450 queued</ShellBadge>
          <ShellBadge tone="success">Simulation-first</ShellBadge>
        </>
      }
    >
      <ShellStack>
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
                and sensor fusion once the aircraft is stable.
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

            <ShellPanel tone="muted">
              <SectionLabel>Future telemetry contract</SectionLabel>
              <div className="nexus-shell-inline-list" aria-label="Telemetry contract">
                {[
                  "heartbeat",
                  "flight mode",
                  "arming state",
                  "GPS lock",
                  "battery",
                  "link quality",
                  "mission status",
                  "failsafes",
                ].map((item) => (
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
          <SectionLabel detail="What we should complete before real airframe integration">
            Operator runway
          </SectionLabel>
          <div className="nexus-shell-utility-rail" aria-label="Operator runway">
            <div className="nexus-shell-utility-stat">
              <span className="nexus-shell-utility-stat__label">Before hardware</span>
              <span className="nexus-shell-utility-stat__value">Sim + replay</span>
              <p className="nexus-shell-utility-stat__note">
                Vehicle Lab should be useful with simulated flight data before
                the F450 arrives.
              </p>
            </div>
            <div className="nexus-shell-utility-stat">
              <span className="nexus-shell-utility-stat__label">First benching</span>
              <span className="nexus-shell-utility-stat__value">Props off</span>
              <p className="nexus-shell-utility-stat__note">
                Power, RC, orientation, GPS, and failsafes get proven on the
                bench before any open-throttle testing.
              </p>
            </div>
            <div className="nexus-shell-utility-stat">
              <span className="nexus-shell-utility-stat__label">First flights</span>
              <span className="nexus-shell-utility-stat__value">Assist mode</span>
              <p className="nexus-shell-utility-stat__note">
                Early sorties should produce logs and confidence, not autonomy
                theater.
              </p>
            </div>
            <div className="nexus-shell-utility-stat">
              <span className="nexus-shell-utility-stat__label">Later expansion</span>
              <span className="nexus-shell-utility-stat__value">Lidar later</span>
              <p className="nexus-shell-utility-stat__note">
                Mapping and obstacle experiments come only after the base
                airframe and telemetry path are boringly stable.
              </p>
            </div>
          </div>
        </ShellPanel>
      </ShellStack>
    </ShellPage>
  );
}
