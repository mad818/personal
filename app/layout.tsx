// ── layout ──────────────────────────────────────────────────
// Root layout: global styles, auth gate, navigation, health monitor.

import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import "./globals.css";
import "leaflet/dist/leaflet.css";
import {
  assertNexusDoesNotChargeUsers,
  NEXUS_FREE_USE_DESCRIPTION,
} from "@/lib/productGuarantees";
import { BRAND_DESCRIPTOR, BRAND_NAME } from "@/lib/brand";
import {
  hasAuthenticatedNexusSession,
  isNexusAuthEnabled,
  NEXUS_SESSION_COOKIE,
} from "@/lib/authSession";
import PersistedShellStateBootScript from "@/components/ui/PersistedShellStateBootScript";
import RootLayoutChrome from "@/components/ui/RootLayoutChrome";
import SurfaceMotionBootScript from "@/components/ui/SurfaceMotionBootScript";
import {
  buildShellBootstrapGuardScript,
  getCriticalShellCss,
} from "@/lib/shellBootstrapGuard";

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

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = cookies();
  const sessionCookie = cookieStore.get(NEXUS_SESSION_COOKIE)?.value ?? "";
  const initiallyAuthed =
    !isNexusAuthEnabled() || (await hasAuthenticatedNexusSession(sessionCookie));

  return (
    <html lang="en">
      <body>
        <style
          id="nexus-critical-shell-css"
          dangerouslySetInnerHTML={{ __html: getCriticalShellCss() }}
          suppressHydrationWarning
        />
        <PersistedShellStateBootScript />
        <SurfaceMotionBootScript />
        <script
          id="nexus-shell-bootstrap-guard"
          dangerouslySetInnerHTML={{ __html: buildShellBootstrapGuardScript() }}
          suppressHydrationWarning
        />
        <RootLayoutChrome initiallyAuthed={initiallyAuthed}>
          {children}
        </RootLayoutChrome>
      </body>
    </html>
  );
}
