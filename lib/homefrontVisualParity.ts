export type HomefrontVisualSurfaceId =
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
  | "vehicle"
  | "iot"
  | "signals"
  | "ops";

export type HomefrontVisualRole =
  | "hq-chrome"
  | "command-room"
  | "signal-room"
  | "market-room"
  | "risk-room"
  | "evidence-room"
  | "archive-room"
  | "field-manual"
  | "control-room"
  | "forge-room"
  | "vehicle-room"
  | "automation-room"
  | "watch-room";

export type HomefrontVisualMediaMode =
  | "guardian-video"
  | "guardian-image"
  | "route-plate"
  | "data-grid";

export type HomefrontVisualSupportDensity = "compact" | "balanced" | "deep";

export interface HomefrontInteriorPolish {
  leadIntent: string;
  staleInfoPolicy: string;
  mediaMoment: string;
  activeStateLabel: string;
  supportDensity: HomefrontVisualSupportDensity;
}

export interface HomefrontVisualSurfaceSpec {
  surfaceId: HomefrontVisualSurfaceId;
  visualRole: HomefrontVisualRole;
  mediaMode: HomefrontVisualMediaMode;
  primaryActionLabel: string;
  interiorPolish?: HomefrontInteriorPolish;
  workplaneSummary?: {
    primaryQuestion: string;
    nextBestAction: string;
    actionLabel: string;
    actionHref: string;
    proofLine: string;
  };
  proofChips: string[];
  excludedSelectors: string[];
}

const NO_EXCLUDED_SELECTORS: string[] = [];

export const HOMEFRONT_VISUAL_SURFACE_SPECS: Record<
  HomefrontVisualSurfaceId,
  HomefrontVisualSurfaceSpec
