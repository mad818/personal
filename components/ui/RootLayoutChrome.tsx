"use client";

import dynamic from "next/dynamic";
import { useEffect, type MouseEvent } from "react";
import {
  usePathname,
  useSearchParams,
  useSelectedLayoutSegments,
} from "next/navigation";
import AuthGate from "@/components/auth/AuthGate";
import { DynamicAlerts } from "@/components/home/DynamicAlerts";
import UIRulesEvaluator from "@/components/home/UIRulesEvaluator";
import Nav from "@/components/nav/Nav";
import ErrorBoundary from "@/components/system/ErrorBoundary";
import NotificationToastBridge from "@/components/ui/NotificationToastBridge";
import ParticleBackground from "@/components/ui/ParticleBackground";
import PersistedShellStateNotice from "@/components/ui/PersistedShellStateNotice";
import PreparedWorkspaceAutoHeal from "@/components/ui/PreparedWorkspaceAutoHeal";
import RuntimePolicyCookieSync from "@/components/ui/RuntimePolicyCookieSync";
import ShellHealthGuard from "@/components/ui/ShellHealthGuard";
import ShellHydrationBeacon from "@/components/ui/ShellHydrationBeacon";
import ToastContainer from "@/components/ui/Toast";
import {
  CINEMATIC_IA_VERSION,
  getCinematicIASurfaceForPath,
  isGACinematicSurface,
} from "@/lib/cinematicIA";
import { BRAND_NAME, getSurfaceBranding } from "@/lib/brand";
import { getDefaultEntrypoint } from "@/lib/releaseMatrix";
import ShellBackgroundServices from "@/components/ui/ShellBackgroundServices";
import PhonePostureSync from "@/components/ui/PhonePostureSync";
import HqOperatorLayoutSync from "@/components/ui/HqOperatorLayoutSync";
import LocalUsageTracker from "@/components/ui/LocalUsageTracker";

const CommandBar = dynamic(() => import("@/components/ui/CommandBar"), {
  ssr: false,
});
const ProposedEditPanel = dynamic(
  () => import("@/components/ui/ProposedEditPanel"),
  { ssr: false },
);
const ChangeLogPanel = dynamic(() => import("@/components/ui/ChangeLogPanel"), {
  ssr: false,
});
const ClickDebug = dynamic(() => import("@/components/ui/ClickDebug"), {
  ssr: false,
});
type RootLayoutChromeProps = {
  children: React.ReactNode;
  initiallyAuthed: boolean;
};

function SkipToMainContent() {
  const focusMainContent = (event: MouseEvent<HTMLAnchorElement>) => {
    const main = document.getElementById("nexus-main-content");
    if (!main) return;
    event.preventDefault();
    main.focus({ preventScroll: true });
    main.scrollIntoView({ block: "start" });
    window.history.replaceState(null, "", "#nexus-main-content");
  };

  return (
    <a
      className="nexus-skip-link"
      data-testid="nexus-skip-link"
      href="#nexus-main-content"
      onClick={focusMainContent}
    >
      Skip to main content
    </a>
  );
}

function RouteAnnouncement({ label }: { label: string }) {
  return (
    <p aria-atomic="true" aria-live="polite" className="sr-only" role="status">
      {label}
    </p>
  );
}

function LandingAccessRedirect({
  pathname,
  search,
}: {
  pathname: string | null;
  search: string;
}) {
  useEffect(() => {
    const targetPath =
      pathname && pathname !== "/" ? pathname : getDefaultEntrypoint();
    const returnPath = `${targetPath}${search ? `?${search}` : ""}${window.location.hash}`;
    const landingUrl = new URL("/", window.location.origin);
    landingUrl.searchParams.set("next", returnPath);
    landingUrl.hash = "agency-access";
    window.location.replace(landingUrl.toString());
  }, [pathname, search]);

  return (
    <main
      id="nexus-main-content"
      tabIndex={-1}
      aria-label="Homefront access redirect"
      className="homefront-landing min-h-screen bg-black text-white"
      data-testid="landing-access-redirect"
      style={{
        alignItems: "center",
        display: "flex",
        fontFamily: "system-ui, sans-serif",
        justifyContent: "center",
      }}
    >
      Opening Homefront access...
    </main>
  );
}

export default function RootLayoutChrome({
  children,
  initiallyAuthed,
}: RootLayoutChromeProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const segments = useSelectedLayoutSegments();
  const currentSearch = searchParams.toString();
  const isPublicLanding =
    pathname === "/" || (pathname == null && segments.length === 0);
  const cinematicSurface = getCinematicIASurfaceForPath(pathname);
  const routeBranding = getSurfaceBranding(cinematicSurface.surface);

  useEffect(() => {
    const nextTitle = isPublicLanding
      ? BRAND_NAME
      : `${routeBranding.visibleLabel} · ${BRAND_NAME}`;
    if (document.title !== nextTitle) document.title = nextTitle;
  }, [isPublicLanding, routeBranding.visibleLabel]);

  if (isPublicLanding) {
    return (
      <>
        <SkipToMainContent />
        <RouteAnnouncement label="Homefront landing loaded" />
        {children}
      </>
    );
  }

  if (!initiallyAuthed) {
    return (
      <>
        <SkipToMainContent />
        <RouteAnnouncement label="Opening Homefront access" />
        <LandingAccessRedirect pathname={pathname} search={currentSearch} />
      </>
    );
  }

  const isGaSurface = isGACinematicSurface(cinematicSurface.surface);

  return (
    <>
      <ParticleBackground />
      <PhonePostureSync />
      <HqOperatorLayoutSync />
      <AuthGate initiallyAuthed={initiallyAuthed}>
        <LocalUsageTracker />
        <RuntimePolicyCookieSync />
        <ShellHydrationBeacon />
        <ToastContainer>
          <ErrorBoundary label="RootLayout">
            <SkipToMainContent />
            <RouteAnnouncement
              label={`${routeBranding.visibleLabel} workspace loaded`}
            />
            <Nav />
            <UIRulesEvaluator />
            <DynamicAlerts />
            <PersistedShellStateNotice />
            <PreparedWorkspaceAutoHeal />
            <ShellHealthGuard />
            <main
              id="nexus-main-content"
              tabIndex={-1}
              aria-label={`${routeBranding.visibleLabel} workspace`}
              className="nexus-root-main"
              data-cinematic-ia={CINEMATIC_IA_VERSION}
              data-cinematic-surface={cinematicSurface.surface}
              data-cinematic-posture={cinematicSurface.posture}
              data-cinematic-ga={isGaSurface ? "true" : "false"}
              data-cinematic-hierarchy={cinematicSurface.hierarchy}
              style={{
                paddingTop: "var(--top-rail-height)",
                minHeight: "100vh",
              }}
            >
              {children}
            </main>
            <ShellBackgroundServices pathname={pathname} />
            <NotificationToastBridge />
            <CommandBar />
            <ClickDebug />
            <ProposedEditPanel />
            <ChangeLogPanel />
          </ErrorBoundary>
        </ToastContainer>
      </AuthGate>
    </>
  );
}
