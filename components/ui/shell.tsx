"use client";

import Image from "next/image";
import type { CSSProperties, PointerEvent as ReactPointerEvent, ReactNode } from "react";
import { cn } from "@/lib/cn";
import PageTransition from "@/components/ui/PageTransition";
import { getSurfaceBranding } from "@/lib/brand";
import { getNexusTasteContract } from "@/lib/nexusTasteContract";
import {
  resolveSurfaceAtmosphereSpec,
  resolveSurfaceSequencePreset,
  type SurfaceMotionSurface,
} from "@/lib/surfaceMotion";

type ShellWidth = "standard" | "wide" | "full";
type ShellSurface = SurfaceMotionSurface;

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
    strap: "Operations picture",
    caption: "Calibrated surface plate with embedded telemetry and route-specific map context.",
    readouts: [
      { label: "Window", value: "Live" },
      { label: "Posture", value: "Aligned" },
      { label: "Trace", value: "Stable" },
    ],
  },
  hq: {
    plateSrc: "/theme/satops-hq-plate.svg",
    platePosition: "50% 50%",
    strap: "Mission picture",
    caption: "Primary theater plate for live dispatch, continuity, and command-state sweep.",
    readouts: [
      { label: "Station", value: "JANSKY" },
      { label: "Track", value: "Command" },
      { label: "State", value: "Live" },
    ],
  },
  command: {
    plateSrc: "/theme/satops-command-plate.svg",
    platePosition: "50% 50%",
    strap: "Operations board",
    caption: "Provider posture, pressure, and dispatch opportunities held inside one live grid.",
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
    caption: "Narrative, map, and signal lanes aligned for evidence-first investigation.",
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
    caption: "Thesis, pressure, and market memory staged as one disciplined review picture.",
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
    caption: "Containment, evidence, and exposure lanes woven into one threat picture.",
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
    caption: "Case progression, public repo intel, and triangulated evidence held in one scan plate.",
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
    caption: "Compiled memory, graph continuity, and dossier export held in one lattice view.",
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
    caption: "Bridge posture, readiness, and bundle continuity aligned on a single launch grid.",
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
    caption: "Playbooks, architecture maps, and field references staged in one indexed work plane.",
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
    caption: "Policy, controls, and risk posture held as one operating control surface.",
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
    caption: "Reusable operator capability and workflow patterns staged as a forge lattice.",
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
  default: { canvasClass: "nexus-ops-canvas--balanced", stripLabel: "Operating picture" },
  hq: { canvasClass: "nexus-ops-canvas--hq", stripLabel: "Command table" },
  command: { canvasClass: "nexus-ops-canvas--command", stripLabel: "Operations grid" },
  intel: { canvasClass: "nexus-ops-canvas--intel", stripLabel: "Signal sweep" },
  alpha: { canvasClass: "nexus-ops-canvas--alpha", stripLabel: "Decision frame" },
  cyber: { canvasClass: "nexus-ops-canvas--cyber", stripLabel: "Threat picture" },
  recon: { canvasClass: "nexus-ops-canvas--recon", stripLabel: "Collection sweep" },
  vault: { canvasClass: "nexus-ops-canvas--vault", stripLabel: "Archive lattice" },
  vehicle: { canvasClass: "nexus-ops-canvas--vehicle", stripLabel: "Launch board" },
  resources: { canvasClass: "nexus-ops-canvas--resources", stripLabel: "Reference lattice" },
  security: { canvasClass: "nexus-ops-canvas--security", stripLabel: "Control surface" },
  skills: { canvasClass: "nexus-ops-canvas--skills", stripLabel: "Workflow forge" },
};

