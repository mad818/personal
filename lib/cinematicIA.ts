import type { SurfaceMotionSurface } from "@/lib/surfaceMotion";

export const CINEMATIC_IA_VERSION = "cinematic-ia-v1";

export type CinematicIAHierarchy = "lead-support-continuity";

export type CinematicIAPosture =
  | "ga-primary"
  | "supported"
  | "internal"
  | "fallback";

export interface CinematicIASurfaceContract {
  surface: SurfaceMotionSurface;
  posture: CinematicIAPosture;
  routePrefixes: string[];
  hierarchy: CinematicIAHierarchy;
  shellContract: string;
  controlContract: string;
  stateContract: string;
  gracefulDegradation: string;
  visualGuardrail: string;
}

export const GA_CINEMATIC_SURFACES: SurfaceMotionSurface[] = [
  "hq",
  "command",
  "intel",
  "alpha",
  "cyber",
  "recon",
  "vault",
  "resources",
];

const CINEMATIC_IA_SURFACES: Record<
  SurfaceMotionSurface,
  CinematicIASurfaceContract
> = {
  default: {
    surface: "default",
    posture: "fallback",
    routePrefixes: ["/"],
    hierarchy: "lead-support-continuity",
    shellContract:
      "Fallback routes inherit the same root chrome, safe spacing, and inert background layers.",
    controlContract:
      "Shared buttons, tabs, toasts, overlays, and state surfaces use shell primitives.",
    stateContract:
      "Empty and loading states remain compact, readable, and motion-safe.",
    gracefulDegradation:
      "Unknown surfaces fail into static shell chrome without hiding primary content.",
    visualGuardrail:
      "Do not introduce route-local chrome that competes with the global top rail.",
  },
  hq: {
    surface: "hq",
    posture: "ga-primary",
    routePrefixes: ["/hq", "/home"],
    hierarchy: "lead-support-continuity",
    shellContract:
      "HQ owns the flagship stage while preserving command input, chronicle focus, and fallback room access.",
    controlContract:
      "Command controls, room toggles, and game HUD actions stay keyboard-safe and non-overlapping.",
    stateContract:
      "Hydration, auth, reduced motion, and room/game states render without shell drift.",
    gracefulDegradation:
      "If optional runtime/game layers fail, the command composer and fallback shell remain available.",
    visualGuardrail:
      "HQ can be bolder than the rest of the app, but must not clip, overlap, or bury the command input.",
  },
  command: {
    surface: "command",
    posture: "ga-primary",
    routePrefixes: ["/command"],
    hierarchy: "lead-support-continuity",
    shellContract:
      "COMMAND opens as an operational brief with compact support posture and disclosure-first deep modules.",
    controlContract:
      "Dispatch, provider, runtime, and memory controls use shared shell buttons and segmented tabs.",
    stateContract:
      "Provider and runtime loading, fallback, and empty states are shown as compact callouts.",
    gracefulDegradation:
      "Optional provider failures degrade into local/free-first status without blocking dispatch awareness.",
    visualGuardrail:
      "Support telemetry must not dominate the first workplane unless a focused session explicitly asks for it.",
  },
  intel: {
    surface: "intel",
    posture: "ga-primary",
    routePrefixes: ["/intel"],
    hierarchy: "lead-support-continuity",
    shellContract:
      "INTEL keeps topic, world, and evidence panes in one signal-sweep hierarchy.",
    controlContract:
      "Focus tabs and topic filters use shared compact shell controls.",
    stateContract:
      "World-risk and article loading states use standardized shell skeletons and callouts.",
    gracefulDegradation:
      "RSS/GDELT/world-risk fallback data remains visible when premium or optional sources are absent.",
    visualGuardrail:
      "Evidence panes should feel like one sweep, not isolated feed widgets.",
  },
  alpha: {
    surface: "alpha",
    posture: "ga-primary",
    routePrefixes: ["/alpha"],
    hierarchy: "lead-support-continuity",
    shellContract:
      "ALPHA frames market review, scanner, forecast, and signal surfaces as one decision plane.",
    controlContract:
      "Market tabs, watchlist actions, and forecast controls use consistent shell affordances.",
    stateContract:
      "Market-data loading and unavailable states stay compact and explain free-first posture.",
    gracefulDegradation:
      "Free market sources remain first-class, with no hidden paid dependency requirement.",
    visualGuardrail:
      "Signal emphasis should clarify decision posture without implying autonomous trading.",
  },
  cyber: {
    surface: "cyber",
    posture: "ga-primary",
    routePrefixes: ["/cyber"],
    hierarchy: "lead-support-continuity",
    shellContract:
      "CYBER presents triage, severity, vulnerability review, and exposure review as one containment picture.",
    controlContract:
      "Filters, repair-lane actions, and review controls use the shared hardened button language.",
    stateContract:
      "Threat-feed loading, empty, and degraded states remain advisory and readable.",
    gracefulDegradation:
      "Passive/local advisory flows stay useful when external threat feeds are thin or unavailable.",
    visualGuardrail:
      "Do not widen defensive posture into exploit automation or alarm-heavy dashboards.",
  },
  recon: {
    surface: "recon",
    posture: "ga-primary",
    routePrefixes: ["/recon"],
    hierarchy: "lead-support-continuity",
    shellContract:
      "RECON keeps OSINT, repo intel, compare, and assimilation lanes inside one collection sweep.",
    controlContract:
      "Lookup, compare, and casefile actions use shared shell controls and disclosure-first support rails.",
    stateContract:
      "Public-source loading and no-result states stay bounded and operator-readable.",
    gracefulDegradation:
      "Public metadata-only paths stay useful without tokens, private repo access, or background scanning.",
    visualGuardrail:
      "Collection posture remains passive-first and evidence-led.",
  },
  vault: {
    surface: "vault",
    posture: "ga-primary",
    routePrefixes: ["/vault"],
    hierarchy: "lead-support-continuity",
    shellContract:
      "VAULT keeps intake, graph, compiled pages, stewardship, and export as one archive lattice.",
    controlContract:
      "Graph, archive, and exact-reopen controls use shared shell buttons and compact segmented controls.",
    stateContract:
      "Empty archive, graph loading, and compiled-page states use shell state primitives.",
    gracefulDegradation:
      "Local-first memory and exact reopen remain available when optional providers are absent.",
    visualGuardrail:
      "Archive support rails must not bury the primary memory workplane.",
  },
  resources: {
    surface: "resources",
    posture: "ga-primary",
    routePrefixes: ["/resources"],
    hierarchy: "lead-support-continuity",
    shellContract:
      "RESOURCES keeps field manual, impact, wins, specs, and study lanes inside one reference lattice.",
    controlContract:
      "Workbench tabs, disclosure actions, and external-use helpers use shared compact controls.",
    stateContract:
      "Reference loading, empty, and helper states use standardized shell callouts.",
    gracefulDegradation:
      "Local docs and free reference material remain primary without external services.",
    visualGuardrail:
      "Resources should stay a native command lane, not a loose documentation portal.",
  },
  vehicle: {
    surface: "vehicle",
    posture: "supported",
    routePrefixes: ["/vehicle", "/internal/vehicle"],
    hierarchy: "lead-support-continuity",
    shellContract:
      "VEHICLE inherits the cinematic shell while staying clearly experimental and non-flight-critical.",
    controlContract:
      "Readiness and artifact controls use shared shell affordances.",
    stateContract:
      "Connector and artifact states stay compact and evidence-led.",
    gracefulDegradation:
      "Simulated and checklist-only flows remain useful without hardware.",
    visualGuardrail:
      "Never imply flight-critical authority or autonomous vehicle control.",
  },
  security: {
    surface: "security",
    posture: "supported",
    routePrefixes: ["/security"],
    hierarchy: "lead-support-continuity",
    shellContract:
      "SECURITY keeps trust posture, AI hardening, physical monitoring, and doctrine in one control surface.",
    controlContract:
      "Trust rail, posture controls, and mode tabs use shared shell affordances.",
    stateContract:
      "Readiness, diagnostics, and protected-action states use compact shell callouts.",
    gracefulDegradation:
      "Local policy evidence remains visible even when optional integrations are offline.",
    visualGuardrail:
      "Trust evidence should calm decision-making, not become alarm chrome.",
  },
  skills: {
    surface: "skills",
    posture: "supported",
    routePrefixes: ["/skills"],
    hierarchy: "lead-support-continuity",
    shellContract:
      "SKILLS keeps workflow forge, labs, and capability packs in one governed forge plane.",
    controlContract:
      "Pack actions and governance controls use shared shell primitives.",
    stateContract:
      "Pack readiness and scheduler states use compact shell callouts.",
    gracefulDegradation:
      "Workflow guidance remains local and review-first without external executors.",
    visualGuardrail:
      "Do not widen into an ungoverned marketplace or arbitrary execution console.",
  },
};

