"use client";

import { useMemo } from "react";
import { findRelevantCorrectionMemories } from "@/lib/assistantSessionMemory";
import { buildCorrectionProvenanceLine } from "@/lib/correctionMemoryProvenance";
import { useStore } from "@/store/useStore";

interface CorrectionMemoryProvenanceStripProps {
  routeSurface?: string;
  agent?: string;
  queryText?: string;
}

export default function CorrectionMemoryProvenanceStrip({
  routeSurface = "/home",
  agent,
  queryText = "",
}: CorrectionMemoryProvenanceStripProps) {
  const correctionMemories = useStore((s) => s.correctionMemories);
  const relevant = useMemo(
    () =>
      findRelevantCorrectionMemories(correctionMemories, {
        input: queryText,
        routeSurface,
        agent: agent ?? null,
        limit: 2,
      }),
    [agent, correctionMemories, queryText, routeSurface],
  );

  if (!relevant.length) return null;

  return (
    <div
      style={{
        border: "1px solid var(--border)",
        borderRadius: "10px",
        background: "var(--surf2)",
        padding: "10px 12px",
        display: "grid",
        gap: "8px",
      }}
    >
      <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text)" }}>
        Correction provenance
      </div>
      {relevant.map((entry) => {
        const line = buildCorrectionProvenanceLine(entry);
        return (
          <div
            key={entry.id}
            style={{ fontSize: "10px", color: "var(--text3)" }}
          >
            <div style={{ color: "var(--text)", fontWeight: 600 }}>
              {line.rule}
            </div>
            <div style={{ marginTop: "4px" }}>
              {line.routeSurface ? `${line.routeSurface} · ` : ""}
              {line.agent ? `${line.agent.toUpperCase()} · ` : ""}
              approved {line.approvedAt}
              {line.lastApplied ? ` · last applied ${line.lastApplied}` : ""}
            </div>
          </div>
        );
      })}
    </div>
  );
}
