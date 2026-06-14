import { DESIGN_MD_TASTE_PROFILE } from "@/lib/generated/designMdRuntime";
import type { SurfaceMotionSurface } from "@/lib/surfaceMotion";

export const NEXUS_TASTE_PROFILE = DESIGN_MD_TASTE_PROFILE;

export type NexusTasteSurfaceContract = {
  surface: SurfaceMotionSurface;
  visualThesis: string;
  workplaneLabel: string;
  supportLabel: string;
  continuityLabel: string;
  headerNote: string;
  routeDirective: string;
};

const DEFAULT_CONTRACT: NexusTasteSurfaceContract = {
  surface: "default",
  visualThesis: "One cinematic command plane with a dark holo plate and restrained support rails.",
  workplaneLabel: "Workplane",
  supportLabel: "Rail",
  continuityLabel: "Continuity",
  headerNote: "Dark fascia. One loud plane.",
  routeDirective: "Lead with the workplane. Keep support quiet.",
};

const CONTRACT_REGISTRY: Record<SurfaceMotionSurface, NexusTasteSurfaceContract> = {
  default: DEFAULT_CONTRACT,
  hq: {
    surface: "hq",
    visualThesis: "A dark command table where the chronicle stays primary and the room behaves like instrumentation.",
    workplaneLabel: "Chronicle",
    supportLabel: "Tactical rail",
    continuityLabel: "Command band",
    headerNote: "Command table first. Rail second.",
    routeDirective: "Keep the chronicle loudest and the room useful.",
  },
  command: {
    surface: "command",
    visualThesis: "An execution board with one hot dispatch lane and one compact control rail.",
    workplaneLabel: "Dispatch",
    supportLabel: "Control rail",
    continuityLabel: "Ops band",
    headerNote: "Thin fascia over one live grid.",
    routeDirective: "Make pressure and action readable at a glance.",
  },
  intel: {
    surface: "intel",
    visualThesis: "A signal-led desk with one dominant evidence plane and quiet telemetry.",
    workplaneLabel: "Signal plane",
    supportLabel: "Evidence rail",
    continuityLabel: "Intel band",
    headerNote: "Evidence first. Chrome second.",
    routeDirective: "Lead with signal and suppress noise.",
  },
  alpha: {
    surface: "alpha",
    visualThesis: "A decision desk with thesis pressure, market memory, and restrained telemetry.",
    workplaneLabel: "Decision plane",
    supportLabel: "Review rail",
    continuityLabel: "Market band",
    headerNote: "Review surface over market noise.",
    routeDirective: "Keep thesis and posture ahead of instruments.",
  },
  cyber: {
    surface: "cyber",
    visualThesis: "A threat desk with one containment lane and one repair rail.",
    workplaneLabel: "Containment",
    supportLabel: "Repair rail",
    continuityLabel: "Evidence band",
    headerNote: "Threat picture without theater.",
    routeDirective: "Make evidence and repair louder than mood.",
  },
  recon: {
    surface: "recon",
    visualThesis: "A collection sweep anchored by one case plane and compact pivots.",
    workplaneLabel: "Case plane",
    supportLabel: "Pivot rail",
    continuityLabel: "Case band",
    headerNote: "Collection-led with exact pivots.",
    routeDirective: "Keep the active case in front.",
  },
  vault: {
    surface: "vault",
    visualThesis: "An archive lattice with one memory plane and one relation rail.",
    workplaneLabel: "Archive plane",
    supportLabel: "Steward rail",
    continuityLabel: "Memory band",
    headerNote: "Archive-first with exact recall.",
    routeDirective: "Make recall and graph state feel like one instrument.",
  },
  resources: {
    surface: "resources",
    visualThesis: "A reference lattice with one guided workbench plane per chamber.",
    workplaneLabel: "Workbench",
    supportLabel: "Guide rail",
    continuityLabel: "Session band",
    headerNote: "Workbench first. Library second.",
    routeDirective: "Keep the active tool louder than the stack.",
  },
  vehicle: {
    surface: "vehicle",
    visualThesis: "A systems table with one launch plane and embedded telemetry rails.",
    workplaneLabel: "Launch plane",
    supportLabel: "Systems rail",
    continuityLabel: "Flight band",
    headerNote: "Hardware desk, not admin chrome.",
    routeDirective: "Keep readiness clearer than telemetry.",
  },
  iot: {
    surface: "iot",
    visualThesis: "A sensor desk with one device plane and one automation rail.",
    workplaneLabel: "Sensor plane",
    supportLabel: "Automation rail",
    continuityLabel: "Device band",
    headerNote: "Device posture, not generic admin.",
    routeDirective: "Keep live sensor posture clearer than device sprawl.",
  },
  security: {
    surface: "security",
    visualThesis: "A hardening desk with one control plane and one embedded trust rail.",
    workplaneLabel: "Control plane",
    supportLabel: "Trust rail",
    continuityLabel: "Security band",
    headerNote: "Controls first. Trust inline.",
    routeDirective: "Lead with controls and protected posture.",
  },
  skills: {
    surface: "skills",
    visualThesis: "A workflow lab with one forge plane and one capability rail.",
    workplaneLabel: "Forge plane",
    supportLabel: "Capability rail",
    continuityLabel: "Learning band",
    headerNote: "Forge first. Catalog quiet.",
    routeDirective: "Keep the active lab louder than the catalog.",
  },
};

export function getNexusTasteContract(
  surface: SurfaceMotionSurface,
): NexusTasteSurfaceContract {
  return CONTRACT_REGISTRY[surface] ?? DEFAULT_CONTRACT;
}

export function formatNexusTasteProfile() {
  const { designVariance, motionIntensity, visualDensity } = NEXUS_TASTE_PROFILE;
  return `V${designVariance} / M${motionIntensity} / D${visualDensity}`;
}
