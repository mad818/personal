// ── page ────────────────────────────────────────────────────
// App root: renders the public Nexus landing page.

import { cookies } from "next/headers";
import LandingPage from "@/components/landing/LandingPage";
import {
  hasAuthenticatedNexusSession,
  isNexusAuthEnabled,
  NEXUS_SESSION_COOKIE,
} from "@/lib/authSession";

export default async function Root() {
  const cookieStore = cookies();
  const sessionCookie = cookieStore.get(NEXUS_SESSION_COOKIE)?.value ?? "";
  const isAuthenticated =
    !isNexusAuthEnabled() || (await hasAuthenticatedNexusSession(sessionCookie));

  return <LandingPage isAuthenticated={isAuthenticated} />;
}
