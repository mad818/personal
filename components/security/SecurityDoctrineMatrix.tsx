"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/apiFetch";
import { SectionLabel, ShellBadge, ShellButton } from "@/components/ui/shell";
import { InternalWorkbenchNotice } from "@/components/ui/InternalWorkbenchNotice";
import type {
  SecurityRun,
  SecurityScenario,
  SecurityScenarioSource,
  SecurityScenarioStatus,
} from "@/lib/assimilation/types";
import type { InternalWorkbenchMeta } from "@/lib/assimilation/contracts";

const STATUS_TONE: Record<SecurityScenarioStatus, "success" | "accent" | "muted" | "default"> = {
  "not-started": "default",
  monitoring: "accent",
  covered: "success",
  attention: "muted",
  blocked: "muted",
};

interface Props {
  initialSource?: SecurityScenarioSource | "all";
}

export default function SecurityDoctrineMatrix({ initialSource = "all" }: Props) {
  const [source, setSource] = useState<SecurityScenarioSource | "all">(initialSource);
  const [scenarios, setScenarios] = useState<SecurityScenario[]>([]);
  const [runs, setRuns] = useState<SecurityRun[]>([]);
  const [scenarioMeta, setScenarioMeta] = useState<InternalWorkbenchMeta | null>(null);
  const [runMeta, setRunMeta] = useState<InternalWorkbenchMeta | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    setSource(initialSource);
  }, [initialSource]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const [scenarioResponse, runResponse] = await Promise.all([
          apiFetch("/api/security/scenarios", { cache: "no-store" }),
          apiFetch("/api/security/runs", { cache: "no-store" }),
        ]);
        if (!scenarioResponse.ok || !runResponse.ok) {
          if (active) {
            setLoadError("Security doctrine is unavailable right now.");
          }
          return;
        }
        const [scenarioPayload, runPayload] = await Promise.all([
          scenarioResponse.json() as Promise<{
            scenarios: SecurityScenario[];
            meta?: InternalWorkbenchMeta;
          }>,
          runResponse.json() as Promise<{
            runs: SecurityRun[];
            meta?: InternalWorkbenchMeta;
          }>,
        ]);
        if (!active) return;
        setScenarios(scenarioPayload.scenarios);
        setRuns(runPayload.runs);
        setScenarioMeta(scenarioPayload.meta ?? null);
        setRunMeta(runPayload.meta ?? null);
        setLoadError(null);
      } catch {
        if (active) {
          setLoadError("Security doctrine is unavailable right now.");
        }
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, []);

  const visible = useMemo(
    () =>
      scenarios.filter((scenario) =>
        source === "all" ? true : scenario.source === source,
      ),
    [scenarios, source],
  );

  function latestRunFor(id: string) {
    return runs.find((run) => run.scenarioId === id) ?? null;
  }

  async function markReviewed(scenario: SecurityScenario) {
    const nextStatus: SecurityScenarioStatus =
      scenario.status === "covered" ? "monitoring" : "covered";
    const updated = {
      ...scenario,
      status: nextStatus,
    };
    try {
      const response = await apiFetch("/api/security/scenarios", {
        method: "POST",
        body: JSON.stringify(updated),
      });
      if (!response.ok) return;
      setScenarios((current) =>
        current.map((entry) => (entry.id === scenario.id ? updated : entry)),
      );
    } catch {
      // Preserve the current doctrine view on failure.
    }
  }

  return (
    <div style={{ display: "grid", gap: "14px" }}>
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
        <ShellButton active={source === "all"} onClick={() => setSource("all")}>
          All doctrine
        </ShellButton>
        <ShellButton
          active={source === "wstg-v42"}
          onClick={() => setSource("wstg-v42")}
        >
          WSTG v4.2
        </ShellButton>
        <ShellButton
          active={source === "ai-surface"}
          onClick={() => setSource("ai-surface")}
        >
          AI surface
        </ShellButton>
      </div>

      <InternalWorkbenchNotice meta={scenarioMeta ?? runMeta} compact />
      {loadError ? (
        <div style={{ fontSize: "11px", color: "var(--text3)" }}>{loadError}</div>
      ) : null}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: "12px",
        }}
      >
        {visible.map((scenario) => {
          const latestRun = latestRunFor(scenario.id);
          return (
            <article
              key={scenario.id}
              style={{
                padding: "14px",
                borderRadius: "14px",
                border: "1px solid var(--border)",
                background: "rgba(10, 15, 30, 0.62)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: "10px", color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                    {scenario.id}
                  </div>
                  <div style={{ fontSize: "14px", fontWeight: 800, marginTop: "4px" }}>
                    {scenario.title}
                  </div>
                </div>
                <ShellBadge tone={STATUS_TONE[scenario.status]}>{scenario.status}</ShellBadge>
              </div>

              <p style={{ margin: "10px 0 0", fontSize: "11px", color: "var(--text2)", lineHeight: 1.55 }}>
                {scenario.evidence}
              </p>

              <div style={{ display: "grid", gap: "4px", marginTop: "10px", fontSize: "10px", color: "var(--text3)", lineHeight: 1.55 }}>
                <span>Family: {scenario.family}</span>
                <span>Owner: {scenario.owner}</span>
                <span>Remediation: {scenario.remediation}</span>
                <span>
                  Latest run: {latestRun ? `${latestRun.result.toUpperCase()} — ${latestRun.summary}` : "Not logged yet"}
                </span>
              </div>

              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "12px" }}>
                <ShellButton onClick={() => void markReviewed(scenario)}>
                  {scenario.status === "covered" ? "Move to monitoring" : "Mark covered"}
                </ShellButton>
                {scenario.links[0] ? (
                  <a
                    href={scenario.links[0]}
                    target="_blank"
                    rel="noreferrer"
                    style={{ alignSelf: "center", fontSize: "11px", color: "var(--accent)" }}
                  >
                    Open reference ↗
                  </a>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>

      <div
        style={{
          padding: "14px",
          borderRadius: "14px",
          border: "1px solid rgba(214, 165, 109, 0.35)",
          background: "rgba(214, 165, 109, 0.08)",
        }}
      >
        <SectionLabel detail="Doctrine posture">Coverage note</SectionLabel>
        <p style={{ margin: "10px 0 0", fontSize: "12px", color: "var(--text2)", lineHeight: 1.65 }}>
          WSTG scenarios stay version-pinned to `v4.2` until the OWASP 5.0 guide stabilizes. AI-surface scenarios are tracked beside them, not disguised as WSTG categories, so prompt and tool risks remain visible as first-class security work.
        </p>
      </div>
    </div>
  );
}
