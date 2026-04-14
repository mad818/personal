// ── layout ──────────────────────────────────────────────────
// Root layout: global styles, auth gate, navigation, health monitor.

import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import dynamic from "next/dynamic";
import "./globals.css";
import "leaflet/dist/leaflet.css";
import {
  assertNexusDoesNotChargeUsers,
  NEXUS_FREE_USE_DESCRIPTION,
} from "@/lib/productGuarantees";
import { BRAND_DESCRIPTOR, BRAND_NAME } from "@/lib/brand";
import {
  isNexusAuthEnabled,
  matchesConfiguredNexusToken,
  NEXUS_SESSION_COOKIE,
} from "@/lib/authSession";
import Nav from "@/components/nav/Nav";
import AuthGate from "@/components/auth/AuthGate";
import GlobalDataLoader from "@/components/ui/GlobalDataLoader";
import { ArticlesLoader } from "@/components/ui/DataLoader";
import CronSchedulerRunner from "@/components/ui/CronSchedulerRunner";
import ErrorBoundary from "@/components/system/ErrorBoundary";
import ToastContainer from "@/components/ui/Toast";
import NotificationToastBridge from "@/components/ui/NotificationToastBridge";
import ParticleBackground from "@/components/ui/ParticleBackground";
import PersistedShellStateBootScript from "@/components/ui/PersistedShellStateBootScript";
import PersistedShellStateNotice from "@/components/ui/PersistedShellStateNotice";
import PreparedWorkspaceAutoHeal from "@/components/ui/PreparedWorkspaceAutoHeal";
import RuntimePolicyCookieSync from "@/components/ui/RuntimePolicyCookieSync";
import ShellHealthGuard from "@/components/ui/ShellHealthGuard";
import ShellHydrationBeacon from "@/components/ui/ShellHydrationBeacon";
import {
  buildShellBootstrapGuardScript,
  getCriticalShellCss,
} from "@/lib/shellBootstrapGuard";

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

assertNexusDoesNotChargeUsers();

export const metadata: Metadata = {
  title: BRAND_NAME,
  description: `${NEXUS_FREE_USE_DESCRIPTION} ${BRAND_DESCRIPTOR}`,
  manifest: "/manifest.json",
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml", sizes: "512x512" }],
    apple: [{ url: "/icon.svg", sizes: "180x180" }],
  },
  appleWebApp: {
    capable: true,
    title: BRAND_NAME,
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0708",
  width: "device-width",
  initialScale: 1,
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = cookies();
  const sessionCookie = cookieStore.get(NEXUS_SESSION_COOKIE)?.value ?? "";
  const initiallyAuthed =
    !isNexusAuthEnabled() || matchesConfiguredNexusToken(sessionCookie);

  return (
    <html lang="en">
      <body>
        <style
          id="nexus-critical-shell-css"
          dangerouslySetInnerHTML={{ __html: getCriticalShellCss() }}
          suppressHydrationWarning
        />
        <PersistedShellStateBootScript />
        <script
          id="nexus-shell-bootstrap-guard"
          dangerouslySetInnerHTML={{ __html: buildShellBootstrapGuardScript() }}
          suppressHydrationWarning
        />
        <ParticleBackground />
        <AuthGate initiallyAuthed={initiallyAuthed}>
          <RuntimePolicyCookieSync />
          <ShellHydrationBeacon />
          <ToastContainer>
            <ErrorBoundary label="RootLayout">
              <Nav />
              <PersistedShellStateNotice />
              <PreparedWorkspaceAutoHeal />
              <ShellHealthGuard />
              <main style={{ paddingTop: "var(--top-rail-height)", minHeight: "100vh" }}>
                {children}
              </main>
              {/* Global data — loads articles + keyword alerts on every page */}
              <GlobalDataLoader />
              <ArticlesLoader />
              <MemorySpineSync />
              <CronSchedulerRunner />
              <NotificationToastBridge />
              {/* Global command dock — persists across all tabs */}
              <CommandBar />
              <ClickDebug />
              {/* Proposed edit overlay — agent proposes, user approves/rejects */}
              <ProposedEditPanel />
              {/* Audit trail — all applied/rejected changes */}
              <ChangeLogPanel />
            </ErrorBoundary>
          </ToastContainer>
        </AuthGate>
      </body>
    </html>
  );
}
