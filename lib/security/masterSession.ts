import type { NextRequest } from "next/server";
import {
  buildStepUpRequiredResponse,
  readStepUpAuthState,
} from "@/lib/security/stepUpAuth";
import type {
  ProtectedActionKind,
  ToolCapabilityClass,
} from "@/lib/security/toolCapabilityPolicy";

/** Blocks phone-token sessions from sensitive mutations (step-up alone is not enough). */
export async function requireMasterSessionForAction(
  req: NextRequest,
  options: {
    action: ProtectedActionKind;
    capability?: ToolCapabilityClass;
  },
) {
  const state = await readStepUpAuthState(req);
  if (!state.sessionAuthenticated) {
    return buildStepUpRequiredResponse(false, options);
  }
  if (state.session?.authTier === "phone") {
    return buildStepUpRequiredResponse(true, {
      ...options,
      phoneTokenLimited: true,
    });
  }
  return null;
}
