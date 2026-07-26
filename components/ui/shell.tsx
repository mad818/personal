"use client";

import Image from "next/image";
import { usePathname, useSearchParams } from "next/navigation";
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
import { HOMEFRONT_SOURCE_INTAKE } from "@/lib/homefrontSourceIntelligence";
import {
  resolveHomefrontVisualSurfaceSpec,
  type HomefrontVisualSurfaceSpec,
} from "@/lib/homefrontVisualParity";
import { getNexusTasteContract } from "@/lib/nexusTasteContract";
import { NEXUS_FREE_USE_LABEL } from "@/lib/productGuarantees";
import { getSurfaceCapability } from "@/lib/surfaceCapabilities";
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
type RouteSearchParams = {
  toString(): string;
  get(name: string): string | null;
};

const HOMEFRONT_GUARDIAN_HERO_IMAGE = "/images/homefront-guardian-hero.webp";
const HOMEFRONT_DRONE_IMAGE = "/images/homefront-drone-patrol.webp";
const HOMEFRONT_CAPABILITY_VIDEO = "/videos/homefront-capability-reel.webm";

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
    plateSrc: HOMEFRONT_GUARDIAN_HERO_IMAGE,
    platePosition: "50% 50%",
    strap: "Home perimeter",
    caption: "Live homefront perimeter plane.",
    readouts: [
      { label: "Window", value: "Live" },
      { label: "Posture", value: "Locked" },
      { label: "Trace", value: "Clean" },
    ],
  },
  hq: {
    plateSrc: HOMEFRONT_GUARDIAN_HERO_IMAGE,
    platePosition: "50% 50%",
    strap: "Home perimeter",
    caption: "Chronicle-first perimeter plane.",
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
  iot: {
    plateSrc: HOMEFRONT_GUARDIAN_HERO_IMAGE,
    platePosition: "50% 50%",
    strap: "Sensor desk",
    caption: "Sensor posture and automation review on one desk.",
    readouts: [
      { label: "MQTT", value: "Watched" },
      { label: "Devices", value: "Mapped" },
      { label: "Rules", value: "Review" },
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
  iot: {
    canvasClass: "nexus-ops-canvas--iot",
    stripLabel: "Sensor desk",
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
type HomefrontOperatingContract = {
  promise: string;
  lead: string;
  proof: string;
  next: string;
};
type HomefrontVisionItem = {
  label: string;
  value: string;
  detail: string;
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

const HOMEFRONT_OPERATING_CONTRACT: Partial<
  Record<ShellSurface, HomefrontOperatingContract>
> = {
  command: {
    promise: "Decide what moves next.",
    lead: "Queue",
    proof:
      "Risk gates, agent runs, and route health stay visible before execution.",
    next: "Dispatch only after the operator can see scope, proof, and fallback.",
  },
  intel: {
    promise: "Turn noise into an operating picture.",
    lead: "Brief",
    proof: "Sources, topic heat, sweep state, and theater posture stay linked.",
    next: "Escalate only the signals that change a decision.",
  },
  alpha: {
    promise: "Frame market judgment before action.",
    lead: "Thesis",
    proof:
      "Tape, risk, recall, and setup pressure stay in the same decision loop.",
    next: "Act only after the risk lane and confirmation lane agree.",
  },
  cyber: {
    promise: "Keep security work conservative and legible.",
    lead: "Triage",
    proof: "Exposure, policy, evidence, and containment remain close together.",
    next: "Stage repair from ranked evidence, not from raw feed panic.",
  },
  recon: {
    promise: "Collect without losing the case.",
    lead: "Case",
    proof: "Target, OPSEC, lookup modes, and evidence bundles stay connected.",
    next: "Promote findings only when the source trail is usable.",
  },
  vault: {
    promise: "Make memory recoverable.",
    lead: "Recall",
    proof:
      "Archive work, compiled pages, graph focus, and exports share one spine.",
    next: "Store proof where the next session can actually find it.",
  },
  resources: {
    promise: "Find the safest starting lane.",
    lead: "Manual",
    proof:
      "Finder, playbooks, specs, system maps, and impact traces stay indexed.",
    next: "Leave overview mode as soon as the exact working context is clear.",
  },
  security: {
    promise: "Keep trust posture inspectable.",
    lead: "Control",
    proof:
      "Access policy, hardening checks, AI surface review, and drills stay visible.",
    next: "Open protected moves from the control surface, not scattered notes.",
  },
  skills: {
    promise: "Turn repeatable work into capability.",
    lead: "Forge",
    proof:
      "Workflow packs, review state, scheduler posture, and lessons stay governed.",
    next: "Ship reusable patterns only after the review path is clear.",
  },
  vehicle: {
    promise: "Prepare future telemetry without flight risk.",
    lead: "Bench",
    proof:
      "Replay, schema, passive bridge posture, and failsafe notes stay separated.",
    next: "Keep Nexus advisory, simulated, and never flight-critical.",
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

function resolveHomefrontOperatingContract(
  surface: ShellSurface,
  art: (typeof SURFACE_ART)[ShellSurface],
  branding: ReturnType<typeof getSurfaceBranding>,
): HomefrontOperatingContract {
  return (
    HOMEFRONT_OPERATING_CONTRACT[surface] ?? {
      promise: `${branding.functionalLabel} keeps the work bounded.`,
      lead: art.strap,
      proof:
        "Route state, runtime posture, local proof, and operator control stay visible.",
      next: "Move from overview into the exact lane only when the scope is clear.",
    }
  );
}

function resolveHomefrontVisionItems({
  art,
  branding,
  focusLabel,
  routeLabel,
}: {
  art: (typeof SURFACE_ART)[ShellSurface];
  branding: ReturnType<typeof getSurfaceBranding>;
  focusLabel: string;
  routeLabel: string;
}): HomefrontVisionItem[] {
  return [
    {
      label: "Image plane",
      value: art.strap,
      detail: art.caption,
    },
    {
      label: "Live focus",
      value: focusLabel,
      detail: `${branding.functionalLabel} is reading ${routeLabel} from the current protected route.`,
    },
    {
      label: "Boundary",
      value: "Local first",
      detail:
        "Protected routes and local continuity stay inside the Nexus operating boundary.",
    },
  ];
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
      {art.plateSrc === HOMEFRONT_GUARDIAN_HERO_IMAGE ? (
        <>
          <video
            autoPlay
            className="nexus-shell-stage__capabilityVideo"
            data-testid="homefront-shell-capability-video"
            loop
            muted
            playsInline
            poster={HOMEFRONT_GUARDIAN_HERO_IMAGE}
            preload="metadata"
          >
            <source src={HOMEFRONT_CAPABILITY_VIDEO} type="video/webm" />
          </video>
          <div
            className="nexus-shell-stage__guardianDrone"
            data-testid="homefront-shell-drone"
          >
            <Image
              src={HOMEFRONT_DRONE_IMAGE}
              alt=""
              width={220}
              height={220}
              className="nexus-shell-stage__guardianDroneImage"
              priority={surface === "hq"}
            />
          </div>
        </>
      ) : null}
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

function compactHomefrontCopy(value: string, maxLength = 108) {
  if (value.length <= maxLength) return value;
  const truncated = value
    .slice(0, maxLength - 3)
    .replace(/\s+\S*$/, "")
    .trim();
  return `${truncated || value.slice(0, maxLength - 3).trim()}...`;
}

function buildCurrentRouteHref(
  pathname: string | null,
  searchParams: RouteSearchParams,
) {
  const search = searchParams.toString();
  return `${pathname ?? ""}${search ? `?${search}` : ""}`;
}

function isRouteHrefActive(
  href: string | undefined,
  pathname: string | null,
  searchParams: RouteSearchParams,
) {
  if (!href || !pathname) return false;
  try {
    const target = new URL(href, "http://nexus.local");
    if (target.pathname !== pathname) return false;
    const targetParams = Array.from(target.searchParams.entries());
    if (targetParams.length === 0) return true;
    return targetParams.every(
      ([key, value]) => searchParams.get(key) === value,
    );
  } catch {
    return false;
  }
}

function HomefrontSurfaceModule({
  surface,
  spec,
  children,
}: {
  surface: ShellSurface;
  spec: HomefrontVisualSurfaceSpec;
  children: ReactNode;
}) {
  return (
    <div
      className="nexus-homefront-surfaceModule"
      data-testid="homefront-surface-module"
      data-surface={surface}
      data-visual-role={spec.visualRole}
      data-interior-polish={spec.interiorPolish ? "true" : "false"}
      data-support-density={spec.interiorPolish?.supportDensity ?? "standard"}
    >
      {children}
    </div>
  );
}

function HomefrontDataRail({
  surface,
  items,
}: {
  surface: ShellSurface;
  items: Array<{ label: string; value: string }>;
}) {
  return (
    <div
      className="nexus-homefront-dataRail"
      data-testid="homefront-data-rail"
      data-surface={surface}
      aria-label="Homefront live surface readouts"
    >
      {items.map((item) => (
        <span key={`${surface}-${item.label}-${item.value}`}>
          <em>{item.label}</em>
          <strong>{item.value}</strong>
        </span>
      ))}
    </div>
  );
}

function HomefrontMediaPanel({
  surface,
  art,
  branding,
  spec,
}: {
  surface: ShellSurface;
  art: (typeof SURFACE_ART)[ShellSurface];
  branding: ReturnType<typeof getSurfaceBranding>;
  spec: HomefrontVisualSurfaceSpec;
}) {
  const usesGuardianMedia =
    spec.mediaMode === "guardian-image" || spec.mediaMode === "guardian-video";
  const mediaSrc = usesGuardianMedia
    ? HOMEFRONT_GUARDIAN_HERO_IMAGE
    : art.plateSrc;
  const showDrone =
    usesGuardianMedia || surface === "vehicle" || surface === "iot";
  const polish = spec.interiorPolish;

  return (
    <div
      className="nexus-homefront-mediaPanel"
      data-testid="homefront-media-panel"
      data-surface={surface}
      data-media-mode={spec.mediaMode}
      data-media-moment={polish?.mediaMoment ?? ""}
      aria-label={`${branding.visibleLabel} visual proof panel`}
    >
      <div className="nexus-homefront-mediaPanel__visual" aria-hidden="true">
        <Image
          src={mediaSrc}
          alt=""
          fill
          sizes="(max-width: 980px) 100vw, 460px"
          className="nexus-homefront-mediaPanel__image"
          style={{
            objectPosition: usesGuardianMedia ? "50% 50%" : art.platePosition,
          }}
        />
        {spec.mediaMode === "guardian-video" ? (
          <video
            autoPlay
            className="nexus-homefront-mediaPanel__video"
            loop
            muted
            playsInline
            poster={HOMEFRONT_GUARDIAN_HERO_IMAGE}
            preload="metadata"
          >
            <source src={HOMEFRONT_CAPABILITY_VIDEO} type="video/webm" />
          </video>
        ) : null}
        {showDrone ? (
          <Image
            src={HOMEFRONT_DRONE_IMAGE}
            alt=""
            width={180}
            height={180}
            className="nexus-homefront-mediaPanel__drone"
          />
        ) : null}
        <div className="nexus-homefront-mediaPanel__grid" />
        <div className="nexus-homefront-mediaPanel__sweep" />
      </div>
      <div className="nexus-homefront-mediaPanel__readouts">
        <span>{art.strap}</span>
        <strong>{art.caption}</strong>
        {polish ? (
          <p className="nexus-homefront-mediaPanel__moment">
            {compactHomefrontCopy(polish.mediaMoment, 96)}
          </p>
        ) : null}
        <div>
          {art.readouts.map((readout) => (
            <em key={`${surface}-${readout.label}`}>
              {readout.label}: {readout.value}
            </em>
          ))}
        </div>
      </div>
    </div>
  );
}

function HomefrontActionDock({
  surface,
  spec,
}: {
  surface: ShellSurface;
  spec: HomefrontVisualSurfaceSpec;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const capability = getSurfaceCapability(surface);
  const actions = capability.jumpActions.slice(0, 3);
  const polish = spec.interiorPolish;

  return (
    <div
      className="nexus-homefront-actionDock"
      data-testid="homefront-action-dock"
      data-surface={surface}
      data-active-label={polish?.activeStateLabel ?? ""}
      aria-label={`${capability.title} route actions`}
    >
      <span className="nexus-homefront-actionDock__primary">
        {spec.primaryActionLabel}
        {polish ? (
          <em className="nexus-homefront-actionDock__activeLabel">
            {polish.activeStateLabel}
          </em>
        ) : null}
      </span>
      <div>
        {actions.map((action, index) => {
          const active =
            isRouteHrefActive(action.href, pathname, searchParams) ||
            (index === 0 &&
              buildCurrentRouteHref(pathname, searchParams) ===
                capability.route);
          return (
            <a
              key={`${surface}-${action.href}-${action.label}`}
              href={action.href}
              data-active={active ? "true" : "false"}
            >
              {action.label}
            </a>
          );
        })}
      </div>
    </div>
  );
}

function HomefrontRouteTabs({ surface }: { surface: ShellSurface }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const spec = resolveHomefrontVisualSurfaceSpec(surface);
  const capability = getSurfaceCapability(surface);
  const sections = capability.subsections.slice(0, 5);
  const activeIndex = sections.findIndex((section) =>
    isRouteHrefActive(section.href ?? capability.route, pathname, searchParams),
  );

  return (
    <nav
      className="nexus-homefront-routeTabs"
      data-testid="homefront-route-tabs"
      data-surface={surface}
      data-active-label={spec.interiorPolish?.activeStateLabel ?? ""}
      aria-label={`${capability.title} active sections`}
    >
      {sections.map((section, index) => {
        const href = section.href ?? capability.route;
        const active = activeIndex >= 0 ? index === activeIndex : index === 0;
        return (
          <a
            key={`${surface}-${section.label}`}
            href={href}
            data-active={active ? "true" : "false"}
            aria-current={active ? "page" : undefined}
          >
            <span>{section.label}</span>
            <em>{compactHomefrontCopy(section.detail, 54)}</em>
          </a>
        );
      })}
    </nav>
  );
}

function HomefrontVisualParityBand({
  surface,
  art,
  branding,
  variant = "route",
}: {
  surface: ShellSurface;
  art: (typeof SURFACE_ART)[ShellSurface];
  branding: ReturnType<typeof getSurfaceBranding>;
  variant?: "route" | "chrome";
}) {
  const spec = resolveHomefrontVisualSurfaceSpec(surface);
  const capability = getSurfaceCapability(surface);
  const polish = spec.interiorPolish;
  const roleLabel = humanizeRouteToken(spec.visualRole);
  const dataItems = [
    { label: "Role", value: roleLabel },
    {
      label: "Active",
      value: polish?.activeStateLabel ?? humanizeRouteToken(spec.mediaMode),
    },
    {
      label: "Support",
      value: polish
        ? humanizeRouteToken(polish.supportDensity)
        : (spec.proofChips[0] ?? capability.category),
    },
  ];

  return (
    <section
      className={cn(
        "nexus-homefront-visualParity",
        variant === "chrome" && "nexus-homefront-visualParity--chrome",
      )}
      data-testid="homefront-visual-parity"
      data-surface={surface}
      data-visual-role={spec.visualRole}
      data-interior-polish={polish ? "true" : "false"}
      data-support-density={polish?.supportDensity ?? "standard"}
      data-excluded-selectors={spec.excludedSelectors.join(",")}
      aria-label={`${branding.visibleLabel} Homefront visual parity layer`}
    >
      <HomefrontSurfaceModule surface={surface} spec={spec}>
        <div className="nexus-homefront-visualParity__copy">
          <span className="nexus-homefront-visualParity__kicker">
            {polish?.activeStateLabel ?? "Visual contract"}
          </span>
          <strong>{polish?.leadIntent ?? capability.tagline}</strong>
          <p>
            {compactHomefrontCopy(
              polish?.staleInfoPolicy ?? capability.mission,
              variant === "chrome" ? 118 : 168,
            )}
          </p>
          <div className="nexus-homefront-visualParity__proof">
            {spec.proofChips.map((chip) => (
              <span key={`${surface}-${chip}`}>{chip}</span>
            ))}
          </div>
        </div>
        <HomefrontDataRail surface={surface} items={dataItems} />
        <HomefrontRouteTabs surface={surface} />
        <HomefrontActionDock surface={surface} spec={spec} />
        <HomefrontMediaPanel
          surface={surface}
          art={art}
          branding={branding}
          spec={spec}
        />
      </HomefrontSurfaceModule>
    </section>
  );
}

function HomefrontWorkplaneSummary({ surface }: { surface: ShellSurface }) {
  const spec = resolveHomefrontVisualSurfaceSpec(surface);
  const summary = spec.workplaneSummary;
  const polish = spec.interiorPolish;

  if (!summary) return null;

  return (
    <section
      className="nexus-homefront-workplaneSummary nexus-motion-enter nexus-motion-enter--primary"
      data-testid="homefront-workplane-summary"
      data-surface={surface}
      data-interior-polish={polish ? "true" : "false"}
      data-support-density={polish?.supportDensity ?? "standard"}
      aria-label={`${humanizeRouteToken(surface)} workplane summary`}
    >
      <div className="nexus-homefront-workplaneSummary__copy">
        <span>Workplane question</span>
        <strong>{summary.primaryQuestion}</strong>
        {polish ? <em>{compactHomefrontCopy(polish.leadIntent, 96)}</em> : null}
      </div>
      <div className="nexus-homefront-workplaneSummary__action">
        <span>{summary.nextBestAction}</span>
        <a href={summary.actionHref}>{summary.actionLabel}</a>
      </div>
      <div className="nexus-homefront-workplaneSummary__proof">
        <span>Proof</span>
        <strong>{summary.proofLine}</strong>
        {polish ? (
          <em>{compactHomefrontCopy(polish.staleInfoPolicy, 108)}</em>
        ) : null}
      </div>
    </section>
  );
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

function HomefrontOperatingContractRail({
  surface,
  art,
  branding,
}: {
  surface: ShellSurface;
  art: (typeof SURFACE_ART)[ShellSurface];
  branding: ReturnType<typeof getSurfaceBranding>;
}) {
  const contract = resolveHomefrontOperatingContract(surface, art, branding);

  return (
    <section
      className="nexus-shell-operatingContract"
      data-testid="homefront-operating-contract"
      data-surface={surface}
      aria-label={`${branding.visibleLabel} operating contract`}
    >
      <div className="nexus-shell-operatingContract__lead">
        <span className="nexus-shell-operatingContract__kicker">
          Operating contract
        </span>
        <strong className="nexus-shell-operatingContract__promise">
          {contract.promise}
        </strong>
      </div>
      <div className="nexus-shell-operatingContract__grid">
        <span>
          <em>Lead</em>
          <strong>{contract.lead}</strong>
        </span>
        <span>
          <em>Proof</em>
          <strong>{contract.proof}</strong>
        </span>
        <span>
          <em>Next</em>
          <strong>{contract.next}</strong>
        </span>
      </div>
    </section>
  );
}

function HomefrontActionControlRail({
  surface,
  branding,
}: {
  surface: ShellSurface;
  branding: ReturnType<typeof getSurfaceBranding>;
}) {
  const capability = getSurfaceCapability(surface);
  const routeActions = capability.jumpActions.slice(0, 3);
  const routeSections = capability.subsections.slice(0, 4);
  const bestFor = capability.bestFor;
  const priority = capability.upgradePriorities[0] ?? capability.tagline;

  return (
    <section
      className="nexus-shell-actionControl"
      data-testid="homefront-action-control"
      data-surface={surface}
      aria-label={`${branding.visibleLabel} purpose and route actions`}
    >
      <div className="nexus-shell-actionControl__lead">
        <span className="nexus-shell-actionControl__kicker">
          Purpose + actions
        </span>
        <strong>{capability.tagline}</strong>
        <p>{compactHomefrontCopy(capability.mission, 148)}</p>
      </div>
      <div
        className="nexus-shell-actionControl__matrix"
        aria-label={`${branding.visibleLabel} route management signals`}
      >
        <span>
          <em>Belongs here</em>
          <strong>
            {compactHomefrontCopy(bestFor[0] ?? capability.title)}
          </strong>
        </span>
        <span>
          <em>Use next</em>
          <strong>{compactHomefrontCopy(bestFor[1] ?? priority)}</strong>
        </span>
        <span>
          <em>Watch</em>
          <strong>{compactHomefrontCopy(capability.offlinePosture)}</strong>
        </span>
      </div>
      <div
        className="nexus-shell-actionControl__actions"
        aria-label={`${branding.visibleLabel} strongest actions`}
      >
        {routeActions.map((action) => (
          <a
            key={`${surface}-${action.href}-${action.label}`}
            href={action.href}
            className="nexus-shell-actionControl__action"
          >
            <span>{action.label}</span>
            <em>{compactHomefrontCopy(action.detail, 72)}</em>
          </a>
        ))}
      </div>
      <div
        className="nexus-shell-actionControl__subsections"
        aria-label={`${branding.visibleLabel} route sections`}
      >
        {routeSections.map((section) => (
          <a
            key={`${surface}-${section.label}`}
            href={section.href ?? capability.route}
          >
            <span>{section.label}</span>
            <em>{compactHomefrontCopy(section.detail, 64)}</em>
          </a>
        ))}
      </div>
    </section>
  );
}

function HomefrontSourceIntakeRail({
  surface,
  branding,
}: {
  surface: ShellSurface;
  branding: ReturnType<typeof getSurfaceBranding>;
}) {
  return (
    <section
      className="nexus-shell-sourceIntake"
      data-testid="homefront-source-intake"
      data-surface={surface}
      aria-label={`${branding.visibleLabel} source intake posture`}
    >
      <div className="nexus-shell-sourceIntake__head">
        <span>Source intake</span>
        <strong>{branding.functionalLabel} studies before it absorbs.</strong>
      </div>
      <div className="nexus-shell-sourceIntake__grid">
        {HOMEFRONT_SOURCE_INTAKE.map((item) => (
          <span key={item.value} className="nexus-shell-sourceIntake__item">
            <em>{item.label}</em>
            <strong>{item.value}</strong>
            <span>{item.detail}</span>
          </span>
        ))}
      </div>
    </section>
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
  const visionItems = useMemo(
    () =>
      resolveHomefrontVisionItems({
        art,
        branding,
        focusLabel,
        routeLabel,
      }),
    [art, branding, focusLabel, routeLabel],
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
      <div
        className="nexus-shell-commandThreshold__vision"
        data-testid="homefront-live-vision-strip"
        aria-label="Premium live vision"
      >
        {visionItems.map((item) => (
          <span
            key={`${surface}-${item.label}`}
            className="nexus-shell-commandThreshold__visionItem"
          >
            <span className="nexus-shell-commandThreshold__visionLabel">
              {item.label}
            </span>
            <strong className="nexus-shell-commandThreshold__visionValue">
              {item.value}
            </strong>
            <span className="nexus-shell-commandThreshold__visionDetail">
              {item.detail}
            </span>
          </span>
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
  const visualSpec =
    surface !== "default" ? resolveHomefrontVisualSurfaceSpec(surface) : null;
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
        data-interior-polish={visualSpec?.interiorPolish ? "true" : "false"}
        data-support-density={
          visualSpec?.interiorPolish?.supportDensity ?? "standard"
        }
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
            {surface !== "default" && surface !== "hq" ? (
              <HomefrontWorkplaneSummary surface={surface} />
            ) : null}
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
        <div className="nexus-shell-opsHead__copyBlock">
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
        </div>
        {surface !== "default" ? (
          <HomefrontDoctrineRail surface={surface} branding={branding} />
        ) : null}
        {surface !== "default" && surface !== "hq" ? (
          <HomefrontVisualParityBand
            surface={surface}
            art={art}
            branding={branding}
          />
        ) : null}
        {surface !== "default" && surface !== "hq" ? (
          <HomefrontOperatingContractRail
            surface={surface}
            art={art}
            branding={branding}
          />
        ) : null}
        {surface !== "default" && surface !== "hq" ? (
          <HomefrontActionControlRail surface={surface} branding={branding} />
        ) : null}
        {surface !== "default" && surface !== "hq" ? (
          <HomefrontSourceIntakeRail surface={surface} branding={branding} />
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
  const visualSpec =
    surface !== "default" ? resolveHomefrontVisualSurfaceSpec(surface) : null;
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
      data-interior-polish={visualSpec?.interiorPolish ? "true" : "false"}
      data-support-density={
        visualSpec?.interiorPolish?.supportDensity ?? "standard"
      }
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
      {surface === "hq" ? (
        <HomefrontVisualParityBand
          surface={surface}
          art={art}
          branding={branding}
          variant="chrome"
        />
      ) : null}
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
  role,
}: {
  children: ReactNode;
  tone?: "default" | "success" | "accent" | "muted";
  role?: "alert" | "status";
}) {
  return (
    <span
      role={role}
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
