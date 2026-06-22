import type {
  FreeLocalReadinessAction,
  FreeLocalReadinessSnapshot,
} from "@/lib/freeLocalReadiness";
import { resolveInferencePosture } from "@/lib/localInferencePosture";

export interface IntelOnlyPostureSnapshot {
  degraded: boolean;
  headline: string;
  detail: string;
  recoveryActions: FreeLocalReadinessAction[];
  requestedModel: string | null;
  resolvedModel: string | null;
  ollamaReachable: boolean;
}

export function deriveIntelOnlyPosture(
  snapshot: FreeLocalReadinessSnapshot | null | undefined,
): IntelOnlyPostureSnapshot {
  if (!snapshot) {
    return {
      degraded: true,
      headline: "Local AI status unknown",
      detail:
        "Intel dashboards stay available. Sign in and refresh local readiness to restore the agent.",
      recoveryActions: [],
      requestedModel: null,
      resolvedModel: null,
      ollamaReachable: false,
    };
  }

  const ollamaReachable = snapshot.ollama.reachable;
  const resolvedModel = snapshot.resolvedModel.resolvedModel;
  const requestedModel = snapshot.resolvedModel.requestedModel;
  const posture = resolveInferencePosture({
    networkMode:
      snapshot.networkMode.mode === "isolated" ||
      snapshot.networkMode.mode === "internal" ||
      snapshot.networkMode.mode === "connected"
        ? snapshot.networkMode.mode
        : "isolated",
    paidApisAllowed: snapshot.paidApisAllowed.allowed,
    ollamaReachable,
    resolvedModel,
  });
  const degraded = posture === "degraded";

  return {
    degraded,
    headline: degraded
      ? "Intel-only mode — local Ollama required for agent chat"
      : "Local AI ready",
    detail: degraded
      ? snapshot.ollama.detail ||
        "Start Ollama, install a model, then use Check local AI. Maps, feeds, and intel tabs remain available."
      : snapshot.resolvedModel.detail ||
        `Resolved model ${resolvedModel ?? requestedModel ?? "unknown"}.`,
    recoveryActions: snapshot.recoveryActions,
    requestedModel,
    resolvedModel,
    ollamaReachable,
  };
}
