"use client";

import { useMemo, useState } from "react";
import { apiFetch } from "@/lib/apiFetch";
import type { MemoryVisibility } from "@/lib/memorySpine";
import { SurfaceCallout } from "@/components/ui/surfacePrimitives";

const VISIBILITY_OPTIONS: MemoryVisibility[] = [
  "safe",
  "internal",
  "restricted",
];

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

function deriveTitle(originLabel: string, content: string) {
  const origin = originLabel
    .replace(/\\/g, "/")
    .split("/")
    .filter(Boolean)
    .pop();
  if (origin) return origin.slice(0, 80);
  const firstLine = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean);
  return (firstLine ?? "Document intake").slice(0, 80);
}

export default function DocumentIntakePanel() {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [originLabel, setOriginLabel] = useState("");
  const [documentMimeType, setDocumentMimeType] = useState("application/pdf");
  const [pageCountText, setPageCountText] = useState("");
  const [tagsText, setTagsText] = useState("document-intake, local-doc");
  const [requestedVisibility, setRequestedVisibility] =
    useState<MemoryVisibility>("internal");
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");

  const parsedTags = useMemo(() => parseTags(tagsText), [tagsText]);

  const submit = async () => {
    const trimmedContent = content.trim();
    if (!trimmedContent) {
      setStatusMsg("Paste extracted document text first.");
      return;
    }

    setSaving(true);
    setStatusMsg("");
    try {
      const res = await apiFetch("/api/memory/pages", {
        method: "POST",
        body: JSON.stringify({
          title: title.trim() || deriveTitle(originLabel, trimmedContent),
          content: trimmedContent,
          source: "manual",
          sourceLabel: "Document intake · local",
          route: "/vault",
          layer: "raw",
          tags: parsedTags,
          workflowPackId: "research-workflow",
          memoryCompartment: "research",
          sourceType:
            documentMimeType.trim().toLowerCase() === "application/pdf"
              ? "local-pdf"
              : "local-note",
          evidenceStrength:
            documentMimeType.trim().toLowerCase() === "application/pdf"
              ? "source-backed"
              : "contextual",
          sourceRefs: [
            {
              id: originLabel.trim() || "local-document",
              title: title.trim() || deriveTitle(originLabel, trimmedContent),
              sourceType:
                documentMimeType.trim().toLowerCase() === "application/pdf"
                  ? "local-pdf"
                  : "local-note",
              evidenceStrength:
                documentMimeType.trim().toLowerCase() === "application/pdf"
                  ? "source-backed"
                  : "contextual",
              inferred: false,
            },
          ],
          requestedVisibility,
          documentOriginLabel: originLabel.trim() || undefined,
          documentMimeType: documentMimeType.trim() || undefined,
          documentPageCount:
            pageCountText.trim().length > 0 ? Number(pageCountText) : undefined,
        }),
      });

      if (!res.ok) {
        setStatusMsg("Document intake failed. Check the fields and try again.");
        return;
      }

      setTitle("");
      setContent("");
      setOriginLabel("");
      setDocumentMimeType("application/pdf");
      setPageCountText("");
      setTagsText("document-intake, local-doc");
      setRequestedVisibility("internal");
      setStatusMsg("Document filed into compiled memory.");
      window.dispatchEvent(new Event("nexus-memory-pages-updated"));
    } catch {
      setStatusMsg("Document intake failed. Check the fields and try again.");
    } finally {
      setSaving(false);
    }
  };

  const INPUT: React.CSSProperties = {
    width: "100%",
    minHeight: "38px",
    padding: "8px 10px",
    borderRadius: "10px",
    border: "1px solid var(--border)",
    background: "rgba(11, 17, 32, 0.72)",
    color: "var(--text)",
    fontSize: "12px",
    outline: "none",
    boxSizing: "border-box",
  };

  return (
    <div style={{ display: "grid", gap: "10px" }}>
      <SurfaceCallout
        tone="info"
        compact
        icon="ScanSearch"
        title="Local-only document intake"
        description="Paste extracted document text or OCR output here. Nothing is uploaded, and sensitive file-path hints are sanitized before storage."
      />

      <input
        aria-label="Document title"
        style={INPUT}
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder="Title (optional — derived from file label or first line)"
      />

      <textarea
        aria-label="Document content"
        style={{
          ...INPUT,
          minHeight: "140px",
          resize: "vertical",
          fontFamily: "ui-monospace, SFMono-Regular, Consolas, monospace",
          lineHeight: 1.5,
        }}
        value={content}
        onChange={(event) => setContent(event.target.value)}
        placeholder="Paste extracted document text, OCR output, or cleaned notes here"
      />

      <div
        style={{
          display: "grid",
          gap: "10px",
          gridTemplateColumns: "minmax(0, 1.2fr) minmax(140px, 0.8fr) 120px",
        }}
      >
        <input
          aria-label="Document origin label"
          style={INPUT}
          value={originLabel}
          onChange={(event) => setOriginLabel(event.target.value)}
          placeholder="Optional file label or origin name"
        />
        <input
          aria-label="Document MIME type"
          style={INPUT}
          value={documentMimeType}
          onChange={(event) => setDocumentMimeType(event.target.value)}
          placeholder="application/pdf"
        />
        <input
          aria-label="Document page count"
          style={INPUT}
          inputMode="numeric"
          value={pageCountText}
          onChange={(event) =>
            setPageCountText(event.target.value.replace(/[^\d]/g, ""))
          }
          placeholder="Pages"
        />
      </div>

      <input
        aria-label="Document tags"
        style={INPUT}
        value={tagsText}
        onChange={(event) => setTagsText(event.target.value)}
        placeholder="Tags (comma separated)"
      />

      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
        {VISIBILITY_OPTIONS.map((option) => {
          const active = requestedVisibility === option;
          return (
            <button
              key={option}
              type="button"
              onClick={() => setRequestedVisibility(option)}
              style={{
                padding: "4px 9px",
                borderRadius: "999px",
                border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
                background: active ? "rgba(79,110,247,0.12)" : "transparent",
                color: active ? "var(--accent)" : "var(--text2)",
                cursor: "pointer",
                fontSize: "10px",
                fontWeight: 700,
                textTransform: "uppercase",
              }}
            >
              {option}
            </button>
          );
        })}
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          flexWrap: "wrap",
        }}
      >
        <button
          type="button"
          onClick={() => void submit()}
          disabled={saving}
          className="nexus-shell-button"
          style={{ minHeight: "34px", padding: "0 12px", fontSize: "11px" }}
        >
          {saving ? "Filing…" : "File document"}
        </button>
        <span style={{ fontSize: "11px", color: "var(--text3)" }}>
          Server-side rules can still escalate visibility if the content appears
          sensitive.
        </span>
      </div>

      {statusMsg ? (
        <div role="status" style={{ fontSize: "11px", color: "var(--text2)" }}>
          {statusMsg}
        </div>
      ) : null}
    </div>
  );
}
