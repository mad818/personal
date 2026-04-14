"use client";

import type { ReactNode } from "react";

type CompactOperatorNoteTone = "info" | "caution" | "positive" | "neutral";

interface CompactOperatorNoteProps {
  label?: string;
  summary: string;
  detail?: string;
  tone?: CompactOperatorNoteTone;
  defaultOpen?: boolean;
  children?: ReactNode;
}

const TONE_STYLES: Record<
  CompactOperatorNoteTone,
  { border: string; background: string; accent: string; text: string }
> = {
  info: {
    border: "rgba(0,221,255,.2)",
    background: "rgba(0,221,255,.05)",
    accent: "#00DDFF",
    text: "#cfeeff",
  },
  caution: {
    border: "rgba(245,158,11,.28)",
    background: "rgba(245,158,11,.08)",
    accent: "#fbbf24",
    text: "#fef3c7",
  },
  positive: {
    border: "rgba(16,185,129,.24)",
    background: "rgba(16,185,129,.08)",
    accent: "#86efac",
    text: "#dcfce7",
  },
  neutral: {
    border: "rgba(26,32,64,.9)",
    background: "#0a1120",
    accent: "#9fb7ff",
    text: "#cbd5e1",
  },
};

export default function CompactOperatorNote({
  label,
  summary,
  detail,
  tone = "neutral",
  defaultOpen = false,
  children,
}: CompactOperatorNoteProps) {
  const style = TONE_STYLES[tone];
  const hasExpandableContent = Boolean(detail || children);

  if (!hasExpandableContent) {
    return (
      <div
        style={{
          display: "grid",
          gap: 4,
          padding: "8px 10px",
          borderRadius: 8,
          border: `1px solid ${style.border}`,
          background: style.background,
        }}
      >
        {label ? (
          <span
            style={{
              color: style.accent,
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: ".08em",
            }}
          >
            {label}
          </span>
        ) : null}
        <span style={{ color: style.text, fontSize: 10, lineHeight: 1.45 }}>
          {summary}
        </span>
      </div>
    );
  }

  return (
    <details
      open={defaultOpen}
      style={{
        borderRadius: 8,
        border: `1px solid ${style.border}`,
        background: style.background,
      }}
    >
      <summary
        style={{
          listStyle: "none",
          cursor: "pointer",
          padding: "8px 10px",
          display: "grid",
          gap: 4,
        }}
      >
        {label ? (
          <span
            style={{
              color: style.accent,
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: ".08em",
            }}
          >
            {label}
          </span>
        ) : null}
        <span
          style={{
            color: style.text,
            fontSize: 10,
            lineHeight: 1.45,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span style={{ flex: 1 }}>{summary}</span>
          <span
            style={{
              color: style.accent,
              fontSize: 9,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: ".08em",
            }}
          >
            expand
          </span>
        </span>
      </summary>
      <div
        style={{
          display: "grid",
          gap: 8,
          padding: "0 10px 10px",
        }}
      >
        {detail ? (
          <div style={{ color: "#cbd5e1", fontSize: 10, lineHeight: 1.5 }}>
            {detail}
          </div>
        ) : null}
        {children}
      </div>
    </details>
  );
}
