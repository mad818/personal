"use client";

// ── MemoryPanel.tsx ───────────────────────────────────────────────────────────
// Slide-in panel for browsing, searching, and deleting agent memories
// stored in IndexedDB via lib/memoryStore.ts.
//
// Access: toggle button in AgentOffice zone header.

import { useState, useEffect, useCallback } from "react";
import {
  type Memory,
  type MemoryType,
  getMemoryStats,
  forgetMemory,
  pruneOldMemories,
  exportMemories,
} from "@/lib/memoryStore";
import ClientStyleMount from "@/components/ui/ClientStyleMount";

// ── Read all memories (not exported from memoryStore — inline here) ─────────
async function listAllMemories(): Promise<Memory[]> {
  const { default: m } = await import("@/lib/memoryStore");
  // Use recallByType('fact') etc — union all types
  const types: MemoryType[] = ["fact", "preference", "episode", "skill_note"];
  const results = await Promise.all(
    types.map((t) => m.recallByType?.(t, 200) ?? Promise.resolve([])),
  );
  return results.flat().sort((a, b) => b.timestamp - a.timestamp);
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(ms: number): string {
  const s = Math.floor((Date.now() - ms) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

const TYPE_COLOR: Record<MemoryType, string> = {
  fact: "#00DDFF",
  preference: "#00FF66",
  episode: "#f59e0b",
  skill_note: "#7c3aed",
};
const MEMORY_PANEL_ANIMATIONS_CSS = `
  @keyframes slideInRight {
    from { transform: translateX(100%); opacity: 0 }
    to   { transform: translateX(0);    opacity: 1 }
  }
`;

// ── MemoryCard ────────────────────────────────────────────────────────────────

function MemoryCard({
  mem,
  onDelete,
}: {
  mem: Memory;
  onDelete: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const color = TYPE_COLOR[mem.type];

  return (
    <div
      style={{
        background: "#0a0f1e",
        border: `1px solid ${color}22`,
        borderRadius: "6px",
        overflow: "hidden",
        transition: "border .15s",
      }}
    >
      {/* Header row */}
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%",
          textAlign: "left",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "6px 10px",
          background: "none",
          border: "none",
          cursor: "pointer",
        }}
      >
        {/* Type badge */}
        <span
          style={{
            fontSize: "7px",
            fontFamily: "'VT323', monospace",
            padding: "1px 5px",
            borderRadius: "3px",
            background: `${color}14`,
            border: `1px solid ${color}44`,
            color,
            letterSpacing: "1px",
            flexShrink: 0,
          }}
        >
          {mem.type.toUpperCase()}
        </span>

        {/* Content preview */}
        <span
          style={{
            flex: 1,
            fontSize: "11px",
            color: "#8892b0",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {mem.content}
        </span>

        {/* Relevance bar */}
        <div
          style={{
            width: "32px",
            height: "3px",
            background: "#1A2040",
            borderRadius: "2px",
            overflow: "hidden",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${Math.round(mem.relevanceScore * 100)}%`,
              background: color,
              borderRadius: "2px",
            }}
          />
        </div>

        {/* Time */}
        <span
          style={{
            fontSize: "8px",
            fontFamily: "'VT323', monospace",
            color: "#304060",
            flexShrink: 0,
            letterSpacing: "0.5px",
          }}
        >
          {timeAgo(mem.timestamp)}
        </span>

        {/* Chevron */}
        <span style={{ color: "#304060", fontSize: "9px", flexShrink: 0 }}>
          {open ? "▲" : "▼"}
        </span>
      </button>

      {/* Expanded body */}
      {open && (
        <div
          style={{
            padding: "6px 10px 8px",
            borderTop: `1px solid ${color}15`,
          }}
        >
          <p
            style={{
              margin: "0 0 8px",
              fontSize: "12px",
              color: "#ccd6f6",
              lineHeight: 1.6,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}
          >
            {mem.content}
          </p>

          {/* Tags */}
          {mem.tags.length > 0 && (
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "4px",
                marginBottom: "8px",
              }}
            >
              {mem.tags.map((tag) => (
                <span
                  key={tag}
                  style={{
                    fontSize: "8px",
                    fontFamily: "'VT323', monospace",
                    padding: "1px 5px",
                    borderRadius: "3px",
                    background: "#0f1825",
                    border: "1px solid #1A2040",
                    color: "#4a5568",
                    letterSpacing: "0.5px",
                  }}
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Meta row */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontSize: "8px",
              fontFamily: "'VT323', monospace",
              color: "#304060",
            }}
          >
            <span>
              ACCESSED {mem.accessCount}× · SCORE{" "}
              {Math.round(mem.relevanceScore * 100)}%
              {mem.source && ` · SRC: ${mem.source.toUpperCase()}`}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(mem.id);
              }}
              style={{
                background: "rgba(239,68,68,0.08)",
                border: "1px solid rgba(239,68,68,0.3)",
                borderRadius: "4px",
                padding: "1px 7px",
                color: "#ef4444",
                cursor: "pointer",
                fontSize: "8px",
                fontFamily: "'VT323', monospace",
                letterSpacing: "1px",
              }}
            >
              FORGET
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface MemoryPanelProps {
  open: boolean;
  onClose: () => void;
}

export default function MemoryPanel({ open, onClose }: MemoryPanelProps) {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<MemoryType | "all">("all");
  const [stats, setStats] = useState<Record<string, number>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [mems, s] = await Promise.all([
        listAllMemories(),
        getMemoryStats(),
      ]);
      setMemories(mems);
      setStats(s);
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  const handleDelete = useCallback(async (id: string) => {
    await forgetMemory(id);
    setMemories((prev) => prev.filter((m) => m.id !== id));
    setStats((prev) => ({ ...prev, total: (prev.total ?? 1) - 1 }));
  }, []);

  const handlePrune = useCallback(async () => {
    const pruned = await pruneOldMemories(90);
    if (pruned > 0) {
      await load();
    }
  }, [load]);

  const handleExport = useCallback(async () => {
    const json = await exportMemories();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `nexus-memories-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  // Filter memories
  const filtered = memories.filter((m) => {
    const matchesType = typeFilter === "all" || m.type === typeFilter;
    const matchesQuery =
      !query ||
      m.content.toLowerCase().includes(query.toLowerCase()) ||
      m.tags.some((t) => t.includes(query.toLowerCase()));
    return matchesType && matchesQuery;
  });

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(7,8,13,0.6)",
          zIndex: 400,
          backdropFilter: "blur(2px)",
        }}
      />

      {/* Panel */}
      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: "min(480px, 95vw)",
          background: "#0a0f1e",
          borderLeft: "1px solid #1A2040",
          zIndex: 401,
          display: "flex",
          flexDirection: "column",
          animation: "slideInRight .2s ease",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "10px 14px",
            background: "#080d18",
            borderBottom: "1px solid #1A2040",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            flexShrink: 0,
          }}
        >
          <span
            style={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              background: "#00FF66",
              boxShadow: "0 0 8px #00FF66",
              display: "inline-block",
              animation: "pulse-dot 2s ease-in-out infinite",
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontSize: "13px",
              fontFamily: "'VT323', monospace",
              color: "#00FF66",
              letterSpacing: "2px",
              flex: 1,
            }}
          >
            AGENT MEMORY CORE
          </span>

          {/* Stats pills */}
          <span
            style={{
              fontSize: "8px",
              fontFamily: "'VT323', monospace",
              color: "#304060",
              letterSpacing: "1px",
            }}
          >
            {stats.total ?? 0} ENTRIES
          </span>

          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "1px solid #1A2040",
              borderRadius: "4px",
              color: "#6875a0",
              cursor: "pointer",
              padding: "2px 7px",
              fontSize: "10px",
            }}
          >
            ✕
          </button>
        </div>

        {/* Type counts strip */}
        <div
          style={{
            display: "flex",
            background: "#080d18",
            borderBottom: "1px solid #1A2040",
            flexShrink: 0,
          }}
        >
          {(
            ["all", "fact", "preference", "episode", "skill_note"] as const
          ).map((t) => {
            const color = t === "all" ? "#6875a0" : TYPE_COLOR[t];
            const count = t === "all" ? (stats.total ?? 0) : (stats[t] ?? 0);
            const active = typeFilter === t;
            return (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                style={{
                  flex: 1,
                  padding: "5px 4px",
                  background: active ? `${color}12` : "none",
                  border: "none",
                  borderBottom: active
                    ? `2px solid ${color}`
                    : "2px solid transparent",
                  cursor: "pointer",
                  fontSize: "7px",
                  fontFamily: "'VT323', monospace",
                  color: active ? color : "#304060",
                  letterSpacing: "0.5px",
                  transition: "all .15s",
                }}
              >
                {t === "all" ? "ALL" : t.replace("_", " ").toUpperCase()}
                <br />
                <span
                  style={{ fontSize: "9px", color: active ? color : "#1A2040" }}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div style={{ padding: "8px 12px", flexShrink: 0 }}>
          <input
            aria-label="Search memories"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search memories…"
            style={{
              width: "100%",
              background: "#080d18",
              border: "1px solid #1A2040",
              borderRadius: "6px",
              padding: "6px 10px",
              fontSize: "12px",
              color: "#ccd6f6",
              outline: "none",
              fontFamily: "inherit",
              boxSizing: "border-box",
            }}
          />
        </div>

        {/* Memory list */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "0 12px 8px",
            display: "flex",
            flexDirection: "column",
            gap: "5px",
          }}
        >
          {loading ? (
            <div
              style={{
                textAlign: "center",
                padding: "40px",
                fontSize: "11px",
                fontFamily: "'VT323', monospace",
                color: "#304060",
                letterSpacing: "2px",
                animation: "pulse-dot 1s ease-in-out infinite",
              }}
            >
              LOADING MEMORY CORE…
            </div>
          ) : filtered.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "40px",
                fontSize: "11px",
                color: "#304060",
              }}
            >
              {query
                ? "No memories match that query."
                : "No memories stored yet."}
            </div>
          ) : (
            filtered.map((m) => (
              <MemoryCard key={m.id} mem={m} onDelete={handleDelete} />
            ))
          )}
        </div>

        {/* Footer actions */}
        <div
          style={{
            padding: "8px 12px",
            borderTop: "1px solid #1A2040",
            background: "#080d18",
            display: "flex",
            gap: "6px",
            flexShrink: 0,
          }}
        >
          <button
            onClick={() => void load()}
            style={{
              flex: 1,
              padding: "5px",
              background: "rgba(0,221,255,0.06)",
              border: "1px solid #00DDFF33",
              borderRadius: "5px",
              fontSize: "8px",
              fontFamily: "'VT323', monospace",
              color: "#00DDFF",
              cursor: "pointer",
              letterSpacing: "1px",
            }}
          >
            ↺ REFRESH
          </button>
          <button
            onClick={() => void handlePrune()}
            style={{
              flex: 1,
              padding: "5px",
              background: "rgba(245,158,11,0.06)",
              border: "1px solid #f59e0b33",
              borderRadius: "5px",
              fontSize: "8px",
              fontFamily: "'VT323', monospace",
              color: "#f59e0b",
              cursor: "pointer",
              letterSpacing: "1px",
            }}
          >
            ✂ PRUNE OLD
          </button>
          <button
            onClick={() => void handleExport()}
            style={{
              flex: 1,
              padding: "5px",
              background: "rgba(0,255,102,0.06)",
              border: "1px solid #00FF6633",
              borderRadius: "5px",
              fontSize: "8px",
              fontFamily: "'VT323', monospace",
              color: "#00FF66",
              cursor: "pointer",
              letterSpacing: "1px",
            }}
          >
            ↓ EXPORT
          </button>
        </div>
      </div>

      <ClientStyleMount
        id="memory-panel-animations"
        cssText={MEMORY_PANEL_ANIMATIONS_CSS}
      />
    </>
  );
}
