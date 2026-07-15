// ── components/vault/VaultExport ───────────────────────────
// Export bookmarked articles to JSON or Obsidian second-brain pack.

"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useStore } from "@/store/useStore";
import { requestTextDownload } from "@/components/ui/downloadFeedback";
import { toast } from "@/components/ui/Toast";
import { CHART } from "@/lib/chartTheme";
import type { Article } from "@/store/useStore";
import {
  buildSecondBrainExportBundle,
  type SecondBrainExportCompiledArtifact,
  SECOND_BRAIN_EXPORT_MODE_LABELS,
  type SecondBrainExportMode,
} from "@/lib/secondBrainExport";

interface VaultExportProps {
  filtered?: Article[];
  compiledPages?: SecondBrainExportCompiledArtifact[];
}

export default function VaultExport({
  filtered,
  compiledPages = [],
}: VaultExportProps) {
  const savedArticles = useStore((s) => s.savedArticles);
  const [exporting, setExporting] = useState<
    "all" | "filtered" | "brain" | null
  >(null);
  const [secondBrainMode, setSecondBrainMode] =
    useState<SecondBrainExportMode>("full");

  function downloadBlob(filename: string, content: string, mime: string) {
    return requestTextDownload({
      filename,
      content,
      label: "VAULT export",
      mimeType: mime,
      announce: false,
    });
  }

  function exportArticles(articles: Article[], label: string) {
    const json = JSON.stringify(
      articles.map((a) => ({
        title: a.title,
        source: a.src ?? "",
        date: a.date,
        link: a.link,
        desc: a.desc,
        cat: a.cat ?? "",
      })),
      null,
      2,
    );
    return downloadBlob(
      `nexus-vault-${label}-${new Date().toISOString().slice(0, 10)}.json`,
      json,
      "application/json",
    );
  }

  async function handleExport(type: "all" | "filtered") {
    setExporting(type);
    await new Promise((r) => setTimeout(r, 300));
    try {
      const requested =
        type === "all"
          ? exportArticles(savedArticles, "all")
          : exportArticles(filtered ?? savedArticles, "filtered");
      if (!requested) throw new Error("Download request failed.");
      toast({
        title: "VAULT export requested",
        message: "Check your browser downloads for the JSON export.",
        severity: "low",
      });
    } catch {
      toast({
        title: "VAULT export not prepared",
        message:
          "The browser could not start this download. Keep VAULT open and retry.",
        severity: "medium",
      });
    } finally {
      setExporting(null);
    }
  }

  async function handleSecondBrainExport() {
    setExporting("brain");
    await new Promise((r) => setTimeout(r, 300));
    try {
      const bundle = buildSecondBrainExportBundle({
        articles: savedArticles,
        compiledPages,
        mode: secondBrainMode,
      });
      const modeLabel = SECOND_BRAIN_EXPORT_MODE_LABELS[secondBrainMode]
        .toLowerCase()
        .replace(/\s+/g, "-");
      for (const file of bundle.files) {
        const filename = `nexus-second-brain-${modeLabel}/${file.path}`;
        if (!downloadBlob(filename, file.content, "text/markdown")) {
          throw new Error("Download request failed.");
        }
        // Small delay between files to avoid browser download throttling
        await new Promise((r) => setTimeout(r, 80));
      }
      toast({
        title: "Second-brain downloads requested",
        message: `${bundle.files.length} file requests were sent. Allow multiple downloads if your browser asks.`,
        severity: "low",
      });
    } catch {
      toast({
        title: "Second-brain export not prepared",
        message:
          "One or more browser download requests failed. Keep VAULT open and retry.",
        severity: "medium",
      });
    } finally {
      setExporting(null);
    }
  }

  const btnBase: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "5px",
    padding: "5px 12px",
    borderRadius: "6px",
    border: `1px solid ${CHART.border2}`,
    background: CHART.surf3,
    color: CHART.text2,
    fontSize: "10px",
    fontWeight: 700,
    fontFamily: "monospace",
    letterSpacing: "0.5px",
    cursor: "pointer",
    whiteSpace: "nowrap" as const,
    transition: "border-color 0.2s, color 0.2s",
  };

  const modeKeys = Object.keys(
    SECOND_BRAIN_EXPORT_MODE_LABELS,
  ) as SecondBrainExportMode[];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      {/* JSON exports row */}
      <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
        {/* Export All */}
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.96 }}
          style={{ ...btnBase, borderColor: CHART.rose, color: CHART.rose }}
          onClick={() => void handleExport("all")}
          disabled={exporting !== null}
          title="Export all saved articles as JSON"
        >
          <svg
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          {exporting === "all" ? "EXPORTING…" : "EXPORT ALL"}
        </motion.button>

        {/* Export Filtered */}
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.96 }}
          style={btnBase}
          onClick={() => void handleExport("filtered")}
          disabled={exporting !== null}
          title="Export filtered articles as JSON"
        >
          <svg
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          {exporting === "filtered" ? "EXPORTING…" : "EXPORT FILTERED"}
        </motion.button>
      </div>

      {/* Second Brain export row */}
      <div
        style={{
          display: "flex",
          gap: "6px",
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        {/* Mode picker */}
        <select
          aria-label="Second brain export mode"
          value={secondBrainMode}
          onChange={(e) =>
            setSecondBrainMode(e.target.value as SecondBrainExportMode)
          }
          disabled={exporting !== null}
          title="Second brain export mode"
          style={{
            background: CHART.surf3,
            border: `1px solid rgba(89,219,196,0.35)`,
            borderRadius: "6px",
            color: "#8ffaf0",
            fontSize: "10px",
            fontWeight: 700,
            fontFamily: "monospace",
            letterSpacing: "0.5px",
            padding: "5px 8px",
            cursor: "pointer",
            outline: "none",
          }}
        >
          {modeKeys.map((key) => (
            <option key={key} value={key}>
              {SECOND_BRAIN_EXPORT_MODE_LABELS[key].toUpperCase()}
            </option>
          ))}
        </select>

        {/* Second Brain button */}
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.96 }}
          style={{
            ...btnBase,
            borderColor: "rgba(89,219,196,0.55)",
            color: "#8ffaf0",
          }}
          onClick={() => void handleSecondBrainExport()}
          disabled={exporting !== null}
          title="Export as Obsidian second-brain markdown pack"
        >
          <svg
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          {exporting === "brain"
            ? `EXPORTING ${SECOND_BRAIN_EXPORT_MODE_LABELS[secondBrainMode].toUpperCase()}…`
            : "SECOND BRAIN"}
        </motion.button>
      </div>
    </div>
  );
}
