import type { NextRequest } from "next/server";
import { protectedJson } from "@/lib/protectedApi";
import {
  getNexusSessionState,
  getNexusStepUpState,
  NEXUS_SESSION_COOKIE,
  NEXUS_STEP_UP_COOKIE,
} from "@/lib/authSession";
import {
  applyProtectedActionHeaders,
  type ProtectedActionMeta,
} from "@/lib/security/protectedActionTelemetry";
import type {
  ProtectedActionKind,
  ToolCapabilityClass,
} from "@/lib/security/toolCapabilityPolicy";

export async function readStepUpAuthState(req: NextRequest) {
  const sessionCookie = req.cookies.get(NEXUS_SESSION_COOKIE)?.value ?? "";
  const stepUpCookie = req.cookies.get(NEXUS_STEP_UP_COOKIE)?.value ?? "";
  const session = await getNexusSessionState(sessionCookie);
  const stepUp = await getNexusStepUpState(stepUpCookie, sessionCookie);

  return {
    session,
    stepUp,
    sessionAuthenticated: Boolean(session),
    stepUpActive: Boolean(stepUp),
  };
}

export async function requireStepUp(req: NextRequest) {
  const state = await readStepUpAuthState(req);
  if (state.stepUpActive) return null;

  return buildStepUpRequiredResponse(state.sessionAuthenticated);
}

export function buildStepUpRequiredResponse(
  sessionAuthenticated: boolean,
  options: {
    action?: ProtectedActionKind;
    capability?: ToolCapabilityClass;
  } = {},
) {
  const protectedAction: ProtectedActionMeta = {
    action: options.action ?? "verification",
    capability: options.capability,
    status: "revalidate",
    blockedReason: "step_up_required",
  };
  const response = protectedJson(
    {
      ok: false,
      code: "step_up_required",
      error:
        "Sensitive action requires a fresh local revalidation before it can proceed.",
      sessionAuthenticated,
      stepUpActive: false,
      protectedAction,
    },
    { status: 428 },
  );
  applyProtectedActionHeaders(response, protectedAction);
  return response;
}

export async function requireStepUpForAction(
  req: NextRequest,
  options: {
    action: ProtectedActionKind;
    capability?: ToolCapabilityClass;
  },
) {
  const state = await readStepUpAuthState(req);
  if (state.stepUpActive) return null;
  return buildStepUpRequiredResponse(state.sessionAuthenticated, options);
}
