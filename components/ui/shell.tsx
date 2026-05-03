"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import type {
  CSSProperties,
  PointerEvent as ReactPointerEvent,
  ReactNode,
} from "react";
import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import PageTransition from "@/components/ui/PageTransition";
import SpatialCommandStrip from "@/components/ui/SpatialCommandStrip";
import { getSurfaceBranding } from "@/lib/brand";
import { CINEMATIC_IA_VERSION, getCinematicIASurface } from "@/lib/cinematicIA";
import { getNexusTasteContract } from "@/lib/nexusTasteContract";
import { NEXUS_FREE_USE_LABEL } from "@/lib/productGuarantees";
import {
  resolveSurfaceAtmosphereSpec,
  resolveSurfaceSequencePreset,
  type SurfaceMotionSurface,
} from "@/lib/surfaceMotion";

type ShellWidth = "standard" | "wide" | "full";
type ShellSurface = SurfaceMotionSurface;
type ShellHeroDensity = "standard" | "compact";
type HomefrontLiveState = {
  runtimeStatus: "checking" | "online" | "degraded";
  runtimeAgeLabel: string;
  evalGrade: string;
  evalPosture: string;
  networkMode: string;
  lastCheckedLabel: string;
};
type HomefrontRouteState = {
  pathname: string | null;
  focus: string | null;
  view: string | null;
};
type HomefrontLiveSignalState = HomefrontLiveState["runtimeStatus"];

const SURFACE_ART: Record<
  ShellSurface,
  {
    plateSrc: string;
    platePosition: string;
    strap: string;
    caption: string;
    readouts: Array<{ label: string; value: string }>;
  }
> = {
  default: {
    plateSrc: "/theme/satops-command-plate.svg",
    platePosition: "50% 50%",
    strap: "Command picture",
    caption: "One live command plate.",
    readouts: [
      { label: "Window", value: "Live" },
      { label: "Posture", value: "Locked" },
      { label: "Trace", value: "Clean" },
    ],
  },
  hq: {
    plateSrc: "/theme/satops-hq-plate.svg",
    platePosition: "50% 50%",
    strap: "Mission plate",
    caption: "Chronicle-first command plate.",
    readouts: [
      { label: "Station", value: "JANSKY" },
      { label: "Track", value: "Command" },
      { label: "State", value: "Live" },
    ],
  },
  command: {
    plateSrc: "/theme/satops-command-plate.svg",
    platePosition: "50% 50%",
    strap: "Ops grid",
    caption: "Pressure and dispatch on one grid.",
    readouts: [
      { label: "Watch", value: "Pressure" },
      { label: "Risk", value: "Bounded" },
      { label: "Queue", value: "Ready" },
    ],
  },
  intel: {
    plateSrc: "/theme/satops-intel-plate.svg",
    platePosition: "50% 50%",
    strap: "Signal sweep",
    caption: "Evidence-led scan plate.",
    readouts: [
      { label: "Signal", value: "Wideband" },
      { label: "Sweep", value: "Queued" },
      { label: "Blend", value: "Intel" },
    ],
  },
  alpha: {
    plateSrc: "/theme/satops-alpha-plate.svg",
    platePosition: "50% 50%",
    strap: "Decision frame",
    caption: "Thesis and pressure in one frame.",
    readouts: [
      { label: "Review", value: "Market" },
      { label: "Bias", value: "Measured" },
      { label: "Recall", value: "Armed" },
    ],
  },
  cyber: {
    plateSrc: "/theme/satops-cyber-plate.svg",
    platePosition: "50% 50%",
    strap: "Threat mesh",
    caption: "Containment and repair in one picture.",
    readouts: [
      { label: "Threat", value: "Tracked" },
      { label: "Exposure", value: "Scoped" },
      { label: "Repair", value: "Ready" },
    ],
  },
  recon: {
    plateSrc: "/theme/satops-recon-plate.svg",
    platePosition: "50% 50%",
    strap: "Field sweep",
    caption: "Case and evidence in one sweep.",
    readouts: [
      { label: "Sweep", value: "OSINT" },
      { label: "Case", value: "Open" },
      { label: "Grid", value: "Triaged" },
    ],
  },
  vault: {
    plateSrc: "/theme/satops-vault-plate.svg",
    platePosition: "50% 50%",
    strap: "Archive lattice",
    caption: "Recall and graph in one lattice.",
    readouts: [
      { label: "Recall", value: "Exact" },
      { label: "Graph", value: "Pinned" },
      { label: "Weekly", value: "Filed" },
    ],
  },
  vehicle: {
    plateSrc: "/theme/satops-vehicle-plate.svg",
    platePosition: "50% 50%",
    strap: "Launch board",
    caption: "Readiness and launch on one board.",
    readouts: [
      { label: "Bridge", value: "Cold" },
      { label: "Check", value: "Ready" },
      { label: "Mission", value: "Prep" },
    ],
  },
  resources: {
    plateSrc: "/theme/satops-resources-plate.svg",
    platePosition: "50% 50%",
    strap: "Reference lattice",
    caption: "Playbooks and maps in one plane.",
    readouts: [
      { label: "Finder", value: "Indexed" },
      { label: "Manual", value: "Local" },
      { label: "Impact", value: "Mapped" },
    ],
  },
  security: {
    plateSrc: "/theme/satops-security-plate.svg",
    platePosition: "50% 50%",
    strap: "Control surface",
    caption: "Protected posture in one surface.",
    readouts: [
      { label: "Guard", value: "Tight" },
      { label: "Policy", value: "Visible" },
      { label: "Drill", value: "Ready" },
    ],
  },
  skills: {
    plateSrc: "/theme/satops-skills-plate.svg",
    platePosition: "50% 50%",
    strap: "Workflow forge",
    caption: "Capability and flow in one forge.",
    readouts: [
      { label: "Forge", value: "Warm" },
      { label: "Packs", value: "Governed" },
      { label: "Queue", value: "Open" },
    ],
  },
};

