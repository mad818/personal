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
  isNexusAuthEnabled,
  matchesConfiguredNexusToken,
  NEXUS_SESSION_COOKIE,
} from "@/lib/authSession";
import RootLayoutChrome from "@/components/ui/RootLayoutChrome";

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
        <RootLayoutChrome initiallyAuthed={initiallyAuthed}>
          {children}
        </RootLayoutChrome>
      </body>
    </html>
  );
}
