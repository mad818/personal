export type OpsLayoutSurface =
  | "hq"
  | "command"
  | "intel"
  | "alpha"
  | "cyber"
  | "recon"
  | "vault"
  | "resources"
  | "security"
  | "skills"
  | "vehicle";

export type OpsLayoutDescriptor = {
  surface: OpsLayoutSurface;
  workplaneClass: string;
  railClass: string;
  inspectorClass: string;
  continuityClass: string;
  stripLabel: string;
  trustLabel: string;
};

const OPS_LAYOUT_REGISTRY: Record<OpsLayoutSurface, OpsLayoutDescriptor> = {
  hq: {
    surface: "hq",
    workplaneClass: "nexus-ops-layout__workplane--hq",
    railClass: "nexus-ops-layout__rail--hq",
    inspectorClass: "nexus-ops-layout__inspector--hq",
    continuityClass: "nexus-ops-layout__continuity--hq",
    stripLabel: "Command table",
    trustLabel: "HQ trust rail",
  },
  command: {
    surface: "command",
    workplaneClass: "nexus-ops-layout__workplane--command",
    railClass: "nexus-ops-layout__rail--command",
    inspectorClass: "nexus-ops-layout__inspector--command",
    continuityClass: "nexus-ops-layout__continuity--command",
    stripLabel: "Operations grid",
    trustLabel: "Dispatch trust rail",
  },
  intel: {
    surface: "intel",
    workplaneClass: "nexus-ops-layout__workplane--intel",
    railClass: "nexus-ops-layout__rail--intel",
    inspectorClass: "nexus-ops-layout__inspector--intel",
    continuityClass: "nexus-ops-layout__continuity--intel",
    stripLabel: "Signal sweep",
    trustLabel: "Signal trust rail",
  },
  alpha: {
    surface: "alpha",
    workplaneClass: "nexus-ops-layout__workplane--alpha",
    railClass: "nexus-ops-layout__rail--alpha",
    inspectorClass: "nexus-ops-layout__inspector--alpha",
    continuityClass: "nexus-ops-layout__continuity--alpha",
    stripLabel: "Decision frame",
    trustLabel: "Market trust rail",
  },
  cyber: {
    surface: "cyber",
    workplaneClass: "nexus-ops-layout__workplane--cyber",
    railClass: "nexus-ops-layout__rail--cyber",
    inspectorClass: "nexus-ops-layout__inspector--cyber",
    continuityClass: "nexus-ops-layout__continuity--cyber",
    stripLabel: "Threat picture",
    trustLabel: "Containment trust rail",
  },
  recon: {
    surface: "recon",
    workplaneClass: "nexus-ops-layout__workplane--recon",
    railClass: "nexus-ops-layout__rail--recon",
    inspectorClass: "nexus-ops-layout__inspector--recon",
    continuityClass: "nexus-ops-layout__continuity--recon",
    stripLabel: "Collection sweep",
    trustLabel: "Collection trust rail",
  },
  vault: {
    surface: "vault",
    workplaneClass: "nexus-ops-layout__workplane--vault",
    railClass: "nexus-ops-layout__rail--vault",
    inspectorClass: "nexus-ops-layout__inspector--vault",
    continuityClass: "nexus-ops-layout__continuity--vault",
    stripLabel: "Archive lattice",
    trustLabel: "Archive trust rail",
  },
  resources: {
    surface: "resources",
    workplaneClass: "nexus-ops-layout__workplane--resources",
    railClass: "nexus-ops-layout__rail--resources",
    inspectorClass: "nexus-ops-layout__inspector--resources",
    continuityClass: "nexus-ops-layout__continuity--resources",
    stripLabel: "Reference lattice",
    trustLabel: "Field trust rail",
  },
  security: {
    surface: "security",
    workplaneClass: "nexus-ops-layout__workplane--security",
    railClass: "nexus-ops-layout__rail--security",
    inspectorClass: "nexus-ops-layout__inspector--security",
    continuityClass: "nexus-ops-layout__continuity--security",
    stripLabel: "Hardening plane",
    trustLabel: "Security trust rail",
  },
  skills: {
    surface: "skills",
    workplaneClass: "nexus-ops-layout__workplane--skills",
    railClass: "nexus-ops-layout__rail--skills",
    inspectorClass: "nexus-ops-layout__inspector--skills",
    continuityClass: "nexus-ops-layout__continuity--skills",
    stripLabel: "Workflow plane",
    trustLabel: "Capability trust rail",
  },
  vehicle: {
    surface: "vehicle",
    workplaneClass: "nexus-ops-layout__workplane--vehicle",
    railClass: "nexus-ops-layout__rail--vehicle",
    inspectorClass: "nexus-ops-layout__inspector--vehicle",
    continuityClass: "nexus-ops-layout__continuity--vehicle",
    stripLabel: "Readiness plane",
    trustLabel: "Systems trust rail",
  },
};

export function getOpsLayoutDescriptor(
  surface: OpsLayoutSurface,
): OpsLayoutDescriptor {
  return OPS_LAYOUT_REGISTRY[surface];
}
