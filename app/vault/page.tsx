"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import type { Article } from "@/store/useStore";
import type {
  VaultGraphData,
  VaultItemMetadata,
} from "@/components/home/office/types";
import TrustOperationsRail from "@/components/ui/TrustOperationsRail";
import MissionHandoffStrip from "@/components/ui/MissionHandoffStrip";
import SurfaceFocusStrip from "@/components/ui/SurfaceFocusStrip";
import {
  OpsField,
  OpsInspector,
  OpsRail,
  OpsStrip,
  OpsWorkplane,
  ShellBadge,
  ShellPage,
  ShellSegmentedTabs,
  ShellStack,
} from "@/components/ui/shell";
import { useSessionHrefAutoHeal } from "@/hooks/useSessionHrefAutoHeal";
import { useSurfaceFocusScroll } from "@/hooks/useSurfaceFocusScroll";
import { getOpsLayoutDescriptor } from "@/lib/opsLayoutRegistry";
import { getSurfaceModuleSpec } from "@/lib/surfaceRedesignRegistry";
import {
  resolveVaultChamber,
  type VaultChamberId,
} from "@/lib/surfaceCondensationRegistry";
import { buildVaultGraph } from "@/lib/vaultGraph";
import {
  buildArticleReasoningGraphText,
  getArticleReasoningSummary,
} from "@/lib/articleReasoning";
import { buildVaultArchiveLinkGraphEdges } from "@/lib/vaultCrossLinker";
import {
  buildCompiledPageGraphText,
  buildVaultGraphFocusHref,
  coerceStoredGraphFilters,
  filterVaultGraph,
  resetGraphFiltersToBalanced,
  toCompiledPageGraphNode,
  VAULT_GRAPH_FILTERS_STORAGE_KEY,
  type CompiledMemoryPageSummary,
  type GraphSourceFilter,
  type GraphVisibilityFilter,
} from "@/components/vault/vaultGraphPageUtils";
import VaultModeOrientationSection from "@/components/vault/VaultModeOrientationSection";
import { useStore } from "@/store/useStore";

const LazyMemorySpineOverview = dynamic(
  () => import("@/components/vault/MemorySpineOverview"),
  { ssr: false },
);
const LazyMemoryPalacePanel = dynamic(
  () => import("@/components/vault/MemoryPalacePanel"),
  { ssr: false },
);
const LazyMemoryAskPanel = dynamic(
  () => import("@/components/vault/MemoryAskPanel"),
  { ssr: false },
);
const LazyVaultStewardshipPanel = dynamic(
  () => import("@/components/vault/VaultStewardshipPanel"),
  { ssr: false },
);
const LazyDocumentIntakePanel = dynamic(
  () => import("@/components/vault/DocumentIntakePanel"),
  { ssr: false },
);
const LazySavedArticles = dynamic(
  () => import("@/components/vault/SavedArticles"),
  { ssr: false },
);
const LazyCompiledMemoryPagesPanel = dynamic(
  () => import("@/components/vault/CompiledMemoryPagesPanel"),
  { ssr: false },
);
const LazyVaultExport = dynamic(
  () => import("@/components/vault/VaultExport"),
  { ssr: false },
);
const LazyVaultGraphControlsSection = dynamic(
  () => import("@/components/vault/VaultGraphControlsSection"),
  { ssr: false },
);
const LazyVaultGraphFocusPanel = dynamic(
  () => import("@/components/vault/VaultGraphFocusPanel"),
  { ssr: false },
);
const LazyVaultLibrarianPanel = dynamic(
  () => import("@/components/vault/VaultLibrarianPanel").then((module) => ({
    default: module.VaultLibrarianPanel,
  })),
  { ssr: false },
);
const LazyVaultGraphView = dynamic(
  () => import("@/components/vault/VaultGraphView").then((module) => ({
    default: module.VaultGraphView,
  })),
  { ssr: false },
);

type MemoryBriefView =
  | "spine"
  | "project"
  | "conversation"
  | "general"
  | "research"
  | "study"
  | "stewardship";

type ArchiveLaneView = "intake" | "clips" | "ask";

const CHAMBERS: Array<{ id: VaultChamberId; label: string }> = [
  { id: "archive", label: "Archive" },
  { id: "relations", label: "Relations" },
  { id: "publish", label: "Publish" },
];

