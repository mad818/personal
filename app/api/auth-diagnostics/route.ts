import { NextRequest, NextResponse } from "next/server";
import {
  applyAuthNoStoreHeaders,
  getConfiguredNexusToken,
  isNexusAuthEnabled,
} from "@/lib/authSession";
import { getDefaultEntrypoint, RELEASE_DEFAULTS } from "@/lib/releaseMatrix";
import { readRuntimeIdentity } from "@/lib/runtimeIdentity";
import {
  readProtectedActionContext,
  resolveProtectedActionDescriptor,
} from "@/lib/security/toolCapabilityPolicy";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const runtime = readRuntimeIdentity();
  const configuredToken = getConfiguredNexusToken();
  const authEnabled = isNexusAuthEnabled();
  const trustContext = await readProtectedActionContext(req);

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
      authenticated: authEnabled ? trustContext.sessionAuthenticated : true,
      stepUpActive: authEnabled ? trustContext.stepUpActive : true,
      sessionRemainingSeconds: trustContext.session?.remainingSeconds ?? null,
      stepUpRemainingSeconds: trustContext.stepUp?.remainingSeconds ?? null,
    },
    trust: {
      networkMode: trustContext.networkMode,
      highRiskEnabled: trustContext.highRiskEnabled,
      connectorExposure: {
        enabled: trustContext.connectorEnabled,
        total: trustContext.connectorTotal,
      },
      protectedActions: {
        settingsWrites: resolveProtectedActionDescriptor(
          "settings_writes",
          trustContext,
        ),
        verification: resolveProtectedActionDescriptor("verification", trustContext),
        mutateExecTools: resolveProtectedActionDescriptor(
          "tools_mutate_exec",
          trustContext,
        ),
        networkedTools: resolveProtectedActionDescriptor(
          "tools_networked",
          trustContext,
        ),
      },
    },
    release: {
      defaultEntrypoint: getDefaultEntrypoint(),
      uiShellVersion: RELEASE_DEFAULTS.uiShellVersion,
    },
  });

  applyAuthNoStoreHeaders(response.headers);
  return response;
}
