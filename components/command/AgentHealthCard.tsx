// ── components/command/AgentHealthCard.tsx ─────────────────────────────────────
// Shows per-agent regression suite pass rates in the COMMAND tab.
"use client";
import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/apiFetch";
import { SurfaceEmpty, SurfaceSkeletonRows } from "@/components/ui/surfacePrimitives";

interface AgentHealth {
  agent: string;
  passRate: number;
  passCount: number;
  failCount: number;
  avgDurationMs: number;
  lastRun: string | null;
  trend: "up" | "down" | "stable" | "unknown";
}

const AGENT_COLORS: Record<string, string> = {
  jansky: "var(--accent)",
  orbit: "#10b981",
  nova: "#f59e0b",
  cipher: "#ef4444",
  flux: "#8b5cf6",
  all: "var(--accent)",
};

const TREND_ICON: Record<string, string> = {
  up: "↑",
  down: "↓",
  stable: "→",
  unknown: "·",
};

export function AgentHealthCard() {
  const [agents, setAgents] = useState<AgentHealth[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/agent-health");
      if (res.ok) {
        const data = (await res.json()) as { agents: AgentHealth[] };
        setAgents(data.agents ?? []);
        setLastUpdated(new Date().toLocaleTimeString());
      }
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surf2)] p-3 text-xs">
      <button
        className="flex w-full items-center justify-between text-[var(--text2)] hover:text-[var(--text)]"
        onClick={() => setExpanded((v) => !v)}
      >
        <span className="font-mono font-semibold tracking-wider">
          AGENT HEALTH
        </span>
        <div className="flex items-center gap-2">
          {agents.length > 0 && (
            <span className="text-[9px] text-[var(--text3)]">
              {Math.round(
                (agents.reduce((s, a) => s + a.passRate, 0) /
                  agents.length) *
                  100,
              )}
              % avg
            </span>
          )}
          <span>{expanded ? "▲" : "▼"}</span>
        </div>
      </button>

      {expanded && (
        <div className="mt-3 flex flex-col gap-2">
          {agents.length === 0 && !loading && (
            <SurfaceEmpty
              icon="🧪"
              title="No agent health metrics yet"
              description="Run node scripts/verify-agents.js to generate the regression metrics shown in this panel."
              compact
            />
          )}

          {loading && agents.length === 0 ? <SurfaceSkeletonRows rows={3} height={18} /> : null}

          {agents.map((a) => {
            const pct = Math.round(a.passRate * 100);
            const color = AGENT_COLORS[a.agent] ?? "var(--accent)";
            return (
              <div key={a.agent}>
                <div className="flex items-center justify-between mb-0.5">
                  <span className="font-mono uppercase" style={{ color }}>
                    {a.agent}
                  </span>
                  <div className="flex items-center gap-1 text-[var(--text3)]">
                    <span
                      style={{
                        color:
                          a.trend === "up"
                            ? "var(--fhi)"
                            : a.trend === "down"
                              ? "var(--flo)"
                              : "var(--text3)",
                      }}
                    >
                      {TREND_ICON[a.trend]}
                    </span>
                    <span>{pct}%</span>
                  </div>
                </div>
                <div className="h-1.5 w-full rounded-full bg-[var(--surf3)] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${pct}%`,
                      background:
                        pct >= 80
                          ? "var(--fhi)"
                          : pct >= 60
                            ? "var(--fmd)"
                            : "var(--flo)",
                    }}
                  />
                </div>
              </div>
            );
          })}

          <div className="flex items-center justify-between pt-1">
            <span className="text-[9px] text-[var(--text3)]">
              {lastUpdated ? `Updated ${lastUpdated}` : ""}
            </span>
            <button
              onClick={refresh}
              disabled={loading}
              className="rounded bg-[var(--surf3)] px-2 py-0.5 font-mono text-[10px] text-[var(--text2)] hover:text-[var(--text)] disabled:opacity-50"
            >
              {loading ? "..." : "Refresh"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
