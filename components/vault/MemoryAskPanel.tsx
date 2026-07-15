"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { timeAgo } from "@/lib/helpers";
import { apiFetch } from "@/lib/apiFetch";
import {
  ShellBadge,
  ShellButton,
  ShellSegmentedTabs,
} from "@/components/ui/shell";
import {
  SurfaceCallout,
  SurfaceEmpty,
  SurfaceSkeletonRows,
} from "@/components/ui/surfacePrimitives";

type MemoryFilter = "all" | "raw" | "knowledge" | "output";
type MemoryAskSurface = "vault" | "command";

interface MemoryAskSource {
  id: string;
  title: string;
  sourceLabel: string;
  layer: "raw" | "knowledge" | "output";
  domain: string;
  timestamp: number;
}

interface MemoryAskRelatedItem extends MemoryAskSource {
  summary: string;
}

interface MemoryAskResponse {
  query: string;
  layer: MemoryFilter;
  answer: string;
  confidence: number;
  sources: MemoryAskSource[];
  relatedItems: MemoryAskRelatedItem[];
  gaps: string[];
  matchCount: number;
  withheldRestrictedCount: number;
  note: string;
  comparison:
    | {
        requested: true;
        performed: boolean;
        sidecarState: string;
        sharedCount: number;
        nativeOnlyCount: number;
        sidecarOnlyCount: number;
        overlapRatio: number;
        sidecarMatchCount: number;
      }
    | {
        requested: false;
        performed: false;
      };
}

const FILTER_LABELS: Array<{ id: MemoryFilter; label: string }> = [
  { id: "all", label: "All" },
  { id: "raw", label: "Raw" },
  { id: "knowledge", label: "Knowledge" },
  { id: "output", label: "Outputs" },
];

function formatConfidence(value: number) {
  return `${Math.round(value * 100)}%`;
}

function formatTimestamp(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "No timestamp";
  return timeAgo(new Date(value).toISOString());
}

const SURFACE_COPY: Record<
  MemoryAskSurface,
  {
    introTitle: string;
    introDescription: string;
    placeholder: string;
    emptyDescription: string;
  }
> = {
  vault: {
    introTitle: "Ask the local memory spine",
    introDescription:
      "Get a deterministic answer from sanitized Nexus-native memory, with citations and related artifacts. Compare mode stays explicit and query-only.",
    placeholder:
      "Ask what the archive already knows, for example: What does local memory say about the latest threat cluster?",
    emptyDescription:
      "Run a local ask to get a citation-first answer from the current memory spine.",
  },
  command: {
    introTitle: "Query operator memory",
    introDescription:
      "Pull a local citation-first answer into the mission lane without leaving COMMAND. Native memory stays the default boundary.",
    placeholder:
      "Ask the local command memory, for example: What does local memory already say about our current top cyber risk?",
    emptyDescription:
      "Run a local memory query to surface citations and related artifacts during live mission work.",
  },
};

