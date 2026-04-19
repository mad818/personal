// ── page ────────────────────────────────────────────────────
// App root: renders the public Nexus landing page.

import { cookies } from "next/headers";
import LandingPage from "@/components/landing/LandingPage";
import {
  isNexusAuthEnabled,
  matchesConfiguredNexusToken,
  NEXUS_SESSION_COOKIE,
} from "@/lib/authSession";

export default function Root() {
  const cookieStore = cookies();
  const sessionCookie = cookieStore.get(NEXUS_SESSION_COOKIE)?.value ?? "";
  const isAuthenticated =
    !isNexusAuthEnabled() || matchesConfiguredNexusToken(sessionCookie);

  return <LandingPage isAuthenticated={isAuthenticated} />;
}
