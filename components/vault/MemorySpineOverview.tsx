"use client";

import { useMemo, useState } from "react";
import CompactOperatorNote from "@/components/ui/CompactOperatorNote";
import { timeAgo } from "@/lib/helpers";
import {
  buildMemorySpineSnapshot,
  searchMemorySpine,
  type MemoryDomain,
  type MemoryLayer,
} from "@/lib/memorySpine";
import { buildMemoryLifecycleSummary } from "@/lib/nativeAssimilation";
import { useStore } from "@/store/useStore";
import { ShellBadge, ShellSegmentedTabs } from "@/components/ui/shell";
import { SurfaceEmpty } from "@/components/ui/surfacePrimitives";

type MemoryFilter = "all" | MemoryLayer;

const FILTER_LABELS: Array<{ id: MemoryFilter; label: string }> = [
  { id: "all", label: "All" },
  { id: "raw", label: "Raw" },
  { id: "knowledge", label: "Knowledge" },
  { id: "output", label: "Outputs" },
];

const DOMAIN_LABELS: Record<MemoryDomain, string> = {
  intel: "Intel",
  cyber: "Cyber",
  markets: "Markets",
  ops: "Ops",
  engineering: "Engineering",
  strategy: "Strategy",
  general: "General",
};

const LAYER_LABELS: Record<MemoryLayer, string> = {
  raw: "Raw",
  knowledge: "Knowledge",
  output: "Output",
};

