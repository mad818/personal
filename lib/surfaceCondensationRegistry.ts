import type { AssistantFirstSurfaceId } from "@/lib/surfaceRedesignRegistry";

export type SurfaceChamberView = "lead" | "support" | "continuity";

export interface SurfaceRouteCondensationSpec {
  surfaceId: AssistantFirstSurfaceId;
  leadModuleId: string;
  supportModuleId?: string;
  continuityModuleId?: string;
  disclosurePriority: string[];
  groupedViewAliases?: Record<string, string>;
}

export type AlphaChamberId =
  | "watchlist"
  | "signals"
  | "scanner"
  | "sizer"
  | "tape";

export type CyberChamberId =
  | "triage"
  | "review"
  | "matrix"
  | "evidence"
  | "drone";

export type VaultChamberId = "archive" | "relations" | "publish";

export type ResourcesChamberId =
  | "finder"
  | "start"
  | "study"
  | "system"
  | "launch"
  | "utilities";

export const SURFACE_CONDENSATION_REGISTRY: Record<
  AssistantFirstSurfaceId,
  SurfaceRouteCondensationSpec
> = {
  hq: {
    surfaceId: "hq",
    leadModuleId: "command-chronicle",
    supportModuleId: "next-move",
    continuityModuleId: "runtime-continuity",
    disclosurePriority: [
      "command-chronicle",
      "mission-brief",
      "next-move",
      "runtime-continuity",
    ],
  },
  command: {
    surfaceId: "command",
    leadModuleId: "operational-brief",
    supportModuleId: "programs-workflows",
    continuityModuleId: "context-memory",
    disclosurePriority: [
      "operational-brief",
      "programs-workflows",
      "context-memory",
      "system-posture",
    ],
  },
  intel: {
    surfaceId: "intel",
    leadModuleId: "news-brief",
    supportModuleId: "theater-posture",
    continuityModuleId: "cross-domain-impact",
    disclosurePriority: [
      "news-brief",
      "theater-posture",
      "cross-domain-impact",
      "forecast-posture",
      "sweep-workbench",
    ],
  },
  alpha: {
    surfaceId: "alpha",
    leadModuleId: "market-tape",
    supportModuleId: "forecast-lab",
    continuityModuleId: "market-brief",
    disclosurePriority: [
      "market-tape",
      "forecast-lab",
      "setups",
      "risk-plan",
      "momentum",
      "market-brief",
    ],
    groupedViewAliases: {
      prices: "tape",
      charts: "tape",
    },
  },
  cyber: {
    surfaceId: "cyber",
    leadModuleId: "threat-brief",
    supportModuleId: "priority-grid",
    continuityModuleId: "evidence-feeds",
    disclosurePriority: [
      "threat-brief",
      "priority-grid",
      "evidence-feeds",
      "physical-ops",
    ],
    groupedViewAliases: {
      cves: "evidence",
      otx: "evidence",
      cisa: "evidence",
    },
  },
  recon: {
    surfaceId: "recon",
    leadModuleId: "collection-workbench",
    supportModuleId: "target-brief",
    continuityModuleId: "operator-safety",
    disclosurePriority: [
      "collection-workbench",
      "target-brief",
      "binary-analysis",
      "operator-safety",
    ],
  },
  vault: {
    surfaceId: "vault",
    leadModuleId: "archive-workbench",
    supportModuleId: "memory-brief",
    continuityModuleId: "durable-artifacts",
    disclosurePriority: [
      "archive-workbench",
      "relations",
      "durable-artifacts",
      "memory-brief",
    ],
    groupedViewAliases: {
      list: "archive",
      graph: "relations",
    },
  },
  resources: {
    surfaceId: "resources",
    leadModuleId: "find-right-lane",
    supportModuleId: "start-safely",
    continuityModuleId: "open-exact-session",
    disclosurePriority: [
      "find-right-lane",
      "start-safely",
      "understand-system",
      "open-exact-session",
      "supporting-utilities",
    ],
    groupedViewAliases: {
      manual: "start",
      playbooks: "start",
      specs: "start",
      surfaces: "system",
      system: "system",
      impact: "launch",
      "voice-lab": "launch",
      registry: "utilities",
      kits: "utilities",
    },
  },
};

const ALPHA_TAPE_VIEWS = new Set(["prices", "charts"]);
const CYBER_EVIDENCE_VIEWS = new Set(["cves", "otx", "cisa"]);
const VAULT_PUBLISH_VIEWS = new Set(["publish", "export", "kits", "registry"]);

export function getSurfaceCondensationSpec(surfaceId: AssistantFirstSurfaceId) {
  return SURFACE_CONDENSATION_REGISTRY[surfaceId];
}

export function resolveGroupedViewAlias(
  surfaceId: AssistantFirstSurfaceId,
  viewId?: string | null,
) {
  if (!viewId) return null;
  const spec = SURFACE_CONDENSATION_REGISTRY[surfaceId];
  return spec.groupedViewAliases?.[viewId] ?? viewId;
}

export function resolveAlphaChamber(view?: string | null): AlphaChamberId {
  if (!view) return "watchlist";
  if (ALPHA_TAPE_VIEWS.has(view)) return "tape";
  if (
    view === "watchlist" ||
    view === "signals" ||
    view === "scanner" ||
    view === "sizer"
  ) {
    return view;
  }
  return "watchlist";
}

export function resolveAlphaTapeView(view?: string | null): "prices" | "charts" {
  return view === "charts" ? "charts" : "prices";
}

export function resolveCyberChamber(view?: string | null): CyberChamberId {
  if (!view) return "triage";
  if (CYBER_EVIDENCE_VIEWS.has(view)) return "evidence";
  if (view === "triage" || view === "vuln-review" || view === "matrix" || view === "drone") {
    if (view === "vuln-review") return "review";
    return view;
  }
  return "triage";
}

export function resolveCyberEvidenceView(
  view?: string | null,
): "cves" | "otx" | "cisa" {
  if (view === "otx") return "otx";
  if (view === "cisa") return "cisa";
  return "cves";
}

export function resolveVaultChamber(view?: string | null): VaultChamberId {
  if (!view || view === "archive" || view === "list") return "archive";
  if (view === "relations" || view === "graph") return "relations";
  if (VAULT_PUBLISH_VIEWS.has(view)) return "publish";
  return "archive";
}

export function resolveResourcesChamber(view?: string | null): ResourcesChamberId {
  if (!view || view === "finder") return "finder";
  if (view === "study") return "study";
  if (view === "manual" || view === "playbooks" || view === "specs") {
    return "start";
  }
  if (view === "surfaces" || view === "system") {
    return "system";
  }
  if (view === "impact" || view === "voice-lab") {
    return "launch";
  }
  if (view === "registry" || view === "kits") {
    return "utilities";
  }
  return "finder";
}

export function resolveResourcesViewForChamber(
  chamber: ResourcesChamberId,
  currentView?: string | null,
) {
  if (chamber === "finder") return "finder" as const;
  if (chamber === "study") return "study" as const;
  if (chamber === "launch") {
    if (currentView === "voice-lab") return "voice-lab" as const;
    return "impact" as const;
  }
  if (chamber === "start") {
    if (
      currentView === "manual" ||
      currentView === "playbooks" ||
      currentView === "specs"
    ) {
      return currentView;
    }
    return "playbooks" as const;
  }
  if (chamber === "system") {
    if (currentView === "surfaces" || currentView === "system") {
      return currentView;
    }
    return "system" as const;
  }
  if (currentView === "registry" || currentView === "kits") {
    return currentView;
  }
  return "registry" as const;
}
