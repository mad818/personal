"use client";
// ── CouncilResultsPanel ────────────────────────────────────────────────────────
// Displays parallel agent council results in a 3-column layout.
// Only renders when councilMode is true and councilResults has entries.

import { useStore } from "@/store/useStore";
import type { CouncilResult } from "@/components/home/office/types";
import { AGENTS } from "@/components/home/office/constants";
import { getCouncilIdeationFrameLabel } from "@/lib/councilDivergence";

const PERSONA_COLORS: Record<string, string> = {
  formal: "var(--accent)",
  direct: "var(--fmd)",
  deep: "var(--accent2)",
};

const PERSONA_LABELS: Record<string, string> = {
  formal: "Formal",
  direct: "Direct",
  deep: "Deep ∞",
};

const AGENT_EMOJIS: Record<string, string> = {
  jansky: "🎯",
  orbit: "⚙️",
  nova: "🔍",
  cipher: "🔒",
  flux: "📈",
};

function ResultColumn({
  result,
  onUse,
}: {
  result: CouncilResult;
  onUse?: (result: CouncilResult) => void;
}) {
  const agentConf = AGENTS[result.agent];
  const color = PERSONA_COLORS[result.persona] ?? "var(--accent)";
  const emoji = AGENT_EMOJIS[result.agent] ?? "🤖";

  return (
    <div
      style={{
        flex: "1 1 0",
        minWidth: "0",
        background: "var(--surf2)",
        borderRadius: "var(--r)",
        border: `1px solid ${color}33`,
        padding: "10px 12px",
        display: "flex",
        flexDirection: "column",
        gap: "6px",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
        <span style={{ fontSize: "13px" }}>{emoji}</span>
        <span
          style={{ fontWeight: "bold", fontSize: "11px", color: "var(--text)" }}
        >
          {agentConf?.name ?? result.agent.toUpperCase()}
        </span>
        <span
          style={{
            padding: "1px 5px",
            borderRadius: "4px",
            background: color + "22",
            border: `1px solid ${color}44`,
            color,
            fontSize: "10px",
            fontWeight: "bold",
          }}
        >
          {PERSONA_LABELS[result.persona] ?? result.persona}
        </span>
        <span
          style={{
            marginLeft: "auto",
            color: "var(--text2)",
            fontSize: "10px",
          }}
        >
          {(result.duration / 1000).toFixed(1)}s
        </span>
      </div>
      {result.frame ? (
        <div
          style={{
            color: "var(--accent)",
            fontSize: "10px",
            fontWeight: "bold",
            letterSpacing: "0.04em",
          }}
        >
          FRAME · {getCouncilIdeationFrameLabel(result.frame)}
        </div>
      ) : null}
      {/* Answer */}
      <div
        style={{
          color: "var(--text)",
          fontSize: "12px",
          lineHeight: "1.55",
          overflowY: "auto",
          maxHeight: "320px",
          whiteSpace: "pre-wrap",
        }}
      >
        {result.answer || (
          <span style={{ color: "var(--text2)" }}>No response</span>
        )}
      </div>
      {onUse ? (
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button
            onClick={() => onUse(result)}
            style={{
              padding: "2px 8px",
              borderRadius: "4px",
              border: `1px solid ${color}55`,
              background: "transparent",
              color,
              cursor: "pointer",
              fontSize: "10px",
              fontWeight: "bold",
            }}
            title="Use this council answer as the draft reply"
          >
            Use this
          </button>
        </div>
      ) : null}
    </div>
  );
}

interface CouncilResultsPanelProps {
  onMerge?: (results: CouncilResult[]) => void;
  onUse?: (result: CouncilResult) => void;
}

export function CouncilResultsPanel({
  onMerge,
  onUse,
}: CouncilResultsPanelProps) {
  const results = useStore((s) => s.councilResults);
  const councilMode = useStore((s) => s.councilMode);
  const divergent = results.some((result) => result.frame);

  if (!councilMode || results.length === 0) return null;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        padding: "12px",
        background: "var(--surf)",
        borderRadius: "var(--r)",
        border: "1px solid var(--border2)",
        marginBottom: "8px",
      }}
    >
      {/* Panel header */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <span
          style={{ fontSize: "12px", fontWeight: "bold", color: "var(--text)" }}
        >
          ⚡ {divergent ? "Divergent Council Results" : "Council Results"}
        </span>
        <span style={{ fontSize: "11px", color: "var(--text2)" }}>
          {results.length} response{results.length !== 1 ? "s" : ""}
        </span>
        {onMerge && results.length > 1 && (
          <button
            onClick={() => onMerge(results)}
            style={{
              marginLeft: "auto",
              padding: "2px 8px",
              borderRadius: "4px",
              border: "1px solid var(--accent)",
              background: "transparent",
              color: "var(--accent)",
              cursor: "pointer",
              fontSize: "10px",
              fontWeight: "bold",
            }}
            title="One pinned JANSKY call to critique and synthesize these answers"
          >
            {divergent ? "Focus" : "Merge"} → JANSKY
          </button>
        )}
      </div>
      {/* Results columns */}
      <div style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
        {results.map((r, i) => (
          <ResultColumn
            key={`${r.agent}-${r.persona}-${i}`}
            result={r}
            onUse={onUse}
          />
        ))}
      </div>
    </div>
  );
}