function setStagePointerVars(target: HTMLElement, x: number, y: number) {
  const px = Math.min(Math.max(x, 0), 1);
  const py = Math.min(Math.max(y, 0), 1);
  target.style.setProperty("--nexus-ops-pointer-x", `${(px * 100).toFixed(2)}%`);
  target.style.setProperty("--nexus-ops-pointer-y", `${(py * 100).toFixed(2)}%`);
  target.style.setProperty("--nexus-ops-parallax-x", `${((px - 0.5) * 18).toFixed(2)}px`);
  target.style.setProperty("--nexus-ops-parallax-y", `${((py - 0.5) * 14).toFixed(2)}px`);
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

export function ShellPage({
  eyebrow,
  title,
  description,
  actions,
  width = "standard",
  surface = "default",
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  width?: ShellWidth;
  surface?: ShellSurface;
  children: ReactNode;
}) {
  const art = SURFACE_ART[surface] ?? SURFACE_ART.default;
  const layout = SURFACE_LAYOUT[surface] ?? SURFACE_LAYOUT.default;
  const branding = getSurfaceBranding(surface);
  const taste = getNexusTasteContract(surface);
  const atmosphere = resolveSurfaceAtmosphereSpec(surface);
  const sequence = resolveSurfaceSequencePreset(surface);

  return (
    <PageTransition>
      <div
        className={cn("nexus-shell-stage", `nexus-shell-stage--${surface}`)}
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
            "--nexus-sequence-hero-delay": `${sequence.heroDelayMs}ms`,
            "--nexus-sequence-primary-delay": `${sequence.primaryDelayMs}ms`,
            "--nexus-sequence-support-delay": `${sequence.supportDelayMs}ms`,
            "--nexus-sequence-continuity-delay": `${sequence.continuityDelayMs}ms`,
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
              art={art}
              branding={branding}
              atmosphere={atmosphere}
            />
            <OpsStrip className="nexus-shell-page__missionStrip">
              <span className="nexus-shell-page__missionStripLabel">
                {taste.workplaneLabel || layout.stripLabel}
              </span>
              <span className="nexus-shell-page__missionStripCopy">
                {taste.routeDirective}
              </span>
              <div className="nexus-shell-page__missionStripReadouts">
                {art.readouts.map((readout) => (
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
  art,
  branding,
  atmosphere,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  surface: ShellSurface;
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
          {eyebrow ? <div className="nexus-shell-eyebrow">{eyebrow}</div> : null}
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
            <div key={`${surface}-${readout.label}`} className="nexus-shell-opsHead__readout">
              <span className="nexus-shell-opsHead__readoutLabel">{readout.label}</span>
              <span className="nexus-shell-opsHead__readoutValue">{readout.value}</span>
            </div>
          ))}
        </div>
        <p className="nexus-shell-opsHead__caption">{art.caption}</p>
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
  return (
    <div
      className={cn("nexus-shell-stage", `nexus-shell-stage--${surface}`)}
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
          "--nexus-sequence-hero-delay": `${sequence.heroDelayMs}ms`,
          "--nexus-sequence-primary-delay": `${sequence.primaryDelayMs}ms`,
          "--nexus-sequence-support-delay": `${sequence.supportDelayMs}ms`,
          "--nexus-sequence-continuity-delay": `${sequence.continuityDelayMs}ms`,
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
  return <div className={cn("nexus-ops-canvas", className)}>{children}</div>;
}

export function OpsWorkplane({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("nexus-ops-workplane", className)}>{children}</div>;
}

export function OpsRail({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <aside className={cn("nexus-ops-rail", className)}>{children}</aside>;
}

export function OpsInspector({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <aside className={cn("nexus-ops-inspector", className)}>{children}</aside>;
}

export function OpsStrip({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("nexus-ops-strip", className)}>{children}</div>;
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
    >
      <header className="nexus-ops-field__header">
        <div className="nexus-ops-field__kicker">
          <span className="nexus-ops-field__tone">
            {tone === "muted" ? "Support rail" : compact ? "Inset rail" : "Active lane"}
          </span>
          {detail ? <span className="nexus-ops-field__detail">{detail}</span> : null}
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
      {detail ? <span className="nexus-shell-section-label__detail">{detail}</span> : null}
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
    <span className={cn("nexus-shell-badge", tone !== "default" && `nexus-shell-badge--${tone}`)}>
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
}: {
  items: Array<{ id: T; label: string }>;
  active: T;
  onChange: (id: T) => void;
  minButtonWidth?: number;
}) {
  return (
    <div className="nexus-shell-segmented" role="tablist" aria-label="Section view switcher">
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
