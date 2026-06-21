export type MementoCyclePhase = "read" | "reflect" | "write";

export interface MementoCycleState {
  phase: MementoCyclePhase;
  readSignals: number;
  reflectSignals: number;
  writePending: boolean;
  summary: string;
  detail: string;
}

export function buildMementoCycleState(input: {
  passiveTrailCount: number;
  lastSessionSummary: string;
  pendingLesson: boolean;
  pendingCorrection: boolean;
  approvedCorrectionCount: number;
}): MementoCycleState {
  const readSignals =
    (input.lastSessionSummary.trim() ? 1 : 0) + input.passiveTrailCount;
  const reflectSignals =
    input.approvedCorrectionCount + (input.pendingCorrection ? 1 : 0);
  const writePending = input.pendingLesson || input.pendingCorrection;

  let phase: MementoCyclePhase = "read";
  if (writePending) phase = "write";
  else if (reflectSignals > 0) phase = "reflect";

  const summary =
    phase === "write"
      ? "Write gate — approve lesson or correction before widening scope"
      : phase === "reflect"
        ? "Reflect — approved corrections are shaping the next run"
        : "Read — session memory and passive trail loaded";

  const detail =
    phase === "write"
      ? input.pendingCorrection
        ? "A correction proposal is waiting for approval."
        : "A lesson proposal is waiting for approval."
      : phase === "reflect"
        ? `${reflectSignals} durable guidance signal${reflectSignals === 1 ? "" : "s"} active.`
        : `${readSignals} read signal${readSignals === 1 ? "" : "s"} from prior sessions.`;

  return {
    phase,
    readSignals,
    reflectSignals,
    writePending,
    summary,
    detail,
  };
}
