import { NextRequest, NextResponse } from "next/server";
import {
  applyAuthNoStoreHeaders,
  getConfiguredNexusToken,
  isNexusAuthEnabled,
  matchesConfiguredNexusToken,
  NEXUS_SESSION_COOKIE,
} from "@/lib/authSession";
import { getDefaultEntrypoint, RELEASE_DEFAULTS } from "@/lib/releaseMatrix";
import { readRuntimeIdentity } from "@/lib/runtimeIdentity";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const runtime = readRuntimeIdentity();
  const configuredToken = getConfiguredNexusToken();
  const authEnabled = isNexusAuthEnabled();
  const sessionCookie = req.cookies.get(NEXUS_SESSION_COOKIE)?.value ?? "";
  const authenticated = matchesConfiguredNexusToken(sessionCookie);

  const response = NextResponse.json({
    ok: true,
    runtime: {
      online: true,
      bootId: runtime.bootId,
      startedAt: runtime.startedAt,
      ageSeconds: runtime.ageSeconds,
    },
    auth: {
      tokenConfigured: Boolean(configuredToken),
      authenticated: authEnabled ? authenticated : true,
    },
    release: {
      defaultEntrypoint: getDefaultEntrypoint(),
      uiShellVersion: RELEASE_DEFAULTS.uiShellVersion,
    },
  });

  applyAuthNoStoreHeaders(response.headers);
  return response;
}