export default function MemorySpineOverview() {
  const savedArticles = useStore((s) => s.savedArticles);
  const agentLearnings = useStore((s) => s.agentLearnings);
  const agentRunHistory = useStore((s) => s.agentRunHistory);
  const modeBriefings = useStore((s) => s.modeBriefings);

  const [query, setQuery] = useState("");
  const [activeLayer, setActiveLayer] = useState<MemoryFilter>("all");

  const snapshot = useMemo(
    () =>
      buildMemorySpineSnapshot({
        savedArticles,
        agentLearnings,
        agentRunHistory,
        modeBriefings,
      }),
    [savedArticles, agentLearnings, agentRunHistory, modeBriefings],
  );
  const lifecycle = useMemo(
    () =>
      buildMemoryLifecycleSummary({
        total: snapshot.total,
        latestUpdatedAt: snapshot.latestUpdatedAt,
        countsByLayer: snapshot.countsByLayer,
        countsByVisibility: snapshot.countsByVisibility,
        items: snapshot.items,
      }),
    [
      snapshot.countsByLayer,
      snapshot.countsByVisibility,
      snapshot.items,
      snapshot.latestUpdatedAt,
      snapshot.total,
    ],
  );

  const results = useMemo(
    () =>
      searchMemorySpine(snapshot, {
        query,
        layer: activeLayer,
        limit: 7,
      }),
    [snapshot, query, activeLayer],
  );

  const domainHighlights = useMemo(
    () =>
      Object.entries(snapshot.countsByDomain)
        .filter(([, count]) => count > 0)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3) as Array<[MemoryDomain, number]>,
    [snapshot.countsByDomain],
  );

  const latestUpdatedLabel =
    snapshot.latestUpdatedAt && snapshot.latestUpdatedAt > 0
      ? timeAgo(new Date(snapshot.latestUpdatedAt).toISOString())
      : "No recent updates";

  if (snapshot.total === 0) {
    return (
      <SurfaceEmpty
        tone="muted"
        compact
        icon="Archive"
        title="Memory spine is empty"
        description="Save articles, capture learnings, or run workflows to start building raw artifacts, durable knowledge, and reusable outputs."
      />
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <CompactOperatorNote
        label="MEMORY SPINE"
        tone={
          lifecycle.tone === "warning"
            ? "caution"
            : lifecycle.tone === "success"
              ? "positive"
              : "info"
        }
        summary={lifecycle.headline}
        detail={`${lifecycle.detail} ${lifecycle.nextMove}`}
      >
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
          <ShellBadge tone="muted">Raw {snapshot.countsByLayer.raw}</ShellBadge>
          <ShellBadge tone="muted">
            Knowledge {snapshot.countsByLayer.knowledge}
          </ShellBadge>
          <ShellBadge tone="muted">Outputs {snapshot.countsByLayer.output}</ShellBadge>
          <ShellBadge tone="accent">
            Promote {lifecycle.promotionReadyCount}
          </ShellBadge>
          <ShellBadge tone="accent">
            Citation-ready {lifecycle.citationReadyCount}
          </ShellBadge>
          <ShellBadge tone="muted">Reopen {lifecycle.reopenReadyCount}</ShellBadge>
          {lifecycle.compactionBacklog > 0 ? (
            <ShellBadge tone="accent">
              Compaction {lifecycle.compactionBacklog}
            </ShellBadge>
          ) : null}
          {snapshot.countsByVisibility.restricted > 0 ? (
            <ShellBadge tone="accent">
              Restricted {snapshot.countsByVisibility.restricted}
            </ShellBadge>
          ) : null}
          {lifecycle.sensitiveHoldCount > 0 ? (
            <ShellBadge tone="accent">
              Sensitive hold {lifecycle.sensitiveHoldCount}
            </ShellBadge>
          ) : null}
          <ShellBadge tone="accent">{snapshot.total} total</ShellBadge>
        </div>
      </CompactOperatorNote>

      <div
        style={{
          padding: "10px 12px",
          borderRadius: "12px",
          border: "1px solid rgba(123, 167, 212, 0.14)",
          background: "rgba(10, 15, 30, 0.52)",
          fontSize: "11px",
          lineHeight: 1.6,
          color: "var(--text2)",
        }}
      >
        Next move: {lifecycle.nextMove}
        <span style={{ marginLeft: "8px", color: "var(--text3)" }}>
          Freshness: {lifecycle.freshnessLabel}
        </span>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "10px",
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
          {domainHighlights.map(([domain, count]) => (
            <ShellBadge key={domain} tone="muted">
              {DOMAIN_LABELS[domain]} {count}
            </ShellBadge>
          ))}
        </div>
        <div style={{ fontSize: "11px", color: "var(--text2)" }}>
          Latest update {latestUpdatedLabel}
        </div>
      </div>

      <ShellSegmentedTabs
        items={FILTER_LABELS.map((item) => ({
          id: item.id,
          label:
            item.id === "all"
              ? `${item.label} (${snapshot.total})`
              : `${item.label} (${snapshot.countsByLayer[item.id]})`,
        }))}
        active={activeLayer}
        onChange={setActiveLayer}
        minButtonWidth={112}
      />

      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search across clips, learnings, runs, and briefings"
        aria-label="Search the memory spine"
        style={{
          width: "100%",
          minHeight: "40px",
          padding: "0 12px",
          borderRadius: "10px",
          border: "1px solid var(--border)",
          background: "rgba(11, 17, 32, 0.72)",
          color: "var(--text)",
          fontSize: "13px",
          outline: "none",
        }}
      />

      {results.length === 0 ? (
        <SurfaceEmpty
          compact
          icon="Search"
          title="No matching memory artifacts"
          description="Try a broader term or switch back to All to search the full memory spine."
        />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {results.map((item) => (
            <article
              key={item.id}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                padding: "12px",
                borderRadius: "14px",
                border: "1px solid rgba(123, 167, 212, 0.14)",
                background:
                  "linear-gradient(180deg, rgba(11, 17, 32, 0.92), rgba(11, 17, 32, 0.66))",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "8px",
                  flexWrap: "wrap",
                }}
              >
                <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text)" }}>
                  {item.title}
                </div>
                <div style={{ fontSize: "11px", color: "var(--text2)" }}>
                  {item.timestamp > 0
                    ? timeAgo(new Date(item.timestamp).toISOString())
                    : "No timestamp"}
                </div>
              </div>

              <div style={{ fontSize: "12px", lineHeight: 1.5, color: "var(--text2)" }}>
                {item.summary}
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                <ShellBadge tone="accent">{LAYER_LABELS[item.layer]}</ShellBadge>
                <ShellBadge tone="muted">{DOMAIN_LABELS[item.domain]}</ShellBadge>
                <ShellBadge tone="muted">{item.kind}</ShellBadge>
                <ShellBadge tone={item.visibility === "safe" ? "success" : "muted"}>
                  {item.visibility}
                </ShellBadge>
                {item.citationId ? (
                  <ShellBadge tone="accent">{item.citationId}</ShellBadge>
                ) : null}
                {item.nextAction ? (
                  <ShellBadge tone="muted">{item.nextAction}</ShellBadge>
                ) : null}
                <ShellBadge tone="muted">{item.sourceLabel}</ShellBadge>
                {item.lifecycle ? (
                  <ShellBadge tone="muted">
                    {item.lifecycle.replace(/_/g, " ")}
                  </ShellBadge>
                ) : null}
                {item.sensitivityTags?.map((tag) => (
                  <ShellBadge key={`${item.id}-${tag}`} tone="muted">
                    {tag}
                  </ShellBadge>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
