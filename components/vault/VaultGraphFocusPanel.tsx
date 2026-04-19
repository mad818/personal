"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import ActionSessionCluster from "@/components/ui/ActionSessionCluster";
import type { Article } from "@/store/useStore";
import type { VaultGraphData } from "@/components/home/office/types";
import { apiFetch } from "@/lib/apiFetch";
import { ShellBadge } from "@/components/ui/shell";
import MissionContinuationActions from "@/components/ui/MissionContinuationActions";
import { SurfaceEmpty, SurfaceSkeletonRows } from "@/components/ui/surfacePrimitives";
import { buildCompiledPageHref } from "@/lib/xr1Workflows";
import {
  countVaultArchiveBacklinks,
  deriveVaultArchiveBacklinks,
} from "@/lib/vaultCrossLinker";
import {
  buildVaultGraphFocusHref,
  type CompiledMemoryPageSummary,
} from "./vaultGraphPageUtils";

interface VaultGraphFocusPanelProps {
  nodeId: string | null;
  savedArticles: Article[];
  compiledPages: CompiledMemoryPageSummary[];
  graph: VaultGraphData | null;
  onSelectNode?: (nodeId: string) => void;
}

function formatTimestamp(timestamp: number) {
  return new Date(timestamp).toLocaleString();
}