const MEMORY_VIEWS: Array<{ id: MemoryBriefView; label: string }> = [
  { id: "spine", label: "Spine" },
  { id: "project", label: "Project" },
  { id: "conversation", label: "Conversation" },
  { id: "general", label: "General" },
  { id: "research", label: "Research" },
  { id: "study", label: "Study" },
  { id: "stewardship", label: "Steward" },
];

const ARCHIVE_LANE_VIEWS: Array<{ id: ArchiveLaneView; label: string }> = [
  { id: "intake", label: "Intake" },
  { id: "clips", label: "Saved clips" },
  { id: "ask", label: "Ask memory" },
];

function toSavedArticleNode(article: Article): VaultItemMetadata {
  return {
    id: article.id,
    title: article.title,
    tags: article.tags ?? [],
    timestamp: Date.parse(article.date) || Date.now(),
    type: "clip",
    visibility: "safe",
    originKind: "saved_article",
    namespace: "user",
    sourceType: "clip",
    tldr: getArticleReasoningSummary(article),
  };
}

function buildSavedArticleGraphText(article: Article) {
  return buildArticleReasoningGraphText(article);
}

function getGraphViewLabel(
  source: GraphSourceFilter,
  visibility: GraphVisibilityFilter,
) {
  if (source === "compiled" && visibility === "all") return "Compiled research";
  if (source === "all" && visibility === "safe") return "Safe-only topology";
  if (source === "all" && visibility === "restricted") return "Restricted topology";
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

function focusToMemoryView(focus: string | null): MemoryBriefView | null {
  if (focus === "vault-memory-spine") return "spine";
  if (focus === "vault-memory-project") return "project";
  if (focus === "vault-memory-conversation") return "conversation";
  if (focus === "vault-memory-general") return "general";
  if (focus === "vault-memory-research") return "research";
  if (focus === "vault-memory-study") return "study";
  if (focus === "vault-stewardship") return "stewardship";
  return null;
}

export default function VaultPage() {
  const router = useRouter();
  const { normalizedParams } = useSessionHrefAutoHeal();
  const focus = normalizedParams.get("focus");
  const mission = normalizedParams.get("mission");
  const from = normalizedParams.get("from");
  const source = normalizedParams.get("source");
  const graphAudit = normalizedParams.get("graphAudit");
  const requestedGraphNodeId = normalizedParams.get("nodeId")?.trim() || null;
  const savedArticles = useStore((s) => s.savedArticles);
  const setVaultGraph = useStore((s) => s.setVaultGraph);

  const [chamber, setChamber] = useState<VaultChamberId>("archive");
  const [memoryView, setMemoryView] = useState<MemoryBriefView>("spine");
  const [archiveLane, setArchiveLane] = useState<ArchiveLaneView>("intake");
  const [compiledPages, setCompiledPages] = useState<CompiledMemoryPageSummary[]>([]);
  const [compiledLoading, setCompiledLoading] = useState(false);
  const [graphSourceFilter, setGraphSourceFilter] =
    useState<GraphSourceFilter>("all");
  const [graphVisibilityFilter, setGraphVisibilityFilter] =
    useState<GraphVisibilityFilter>("all");
  const [selectedGraphNodeId, setSelectedGraphNodeId] = useState<string | null>(
    null,
  );
  const vaultLayout = getOpsLayoutDescriptor("vault");

  const urlView = useMemo(() => {
    const next = (normalizedParams.get("view") ?? "").toLowerCase();
    if (!next) return null;
    return resolveVaultChamber(next);
  }, [normalizedParams]);

  const focusChamber = useMemo(() => {
    if (focus === "vault-graph-focus") return "relations";
    if (
      focus === "vault-compiled-pages" ||
      focus === "vault-export-second-brain"
    ) {
      return "publish";
    }
    if (focusToMemoryView(focus)) return "archive";
    return null;
  }, [focus]);

  useEffect(() => {
    if (focusChamber) {
      setChamber(focusChamber);
      return;
    }
    if (urlView) {
      setChamber(urlView);
    }
  }, [focusChamber, urlView]);

  useEffect(() => {
    const nextMemoryView = focusToMemoryView(focus);
    if (nextMemoryView) {
      setMemoryView(nextMemoryView);
    }
  }, [focus]);

  const refreshCompiledPages = useCallback(async () => {
    setCompiledLoading(true);
    try {
      const response = await fetch(`/api/memory/pages?limit=64`, {
        cache: "no-store",
      });
      if (!response.ok) return;
      const payload = (await response.json()) as {
        pages?: CompiledMemoryPageSummary[];
      };
      setCompiledPages(Array.isArray(payload.pages) ? payload.pages : []);
    } catch {
      setCompiledPages([]);
    } finally {
      setCompiledLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshCompiledPages();
    const handleRefresh = () => {
      void refreshCompiledPages();
    };
    window.addEventListener("nexus-memory-pages-updated", handleRefresh);
    return () => {
      window.removeEventListener("nexus-memory-pages-updated", handleRefresh);
    };
  }, [refreshCompiledPages]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(VAULT_GRAPH_FILTERS_STORAGE_KEY);
      if (!raw) return;
      const parsed = coerceStoredGraphFilters(JSON.parse(raw));
      if (!parsed) return;
      setGraphSourceFilter(parsed.source);
      setGraphVisibilityFilter(parsed.visibility);
    } catch {
      // silent fallback
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        VAULT_GRAPH_FILTERS_STORAGE_KEY,
        JSON.stringify({
          source: graphSourceFilter,
          visibility: graphVisibilityFilter,
        }),
      );
    } catch {
      // silent fallback
    }
  }, [graphSourceFilter, graphVisibilityFilter]);

  const savedArticleNodes = useMemo(
    () => savedArticles.map((article) => toSavedArticleNode(article)),
    [savedArticles],
  );

  const savedArticleTexts = useMemo(
    () =>
      Object.fromEntries(
        savedArticles.map((article) => [
          article.id,
          buildSavedArticleGraphText(article),
        ]),
      ),
    [savedArticles],
  );

  const compiledPageNodes = useMemo(
    () => compiledPages.map((page) => toCompiledPageGraphNode(page)),
    [compiledPages],
  );

  const compiledPageTexts = useMemo(
    () =>
      Object.fromEntries(
        compiledPages.map((page) => [
          `page:${page.id}`,
          buildCompiledPageGraphText(page),
        ]),
      ),
    [compiledPages],
  );

  const fullGraph = useMemo(() => {
    const archiveEdges = buildVaultArchiveLinkGraphEdges({
      savedArticles,
      compiledPages,
    });
    return buildVaultGraph(
      [...savedArticleNodes, ...compiledPageNodes],
      {
        ...savedArticleTexts,
        ...compiledPageTexts,
      },
      archiveEdges,
    );
  }, [
    compiledPageNodes,
    compiledPageTexts,
    compiledPages,
    savedArticleNodes,
    savedArticleTexts,
    savedArticles,
  ]);

  useEffect(() => {
    setVaultGraph(fullGraph);
  }, [fullGraph, setVaultGraph]);

  const filteredGraph = useMemo(() => {
    return (
      filterVaultGraph(fullGraph, graphSourceFilter, graphVisibilityFilter) ??
      ({
        nodes: [],
        edges: [],
        clusters: [],
        orphans: [],
        builtAt: Date.now(),
      } satisfies VaultGraphData)
    );
  }, [fullGraph, graphSourceFilter, graphVisibilityFilter]);

  useEffect(() => {
    if (!selectedGraphNodeId) return;
    if (!filteredGraph.nodes.some((node) => node.id === selectedGraphNodeId)) {
      setSelectedGraphNodeId(null);
    }
  }, [filteredGraph.nodes, selectedGraphNodeId]);

  useEffect(() => {
    if (requestedGraphNodeId) {
      setSelectedGraphNodeId((current) =>
        current === requestedGraphNodeId ? current : requestedGraphNodeId,
      );
      return;
    }
    if (focus === "vault-graph-focus" && graphAudit !== "orphans") {
      setSelectedGraphNodeId(null);
    }
  }, [focus, graphAudit, requestedGraphNodeId]);

  useEffect(() => {
    if (
      focus !== "vault-graph-focus" ||
      graphAudit !== "orphans" ||
      requestedGraphNodeId
    ) {
      return;
    }
    if (filteredGraph.orphans.length === 0) return;
    setSelectedGraphNodeId(filteredGraph.orphans[0] ?? null);
  }, [filteredGraph.orphans, focus, graphAudit, requestedGraphNodeId]);

  useEffect(() => {
    if (!selectedGraphNodeId && !requestedGraphNodeId) return;
    const nextHref = selectedGraphNodeId
      ? buildVaultGraphFocusHref({
          nodeId: selectedGraphNodeId,
          graphAudit,
        })
      : buildVaultGraphFocusHref({ graphAudit });
    const currentHref = `/vault${
      normalizedParams.toString() ? `?${normalizedParams.toString()}` : ""
    }`;
    if (nextHref !== currentHref) {
      router.replace(nextHref);
    }
  }, [
    graphAudit,
    normalizedParams,
    requestedGraphNodeId,
    router,
    selectedGraphNodeId,
  ]);

  const handleChamberChange = (nextView: VaultChamberId) => {
    setChamber(nextView);
    const params = new URLSearchParams(normalizedParams.toString());
    params.set("view", nextView);
    router.replace(`/vault?${params.toString()}`);
  };

  const focusTargetId =
    focus === "vault-graph-focus"
      ? "vault-relations"
      : focus === "vault-compiled-pages" || focus === "vault-export-second-brain"
        ? "vault-publish"
        : focusToMemoryView(focus)
          ? "vault-memory-brief"
          : null;

  useSurfaceFocusScroll(focusTargetId);

  const memoryBriefSpec = getSurfaceModuleSpec("vault", "memory-brief");
  const archiveWorkbenchSpec = getSurfaceModuleSpec("vault", "archive-workbench");
  const durableArtifactsSpec = getSurfaceModuleSpec("vault", "durable-artifacts");
  const relationsSpec = getSurfaceModuleSpec("vault", "relations");

  const archiveCount = compiledPages.length + savedArticles.length;
  const visibilityCounts = useMemo(() => {
    return filteredGraph.nodes.reduce<
      Record<"safe" | "internal" | "restricted", number>
    >(
      (acc, node) => {
        const visibility = node.visibility ?? "safe";
        acc[visibility] += 1;
        return acc;
      },
      { safe: 0, internal: 0, restricted: 0 },
    );
  }, [filteredGraph.nodes]);

  const typeCounts = useMemo(() => {
    return filteredGraph.nodes.reduce<Record<string, number>>((acc, node) => {
      acc[node.type] = (acc[node.type] ?? 0) + 1;
      return acc;
    }, {});
  }, [filteredGraph.nodes]);

  if (
    !memoryBriefSpec ||
    !archiveWorkbenchSpec ||
    !durableArtifactsSpec ||
    !relationsSpec
  ) {
    return null;
  }

  return (
    <ShellPage
      width="wide"
      surface="vault"
      eyebrow="Dossier archive"
      title="Archive spine"
      description="Memory, research, and graph recall."
      actions={
        <>
          <ShellBadge tone="accent">Durable memory</ShellBadge>
          <ShellBadge tone="muted">Archive-first continuity</ShellBadge>
        </>
      }
    >
      <ShellStack>
        <OpsStrip className="nexus-surface-route-strip">
          <div className="nexus-surface-route-strip__grid">
            <div className="nexus-surface-route-strip__cell">
              <span className="nexus-surface-route-strip__cellLabel">Archive load</span>
              <strong className="nexus-surface-route-strip__cellValue">
                {archiveCount}
              </strong>
              <span className="nexus-surface-route-strip__cellNote">
                Saved clips and compiled memory stay on one spine.
              </span>
            </div>
            <div className="nexus-surface-route-strip__cell">
              <span className="nexus-surface-route-strip__cellLabel">Active chamber</span>
              <strong className="nexus-surface-route-strip__cellValue">
                {chamber}
              </strong>
              <span className="nexus-surface-route-strip__cellNote">
                One chamber in front of one rail.
              </span>
            </div>
            <div className="nexus-surface-route-strip__cell">
              <span className="nexus-surface-route-strip__cellLabel">Graph nodes</span>
              <strong className="nexus-surface-route-strip__cellValue">
                {filteredGraph.nodes.length}
              </strong>
              <span className="nexus-surface-route-strip__cellNote">
                Relation mode keeps topology primary.
              </span>
            </div>
            <div className="nexus-surface-route-strip__cell">
              <span className="nexus-surface-route-strip__cellLabel">Compiled pages</span>
              <strong className="nexus-surface-route-strip__cellValue">
                {compiledLoading ? "…" : compiledPages.length}
              </strong>
              <span className="nexus-surface-route-strip__cellNote">
                Durable artifacts stay one chamber away.
              </span>
            </div>
          </div>
        </OpsStrip>

        <MissionHandoffStrip
          surface="vault"
          mission={mission}
          from={from}
          source={source}
        />

        {focus === "vault-memory-project" ? (
          <SurfaceFocusStrip
            title="Focused session: project memory"
            description="Project memory opens first."
          />
        ) : null}

        {focus === "vault-memory-research" ? (
          <SurfaceFocusStrip
            title="Focused session: research memory"
            description="Research memory opens first."
          />
        ) : null}

        {focus === "vault-memory-study" ? (
          <SurfaceFocusStrip
            title="Focused session: study memory"
            description="Study memory opens first."
          />
        ) : null}

        {focus === "vault-memory-conversation" ? (
          <SurfaceFocusStrip
            title="Focused session: conversation memory"
            description="Conversation memory opens first."
          />
        ) : null}

        {focus === "vault-memory-general" ? (
          <SurfaceFocusStrip
            title="Focused session: general memory"
            description="General memory opens first."
          />
        ) : null}

        {focus === "vault-stewardship" ? (
          <SurfaceFocusStrip
            title="Focused session: vault stewardship"
            description="Stewardship opens first."
          />
        ) : null}

        {focus === "vault-graph-focus" ? (
          <SurfaceFocusStrip
            title="Focused session: graph focus"
            description="Relations open first."
          />
        ) : null}

        {focus === "vault-compiled-pages" ? (
          <SurfaceFocusStrip
            title="Focused session: durable artifacts"
            description="Compiled pages open first."
          />
        ) : null}

        {focus === "vault-export-second-brain" ? (
          <SurfaceFocusStrip
            title="Focused session: second-brain export"
            description="Export opens first."
          />
        ) : null}

        <VaultModeOrientationSection mode={chamber} />

        <ShellSegmentedTabs
          items={CHAMBERS}
          active={chamber}
          onChange={handleChamberChange}
          minButtonWidth={132}
        />
        {chamber === "archive" ? (
          <div id="vault-archive" style={{ scrollMarginTop: "120px" }}>
            <div className="nexus-surface-chamber-shell">
              <div className="nexus-surface-chamber-shell__body">
                <OpsRail className={`nexus-surface-chamber-shell__support ${vaultLayout.railClass}`}>
                  <div id="vault-memory-brief" style={{ scrollMarginTop: "120px" }}>
                    <OpsField title={memoryBriefSpec.title} detail={memoryBriefSpec.detail} tone="muted" compact>
                      <div className="nexus-surface-subtabs">
                        <ShellSegmentedTabs
                          items={MEMORY_VIEWS}
                          active={memoryView}
                          onChange={setMemoryView}
                          minButtonWidth={110}
                        />
                        {memoryView === "spine" ? <LazyMemorySpineOverview /> : null}
                        {memoryView === "project" ? (
                          <LazyMemoryPalacePanel compartment="project" />
                        ) : null}
                        {memoryView === "conversation" ? (
                          <LazyMemoryPalacePanel compartment="conversation" />
                        ) : null}
                        {memoryView === "general" ? (
                          <LazyMemoryPalacePanel compartment="general" />
                        ) : null}
                        {memoryView === "research" ? (
                          <LazyMemoryPalacePanel compartment="research" />
                        ) : null}
                        {memoryView === "study" ? (
                          <LazyMemoryPalacePanel compartment="study" />
                        ) : null}
                        {memoryView === "stewardship" ? (
                          <LazyVaultStewardshipPanel compiledPages={compiledPages} />
                        ) : null}
                      </div>
                    </OpsField>
                  </div>
                </OpsRail>

                <OpsWorkplane className={`nexus-surface-chamber-shell__lead ${vaultLayout.workplaneClass}`}>
                  <OpsField title={archiveWorkbenchSpec.title} detail={archiveWorkbenchSpec.detail}>
                    <div className="nexus-surface-subtabs">
                      <ShellSegmentedTabs
                        items={ARCHIVE_LANE_VIEWS}
                        active={archiveLane}
                        onChange={setArchiveLane}
                        minButtonWidth={118}
                      />
                      {archiveLane === "intake" ? (
                        <OpsField
                          title="Document intake"
                          detail="Bring new local material into the archive"
                        >
                          <LazyDocumentIntakePanel />
                        </OpsField>
                      ) : null}
                      {archiveLane === "clips" ? (
                        <OpsField
                          title="Saved clips"
                          detail="Curated article memory inside the archive"
                        >
                          <LazySavedArticles />
                        </OpsField>
                      ) : null}
                      {archiveLane === "ask" ? (
                        <OpsField
                          title="Ask memory"
                          detail="Query local archive state without leaving VAULT"
                        >
                          <LazyMemoryAskPanel surface="vault" />
                        </OpsField>
                      ) : null}
                    </div>
                  </OpsField>
                </OpsWorkplane>
              </div>

              <div className="nexus-surface-continuity-strip">
                <OpsStrip className="nexus-motion-enter nexus-motion-enter--continuity">
                  <OpsField
                    title="Compiled memory pages"
                    detail="Compiled pages, durable notes, and export continuity"
                    tone="muted"
                  >
                    <LazyCompiledMemoryPagesPanel />
                  </OpsField>
                </OpsStrip>
              </div>
            </div>
          </div>
        ) : null}

        {chamber === "relations" ? (
          <div id="vault-relations" style={{ scrollMarginTop: "120px" }}>
            <div className="nexus-surface-chamber-shell">
              <div className="nexus-surface-chamber-shell__body">
                <OpsRail className={`nexus-surface-chamber-shell__support ${vaultLayout.railClass}`}>
                  <ShellStack gap="12px">
                    <OpsField
                      title={memoryBriefSpec.title}
                      detail={memoryBriefSpec.detail}
                      tone="muted"
                      compact
                    >
                      <div className="nexus-shell-copy nexus-shell-copy--compact">
                        Relation mode keeps the graph primary. Stewardship, trust posture, and durable archive continuity stay one rail away instead of competing with the topology view.
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
                      title={vaultLayout.trustLabel}
                      detail="Graph mutations, export posture, and protected archive actions stay inline with relation review."
                      compact
                    />
                  </ShellStack>
                </OpsRail>

                <OpsWorkplane className={`nexus-surface-chamber-shell__lead ${vaultLayout.workplaneClass}`}>
                  <OpsField title={relationsSpec.title} detail={relationsSpec.detail}>
                    <div className="nexus-shell-copy nexus-shell-copy--compact">
                      Trace how clips, compiled pages, and durable notes connect before promoting, exporting, or repairing archive state.
                    </div>
                    <div style={{ marginTop: "14px" }}>
                      <LazyVaultGraphControlsSection
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
                          setGraphSourceFilter(nextSource);
                          setGraphVisibilityFilter(nextVisibility);
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
                          await navigator.clipboard.writeText(summary);
                        }}
                        onCopyVisibleGraphNodes={async () => {
                          const visibleNodes = filteredGraph.nodes
                            .map((node) => node.title)
                            .join("\n");
                          await navigator.clipboard.writeText(visibleNodes);
                        }}
                        onDownloadVisibleGraphNodes={() => {
                          const blob = new Blob(
                            [JSON.stringify(filteredGraph.nodes, null, 2)],
                            { type: "application/json" },
                          );
                          const url = URL.createObjectURL(blob);
                          const link = document.createElement("a");
                          link.href = url;
                          link.download = "vault-visible-nodes.json";
                          link.click();
                          URL.revokeObjectURL(url);
                        }}
                        onResetGraphView={() => {
                          const reset = resetGraphFiltersToBalanced();
                          setGraphSourceFilter(reset.source);
                          setGraphVisibilityFilter(reset.visibility);
                          setSelectedGraphNodeId(null);
                        }}
                        onSetSourceFilter={setGraphSourceFilter}
                        onSetVisibilityFilter={setGraphVisibilityFilter}
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
                            <LazyVaultGraphView
                              graph={filteredGraph}
                              onNode={setSelectedGraphNodeId}
                            />
                          </div>
                        </div>
                      </div>
                      <OpsInspector
                        className={`nexus-surface-chamber-shell__support ${vaultLayout.inspectorClass}`}
                      >
                        <ShellStack gap="12px">
                          <OpsField
                            title="Graph focus"
                            detail="Drill into the selected node"
                            tone="muted"
                            compact
                          >
                            <LazyVaultGraphFocusPanel
                              nodeId={selectedGraphNodeId}
                              savedArticles={savedArticles}
                              compiledPages={compiledPages}
                              graph={filteredGraph}
                              onSelectNode={setSelectedGraphNodeId}
                            />
                          </OpsField>
                          <OpsField
                            title="Vault librarian"
                            detail="Synthesis and lint posture"
                            tone="muted"
                            compact
                          >
                            <LazyVaultLibrarianPanel
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
        ) : null}

        {chamber === "publish" ? (
          <div id="vault-publish" style={{ scrollMarginTop: "120px" }}>
            <div className="nexus-surface-chamber-shell">
              <div className="nexus-surface-chamber-shell__body">
                <OpsRail className={`nexus-surface-chamber-shell__support ${vaultLayout.railClass}`}>
                  <ShellStack gap="12px">
                    <OpsField
                      title={memoryBriefSpec.title}
                      detail={memoryBriefSpec.detail}
                      tone="muted"
                      compact
                    >
                      <div className="nexus-shell-copy nexus-shell-copy--compact">
                        Publish mode is where durable notes get promoted, repaired, bundled, and exported. Stewardship and trust posture stay visible here so export does not outrun archive health.
                      </div>
                      <div className="nexus-shell-actions">
                        <ShellBadge tone="accent">{compiledPages.length} pages</ShellBadge>
                        <ShellBadge tone="muted">{savedArticles.length} clips</ShellBadge>
                        <ShellBadge tone="muted">
                          {compiledLoading ? "Refreshing" : "Archive ready"}
                        </ShellBadge>
                      </div>
                    </OpsField>
                    <TrustOperationsRail
                      title={vaultLayout.trustLabel}
                      detail="Promotion, export, and protected archive writes stay inline with durable publishing."
                      compact
                    />
                    <OpsField
                      title="Stewardship"
                      detail="Durable archive repair and readiness"
                      tone="muted"
                      compact
                    >
                      <LazyVaultStewardshipPanel compiledPages={compiledPages} />
                    </OpsField>
                  </ShellStack>
                </OpsRail>

                <OpsWorkplane className={`nexus-surface-chamber-shell__lead ${vaultLayout.workplaneClass}`}>
                  <OpsField title={durableArtifactsSpec.title} detail={durableArtifactsSpec.detail}>
                    <div className="nexus-shell-copy nexus-shell-copy--compact">
                      Promote, repair, and reuse durable archive outputs without leaving the active publishing lane.
                    </div>
                    <div style={{ marginTop: "14px" }}>
                      <LazyCompiledMemoryPagesPanel />
                    </div>
                  </OpsField>
                </OpsWorkplane>
              </div>

              <div
                id="vault-export-second-brain"
                className="nexus-surface-continuity-strip"
                style={{ scrollMarginTop: "120px" }}
              >
                <OpsStrip className="nexus-motion-enter nexus-motion-enter--continuity">
                  <div className="nexus-surface-chamber-shell__body">
                    <div className="nexus-surface-chamber-shell__lead">
                      <OpsField
                        title="Export archive bundles"
                        detail="JSON and second-brain continuity outputs"
                        tone="muted"
                      >
                        <LazyVaultExport compiledPages={compiledPages} />
                      </OpsField>
                    </div>
                    <OpsInspector
                      className={`nexus-surface-chamber-shell__support ${vaultLayout.inspectorClass}`}
                    >
                      <OpsField
                        title="Saved article archive"
                        detail="Durable clip backlog close to export"
                        tone="muted"
                        compact
                      >
                        <LazySavedArticles />
                      </OpsField>
                    </OpsInspector>
                  </div>
                </OpsStrip>
              </div>
            </div>
          </div>
        ) : null}
      </ShellStack>
    </ShellPage>
  );
}
