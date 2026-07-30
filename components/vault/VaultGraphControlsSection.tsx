"use client";

import { ShellBadge } from "@/components/ui/shell";
import {
  GRAPH_FILTER_PRESETS,
  GRAPH_TYPE_COLORS,
  GRAPH_VISIBILITY_COLORS,
  type GraphSourceFilter,
  type GraphVisibilityFilter,
} from "./vaultGraphPageUtils";

interface VaultGraphControlsSectionProps {
  activeGraphViewLabel: string;
  graphViewMsg: string;
  nodeCount: number;
  edgeCount: number;
  clusterCount: number;
  orphanCount: number;
  graphSourceFilter: GraphSourceFilter;
  graphVisibilityFilter: GraphVisibilityFilter;
  selectedGraphNodeId: string | null;
  typeCounts: Record<string, number>;
  visibilityCounts: Record<string, number>;
  onApplyPreset: (
    source: GraphSourceFilter,
    visibility: GraphVisibilityFilter,
  ) => void;
  onCopyGraphViewSummary: () => void | Promise<void>;
  onCopyVisibleGraphNodes: () => void | Promise<void>;
  onDownloadVisibleGraphNodes: () => void;
  onResetGraphView: () => void;
  onSetSourceFilter: (filter: GraphSourceFilter) => void;
  onSetVisibilityFilter: (filter: GraphVisibilityFilter) => void;
}

