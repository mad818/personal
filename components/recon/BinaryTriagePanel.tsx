"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { takeSelectedFile } from "@/components/ui/fileInput";
import { SurfaceCallout } from "@/components/ui/surfacePrimitives";
import MissionContinuationActions from "@/components/ui/MissionContinuationActions";
import { apiFetch } from "@/lib/apiFetch";
import { buildMissionHref } from "@/lib/missionHandoff";
import {
  buildBinaryTriageVaultDraft,
  buildBinaryTriageNotes,
  computeByteEntropy,
  detectBinaryFormat,
  extractIocCandidates,
  extractPrintableStrings,
  formatBinarySize,
  type BinaryTriageReport,
} from "@/lib/binaryTriage";

const SAMPLE_LIMIT = 1024 * 1024;

function bytesToHex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function digestHex(
  algorithm: "SHA-1" | "SHA-256",
  buffer: ArrayBuffer,
) {
  if (typeof crypto === "undefined" || !crypto.subtle) {
    throw new Error("Web Crypto is unavailable in this browser.");
  }
  const digest = await crypto.subtle.digest(algorithm, buffer);
  return bytesToHex(digest);
}

function copyText(text: string) {
  if (typeof navigator === "undefined" || !navigator.clipboard) {
    return Promise.reject(new Error("Clipboard unavailable"));
  }
  return navigator.clipboard.writeText(text);
}

function buildCopyReport(report: BinaryTriageReport) {
  return [
    `Binary triage: ${report.fileName}`,
    `Format: ${report.format.label}`,
    `Category: ${report.format.category}`,
    `Size: ${formatBinarySize(report.fileSize)}`,
    `Entropy: ${report.entropy.toFixed(2)} / 8.00`,
    `SHA-256: ${report.sha256}`,
    `SHA-1: ${report.sha1}`,
    "",
    "Notes:",
    ...report.notes.map((note) => `- ${note}`),
    "",
    "IOC candidates:",
    `- URLs: ${report.iocs.urls.join(", ") || "none"}`,
    `- Domains: ${report.iocs.domains.join(", ") || "none"}`,
    `- IPv4: ${report.iocs.ipv4.join(", ") || "none"}`,
    `- Emails: ${report.iocs.emails.join(", ") || "none"}`,
  ].join("\n");
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        padding: "10px 12px",
        borderRadius: "12px",
        border: "1px solid var(--border)",
        background: "rgba(10, 15, 30, 0.62)",
        display: "grid",
        gap: "4px",
      }}
    >
      <span style={{ fontSize: "10px", color: "var(--text3)", textTransform: "uppercase" }}>
        {label}
      </span>
      <span style={{ fontSize: "12px", color: "var(--text)", fontWeight: 700 }}>{value}</span>
    </div>
  );
}

function InlineList({
  title,
  items,
  emptyLabel,
}: {
  title: string;
  items: string[];
  emptyLabel: string;
}) {
  return (
    <div
      style={{
        padding: "12px",
        borderRadius: "12px",
        border: "1px solid var(--border)",
        background: "rgba(10, 15, 30, 0.62)",
        display: "grid",
        gap: "8px",
      }}
    >
      <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text)" }}>{title}</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
        {items.length > 0
          ? items.map((item) => (
              <span
                key={item}
                style={{
                  padding: "4px 8px",
                  borderRadius: "999px",
                  border: "1px solid rgba(107, 164, 255, 0.28)",
                  background: "rgba(56, 122, 255, 0.12)",
                  color: "var(--text2)",
                  fontSize: "11px",
                }}
              >
                {item}
              </span>
            ))
          : (
            <span style={{ fontSize: "11px", color: "var(--text3)" }}>{emptyLabel}</span>
            )}
      </div>
    </div>
  );
}