> = {
  hq: {
    surfaceId: "hq",
    visualRole: "hq-chrome",
    mediaMode: "guardian-video",
    primaryActionLabel: "Open chronicle",
    interiorPolish: {
      leadIntent:
        "Keep command chrome premium while the operational workspace stays legible.",
      staleInfoPolicy:
        "Show assistant readiness and shell posture without obscuring the active command workspace.",
      mediaMoment:
        "Guardian media stays in HQ chrome and yields to live operator state.",
      activeStateLabel: "HQ chrome active",
      supportDensity: "balanced",
    },
    proofChips: ["assistant ready", "command workspace", "local session"],
    excludedSelectors: NO_EXCLUDED_SELECTORS,
  },
  command: {
    surfaceId: "command",
    visualRole: "command-room",
    mediaMode: "route-plate",
    primaryActionLabel: "Open runtime focus",
    interiorPolish: {
      leadIntent: "Put provider, runtime, and agent posture before dispatch.",
      staleInfoPolicy:
        "Collapse repeated readiness copy into posture chips, proof, and one recovery action.",
      mediaMoment:
        "Route plate behaves like a live runtime instrument, not a static dashboard card.",
      activeStateLabel: "Command posture active",
      supportDensity: "compact",
    },
    workplaneSummary: {
      primaryQuestion: "What needs operator pressure right now?",
      nextBestAction:
        "Start with provider health before dispatch, runtime, or agent work.",
      actionLabel: "Open provider health",
      actionHref: "/command?focus=provider-health",
      proofLine:
        "Provider health, agent health, and runtime efficiency stay visible before execution.",
    },
    proofChips: ["provider health", "agent health", "runtime efficiency"],
    excludedSelectors: NO_EXCLUDED_SELECTORS,
  },
  intel: {
    surfaceId: "intel",
    visualRole: "signal-room",
    mediaMode: "route-plate",
    primaryActionLabel: "Open sweeps",
    interiorPolish: {
      leadIntent:
        "Lead with source freshness and world posture before feed volume.",
      staleInfoPolicy:
        "Demote duplicate feed explanations behind proof, freshness, and route context.",
      mediaMoment:
        "Signal lanes should feel watched and current without becoming noisy.",
      activeStateLabel: "Intel source lane active",
      supportDensity: "compact",
    },
    workplaneSummary: {
      primaryQuestion: "Which signal changed enough to matter?",
      nextBestAction:
        "Open world posture and read source freshness before acting.",
      actionLabel: "Open world posture",
      actionHref: "/intel?focus=intel-world",
      proofLine:
        "Source proof, freshness, and world posture stay ahead of interpretation.",
    },
    proofChips: ["source proof", "freshness", "world posture"],
    excludedSelectors: NO_EXCLUDED_SELECTORS,
  },
  alpha: {
    surfaceId: "alpha",
    visualRole: "market-room",
    mediaMode: "route-plate",
    primaryActionLabel: "Open scanner",
    interiorPolish: {
      leadIntent:
        "Connect scanner, tape, and sizing into one advisory decision flow.",
      staleInfoPolicy:
        "Keep market utility dense, but move repeated thesis copy below live proof.",
      mediaMoment:
        "Market panels read like premium workplanes with advisory posture visible.",
      activeStateLabel: "Alpha scanner active",
      supportDensity: "balanced",
    },
    workplaneSummary: {
      primaryQuestion: "Which market move deserves review?",
      nextBestAction:
        "Open the momentum scanner before thesis or watchlist work.",
      actionLabel: "Open momentum scanner",
      actionHref: "/alpha?focus=alpha-scanner",
      proofLine:
        "Watchlist, signals, and sizing cues stay visible without autonomous trading.",
    },
    proofChips: ["watchlist", "signals", "position sizing"],
    excludedSelectors: NO_EXCLUDED_SELECTORS,
  },
  cyber: {
    surfaceId: "cyber",
    visualRole: "risk-room",
    mediaMode: "route-plate",
    primaryActionLabel: "Open triage",
    interiorPolish: {
      leadIntent:
        "Keep risk matrix and review gates ahead of raw threat volume.",
      staleInfoPolicy:
        "Reduce raw-feed dominance; show severity, gate, and allowed next action first.",
      mediaMoment:
        "Risk visuals should feel controlled, review-first, and passive by default.",
      activeStateLabel: "Cyber review gate active",
      supportDensity: "compact",
    },
    workplaneSummary: {
      primaryQuestion: "Which risk should be triaged first?",
      nextBestAction: "Open the severity matrix and keep review gates in view.",
      actionLabel: "Open severity matrix",
      actionHref: "/cyber?focus=cyber-matrix",
      proofLine:
        "CVE posture, review gates, and compliance notes stay advisory-first.",
    },
    proofChips: ["CVE posture", "review gates", "drone compliance"],
    excludedSelectors: NO_EXCLUDED_SELECTORS,
  },
  recon: {
    surfaceId: "recon",
    visualRole: "evidence-room",
    mediaMode: "route-plate",
    primaryActionLabel: "Open OSINT",
    interiorPolish: {
      leadIntent:
        "Start with passive evidence and source posture before tooling.",
      staleInfoPolicy:
        "Keep risky collection language blocked behind passive-first proof and operator review.",
      mediaMoment: "Evidence lanes should feel precise, quiet, and bounded.",
      activeStateLabel: "Recon evidence active",
      supportDensity: "compact",
    },
    workplaneSummary: {
      primaryQuestion: "What evidence can be reviewed passively?",
      nextBestAction:
        "Open repo intelligence before binary, exposure, or case work.",
      actionLabel: "Open repo intelligence",
      actionHref: "/recon?focus=recon-repo-intel",
      proofLine:
        "Passive-first evidence and source boundaries stay visible before escalation.",
    },
    proofChips: ["passive-first", "case evidence", "repo exposure"],
    excludedSelectors: NO_EXCLUDED_SELECTORS,
  },
  vault: {
    surfaceId: "vault",
    visualRole: "archive-room",
    mediaMode: "route-plate",
    primaryActionLabel: "Open stewardship",
    interiorPolish: {
      leadIntent:
        "Prioritize compiled pages and continuity proof over archive sprawl.",
      staleInfoPolicy:
        "Turn archive-wall copy into recovery state, durable proof, and reopen links.",
      mediaMoment:
        "The archive should feel like a continuity room, not a storage list.",
      activeStateLabel: "Vault continuity active",
      supportDensity: "balanced",
    },
    workplaneSummary: {
      primaryQuestion: "What memory should become durable proof?",
      nextBestAction: "Open compiled pages before graph repair or export work.",
      actionLabel: "Open compiled pages",
      actionHref: "/vault?focus=vault-compiled-pages",
      proofLine:
        "Compiled pages, memory graph, and continuity state stay recoverable.",
    },
    proofChips: ["memory graph", "compiled pages", "continuity"],
    excludedSelectors: NO_EXCLUDED_SELECTORS,
  },
  resources: {
    surfaceId: "resources",
    visualRole: "field-manual",
    mediaMode: "route-plate",
    primaryActionLabel: "Open finder",
    interiorPolish: {
      leadIntent:
        "Make source intelligence, playbooks, and exact-session utilities the front door.",
      staleInfoPolicy:
        "Govern outside ideas with status, fit, rejection reason, and next action before expansion.",
      mediaMoment:
        "Resource surfaces should feel like a field manual with live intake proof.",
      activeStateLabel: "Resources source lane active",
      supportDensity: "balanced",
    },
    workplaneSummary: {
      primaryQuestion: "Which outside idea is safe to absorb?",
      nextBestAction:
        "Open source intelligence and map the idea before implementation.",
      actionLabel: "Open source intelligence",
      actionHref: "/resources?view=sources",
      proofLine:
        "Source intake, playbooks, and surface audit keep outside ideas governed.",
    },
    proofChips: ["playbooks", "surface audit", "source intake"],
    excludedSelectors: NO_EXCLUDED_SELECTORS,
  },
  security: {
    surfaceId: "security",
    visualRole: "control-room",
    mediaMode: "guardian-image",
    primaryActionLabel: "Open controls",
    interiorPolish: {
      leadIntent:
        "Expose trust, controls, and AI surfaces as one review-first control plane.",
      staleInfoPolicy:
        "Keep policy explanation short and keep blocked reasons visible.",
      mediaMoment:
        "Guardian imagery anchors the control posture without implying automation approval.",
      activeStateLabel: "Security controls active",
      supportDensity: "compact",
    },
    proofChips: ["trust posture", "AI surface", "physical ops"],
    excludedSelectors: NO_EXCLUDED_SELECTORS,
  },
  skills: {
    surfaceId: "skills",
    visualRole: "forge-room",
    mediaMode: "data-grid",
    primaryActionLabel: "Open Workflow Forge",
    interiorPolish: {
      leadIntent:
        "Make skill invocation, workflow forge, and library status easy to inspect.",
      staleInfoPolicy:
        "Keep forge copy compact; show invocation visibility and review gates first.",
      mediaMoment:
        "Data-grid treatment keeps workflows operational instead of decorative.",
      activeStateLabel: "Skills forge active",
      supportDensity: "compact",
    },
    proofChips: ["workflow forge", "blacksite isolated", "library"],
    excludedSelectors: NO_EXCLUDED_SELECTORS,
  },
  vehicle: {
    surfaceId: "vehicle",
    visualRole: "vehicle-room",
    mediaMode: "guardian-video",
    primaryActionLabel: "Open launchpad",
    interiorPolish: {
      leadIntent:
        "Show simulated telemetry and passive bridge readiness before hardware ambition.",
      staleInfoPolicy:
        "Keep every vehicle panel clear that Nexus is not flight-critical control.",
      mediaMoment:
        "Capability video supports patrol readiness while actions remain review-only.",
      activeStateLabel: "Vehicle readiness active",
      supportDensity: "balanced",
    },
    proofChips: [
      "simulation-first",
      "passive bridge",
      "no flight-critical control",
    ],
    excludedSelectors: NO_EXCLUDED_SELECTORS,
  },
  iot: {
    surfaceId: "iot",
    visualRole: "automation-room",
    mediaMode: "guardian-image",
    primaryActionLabel: "Open device matrix",
    interiorPolish: {
      leadIntent:
        "Keep device posture, sensor health, and automation review in the same lane.",
      staleInfoPolicy:
        "Move generic smart-home copy behind sensor proof and review state.",
      mediaMoment:
        "Guardian image anchors connected-home context without remote dependency.",
      activeStateLabel: "IoT sensor lane active",
      supportDensity: "compact",
    },
    proofChips: ["sensor grid", "MQTT posture", "automation review"],
    excludedSelectors: NO_EXCLUDED_SELECTORS,
  },
  signals: {
    surfaceId: "signals",
    visualRole: "watch-room",
    mediaMode: "route-plate",
    primaryActionLabel: "Open INTEL",
    interiorPolish: {
      leadIntent:
        "Treat signals as an INTEL watch lane with source proof first.",
      staleInfoPolicy:
        "Redirect stale signal copy into the INTEL route context.",
      mediaMoment:
        "Route plate reinforces watch posture while canonical work lives in INTEL.",
      activeStateLabel: "Signals redirected",
      supportDensity: "compact",
    },
    proofChips: ["redirected to INTEL", "source proof", "freshness"],
    excludedSelectors: NO_EXCLUDED_SELECTORS,
  },
  ops: {
    surfaceId: "ops",
    visualRole: "command-room",
    mediaMode: "route-plate",
    primaryActionLabel: "Open INTEL",
    interiorPolish: {
      leadIntent:
        "Keep operations posture tied to the canonical INTEL workplane.",
      staleInfoPolicy:
        "Avoid duplicate ops walls; point action back to the live route.",
      mediaMoment:
        "Route plate provides continuity for redirected operations context.",
      activeStateLabel: "Ops redirected",
      supportDensity: "compact",
    },
    proofChips: ["redirected to INTEL", "ops map", "world posture"],
    excludedSelectors: NO_EXCLUDED_SELECTORS,
  },
};

export function isHomefrontVisualSurfaceId(
  value: string | null | undefined,
): value is HomefrontVisualSurfaceId {
  if (!value) return false;
  return value in HOMEFRONT_VISUAL_SURFACE_SPECS;
}

export function getHomefrontVisualSurfaceSpec(
  surfaceId: string | null | undefined,
): HomefrontVisualSurfaceSpec | null {
  if (!isHomefrontVisualSurfaceId(surfaceId)) return null;
  return HOMEFRONT_VISUAL_SURFACE_SPECS[surfaceId];
}

export function resolveHomefrontVisualSurfaceSpec(
  surfaceId: string | null | undefined,
): HomefrontVisualSurfaceSpec {
  return (
    getHomefrontVisualSurfaceSpec(surfaceId) ??
    HOMEFRONT_VISUAL_SURFACE_SPECS.hq
  );
}
