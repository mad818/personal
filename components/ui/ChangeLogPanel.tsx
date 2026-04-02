"use client";

// ── ChangeLogPanel.tsx ─────────────────────────────────────────────────────────
// Audit trail — every approved/rejected/direct patch is listed here.
// Accessed from a floating trigger button (bottom-left, above ProposedEditPanel).
// Shows file path, agent, timestamp, type badge, and line delta.

import { useState, useEffect } from "react";
import { useStore, type ChangeEntry } from "@/store/useStore";

const TYPE_STYLE: Record<
  ChangeEntry["type"],
  { color: string; label: string }
> = {
  approved: { color: "#00FF66", label: "APPROVED" },
  rejected: { color: "#ef4444", label: "REJECTED" },
  patch: { color: "#00DDFF", label: "PATCHED" },
  create: { color: "#7c3aed", label: "CREATED" },
};

function timeAgo(ts: number): string {
  const d = Math.floor((Date.now() - ts) / 1000);
  if (d < 60) return `${d}s ago`;
  if (d < 3600) return `${Math.floor(d / 60)}m ago`;
  return `${Math.floor(d / 3600)}h ago`;
}

function EntryRow({ entry }: { entry: ChangeEntry }) {
  const t = TYPE_STYLE[entry.type];
  const delta = entry.linesAdded - entry.linesRemoved;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "3px",
        padding: "7px 10px",
        borderBottom: "1px solid #1A2040",
      }}
    >
      {/* Top row */}
      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        {/* Type badge */}
        <span
          style={{
            fontSize: "7px",
            fontFamily: "'VT323', monospace",
            padding: "1px 5px",
            borderRadius: "3px",
            background: `${t.color}14`,
            border: `1px solid ${t.color}44`,
            color: t.color,
            letterSpacing: "1px",
            flexShrink: 0,
          }}
        >
          {t.label}
        </span>

        {/* File path */}
        <span
          style={{
            fontSize: "9px",
            fontFamily: "monospace",
            color: "#00DDFF",
            flex: 1,
            minWidth: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {entry.path}
        </span>

        {/* Line delta */}
        {delta !== 0 && (
          <span
            style={{
              fontSize: "8px",
              fontFamily: "monospace",
              color: delta > 0 ? "#00FF6688" : "#ef444488",
              flexShrink: 0,
            }}
          >
            {delta > 0 ? `+${delta}` : delta}
          </span>
        )}
      </div>

      {/* Summary */}
      <div
        style={{
          fontSize: "8px",
          color: "#4a5568",
          fontFamily: "monospace",
          lineHeight: 1.4,
        }}
      >
        {entry.summary}
      </div>

      {/* Meta */}
      <div style={{ display: "flex", gap: "8px" }}>
        <span
          style={{ fontSize: "7px", color: "#304060", fontFamily: "monospace" }}
        >
          {entry.agent.toUpperCase()}
        </span>
        <span
          style={{ fontSize: "7px", color: "#304060", fontFamily: "monospace" }}
        >
          {timeAgo(entry.timestamp)}
        </span>
      </div>
    </div>
  );
}

export default function ChangeLogPanel() {
  const changeLog = useStore((s) => s.changeLog);
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 300);
    return () => clearTimeout(t);
  }, []);

  if (!visible || changeLog.length === 0) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: changeLog.length > 0 ? "56px" : "12px", // above ProposedEditPanel trigger
        left: "12px",
        zIndex: 280,
        pointerEvents: "none",
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
      }}
    >
      {/* ── Expanded panel ────────────────────────────────────────────────── */}
      {open && (
        <div
          style={{
            width: "360px",
            maxWidth: "calc(100vw - 24px)",
            background: "#0d1220",
            border: "1px solid #1A2040",
            borderRadius: "8px 8px 0 0",
            borderBottom: "none",
            boxShadow: "0 -4px 24px rgba(0,0,0,.5)",
            display: "flex",
            flexDirection: "column",
            maxHeight: "50vh",
            pointerEvents: "auto",
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "6px 12px",
              borderBottom: "1px solid #1A2040",
              background: "#0a0e1a",
              flexShrink: 0,
            }}
          >
            <span
              style={{
                fontSize: "11px",
                fontFamily: "'VT323', monospace",
                color: "#00DDFF",
                letterSpacing: "2px",
                flex: 1,
              }}
            >
              CHANGE LOG
            </span>
            <span
              style={{
                fontSize: "9px",
                fontFamily: "monospace",
                color: "#304060",
              }}
            >
              {changeLog.length} entries
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              style={{
                fontSize: "12px",
                color: "var(--text2)",
                lineHeight: 1,
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "1px 4px",
              }}
            >
              ✕
            </button>
          </div>

          {/* Entries */}
          <div style={{ flex: 1, overflowY: "auto" }}>
            {changeLog.map((entry) => (
              <EntryRow key={entry.id} entry={entry} />
            ))}
          </div>
        </div>
      )}

      {/* ── Trigger pill ─────────────────────────────────────────────────── */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          pointerEvents: "auto",
          display: "flex",
          alignItems: "center",
          gap: "5px",
          padding: "4px 10px",
          background: "#0d1220",
          border: "1px solid #00DDFF22",
          borderTop: open ? "1px solid #1A2040" : "1px solid #00DDFF22",
          borderRadius: open ? "0 0 6px 6px" : "6px",
          cursor: "pointer",
          boxShadow: "0 2px 12px rgba(0,0,0,.35)",
        }}
      >
        <span
          style={{
            width: "4px",
            height: "4px",
            borderRadius: "50%",
            background: "#00DDFF",
            display: "inline-block",
          }}
        />
        <span
          style={{
            fontSize: "9px",
            fontFamily: "'VT323', monospace",
            color: "#00DDFF88",
            letterSpacing: "1px",
          }}
        >
          AUDIT LOG ({changeLog.length})
        </span>
      </button>
    </div>
  );
}
