"use client";

import dynamic from "next/dynamic";
import { usePathname, useSelectedLayoutSegments } from "next/navigation";
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
const ChangeLogPanel = dynamic(
  () => import("@/components/ui/ChangeLogPanel"),
  { ssr: false },
);
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

export default function RootLayoutChrome({
  children,
  initiallyAuthed,
}: RootLayoutChromeProps) {
  const pathname = usePathname();
  const segments = useSelectedLayoutSegments();
  const isPublicLanding =
    pathname === "/" || (pathname == null && segments.length === 0);

  if (isPublicLanding) {
    return <>{children}</>;
  }

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
