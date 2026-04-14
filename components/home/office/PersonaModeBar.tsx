"use client";
// ── PersonaModeBar ─────────────────────────────────────────────────────────────
// Three-button toggle (F | D | ∞) for persona mode + Council mode button.
// Reads/writes activePersona and councilMode from Zustand store.

import { useStore } from "@/store/useStore";
import type { PersonaMode } from "@/components/home/office/types";

const PERSONA_OPTS: { mode: PersonaMode; label: string; tip: string }[] = [
  { mode: "formal", label: "F", tip: "Formal — structured, cited, institutional" },
  { mode: "direct", label: "D", tip: "Direct — blunt, signal-first, no filler" },
  { mode: "deep",   label: "∞", tip: "Deep — exhaustive, multi-angle, full reasoning" },
];

export function PersonaModeBar() {
  const activePersona   = useStore(s => s.activePersona);
  const setPersona      = useStore(s => s.setPersona);
  const councilMode     = useStore(s => s.councilMode);
  const toggleCouncil   = useStore(s => s.toggleCouncilMode);

  return (
    <div
      style={{
        display:    "flex",
        gap:        "4px",
        alignItems: "center",
        padding:    "2px 6px",
        background: "var(--surf2)",
        borderRadius: "var(--rs)",
        border:     "1px solid var(--border)",
      }}
      title="Agent persona mode"
    >
      <span style={{ color: "var(--text2)", fontSize: "10px", marginRight: "2px" }}>
        MODE
      </span>
      {PERSONA_OPTS.map(({ mode, label, tip }) => (
        <button
          key={mode}
          title={tip}
          onClick={() => setPersona(mode)}
          style={{
            width:         "22px",
            height:        "22px",
            borderRadius:  "4px",
            border:        activePersona === mode
              ? "1px solid var(--accent)"
              : "1px solid var(--border)",
            background:    activePersona === mode ? "var(--accent)" : "transparent",
            color:         activePersona === mode ? "#fff" : "var(--text2)",
            cursor:        "pointer",
            fontSize:      "11px",
            fontWeight:    "bold",
            transition:    "var(--t)",
            padding:       0,
          }}
        >
          {label}
        </button>
      ))}
      <div style={{ width: "1px", height: "16px", background: "var(--border)", margin: "0 2px" }} />
      <button
        title={councilMode ? "Council mode ON — query goes to 3 agents" : "Enable Council mode — parallel dispatch"}
        onClick={toggleCouncil}
        style={{
          padding:       "2px 6px",
          borderRadius:  "4px",
          border:        councilMode
            ? "1px solid var(--accent2)"
            : "1px solid var(--border)",
          background:    councilMode ? "var(--accent2)" : "transparent",
          color:         councilMode ? "#fff" : "var(--text2)",
          cursor:        "pointer",
          fontSize:      "10px",
          fontWeight:    "bold",
          transition:    "var(--t)",
          whiteSpace:    "nowrap",
        }}
      >
        ⚡ Council
      </button>
    </div>
  );
}
