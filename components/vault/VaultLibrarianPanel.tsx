"use client";
// VaultLibrarianPanel
// Displays VaultSynthesis results, runs lint passes (Rule 7),
// and lets the user file agent answers back into the vault (Rule 5).

import { useState } from "react";
import { useStore } from "@/store/useStore";
import { apiFetch } from "@/lib/apiFetch";
import { runVaultLint } from "@/lib/vaultGraph";

export function VaultLibrarianPanel() {
  const graph           = useStore(s => s.vaultGraph);
  const synthesis       = useStore(s => s.vaultSynthesis);
  const lint            = useStore(s => s.vaultLint);
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

  const nodeCount    = graph?.nodes.length ?? 0;
  const orphanCount  = graph?.orphans.length ?? 0;
  const clusterCount = graph?.clusters.length ?? 0;

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
    if (!graph) return;
    const result = runVaultLint(graph.nodes, graph.edges);
    setVaultLint(result);
    setActiveTab("lint");
  };

  // Rule 5: file an answer back into compiled local memory
  const fileBack = async () => {
    if (!fileBackTitle.trim() || !fileBackText.trim() || filingBack) return;
    setFilingBack(true);
    try {
      await apiFetch("/api/memory/pages", {
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
      setFileBackDone(true);
      setFileBackTitle("");
      setFileBackText("");
      setFileBackTldr("");
      setTimeout(() => setFileBackDone(false), 3000);
    } catch {
      // silent — file-back is additive only
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
          Lint {lint ? `(${lint.staleClaims.length + lint.orphanPages.length + lint.contradictions.length})` : ""}
        </button>
      </div>

      {/* Synthesis tab */}
      {activeTab === "synthesis" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <div style={{ display: "flex", gap: "6px" }}>
            <button
              onClick={runSynthesis}
              disabled={loadingSynth || !graph || nodeCount === 0}
              style={{
                flex: 1, padding: "4px 0", borderRadius: "4px",
                border: "1px solid var(--accent)", background: "transparent",
                color: loadingSynth ? "var(--text2)" : "var(--accent)",
                cursor: loadingSynth || !graph ? "not-allowed" : "pointer",
                fontSize: "10px", fontWeight: "bold",
              }}
            >
              {loadingSynth ? "Analyzing..." : "Synthesize"}
            </button>
            <button
              onClick={runLint}
              disabled={!graph || nodeCount === 0}
              style={{
                flex: 1, padding: "4px 0", borderRadius: "4px",
                border: "1px solid var(--border)", background: "transparent",
                color: "var(--text2)", cursor: !graph ? "not-allowed" : "pointer",
                fontSize: "10px", fontWeight: "bold",
              }}
            >
              Run Lint
            </button>
          </div>

          {synthError && (
            <div style={{ color: "var(--flo)", fontSize: "11px" }}>{synthError}</div>
          )}

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
                : `${nodeCount} items indexed. Click Synthesize to analyze.`}
            </div>
          )}

          {/* Rule 5: File answer back into vault */}
          <div style={{ borderTop: "1px solid var(--border)", paddingTop: "10px" }}>
            <div style={{ fontSize: "10px", color: "var(--text2)", fontWeight: "bold", marginBottom: "6px" }}>
              FILE ANSWER BACK (Rule 5)
            </div>
            <input
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
              {lint.gapTopics.length > 0 && (
                <LintSection label="GAP TOPICS (<2 items)" tone="info" items={lint.gapTopics} />
              )}
              {lint.contradictions.length === 0 && lint.staleClaims.length === 0 &&
                lint.orphanPages.length === 0 && lint.gapTopics.length === 0 && (
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
