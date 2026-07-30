"use client";

import type { Article } from "@/store/useStore";
import type { VaultGraphData } from "@/components/home/office/types";
import { copyTextWithFeedback } from "@/components/ui/clipboardFeedback";
import { requestTextDownload } from "@/components/ui/downloadFeedback";
import TrustOperationsRail from "@/components/ui/TrustOperationsRail";
import {
  OpsField,
  OpsInspector,
  OpsRail,
  OpsWorkplane,
  ShellBadge,
  ShellStack,
} from "@/components/ui/shell";
import VaultGraphControlsSection from "@/components/vault/VaultGraphControlsSection";
import VaultGraphFocusPanel from "@/components/vault/VaultGraphFocusPanel";
import { VaultLibrarianPanel } from "@/components/vault/VaultLibrarianPanel";
import { VaultGraphView } from "@/components/vault/VaultGraphView";
import {
  resetGraphFiltersToBalanced,
  type CompiledMemoryPageSummary,
  type GraphSourceFilter,
  type GraphVisibilityFilter,
} from "@/components/vault/vaultGraphPageUtils";

interface VaultRelationsChamberProps {
  memoryBriefTitle: string;
  memoryBriefDetail: string;
  relationsTitle: string;
  relationsDetail: string;
  primarySignal: string;
  railClass: string;
  workplaneClass: string;
  inspectorClass: string;
  trustLabel: string;
  graphAudit: string | null;
  filteredGraph: VaultGraphData;
  graphSourceFilter: GraphSourceFilter;
  graphVisibilityFilter: GraphVisibilityFilter;
  selectedGraphNodeId: string | null;
  typeCounts: Record<string, number>;
  visibilityCounts: Record<"safe" | "internal" | "restricted", number>;
  savedArticles: Article[];
  compiledPages: CompiledMemoryPageSummary[];
  onSetSourceFilter: (filter: GraphSourceFilter) => void;
  onSetVisibilityFilter: (filter: GraphVisibilityFilter) => void;
  onSelectNode: (nodeId: string | null) => void;
}

function getGraphViewLabel(
  source: GraphSourceFilter,
  visibility: GraphVisibilityFilter,
) {
  if (source === "compiled" && visibility === "all") return "Compiled research";
  if (source === "all" && visibility === "safe") return "Safe-only topology";
  if (source === "all" && visibility === "restricted")
    return "Restricted topology";
  if (source === "clips") return "Saved clips";
  if (visibility === "sensitive") return "Sensitive topology";
  return "Balanced topology";
}

function getGraphViewMessage(
  source: GraphSourceFilter,
  visibility: GraphVisibilityFilter,
  graphAudit: string | null,
) {
  if (graphAudit === "orphans") return "Recover orphaned archive links";
  if (source === "compiled") return "Compiled pages only";
  if (visibility === "safe") return "Safe archive slice";
  if (visibility === "restricted") return "Restricted archive slice";
  if (visibility === "sensitive") return "Internal + restricted slice";
  return "Mixed archive topology";
}