const SURFACE_LAYOUT: Record<
  ShellSurface,
  {
    canvasClass: string;
    stripLabel: string;
  }
> = {
  default: {
    canvasClass: "nexus-ops-canvas--balanced",
    stripLabel: "Operating picture",
  },
  hq: { canvasClass: "nexus-ops-canvas--hq", stripLabel: "Command table" },
  command: {
    canvasClass: "nexus-ops-canvas--command",
    stripLabel: "Operations grid",
  },
  intel: { canvasClass: "nexus-ops-canvas--intel", stripLabel: "Signal sweep" },
  alpha: {
    canvasClass: "nexus-ops-canvas--alpha",
    stripLabel: "Decision frame",
  },
  cyber: {
    canvasClass: "nexus-ops-canvas--cyber",
    stripLabel: "Threat picture",
  },
  recon: {
    canvasClass: "nexus-ops-canvas--recon",
    stripLabel: "Collection sweep",
  },
  vault: {
    canvasClass: "nexus-ops-canvas--vault",
    stripLabel: "Archive lattice",
  },
  vehicle: {
    canvasClass: "nexus-ops-canvas--vehicle",
    stripLabel: "Launch board",
  },
  resources: {
    canvasClass: "nexus-ops-canvas--resources",
    stripLabel: "Reference lattice",
  },
  security: {
    canvasClass: "nexus-ops-canvas--security",
    stripLabel: "Control surface",
  },
  skills: {
    canvasClass: "nexus-ops-canvas--skills",
    stripLabel: "Workflow forge",
  },
};

type HomefrontThresholdSpec = {
  title: string;
  body: string;
  signals: Array<{ label: string; value: string }>;
  proof: string[];
};

const HOMEFRONT_THRESHOLD: Partial<
  Record<ShellSurface, HomefrontThresholdSpec>
> = {
  command: {
    title: "Mission queue in view",
    body: "Dispatch, health, and review gates stay visible before an agent run leaves your hands.",
    signals: [
      { label: "Dispatch", value: "Bounded" },
      { label: "Runtime", value: "Watched" },
      { label: "Review", value: "Required" },
    ],
    proof: [NEXUS_FREE_USE_LABEL, "Local queue", "Operator gate"],
  },
  intel: {
    title: "World picture staged",
    body: "Signals enter as evidence, not noise: topic heat, source posture, and narrative risk stay paired.",
    signals: [
      { label: "Sweep", value: "Evidence" },
      { label: "Sources", value: "Labeled" },
      { label: "Posture", value: "Current" },
    ],
    proof: [NEXUS_FREE_USE_LABEL, "Source trail", "Local notes"],
  },
  alpha: {
    title: "Decision frame ready",
    body: "Market context, thesis pressure, and recall prompts sit together before any move becomes action.",
    signals: [
      { label: "Thesis", value: "Framed" },
      { label: "Risk", value: "Measured" },
      { label: "Recall", value: "Armed" },
    ],
    proof: [NEXUS_FREE_USE_LABEL, "BYOK optional", "No app billing"],
  },
  cyber: {
    title: "Threat workbench armed",
    body: "Exposure, containment, and repair posture stay compact so security work starts from triage.",
    signals: [
      { label: "Exposure", value: "Scoped" },
      { label: "Policy", value: "Visible" },
      { label: "Repair", value: "Queued" },
    ],
    proof: [NEXUS_FREE_USE_LABEL, "Policy rail", "Silent failure"],
  },
  recon: {
    title: "Collection lane open",
    body: "Cases, lookups, and evidence bundles stay tied to the same local command surface.",
    signals: [
      { label: "Lookup", value: "Ready" },
      { label: "Case", value: "Open" },
      { label: "Evidence", value: "Bundled" },
    ],
    proof: [NEXUS_FREE_USE_LABEL, "Local casework", "Evidence-first"],
  },
  vault: {
    title: "Memory spine online",
    body: "Recall, compiled pages, and graph focus remain close to the work that created them.",
    signals: [
      { label: "Recall", value: "Exact" },
      { label: "Graph", value: "Pinned" },
      { label: "Pages", value: "Compiled" },
    ],
    proof: [NEXUS_FREE_USE_LABEL, "Local archive", "Operator recall"],
  },
  vehicle: {
    title: "Bench lane separated",
    body: "Future telemetry stays in preparation mode: simulated, passive, and never flight-critical.",
    signals: [
      { label: "Bridge", value: "Cold" },
      { label: "Replay", value: "Ready" },
      { label: "Failsafe", value: "Manual" },
    ],
    proof: [NEXUS_FREE_USE_LABEL, "Sim first", "Passive only"],
  },
  resources: {
    title: "Proof plane indexed",
    body: "Docs, plans, and massive-win tracking stay native to the command room instead of becoming a separate wiki.",
    signals: [
      { label: "Manual", value: "Local" },
      { label: "Impact", value: "Mapped" },
      { label: "Queue", value: "Visible" },
    ],
    proof: [NEXUS_FREE_USE_LABEL, "Route proof", "Local docs"],
  },
  security: {
    title: "Control surface visible",
    body: "Access posture, policy checks, and diagnostics stay readable before the next protected move.",
    signals: [
      { label: "Access", value: "Token" },
      { label: "Policy", value: "Tight" },
      { label: "Drill", value: "Ready" },
    ],
    proof: [NEXUS_FREE_USE_LABEL, "Token gate", "Route policy"],
  },
  skills: {
    title: "Workflow forge staged",
    body: "Capability packs, scheduler posture, and review state stay together while a workflow takes shape.",
    signals: [
      { label: "Forge", value: "Warm" },
      { label: "Review", value: "Gated" },
      { label: "Queue", value: "Open" },
    ],
    proof: [NEXUS_FREE_USE_LABEL, "Review first", "Local runs"],
  },
};