export default function VaultGraphFocusPanel({
  nodeId,
  savedArticles,
  compiledPages,
  graph,
  onSelectNode,
}: VaultGraphFocusPanelProps) {
  const router = useRouter();
  const [pageDetails, setPageDetails] = useState<Record<string, CompiledMemoryPageSummary>>({});
  const [loadingPageId, setLoadingPageId] = useState<string | null>(null);

  const selectedPageId = nodeId?.startsWith("page:") ? nodeId.slice(5) : null;
  const selectedArticle = useMemo(
    () => (selectedPageId ? null : savedArticles.find((article) => article.id === nodeId) ?? null),
    [nodeId, savedArticles, selectedPageId],
  );
  const selectedPageSummary = useMemo(
    () =>
      selectedPageId
        ? pageDetails[selectedPageId] ??
          compiledPages.find((page) => page.id === selectedPageId) ??
          null
        : null,
    [compiledPages, pageDetails, selectedPageId],
  );
  const restrictedCompiledNodeIds = useMemo(
    () =>
      new Set(
        compiledPages
          .filter((page) => page.visibility === "restricted")
          .map((page) => `page:${page.id}`),
      ),
    [compiledPages],
  );
  const linkedContext = useMemo(() => {
    if (!nodeId || !graph) return [];
    const nodeMap = new Map(graph.nodes.map((node) => [node.id, node]));
    return graph.edges
      .filter((edge) => edge.source === nodeId || edge.target === nodeId)
      .map((edge) => {
        const relatedNodeId = edge.source === nodeId ? edge.target : edge.source;
        const relatedNode = nodeMap.get(relatedNodeId);
        const protectedReason =
          restrictedCompiledNodeIds.has(nodeId) || restrictedCompiledNodeIds.has(relatedNodeId);
        return {
          id: `${nodeId}:${relatedNodeId}`,
          nodeId: relatedNodeId,
          title: relatedNode?.title ?? "Unknown linked item",
          type: relatedNode?.type ?? "other",
          weight: edge.weight,
          reason: protectedReason ? "Protected graph linkage" : edge.reason,
        };
      })
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 5);
  }, [graph, nodeId, restrictedCompiledNodeIds]);
  const repairActions = useMemo(() => {
    const actions: Array<{ href: string; label: string; detail: string }> = [];
    const seen = new Set<string>();
    const addAction = (href: string, label: string, detail: string) => {
      if (seen.has(href)) return;
      seen.add(href);
      actions.push({ href, label, detail });
    };

    if (!nodeId) return actions;

    if (linkedContext.length === 0) {
      addAction(
        "/vault?focus=vault-graph-focus&graphAudit=orphans",
        "Recover orphans",
        "This selected graph node currently has no visible links, so open orphan recovery before widening the archive search.",
      );
      addAction(
        "/vault?focus=vault-stewardship",
        "Open stewardship",
        "Review archive coverage, route continuity, and tag posture before repairing this isolated artifact.",
      );
    }

    if (selectedPageSummary) {
      if (!selectedPageSummary.route?.trim()) {
        addAction(
          "/vault?focus=vault-compiled-pages&compiledFilter=route-less",
          "Open route-less pages",
          "Jump to the filtered compiled-page repair lane for missing route continuity.",
        );
      }
      if ((selectedPageSummary.tags ?? []).length === 0) {
        addAction(
          "/vault?focus=vault-compiled-pages&compiledFilter=untagged",
          "Open untagged pages",
          "Jump to the filtered compiled-page repair lane for missing tag coverage.",
        );
      }
    }

    return actions;
  }, [linkedContext.length, nodeId, selectedPageSummary]);
  const exactGraphFocusHref = useMemo(
    () => (nodeId ? buildVaultGraphFocusHref({ nodeId }) : null),
    [nodeId],
  );
  const explicitOutboundLinks = useMemo(() => {
    if (!selectedArticle) return [];
    return (selectedArticle.archiveLinks ?? [])
      .map((link) => {
        const linkedArticle = savedArticles.find((article) => article.id === link.targetId);
        const linkedPage =
          linkedArticle || !link.targetId.startsWith("page:")
            ? null
            : compiledPages.find((page) => `page:${page.id}` === link.targetId) ?? null;
        return {
          ...link,
          title: linkedArticle?.title ?? linkedPage?.title ?? link.targetId,
        };
      })
      .slice(0, 4);
  }, [compiledPages, savedArticles, selectedArticle]);
  const explicitBacklinks = useMemo(
    () => (nodeId ? deriveVaultArchiveBacklinks(nodeId, savedArticles).slice(0, 4) : []),
    [nodeId, savedArticles],
  );
  const backlinkCount = useMemo(
    () => (nodeId ? countVaultArchiveBacklinks(nodeId, savedArticles) : 0),
    [nodeId, savedArticles],
  );

  useEffect(() => {
    let cancelled = false;
    if (!selectedPageId || pageDetails[selectedPageId]) return;

    const fetchDetail = async () => {
      setLoadingPageId(selectedPageId);
      try {
        const res = await apiFetch(
          `/api/memory/pages?id=${encodeURIComponent(selectedPageId)}`,
        );
        if (!res.ok) return;
        const data = (await res.json()) as { page?: CompiledMemoryPageSummary };
        if (!cancelled && data.page) {
          setPageDetails((current) => ({ ...current, [selectedPageId]: data.page! }));
        }
      } catch {
        // silent
      } finally {
        if (!cancelled) {
          setLoadingPageId((current) => (current === selectedPageId ? null : current));
        }
      }
    };

    void fetchDetail();
    return () => {
      cancelled = true;
    };
  }, [pageDetails, selectedPageId]);

  if (!nodeId) {
    return (
      <SurfaceEmpty
        compact
        icon="Graph"
        title="Select a graph node"
        description="Click any saved clip or compiled memory node in the knowledge graph to inspect its safe local details here."
      />
    );
  }

  if (selectedPageId && loadingPageId === selectedPageId && !selectedPageSummary) {
    return <SurfaceSkeletonRows rows={3} height={64} />;
  }

  if (selectedPageId && !selectedPageSummary) {
    return (
      <SurfaceEmpty
        compact
        icon="Pages"
        title="Compiled page unavailable"
        description="The selected graph node no longer has a matching compiled memory page."
      />
    );
  }

  if (!selectedPageId && !selectedArticle) {
    return (
      <SurfaceEmpty
        compact
        icon="Archive"
        title="Saved clip unavailable"
        description="The selected graph node no longer matches a saved article in local state."
      />
    );
  }

  if (selectedArticle) {
    const exactActions = exactGraphFocusHref
      ? [
          {
            href: exactGraphFocusHref,
            label: "Open exact graph focus",
            detail:
              "Reopen this selected graph node directly inside the relations chamber.",
          },
        ]
      : [];
    return (
      <div style={{ display: "grid", gap: "10px" }}>
        <div style={{ display: "grid", gap: "4px" }}>
          <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--text)" }}>
            {selectedArticle.title}
          </div>
          <div style={{ fontSize: "11px", color: "var(--text3)" }}>
            Saved clip · {formatTimestamp(new Date(selectedArticle.date).getTime())}
          </div>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
          <ShellBadge tone="accent">clip</ShellBadge>
          {selectedArticle.cat ? <ShellBadge tone="muted">{selectedArticle.cat}</ShellBadge> : null}
          {selectedArticle.src ? <ShellBadge tone="muted">{selectedArticle.src}</ShellBadge> : null}
          {(selectedArticle.tags ?? []).slice(0, 6).map((tag) => (
            <ShellBadge key={tag} tone="muted">
              {tag}
            </ShellBadge>
          ))}
        </div>

        <div style={{ fontSize: "12px", lineHeight: 1.55, color: "var(--text2)" }}>
          {selectedArticle.desc || "No local summary recorded for this saved clip."}
        </div>

        {selectedArticle.archiveLinks?.length || backlinkCount ? (
          <div
            style={{
              display: "grid",
              gap: "6px",
              padding: "10px 12px",
              borderRadius: "12px",
              border: "1px solid rgba(123, 167, 212, 0.12)",
              background: "rgba(9, 14, 28, 0.42)",
            }}
          >
            <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text)" }}>
              Archive compounding
            </div>
            <div style={{ fontSize: "10px", color: "var(--text3)" }}>
              {(selectedArticle.archiveLinks ?? []).length} outbound link
              {(selectedArticle.archiveLinks ?? []).length === 1 ? "" : "s"} · {backlinkCount} backlink
              {backlinkCount === 1 ? "" : "s"}
            </div>
            {explicitOutboundLinks.map((link) => (
              <div key={`${selectedArticle.id}-${link.targetId}`} style={{ display: "grid", gap: "2px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", flexWrap: "wrap" }}>
                  <span style={{ fontSize: "11px", color: "var(--text2)" }}>{link.title}</span>
                  <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                    <ShellBadge tone={link.state === "confirmed" ? "accent" : "muted"}>
                      {link.state}
                    </ShellBadge>
                    <button
                      type="button"
                      onClick={() => router.push(buildVaultGraphFocusHref({ nodeId: link.targetId }))}
                      className="nexus-shell-button"
                      style={{ minHeight: "28px", padding: "0 10px", fontSize: "10px" }}
                    >
                      Open exact
                    </button>
                  </div>
                </div>
                <div style={{ fontSize: "10px", color: "var(--text3)" }}>
                  {link.reason} · strength {Math.round(link.strength * 100)}%
                </div>
              </div>
            ))}
            {explicitBacklinks.map((link) => (
              <div key={`${link.sourceId}-${link.reason}`} style={{ fontSize: "10px", color: "var(--text3)" }}>
                Backlink from <strong style={{ color: "var(--text2)" }}>{link.sourceTitle}</strong> · {link.reason}
              </div>
            ))}
          </div>
        ) : null}

        <MissionContinuationActions
          memoryQuery={[selectedArticle.title, selectedArticle.desc ?? ""].filter(Boolean).join("\n")}
          promptText={[
            selectedArticle.title,
            selectedArticle.desc ?? "",
            selectedArticle.cat ?? "",
            ...(selectedArticle.tags ?? []),
          ]
            .filter(Boolean)
            .join(" ")}
          showReturnToHQ
        />
        {exactActions.length > 0 ? (
          <ActionSessionCluster
            items={exactActions}
            onOpen={(href) => router.push(href)}
            buttonClassName="nexus-shell-button"
            buttonStyle={{ minHeight: "32px", padding: "0 12px", fontSize: "11px" }}
            maxPrimaryItems={1}
            showPrimaryCards={false}
          />
        ) : null}
        {repairActions.length > 0 ? (
          <ActionSessionCluster
            items={repairActions}
            onOpen={(href) => router.push(href)}
            buttonClassName="nexus-shell-button"
            buttonStyle={{ minHeight: "32px", padding: "0 12px", fontSize: "11px" }}
            maxPrimaryItems={1}
            showPrimaryCards={false}
          />
        ) : null}

        {selectedArticle.link ? (
          <a
            href={selectedArticle.link}
            target="_blank"
            rel="noreferrer"
            style={{
              fontSize: "11px",
              color: "var(--accent-2, var(--accent))",
              textDecoration: "none",
              wordBreak: "break-all",
            }}
          >
            {selectedArticle.link}
          </a>
        ) : null}

        {linkedContext.length > 0 ? (
          <div
            style={{
              display: "grid",
              gap: "8px",
              padding: "10px 12px",
              borderRadius: "12px",
              border: "1px solid rgba(123, 167, 212, 0.12)",
              background: "rgba(9, 14, 28, 0.42)",
            }}
          >
            <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text)" }}>
              Linked context
            </div>
            {linkedContext.map((link) => (
              <div key={link.id} style={{ display: "grid", gap: "2px" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "8px",
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ fontSize: "11px", color: "var(--text2)" }}>{link.title}</div>
                  <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                    {onSelectNode ? (
                      <button
                        type="button"
                        onClick={() => onSelectNode(link.nodeId)}
                        className="nexus-shell-button"
                        style={{ minHeight: "28px", padding: "0 10px", fontSize: "10px" }}
                      >
                        Inspect linked item
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() =>
                        router.push(buildVaultGraphFocusHref({ nodeId: link.nodeId }))
                      }
                      className="nexus-shell-button"
                      style={{ minHeight: "28px", padding: "0 10px", fontSize: "10px" }}
                    >
                      Open exact
                    </button>
                  </div>
                </div>
                <div style={{ fontSize: "10px", color: "var(--text3)" }}>
                  {link.reason} · strength {Math.round(link.weight * 100)}%
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  const page = selectedPageSummary!;
  const exactActions = [
    ...(exactGraphFocusHref
      ? [
          {
            href: exactGraphFocusHref,
            label: "Open exact graph focus",
            detail:
              "Reopen this selected compiled-page node directly inside the relations chamber.",
          },
        ]
      : []),
    {
      href: buildCompiledPageHref({
        id: page.id,
        workflowId: page.workflowId,
      }),
      label: "Open exact compiled page",
      detail:
        "Jump from graph drill-down into the durable compiled-page artifact without losing continuity.",
    },
  ];

  return (
    <div style={{ display: "grid", gap: "10px" }}>
      <div style={{ display: "grid", gap: "4px" }}>
        <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--text)" }}>
          {page.title}
        </div>
        <div style={{ fontSize: "11px", color: "var(--text3)" }}>
          Compiled page · {formatTimestamp(page.updatedAt)}
        </div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
        <ShellBadge tone="accent">{page.layer}</ShellBadge>
        <ShellBadge tone="muted">{page.domain}</ShellBadge>
        <ShellBadge tone={page.visibility === "safe" ? "success" : "muted"}>
          {page.visibility}
        </ShellBadge>
        <ShellBadge tone="muted">{page.sourceLabel}</ShellBadge>
        {page.workflowLabel ? <ShellBadge tone="muted">{page.workflowLabel}</ShellBadge> : null}
        {page.agentId ? <ShellBadge tone="muted">{page.agentId}</ShellBadge> : null}
      </div>

      <div style={{ fontSize: "12px", lineHeight: 1.55, color: "var(--text2)" }}>
        {page.summary}
      </div>

      {backlinkCount > 0 ? (
        <div
          style={{
            display: "grid",
            gap: "6px",
            padding: "10px 12px",
            borderRadius: "12px",
            border: "1px solid rgba(123, 167, 212, 0.12)",
            background: "rgba(9, 14, 28, 0.42)",
          }}
        >
          <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text)" }}>
            Archive backlinks
          </div>
          <div style={{ fontSize: "10px", color: "var(--text3)" }}>
            {backlinkCount} saved clip backlink{backlinkCount === 1 ? "" : "s"} currently point at this durable page.
          </div>
          {explicitBacklinks.map((link) => (
            <div key={`${link.sourceId}-${link.reason}`} style={{ display: "grid", gap: "2px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", flexWrap: "wrap" }}>
                <span style={{ fontSize: "11px", color: "var(--text2)" }}>{link.sourceTitle}</span>
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                  <ShellBadge tone={link.state === "confirmed" ? "accent" : "muted"}>
                    {link.state}
                  </ShellBadge>
                  <button
                    type="button"
                    onClick={() => router.push(buildVaultGraphFocusHref({ nodeId: link.sourceId }))}
                    className="nexus-shell-button"
                    style={{ minHeight: "28px", padding: "0 10px", fontSize: "10px" }}
                  >
                    Open source clip
                  </button>
                </div>
              </div>
              <div style={{ fontSize: "10px", color: "var(--text3)" }}>
                {link.reason} · strength {Math.round(link.strength * 100)}%
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <MissionContinuationActions
        memoryQuery={[page.title, page.summary].filter(Boolean).join("\n")}
        routeHint={page.route}
        promptText={[
          page.title,
          page.summary,
          page.domain,
          page.sourceLabel,
          page.workflowLabel ?? "",
          page.agentId ?? "",
          ...(page.tags ?? []),
        ]
          .filter(Boolean)
          .join(" ")}
        showReturnToHQ
      />
      <ActionSessionCluster
        items={exactActions}
        onOpen={(href) => router.push(href)}
        buttonClassName="nexus-shell-button"
        buttonStyle={{ minHeight: "32px", padding: "0 12px", fontSize: "11px" }}
        maxPrimaryItems={1}
        showPrimaryCards={false}
      />
      {repairActions.length > 0 ? (
        <ActionSessionCluster
          items={repairActions}
          onOpen={(href) => router.push(href)}
          buttonClassName="nexus-shell-button"
          buttonStyle={{ minHeight: "32px", padding: "0 12px", fontSize: "11px" }}
          maxPrimaryItems={1}
          showPrimaryCards={false}
        />
      ) : null}

      <div style={{ fontSize: "11px", lineHeight: 1.55, color: "var(--text3)" }}>
        {page.contentWithheld
          ? "Restricted compiled page content is intentionally withheld from the graph drill-down surface."
          : page.content ?? page.contentPreview}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
        <ShellBadge tone="muted">{page.researchSignals.structure}</ShellBadge>
        {page.researchSignals.sourceCount > 0 ? (
          <ShellBadge tone="muted">sources {page.researchSignals.sourceCount}</ShellBadge>
        ) : null}
        {page.documentMetadata?.pageCount ? (
          <ShellBadge tone="muted">pages {page.documentMetadata.pageCount}</ShellBadge>
        ) : null}
        {!page.researchSignals.signalsWithheld
          ? page.researchSignals.documentHints.slice(0, 3).map((hint) => (
              <ShellBadge key={hint} tone="muted">
                {hint}
              </ShellBadge>
            ))
          : null}
      </div>

      {!page.researchSignals.signalsWithheld &&
      (page.researchSignals.referencedDomains.length > 0 ||
        page.researchSignals.sectionHeadings.length > 0 ||
        (page.documentMetadata &&
          !page.documentMetadata.metadataWithheld &&
          (page.documentMetadata.originLabel || page.documentMetadata.mimeType))) ? (
        <div
          style={{
            display: "grid",
            gap: "6px",
            padding: "10px 12px",
            borderRadius: "12px",
            border: "1px solid rgba(123, 167, 212, 0.12)",
            background: "rgba(9, 14, 28, 0.42)",
            fontSize: "11px",
            lineHeight: 1.5,
            color: "var(--text3)",
          }}
        >
          {page.researchSignals.referencedDomains.length > 0 ? (
            <div>
              <strong style={{ color: "var(--text)" }}>Domains:</strong>{" "}
              {page.researchSignals.referencedDomains.join(", ")}
            </div>
          ) : null}
          {page.researchSignals.sectionHeadings.length > 0 ? (
            <div>
              <strong style={{ color: "var(--text)" }}>Sections:</strong>{" "}
              {page.researchSignals.sectionHeadings.join(" · ")}
            </div>
          ) : null}
          {page.documentMetadata &&
          !page.documentMetadata.metadataWithheld &&
          (page.documentMetadata.originLabel || page.documentMetadata.mimeType) ? (
            <div>
              <strong style={{ color: "var(--text)" }}>Document:</strong>{" "}
              {[page.documentMetadata.originLabel, page.documentMetadata.mimeType]
                .filter(Boolean)
                .join(" · ")}
            </div>
          ) : null}
        </div>
      ) : null}

      {linkedContext.length > 0 ? (
        <div
          style={{
            display: "grid",
            gap: "8px",
            padding: "10px 12px",
            borderRadius: "12px",
            border: "1px solid rgba(123, 167, 212, 0.12)",
            background: "rgba(9, 14, 28, 0.42)",
          }}
        >
          <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text)" }}>
            Linked context
          </div>
          {linkedContext.map((link) => (
            <div key={link.id} style={{ display: "grid", gap: "2px" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "8px",
                  flexWrap: "wrap",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                  <span style={{ fontSize: "11px", color: "var(--text2)" }}>{link.title}</span>
                  <ShellBadge tone="muted">{link.type}</ShellBadge>
                </div>
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                  {onSelectNode ? (
                    <button
                      type="button"
                      onClick={() => onSelectNode(link.nodeId)}
                      className="nexus-shell-button"
                      style={{ minHeight: "28px", padding: "0 10px", fontSize: "10px" }}
                    >
                      Inspect linked item
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() =>
                      router.push(buildVaultGraphFocusHref({ nodeId: link.nodeId }))
                    }
                    className="nexus-shell-button"
                    style={{ minHeight: "28px", padding: "0 10px", fontSize: "10px" }}
                  >
                    Open exact
                  </button>
                </div>
              </div>
              <div style={{ fontSize: "10px", color: "var(--text3)" }}>
                {link.reason} · strength {Math.round(link.weight * 100)}%
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
