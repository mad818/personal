"use client";

import { useState } from "react";
import type { RuntimeExperimentRecommendation } from "@/lib/runtimeExperimentContracts";
import {
  getEvolutionOperatorDecision,
  suggestEvolutionOperatorDecision,
  writeEvolutionOperatorRecord,
  type EvolutionOperatorDecision,
} from "@/lib/evolutionImprover";

interface EvolutionImproverActionsProps {
  experimentId: string;
  recommendation: RuntimeExperimentRecommendation;
}

const BUTTON: React.CSSProperties = {
  padding: "5px 10px",
  borderRadius: "6px",
  border: "1px solid var(--border)",
  background: "var(--surf2)",
  color: "var(--text2)",
  fontWeight: 700,
  fontSize: "10px",
  cursor: "pointer",
};

export default function EvolutionImproverActions({
  experimentId,
  recommendation,
}: EvolutionImproverActionsProps) {
  const [decision, setDecision] = useState<EvolutionOperatorDecision | null>(
    () => getEvolutionOperatorDecision(experimentId),
  );

  function record(decisionValue: EvolutionOperatorDecision) {
    writeEvolutionOperatorRecord({
      experimentId,
      decision: decisionValue,
      recommendation,
      recordedAt: Date.now(),
    });
    setDecision(decisionValue);
  }

  const suggested = suggestEvolutionOperatorDecision(recommendation);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      <div style={{ fontSize: "10px", color: "var(--text3)" }}>
        OpenEvolve-style operator gate · suggested: {suggested}
      </div>
      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
        {(["keep", "reject", "defer"] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => record(value)}
            style={{
              ...BUTTON,
              borderColor:
                decision === value ? "var(--accent)" : "var(--border)",
              color: decision === value ? "var(--text)" : "var(--text2)",
            }}
          >
            {value}
          </button>
        ))}
      </div>
      {decision ? (
        <div style={{ fontSize: "10px", color: "var(--text3)" }}>
          Recorded operator decision: {decision}
        </div>
      ) : null}
    </div>
  );
}