function resolveHomefrontThreshold(
  surface: ShellSurface,
  art: (typeof SURFACE_ART)[ShellSurface],
  branding: ReturnType<typeof getSurfaceBranding>,
): HomefrontThresholdSpec {
  return (
    HOMEFRONT_THRESHOLD[surface] ?? {
      title: `${art.strap} online`,
      body: `${branding.functionalLabel} keeps its live signals, protected access, and route proof in one operating view.`,
      signals: art.readouts,
      proof: [NEXUS_FREE_USE_LABEL, "Token-gated", "Route proof"],
    }
  );
}

function humanizeRouteToken(rawValue?: string | null) {
  const value = rawValue?.trim();
  if (!value) return "Route root";
  return value
    .replace(/^\/+/, "")
    .replace(/^hq-/, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatRuntimeAge(ageSeconds?: number | null) {
  if (typeof ageSeconds !== "number" || !Number.isFinite(ageSeconds)) {
    return "Checking";
  }
  if (ageSeconds < 60) return `${Math.max(0, Math.round(ageSeconds))}s`;
  const ageMinutes = Math.floor(ageSeconds / 60);
  if (ageMinutes < 60) return `${ageMinutes}m`;
  return `${Math.floor(ageMinutes / 60)}h`;
}

function readStatusString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

const initialHomefrontLiveState: HomefrontLiveState = {
  runtimeStatus: "checking",
  runtimeAgeLabel: "Checking",
  evalGrade: "Checking",
  evalPosture: "Readiness pending",
  networkMode: "Local",
  lastCheckedLabel: "Mounting",
};

const homefrontLiveMetaStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "7px",
  width: "fit-content",
  minHeight: "24px",
  marginTop: "3px",
  border: "1px solid rgba(255, 255, 255, 0.1)",
  borderRadius: "999px",
  padding: "0 9px",
  color: "rgba(232, 244, 255, 0.64)",
  fontSize: "10px",
  fontWeight: 800,
  lineHeight: 1,
  whiteSpace: "nowrap",
};

const homefrontLiveDotBaseStyle: CSSProperties = {
  width: "7px",
  height: "7px",
  borderRadius: "999px",
  background: "rgba(255, 255, 255, 0.45)",
  boxShadow: "0 0 0 4px rgba(255, 255, 255, 0.04)",
};

const homefrontSignalIndexBaseStyle: CSSProperties = {
  display: "inline-flex",
  width: "fit-content",
  minWidth: "20px",
  minHeight: "18px",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "999px",
};

const homefrontSignalDegradedStyle: CSSProperties = {
  borderColor: "rgba(255, 184, 107, 0.2)",
};

function getHomefrontStateAccentStyle(
  state: HomefrontLiveSignalState,
): CSSProperties {
  if (state === "online") {
    return {
      background: "rgba(106, 255, 204, 0.86)",
      boxShadow: "0 0 0 4px rgba(106, 255, 204, 0.08)",
      color: "rgba(2, 10, 12, 0.88)",
    };
  }
  if (state === "degraded") {
    return {
      background: "rgba(255, 184, 107, 0.9)",
      boxShadow: "0 0 0 4px rgba(255, 184, 107, 0.08)",
      color: "rgba(2, 10, 12, 0.88)",
    };
  }
  return {};
}

function getHomefrontLiveDotStyle(
  state: HomefrontLiveSignalState,
): CSSProperties {
  return {
    ...homefrontLiveDotBaseStyle,
    ...getHomefrontStateAccentStyle(state),
  };
}

function getHomefrontSignalIndexStyle(
  state: HomefrontLiveSignalState,
): CSSProperties {
  return {
    ...homefrontSignalIndexBaseStyle,
    ...getHomefrontStateAccentStyle(state),
  };
}

function setStagePointerVars(target: HTMLElement, x: number, y: number) {
  const px = Math.min(Math.max(x, 0), 1);
  const py = Math.min(Math.max(y, 0), 1);
  target.style.setProperty(
    "--nexus-ops-pointer-x",
    `${(px * 100).toFixed(2)}%`,
  );
  target.style.setProperty(
    "--nexus-ops-pointer-y",
    `${(py * 100).toFixed(2)}%`,
  );
  target.style.setProperty(
    "--nexus-ops-parallax-x",
    `${((px - 0.5) * 18).toFixed(2)}px`,
  );
  target.style.setProperty(
    "--nexus-ops-parallax-y",
    `${((py - 0.5) * 14).toFixed(2)}px`,
  );
}

function handleStagePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
  const rect = event.currentTarget.getBoundingClientRect();
  const x = (event.clientX - rect.left) / rect.width;
  const y = (event.clientY - rect.top) / rect.height;
  setStagePointerVars(event.currentTarget, x, y);
}

