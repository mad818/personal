"use client";

import { useRouter } from "next/navigation";
import ActionSessionCluster from "@/components/ui/ActionSessionCluster";
import { SectionLabel, ShellBadge } from "@/components/ui/shell";
import {
  AI_HARDENING_COVERAGE,
  AI_HARDENING_STAGES,
  getAIHardeningCoverageStatusLabel,
} from "@/lib/aiHardeningCoverage";

function cardStyle() {
  return {
    padding: "12px",
    borderRadius: "12px",
    border: "1px solid var(--border)",
    background: "rgba(10, 15, 30, 0.62)",
  } as const;
}

export default function AIHardeningCoveragePanel() {
  const router = useRouter();
  const visibleCount = AI_HARDENING_COVERAGE.filter(
    (item) => item.status === "visible_evidence",
  ).length;
  const gapCount = AI_HARDENING_COVERAGE.length - visibleCount;

  return (
    <div style={{ display: "grid", gap: "12px" }}>
      <div style={{ display: "grid", gap: "10px" }}>
        <SectionLabel detail={`${AI_HARDENING_STAGES.length} stages`}>
          Hardening loop
        </SectionLabel>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "10px",
          }}
        >
          {AI_HARDENING_STAGES.map((stage) => (
            <article key={stage.label} style={cardStyle()}>
              <div style={{ display: "grid", gap: "6px" }}>
                <div
                  style={{
                    fontSize: "10px",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "var(--text3)",
                    fontWeight: 700,
                  }}
                >
                  {stage.label}
                </div>
                <div style={{ fontSize: "11px", color: "var(--text2)", lineHeight: 1.5 }}>
                  {stage.detail}
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
        <ShellBadge tone="success">Visible posture {visibleCount}</ShellBadge>
        <ShellBadge tone={gapCount > 0 ? "accent" : "muted"}>
          Boundary-only gaps {gapCount}
        </ShellBadge>
      </div>

      <div style={{ display: "grid", gap: "10px" }}>
        <SectionLabel detail={`${AI_HARDENING_COVERAGE.length} tracked surfaces`}>
          Coverage map
        </SectionLabel>
        {AI_HARDENING_COVERAGE.map((item) => (
          <article key={item.id} style={cardStyle()}>
            <div style={{ display: "grid", gap: "10px" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "8px",
                  alignItems: "flex-start",
                  flexWrap: "wrap",
                }}
              >
                <div style={{ display: "grid", gap: "5px" }}>
                  <div style={{ fontSize: "12px", color: "var(--text)", fontWeight: 700 }}>
                    {item.title}
                  </div>
                  <div style={{ fontSize: "11px", color: "var(--text2)", lineHeight: 1.5 }}>
                    {item.summary}
                  </div>
                </div>
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                  <ShellBadge tone={item.status === "visible_evidence" ? "success" : "accent"}>
                    {getAIHardeningCoverageStatusLabel(item.status)}
                  </ShellBadge>
                  <ShellBadge tone="muted">{item.surface}</ShellBadge>
                </div>
              </div>

              <div style={{ fontSize: "11px", color: "var(--text3)", lineHeight: 1.5 }}>
                {item.nextStrengtheningMove}
              </div>

              <ActionSessionCluster
                items={item.actions}
                onOpen={(href) => router.push(href)}
                buttonClassName="nexus-shell-button"
                buttonStyle={{ minHeight: "30px", padding: "0 12px", fontSize: "11px" }}
              />
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