export function getCinematicIASurface(
  surface: SurfaceMotionSurface = "default",
): CinematicIASurfaceContract {
  return CINEMATIC_IA_SURFACES[surface] ?? CINEMATIC_IA_SURFACES.default;
}

export function getCinematicIASurfaceForPath(
  pathname: string | null | undefined,
): CinematicIASurfaceContract {
  const normalizedPath = pathname || "/";
  const matches = Object.values(CINEMATIC_IA_SURFACES)
    .filter((contract) =>
      contract.routePrefixes.some((prefix) =>
        prefix === "/"
          ? normalizedPath === "/"
          : normalizedPath === prefix || normalizedPath.startsWith(`${prefix}/`),
      ),
    )
    .sort((a, b) => b.routePrefixes[0].length - a.routePrefixes[0].length);

  return matches[0] ?? CINEMATIC_IA_SURFACES.default;
}

export function isGACinematicSurface(surface: SurfaceMotionSurface): boolean {
  return GA_CINEMATIC_SURFACES.includes(surface);
}

export function getCinematicIACompletionSummary() {
  const surfaces = GA_CINEMATIC_SURFACES.map((surface) =>
    getCinematicIASurface(surface),
  );

  return {
    version: CINEMATIC_IA_VERSION,
    hierarchy: "lead-support-continuity" as CinematicIAHierarchy,
    completedSurfaces: surfaces.map((surface) => surface.surface),
    shellContract:
      "One cinematic root, one route stage, one lead workplane, one support rail, one continuity strip.",
    stateContract:
      "Shared empty, loading, degraded, focus, and disclosure states across GA surfaces.",
    freeFirstContract:
      "GA routes remain useful with local/free data and explicit degradation when optional providers are absent.",
  };
}
