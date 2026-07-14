"use client";
// VaultLibrarianPanel
// Displays VaultSynthesis results, runs lint passes (Rule 7),
// and lets the user file agent answers back into the vault (Rule 5).

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import ActionSessionCluster from "@/components/ui/ActionSessionCluster";
import { ShellBadge } from "@/components/ui/shell";
import { toast } from "@/components/ui/Toast";
import { useStore } from "@/store/useStore";
import { apiFetch } from "@/lib/apiFetch";
import { runVaultLint } from "@/lib/vaultGraph";
import { buildCompiledPageHref } from "@/lib/xr1Workflows";
import type { CompiledMemoryPageSummary } from "./vaultGraphPageUtils";
import { buildVaultStewardshipSnapshot } from "@/lib/vaultStewardship";
import {
  buildVaultLibrarianActions,
  buildVaultLibrarianBriefSections,
  buildVaultLibrarianNextSession,
  buildVaultLibrarianSourceRefs,
  buildVaultLibrarianSummary,
  buildVaultLibrarianTags,
  buildVaultLibrarianTitle,
  formatVaultLibrarianBrief,
} from "@/lib/vaultLibrarian";

export function VaultLibrarianPanel({
  compiledPages,
  selectedNodeId = null,
}: {
  compiledPages: CompiledMemoryPageSummary[];
  selectedNodeId?: string | null;
}) {
  const router = useRouter();
  const graph           = useStore(s => s.vaultGraph);
  const synthesis       = useStore(s => s.vaultSynthesis);
  const lint            = useStore(s => s.vaultLint);
  const savedArticles   = useStore(s => s.savedArticles);
  const setVaultSynthesis = useStore(s => s.setVaultSynthesis);
  const setVaultLint    = useStore(s => s.setVaultLint);

  const [loadingSynth, setLoadingSynth] = useState(false);
  const [synthError, setSynthError]     = useState<string | null>(null);
  const [activeTab, setActiveTab]       = useState<"synthesis" | "lint">("synthesis");

  // Rule 5: file-back state
  const [fileBackText, setFileBackText]   = useState("");
  const [fileBackTitle, setFileBackTitle] = useState("");
  const [fileBackTldr, setFileBackTldr]   = useState("");
  const [filingBack, setFilingBack]       = useState(false);
  const [fileBackDone, setFileBackDone]   = useState(false);
  const [filingAudit, setFilingAudit]     = useState(false);
  const [auditFiled, setAuditFiled]       = useState(false);
  const [latestAuditPages, setLatestAuditPages] = useState<CompiledMemoryPageSummary[]>([]);
  const [auditPagesError, setAuditPagesError] = useState("");

  const nodeCount    = graph?.nodes.length ?? 0;
  const orphanCount  = graph?.orphans.length ?? 0;
  const clusterCount = graph?.clusters.length ?? 0;
  const selectedNodeTitle = useMemo(
    () => graph?.nodes.find((node) => node.id === selectedNodeId)?.title ?? null,
    [graph, selectedNodeId],
  );
  const stewardshipSnapshot = useMemo(
    () =>
      buildVaultStewardshipSnapshot({
        savedArticles,
        compiledPages,
        graph,
        lint,
      }),
    [compiledPages, graph, lint, savedArticles],
  );
  const nextSession = useMemo(
    () =>
      buildVaultLibrarianNextSession({
        snapshot: stewardshipSnapshot,
        selectedNodeId,
        selectedNodeTitle,
      }),
    [selectedNodeId, selectedNodeTitle, stewardshipSnapshot],
  );
  const repairActions = useMemo(
    () =>
      buildVaultLibrarianActions({
        snapshot: stewardshipSnapshot,
        selectedNodeId,
        selectedNodeTitle,
      }),
    [selectedNodeId, selectedNodeTitle, stewardshipSnapshot],
  );
  const latestAuditPage = latestAuditPages[0] ?? null;
  const continuityActions = useMemo(
    () =>
      [
        latestAuditPage
          ? {
              href: buildCompiledPageHref({
                id: latestAuditPage.id,
                workflowId: latestAuditPage.workflowId,
              }),
              label: "Open latest audit",
              detail:
                "Reopen the most recent durable librarian brief instead of rerunning the audit from scratch.",
            }
          : null,
        ...repairActions,
        {
          href: "/vault?focus=vault-compiled-pages&workflowId=vault-librarian",
          label: "Open audit archive",
          detail:
            "Review all saved librarian briefs through the durable compiled-page lane.",
        },
      ].filter(
        (
          action,
        ): action is { href: string; label: string; detail: string } =>
          Boolean(action),
      ),
    [latestAuditPage, repairActions],
  );

  const loadLatestAuditPages = useCallback(async () => {
    try {
      const response = await apiFetch(
        "/api/memory/pages?limit=8&workflowId=vault-librarian",
      );
      if (!response.ok) {
        setAuditPagesError("Could not load librarian audit pages.");
        return;
      }
      const payload = (await response.json()) as {
        pages?: CompiledMemoryPageSummary[];
      };
      setLatestAuditPages(Array.isArray(payload.pages) ? payload.pages : []);
      setAuditPagesError("");
    } catch {
      setAuditPagesError("Could not load librarian audit pages.");
    }
  }, []);

  useEffect(() => {
    void loadLatestAuditPages();
    const handleRefresh = () => {
      void loadLatestAuditPages();
    };
    window.addEventListener("nexus-memory-pages-updated", handleRefresh);
    return () => {
      window.removeEventListener("nexus-memory-pages-updated", handleRefresh);
    };
  }, [loadLatestAuditPages]);

  const runSynthesis = async () => {
    if (!graph || loadingSynth) return;
    setLoadingSynth(true);
    setSynthError(null);
    try {
      const resp = await apiFetch("/api/vault-synthesis", {
        method:  "POST",
        body:    JSON.stringify(graph),
      });
      if (!resp.ok) {
        const err = await resp.json() as { error?: string };
        throw new Error(err.error ?? `HTTP ${resp.status}`);
      }
      const synth = await resp.json();
      setVaultSynthesis(synth);
    } catch (e) {
      setSynthError(e instanceof Error ? e.message : "Synthesis failed");
    } finally {
      setLoadingSynth(false);
    }
  };

  // Rule 7: run lint locally (client-side, no AI cost)
  const runLint = () => {
    if (!graph) return null;
    const result = runVaultLint(graph.nodes, graph.edges);
    setVaultLint(result);
    setActiveTab("lint");
    return result;
  };

  const runAudit = async () => {
    if (!graph || loadingSynth) return;
    setActiveTab("synthesis");
    runLint();
    await runSynthesis();
  };

  const fileAuditBrief = async () => {
    if (!graph || !synthesis || !lint || filingAudit) return;
    setFilingAudit(true);
    try {
      const sections = buildVaultLibrarianBriefSections({
        snapshot: stewardshipSnapshot,
        synthesis,
        lint,
        selectedNodeId,
        selectedNodeTitle,
      });
      const response = await apiFetch("/api/memory/pages", {
        method: "POST",
        body: JSON.stringify({
          title: buildVaultLibrarianTitle(),
          summary: buildVaultLibrarianSummary({
            snapshot: stewardshipSnapshot,
            synthesis,
            selectedNodeTitle,
          }),
          content: formatVaultLibrarianBrief(sections),
          source: "workflow",
          sourceLabel: "Vault librarian audit",
          workflowId: "vault-librarian",
          workflowLabel: "Vault librarian",
          workflowPackId: "second-brain",
          route: "/vault",
          layer: "knowledge",
          topic: "Vault archive audit",
          tags: buildVaultLibrarianTags(stewardshipSnapshot),
          sourceRefs: buildVaultLibrarianSourceRefs({
            snapshot: stewardshipSnapshot,
            selectedNodeId,
            selectedNodeTitle,
          }),
          sourceType: "memory-spine",
          evidenceStrength: "contextual",
        }),
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      setAuditFiled(true);
      window.dispatchEvent(new Event("nexus-memory-pages-updated"));
      setTimeout(() => setAuditFiled(false), 3000);
    } catch {
      toast({
        title: "Audit brief not filed",
        message: "The VAULT write was rejected. Keep this audit open and retry.",
        severity: "medium",
      });
    } finally {
      setFilingAudit(false);
    }
  };

  // Rule 5: file an answer back into compiled local memory
  const fileBack = async () => {
    if (!fileBackTitle.trim() || !fileBackText.trim() || filingBack) return;
    setFilingBack(true);
    try {
      const response = await apiFetch("/api/memory/pages", {
        method:  "POST",
        body: JSON.stringify({
          title:      fileBackTitle.trim(),
          summary:    fileBackTldr.trim() || fileBackText.trim().slice(0, 120),
          content:    fileBackText.trim(),
          source:     "manual",
          sourceLabel: "Vault librarian file-back",
          route:      "/vault",
          layer:      "knowledge",
          tags:       ["filed-back", "agent-answer", "vault"],
        }),
      });
      if (!response.ok) {
        throw new Error(`VAULT file-back failed (${response.status}).`);
      }
      setFileBackDone(true);
      setFileBackTitle("");
      setFileBackText("");
      setFileBackTldr("");
      setTimeout(() => setFileBackDone(false), 3000);
    } catch {
      toast({
        title: "VAULT answer not filed",
        message: "Your title and answer are still here. Retry the VAULT write.",
        severity: "medium",
      });
    } finally {
      setFilingBack(false);
    }
  };

  const TAB_STYLE = (active: boolean): React.CSSProperties => ({
    padding:      "4px 10px",
    borderRadius: "4px 4px 0 0",
    border:       "1px solid var(--border)",
    borderBottom: active ? "1px solid var(--surf2)" : "1px solid var(--border)",
    background:   active ? "var(--surf2)" : "transparent",
    color:        active ? "var(--text)" : "var(--text2)",
    fontSize:     "10px",
    fontWeight:   "bold",
    cursor:       "pointer",
    marginBottom: "-1px",
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <span style={{ fontWeight: "bold", fontSize: "12px", color: "var(--text)" }}>
          Vault Librarian
        </span>
        <span style={{ fontSize: "10px", color: "var(--text2)", marginLeft: "auto" }}>
          {nodeCount} items &middot; {clusterCount} clusters &middot; {orphanCount} isolated
        </span>
      </div>

      {/* Tab bar */}
      <div style={{ display: "flex", gap: "2px", borderBottom: "1px solid var(--border)" }}>
        <button style={TAB_STYLE(activeTab === "synthesis")} onClick={() => setActiveTab("synthesis")}>
          Synthesis
        </button>
        <button style={TAB_STYLE(activeTab === "lint")} onClick={() => setActiveTab("lint")}>
          Lint {lint ? `(${lint.staleClaims.length + lint.orphanPages.length + lint.underlinkedPages.length + lint.noBacklinkPages.length + lint.contradictions.length})` : ""}
        </button>
      </div>

      {/* Synthesis tab */}
      {activeTab === "synthesis" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            <button
              onClick={() => void runAudit()}
              disabled={loadingSynth || !graph || nodeCount === 0}
              style={{
                flex: "1 1 140px", padding: "4px 0", borderRadius: "4px",
                border: "1px solid var(--accent)", background: "transparent",
                color: loadingSynth ? "var(--text2)" : "var(--accent)",
                cursor: loadingSynth || !graph ? "not-allowed" : "pointer",
                fontSize: "10px", fontWeight: "bold",
              }}
            >
              {loadingSynth ? "Auditing..." : "Audit VAULT"}
            </button>
            <button
              onClick={runSynthesis}
              disabled={loadingSynth || !graph || nodeCount === 0}
              style={{
                flex: "1 1 120px", padding: "4px 0", borderRadius: "4px",
                border: "1px solid var(--border)", background: "transparent",
                color: "var(--text2)",
                cursor: loadingSynth || !graph ? "not-allowed" : "pointer",
                fontSize: "10px", fontWeight: "bold",
              }}
            >
              {loadingSynth ? "Analyzing..." : "Synthesize only"}
            </button>
            <button
              onClick={runLint}
              disabled={!graph || nodeCount === 0}
              style={{
                flex: "1 1 120px", padding: "4px 0", borderRadius: "4px",
                border: "1px solid var(--border)", background: "transparent",
                color: "var(--text2)", cursor: !graph ? "not-allowed" : "pointer",
                fontSize: "10px", fontWeight: "bold",
              }}
            >
              Run lint only
            </button>
          </div>

          {synthError && (
            <div role="alert" style={{ color: "var(--flo)", fontSize: "11px" }}>
              {synthError}
            </div>
          )}

          <ActionSessionCluster
            items={continuityActions}
            onOpen={(href) => router.push(href)}
            buttonClassName="nexus-shell-button"
            buttonStyle={{ minHeight: "32px", padding: "0 12px", fontSize: "11px" }}
            maxPrimaryItems={1}
            showPrimaryCards={false}
          />

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
            <div style={{ fontSize: "11px", fontWeight: "bold", color: "var(--text)" }}>
              Audit posture
            </div>
            <div style={{ fontSize: "11px", lineHeight: 1.55, color: "var(--text2)" }}>
              {stewardshipSnapshot.summary}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              <ShellBadge tone="accent">Linked {stewardshipSnapshot.linkedCoverage}%</ShellBadge>
              <ShellBadge tone="muted">Tagged {stewardshipSnapshot.taggedCoverage}%</ShellBadge>
              <ShellBadge tone="muted">Routed {stewardshipSnapshot.routeCoverage}%</ShellBadge>
              <ShellBadge tone={stewardshipSnapshot.orphanCount > 0 ? "accent" : "success"}>
                Orphans {stewardshipSnapshot.orphanCount}
              </ShellBadge>
              <ShellBadge tone={stewardshipSnapshot.gapTopicCount > 0 ? "accent" : "muted"}>
                Thin topics {stewardshipSnapshot.gapTopicCount}
              </ShellBadge>
              {selectedNodeTitle ? (
                <ShellBadge tone="muted">{selectedNodeTitle}</ShellBadge>
              ) : null}
            </div>
            <div style={{ display: "grid", gap: "4px" }}>
              <div style={{ fontSize: "10px", color: "var(--text2)", fontWeight: "bold" }}>
                Highest-priority repairs
              </div>
              {stewardshipSnapshot.priorities.slice(0, 3).map((priority) => (
                <div
                  key={priority}
                  style={{ fontSize: "11px", color: "var(--text2)", lineHeight: 1.45 }}
                >
                  &rsaquo; {priority}
                </div>
              ))}
            </div>
            {stewardshipSnapshot.topOrphanTitles.length > 0 ? (
              <div style={{ fontSize: "11px", color: "var(--text3)", lineHeight: 1.5 }}>
                <strong style={{ color: "var(--text)" }}>Top orphan candidates:</strong>{" "}
                {stewardshipSnapshot.topOrphanTitles.join(" · ")}
              </div>
            ) : null}
            {stewardshipSnapshot.topGapTopics.length > 0 ? (
              <div style={{ fontSize: "11px", color: "var(--text3)", lineHeight: 1.5 }}>
                <strong style={{ color: "var(--text)" }}>Top thin topics:</strong>{" "}
                {stewardshipSnapshot.topGapTopics.join(" · ")}
              </div>
            ) : null}
            <div style={{ fontSize: "11px", color: "var(--text3)", lineHeight: 1.5 }}>
              <strong style={{ color: "var(--text)" }}>Strongest next session:</strong>{" "}
              {nextSession.label}
            </div>
          </div>

          {synthesis ? (
            <>
              <div style={{ fontSize: "12px", color: "var(--text)", lineHeight: "1.5" }}>
                {synthesis.summary}
              </div>
              {synthesis.gaps.length > 0 && (
                <div>
                  <div style={{ fontSize: "10px", color: "var(--text2)", marginBottom: "4px", fontWeight: "bold" }}>
                    KNOWLEDGE GAPS
                  </div>
                  {synthesis.gaps.map((gap, i) => (
                    <div key={i} style={{ fontSize: "11px", color: "var(--fmd)", marginBottom: "2px" }}>
                      &rsaquo; {gap}
                    </div>
                  ))}
                </div>
              )}
              {synthesis.clusters.length > 0 && (
                <div>
                  <div style={{ fontSize: "10px", color: "var(--text2)", marginBottom: "4px", fontWeight: "bold" }}>
                    TOPIC CLUSTERS
                  </div>
                  {synthesis.clusters.map((cl, i) => (
                    <div key={i} style={{ fontSize: "11px", color: "var(--text)", marginBottom: "2px" }}>
                      {i + 1}. {cl}
                    </div>
                  ))}
                </div>
              )}
              <div style={{ fontSize: "10px", color: "var(--text2)" }}>
                Analyzed {new Date(synthesis.createdAt).toLocaleTimeString()}
              </div>
            </>
          ) : (
            <div style={{ fontSize: "11px", color: "var(--text2)", textAlign: "center", padding: "8px 0" }}>
              {nodeCount === 0
                ? "No vault items yet. Save research to build your knowledge graph."
                : `${nodeCount} items indexed. Click Audit VAULT to run the combined librarian pass.`}
            </div>
          )}

          <div style={{ borderTop: "1px solid var(--border)", paddingTop: "10px" }}>
            <div style={{ fontSize: "10px", color: "var(--text2)", fontWeight: "bold", marginBottom: "6px" }}>
              DURABLE AUDIT BRIEF
            </div>
            {auditPagesError ? (
              <div
                role="alert"
                style={{ fontSize: "11px", color: "var(--flo)", lineHeight: 1.5, marginBottom: "6px" }}
              >
                {auditPagesError}
              </div>
            ) : null}
            <button
              onClick={() => void fileAuditBrief()}
              disabled={filingAudit || !synthesis || !lint}
              style={{
                width: "100%", padding: "5px 0", borderRadius: "4px",
                border: "1px solid var(--accent)", background: auditFiled ? "var(--accent)" : "transparent",
                color: auditFiled ? "#fff" : "var(--accent)",
                cursor: filingAudit || !synthesis || !lint ? "not-allowed" : "pointer",
                fontSize: "10px", fontWeight: "bold",
              }}
            >
              {auditFiled
                ? "Audit brief filed"
                : filingAudit
                  ? "Filing audit brief..."
                  : "File audit brief into VAULT"}
            </button>
            <div style={{ marginTop: "6px", fontSize: "10px", color: "var(--text3)", lineHeight: 1.5 }}>
              Saves a deterministic librarian brief under workflowId <code>vault-librarian</code> so exact reopen and archive continuity stay available later.
            </div>
          </div>

          {/* Rule 5: File answer back into vault */}
          <div style={{ borderTop: "1px solid var(--border)", paddingTop: "10px" }}>
            <div style={{ fontSize: "10px", color: "var(--text2)", fontWeight: "bold", marginBottom: "6px" }}>
              MANUAL FILE-BACK
            </div>
            <input
              aria-label="File-back title"
              value={fileBackTitle}
              onChange={e => setFileBackTitle(e.target.value)}
              placeholder="Title..."
              style={{
                width: "100%", marginBottom: "4px", padding: "4px 6px",
                background: "var(--surf3)", border: "1px solid var(--border)",
                borderRadius: "4px", color: "var(--text)", fontSize: "11px",
                boxSizing: "border-box",
              }}
            />
            <input
              aria-label="File-back summary"
              value={fileBackTldr}
              onChange={e => setFileBackTldr(e.target.value)}
              placeholder="TLDR (one line summary)..."
              style={{
                width: "100%", marginBottom: "4px", padding: "4px 6px",
                background: "var(--surf3)", border: "1px solid var(--border)",
                borderRadius: "4px", color: "var(--text)", fontSize: "11px",
                boxSizing: "border-box",
              }}
            />
            <textarea
              aria-label="File-back answer"
              value={fileBackText}
              onChange={e => setFileBackText(e.target.value)}
              placeholder="Paste the agent answer to file back..."
              rows={3}
              style={{
                width: "100%", padding: "4px 6px", marginBottom: "6px",
                background: "var(--surf3)", border: "1px solid var(--border)",
                borderRadius: "4px", color: "var(--text)", fontSize: "11px",
                resize: "vertical", boxSizing: "border-box",
              }}
            />
            <button
              onClick={fileBack}
              disabled={filingBack || !fileBackTitle.trim() || !fileBackText.trim()}
              style={{
                width: "100%", padding: "5px 0", borderRadius: "4px",
                border: "1px solid var(--accent)", background: fileBackDone ? "var(--accent)" : "transparent",
                color: fileBackDone ? "#fff" : "var(--accent)",
                cursor: filingBack || !fileBackTitle.trim() ? "not-allowed" : "pointer",
                fontSize: "10px", fontWeight: "bold",
              }}
            >
              {fileBackDone ? "Filed!" : filingBack ? "Filing..." : "File into Vault"}
            </button>
          </div>
        </div>
      )}

      {/* Lint tab (Rule 7) */}
      {activeTab === "lint" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {!lint ? (
            <div style={{ fontSize: "11px", color: "var(--text2)", textAlign: "center", padding: "8px 0" }}>
              No lint results yet. Click Run Lint to check your vault.
            </div>
          ) : (
            <>
              {lint.contradictions.length > 0 && (
                <LintSection label="CONTRADICTIONS" tone="error" items={lint.contradictions.map(c => c.reason)} />
              )}
              {lint.staleClaims.length > 0 && (
                <LintSection
                  label="STALE CLAIMS (>60 days)"
                  tone="warn"
                  items={lint.staleClaims.map(s => `${s.title} — ${Math.round(s.ageMs / (24*3600*1000))}d old`)}
                />
              )}
              {lint.orphanPages.length > 0 && (
                <LintSection
                  label="ORPHAN PAGES (no connections)"
                  tone="warn"
                  items={lint.orphanPages.map(id => {
                    const node = graph?.nodes.find(n => n.id === id);
                    return node?.title ?? id;
                  })}
                />
              )}
              {lint.underlinkedPages.length > 0 && (
                <LintSection
                  label="UNDERLINKED NODES (single connection)"
                  tone="info"
                  items={lint.underlinkedPages.map((id) => {
                    const node = graph?.nodes.find((n) => n.id === id);
                    return node?.title ?? id;
                  })}
                />
              )}
              {lint.noBacklinkPages.length > 0 && (
                <LintSection
                  label="NO BACKLINKS (no inbound archive links)"
                  tone="info"
                  items={lint.noBacklinkPages.map((id) => {
                    const node = graph?.nodes.find((n) => n.id === id);
                    return node?.title ?? id;
                  })}
                />
              )}
              {lint.gapTopics.length > 0 && (
                <LintSection label="GAP TOPICS (<2 items)" tone="info" items={lint.gapTopics} />
              )}
              {lint.contradictions.length === 0 && lint.staleClaims.length === 0 &&
                lint.orphanPages.length === 0 && lint.underlinkedPages.length === 0 &&
                lint.noBacklinkPages.length === 0 && lint.gapTopics.length === 0 && (
                <div style={{ fontSize: "11px", color: "var(--flo)", textAlign: "center", padding: "8px 0" }}>
                  Vault lint clean.
                </div>
              )}
              <div style={{ fontSize: "10px", color: "var(--text2)" }}>
                Checked {new Date(lint.checkedAt).toLocaleTimeString()}
              </div>
            </>
          )}
          <button
            onClick={runLint}
            disabled={!graph || nodeCount === 0}
            style={{
              padding: "4px 0", borderRadius: "4px",
              border: "1px solid var(--border)", background: "transparent",
              color: "var(--text2)", cursor: !graph ? "not-allowed" : "pointer",
              fontSize: "10px", fontWeight: "bold",
            }}
          >
            Re-run Lint
          </button>
        </div>
      )}
    </div>
  );
}

function LintSection({ label, tone, items }: {
  label: string;
  tone: "error" | "warn" | "info";
  items: string[];
}) {
  const color = tone === "error" ? "var(--flo)" : tone === "warn" ? "var(--fmd)" : "var(--text2)";
  return (
    <div>
      <div style={{ fontSize: "10px", fontWeight: "bold", color, marginBottom: "4px" }}>
        {label} ({items.length})
      </div>
      {items.slice(0, 5).map((item, i) => (
        <div key={i} style={{ fontSize: "11px", color: "var(--text)", marginBottom: "2px", paddingLeft: "8px" }}>
          &rsaquo; {item}
        </div>
      ))}
      {items.length > 5 && (
        <div style={{ fontSize: "10px", color: "var(--text2)", paddingLeft: "8px" }}>
          +{items.length - 5} more
        </div>
      )}
    </div>
  );
}
