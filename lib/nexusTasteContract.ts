import type { SurfaceMotionSurface } from "@/lib/surfaceMotion";

export const NEXUS_TASTE_PROFILE = {
  designVariance: 7,
  motionIntensity: 6,
  visualDensity: 7,
} as const;

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
  visualThesis: "One authored operations plate with embedded rails and restrained motion.",
  workplaneLabel: "Primary workplane",
  supportLabel: "Support rail",
  continuityLabel: "Continuity strip",
  headerNote: "Cardless, embedded, command-first composition.",
  routeDirective: "Keep one dominant plane ahead of support chrome.",
};

const CONTRACT_REGISTRY: Record<SurfaceMotionSurface, NexusTasteSurfaceContract> = {
  default: DEFAULT_CONTRACT,
  hq: {
    surface: "hq",
    visualThesis: "A live 3D operating table framing the chronicle as the primary command plane.",
    workplaneLabel: "Chronicle workplane",
    supportLabel: "Mission rail",
    continuityLabel: "Command continuity",
    headerNote: "Poster-like command table with embedded support and trust rails.",
    routeDirective: "Keep the chronicle loudest and the room reactive, not ornamental.",
  },
  command: {
    surface: "command",
    visualThesis: "Operational pressure board with one active dispatch lane and compact control rails.",
    workplaneLabel: "Dispatch grid",
    supportLabel: "Control rail",
    continuityLabel: "Operations continuity",
    headerNote: "Typography-led control fascia over a dense execution plane.",
    routeDirective: "Make pressure, readiness, and action read in one glance.",
  },
  intel: {
    surface: "intel",
    visualThesis: "Signal-led investigation desk with one dominant evidence plane.",
    workplaneLabel: "Signal plane",
    supportLabel: "Evidence rail",
    continuityLabel: "Intel continuity",
    headerNote: "One evidence-led work plane with minimal decorative chrome.",
    routeDirective: "Lead with narrative signal and keep supporting telemetry quiet.",
  },
  alpha: {
    surface: "alpha",
    visualThesis: "Decision review table with compact thesis pressure and memory cues.",
    workplaneLabel: "Decision plane",
    supportLabel: "Review rail",
    continuityLabel: "Market continuity",
    headerNote: "Measured editorial density around one review-focused plane.",
    routeDirective: "Keep thesis and review posture ahead of instrumentation.",
  },
  cyber: {
    surface: "cyber",
    visualThesis: "Threat desk with one active containment lane and compact repair instrumentation.",
    workplaneLabel: "Containment plane",
    supportLabel: "Repair rail",
    continuityLabel: "Evidence continuity",
    headerNote: "Hard-edged threat picture with embedded trust and repair cues.",
    routeDirective: "Make evidence and repair louder than ambient threat theater.",
  },
  recon: {
    surface: "recon",
    visualThesis: "Collection sweep anchored by one active casefile plane and narrow pivots.",
    workplaneLabel: "Collection plane",
    supportLabel: "Pivot rail",
    continuityLabel: "Case continuity",
    headerNote: "Collection-led structure with route-specific sweep overlays and exact pivots.",
    routeDirective: "Lead with the active case and keep pivots close at hand.",
  },
  vault: {
    surface: "vault",
    visualThesis: "Archive lattice with one memory plane, one relation rail, and exact continuity.",
    workplaneLabel: "Archive plane",
    supportLabel: "Steward rail",
    continuityLabel: "Memory continuity",
    headerNote: "Archive-first composition with embedded relation and export rails.",
    routeDirective: "Make recall, graph state, and export feel like one instrument.",
  },
  resources: {
    surface: "resources",
    visualThesis: "Reference lattice with one guided workbench plane per chamber.",
    workplaneLabel: "Reference plane",
    supportLabel: "Guide rail",
    continuityLabel: "Session continuity",
    headerNote: "Assistant-first references with one dominant lane and compact utilities.",
    routeDirective: "Keep the active workbench ahead of the broader reference stack.",
  },
  vehicle: {
    surface: "vehicle",
    visualThesis: "Systems readiness table with one launch plane and embedded telemetry rails.",
    workplaneLabel: "Readiness plane",
    supportLabel: "Systems rail",
    continuityLabel: "Flight continuity",
    headerNote: "Bench-first launch board that reads like hardware operations, not admin UI.",
    routeDirective: "Keep readiness and guardrails clearer than the instrumentation density.",
  },
  security: {
    surface: "security",
    visualThesis: "Hardening desk with one control plane and compact protected-action posture.",
    workplaneLabel: "Control plane",
    supportLabel: "Trust rail",
    continuityLabel: "Security continuity",
    headerNote: "Control-first security surface with embedded trust instrumentation.",
    routeDirective: "Lead with controls and protected-action posture, not box walls.",
  },
  skills: {
    surface: "skills",
    visualThesis: "Workflow lab with one forge plane, one system rail, and one knowledge continuity strip.",
    workplaneLabel: "Workflow plane",
    supportLabel: "Capability rail",
    continuityLabel: "Learning continuity",
    headerNote: "Capability lab tuned for dense workflows without dashboard-card repetition.",
    routeDirective: "Keep the active lab louder than the catalog around it.",
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
