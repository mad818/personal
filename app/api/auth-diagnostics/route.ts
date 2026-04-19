import { NextRequest, NextResponse } from "next/server";
import {
  applyAuthNoStoreHeaders,
  getConfiguredNexusToken,
  getNexusSessionState,
  getNexusStepUpState,
  isNexusAuthEnabled,
  NEXUS_STEP_UP_COOKIE,
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
  const stepUpCookie = req.cookies.get(NEXUS_STEP_UP_COOKIE)?.value ?? "";
  const sessionState = await getNexusSessionState(sessionCookie);
  const stepUpState = await getNexusStepUpState(stepUpCookie, sessionCookie);
  const authenticated = Boolean(sessionState);

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
      stepUpActive: authEnabled ? Boolean(stepUpState) : true,
      sessionRemainingSeconds: sessionState?.remainingSeconds ?? null,
      stepUpRemainingSeconds: stepUpState?.remainingSeconds ?? null,
      mode: !authEnabled
        ? "open-no-token"
        : authenticated
          ? "cookie-session"
          : "locked",
      cookiePresent: Boolean(sessionCookie),
    },
    release: {
      defaultEntrypoint: getDefaultEntrypoint(),
      uiShellVersion: RELEASE_DEFAULTS.uiShellVersion,
    },
  });

  applyAuthNoStoreHeaders(response.headers);
  return response;
}