export default function VaultRelationsChamber({
  memoryBriefTitle,
  memoryBriefDetail,
  relationsTitle,
  relationsDetail,
  primarySignal,
  railClass,
  workplaneClass,
  inspectorClass,
  trustLabel,
  graphAudit,
  filteredGraph,
  graphSourceFilter,
  graphVisibilityFilter,
  selectedGraphNodeId,
  typeCounts,
  visibilityCounts,
  savedArticles,
  compiledPages,
  onSetSourceFilter,
  onSetVisibilityFilter,
  onSelectNode,
}: VaultRelationsChamberProps) {
  return (
    <div id="vault-relations" style={{ scrollMarginTop: "120px" }}>
      <div className="nexus-surface-chamber-shell">
        <div className="nexus-surface-chamber-shell__body">
          <OpsRail
            className={`nexus-surface-chamber-shell__support nexus-ops-rail--sticky ${railClass}`}
          >
            <ShellStack gap="12px">
              <OpsField
                title={memoryBriefTitle}
                detail={memoryBriefDetail}
                tone="muted"
                compact
              >
                <div className="nexus-shell-copy nexus-shell-copy--compact">
                  Relation mode keeps the graph primary. Stewardship, trust
                  posture, and durable archive continuity stay one rail away
                  instead of competing with the topology view.
                </div>
                <div
                  className="nexus-vault-rail-preview"
                  aria-label="Relations rail preview"
                >
                  <span>{primarySignal}</span>
                  <span>{filteredGraph.nodes.length} nodes</span>
                  <span>{filteredGraph.orphans.length} orphans</span>
                </div>
                <div className="nexus-shell-actions">
                  <ShellBadge tone="accent">
                    {filteredGraph.orphans.length} orphans
                  </ShellBadge>
                  <ShellBadge tone="muted">
                    {filteredGraph.clusters.length} clusters
                  </ShellBadge>
                  <ShellBadge tone="muted">
                    {selectedGraphNodeId ? "Node selected" : "No node selected"}
                  </ShellBadge>
                </div>
              </OpsField>
              <TrustOperationsRail
                title={trustLabel}
                detail="Graph mutations, export posture, and protected archive actions stay inline with relation review."
                compact
              />
            </ShellStack>
          </OpsRail>

          <OpsWorkplane
            className={`nexus-surface-chamber-shell__lead ${workplaneClass}`}
          >
            <OpsField title={relationsTitle} detail={relationsDetail}>
              <div className="nexus-shell-copy nexus-shell-copy--compact">
                Trace how clips, compiled pages, and durable notes connect
                before promoting, exporting, or repairing archive state.
              </div>
              <div style={{ marginTop: "14px" }}>
                <VaultGraphControlsSection
                  activeGraphViewLabel={getGraphViewLabel(
                    graphSourceFilter,
                    graphVisibilityFilter,
                  )}
                  graphViewMsg={getGraphViewMessage(
                    graphSourceFilter,
                    graphVisibilityFilter,
                    graphAudit,
                  )}
                  nodeCount={filteredGraph.nodes.length}
                  edgeCount={filteredGraph.edges.length}
                  clusterCount={filteredGraph.clusters.length}
                  orphanCount={filteredGraph.orphans.length}
                  graphSourceFilter={graphSourceFilter}
                  graphVisibilityFilter={graphVisibilityFilter}
                  selectedGraphNodeId={selectedGraphNodeId}
                  typeCounts={typeCounts}
                  visibilityCounts={visibilityCounts}
                  onApplyPreset={(nextSource, nextVisibility) => {
                    onSetSourceFilter(nextSource);
                    onSetVisibilityFilter(nextVisibility);
                  }}
                  onCopyGraphViewSummary={async () => {
                    const summary = [
                      getGraphViewLabel(
                        graphSourceFilter,
                        graphVisibilityFilter,
                      ),
                      `${filteredGraph.nodes.length} nodes`,
                      `${filteredGraph.edges.length} edges`,
                      `${filteredGraph.orphans.length} orphans`,
                    ].join(" · ");
                    await copyTextWithFeedback(summary, "Graph view summary");
                  }}
                  onCopyVisibleGraphNodes={async () => {
                    const visibleNodes = filteredGraph.nodes
                      .map((node) => node.title)
                      .join("\n");
                    await copyTextWithFeedback(
                      visibleNodes,
                      "Visible graph nodes",
                    );
                  }}
                  onDownloadVisibleGraphNodes={() => {
                    requestTextDownload({
                      filename: "vault-visible-nodes.json",
                      content: JSON.stringify(filteredGraph.nodes, null, 2),
                      label: "Visible graph nodes",
                      mimeType: "application/json",
                    });
                  }}
                  onResetGraphView={() => {
                    const reset = resetGraphFiltersToBalanced();
                    onSetSourceFilter(reset.source);
                    onSetVisibilityFilter(reset.visibility);
                    onSelectNode(null);
                  }}
                  onSetSourceFilter={onSetSourceFilter}
                  onSetVisibilityFilter={onSetVisibilityFilter}
                />
              </div>

              <div
                className="nexus-surface-chamber-shell__body"
                style={{ marginTop: "14px" }}
              >
                <div className="nexus-surface-chamber-shell__lead">
                  <div className="nexus-vault-graph-surface">
                    <div className="nexus-vault-graph-surface__meta">
                      <span>Visible nodes {filteredGraph.nodes.length}</span>
                      <span>Edges {filteredGraph.edges.length}</span>
                    </div>
                    <div className="nexus-vault-graph-surface__canvas">
                      <VaultGraphView
                        graph={filteredGraph}
                        onNode={onSelectNode}
                      />
                    </div>
                  </div>
                </div>
                <OpsInspector
                  className={`nexus-surface-chamber-shell__support nexus-ops-rail--sticky ${inspectorClass}`}
                >
                  <ShellStack gap="12px">
                    <OpsField
                      title="Graph focus"
                      detail="Drill into the selected node"
                      tone="muted"
                      compact
                    >
                      <VaultGraphFocusPanel
                        nodeId={selectedGraphNodeId}
                        savedArticles={savedArticles}
                        compiledPages={compiledPages}
                        graph={filteredGraph}
                        onSelectNode={onSelectNode}
                      />
                    </OpsField>
                    <OpsField
                      title="Vault librarian"
                      detail="Synthesis and lint posture"
                      tone="muted"
                      compact
                    >
                      <VaultLibrarianPanel
                        compiledPages={compiledPages}
                        selectedNodeId={selectedGraphNodeId}
                      />
                    </OpsField>
                  </ShellStack>
                </OpsInspector>
              </div>
            </OpsField>
          </OpsWorkplane>
        </div>
      </div>
    </div>
  );
}