function handleStagePointerLeave(event: ReactPointerEvent<HTMLDivElement>) {
  setStagePointerVars(event.currentTarget, 0.5, 0.5);
}

function ShellStageBackdrop({
  surface,
  art,
  branding,
}: {
  surface: ShellSurface;
  art: (typeof SURFACE_ART)[ShellSurface];
  branding: ReturnType<typeof getSurfaceBranding>;
}) {
  return (
    <div className="nexus-shell-stage__world" aria-hidden="true">
      <div className="nexus-shell-stage__plate">
        <Image
          src={art.plateSrc}
          alt=""
          fill
          sizes="100vw"
          className="nexus-shell-stage__plateImage"
          style={{ objectPosition: art.platePosition }}
          priority={surface === "hq"}
        />
      </div>
      <div className="nexus-shell-stage__cartography" />
      <div className="nexus-shell-stage__trace" />
      <div className="nexus-shell-stage__rings" />
      <div className="nexus-shell-stage__pins" />
      <div className="nexus-shell-stage__readout">
        <span>{branding.visibleLabel}</span>
        <span>{art.strap}</span>
      </div>
    </div>
  );
}

function shellWidthClass(width: ShellWidth) {
  if (width === "wide") return "nexus-shell-page--wide";
  if (width === "full") return "nexus-shell-page--full";
  return "nexus-shell-page--standard";
}

function buildSequenceDelays(
  sequence: ReturnType<typeof resolveSurfaceSequencePreset>,
) {
  const hero = sequence.heroDelayMs;
  const primary = Math.max(sequence.primaryDelayMs, hero + 120);
  const support = Math.max(sequence.supportDelayMs, primary + 120);
  const continuity = Math.max(sequence.continuityDelayMs, support + 120);
  return { hero, primary, support, continuity };
}

function HomefrontDoctrineRail({
  surface,
  branding,
}: {
  surface: ShellSurface;
  branding: ReturnType<typeof getSurfaceBranding>;
}) {
  const cinematicIA = getCinematicIASurface(surface);

  return (
    <div
      className="nexus-shell-doctrineRail"
      data-testid="homefront-doctrine-strip"
      data-surface={surface}
    >
      <div className="nexus-shell-doctrineRail__copy">
        <span className="nexus-shell-doctrineRail__kicker">
          Homefront continuity
        </span>
        <span className="nexus-shell-doctrineRail__line">
          {branding.functionalLabel} inherits the landing threshold: local
          first, token-gated, and useful without an app billing layer.
        </span>
      </div>
      <div
        className="nexus-shell-doctrineRail__chips"
        aria-label="Homefront posture"
      >
        <span>{NEXUS_FREE_USE_LABEL}</span>
        <span>BYOK optional</span>
        <span>{cinematicIA.posture}</span>
      </div>
    </div>
  );
}

