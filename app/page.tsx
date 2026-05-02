// ── page ────────────────────────────────────────────────────
// App root: renders the public Nexus landing page.

import type { Metadata } from "next";
import { cookies } from "next/headers";
import LandingPage from "@/components/landing/LandingPage";
import {
  hasAuthenticatedNexusSession,
  isNexusAuthEnabled,
  NEXUS_SESSION_COOKIE,
} from "@/lib/authSession";

type RootPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const rootMetadataTitle = "Nexus Prime | AI-powered web design";
const rootMetadataDescription =
  "A cinematic AI-powered web design landing page with direct local-first Nexus operator access.";

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
    siteName: "Nexus Prime",
    images: [
      {
        url: "/office/la-skyline.jpg",
        width: 1200,
        height: 630,
        alt: "Dark cinematic Nexus Prime landing background.",
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
    />
  );
}
