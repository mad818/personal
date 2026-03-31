"use client";

// ── PhaseStrip.tsx ─────────────────────────────────────────────────────────────
// Horizontal operational phase indicator — shows where the AI currently is
// in its reasoning cycle. Updates in real time via Zustand.
// Design: openclaw VT323 font, #0D1220 background, cyan/green accent.

import { useStore, type OperationalPhase } from "@/store/useStore";
import { useEffect, useState } from "react";

const PHASES: { id: OperationalPhase; label: string; icon: string }[] = [
  { id: "interpreting", label: "INTERPRET", icon: "👁" },
  { id: "planning", label: "PLAN", icon: "🗺" },
  { id: "executing", label: "EXECUTE", icon: "⚡" },
  { id: "validating", label: "VALIDATE", icon: "✓" },
  { id: "responding", label: "RESPOND", icon: "📡" },
  { id: "done", label: "DONE", icon: "✅" },
];

const PHASE_ORDER: OperationalPhase[] = [
  "idle",
  "interpreting",
  "planning",
  "executing",
  "validating",
  "responding",
  "done",
];

function phaseIndex(p: OperationalPhase): number {
  return PHASE_ORDER.indexOf(p);
}

function ElapsedTimer({ startedAt }: { startedAt: number }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setElapsed(Date.now() - startedAt), 500);
    return () => clearInterval(t);
  }, [startedAt]);
  const s = Math.floor(elapsed / 1000);
  if (s === 0) return null;
  return (
    <span
      style={{
        fontSize: "10px",
        fontFamily: "'VT323', monospace",
        color: "#4a5568",
        marginLeft: "8px",
      }}
    >
      {s}s
    </span>
  );
}

export default function PhaseStrip() {
  const currentPhase = useStore((s) => s.currentPhase);
  const phaseStartedAt = useStore((s) => s.phaseStartedAt);

  if (currentPhase === "idle") return null;

  const curIdx = phaseIndex(currentPhase);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0",
        padding: "5px 16px",
        background: "#0a0e1a",
        borderBottom: "1px solid #1A2040",
        overflowX: "auto",
        flexShrink: 0,
      }}
    >
      {/* Label */}
      <span
        style={{
          fontSize: "9px",
          fontFamily: "'VT323', monospace",
          color: "#304060",
          letterSpacing: "2px",
          marginRight: "12px",
          whiteSpace: "nowrap",
        }}
      >
        OP:
      </span>

      {PHASES.map((ph, i) => {
        const phIdx = phaseIndex(ph.id);
        const isDone = curIdx > phIdx;
        const isActive = currentPhase === ph.id;
        const isPending = curIdx < phIdx;

        const color = isDone ? "#00FF6688" : isActive ? "#00DDFF" : "#1A2040";

        return (
          <div key={ph.id} style={{ display: "flex", alignItems: "center" }}>
            {/* Phase node */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
                padding: "2px 7px",
                borderRadius: "3px",
                background: isActive
                  ? "rgba(0,221,255,0.08)"
                  : isDone
                    ? "rgba(0,255,102,0.04)"
                    : "transparent",
                border: isActive
                  ? "1px solid #00DDFF44"
                  : isDone
                    ? "1px solid #00FF6622"
                    : "1px solid transparent",
                transition: "all .3s",
                animation: isActive
                  ? "pulse-dot 1.5s ease-in-out infinite"
                  : "none",
              }}
            >
              <span style={{ fontSize: "9px", opacity: isPending ? 0.2 : 0.9 }}>
                {isDone ? "✓" : ph.icon}
              </span>
              <span
                style={{
                  fontSize: "9px",
                  fontFamily: "'VT323', monospace",
                  color,
                  letterSpacing: "1px",
                  whiteSpace: "nowrap",
                }}
              >
                {ph.label}
              </span>
            </div>

            {/* Connector line */}
            {i < PHASES.length - 1 && (
              <div
                style={{
                  width: "16px",
                  height: "1px",
                  background:
                    isDone && phaseIndex(PHASES[i + 1].id) <= curIdx
                      ? "#00FF6644"
                      : "#1A2040",
                  transition: "background .5s",
                }}
              />
            )}
          </div>
        );
      })}

      {/* Elapsed time — after the 'idle' guard at top, currentPhase can't be idle */}
      {currentPhase !== "done" && <ElapsedTimer startedAt={phaseStartedAt} />}
    </div>
  );
}
