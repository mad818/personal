"use client";

import { useCallback } from "react";
import { useStore, PMChecklistItem } from "@/store/useStore";

const CATEGORY_LABELS: Record<PMChecklistItem["category"], string> = {
  daily: "📋 Daily",
  "pre-push": "🚀 Pre-Push",
  "post-incident": "🔥 Post-Incident",
};
const CATEGORIES: PMChecklistItem["category"][] = [
  "daily",
  "pre-push",
  "post-incident",
];

export function PMChecklist() {
  const checklist = useStore((s) => s.pmChecklist);
  const toggleItem = useStore((s) => s.togglePMChecklistItem);
  const reset = useStore((s) => s.resetPMChecklist);

  const copyDiagnostics = useCallback(() => {
    const ts = new Date().toISOString().slice(0, 16).replace("T", " ");
    const lines = [`# PM Checklist — ${ts}`, ""];
    CATEGORIES.forEach((cat) => {
      const items = checklist.filter((i) => i.category === cat);
      if (!items.length) return;
      lines.push(`## ${CATEGORY_LABELS[cat]}`);
      items.forEach((i) => {
        lines.push(`- [${i.checked ? "x" : " "}] ${i.label}`);
      });
      lines.push("");
    });
    navigator.clipboard.writeText(lines.join("\n")).catch(() => {});
  }, [checklist]);

  const totalChecked = checklist.filter((i) => i.checked).length;
  const total = checklist.length;

  return (
    <div style={{ marginTop: "18px" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          marginBottom: "10px",
        }}
      >
        <span
          style={{
            fontSize: "10px",
            fontWeight: 700,
            color: "var(--text3)",
            textTransform: "uppercase",
            letterSpacing: ".5px",
          }}
        >
          PM Checklist
        </span>
        <span
          style={{
            fontSize: "10px",
            color: totalChecked === total ? "var(--fhi)" : "var(--text3)",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {totalChecked}/{total}
        </span>
        <div style={{ flex: 1 }} />
        <button
          type="button"
          onClick={copyDiagnostics}
          title="Copy checklist state as markdown"
          style={{
            height: "22px",
            padding: "0 8px",
            borderRadius: "5px",
            fontSize: "10px",
            fontWeight: 600,
            cursor: "pointer",
            border: "1px solid var(--border2)",
            background: "transparent",
            color: "var(--text2)",
          }}
        >
          Copy
        </button>
        <button
          type="button"
          onClick={reset}
          title="Uncheck all items"
          style={{
            height: "22px",
            padding: "0 8px",
            borderRadius: "5px",
            fontSize: "10px",
            fontWeight: 600,
            cursor: "pointer",
            border: "1px solid var(--border2)",
            background: "transparent",
            color: "var(--text3)",
          }}
        >
          Reset
        </button>
      </div>

      {/* Progress bar */}
      <div
        style={{
          height: "3px",
          borderRadius: "2px",
          background: "var(--border)",
          marginBottom: "12px",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            borderRadius: "2px",
            width: `${Math.round((totalChecked / total) * 100)}%`,
            background: totalChecked === total ? "var(--fhi)" : "var(--accent)",
            transition: "width .2s ease",
          }}
        />
      </div>

      {/* Items grouped by category */}
      {categories.map((cat) => {
        const items = checklist.filter((i) => i.category === cat);
        if (!items.length) return null;
        const catChecked = items.filter((i) => i.checked).length;
        return (
          <div key={cat} style={{ marginBottom: "12px" }}>
            <div
              style={{
                fontSize: "10px",
                fontWeight: 700,
                color: "var(--text3)",
                marginBottom: "5px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              {CATEGORY_LABELS[cat]}
              <span
                style={{
                  fontSize: "9px",
                  color:
                    catChecked === items.length ? "var(--fhi)" : "var(--text3)",
                }}
              >
                {catChecked}/{items.length}
              </span>
            </div>
            {items.map((item) => (
              <label
                key={item.id}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "8px",
                  marginBottom: "5px",
                  cursor: "pointer",
                  fontSize: "11px",
                  lineHeight: "1.4",
                  color: item.checked ? "var(--text3)" : "var(--text2)",
                  textDecoration: item.checked ? "line-through" : "none",
                }}
              >
                <input
                  type="checkbox"
                  checked={item.checked}
                  onChange={() => toggleItem(item.id)}
                  style={{
                    marginTop: "2px",
                    accentColor: "var(--accent)",
                    flexShrink: 0,
                  }}
                />
                {item.label}
              </label>
            ))}
          </div>
        );
      })}
    </div>
  );
}
