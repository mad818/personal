"use client";
// ── CouncilResultsPanel ────────────────────────────────────────────────────────
// Displays parallel agent council results in a 3-column layout.
// Only renders when councilMode is true and councilResults has entries.

import { useStore } from "@/store/useStore";
import type { CouncilResult } from "@/components/home/office/types";
import { AGENTS } from "@/components/home/office/constants";

const PERSONA_COLORS: Record<string, string> = {
  formal: "var(--accent)",
  direct: "var(--fmd)",
  deep:   "var(--accent2)",
};

const PERSONA_LABELS: Record<string, string> = {
  formal: "Formal",
  direct: "Direct",
  deep:   "Deep ∞",
};

const AGENT_EMOJIS: Record<string, string> = {
  jansky: "🎯",
  orbit:  "⚙️",
  nova:   "🔍",
  cipher: "🔒",
  flux:   "📈",
};

function ResultColumn({ result }: { result: CouncilResult }) {
  const agentConf = AGENTS[result.agent];
  const color = PERSONA_COLORS[result.persona] ?? "var(--accent)";
  const emoji = AGENT_EMOJIS[result.agent] ?? "🤖";

  return (
    <div
      style={{
        flex:         "1 1 0",
        minWidth:     "0",
        background:   "var(--surf2)",
        borderRadius: "var(--r)",
        border:       `1px solid ${color}33`,
        padding:      "10px 12px",
        display:      "flex",
        flexDirection: "column",
        gap:          "6px",
        overflow:     "hidden",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
        <span style={{ fontSize: "13px" }}>{emoji}</span>
        <span style={{ fontWeight: "bold", fontSize: "11px", color: "var(--text)" }}>
          {agentConf?.name ?? result.agent.toUpperCase()}
        </span>
        <span
          style={{
            padding:      "1px 5px",
            borderRadius: "4px",
            background:   color + "22",
            border:       `1px solid ${color}44`,
            color,
            fontSize:     "10px",
            fontWeight:   "bold",
          }}
        >
          {PERSONA_LABELS[result.persona] ?? result.persona}
        </span>
        <span style={{ marginLeft: "auto", color: "var(--text2)", fontSize: "10px" }}>
          {(result.duration / 1000).toFixed(1)}s
        </span>
      </div>
      {/* Answer */}
      <div
        style={{
          color:      "var(--text)",
          fontSize:   "12px",
          lineHeight: "1.55",
          overflowY:  "auto",
          maxHeight:  "320px",
          whiteSpace: "pre-wrap",
        }}
      >
        {result.answer || <span style={{ color: "var(--text2)" }}>No response</span>}
      </div>
    </div>
  );
}

interface CouncilResultsPanelProps {
  onMerge?: (combined: string) => void;
}

export function CouncilResultsPanel({ onMerge }: CouncilResultsPanelProps) {
  const results     = useStore(s => s.councilResults);
  const councilMode = useStore(s => s.councilMode);

  if (!councilMode || results.length === 0) return null;

  const handleMerge = () => {
    const combined = results.map(r =>
      `=== ${r.agent.toUpperCase()} [${r.persona}] ===\n${r.answer}`
    ).join("\n\n");
    onMerge?.(combined);
  };

  return (
    <div
      style={{
        display:       "flex",
        flexDirection: "column",
        gap:           "8px",
        padding:       "12px",
        background:    "var(--surf)",
        borderRadius:  "var(--r)",
        border:        "1px solid var(--border2)",
        marginBottom:  "8px",
      }}
    >
      {/* Panel header */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <span style={{ fontSize: "12px", fontWeight: "bold", color: "var(--text)" }}>
          ⚡ Council Results
        </span>
        <span style={{ fontSize: "11px", color: "var(--text2)" }}>
          {results.length} response{results.length !== 1 ? "s" : ""}
        </span>
        {onMerge && results.length > 1 && (
          <button
            onClick={handleMerge}
            style={{
              marginLeft:   "auto",
              padding:      "2px 8px",
              borderRadius: "4px",
              border:       "1px solid var(--accent)",
              background:   "transparent",
              color:        "var(--accent)",
              cursor:       "pointer",
              fontSize:     "10px",
              fontWeight:   "bold",
            }}
            title="Merge all council answers for JANSKY to synthesize"
          >
            Merge → JANSKY
          </button>
        )}
      </div>
      {/* Results columns */}
      <div style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
        {results.map((r, i) => (
          <ResultColumn key={`${r.agent}-${r.persona}-${i}`} result={r} />
        ))}
      </div>
    </div>
  );
}
