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
    phoneTokenLimited?: boolean;
  } = {},
) {
  const protectedAction: ProtectedActionMeta = {
    action: options.action ?? "verification",
    capability: options.capability,
    status: "revalidate",
    blockedReason: options.phoneTokenLimited
      ? "phone_token_limited"
      : "step_up_required",
  };
  const response = protectedJson(
    {
      ok: false,
      code: options.phoneTokenLimited ? "phone_token_limited" : "step_up_required",
      error: options.phoneTokenLimited
        ? "This action needs the desktop NEXUS_TOKEN. Phone token sessions are limited to HQ chat and local AI."
        : "Sensitive action requires a fresh local revalidation before it can proceed.",
      sessionAuthenticated,
      stepUpActive: false,
      protectedAction,
    },
    { status: options.phoneTokenLimited ? 403 : 428 },
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
  if (state.session?.authTier === "phone") {
    return buildStepUpRequiredResponse(state.sessionAuthenticated, {
      ...options,
      phoneTokenLimited: true,
    });
  }
  if (state.stepUpActive) return null;
  return buildStepUpRequiredResponse(state.sessionAuthenticated, options);
}