export default function MemoryAskPanel({
  surface = "vault",
  initialQuery,
  initialCompare = false,
  autoRunOnInitialQuery = false,
}: {
  surface?: MemoryAskSurface;
  initialQuery?: string;
  initialCompare?: boolean;
  autoRunOnInitialQuery?: boolean;
}) {
  const [query, setQuery] = useState(initialQuery ?? "");
  const [layer, setLayer] = useState<MemoryFilter>("all");
  const [compare, setCompare] = useState(initialCompare);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<MemoryAskResponse | null>(null);
  const copy = SURFACE_COPY[surface];
  const lastAutoRunKeyRef = useRef("");

  const comparisonLabel = useMemo(() => {
    if (!result?.comparison.requested) return null;
    if (!result.comparison.performed) {
      return `Compare requested · sidecar ${result.comparison.sidecarState}`;
    }
    return `Compare overlap ${Math.round(result.comparison.overlapRatio * 100)}%`;
  }, [result]);

  const askMemory = useCallback(
    async (overrides?: {
      query?: string;
      compare?: boolean;
      layer?: MemoryFilter;
    }) => {
      const nextQuery = overrides?.query ?? query;
      const nextCompare = overrides?.compare ?? compare;
      const nextLayer = overrides?.layer ?? layer;
      const trimmed = nextQuery.trim();
      if (!trimmed) {
        setError("Enter a memory question first.");
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          q: trimmed,
          layer: nextLayer,
          limit: "5",
        });
        if (nextCompare) params.set("compare", "1");

        const response = await apiFetch(`/api/memory/ask?${params.toString()}`);
        const data = (await response.json().catch(() => null)) as
          | MemoryAskResponse
          | { error?: string }
          | null;

        if (!response.ok) {
          setResult(null);
          setError(
            (data as { error?: string } | null)?.error ?? "Memory ask failed.",
          );
          return;
        }

        setResult(data as MemoryAskResponse);
      } catch {
        setResult(null);
        setError("Memory ask is unavailable right now.");
      } finally {
        setLoading(false);
      }
    },
    [compare, layer, query],
  );

  useEffect(() => {
    if (initialQuery == null) return;
    setQuery(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    setCompare(initialCompare);
  }, [initialCompare]);

  useEffect(() => {
    if (!autoRunOnInitialQuery) return;
    const trimmed = initialQuery?.trim() ?? "";
    if (!trimmed) return;
    const key = `${trimmed}::${initialCompare ? "1" : "0"}`;
    if (lastAutoRunKeyRef.current === key) return;
    lastAutoRunKeyRef.current = key;
    void askMemory({ query: trimmed, compare: initialCompare });
  }, [askMemory, autoRunOnInitialQuery, initialCompare, initialQuery]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <SurfaceCallout
        tone="info"
        compact
        icon="Search"
        title={copy.introTitle}
        description={copy.introDescription}
      />

      <ShellSegmentedTabs
        items={FILTER_LABELS}
        active={layer}
        onChange={setLayer}
        minButtonWidth={110}
      />

      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        <textarea
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={copy.placeholder}
          aria-label={copy.introTitle}
          rows={3}
          style={{
            width: "100%",
            minHeight: "96px",
            padding: "10px 12px",
            borderRadius: "12px",
            border: "1px solid var(--border)",
            background: "rgba(11, 17, 32, 0.72)",
            color: "var(--text)",
            fontSize: "13px",
            outline: "none",
            resize: "vertical",
          }}
        />

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "10px",
            flexWrap: "wrap",
          }}
        >
          <label
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "12px",
              color: "var(--text2)",
            }}
          >
            <input
              type="checkbox"
              checked={compare}
              onChange={(event) => setCompare(event.target.checked)}
            />
            Compare with optional sidecar if configured
          </label>

          <ShellButton active={!loading} onClick={() => void askMemory()}>
            {loading ? "Thinking..." : "Ask memory"}
          </ShellButton>
        </div>
      </div>

      {loading ? <SurfaceSkeletonRows rows={4} height={36} /> : null}

      {error ? (
        <SurfaceCallout
          role="alert"
          tone="warning"
          compact
          icon="AlertTriangle"
          title="Memory ask blocked"
          description={error}
        />
      ) : null}

      {!loading && !error && !result ? (
        <SurfaceEmpty
          compact
          icon="Brain"
          title="No memory answer yet"
          description={copy.emptyDescription}
        />
      ) : null}

      {result ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <SurfaceCallout
            tone={
              result.confidence >= 0.7
                ? "success"
                : result.confidence >= 0.4
                  ? "info"
                  : "warning"
            }
            compact
            icon="Sparkles"
            title="Local memory answer"
            description={result.answer}
          >
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              <ShellBadge tone="accent">
                {formatConfidence(result.confidence)} confidence
              </ShellBadge>
              <ShellBadge tone="muted">{result.matchCount} matches</ShellBadge>
              <ShellBadge tone="muted">
                Restricted withheld {result.withheldRestrictedCount}
              </ShellBadge>
              {comparisonLabel ? (
                <ShellBadge tone="muted">{comparisonLabel}</ShellBadge>
              ) : null}
            </div>
          </SurfaceCallout>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "10px",
            }}
          >
            <div
              style={{
                border: "1px solid rgba(123, 167, 212, 0.14)",
                borderRadius: "14px",
                padding: "12px",
                background:
                  "linear-gradient(180deg, rgba(11, 17, 32, 0.92), rgba(11, 17, 32, 0.66))",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
              }}
            >
              <div
                style={{
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "var(--text)",
                }}
              >
                Citations
              </div>
              {result.sources.length === 0 ? (
                <div style={{ fontSize: "12px", color: "var(--text2)" }}>
                  No local sources matched strongly enough to cite yet.
                </div>
              ) : (
                result.sources.map((source) => (
                  <div
                    key={source.id}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "6px",
                    }}
                  >
                    <div style={{ fontSize: "12px", color: "var(--text)" }}>
                      {source.title}
                    </div>
                    <div
                      style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}
                    >
                      <ShellBadge tone="accent">{source.layer}</ShellBadge>
                      <ShellBadge tone="muted">{source.domain}</ShellBadge>
                      <ShellBadge tone="muted">{source.sourceLabel}</ShellBadge>
                    </div>
                    <div style={{ fontSize: "11px", color: "var(--text3)" }}>
                      {formatTimestamp(source.timestamp)}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div
              style={{
                border: "1px solid rgba(123, 167, 212, 0.14)",
                borderRadius: "14px",
                padding: "12px",
                background:
                  "linear-gradient(180deg, rgba(11, 17, 32, 0.92), rgba(11, 17, 32, 0.66))",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
              }}
            >
              <div
                style={{
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "var(--text)",
                }}
              >
                Related artifacts
              </div>
              {result.relatedItems.length === 0 ? (
                <div style={{ fontSize: "12px", color: "var(--text2)" }}>
                  No related artifacts yet.
                </div>
              ) : (
                result.relatedItems.slice(0, 4).map((item) => (
                  <div
                    key={item.id}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "6px",
                    }}
                  >
                    <div style={{ fontSize: "12px", color: "var(--text)" }}>
                      {item.title}
                    </div>
                    <div
                      style={{
                        fontSize: "12px",
                        lineHeight: 1.5,
                        color: "var(--text2)",
                      }}
                    >
                      {item.summary}
                    </div>
                    <div
                      style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}
                    >
                      <ShellBadge tone="accent">{item.layer}</ShellBadge>
                      <ShellBadge tone="muted">{item.domain}</ShellBadge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {result.gaps.length > 0 ? (
            <SurfaceCallout
              tone="warning"
              compact
              icon="Radar"
              title="Coverage gaps"
              description={result.gaps.join(" ")}
            />
          ) : null}

          <div style={{ fontSize: "11px", color: "var(--text3)" }}>
            {result.note}
          </div>
        </div>
      ) : null}
    </div>
  );
}
