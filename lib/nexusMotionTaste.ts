// Project-owned motion decision contract.
// Keep this pure so build-time validation can exercise the same rules as UI work.

export type MotionFrequency = "constant" | "frequent" | "occasional" | "rare";
export type MotionPurpose =
  | "feedback"
  | "spatial"
  | "state"
  | "jarring-change"
  | "explanation"
  | "delight"
  | "decoration";
export type MotionInputMode = "keyboard" | "pointer" | "passive";
export type MotionSurfaceKind = "data" | "control" | "overlay" | "marketing";

export interface NexusMotionDecisionInput {
  frequency: MotionFrequency;
  purpose: MotionPurpose;
  inputMode: MotionInputMode;
  surface: MotionSurfaceKind;
}

export interface NexusMotionDecision {
  allowed: boolean;
  durationBudgetMs: number;
  reason: string;
}

export const NEXUS_MOTION_DURATION_BUDGETS_MS = Object.freeze({
  immediateFeedback: 160,
  frequent: 180,
  occasional: 300,
  rareOverlay: 500,
});

export function decideNexusMotion(
  input: NexusMotionDecisionInput,
): NexusMotionDecision {
  if (
    input.inputMode === "keyboard" &&
    (input.frequency === "constant" || input.frequency === "frequent")
  ) {
    return {
      allowed: false,
      durationBudgetMs: 0,
      reason: "High-frequency keyboard work must remain immediate.",
    };
  }

  if (input.purpose === "decoration" && input.surface === "data") {
    return {
      allowed: false,
      durationBudgetMs: 0,
      reason: "Decorative movement must not compete with live data.",
    };
  }

  if (
    input.purpose === "delight" &&
    (input.frequency !== "rare" || input.surface !== "marketing")
  ) {
    return {
      allowed: false,
      durationBudgetMs: 0,
      reason: "Delight motion is reserved for rare, non-operational moments.",
    };
  }

  if (
    input.purpose === "explanation" &&
    input.frequency !== "rare" &&
    input.surface !== "marketing"
  ) {
    return {
      allowed: false,
      durationBudgetMs: 0,
      reason: "Long explanatory motion does not belong in repeated operations.",
    };
  }

  if (input.frequency === "rare" && input.surface === "overlay") {
    return {
      allowed: true,
      durationBudgetMs: NEXUS_MOTION_DURATION_BUDGETS_MS.rareOverlay,
      reason: "A rare spatial overlay may use the expanded transition budget.",
    };
  }

  if (input.frequency === "occasional") {
    return {
      allowed: true,
      durationBudgetMs: NEXUS_MOTION_DURATION_BUDGETS_MS.occasional,
      reason:
        "Occasional state changes may animate when the property is scoped.",
    };
  }

  return {
    allowed: true,
    durationBudgetMs:
      input.purpose === "feedback"
        ? NEXUS_MOTION_DURATION_BUDGETS_MS.immediateFeedback
        : NEXUS_MOTION_DURATION_BUDGETS_MS.frequent,
    reason: "Frequent motion stays brief and tied to feedback or state.",
  };
}
