"use client";

import { useMemo, useState } from "react";
import {
  AGENCY_AGENT_ROLE_PACKS,
  AGENCY_AGENT_SOURCE,
  getAgencyRoleInventorySummary,
  getAgencyRolePack,
  matchAgencyRolePrompt,
  type AgencyRoleAgentId,
} from "@/lib/agentRoleTaxonomy";
import { ShellBadge, ShellButton, ShellStack } from "@/components/ui/shell";
import NexusCompanyMap from "@/components/skills/NexusCompanyMap";

const AGENT_ACCENTS: Record<AgencyRoleAgentId, string> = {
  jansky: "var(--accent)",
  orbit: "var(--flo)",
  nova: "var(--accent2)",
  cipher: "var(--fhi)",
  flux: "var(--fmd)",
};

const EXAMPLE_PROMPTS = [
  "fully implement the smallest safe patch and prove it",
  "secure Tailscale access and hide my IP exposure",
  "research current local-first media server options",
  "measure monthly subscription replacement value",
  "is this fully implemented or still missing pieces",
];

function TinyLabel({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        fontSize: "10px",
        color: "var(--text3)",
        fontWeight: 800,
        textTransform: "uppercase",
      }}
    >
      {children}
    </span>
  );
}

export default function AgencyRoleLibrary() {
  const summary = useMemo(() => getAgencyRoleInventorySummary(), []);
  const [selectedAgent, setSelectedAgent] = useState<AgencyRoleAgentId>("jansky");
  const [prompt, setPrompt] = useState(EXAMPLE_PROMPTS[0]);
  const selectedPack = getAgencyRolePack(selectedAgent);
  const matches = useMemo(() => matchAgencyRolePrompt(prompt), [prompt]);
  const topMatch = matches[0] ?? null;

  return (
    <section
      data-testid="agency-role-library"
      className="nexus-agency-role-library"
      style={{
        display: "grid",
        gap: "14px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: "12px",
          alignItems: "flex-start",
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "grid", gap: "6px", minWidth: 0 }}>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <ShellBadge tone="success">Implemented locally</ShellBadge>
            <ShellBadge tone="muted">No copied prompt bodies</ShellBadge>
            <ShellBadge tone="muted">{summary.license}</ShellBadge>
          </div>
          <p className="nexus-shell-copy nexus-shell-copy--compact" style={{ margin: 0 }}>
            Curated from {AGENCY_AGENT_SOURCE.repo} as Nexus role packs, routing
            hints, and quality signals.
          </p>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(70px, 1fr))",
            gap: "8px",
            width: "min(100%, 300px)",
          }}
        >
          {[
            ["Agents", summary.packCount],
            ["Roles", summary.archetypeCount],
            ["Signals", summary.keywordCount],
          ].map(([label, value]) => (
            <div
              key={label}
              style={{
                border: "1px solid var(--border)",
                borderRadius: "8px",
                padding: "8px",
                background: "var(--surf2)",
              }}
            >
              <TinyLabel>{label}</TinyLabel>
              <div style={{ fontSize: "18px", fontWeight: 900, color: "var(--text)" }}>
                {value}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
        {AGENCY_AGENT_ROLE_PACKS.map((pack) => {
          const active = pack.agentId === selectedAgent;
          return (
            <button
              key={pack.agentId}
              type="button"
              onClick={() => setSelectedAgent(pack.agentId)}
              style={{
                border: `1px solid ${active ? AGENT_ACCENTS[pack.agentId] : "var(--border)"}`,
                borderRadius: "8px",
                padding: "8px 10px",
                background: active ? "var(--surf3)" : "var(--surf)",
                color: "var(--text)",
                fontSize: "11px",
                fontWeight: 900,
                cursor: "pointer",
              }}
              aria-pressed={active}
            >
              {pack.agentId.toUpperCase()}
            </button>
          );
        })}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))",
          gap: "14px",
        }}
      >
        <div
          style={{
            border: "1px solid var(--border)",
            borderRadius: "8px",
            background: "var(--surf)",
            padding: "12px",
            display: "grid",
            gap: "12px",
          }}
        >
          <div style={{ display: "grid", gap: "4px" }}>
            <TinyLabel>{selectedPack.agentId.toUpperCase()}</TinyLabel>
            <h3 style={{ margin: 0, fontSize: "16px", color: "var(--text)" }}>
              {selectedPack.label}
            </h3>
            <p className="nexus-shell-copy nexus-shell-copy--compact" style={{ margin: 0 }}>
              {selectedPack.mission}
            </p>
          </div>

          <div className="nexus-ops-brief-list" aria-label="Agency role archetypes">
            {selectedPack.archetypes.map((role) => (
              <article key={role.title} className="nexus-ops-brief-item">
                <span className="nexus-ops-brief-item__eyebrow">
                  {role.sourceInspiration}
                </span>
                <span className="nexus-ops-brief-item__title">{role.title}</span>
                <p className="nexus-ops-brief-item__summary">{role.whenToUse}</p>
                <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                  {role.deliverables.slice(0, 3).map((deliverable) => (
                    <ShellBadge key={deliverable} tone="muted">
                      {deliverable}
                    </ShellBadge>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>

        <aside
          data-testid="agency-role-routing-preview"
          style={{
            border: "1px solid var(--border)",
            borderRadius: "8px",
            background: "var(--surf2)",
            padding: "12px",
            display: "grid",
            gap: "12px",
            alignContent: "start",
          }}
        >
          <div style={{ display: "grid", gap: "5px" }}>
            <TinyLabel>Routing preview</TinyLabel>
            <textarea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              rows={3}
              style={{
                width: "100%",
                resize: "vertical",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                padding: "9px",
                background: "var(--surf)",
                color: "var(--text)",
                fontSize: "12px",
                lineHeight: 1.45,
              }}
              aria-label="Agency role prompt preview"
            />
          </div>

          {topMatch ? (
            <div
              style={{
                border: `1px solid ${AGENT_ACCENTS[topMatch.agentId]}`,
                borderRadius: "8px",
                background: "var(--surf)",
                padding: "10px",
                display: "grid",
                gap: "8px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: "8px" }}>
                <strong style={{ color: "var(--text)", fontSize: "13px" }}>
                  {topMatch.agentId.toUpperCase()} - {topMatch.roleTitle}
                </strong>
                <ShellBadge tone="accent">score {topMatch.score}</ShellBadge>
              </div>
              <p className="nexus-shell-copy nexus-shell-copy--compact" style={{ margin: 0 }}>
                {topMatch.reason}
              </p>
              <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                {topMatch.matchedKeywords.slice(0, 6).map((keyword) => (
                  <ShellBadge key={keyword} tone="muted">
                    {keyword}
                  </ShellBadge>
                ))}
              </div>
            </div>
          ) : (
            <p className="nexus-shell-copy nexus-shell-copy--compact" style={{ margin: 0 }}>
              No role signal matched yet.
            </p>
          )}

          <ShellStack gap="8px">
            <TinyLabel>Examples</TinyLabel>
            <div className="nexus-ops-action-cluster">
              {EXAMPLE_PROMPTS.map((example) => (
                <ShellButton key={example} onClick={() => setPrompt(example)}>
                  {example}
                </ShellButton>
              ))}
            </div>
          </ShellStack>
        </aside>
      </div>

      <div className="nexus-agency-role-library__company-map" style={{ borderTop: "1px solid var(--border)", paddingTop: "14px" }}>
        <NexusCompanyMap />
      </div>
    </section>
  );
}
