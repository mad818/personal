"use client";

// ── ProposedEditPanel.tsx ──────────────────────────────────────────────────────
// Safe project editing workflow — shows proposed file changes with a diff view.
// The agent calls propose_project_edit → edit lands here → user approves/rejects.
// Approved edits call /api/tools directly to apply the actual patch.
// Rejected edits are logged and discarded.
//
// Layout: fixed bottom-left overlay, openclaw style.
// Collapsed: amber pill with pending count.
// Expanded: full panel with file path, risk badge, reason, diff, and buttons.

import { useState, useEffect } from "react";
import { useStore, type PendingEdit } from "@/store/useStore";
import { apiFetch } from "@/lib/apiFetch";

// ── Inline diff renderer ──────────────────────────────────────────────────────
// Splits old_string/new_string into lines and highlights removed/added lines.
function DiffView({ oldStr, newStr }: { oldStr: string; newStr: string }) {
  const oldLines = oldStr.split("\n");
  const newLines = newStr.split("\n");
  const [showFull, setShowFull] = useState(false);

  const MAX_PREVIEW = 8;

  function Lines({
    lines,
    color,
    prefix,
  }: {
    lines: string[];
    color: string;
    prefix: string;
  }) {
    const shown = showFull ? lines : lines.slice(0, MAX_PREVIEW);
    return (
      <div>
        {shown.map((ln, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              gap: "6px",
              background: `${color}14`,
              borderLeft: `2px solid ${color}66`,
              padding: "0 6px",
              fontFamily: "monospace",
              fontSize: "9px",
              color: `${color}cc`,
              lineHeight: 1.5,
              whiteSpace: "pre-wrap",
              wordBreak: "break-all",
            }}
          >
            <span
              style={{ color: `${color}66`, flexShrink: 0, userSelect: "none" }}
            >
              {prefix}
            </span>
            <span>{ln || " "}</span>
          </div>
        ))}
        {!showFull && lines.length > MAX_PREVIEW && (
          <button
            type="button"
            onClick={() => setShowFull(true)}
            style={{
              fontSize: "8px",
              color: "#4a5568",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "2px 6px",
            }}
          >
            + {lines.length - MAX_PREVIEW} more lines
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      style={{
        borderRadius: "4px",
        overflow: "hidden",
        border: "1px solid #1A2040",
        maxHeight: showFull ? "300px" : "200px",
        overflowY: "auto",
      }}
    >
      <div
        style={{
          padding: "3px 6px",
          background: "#0a0e1a",
          borderBottom: "1px solid #1A2040",
        }}
      >
        <span
          style={{ fontSize: "8px", fontFamily: "monospace", color: "#304060" }}
        >
          BEFORE
        </span>
      </div>
      <Lines lines={oldLines} color="#ef4444" prefix="−" />
      <div
        style={{
          padding: "3px 6px",
          background: "#0a0e1a",
          borderTop: "1px solid #1A2040",
          borderBottom: "1px solid #1A2040",
        }}
      >
        <span
          style={{ fontSize: "8px", fontFamily: "monospace", color: "#304060" }}
        >
          AFTER
        </span>
      </div>
      <Lines lines={newLines} color="#00FF66" prefix="+" />
    </div>
  );
}

// ── Risk badge ────────────────────────────────────────────────────────────────
const RISK_COLOR = {
  low: { bg: "rgba(0,255,102,.08)", border: "#00FF6644", text: "#00FF66" },
  medium: { bg: "rgba(245,158,11,.08)", border: "#f59e0b44", text: "#f59e0b" },
  high: { bg: "rgba(239,68,68,.08)", border: "#ef444444", text: "#ef4444" },
};

function RiskBadge({ risk }: { risk: "low" | "medium" | "high" }) {
  const c = RISK_COLOR[risk];
  return (
    <span
      style={{
        fontSize: "8px",
        fontFamily: "'VT323', monospace",
        padding: "1px 6px",
        borderRadius: "3px",
        background: c.bg,
        border: `1px solid ${c.border}`,
        color: c.text,
        letterSpacing: "1px",
      }}
    >
      {risk.toUpperCase()} RISK
    </span>
  );
}

// ── Single edit card ──────────────────────────────────────────────────────────
function EditCard({
  edit,
  onApprove,
  onReject,
  busy,
}: {
  edit: PendingEdit;
  onApprove: () => void;
  onReject: () => void;
  busy: boolean;
}) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div
      style={{
        background: "#0a0e1a",
        border: "1px solid #1A2040",
        borderRadius: "6px",
        overflow: "hidden",
        marginBottom: "8px",
      }}
    >
      {/* Card header */}
      <button
        type="button"
        style={{
          width: "100%",
          textAlign: "left",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "6px 10px",
          background: "#0d1220",
          borderBottom: expanded ? "1px solid #1A2040" : "none",
          cursor: "pointer",
        }}
        onClick={() => setExpanded((v) => !v)}
      >
        <span
          style={{
            fontSize: "9px",
            fontFamily: "'VT323', monospace",
            color: "#00DDFF",
            letterSpacing: ".5px",
            flex: 1,
            minWidth: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          ✏️ {edit.path}
        </span>
        <RiskBadge risk={edit.risk} />
        <span style={{ fontSize: "9px", color: "#304060" }}>
          {expanded ? "▲" : "▼"}
        </span>
      </button>

      {expanded && (
        <div
          style={{
            padding: "8px 10px",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          }}
        >
          {/* Reason */}
          <div
            style={{
              fontSize: "9px",
              color: "#6875a0",
              fontFamily: "monospace",
              lineHeight: 1.5,
              padding: "4px 8px",
              background: "rgba(79,110,247,.05)",
              borderRadius: "4px",
              borderLeft: "2px solid #4f6ef744",
            }}
          >
            {edit.reason}
          </div>

          {/* Diff */}
          <DiffView oldStr={edit.old_string} newStr={edit.new_string} />

          {/* Action buttons */}
          <div
            style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}
          >
            <button
              type="button"
              onClick={onReject}
              disabled={busy}
              style={{
                fontSize: "9px",
                fontFamily: "'VT323', monospace",
                padding: "3px 12px",
                borderRadius: "4px",
                background: "rgba(239,68,68,.08)",
                border: "1px solid #ef444444",
                color: "#ef4444",
                cursor: busy ? "not-allowed" : "pointer",
                letterSpacing: "1px",
              }}
            >
              REJECT
            </button>
            <button
              type="button"
              onClick={onApprove}
              disabled={busy}
              style={{
                fontSize: "9px",
                fontFamily: "'VT323', monospace",
                padding: "3px 12px",
                borderRadius: "4px",
                background: busy
                  ? "rgba(0,255,102,.04)"
                  : "rgba(0,255,102,.12)",
                border: "1px solid #00FF6655",
                color: "#00FF66",
                cursor: busy ? "not-allowed" : "pointer",
                letterSpacing: "1px",
              }}
            >
              {busy ? "APPLYING…" : "APPROVE →"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── ProposedEditPanel ─────────────────────────────────────────────────────────
export default function ProposedEditPanel() {
  const pendingEdits = useStore((s) => s.pendingEdits);
  const removePending = useStore((s) => s.removePendingEdit);
  const addChangeEntry = useStore((s) => s.addChangeEntry);
  const settings = useStore((s) => s.settings);
  const updateSettings = useStore((s) => s.updateSettings);

  const autoApplyOfficeEdits = settings.autoApplyOfficeEdits;

  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null); // edit ID being applied
  const [visible, setVisible] = useState(false);

  // Hydration guard
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 200);
    return () => clearTimeout(t);
  }, []);

  // Auto-open when a new edit arrives
  useEffect(() => {
    if (pendingEdits.length > 0) setOpen(true);
  }, [pendingEdits.length]);

  function isOfficeEdit(path: string): boolean {
    return (
      path.startsWith("components/home/office/") ||
      path.startsWith("components/home/office") ||
      path.includes("/components/home/office/")
    );
  }

  // Auto-apply (office-only) so HQ Prime customization feels instant.
  useEffect(() => {
    if (!autoApplyOfficeEdits) return;
    if (busy) return;
    if (pendingEdits.length === 0) return;

    const eligible = pendingEdits.find((e) => isOfficeEdit(e.path));
    if (!eligible) return;

    // Fire and forget — busy flag prevents concurrent applies.
    void handleApprove(eligible);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoApplyOfficeEdits, pendingEdits, busy]);

  if (!visible || pendingEdits.length === 0) return null;

  async function handleApprove(edit: PendingEdit) {
    setBusy(edit.id);
    try {
      const r = await apiFetch("/api/tools", {
        method: "POST",
        body: JSON.stringify({
          tool: "patch_project_file",
          input: {
            path: edit.path,
            old_string: edit.old_string,
            new_string: edit.new_string,
          },
        }),
      });
      const d = await r.json();
      const success =
        r.ok &&
        !d.result?.startsWith("Patch failed") &&
        !d.result?.startsWith("Blocked");

      addChangeEntry({
        path: edit.path,
        agent: edit.agentId,
        summary: success
          ? `Applied: ${edit.reason.slice(0, 80)}`
          : `Failed: ${d.result?.slice(0, 80)}`,
        type: success ? "approved" : "patch",
        linesAdded: edit.new_string.split("\n").length,
        linesRemoved: edit.old_string.split("\n").length,
      });
      removePending(edit.id);
    } catch (err) {
      console.error("Apply edit failed:", err);
    } finally {
      setBusy(null);
    }
  }

  function handleReject(edit: PendingEdit) {
    addChangeEntry({
      path: edit.path,
      agent: edit.agentId,
      summary: `Rejected: ${edit.reason.slice(0, 80)}`,
      type: "rejected",
      linesAdded: 0,
      linesRemoved: 0,
    });
    removePending(edit.id);
  }

  return (
    <div
      style={{
        position: "fixed",
        bottom: "12px",
        left: "12px",
        zIndex: 290,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        gap: 0,
        pointerEvents: "none",
      }}
    >
      {/* ── Expanded panel ────────────────────────────────────────────────── */}
      {open && (
        <div
          style={{
            width: "400px",
            maxWidth: "calc(100vw - 24px)",
            background: "#0d1220",
            border: "1px solid #1A2040",
            borderRadius: "10px 10px 0 0",
            borderBottom: "none",
            boxShadow:
              "0 -4px 32px rgba(0,0,0,.6), 0 0 24px rgba(0,255,102,.06)",
            display: "flex",
            flexDirection: "column",
            maxHeight: "70vh",
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
              padding: "7px 12px",
              borderBottom: "1px solid #1A2040",
              background: "#0a0e1a",
              flexShrink: 0,
            }}
          >
            {/* Amber alert dot */}
            <span
              style={{
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                background: "#f59e0b",
                boxShadow: "0 0 6px #f59e0b",
                display: "inline-block",
                flexShrink: 0,
                animation: "pulse-dot 1.5s ease-in-out infinite",
              }}
            />
            <span
              style={{
                fontSize: "11px",
                fontFamily: "'VT323', monospace",
                color: "#f59e0b",
                letterSpacing: "2px",
                flex: 1,
              }}
            >
              PROPOSED EDITS
            </span>
            <span
              style={{
                fontSize: "10px",
                fontFamily: "'VT323', monospace",
                color: "#304060",
              }}
            >
              {pendingEdits.length} pending
            </span>

            <button
              type="button"
              onClick={() =>
                updateSettings({ autoApplyOfficeEdits: !autoApplyOfficeEdits })
              }
              style={{
                marginLeft: "auto",
                fontSize: 7.5,
                fontFamily: "'VT323', monospace",
                padding: "3px 8px",
                borderRadius: 999,
                border: `1px solid ${autoApplyOfficeEdits ? "#00FF6655" : "#1A204033"}`,
                background: autoApplyOfficeEdits
                  ? "rgba(0,255,102,0.10)"
                  : "rgba(26,32,64,0.12)",
                color: autoApplyOfficeEdits ? "#00FF66" : "#7ba7d4",
                cursor: "pointer",
                letterSpacing: "1px",
              }}
              title="When ON, agent edits limited to components/home/office/* auto-apply."
            >
              {autoApplyOfficeEdits ? "AUTO-APPLY: ON" : "AUTO-APPLY: OFF"}
            </button>

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

          {/* Edit cards */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "10px 10px 0",
            }}
          >
            {pendingEdits.map((edit) => (
              <EditCard
                key={edit.id}
                edit={edit}
                onApprove={() => handleApprove(edit)}
                onReject={() => handleReject(edit)}
                busy={busy === edit.id}
              />
            ))}
          </div>

          {/* Safety note */}
          <div
            style={{
              padding: "6px 12px",
              fontSize: "8px",
              color: "#304060",
              fontFamily: "monospace",
              borderTop: "1px solid #1A2040",
              background: "#0a0e1a",
              flexShrink: 0,
            }}
          >
            ⚠ Review all changes before approving. Rejected edits are logged.
          </div>
        </div>
      )}

      {/* ── Collapsed pill ────────────────────────────────────────────────── */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          pointerEvents: "auto",
          display: "flex",
          alignItems: "center",
          gap: "6px",
          padding: "6px 14px",
          background: "#0d1220",
          border: "1px solid #f59e0b55",
          borderTop: open ? "1px solid #1A2040" : "1px solid #f59e0b55",
          borderRadius: open ? "0 0 8px 8px" : "8px",
          cursor: "pointer",
          boxShadow: "0 2px 16px rgba(0,0,0,.4)",
        }}
      >
        <span
          style={{
            width: "5px",
            height: "5px",
            borderRadius: "50%",
            background: "#f59e0b",
            boxShadow: "0 0 5px #f59e0b",
            display: "inline-block",
            animation: "pulse-dot 1.5s ease-in-out infinite",
          }}
        />
        <span
          style={{
            fontSize: "10px",
            fontFamily: "'VT323', monospace",
            color: "#f59e0b",
            letterSpacing: "1.5px",
          }}
        >
          {pendingEdits.length} EDIT{pendingEdits.length !== 1 ? "S" : ""}{" "}
          AWAITING REVIEW
        </span>
        <span style={{ fontSize: "8px", color: "#304060" }}>
          {open ? "▼" : "▲"}
        </span>
      </button>
    </div>
  );
}
