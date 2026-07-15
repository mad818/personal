"use client";

import type { MouseEvent } from "react";

export interface CommandHeaderProps {
  ctaHref: string;
  ctaLabel?: string;
}

type NavTarget = {
  id: string;
  label: string;
};

const NAV_TARGETS: readonly NavTarget[] = [
  { id: "nexus-landing-proclamation", label: "System" },
  { id: "nexus-landing-doctrine", label: "Surfaces" },
  { id: "nexus-landing-ingress", label: "Deploy" },
];

function scrollToZone(event: MouseEvent<HTMLButtonElement>, zoneId: string) {
  event.preventDefault();
  const target = document.getElementById(zoneId);
  if (!target) return;
  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  target.scrollIntoView({
    behavior: prefersReducedMotion ? "auto" : "smooth",
    block: "start",
  });
}

export default function CommandHeader({
  ctaHref,
  ctaLabel = "Enter Homefront",
}: CommandHeaderProps) {
  const ctaAriaLabel = `${ctaLabel}, ${
    ctaHref.startsWith("#") ? "go to access form" : "go to HQ"
  }`;

  return (
    <header
      className="nexus-landing-header"
      role="banner"
      data-testid="landing-header"
    >
      <div className="nexus-landing-header__inner">
        <div className="nexus-landing-header__brand">
          <svg
            className="nexus-landing-header__mark"
            viewBox="0 0 20 20"
            aria-hidden="true"
            focusable="false"
          >
            <path d="M3 3h3l8 11V3h3v14h-3L6 6v11H3z" fill="currentColor" />
          </svg>
          <div className="nexus-landing-header__brandCopy">
            <span className="nexus-landing-header__wordmark">Homefront</span>
            <span className="nexus-landing-header__designation">
              Local command shell
            </span>
          </div>
        </div>

        <nav
          className="nexus-landing-header__nav"
          aria-label="Jump to landing page section"
        >
          {NAV_TARGETS.map((target) => (
            <button
              key={target.id}
              type="button"
              className="nexus-landing-header__nav-link"
              onClick={(event) => scrollToZone(event, target.id)}
            >
              {target.label}
            </button>
          ))}
        </nav>

        <a
          href={ctaHref}
          className="nexus-landing-header__cta"
          aria-label={ctaAriaLabel}
          data-testid="landing-header-cta"
        >
          {ctaLabel}
        </a>
      </div>
    </header>
  );
}
