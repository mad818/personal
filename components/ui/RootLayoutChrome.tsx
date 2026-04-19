"use client";

import dynamic from "next/dynamic";
import { useEffect } from "react";
import { usePathname, useSelectedLayoutSegments } from "next/navigation";
import AuthGate from "@/components/auth/AuthGate";
import Nav from "@/components/nav/Nav";
import ErrorBoundary from "@/components/system/ErrorBoundary";
import ToastContainer from "@/components/ui/Toast";
import NotificationToastBridge from "@/components/ui/NotificationToastBridge";
import ParticleBackground from "@/components/ui/ParticleBackground";
import GlobalDataLoader from "@/components/ui/GlobalDataLoader";
import { ArticlesLoader } from "@/components/ui/DataLoader";
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

type RootLayoutChromeProps = {
  children: React.ReactNode;
  initiallyAuthed: boolean;
};

function applyMotionProfile(mediaQuery: MediaQueryList) {
  document.documentElement.setAttribute(
    "data-nexus-motion-profile",
    mediaQuery.matches ? "reduced" : "flagship",
  );
}

export default function RootLayoutChrome({
  children,
  initiallyAuthed,
}: RootLayoutChromeProps) {
  const pathname = usePathname();
  const segments = useSelectedLayoutSegments();
  const isPublicLanding =
    pathname === "/" || (pathname == null && segments.length === 0);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handleChange = () => applyMotionProfile(mediaQuery);
    handleChange();

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }

    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, []);

  if (isPublicLanding) {
    return <>{children}</>;
  }

  return (
    <>
      <ParticleBackground />
      <AuthGate initiallyAuthed={initiallyAuthed}>
        <ToastContainer>
          <ErrorBoundary label="RootLayout">
            <Nav />
            <main
              style={{
                paddingTop: "var(--top-rail-height)",
                minHeight: "100vh",
              }}
            >
              {children}
            </main>
            <GlobalDataLoader />
            <ArticlesLoader />
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
