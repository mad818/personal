"use client";

import { useMemo } from "react";
import { mementoPhaseColor } from "@/lib/designTokens";
import { buildMementoCycleState } from "@/lib/mementoCycle";
import { useStore } from "@/store/useStore";

interface MementoCycleStripProps {
  pendingLesson: boolean;
  pendingCorrection: boolean;
}

const PHASE_COLOR: Record<string, string> = {
  read: mementoPhaseColor("read"),
  reflect: mementoPhaseColor("reflect"),
  write: mementoPhaseColor("write"),
};

export default function MementoCycleStrip({
  pendingLesson,
  pendingCorrection,
}: MementoCycleStripProps) {
  const settings = useStore((s) => s.settings);
  const correctionMemories = useStore((s) => s.correctionMemories);
  const state = useMemo(
    () =>
      buildMementoCycleState({
        passiveTrailCount: 0, // passiveMemoryTrail not yet in Settings — wired in follow-up
        lastSessionSummary: settings.lastSessionSummary ?? "",
        pendingLesson,
        pendingCorrection,
        approvedCorrectionCount: correctionMemories.filter(
          (entry) => entry.status === "approved",
        ).length,
      }),
    [
      correctionMemories,
      pendingCorrection,
      pendingLesson,
      settings.lastSessionSummary,
    ],
  );

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "10px",
        border: "1px solid var(--border)",
        borderRadius: "10px",
        background: "var(--surf)",
        padding: "8px 12px",
      }}
    >
      <div>
        <div
          style={{ fontSize: "11px", fontWeight: 700, color: "var(--text)" }}
        >
          Memento cycle · {state.phase}
        </div>
        <div
          style={{ fontSize: "10px", color: "var(--text3)", marginTop: "2px" }}
        >
          {state.detail}
        </div>
      </div>
      <div style={{ display: "flex", gap: "6px" }}>
        {(["read", "reflect", "write"] as const).map((phase) => (
          <span
            key={phase}
            style={{
              fontSize: "9px",
              fontWeight: 700,
              textTransform: "uppercase",
              color:
                state.phase === phase ? PHASE_COLOR[phase] : "var(--text3)",
            }}
          >
            {phase}
          </span>
        ))}
      </div>
    </div>
  );
}
