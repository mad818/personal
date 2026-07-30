"use client";

import { useMemo } from "react";
import { teamOrchestrationPhaseColor } from "@/lib/designTokens";
import {
  buildTeamOrchestrationPlan,
  type TeamOrchestrationPlan,
} from "@/lib/teamOrchestration";
import type { AgentId } from "./types";

interface TeamOrchestrationStripProps {
  query: string;
  activeAgent: AgentId | null;
}

export default function TeamOrchestrationStrip({
  query,
  activeAgent,
}: TeamOrchestrationStripProps) {
  const plan = useMemo<TeamOrchestrationPlan | null>(
    () => buildTeamOrchestrationPlan(query, activeAgent),
    [query, activeAgent],
  );

  if (!plan || query.trim().length < 24) return null;

  return (
    <div
      className="nexus-hq-orchestration-strip"
      style={{
        margin: "8px 12px 0",
        padding: "10px 12px",
        borderRadius: "10px",
        border: "1px solid rgba(99, 102, 241, 0.22)",
        background: "rgba(15, 18, 32, 0.72)",
      }}
    >
      <div
        style={{
          fontSize: "9px",
          fontWeight: 800,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "var(--text3)",
          marginBottom: "6px",
        }}
      >
        Central orchestrator · {plan.headline}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
        {plan.phases.map((phase) => (
          <div
            key={phase.phase}
            style={{
              display: "grid",
              gridTemplateColumns: "28px 52px 1fr",
              gap: "8px",
              alignItems: "start",
              fontSize: "11px",
              color: "var(--text2)",
            }}
          >
            <span
              style={{
                fontWeight: 800,
                color: teamOrchestrationPhaseColor(phase.phase),
                fontFamily: "monospace",
              }}
            >
              {phase.phase}
            </span>
            <span style={{ fontWeight: 800, color: "var(--text)" }}>
              {phase.ownerLabel}
            </span>
            <span>{phase.objective}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
