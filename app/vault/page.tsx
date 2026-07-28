"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import type { Article } from "@/store/useStore";
import type {
  VaultGraphData,
  VaultItemMetadata,
} from "@/components/home/office/types";
import MissionHandoffStrip from "@/components/ui/MissionHandoffStrip";
import SurfaceFocusStrip from "@/components/ui/SurfaceFocusStrip";
import {
  OpsField,
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
const LazyFeynmanPaperLibraryPanel = dynamic(
  () => import("@/components/vault/FeynmanPaperLibraryPanel"),
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
const LazySealedVaultPanel = dynamic(
  () => import("@/components/vault/SealedVaultPanel"),
  { ssr: false },
);
const LazyLocalCredentialGeneratorPanel = dynamic(
  () => import("@/components/vault/LocalCredentialGeneratorPanel"),
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
const LazyVaultRelationsChamber = dynamic(
  () => import("@/components/vault/VaultRelationsChamber"),
  { ssr: false },
);
const LazyVaultPublishChamber = dynamic(
  () => import("@/components/vault/VaultPublishChamber"),
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

type ArchiveLaneView =
  | "intake"
  | "sealed"
  | "generator"
  | "clips"
  | "papers"
  | "ask";

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
  { id: "sealed", label: "Sealed notes" },
  { id: "generator", label: "Generator" },
  { id: "clips", label: "Saved clips" },
  { id: "papers", label: "Papers" },
  { id: "ask", label: "Ask memory" },
];

const VAULT_CHAMBER_POSTURE: Record<
  VaultChamberId,
  {
    title: string;
    summary: string;
    detail: string;
    primarySignal: string;
    supportSignal: string;
  }
> = {
  archive: {
    title: "Archive workbench",
    summary:
      "Bring new local material into the archive while memory lanes stay close, but not taller than the active intake surface.",
    detail:
      "Use archive mode when the next move is intake, saved-clip review, or a local memory question.",
    primarySignal: "Intake first",
    supportSignal: "Memory gated",
  },
  relations: {
    title: "Relations topology",
    summary:
      "Keep graph review primary while stewardship, trust posture, and librarian synthesis stay one rail away.",
    detail:
      "Use relations when archive health depends on links, orphan repair, cluster context, or selected-node focus.",
    primarySignal: "Graph first",
    supportSignal: "Librarian gated",
  },
  publish: {
    title: "Durable publishing",
    summary:
      "Promote, repair, bundle, and export durable notes without letting export outrun archive health.",
    detail:
      "Use publish mode when compiled pages, export bundles, or second-brain continuity are the immediate job.",
    primarySignal: "Pages first",
    supportSignal: "Export guarded",
  },
};

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
  const [archiveMemoryExpanded, setArchiveMemoryExpanded] = useState(() =>
    Boolean(focusToMemoryView(focus)),
  );
  const [publishStewardExpanded, setPublishStewardExpanded] = useState(false);
  const [compiledPages, setCompiledPages] = useState<
    CompiledMemoryPageSummary[]
  >([]);
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
    if (focus === "vault-sealed" || focus === "vault-credential-generator") {
      return "archive";
    }
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

  useEffect(() => {
    if (focus === "vault-sealed") {
      setArchiveLane("sealed");
    } else if (focus === "vault-credential-generator") {
      setArchiveLane("generator");
    }
  }, [focus]);

  useEffect(() => {
    if (focusToMemoryView(focus)) {
      setArchiveMemoryExpanded(true);
      return;
    }
    if (!focus && chamber === "archive") {
      setArchiveMemoryExpanded(false);
    }
  }, [chamber, focus]);

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
      : focus === "vault-sealed"
        ? "vault-sealed"
        : focus === "vault-credential-generator"
          ? "vault-credential-generator"
          : focus === "vault-compiled-pages" ||
              focus === "vault-export-second-brain"
            ? "vault-publish"
            : focusToMemoryView(focus)
              ? "vault-memory-brief"
              : null;

  useSurfaceFocusScroll(focusTargetId);

  const memoryBriefSpec = getSurfaceModuleSpec("vault", "memory-brief");
  const archiveWorkbenchSpec = getSurfaceModuleSpec(
    "vault",
    "archive-workbench",
  );
  const durableArtifactsSpec = getSurfaceModuleSpec(
    "vault",
    "durable-artifacts",
  );
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

  const activeChamberLabel =
    CHAMBERS.find((entry) => entry.id === chamber)?.label ?? chamber;
  const chamberPosture = VAULT_CHAMBER_POSTURE[chamber];
  const vaultMissionSignals = [
    {
      label: "Archive load",
      value: String(archiveCount),
      note: "clips + pages",
    },
    {
      label: "Graph",
      value: `${filteredGraph.nodes.length} nodes`,
      note: `${filteredGraph.edges.length} links`,
    },
    {
      label: "Compiled",
      value: compiledLoading ? "Refreshing" : String(compiledPages.length),
      note: "durable pages",
    },
  ];

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
        {mission || from || source ? (
          <MissionHandoffStrip
            surface="vault"
            mission={mission}
            from={from}
            source={source}
          />
        ) : null}

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

        {focus === "vault-sealed" ? (
          <SurfaceFocusStrip
            title="Focused session: sealed notes"
            description="The browser-local encrypted envelope opens first and remains locked until its passphrase is entered."
          />
        ) : null}

        {focus === "vault-credential-generator" ? (
          <SurfaceFocusStrip
            title="Focused session: local credential generator"
            description="The in-memory password and passphrase generator opens first without storing or sending generated values."
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

        <ShellSegmentedTabs
          items={CHAMBERS}
          active={chamber}
          onChange={handleChamberChange}
          minButtonWidth={132}
          className="nexus-shell-segmented--compactLane"
        />

        <div
          className="nexus-vault-mission-strip"
          aria-label="Vault chamber orientation"
        >
          <div className="nexus-vault-mission-strip__lead">
            <span className="nexus-vault-mission-strip__eyebrow">
              Active chamber
            </span>
            <strong>{activeChamberLabel}</strong>
            <p>{chamberPosture.summary}</p>
          </div>
          <div
            className="nexus-vault-mission-strip__signals"
            aria-label="Vault quick status"
          >
            {vaultMissionSignals.map((signal) => (
              <span key={signal.label}>
                <span>{signal.label}</span>
                <strong>{signal.value}</strong>
                <em>{signal.note}</em>
              </span>
            ))}
          </div>
          <details className="nexus-vault-mission-strip__detail">
            <summary>Chamber briefing</summary>
            <div className="nexus-vault-mission-strip__detailBody">
              <p>{chamberPosture.detail}</p>
              <VaultModeOrientationSection mode={chamber} />
            </div>
          </details>
        </div>

        {chamber === "archive" ? (
          <div id="vault-archive" style={{ scrollMarginTop: "120px" }}>
            <div className="nexus-surface-chamber-shell">
              <div className="nexus-surface-chamber-shell__body">
                <OpsRail
                  className={`nexus-surface-chamber-shell__support nexus-ops-rail--sticky ${vaultLayout.railClass}`}
                >
                  <div
                    id="vault-memory-brief"
                    style={{ scrollMarginTop: "120px" }}
                  >
                    <OpsField
                      title={memoryBriefSpec.title}
                      detail={memoryBriefSpec.detail}
                      tone="muted"
                      compact
                    >
                      <div
                        className="nexus-vault-rail-preview"
                        aria-label="Memory brief preview"
                      >
                        <span>{chamberPosture.supportSignal}</span>
                        <span>{memoryView}</span>
                        <span>{compiledLoading ? "Refreshing" : "Ready"}</span>
                      </div>
                      <details
                        className="nexus-surface-disclosure"
                        open={archiveMemoryExpanded}
                        onToggle={(event) =>
                          setArchiveMemoryExpanded(event.currentTarget.open)
                        }
                      >
                        <summary>Open memory lanes</summary>
                        <div className="nexus-surface-disclosure__body">
                          <div className="nexus-surface-subtabs">
                            <ShellSegmentedTabs
                              items={MEMORY_VIEWS}
                              active={memoryView}
                              onChange={setMemoryView}
                              minButtonWidth={110}
                            />
                            {memoryView === "spine" ? (
                              <LazyMemorySpineOverview />
                            ) : null}
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
                              <LazyVaultStewardshipPanel
                                compiledPages={compiledPages}
                              />
                            ) : null}
                          </div>
                        </div>
                      </details>
                    </OpsField>
                  </div>
                </OpsRail>

                <OpsWorkplane
                  className={`nexus-surface-chamber-shell__lead ${vaultLayout.workplaneClass}`}
                >
                  <OpsField
                    title={archiveWorkbenchSpec.title}
                    detail={archiveWorkbenchSpec.detail}
                  >
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
                      {archiveLane === "sealed" ? (
                        <OpsField
                          title="Sealed notes"
                          detail="Browser-local encrypted private notes with explicit lock and backup controls"
                        >
                          <div id="vault-sealed">
                            <LazySealedVaultPanel />
                          </div>
                        </OpsField>
                      ) : null}
                      {archiveLane === "generator" ? (
                        <OpsField
                          title="Local credential generator"
                          detail="Cryptographically random passwords and memorable passphrases without persistence"
                        >
                          <div id="vault-credential-generator">
                            <LazyLocalCredentialGeneratorPanel />
                          </div>
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
                      {archiveLane === "papers" ? (
                        <OpsField
                          title="Feynman paper library"
                          detail="Local vector retrieval and private annotations without a chat call"
                        >
                          <LazyFeynmanPaperLibraryPanel />
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
          <LazyVaultRelationsChamber
            memoryBriefTitle={memoryBriefSpec.title}
            memoryBriefDetail={memoryBriefSpec.detail}
            relationsTitle={relationsSpec.title}
            relationsDetail={relationsSpec.detail}
            primarySignal={chamberPosture.primarySignal}
            railClass={vaultLayout.railClass}
            workplaneClass={vaultLayout.workplaneClass}
            inspectorClass={vaultLayout.inspectorClass}
            trustLabel={vaultLayout.trustLabel}
            graphAudit={graphAudit}
            filteredGraph={filteredGraph}
            graphSourceFilter={graphSourceFilter}
            graphVisibilityFilter={graphVisibilityFilter}
            selectedGraphNodeId={selectedGraphNodeId}
            typeCounts={typeCounts}
            visibilityCounts={visibilityCounts}
            savedArticles={savedArticles}
            compiledPages={compiledPages}
            onSetSourceFilter={setGraphSourceFilter}
            onSetVisibilityFilter={setGraphVisibilityFilter}
            onSelectNode={setSelectedGraphNodeId}
          />
        ) : null}

        {chamber === "publish" ? (
          <LazyVaultPublishChamber
            memoryBriefTitle={memoryBriefSpec.title}
            memoryBriefDetail={memoryBriefSpec.detail}
            durableArtifactsTitle={durableArtifactsSpec.title}
            durableArtifactsDetail={durableArtifactsSpec.detail}
            primarySignal={chamberPosture.primarySignal}
            railClass={vaultLayout.railClass}
            workplaneClass={vaultLayout.workplaneClass}
            inspectorClass={vaultLayout.inspectorClass}
            trustLabel={vaultLayout.trustLabel}
            compiledPages={compiledPages}
            savedArticles={savedArticles}
            compiledLoading={compiledLoading}
            stewardExpanded={publishStewardExpanded}
            onStewardExpandedChange={setPublishStewardExpanded}
          />
        ) : null}
      </ShellStack>
    </ShellPage>
  );
}