export default function VaultGraphControlsSection({
  activeGraphViewLabel,
  graphViewMsg,
  nodeCount,
  edgeCount,
  clusterCount,
  orphanCount,
  graphSourceFilter,
  graphVisibilityFilter,
  selectedGraphNodeId,
  typeCounts,
  visibilityCounts,
  onApplyPreset,
  onCopyGraphViewSummary,
  onCopyVisibleGraphNodes,
  onDownloadVisibleGraphNodes,
  onResetGraphView,
  onSetSourceFilter,
  onSetVisibilityFilter,
}: VaultGraphControlsSectionProps) {
  const resetDisabled =
    graphSourceFilter === "all" &&
    graphVisibilityFilter === "all" &&
    !selectedGraphNodeId;

  const buttonStyle = {
    minHeight: "30px",
    padding: "0 10px",
    fontSize: "11px",
  } as const;

  return (
    <>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "8px",
          alignItems: "center",
          marginBottom: "12px",
        }}
      >
        <ShellBadge tone="accent">{nodeCount} visible nodes</ShellBadge>
        <ShellBadge tone="muted">{activeGraphViewLabel}</ShellBadge>
        {graphViewMsg ? (
          <ShellBadge role="status" tone="muted">
            {graphViewMsg}
          </ShellBadge>
        ) : null}
        <ShellBadge tone="muted">{edgeCount} visible edges</ShellBadge>
        <ShellBadge tone="muted">{clusterCount} clusters</ShellBadge>
        <ShellBadge tone="muted">{orphanCount} orphans</ShellBadge>
        {GRAPH_FILTER_PRESETS.map((preset) => {
          const active =
            graphSourceFilter === preset.source &&
            graphVisibilityFilter === preset.visibility;
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => onApplyPreset(preset.source, preset.visibility)}
              className="nexus-shell-button"
              style={{
                ...buttonStyle,
                opacity: active ? 1 : 0.72,
              }}
            >
              {preset.label}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => void onCopyGraphViewSummary()}
          className="nexus-shell-button"
          style={buttonStyle}
        >
          Copy view summary
        </button>
        <button
          type="button"
          onClick={() => void onCopyVisibleGraphNodes()}
          className="nexus-shell-button"
          style={buttonStyle}
        >
          Copy visible nodes
        </button>
        <button
          type="button"
          onClick={onDownloadVisibleGraphNodes}
          className="nexus-shell-button"
          style={{
            ...buttonStyle,
            opacity: nodeCount > 0 ? 1 : 0.6,
          }}
          disabled={nodeCount === 0}
        >
          Download visible nodes JSON
        </button>
        <button
          type="button"
          onClick={onResetGraphView}
          className="nexus-shell-button"
          style={{
            ...buttonStyle,
            opacity: resetDisabled ? 0.6 : 1,
          }}
          disabled={resetDisabled}
        >
          Reset view
        </button>
        <button
          type="button"
          onClick={() => onSetSourceFilter("all")}
          className="nexus-shell-button"
          style={{
            ...buttonStyle,
            opacity: graphSourceFilter === "all" ? 1 : 0.72,
          }}
        >
          All nodes
        </button>
        <button
          type="button"
          onClick={() => onSetSourceFilter("clips")}
          className="nexus-shell-button"
          style={{
            ...buttonStyle,
            opacity: graphSourceFilter === "clips" ? 1 : 0.72,
          }}
        >
          Saved clips
        </button>
        <button
          type="button"
          onClick={() => onSetSourceFilter("compiled")}
          className="nexus-shell-button"
          style={{
            ...buttonStyle,
            opacity: graphSourceFilter === "compiled" ? 1 : 0.72,
          }}
        >
          Compiled pages
        </button>
        <button
          type="button"
          onClick={() => onSetVisibilityFilter("all")}
          className="nexus-shell-button"
          style={{
            ...buttonStyle,
            opacity: graphVisibilityFilter === "all" ? 1 : 0.72,
          }}
        >
          All visibility
        </button>
        <button
          type="button"
          onClick={() => onSetVisibilityFilter("safe")}
          className="nexus-shell-button"
          style={{
            ...buttonStyle,
            opacity: graphVisibilityFilter === "safe" ? 1 : 0.72,
          }}
        >
          Safe only
        </button>
        <button
          type="button"
          onClick={() => onSetVisibilityFilter("sensitive")}
          className="nexus-shell-button"
          style={{
            ...buttonStyle,
            opacity: graphVisibilityFilter === "sensitive" ? 1 : 0.72,
          }}
        >
          Sensitive topology
        </button>
        <button
          type="button"
          onClick={() => onSetVisibilityFilter("restricted")}
          className="nexus-shell-button"
          style={{
            ...buttonStyle,
            opacity: graphVisibilityFilter === "restricted" ? 1 : 0.72,
          }}
        >
          Restricted only
        </button>
      </div>

      <div
        style={{
          display: "grid",
          gap: "10px",
          marginBottom: "12px",
          padding: "10px 12px",
          borderRadius: "12px",
          border: "1px solid rgba(123, 167, 212, 0.12)",
          background: "rgba(9, 14, 28, 0.36)",
        }}
      >
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "10px",
            alignItems: "center",
          }}
        >
          <span
            style={{ fontSize: "11px", fontWeight: 700, color: "var(--text)" }}
          >
            Node types
          </span>
          {(["clip", "report", "note"] as const).map((type) => (
            <span
              key={type}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "11px",
                color: "var(--text3)",
              }}
            >
              <span
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "999px",
                  background: GRAPH_TYPE_COLORS[type],
                  boxShadow: `0 0 0 1px ${GRAPH_TYPE_COLORS[type]}33`,
                }}
              />
              {type} {typeCounts[type] ?? 0}
            </span>
          ))}
        </div>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "10px",
            alignItems: "center",
          }}
        >
          <span
            style={{ fontSize: "11px", fontWeight: 700, color: "var(--text)" }}
          >
            Visibility
          </span>
          {(["safe", "internal", "restricted"] as const).map((visibility) => (
            <span
              key={visibility}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "11px",
                color: "var(--text3)",
              }}
            >
              <span
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "999px",
                  background: GRAPH_VISIBILITY_COLORS[visibility],
                  boxShadow: `0 0 0 1px ${GRAPH_VISIBILITY_COLORS[visibility]}33`,
                }}
              />
              {visibility} {visibilityCounts[visibility] ?? 0}
            </span>
          ))}
        </div>
      </div>
    </>
  );
}
