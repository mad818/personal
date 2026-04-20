// ── page ────────────────────────────────────────────────────
// App root: renders the public Nexus landing page.

import { cookies } from "next/headers";
import LandingPage from "@/components/landing/LandingPage";
import {
  hasAuthenticatedNexusSession,
  NEXUS_SESSION_COOKIE,
} from "@/lib/authSession";

export default async function Root() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(NEXUS_SESSION_COOKIE)?.value ?? "";
  const isAuthenticated = await hasAuthenticatedNexusSession(sessionCookie);

  return <LandingPage isAuthenticated={isAuthenticated} />;
}
