"use client";

import { useEffect, useMemo, useState } from "react";
import { useStore } from "@/store/useStore";
import type { AgentEfficiencyMetrics } from "@/store/useStore";
import {
  SurfaceCallout,
  SurfaceEmpty,
} from "@/components/ui/surfacePrimitives";

function fmtChars(value: number): string {
  return `${value.toLocaleString()} ch`;
}

function buildRecommendations(efficiency: AgentEfficiencyMetrics) {
  const notes: Array<{
    id: string;
    tone: "success" | "info" | "warning";
    title: string;
    detail: string;
  }> = [];

  if (
    efficiency.toolCatalogChars >= 14000 ||
    efficiency.toolCatalogCount >= 16
  ) {
    notes.push({
      id: "tool-pack-heavy",
      tone: "warning",
      title: "Tool pack still heavy",
      detail:
        "The latest run carried a relatively large tool schema. Keep leaning on smaller task packs and avoid widening the catalog unless the task truly needs it.",
    });
  }

  if (efficiency.duplicateReadCount > 0) {
    notes.push({
      id: "duplicate-reads",
      tone: "warning",
      title: "Repeated reads detected",
      detail:
        "The same project material was read more than once during the run. This is the cleanest local token-waste signal to shave next.",
    });
  }

  if (efficiency.liveContextChars >= 2600 && !efficiency.liveContextCompacted) {
    notes.push({
      id: "context-not-compacted",
      tone: "info",
      title: "Large live context without compaction",
      detail:
        "The live bundle was substantial and did not compact. Favor filtered deltas and stable-prefix caching before adding more context sources.",
    });
  }

  if (efficiency.contextScope === "full") {
    notes.push({
      id: "scope-full",
      tone: "warning",
      title: "Full context scope used",
      detail:
        "A full-context run is still slipping through. Agent-scoped context remains the preferred baseline for HQ unless a task genuinely needs the whole room.",
    });
  }

  if (notes.length === 0) {
    notes.push({
      id: "healthy",
      tone: "success",
      title: "Latest run stayed lean",
      detail:
        "No obvious waste spikes were detected in the newest snapshot. The next efficiency gains are likely in scheduled non-interactive jobs rather than the interactive HQ path.",
    });
  }

  return notes;
}

