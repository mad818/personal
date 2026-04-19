import Link from "next/link";
import AtmosphereLayer from "./AtmosphereLayer";
import SurfaceGrid from "./SurfaceGrid";

export interface ProclamationZoneProps {
  ctaHref: string;
  ctaLabel?: string;
}

export default function ProclamationZone({
  ctaHref,
  ctaLabel = "Launch Nexus",
}: ProclamationZoneProps) {
  return (
    <section
      id="nexus-landing-proclamation"
      className="nexus-landing-proclamation"
      aria-labelledby="nexus-landing-headline"
      data-testid="landing-proclamation"
    >
      <AtmosphereLayer />
      <div className="nexus-landing-proclamation__scan" aria-hidden="true" />

      <div className="nexus-landing-proclamation__content">
        <div className="nexus-landing-proclamation__frame">
          <div className="nexus-landing-proclamation__meta nexus-landing-enter">
            <span className="nexus-landing-proclamation__metaTag">
              Public ingress
            </span>
            <span className="nexus-landing-proclamation__metaDivider" />
            <span className="nexus-landing-proclamation__metaTag">
              08 operational surfaces
            </span>
          </div>

          <p className="nexus-landing-proclamation__eyebrow nexus-landing-enter">
            Nexus Prime
          </p>

          <h1
            id="nexus-landing-headline"
            className="nexus-landing-proclamation__headline nexus-landing-enter"
          >
            Intelligence, command, and continuity in one local-first workspace.
          </h1>

          <p className="nexus-landing-proclamation__subdoctrine nexus-landing-enter">
            Runs on your machine. Markets, intel, cyber, recon, and vault stay
            under your keys.
          </p>

          <div className="nexus-landing-proclamation__ctaGroup nexus-landing-enter">
            <Link
              href={ctaHref}
              className="nexus-landing-proclamation__primary"
              aria-label={`${ctaLabel}, go to HQ`}
              data-testid="landing-hero-cta"
            >
              {ctaLabel}
            </Link>
            <a
              href="#nexus-landing-doctrine"
              className="nexus-landing-proclamation__secondary"
            >
              View doctrine →
            </a>
          </div>
        </div>
      </div>

      <SurfaceGrid />
    </section>
  );
}
