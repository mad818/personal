import CommandHeader from "./CommandHeader";
import DoctrineZone from "./DoctrineZone";
import IngressStrip from "./IngressStrip";
import ProclamationZone from "./ProclamationZone";

export interface LandingPageProps {
  isAuthenticated: boolean;
}

export default function LandingPage({ isAuthenticated }: LandingPageProps) {
  const ctaHref = "/hq";
  const ctaLabel = isAuthenticated ? "Continue to HQ" : "Launch Nexus";

  return (
    <main
      className="nexus-landing-page"
      aria-label="Nexus public landing"
      data-testid="landing-page"
    >
      <CommandHeader ctaHref={ctaHref} ctaLabel={ctaLabel} />
      <ProclamationZone ctaHref={ctaHref} ctaLabel={ctaLabel} />
      <DoctrineZone />
      <IngressStrip ctaHref={ctaHref} ctaLabel={ctaLabel} />
    </main>
  );
}