export default function RuntimeEfficiencyCard({
  initialExpanded = false,
}: {
  initialExpanded?: boolean;
}) {
  const latestRun = useStore((s) => s.agentRunHistory[0] ?? null);
  const [expanded, setExpanded] = useState(initialExpanded);
  const [copyMsg, setCopyMsg] = useState("");

  const summary = useMemo(() => {
    const efficiency = latestRun?.efficiency;
    if (!efficiency) return null;
    const segments = [
      { label: "Prompt", value: efficiency.systemPromptChars },
      { label: "Live", value: efficiency.liveContextChars },
      { label: "Memory", value: efficiency.memoryContextChars },
      { label: "RAG", value: efficiency.ragChars },
      { label: "Lessons", value: efficiency.lessonsChars },
    ].filter((segment) => segment.value > 0);
    return {
      efficiency,
      segments,
      recommendations: buildRecommendations(efficiency),
    };
  }, [latestRun]);

  const runtimeEfficiencySummary = useMemo(() => {
    if (!summary || !latestRun) return "";
    const segmentSummary = summary.segments
      .map((segment) => `${segment.label}: ${fmtChars(segment.value)}`)
      .join(", ");
    const recommendationSummary = summary.recommendations
      .map(
        (recommendation) =>
          `- ${recommendation.title}: ${recommendation.detail}`,
      )
      .join("\n");
    return [
      "Runtime efficiency summary",
      `Latest run: ${new Date(latestRun.finishedAt).toLocaleString()}`,
      `Context scope: ${summary.efficiency.contextScope.replace("_", " ")}`,
      `Tool pack: ${summary.efficiency.toolPackId}`,
      `Tool catalog: ${summary.efficiency.toolCatalogCount} tools (${fmtChars(summary.efficiency.toolCatalogChars)})`,
      `Cache hits: ${summary.efficiency.readCacheHits}`,
      `Duplicate reads: ${summary.efficiency.duplicateReadCount}`,
      `Compaction: ${
        latestRun.contextCompacted || summary.efficiency.liveContextCompacted
          ? "Context compacted"
          : "No compaction"
      }`,
      `Prompt mix: ${segmentSummary || "No prompt segments recorded."}`,
      "Recommendations:",
      recommendationSummary,
    ].join("\n");
  }, [latestRun, summary]);

  const handleCopySummary = async () => {
    if (!runtimeEfficiencySummary) return;
    try {
      await navigator.clipboard.writeText(runtimeEfficiencySummary);
      setCopyMsg("Efficiency summary copied.");
    } catch {
      setCopyMsg("Copy failed.");
    }
  };

  useEffect(() => {
    if (initialExpanded) {
      setExpanded(true);
    }
  }, [initialExpanded]);

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surf2)] p-3 text-xs">
      {!summary ? (
        <SurfaceEmpty
          icon="📉"
          title="No runtime efficiency snapshot yet"
          description="Run an HQ command and the latest prompt, tool-pack, and read-cache metrics will appear here."
          compact
        />
      ) : (
        <div className="flex flex-col gap-3">
          <SurfaceCallout
            tone={summary.recommendations[0]?.tone ?? "info"}
            compact
            icon="Gauge"
            title={summary.recommendations[0]?.title ?? "Local usage monitor"}
            description={
              summary.recommendations[0]?.detail ??
              "No local efficiency guidance yet."
            }
          />

          <div className="grid grid-cols-2 gap-2 text-[10px] sm:grid-cols-4">
            <div className="rounded-md border border-[var(--border)] bg-[var(--surf)] px-2 py-1.5">
              <div className="text-[var(--text3)]">Context scope</div>
              <div className="mt-1 font-mono uppercase text-[var(--text)]">
                {summary.efficiency.contextScope.replace("_", " ")}
              </div>
            </div>
            <div className="rounded-md border border-[var(--border)] bg-[var(--surf)] px-2 py-1.5">
              <div className="text-[var(--text3)]">Tool pack</div>
              <div className="mt-1 font-mono text-[var(--text)]">
                {summary.efficiency.toolPackId}
              </div>
            </div>
            <div className="rounded-md border border-[var(--border)] bg-[var(--surf)] px-2 py-1.5">
              <div className="text-[var(--text3)]">Cache hits</div>
              <div className="mt-1 font-mono text-[var(--text)]">
                {summary.efficiency.readCacheHits}
              </div>
            </div>
            <div className="rounded-md border border-[var(--border)] bg-[var(--surf)] px-2 py-1.5">
              <div className="text-[var(--text3)]">Duplicate reads</div>
              <div className="mt-1 font-mono text-[var(--text)]">
                {summary.efficiency.duplicateReadCount}
              </div>
            </div>
          </div>

          <details
            className="nexus-surface-disclosure"
            open={expanded}
            onToggle={(event) => setExpanded(event.currentTarget.open)}
          >
            <summary>Open runtime detail</summary>
            <div className="nexus-surface-disclosure__body">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => void handleCopySummary()}
                  className="nexus-shell-button"
                  style={{
                    minHeight: "30px",
                    padding: "0 10px",
                    fontSize: "11px",
                  }}
                >
                  Copy summary
                </button>
                {copyMsg ? (
                  <span
                    role="status"
                    className="text-[10px] text-[var(--text3)]"
                  >
                    {copyMsg}
                  </span>
                ) : null}
              </div>

              <div className="grid grid-cols-1 gap-2 text-[10px] sm:grid-cols-2">
                <div className="rounded-md border border-[var(--border)] bg-[var(--surf)] px-2 py-1.5">
                  <div className="text-[var(--text3)]">Tool catalog</div>
                  <div className="mt-1 font-mono text-[var(--text)]">
                    {summary.efficiency.toolCatalogCount} tools
                  </div>
                  <div className="mt-1 text-[var(--text3)]">
                    {fmtChars(summary.efficiency.toolCatalogChars)}
                  </div>
                </div>
                <div className="rounded-md border border-[var(--border)] bg-[var(--surf)] px-2 py-1.5">
                  <div className="text-[var(--text3)]">Latest run</div>
                  <div className="mt-1 font-mono text-[var(--text)]">
                    {new Date(latestRun.finishedAt).toLocaleTimeString()}
                  </div>
                  <div className="mt-1 text-[var(--text3)]">
                    {latestRun.contextCompacted ||
                    summary.efficiency.liveContextCompacted
                      ? "Context compacted"
                      : "No compaction"}
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                {summary.segments.map((segment) => (
                  <div key={segment.label}>
                    <div className="mb-0.5 flex items-center justify-between text-[10px]">
                      <span className="text-[var(--text2)]">
                        {segment.label}
                      </span>
                      <span className="font-mono text-[var(--text3)]">
                        {fmtChars(segment.value)}
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-[var(--surf3)]">
                      <div
                        className="h-full rounded-full bg-[var(--accent)] transition-[width] duration-500"
                        style={{
                          width: `${Math.max(
                            6,
                            Math.min(
                              100,
                              (segment.value /
                                Math.max(
                                  1,
                                  summary.efficiency.systemPromptChars,
                                )) *
                                100,
                            ),
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {summary.recommendations.length > 1 ? (
                <div className="flex flex-col gap-2">
                  {summary.recommendations.slice(1).map((recommendation) => (
                    <div
                      key={recommendation.id}
                      className="rounded-md border border-[var(--border)] bg-[var(--surf)] px-3 py-2"
                    >
                      <div className="text-[11px] font-medium text-[var(--text)]">
                        {recommendation.title}
                      </div>
                      <div className="mt-1 text-[10px] leading-5 text-[var(--text3)]">
                        {recommendation.detail}
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </details>
        </div>
      )}
    </div>
  );
}
