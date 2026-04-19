import Link from "next/link";

export interface IngressStripProps {
  ctaHref: string;
  ctaLabel?: string;
}

export default function IngressStrip({
  ctaHref,
  ctaLabel = "Enter Nexus",
}: IngressStripProps) {
  return (
    <section
      id="nexus-landing-ingress"
      className="nexus-landing-ingress nexus-landing-enter"
      aria-label="Landing ingress"
      data-testid="landing-ingress"
    >
      <div className="nexus-landing-ingress__inner">
        <p className="nexus-landing-ingress__meta">v0.1 · Internal beta</p>
        <Link
          href={ctaHref}
          className="nexus-landing-ingress__cta"
          data-testid="landing-ingress-cta"
        >
          {ctaLabel} →
        </Link>
        <p className="nexus-landing-ingress__trust">
          Local-first / BYOK / No telemetry
        </p>
      </div>
    </section>
  );
}
