"use client";

import Image from "next/image";
import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/cn";
import PageTransition from "@/components/ui/PageTransition";
import { getSurfaceBranding } from "@/lib/brand";
import {
  resolveSurfaceAtmosphereSpec,
  resolveSurfaceHeroMediaSpec,
  resolveSurfaceSequencePreset,
  type SurfaceMotionSurface,
} from "@/lib/surfaceMotion";

type ShellWidth = "standard" | "wide" | "full";
type ShellSurface = SurfaceMotionSurface;

const SURFACE_ART: Record<
  ShellSurface,
  {
    heroSrc: string;
    heroPosition: string;
    stack: Array<{ src: string; position: string }>;
  }
> = {
  default: {
    heroSrc: "/theme/citadel.svg",
    heroPosition: "50% 50%",
    stack: [
      { src: "/theme/aegis-cosmos.svg", position: "50% 50%" },
      { src: "/theme/manual.svg", position: "50% 50%" },
    ],
  },
  hq: {
    heroSrc: "/theme/citadel.svg",
    heroPosition: "50% 50%",
    stack: [
      { src: "/theme/vector.svg", position: "50% 50%" },
      { src: "/theme/aegis-cosmos.svg", position: "50% 50%" },
    ],
  },
  command: {
    heroSrc: "/theme/vector.svg",
    heroPosition: "50% 50%",
    stack: [
      { src: "/theme/citadel.svg", position: "50% 50%" },
      { src: "/theme/quant.svg", position: "50% 50%" },
    ],
  },
  intel: {
    heroSrc: "/theme/spectra.svg",
    heroPosition: "50% 50%",
    stack: [
      { src: "/theme/parallax.svg", position: "50% 50%" },
      { src: "/theme/aegis-cosmos.svg", position: "50% 50%" },
    ],
  },
  alpha: {
    heroSrc: "/theme/quant.svg",
    heroPosition: "50% 50%",
    stack: [
      { src: "/theme/vector.svg", position: "50% 50%" },
      { src: "/theme/spectra.svg", position: "50% 50%" },
    ],
  },
  cyber: {
    heroSrc: "/theme/bastion.svg",
    heroPosition: "50% 50%",
    stack: [
      { src: "/theme/parallax.svg", position: "50% 50%" },
      { src: "/theme/archive.svg", position: "50% 50%" },
    ],
  },
  recon: {
    heroSrc: "/theme/parallax.svg",
    heroPosition: "50% 50%",
    stack: [
      { src: "/theme/bastion.svg", position: "50% 50%" },
      { src: "/theme/spectra.svg", position: "50% 50%" },
    ],
  },
  vault: {
    heroSrc: "/theme/archive.svg",
    heroPosition: "50% 50%",
    stack: [
      { src: "/theme/manual.svg", position: "50% 50%" },
      { src: "/theme/citadel.svg", position: "50% 50%" },
    ],
  },
  vehicle: {
    heroSrc: "/theme/vehicle.svg",
    heroPosition: "50% 50%",
    stack: [
      { src: "/theme/vector.svg", position: "50% 50%" },
      { src: "/theme/aegis-cosmos.svg", position: "50% 50%" },
    ],
  },
  resources: {
    heroSrc: "/theme/manual.svg",
    heroPosition: "50% 50%",
    stack: [
      { src: "/theme/archive.svg", position: "50% 50%" },
      { src: "/theme/aegis-cosmos.svg", position: "50% 50%" },
    ],
  },
};

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
  const branding = getSurfaceBranding(surface);
  const heroMedia = resolveSurfaceHeroMediaSpec(surface);
  const atmosphere = resolveSurfaceAtmosphereSpec(surface);
  const sequence = resolveSurfaceSequencePreset(surface);

  return (
    <PageTransition>
      <div
        className={cn("nexus-shell-stage", `nexus-shell-stage--${surface}`)}
        data-chamber-tone={atmosphere.chamberTone}
        data-focus-bias={atmosphere.focusBias}
        data-ingress={sequence.ingress.kind}
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
          } as CSSProperties
        }
      >
        <div className="nexus-shell-stage__veil" aria-hidden="true" />
        <div className="nexus-shell-stage__focus" aria-hidden="true" />
        <div className={cn("nexus-shell-page", shellWidthClass(width))}>
          <header
            className={cn(
              "nexus-shell-hero",
              `nexus-shell-hero--${surface}`,
              "nexus-motion-enter",
              "nexus-motion-enter--hero",
            )}
            data-surface={surface}
            data-hero-composition={heroMedia.composition}
            data-frame-style={heroMedia.frameStyle}
            data-vignette={heroMedia.vignette}
            data-chamber-tone={atmosphere.chamberTone}
            style={
              {
                "--nexus-hero-accent-a": branding.accentPalette[0],
                "--nexus-hero-accent-b": branding.accentPalette[1],
                "--nexus-atmosphere-spotlight": atmosphere.spotlight,
              } as CSSProperties
            }
          >
            <div className="nexus-shell-hero__copy">
              {eyebrow ? <div className="nexus-shell-eyebrow">{eyebrow}</div> : null}
              <h1 className="nexus-shell-title">{title}</h1>
              {description ? (
                <p className="nexus-shell-description">{description}</p>
              ) : null}
              {actions ? <div className="nexus-shell-actions">{actions}</div> : null}
            </div>
            <div
              className="nexus-shell-hero__media"
              data-surface={surface}
              data-hero-composition={heroMedia.composition}
              data-frame-style={heroMedia.frameStyle}
              data-thumb-posture={heroMedia.thumbPosture}
              data-accent-beam={heroMedia.accentBeam}
              data-badge-mood={heroMedia.badgeMood}
              aria-hidden="true"
            >
              <div className="nexus-shell-hero__beam" />
              <div
                className="nexus-shell-hero__poster"
                data-poster-layering={heroMedia.posterLayering}
              >
                <Image
                  src={art.heroSrc}
                  alt={`${branding.visibleLabel} surface schematic`}
                  fill
                  sizes="(max-width: 880px) 100vw, 360px"
                  className="nexus-shell-hero__poster-image"
                  style={{ objectPosition: art.heroPosition }}
                />
                <div className="nexus-shell-hero__poster-grid" />
                <div className="nexus-shell-hero__poster-sweep" />
                <div className="nexus-shell-hero__poster-vignette" />
                <div
                  className="nexus-shell-hero__poster-badge"
                  data-badge-mood={heroMedia.badgeMood}
                >
                  {branding.heroKicker}
                </div>
              </div>
              <div
                className="nexus-shell-hero__thumbs"
                data-thumb-posture={heroMedia.thumbPosture}
              >
                {art.stack.map((image) => (
                  <div
                    key={`${surface}-${image.src}`}
                    className="nexus-shell-hero__thumb"
                    data-thumb-posture={heroMedia.thumbPosture}
                  >
                    <Image
                      src={image.src}
                      alt={`${branding.visibleLabel} supporting schematic`}
                      fill
                      sizes="96px"
                      className="nexus-shell-hero__thumb-image"
                      style={{ objectPosition: image.position }}
                    />
                  </div>
                ))}
              </div>
              <p
                className="nexus-shell-hero__note"
                data-frame-style={heroMedia.frameStyle}
                data-badge-mood={heroMedia.badgeMood}
              >
                {branding.note}
              </p>
            </div>
          </header>
          {children}
        </div>
      </div>
    </PageTransition>
  );
}

export function ShellStage({
  surface = "default",
  children,
}: {
  surface?: ShellSurface;
  children: ReactNode;
}) {
  const atmosphere = resolveSurfaceAtmosphereSpec(surface);
  const sequence = resolveSurfaceSequencePreset(surface);
  return (
    <div
      className={cn("nexus-shell-stage", `nexus-shell-stage--${surface}`)}
      data-chamber-tone={atmosphere.chamberTone}
      data-focus-bias={atmosphere.focusBias}
      data-ingress={sequence.ingress.kind}
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
        } as CSSProperties
      }
    >
      <div className="nexus-shell-stage__veil" aria-hidden="true" />
      <div className="nexus-shell-stage__focus" aria-hidden="true" />
      {children}
    </div>
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
}: {
  children: ReactNode;
  active?: boolean;
  onClick?: () => void;
  title?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
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
