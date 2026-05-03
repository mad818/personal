// ── page ────────────────────────────────────────────────────
// App root: renders the public Homefront landing page.

import type { Metadata } from "next";
import { cookies } from "next/headers";
import LandingPage from "@/components/landing/LandingPage";
import {
  hasAuthenticatedNexusSession,
  isNexusAuthEnabled,
  NEXUS_SESSION_COOKIE,
  sanitizeAuthReturnPath,
} from "@/lib/authSession";

type RootPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const rootMetadataTitle = "Homefront | Local-first command intelligence";
const rootMetadataDescription =
  "A local-first command room for markets, cyber, recon, vault memory, operator AI, and protected tools.";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://127.0.0.1:3100",
  ),
  title: rootMetadataTitle,
  description: rootMetadataDescription,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: rootMetadataTitle,
    description: rootMetadataDescription,
    url: "/",
    siteName: "Homefront",
    images: [
      {
        url: "/office/la-skyline.jpg",
        width: 1200,
        height: 630,
        alt: "Dark cinematic Homefront landing background.",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: rootMetadataTitle,
    description: rootMetadataDescription,
    images: ["/office/la-skyline.jpg"],
  },
};

function normalizeAuthError(rawValue?: string | string[]) {
  const value = Array.isArray(rawValue) ? rawValue[0] : rawValue;
  return value === "invalid" || value === "server" ? value : null;
}

function normalizeNextPath(rawValue?: string | string[]) {
  const value = Array.isArray(rawValue) ? rawValue[0] : rawValue;
  return sanitizeAuthReturnPath(value);
}

export default async function Root({ searchParams }: RootPageProps) {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(NEXUS_SESSION_COOKIE)?.value ?? "";
  const authEnabled = isNexusAuthEnabled();
  const isAuthenticated = await hasAuthenticatedNexusSession(sessionCookie);
  const resolvedSearchParams = searchParams ? await searchParams : {};

  return (
    <LandingPage
      authEnabled={authEnabled}
      authError={normalizeAuthError(resolvedSearchParams.authError)}
      isAuthenticated={isAuthenticated}
      nextPath={normalizeNextPath(resolvedSearchParams.next)}
    />
  );
}
