"use client";

import Image from "next/image";
import type { CSSProperties, ReactNode } from "react";
import { clsx } from "clsx";
import PageTransition from "@/components/ui/PageTransition";
import { getSurfaceBranding } from "@/lib/brand";

type ShellWidth = "standard" | "wide" | "full";
type ShellSurface =
  | "default"
  | "hq"
  | "command"
  | "intel"
  | "alpha"
  | "cyber"
  | "recon"
  | "vault"
  | "vehicle"
  | "resources";

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

  return (
    <PageTransition>
      <div className={clsx("nexus-shell-stage", `nexus-shell-stage--${surface}`)}>
        <div className="nexus-shell-stage__veil" aria-hidden="true" />
        <div className={clsx("nexus-shell-page", shellWidthClass(width))}>
          <header className="nexus-shell-hero">
            <div className="nexus-shell-hero__copy">
              {eyebrow ? <div className="nexus-shell-eyebrow">{eyebrow}</div> : null}
              <h1 className="nexus-shell-title">{title}</h1>
              {description ? (
                <p className="nexus-shell-description">{description}</p>
              ) : null}
              {actions ? <div className="nexus-shell-actions">{actions}</div> : null}
            </div>
            <div className="nexus-shell-hero__media" aria-hidden="true">
              <div className="nexus-shell-hero__poster">
                <Image
                  src={art.heroSrc}
                  alt={`${branding.visibleLabel} surface schematic`}
                  fill
                  sizes="(max-width: 880px) 100vw, 360px"
                  className="nexus-shell-hero__poster-image"
                  style={{ objectPosition: art.heroPosition }}
                />
                <div className="nexus-shell-hero__poster-vignette" />
                <div className="nexus-shell-hero__poster-badge">{branding.heroKicker}</div>
              </div>
              <div className="nexus-shell-hero__thumbs">
                {art.stack.map((image) => (
                  <div key={`${surface}-${image.src}`} className="nexus-shell-hero__thumb">
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
              <p className="nexus-shell-hero__note">{branding.note}</p>
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
  return (
    <div className={clsx("nexus-shell-stage", `nexus-shell-stage--${surface}`)}>
      <div className="nexus-shell-stage__veil" aria-hidden="true" />
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
      className={clsx(
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
      className={clsx("nexus-shell-stack", className)}
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
      className={clsx("nexus-shell-grid", className)}
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
    <span className={clsx("nexus-shell-badge", tone !== "default" && `nexus-shell-badge--${tone}`)}>
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
      className={clsx("nexus-shell-button", active && "is-active", className)}
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
          className={clsx(
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
