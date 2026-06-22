"use client";

import { useMemo, useState, type CSSProperties } from "react";
import { ShellBadge } from "@/components/ui/shell";
import {
  AGENT_AUTONOMY_REVIEW_DOMAINS,
  type AgentAutonomyDomainId,
} from "@/lib/agentAutonomyGovernance";
import {
  AGENT_SHIELD_CHECKS,
  summarizeAgentShieldPosture,
  type AgentShieldCheckId,
} from "@/lib/agentShieldPosture";
import {
  listBlockedSkillCapabilities,
  summarizeSkillSpectrumPolicies,
} from "@/lib/skillSpectrumSummary";

const cardShell: CSSProperties = {
  borderRadius: "12px",
  border: "1px solid rgba(96, 165, 250, 0.16)",
  background: "rgba(8, 18, 31, 0.46)",
  padding: "10px 12px",
  display: "grid",
  gap: "8px",
};

export default function CyberGovernanceCards() {
  const [shieldChecked, setShieldChecked] = useState<Set<AgentShieldCheckId>>(
    new Set(),
  );
  const [autonomyNotes, setAutonomyNotes] = useState<
    Partial<Record<AgentAutonomyDomainId, string>>
  >({});

  const shieldSummary = useMemo(
    () => summarizeAgentShieldPosture(Array.from(shieldChecked)),
    [shieldChecked],
  );

  const toggleShield = (id: AgentShieldCheckId) => {
    setShieldChecked((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div style={{ display: "grid", gap: "12px" }}>
      <div style={cardShell}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
          <ShellBadge tone="accent">AgentShield posture</ShellBadge>
          <ShellBadge tone="muted">Checklist only</ShellBadge>
        </div>
        <div className="nexus-shell-copy nexus-shell-copy--compact">
          {shieldSummary}
        </div>
        <div style={{ display: "grid", gap: "8px" }}>
          {AGENT_SHIELD_CHECKS.map((item) => {
            const active = shieldChecked.has(item.id);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => toggleShield(item.id)}
                className="nexus-shell-button"
                style={{
                  textAlign: "left",
                  padding: "10px 12px",
                  display: "grid",
                  gap: "4px",
                  opacity: active ? 1 : 0.82,
                }}
              >
                <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--text)" }}>
                  {active ? "Reviewed" : "Review"} · {item.label}
                </span>
                <span style={{ fontSize: "10px", color: "var(--text3)", lineHeight: 1.45 }}>
                  {item.question}
                </span>
                <span style={{ fontSize: "10px", color: "#93c5fd", lineHeight: 1.45 }}>
                  Pass: {item.passCriteria}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div style={cardShell}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
          <ShellBadge tone="accent">SkillSpector policy</ShellBadge>
          <ShellBadge tone="muted">NVIDIA pattern</ShellBadge>
        </div>
        <div className="nexus-shell-copy nexus-shell-copy--compact">
          {summarizeSkillSpectrumPolicies()}
        </div>
        <div style={{ fontSize: "10px", color: "var(--text3)", lineHeight: 1.45 }}>
          Blocked capability tokens:{" "}
          {listBlockedSkillCapabilities().join(", ") || "none"}
        </div>
      </div>

      <div style={cardShell}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
          <ShellBadge tone="accent">APTS review vocabulary</ShellBadge>
          <ShellBadge tone="muted">Governance reference</ShellBadge>
        </div>
        <div className="nexus-shell-copy nexus-shell-copy--compact">
          Record autonomy posture notes per domain. This is review language only — not a conformance claim.
        </div>
        <div style={{ display: "grid", gap: "8px" }}>
          {AGENT_AUTONOMY_REVIEW_DOMAINS.map((domain) => (
            <label key={domain.id} style={{ display: "grid", gap: "4px" }}>
              <span style={{ fontSize: "10px", fontWeight: 700, color: "#93c5fd" }}>
                {domain.label}
              </span>
              <span style={{ fontSize: "10px", color: "var(--text3)", lineHeight: 1.45 }}>
                {domain.summary}
              </span>
              <textarea
                value={autonomyNotes[domain.id] ?? ""}
                onChange={(event) =>
                  setAutonomyNotes((current) => ({
                    ...current,
                    [domain.id]: event.target.value,
                  }))
                }
                placeholder={domain.reviewQuestions[0]}
                style={{
                  minHeight: "52px",
                  borderRadius: "8px",
                  border: "1px solid rgba(96, 165, 250, 0.18)",
                  background: "rgba(9, 14, 28, 0.42)",
                  color: "var(--text)",
                  padding: "8px 10px",
                  fontSize: "11px",
                  resize: "vertical",
                  width: "100%",
                }}
              />
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
