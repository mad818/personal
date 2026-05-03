"use client";

import dynamic from "next/dynamic";
import { useEffect } from "react";
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
import { getDefaultEntrypoint } from "@/lib/releaseMatrix";
import GlobalDataLoader from "@/components/ui/GlobalDataLoader";
import {
  ArticlesLoader,
  CVEsLoader,
  FearGreedLoader,
  PricesLoader,
  WorldRiskLoader,
} from "@/components/ui/DataLoader";
import CronSchedulerRunner from "@/components/ui/CronSchedulerRunner";

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
const MemorySpineSync = dynamic(
  () => import("@/components/ui/MemorySpineSync"),
  { ssr: false },
);

type RootLayoutChromeProps = {
  children: React.ReactNode;
  initiallyAuthed: boolean;
};

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

  if (isPublicLanding) {
    return <>{children}</>;
  }

  if (!initiallyAuthed) {
    return <LandingAccessRedirect pathname={pathname} search={currentSearch} />;
  }

  const cinematicSurface = getCinematicIASurfaceForPath(pathname);
  const isGaSurface = isGACinematicSurface(cinematicSurface.surface);

  return (
    <>
      <ParticleBackground />
      <AuthGate initiallyAuthed={initiallyAuthed}>
        <RuntimePolicyCookieSync />
        <ShellHydrationBeacon />
        <ToastContainer>
          <ErrorBoundary label="RootLayout">
            <Nav />
            <UIRulesEvaluator />
            <DynamicAlerts />
            <PersistedShellStateNotice />
            <PreparedWorkspaceAutoHeal />
            <ShellHealthGuard />
            <main
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
            <GlobalDataLoader />
            <PricesLoader />
            <ArticlesLoader />
            <FearGreedLoader />
            <CVEsLoader />
            <WorldRiskLoader />
            <MemorySpineSync />
            <CronSchedulerRunner />
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
