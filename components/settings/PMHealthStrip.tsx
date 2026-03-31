"use client";

import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "@/lib/apiFetch";

// ── Types ──────────────────────────────────────────────────────────────────────

interface StatusRollup {
  grade: string;
  stale: boolean;
  ageMinutes: number | null;
  degradedReasons: string[];
}

interface StatusPayload {
  status: string;
  readiness?: {
    evalPolicy?: {
      rollup?: StatusRollup;
    };
  };
}

type ChipColor = "green" | "yellow" | "red" | "muted";

// ── Helpers ────────────────────────────────────────────────────────────────────

function gradeColor(grade: string, stale: boolean): ChipColor {
  if (stale || grade === "STALE" || grade === "F") return "yellow";
  if (grade === "A" || grade === "B") return "green";
  if (grade === "C") return "yellow";
  return "red";
}

function chipStyle(color: ChipColor): React.CSSProperties {
  const map: Record<ChipColor, { bg: string; border: string; text: string }> = {
    green: {
      bg: "rgba(16,185,129,.12)",
      border: "rgba(16,185,129,.35)",
      text: "var(--fhi)",
    },
    yellow: {
      bg: "rgba(245,158,11,.12)",
      border: "rgba(245,158,11,.35)",
      text: "var(--fmd)",
    },
    red: {
      bg: "rgba(239,68,68,.12)",
      border: "rgba(239,68,68,.35)",
      text: "var(--flo)",
    },
    muted: {
      bg: "var(--surf3)",
      border: "var(--border)",
      text: "var(--text3)",
    },
  };
  const c = map[color];
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    padding: "4px 9px",
    borderRadius: 6,
    border: `1px solid ${c.border}`,
    background: c.bg,
    fontSize: 11,
    fontWeight: 700,
    color: c.text,
    letterSpacing: ".3px",
    whiteSpace: "nowrap" as const,
  };
}

// ── Component ──────────────────────────────────────────────────────────────────

export function PMHealthStrip() {
  const [data, setData] = useState<StatusPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const r = await apiFetch("/api/status");
      if (!r.ok) {
        setError(true);
      } else {
        const json = (await r.json()) as StatusPayload;
        setData(json);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch_();
  }, [fetch_]);

  // ── Derived values ───────────────────────────────────────────────────────────
  const rollup = data?.readiness?.evalPolicy?.rollup;
  const grade = rollup?.grade ?? "?";
  const stale = rollup?.stale ?? false;
  const reasons = rollup?.degradedReasons ?? [];
  const ageMin = rollup?.ageMinutes ?? null;

  const statusOk = !error && data?.status === "ok";
  const statusColor: ChipColor = error ? "muted" : statusOk ? "green" : "red";
  const statusLabel = error ? "unavailable" : statusOk ? "ok" : "degraded";

  const evalColor = error ? "muted" : gradeColor(grade, stale);
  const evalLabel = error ? "—" : stale ? `${grade} · stale` : grade;

  const ageLabel = ageMin !== null ? `${ageMin}m ago` : null;

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        marginTop: 14,
        padding: "10px 12px",
        border: "1px solid var(--border)",
        borderRadius: 8,
        background: "var(--surf2)",
      }}
    >
      {/* Section header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 10,
        }}
      >
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: "var(--accent)",
            textTransform: "uppercase",
            letterSpacing: "1px",
          }}
        >
          🩺 PM Health Strip
        </span>

        <button
          onClick={fetch_}
          disabled={loading}
          title="Refresh status"
          style={{
            background: "transparent",
            border: "none",
            cursor: loading ? "not-allowed" : "pointer",
            color: "var(--text3)",
            fontSize: 13,
            lineHeight: 1,
            padding: "0 2px",
            opacity: loading ? 0.4 : 1,
          }}
        >
          ↺
        </button>
      </div>

      {/* Chips row */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 6,
          alignItems: "center",
        }}
      >
        {/* STATUS chip */}
        <span style={chipStyle(statusColor)}>
          <span style={{ fontSize: 8 }}>●</span>
          STATUS&nbsp;{loading ? "…" : statusLabel}
        </span>

        {/* EVAL chip */}
        <span style={chipStyle(evalColor)}>
          EVAL&nbsp;{loading ? "…" : evalLabel}
          {ageLabel && !loading && (
            <span style={{ fontWeight: 400, opacity: 0.7, fontSize: 10 }}>
              ({ageLabel})
            </span>
          )}
        </span>

        {/* NEXT UP — static link to GitHub */}
        <a
          href="https://github.com/mad818/personal/blob/main/tasks/todo.md"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            ...chipStyle("muted"),
            textDecoration: "none",
            color: "var(--accent)",
            border: "1px solid rgba(79,110,247,.3)",
            background: "rgba(79,110,247,.08)",
          }}
        >
          NEXT UP →
        </a>
      </div>

      {/* Degraded reasons */}
      {reasons.length > 0 && !error && (
        <div
          style={{
            marginTop: 8,
            fontSize: 10,
            color: "var(--fmd)",
            lineHeight: 1.6,
          }}
        >
          {reasons.map((r) => (
            <div key={r} style={{ display: "flex", gap: 5 }}>
              <span style={{ opacity: 0.6 }}>⚠</span>
              <span>{r}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