function HomefrontCommandThreshold({
  surface,
  art,
  branding,
}: {
  surface: ShellSurface;
  art: (typeof SURFACE_ART)[ShellSurface];
  branding: ReturnType<typeof getSurfaceBranding>;
}) {
  const spec = resolveHomefrontThreshold(surface, art, branding);
  const pathname = usePathname();
  const [routeState, setRouteState] = useState<HomefrontRouteState>({
    pathname: null,
    focus: null,
    view: null,
  });
  const [liveState, setLiveState] = useState<HomefrontLiveState>(
    initialHomefrontLiveState,
  );
  const focusLabel = useMemo(() => {
    const focus = routeState.focus ?? routeState.view ?? pathname ?? surface;
    return humanizeRouteToken(focus);
  }, [pathname, routeState.focus, routeState.view, surface]);
  const routeLabel = useMemo(
    () => humanizeRouteToken(routeState.pathname ?? pathname ?? `/${surface}`),
    [pathname, routeState.pathname, surface],
  );
  const liveSignals = useMemo<
    Array<{ label: string; value: string; state: HomefrontLiveSignalState }>
  >(
    () => [
      {
        label: "Runtime",
        value:
          liveState.runtimeStatus === "online"
            ? liveState.runtimeAgeLabel
            : liveState.runtimeStatus === "degraded"
              ? "Degraded"
              : "Checking",
        state: liveState.runtimeStatus,
      },
      {
        label: "Focus",
        value: focusLabel,
        state: "online",
      },
      {
        label: "Readiness",
        value: liveState.evalGrade,
        state:
          liveState.evalGrade === "Checking" || liveState.evalGrade === "Stale"
            ? "checking"
            : "online",
      },
    ],
    [
      focusLabel,
      liveState.evalGrade,
      liveState.runtimeAgeLabel,
      liveState.runtimeStatus,
    ],
  );
  const proofChips = useMemo(
    () => [
      NEXUS_FREE_USE_LABEL,
      "Session active",
      `Route ${routeLabel}`,
      `Mode ${liveState.networkMode}`,
      liveState.evalPosture,
      ...spec.proof.slice(1, 2),
    ],
    [liveState.evalPosture, liveState.networkMode, routeLabel, spec.proof],
  );

  useEffect(() => {
    function syncRouteState() {
      const params = new URLSearchParams(window.location.search);
      setRouteState({
        pathname: window.location.pathname || null,
        focus: params.get("focus"),
        view: params.get("view"),
      });
    }

    syncRouteState();
    window.addEventListener("popstate", syncRouteState);
    window.addEventListener("hashchange", syncRouteState);
    return () => {
      window.removeEventListener("popstate", syncRouteState);
      window.removeEventListener("hashchange", syncRouteState);
    };
  }, [pathname]);

  useEffect(() => {
    let cancelled = false;

    async function refreshLiveState() {
      const nextState: HomefrontLiveState = {
        ...initialHomefrontLiveState,
        lastCheckedLabel: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };

      try {
        const healthResponse = await fetch("/api/health", {
          cache: "no-store",
        });
        if (healthResponse.ok) {
          const health = (await healthResponse.json()) as {
            status?: string;
            runtime?: { ageSeconds?: number | null };
          };
          nextState.runtimeStatus =
            health.status === "ok" ? "online" : "degraded";
          nextState.runtimeAgeLabel = formatRuntimeAge(
            health.runtime?.ageSeconds,
          );
        } else {
          nextState.runtimeStatus = "degraded";
          nextState.runtimeAgeLabel = "No reply";
        }
      } catch {
        nextState.runtimeStatus = "degraded";
        nextState.runtimeAgeLabel = "No reply";
      }

      try {
        const statusResponse = await fetch("/api/status", {
          cache: "no-store",
        });
        if (statusResponse.ok) {
          const status = (await statusResponse.json()) as {
            summary?: { networkMode?: unknown };
            readiness?: {
              evalPolicy?: {
                rollup?: {
                  grade?: unknown;
                  stale?: unknown;
                  degradedReasons?: unknown;
                };
              };
            };
          };
          nextState.networkMode =
            readStatusString(status.summary?.networkMode) ?? "Local";
          const rollup = status.readiness?.evalPolicy?.rollup;
          const grade = readStatusString(rollup?.grade);
          nextState.evalGrade = grade ?? "Unknown";
          const degradedReasons = Array.isArray(rollup?.degradedReasons)
            ? rollup.degradedReasons.length
            : 0;
          nextState.evalPosture =
            rollup?.stale === true
              ? "Readiness stale"
              : degradedReasons > 0
                ? `${degradedReasons} readiness notes`
                : "Readiness current";
        }
      } catch {
        // Silent fallback keeps the shell usable when protected diagnostics are unavailable.
      }

      if (!cancelled) {
        setLiveState(nextState);
      }
    }

    refreshLiveState();
    const intervalId = window.setInterval(refreshLiveState, 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, []);

  return (
    <section
      className="nexus-shell-commandThreshold"
      data-testid="homefront-command-threshold"
      data-surface={surface}
      data-live-state={liveState.runtimeStatus}
      aria-label={`${branding.visibleLabel} Homefront threshold`}
    >
      <div className="nexus-shell-commandThreshold__header">
        <span className="nexus-shell-commandThreshold__kicker">
          Live threshold
        </span>
        <strong className="nexus-shell-commandThreshold__title">
          {spec.title}
        </strong>
        <span className="nexus-shell-commandThreshold__body">{spec.body}</span>
        <span
          className="nexus-shell-commandThreshold__liveMeta"
          style={homefrontLiveMetaStyle}
        >
          <span
            className="nexus-shell-commandThreshold__liveDot"
            data-state={liveState.runtimeStatus}
            style={getHomefrontLiveDotStyle(liveState.runtimeStatus)}
            aria-hidden="true"
          />
          Live shell proof / checked {liveState.lastCheckedLabel}
        </span>
      </div>
      <div
        className="nexus-shell-commandThreshold__grid"
        aria-label="Surface signals"
      >
        {liveSignals.map((signal, index) => (
          <div
            key={`${surface}-${signal.label}-${signal.value}`}
            className="nexus-shell-commandThreshold__signal"
            data-state={signal.state}
            style={
              signal.state === "degraded"
                ? homefrontSignalDegradedStyle
                : undefined
            }
          >
            <span
              className="nexus-shell-commandThreshold__signalTop"
              style={getHomefrontSignalIndexStyle(signal.state)}
            >
              0{index + 1}
            </span>
            <span className="nexus-shell-commandThreshold__signalLabel">
              {signal.label}
            </span>
            <span className="nexus-shell-commandThreshold__signalValue">
              {signal.value}
            </span>
          </div>
        ))}
      </div>
      <div
        className="nexus-shell-commandThreshold__proof"
        aria-label="Route proof"
      >
        {proofChips.map((item) => (
          <span key={`${surface}-${item}`}>{item}</span>
        ))}
      </div>
    </section>
  );
}

export function ShellPage({
  eyebrow,
  title,
  description,
  actions,
  width = "standard",
  surface = "default",
  heroDensity,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  width?: ShellWidth;
  surface?: ShellSurface;
  heroDensity?: ShellHeroDensity;
  children: ReactNode;
}) {
  const art = SURFACE_ART[surface] ?? SURFACE_ART.default;
  const layout = SURFACE_LAYOUT[surface] ?? SURFACE_LAYOUT.default;
  const branding = getSurfaceBranding(surface);
  const taste = getNexusTasteContract(surface);
  const atmosphere = resolveSurfaceAtmosphereSpec(surface);
  const sequence = resolveSurfaceSequencePreset(surface);
  const delays = buildSequenceDelays(sequence);
  const cinematicIA = getCinematicIASurface(surface);
  const resolvedHeroDensity: ShellHeroDensity =
    heroDensity ??
    (surface === "hq" || surface === "default" ? "standard" : "compact");
  const compactChrome = resolvedHeroDensity === "compact";

  return (
    <PageTransition>
      <div
        className={cn("nexus-shell-stage", `nexus-shell-stage--${surface}`)}
        data-cinematic-ia={CINEMATIC_IA_VERSION}
        data-cinematic-surface={cinematicIA.surface}
        data-cinematic-posture={cinematicIA.posture}
        data-cinematic-hierarchy={cinematicIA.hierarchy}
        data-chamber-tone={atmosphere.chamberTone}
        data-focus-bias={atmosphere.focusBias}
        data-ingress={sequence.ingress.kind}
        onPointerMove={handleStagePointerMove}
        onPointerLeave={handleStagePointerLeave}
        style={
          {
            "--nexus-atmosphere-world-opacity": `${atmosphere.worldOpacity}`,
            "--nexus-atmosphere-veil-opacity": `${atmosphere.veilOpacity}`,
            "--nexus-atmosphere-frame-opacity": `${atmosphere.frameOpacity}`,
            "--nexus-atmosphere-spotlight": atmosphere.spotlight,
            "--nexus-sequence-hero-delay": `${delays.hero}ms`,
            "--nexus-sequence-primary-delay": `${delays.primary}ms`,
            "--nexus-sequence-support-delay": `${delays.support}ms`,
            "--nexus-sequence-continuity-delay": `${delays.continuity}ms`,
            "--nexus-ops-pointer-x": "50%",
            "--nexus-ops-pointer-y": "50%",
            "--nexus-ops-parallax-x": "0px",
            "--nexus-ops-parallax-y": "0px",
          } as CSSProperties
        }
      >
        <ShellStageBackdrop surface={surface} art={art} branding={branding} />
        <div className="nexus-shell-stage__veil" aria-hidden="true" />
        <div className="nexus-shell-stage__focus" aria-hidden="true" />
        <div className={cn("nexus-shell-page", shellWidthClass(width))}>
          <OpsCanvas className={layout.canvasClass}>
            <OpsHeader
              eyebrow={eyebrow}
              title={title}
              description={description}
              actions={actions}
              surface={surface}
              density={resolvedHeroDensity}
              art={art}
              branding={branding}
              atmosphere={atmosphere}
            />
            {surface !== "default" ? (
              <SpatialCommandStrip
                surface={surface}
                className={
                  compactChrome ? "nexus-spatial-strip--compact" : undefined
                }
              />
            ) : null}
            <OpsStrip
              className={cn(
                "nexus-shell-page__missionStrip",
                compactChrome && "nexus-shell-page__missionStrip--compact",
                "nexus-motion-enter",
                "nexus-motion-enter--continuity",
              )}
            >
              <span className="nexus-shell-page__missionStripLabel">
                {taste.workplaneLabel || layout.stripLabel}
              </span>
              <span className="nexus-shell-page__missionStripCopy">
                {taste.supportLabel}
              </span>
              <div className="nexus-shell-page__missionStripReadouts">
                {art.readouts.slice(0, 2).map((readout) => (
                  <span
                    key={`${surface}-${readout.label}`}
                    className="nexus-shell-page__missionStripReadout"
                  >
                    <span className="nexus-shell-page__missionStripReadoutLabel">
                      {readout.label}
                    </span>
                    <span className="nexus-shell-page__missionStripReadoutValue">
                      {readout.value}
                    </span>
                  </span>
                ))}
              </div>
            </OpsStrip>
            {children}
          </OpsCanvas>
        </div>
      </div>
    </PageTransition>
  );
}

export function OpsHeader({
  eyebrow,
  title,
  description,
  actions,
  surface,
  density = "standard",
  art,
  branding,
  atmosphere,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  surface: ShellSurface;
  density?: ShellHeroDensity;
  art: (typeof SURFACE_ART)[ShellSurface];
  branding: ReturnType<typeof getSurfaceBranding>;
  atmosphere: ReturnType<typeof resolveSurfaceAtmosphereSpec>;
}) {
  const taste = getNexusTasteContract(surface);
  return (
    <header
      className={cn(
        "nexus-shell-opsHead",
        `nexus-shell-hero--${surface}`,
        "nexus-motion-enter",
        "nexus-motion-enter--hero",
      )}
      data-surface={surface}
      data-density={density}
      data-chamber-tone={atmosphere.chamberTone}
      style={
        {
          "--nexus-hero-accent-a": branding.accentPalette[0],
          "--nexus-hero-accent-b": branding.accentPalette[1],
          "--nexus-atmosphere-spotlight": atmosphere.spotlight,
        } as CSSProperties
      }
    >
      <div className="nexus-shell-opsHead__manifest">
        <div className="nexus-shell-opsHead__heading">
          {eyebrow ? (
            <div className="nexus-shell-eyebrow">{eyebrow}</div>
          ) : null}
          <div className="nexus-shell-opsHead__identity">
            <div className="nexus-shell-opsHead__identityCopy">
              <span className="nexus-shell-opsHead__identityLabel">
                {branding.visibleLabel}
              </span>
              <span className="nexus-shell-opsHead__identityNote">
                {taste.headerNote}
              </span>
            </div>
          </div>
        </div>
        <h1 className="nexus-shell-title">{title}</h1>
        {description ? (
          <p className="nexus-shell-description">{description}</p>
        ) : null}
        {surface !== "default" ? (
          <HomefrontDoctrineRail surface={surface} branding={branding} />
        ) : null}
        {surface !== "default" && surface !== "hq" ? (
          <HomefrontCommandThreshold
            surface={surface}
            art={art}
            branding={branding}
          />
        ) : null}
        <div className="nexus-shell-opsHead__tape" aria-hidden="true">
          <span>{taste.supportLabel}</span>
          <span>{taste.continuityLabel}</span>
        </div>
        {actions ? (
          <div className="nexus-shell-actions nexus-shell-actions--ops">
            {actions}
          </div>
        ) : null}
      </div>
      <div className="nexus-shell-opsHead__plate" aria-hidden="true">
        <div className="nexus-shell-opsHead__plateFrame">
          <Image
            src={art.plateSrc}
            alt={`${branding.visibleLabel} route plate`}
            fill
            sizes="(max-width: 980px) 100vw, 560px"
            className="nexus-shell-opsHead__plateImage"
            style={{ objectPosition: art.platePosition }}
          />
          <div className="nexus-shell-opsHead__plateGrid" />
          <div className="nexus-shell-opsHead__plateSweep" />
          <div className="nexus-shell-opsHead__plateFocus" />
          <div className="nexus-shell-opsHead__plateTag">{art.strap}</div>
        </div>
        <div className="nexus-shell-opsHead__telemetry">
          {art.readouts.map((readout) => (
            <div
              key={`${surface}-${readout.label}`}
              className="nexus-shell-opsHead__readout"
            >
              <span className="nexus-shell-opsHead__readoutLabel">
                {readout.label}
              </span>
              <span className="nexus-shell-opsHead__readoutValue">
                {readout.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </header>
  );
}

export function ShellStage({
  surface = "default",
  children,
}: {
  surface?: ShellSurface;
  children: ReactNode;
}) {
  const art = SURFACE_ART[surface] ?? SURFACE_ART.default;
  const branding = getSurfaceBranding(surface);
  const atmosphere = resolveSurfaceAtmosphereSpec(surface);
  const sequence = resolveSurfaceSequencePreset(surface);
  const delays = buildSequenceDelays(sequence);
  const cinematicIA = getCinematicIASurface(surface);
  return (
    <div
      className={cn("nexus-shell-stage", `nexus-shell-stage--${surface}`)}
      data-cinematic-ia={CINEMATIC_IA_VERSION}
      data-cinematic-surface={cinematicIA.surface}
      data-cinematic-posture={cinematicIA.posture}
      data-cinematic-hierarchy={cinematicIA.hierarchy}
      data-chamber-tone={atmosphere.chamberTone}
      data-focus-bias={atmosphere.focusBias}
      data-ingress={sequence.ingress.kind}
      onPointerMove={handleStagePointerMove}
      onPointerLeave={handleStagePointerLeave}
      style={
        {
          "--nexus-atmosphere-world-opacity": `${atmosphere.worldOpacity}`,
          "--nexus-atmosphere-veil-opacity": `${atmosphere.veilOpacity}`,
          "--nexus-atmosphere-frame-opacity": `${atmosphere.frameOpacity}`,
          "--nexus-atmosphere-spotlight": atmosphere.spotlight,
          "--nexus-sequence-hero-delay": `${delays.hero}ms`,
          "--nexus-sequence-primary-delay": `${delays.primary}ms`,
          "--nexus-sequence-support-delay": `${delays.support}ms`,
          "--nexus-sequence-continuity-delay": `${delays.continuity}ms`,
          "--nexus-ops-pointer-x": "50%",
          "--nexus-ops-pointer-y": "50%",
          "--nexus-ops-parallax-x": "0px",
          "--nexus-ops-parallax-y": "0px",
        } as CSSProperties
      }
    >
      <ShellStageBackdrop surface={surface} art={art} branding={branding} />
      <div className="nexus-shell-stage__veil" aria-hidden="true" />
      <div className="nexus-shell-stage__focus" aria-hidden="true" />
      {children}
    </div>
  );
}

export function OpsCanvas({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn("nexus-ops-canvas", className)}
      data-cinematic-zone="canvas"
    >
      {children}
    </div>
  );
}

export function OpsWorkplane({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn("nexus-ops-workplane", className)}
      data-cinematic-zone="lead"
    >
      {children}
    </div>
  );
}

export function OpsRail({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <aside
      className={cn("nexus-ops-rail", className)}
      data-cinematic-zone="support"
    >
      {children}
    </aside>
  );
}

export function OpsInspector({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <aside
      className={cn("nexus-ops-inspector", className)}
      data-cinematic-zone="inspector"
    >
      {children}
    </aside>
  );
}

export function OpsStrip({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn("nexus-ops-strip", className)}
      data-cinematic-zone="continuity"
    >
      {children}
    </div>
  );
}

export function OpsField({
  title,
  detail,
  tone = "default",
  compact = false,
  children,
  id,
  className,
}: {
  title: ReactNode;
  detail?: ReactNode;
  tone?: "default" | "muted";
  compact?: boolean;
  children: ReactNode;
  id?: string;
  className?: string;
}) {
  return (
    <section
      id={id}
      className={cn(
        "nexus-ops-field",
        tone === "muted" && "nexus-ops-field--muted",
        compact && "nexus-ops-field--compact",
        className,
      )}
      data-tone={tone}
      data-field-compact={compact ? "true" : "false"}
      data-cinematic-zone={tone === "muted" ? "support" : "lead"}
    >
      <header className="nexus-ops-field__header">
        <div className="nexus-ops-field__kicker">
          <span className="nexus-ops-field__tone">
            {tone === "muted"
              ? "Support rail"
              : compact
                ? "Inset rail"
                : "Active lane"}
          </span>
          {detail ? (
            <span className="nexus-ops-field__detail">{detail}</span>
          ) : null}
        </div>
        <div className="nexus-ops-field__title">{title}</div>
      </header>
      <div className="nexus-ops-field__body">{children}</div>
    </section>
  );
}

export function ShellPanel({
  children,
  className,
  tone = "default",
  dense = false,
}: {
  children: ReactNode;
  className?: string;
  tone?: "default" | "muted" | "hero";
  dense?: boolean;
}) {
  return (
    <section
      className={cn(
        "nexus-shell-panel",
        tone !== "default" && `nexus-shell-panel--${tone}`,
        dense && "nexus-shell-panel--dense",
        className,
      )}
      data-cinematic-zone={
        tone === "muted" ? "support" : tone === "hero" ? "lead" : "panel"
      }
    >
      {children}
    </section>
  );
}

export function ShellStack({
  children,
  gap = "16px",
  className,
}: {
  children: ReactNode;
  gap?: string;
  className?: string;
}) {
  return (
    <div
      className={cn("nexus-shell-stack", className)}
      style={{ "--nexus-stack-gap": gap } as CSSProperties}
    >
      {children}
    </div>
  );
}

export function ShellGrid({
  children,
  columns,
  className,
  gap = "16px",
  align = "stretch",
}: {
  children: ReactNode;
  columns: string;
  className?: string;
  gap?: string;
  align?: CSSProperties["alignItems"];
}) {
  return (
    <div
      className={cn("nexus-shell-grid", className)}
      style={
        {
          "--nexus-grid-columns": columns,
          "--nexus-grid-gap": gap,
          alignItems: align,
        } as CSSProperties
      }
    >
      {children}
    </div>
  );
}

export function SectionLabel({
  children,
  detail,
}: {
  children: ReactNode;
  detail?: ReactNode;
}) {
  return (
    <div className="nexus-shell-section-label">
      <span>{children}</span>
      {detail ? (
        <span className="nexus-shell-section-label__detail">{detail}</span>
      ) : null}
    </div>
  );
}

export function ShellBadge({
  children,
  tone = "default",
}: {
  children: ReactNode;
  tone?: "default" | "success" | "accent" | "muted";
}) {
  return (
    <span
      className={cn(
        "nexus-shell-badge",
        tone !== "default" && `nexus-shell-badge--${tone}`,
      )}
    >
      {children}
    </span>
  );
}

export function ShellButton({
  children,
  active = false,
  onClick,
  title,
  className,
  disabled = false,
}: {
  children: ReactNode;
  active?: boolean;
  onClick?: () => void | Promise<void>;
  title?: string;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={cn("nexus-shell-button", active && "is-active", className)}
    >
      {children}
    </button>
  );
}

export function ShellSegmentedTabs<T extends string>({
  items,
  active,
  onChange,
  minButtonWidth = 132,
  className,
}: {
  items: Array<{ id: T; label: string }>;
  active: T;
  onChange: (id: T) => void;
  minButtonWidth?: number;
  className?: string;
}) {
  return (
    <div
      className={cn("nexus-shell-segmented", className)}
      role="tablist"
      aria-label="Section view switcher"
    >
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          role="tab"
          aria-selected={active === item.id}
          className={cn(
            "nexus-shell-segmented__button",
            active === item.id && "is-active",
          )}
          style={{ minWidth: `${minButtonWidth}px` }}
          onClick={() => onChange(item.id)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