export default function BinaryTriagePanel() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const analysisInFlightRef = useRef(false);
  const [dragging, setDragging] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState("");
  const [copyStatus, setCopyStatus] = useState("");
  const [vaultStatus, setVaultStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [report, setReport] = useState<BinaryTriageReport | null>(null);

  const handleFile = useCallback(async (file: File) => {
    if (analysisInFlightRef.current) return;
    analysisInFlightRef.current = true;
    setAnalyzing(true);
    setDragging(false);
    setError("");
    setCopyStatus("");
    setVaultStatus("idle");

    try {
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      const sample = bytes.slice(0, Math.min(bytes.length, SAMPLE_LIMIT));
      const [sha256, sha1] = await Promise.all([
        digestHex("SHA-256", buffer),
        digestHex("SHA-1", buffer),
      ]);
      const format = detectBinaryFormat(sample, file.name, file.type);
      const entropy = computeByteEntropy(sample);
      const printableStrings = extractPrintableStrings(sample, 6, 80);
      const iocs = extractIocCandidates(printableStrings);
      const notes = buildBinaryTriageNotes({
        format,
        entropy,
        printableStringCount: printableStrings.length,
        iocs,
        sampleBytes: sample.length,
        totalBytes: file.size,
      });

      setReport({
        fileName: file.name,
        fileType: file.type || "unknown",
        fileSize: file.size,
        sha256,
        sha1,
        format,
        entropy,
        sampleBytes: sample.length,
        printableStrings,
        iocs,
        notes,
      });
    } catch (nextError) {
      setReport(null);
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Binary triage failed for this file.",
      );
    } finally {
      analysisInFlightRef.current = false;
      setAnalyzing(false);
    }
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent<HTMLButtonElement>) => {
      event.preventDefault();
      setDragging(false);
      const file = event.dataTransfer.files[0];
      if (file) {
        void handleFile(file);
      }
    },
    [handleFile],
  );

  const onInput = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = takeSelectedFile(event.currentTarget);
      if (file) {
        void handleFile(file);
      }
    },
    [handleFile],
  );

  const summaryText = useMemo(
    () => (report ? buildCopyReport(report) : ""),
    [report],
  );
  const memoryQuery = useMemo(
    () =>
      report
        ? `Binary triage for ${report.fileName} ${report.sha256.slice(0, 16)}`
        : "",
    [report],
  );

  const firstInterestingStrings = useMemo(
    () => report?.printableStrings.slice(0, 24) ?? [],
    [report],
  );

  const saveToVault = useCallback(async () => {
    if (!report) return;
    const draft = buildBinaryTriageVaultDraft(report);
    setVaultStatus("saving");
    try {
      const response = await apiFetch("/api/memory/pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: draft.title,
          summary: draft.summary,
          content: draft.content,
          source: "manual",
          sourceLabel: "Binary triage report",
          route: "/recon",
          layer: "knowledge",
          topic: draft.topic,
          domain: "cyber",
          tags: draft.tags,
          requestedVisibility: "internal",
        }),
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      window.dispatchEvent(new Event("nexus-memory-pages-updated"));
      setVaultStatus("saved");
    } catch {
      setVaultStatus("error");
    }
  }, [report]);

  return (
    <div style={{ display: "grid", gap: "12px" }}>
      <SurfaceCallout
        tone="info"
        compact
        icon="◈"
        title="Local reverse-engineering prep"
        description="This is a fast local triage lane inspired by reverse-engineering workflows, not a browser decompiler. Files stay in the browser while Nexus extracts hashes, format hints, entropy, strings, and IOC candidates."
      />

      <button
        type="button"
        aria-busy={analyzing}
        disabled={analyzing}
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        style={{
          display: "grid",
          gap: "6px",
          padding: "24px",
          borderRadius: "12px",
          border: `2px dashed ${dragging ? "var(--accent)" : "var(--border)"}`,
          background: dragging ? "rgba(56, 122, 255, 0.08)" : "var(--surf2)",
          color: "inherit",
          cursor: analyzing ? "progress" : "pointer",
          font: "inherit",
          opacity: analyzing ? 0.78 : 1,
          textAlign: "left",
          width: "100%",
        }}
      >
        <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--text)" }}>
          {analyzing
            ? "Analyzing the selected file locally"
            : "Choose or drop a suspicious file"}
        </div>
        <div style={{ fontSize: "11px", color: "var(--text3)" }}>
          Local-only triage for executables, archives, scripts, and documents. Nothing is uploaded.
        </div>
      </button>
      <input
        aria-label="Choose a file for local binary triage"
        ref={fileInputRef}
        type="file"
        style={{ display: "none" }}
        onChange={onInput}
      />

      {analyzing ? (
        <SurfaceCallout tone="info" compact>
          Analyzing file locally. Hashing the artifact first, then sampling entropy, strings, and IOC candidates.
        </SurfaceCallout>
      ) : null}

      {error ? <SurfaceCallout tone="warning" compact>{error}</SurfaceCallout> : null}

      {report ? (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
              gap: "10px",
            }}
          >
            <StatCard label="Format" value={report.format.label} />
            <StatCard label="Category" value={report.format.category} />
            <StatCard label="Size" value={formatBinarySize(report.fileSize)} />
            <StatCard label="Entropy" value={`${report.entropy.toFixed(2)} / 8.00`} />
          </div>

          <div
            style={{
              padding: "12px",
              borderRadius: "12px",
              border: "1px solid var(--border)",
              background: "rgba(10, 15, 30, 0.62)",
              display: "grid",
              gap: "10px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: "10px",
                alignItems: "flex-start",
                flexWrap: "wrap",
              }}
            >
              <div style={{ display: "grid", gap: "4px" }}>
                <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--text)" }}>
                  {report.fileName}
                </div>
                <div style={{ fontSize: "11px", color: "var(--text3)", lineHeight: 1.5 }}>
                  {report.format.detail}
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  void copyText(summaryText)
                    .then(() => setCopyStatus("Triage copied."))
                    .catch(() => setCopyStatus("Copy failed."));
                }}
                style={{
                  padding: "8px 10px",
                  borderRadius: "999px",
                  border: "1px solid var(--border)",
                  background: "rgba(10, 15, 30, 0.58)",
                  color: "var(--text)",
                  fontSize: "11px",
                  cursor: "pointer",
                }}
              >
                Copy triage
              </button>
              <button
                type="button"
                onClick={() => void saveToVault()}
                disabled={vaultStatus === "saving"}
                style={{
                  padding: "8px 10px",
                  borderRadius: "999px",
                  border: "1px solid rgba(107, 164, 255, 0.28)",
                  background: "rgba(56, 122, 255, 0.12)",
                  color: "var(--text)",
                  fontSize: "11px",
                  cursor: vaultStatus === "saving" ? "progress" : "pointer",
                  opacity: vaultStatus === "saving" ? 0.78 : 1,
                }}
              >
                {vaultStatus === "saving"
                  ? "Filing…"
                  : vaultStatus === "saved"
                    ? "Filed"
                    : "File into Vault"}
              </button>
            </div>

            {copyStatus ? (
              <div style={{ fontSize: "11px", color: "var(--text3)" }}>{copyStatus}</div>
            ) : null}
            {vaultStatus === "error" ? (
              <div style={{ fontSize: "11px", color: "var(--flo)" }}>
                Vault filing failed. The triage report stayed local to this browser session.
              </div>
            ) : null}

            <div style={{ display: "grid", gap: "6px" }}>
              <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text)" }}>Hashes</div>
              <div style={{ fontSize: "11px", color: "var(--text2)", wordBreak: "break-all" }}>
                <strong>SHA-256:</strong> {report.sha256}
              </div>
              <div style={{ fontSize: "11px", color: "var(--text2)", wordBreak: "break-all" }}>
                <strong>SHA-1:</strong> {report.sha1}
              </div>
            </div>
          </div>

          <div
            style={{
              padding: "12px",
              borderRadius: "12px",
              border: "1px solid var(--border)",
              background: "rgba(10, 15, 30, 0.62)",
              display: "grid",
              gap: "8px",
            }}
          >
            <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text)" }}>
              Triage notes
            </div>
            {report.notes.map((note) => (
              <div key={note} style={{ fontSize: "11px", color: "var(--text2)", lineHeight: 1.5 }}>
                - {note}
              </div>
            ))}
          </div>

          {vaultStatus === "saved" ? (
            <div
              style={{
                padding: "10px 12px",
                borderRadius: "12px",
                border: "1px solid rgba(16, 185, 129, 0.24)",
                background: "rgba(16, 185, 129, 0.08)",
                display: "grid",
                gap: "8px",
              }}
            >
              <div style={{ fontSize: "11px", color: "var(--text2)", lineHeight: 1.5 }}>
                Binary triage is now durable memory. It will also export as a reverse-engineering prep note in the Obsidian-ready second-brain pack, so this RECON session can compound instead of disappearing.
              </div>
              <MissionContinuationActions
                memoryQuery={memoryQuery}
                routeHint="/vault"
                extraTargets={[
                  {
                    href: buildMissionHref("/vault?focus=vault-compiled-pages", "archive"),
                    label: "Continue in VAULT",
                    tab: "vault",
                  },
                  {
                    href: buildMissionHref("/recon?view=binary&focus=recon-binary", "investigate", {
                      source: "recon",
                    }),
                    label: "Continue in RECON",
                    tab: "recon",
                  },
                ]}
              />
            </div>
          ) : null}

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "10px",
            }}
          >
            <InlineList title="URLs" items={report.iocs.urls} emptyLabel="No URL candidates in the sampled strings." />
            <InlineList title="Domains" items={report.iocs.domains} emptyLabel="No domain candidates in the sampled strings." />
            <InlineList title="IPv4" items={report.iocs.ipv4} emptyLabel="No IPv4 candidates in the sampled strings." />
            <InlineList title="Emails" items={report.iocs.emails} emptyLabel="No email candidates in the sampled strings." />
          </div>

          <div
            style={{
              padding: "12px",
              borderRadius: "12px",
              border: "1px solid var(--border)",
              background: "rgba(10, 15, 30, 0.62)",
              display: "grid",
              gap: "8px",
            }}
          >
            <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text)" }}>
              Printable strings sample
            </div>
            <div style={{ fontSize: "11px", color: "var(--text3)" }}>
              Showing up to {firstInterestingStrings.length} strings from the first {formatBinarySize(report.sampleBytes)} of the file.
            </div>
            <div
              style={{
                maxHeight: "220px",
                overflowY: "auto",
                display: "grid",
                gap: "6px",
              }}
            >
              {firstInterestingStrings.length > 0 ? (
                firstInterestingStrings.map((value) => (
                  <code
                    key={`${report.fileName}-${value}`}
                    style={{
                      padding: "6px 8px",
                      borderRadius: "8px",
                      background: "rgba(8, 12, 24, 0.9)",
                      border: "1px solid rgba(107, 164, 255, 0.14)",
                      color: "var(--text2)",
                      fontSize: "11px",
                      wordBreak: "break-all",
                    }}
                  >
                    {value}
                  </code>
                ))
              ) : (
                <div style={{ fontSize: "11px", color: "var(--text3)" }}>
                  No printable strings surfaced from the sampled bytes.
                </div>
              )}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
