"use client";
// FileBackButton (Rule 5 — file query answers back into the VAULT)
// Shows below any agent response >200 chars. One click pre-populates title
// and TLDR from the response text; confirm creates a savedArticle so the
// vault graph picks it up on the next rebuild.

import { useEffect, useMemo, useState } from "react";
import { useStore } from "@/store/useStore";
import type { AgentId } from "@/components/home/office/types";
import { apiFetch } from "@/lib/apiFetch";
import { toast } from "@/components/ui/Toast";
import { toggleSavedArticleWithIndex } from "@/lib/articleReasoningQueue";
import {
  detectMemoryVisibility,
  guessMemoryDomain,
  materializeMemorySpineItem,
  resolveMemoryVisibility,
  type MemoryVisibility,
} from "@/lib/memorySpine";
import type { VaultCaptureSuggestion } from "@/lib/vaultCapture";
import { deriveVaultArchiveLinks } from "@/lib/vaultCrossLinker";
import type { CompiledMemoryPageSummary } from "@/components/vault/vaultGraphPageUtils";

interface FileBackButtonProps {
  text: string;
  agentId: AgentId;
  suggestion?: VaultCaptureSuggestion | null;
}

function derive(text: string): { title: string; tldr: string } {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const title = (lines[0] ?? "Agent response")
    .replace(/^#+\s*/, "")
    .slice(0, 80);
  const tldr = lines.slice(1, 3).join(" ").slice(0, 120) || title;
  return { title, tldr };
}

function parseTags(value: string) {
  return Array.from(
    new Set(
      value
        .split(/[,\n]/)
        .map((tag) => tag.trim().toLowerCase())
        .filter(Boolean),
    ),
  );
}

const VISIBILITY_OPTIONS: MemoryVisibility[] = [
  "safe",
  "internal",
  "restricted",
];

export function FileBackButton({
  text,
  agentId,
  suggestion = null,
}: FileBackButtonProps) {
  const savedArticles = useStore((s) => s.savedArticles);
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [compiledPages, setCompiledPages] = useState<
    CompiledMemoryPageSummary[]
  >([]);

  const derived = derive(text);
  const [title, setTitle] = useState(suggestion?.title ?? derived.title);
  const [tldr, setTldr] = useState(suggestion?.summary ?? derived.tldr);
  const [tagsText, setTagsText] = useState(
    suggestion?.tags?.length
      ? suggestion.tags.join(", ")
      : `filed-back, ${agentId}, agent-answer, hq`,
  );
  const [requestedVisibility, setRequestedVisibility] =
    useState<MemoryVisibility>("internal");

  useEffect(() => {
    if (!(open || suggestion) || compiledPages.length > 0) return;
    let cancelled = false;
    void apiFetch("/api/memory/pages?limit=48")
      .then(async (response) => {
        if (!response.ok || cancelled) return;
        const payload = (await response.json()) as {
          pages?: CompiledMemoryPageSummary[];
        };
        if (!cancelled) {
          setCompiledPages(Array.isArray(payload.pages) ? payload.pages : []);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCompiledPages([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [compiledPages.length, open, suggestion]);

  const parsedTags = useMemo(() => parseTags(tagsText), [tagsText]);
  const previewDomain = useMemo(
    () =>
      guessMemoryDomain([title, tldr, text, parsedTags.join(" ")].join(" ")),
    [parsedTags, text, title, tldr],
  );
  const detectedVisibility = useMemo(
    () =>
      detectMemoryVisibility({
        layer: "knowledge",
        kind: "page",
        title,
        summary: tldr,
        sourceLabel: `Filed answer · ${agentId.toUpperCase()}`,
        tags: parsedTags,
        extraText: text,
      }),
    [agentId, parsedTags, text, title, tldr],
  );
  const effectiveVisibility = useMemo(
    () => resolveMemoryVisibility(detectedVisibility, requestedVisibility),
    [detectedVisibility, requestedVisibility],
  );
  const previewItem = useMemo(
    () =>
      materializeMemorySpineItem(
        {
          id: "hq-file-preview",
          layer: "knowledge",
          kind: "page",
          title: title.trim() || derived.title,
          summary: tldr.trim() || derived.tldr,
          sourceLabel: `Filed answer · ${agentId.toUpperCase()}`,
          domain: previewDomain,
          tags: parsedTags,
          timestamp: Date.now(),
        },
        {
          visibility: effectiveVisibility,
          extraText: text,
        },
      ),
    [
      agentId,
      derived.title,
      derived.tldr,
      effectiveVisibility,
      parsedTags,
      previewDomain,
      text,
      title,
      tldr,
    ],
  );
  const suggestedArchiveLinks = useMemo(
    () =>
      deriveVaultArchiveLinks({
        article: {
          id: "hq-file-preview",
          title: title.trim() || derived.title,
          desc: tldr.trim() || derived.tldr,
          link: "",
          date: new Date().toISOString(),
          tags: parsedTags,
          cat: previewDomain,
        },
        savedArticles,
        compiledPages,
      }),
    [
      compiledPages,
      derived.title,
      derived.tldr,
      parsedTags,
      previewDomain,
      savedArticles,
      title,
      tldr,
    ],
  );
  const routeHint = suggestion?.routeHint ?? "/hq";
  const sourceRefs = suggestion?.sourceRefs ?? [];

  // Only show for substantive responses
  if (!suggestion && text.length < 200) return null;
  if (done) {
    return (
      <span
        style={{ fontSize: "10px", color: "var(--flo)", paddingLeft: "4px" }}
      >
        Filed to VAULT
      </span>
    );
  }
  if (dismissed) return null;

  if (suggestion && !open) {
    return (
      <div
        style={{
          display: "grid",
          gap: "6px",
          padding: "8px 10px",
          borderRadius: "8px",
          border: "1px solid rgba(123, 167, 212, 0.16)",
          background: "rgba(9, 14, 28, 0.42)",
          minWidth: "260px",
          maxWidth: "420px",
        }}
      >
        <div style={{ fontSize: "10px", fontWeight: "bold", color: "#bfdbfe" }}>
          SAVE TO VAULT
        </div>
        <div style={{ fontSize: "11px", color: "var(--text)" }}>
          {suggestion.title}
        </div>
        <div
          style={{ fontSize: "10px", color: "var(--text3)", lineHeight: 1.45 }}
        >
          {suggestion.summary}
        </div>
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          <button
            onClick={() => setOpen(true)}
            className="nexus-shell-button"
            style={{ minHeight: "28px", padding: "0 10px", fontSize: "10px" }}
          >
            Save to VAULT
          </button>
          <button
            onClick={() => setDismissed(true)}
            style={{
              background: "transparent",
              border: "1px solid var(--border)",
              borderRadius: "4px",
              color: "var(--text2)",
              cursor: "pointer",
              fontSize: "10px",
              padding: "2px 8px",
            }}
          >
            Dismiss
          </button>
        </div>
      </div>
    );
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        title="File this answer to the VAULT"
        style={{
          background: "transparent",
          border: "1px solid var(--border)",
          borderRadius: "4px",
          color: "var(--text2)",
          cursor: "pointer",
          fontSize: "10px",
          padding: "2px 7px",
          marginLeft: "4px",
        }}
      >
        + VAULT
      </button>
    );
  }

  const fileToVault = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const response = await apiFetch("/api/memory/pages", {
        method: "POST",
        body: JSON.stringify({
          title: title.trim() || derived.title,
          summary: tldr.trim() || derived.tldr,
          content: text,
          source: "manual",
          sourceLabel: `Filed answer · ${agentId.toUpperCase()}`,
          route: routeHint,
          layer: "knowledge",
          domain: previewDomain,
          tags: parsedTags,
          requestedVisibility,
          sourceRefs,
        }),
      });
      if (!response.ok) {
        throw new Error(`VAULT filing failed (${response.status}).`);
      }
      toggleSavedArticleWithIndex({
        id: `filed-${Date.now()}-${agentId}`,
        title: previewItem.title,
        desc: previewItem.summary,
        link: "",
        date: new Date().toISOString(),
        tags: previewItem.tags,
        cat: previewDomain,
        archiveLinks: suggestedArchiveLinks,
      });
      setDone(true);
      setOpen(false);
    } catch {
      toast({
        title: "VAULT answer not filed",
        message:
          "The filing form is still open. Check the VAULT route and retry.",
        severity: "medium",
      });
    } finally {
      setSaving(false);
    }
  };

  const INPUT: React.CSSProperties = {
    width: "100%",
    padding: "3px 6px",
    background: "var(--surf3)",
    border: "1px solid var(--border)",
    borderRadius: "3px",
    color: "var(--text)",
    fontSize: "10px",
    boxSizing: "border-box",
  };

  return (
    <div
      style={{
        marginLeft: "4px",
        padding: "8px 10px",
        background: "var(--surf2)",
        border: "1px solid var(--border)",
        borderRadius: "6px",
        display: "flex",
        flexDirection: "column",
        gap: "5px",
        minWidth: "260px",
        maxWidth: "400px",
      }}
    >
      <div
        style={{ fontSize: "9px", color: "var(--text2)", fontWeight: "bold" }}
      >
        FILE TO VAULT
      </div>
      <input
        aria-label="Vault file-back title"
        style={INPUT}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title…"
      />
      <input
        aria-label="Vault file-back summary"
        style={INPUT}
        value={tldr}
        onChange={(e) => setTldr(e.target.value)}
        placeholder="TLDR…"
      />
      <input
        aria-label="Vault file-back tags"
        style={INPUT}
        value={tagsText}
        onChange={(e) => setTagsText(e.target.value)}
        placeholder="Tags (comma separated)…"
      />
      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
        <div
          style={{ fontSize: "9px", color: "var(--text2)", fontWeight: "bold" }}
        >
          VISIBILITY
        </div>
        <div style={{ display: "flex", gap: "5px", flexWrap: "wrap" }}>
          {VISIBILITY_OPTIONS.map((option) => {
            const active = requestedVisibility === option;
            return (
              <button
                key={option}
                type="button"
                onClick={() => setRequestedVisibility(option)}
                style={{
                  padding: "3px 7px",
                  borderRadius: "999px",
                  border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
                  background: active ? "rgba(79,110,247,0.12)" : "transparent",
                  color: active ? "var(--accent)" : "var(--text2)",
                  cursor: "pointer",
                  fontSize: "10px",
                  fontWeight: "bold",
                  textTransform: "uppercase",
                }}
              >
                {option}
              </button>
            );
          })}
        </div>
      </div>
      <div
        style={{
          padding: "6px 8px",
          borderRadius: "6px",
          border: "1px solid var(--border)",
          background: "rgba(9,14,28,0.45)",
          display: "flex",
          flexDirection: "column",
          gap: "4px",
        }}
      >
        <div
          style={{ fontSize: "9px", color: "var(--text2)", fontWeight: "bold" }}
        >
          SAFE PREVIEW
        </div>
        <div style={{ fontSize: "10px", color: "var(--text)" }}>
          {previewItem.title}
        </div>
        <div
          style={{ fontSize: "10px", color: "var(--text2)", lineHeight: 1.4 }}
        >
          {previewItem.summary}
        </div>
        <div style={{ display: "flex", gap: "5px", flexWrap: "wrap" }}>
          <span style={{ fontSize: "9px", color: "var(--text3)" }}>
            Requested {requestedVisibility}
          </span>
          <span style={{ fontSize: "9px", color: "var(--text3)" }}>
            Final {effectiveVisibility}
          </span>
          <span style={{ fontSize: "9px", color: "var(--text3)" }}>
            {previewItem.tags.length} tags
          </span>
          <span style={{ fontSize: "9px", color: "var(--text3)" }}>
            Route {routeHint}
          </span>
        </div>
        {effectiveVisibility !== requestedVisibility ? (
          <div style={{ fontSize: "9px", color: "#f59e0b" }}>
            Protection escalated automatically based on detected sensitive
            content.
          </div>
        ) : (
          <div style={{ fontSize: "9px", color: "var(--text3)" }}>
            Manual filing can raise sensitivity, but it never downgrades
            detected protection.
          </div>
        )}
        {suggestedArchiveLinks.length > 0 ? (
          <div style={{ display: "grid", gap: "4px" }}>
            <div
              style={{
                fontSize: "9px",
                color: "var(--text2)",
                fontWeight: "bold",
              }}
            >
              Suggested archive links
            </div>
            {suggestedArchiveLinks.slice(0, 3).map((link) => (
              <div
                key={link.targetId}
                style={{ fontSize: "9px", color: "var(--text3)" }}
              >
                {link.targetId} · {link.reason}
              </div>
            ))}
          </div>
        ) : null}
        {sourceRefs.length > 0 ? (
          <div style={{ fontSize: "9px", color: "var(--text3)" }}>
            {sourceRefs.length} source ref{sourceRefs.length === 1 ? "" : "s"}{" "}
            will be carried into the saved note.
          </div>
        ) : null}
      </div>
      <div style={{ display: "flex", gap: "5px" }}>
        <button
          type="button"
          onClick={() => void fileToVault()}
          disabled={saving}
          style={{
            flex: 1,
            padding: "3px 0",
            borderRadius: "3px",
            border: "1px solid var(--accent)",
            background: "transparent",
            color: "var(--accent)",
            cursor: saving ? "not-allowed" : "pointer",
            fontSize: "10px",
            fontWeight: "bold",
          }}
        >
          {saving ? "Filing..." : "File"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          disabled={saving}
          style={{
            padding: "3px 8px",
            borderRadius: "3px",
            border: "1px solid var(--border)",
            background: "transparent",
            color: "var(--text2)",
            cursor: saving ? "not-allowed" : "pointer",
            fontSize: "10px",
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
