"use client";

import { useState, useCallback } from "react";
import { FEYNMAN_DIRECT_TOOLS } from "@/lib/feynmanOfficeTools";

export default function FeynmanToolQuickRef() {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyHint = useCallback((tool: (typeof FEYNMAN_DIRECT_TOOLS)[number]) => {
    try {
      void navigator.clipboard.writeText(tool.commandHint).then(() => {
        setCopiedId(tool.id);
        window.setTimeout(() => setCopiedId(null), 1800);
      });
    } catch {
      // silent — clipboard may be unavailable
    }
  }, []);

  return (
    <div
      style={{
        borderRadius: "12px",
        border: "1px solid var(--border)",
        background: "var(--surf2)",
        padding: "12px",
      }}
    >
      <div
        style={{
          fontSize: "10px",
          fontWeight: 700,
          color: "var(--accent)",
          textTransform: "uppercase",
          letterSpacing: ".6px",
          marginBottom: "10px",
        }}
      >
        Feynman direct tools
      </div>

      <div style={{ display: "grid", gap: "6px" }}>
        {FEYNMAN_DIRECT_TOOLS.map((tool) => {
          const copied = copiedId === tool.id;
          return (
            <div
              key={tool.id}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "8px",
                padding: "7px 8px",
                borderRadius: "8px",
                background: "var(--surf3)",
                border: "1px solid var(--border)",
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: "11px",
                    fontWeight: 700,
                    color: "var(--text)",
                    marginBottom: "2px",
                  }}
                >
                  {tool.label}
                </div>
                <div
                  style={{
                    fontSize: "10px",
                    color: "var(--text3)",
                    fontFamily: "monospace",
                    wordBreak: "break-all",
                    marginBottom: "3px",
                  }}
                >
                  {tool.commandHint}
                </div>
                <div
                  style={{
                    fontSize: "9px",
                    color: "var(--text3)",
                    lineHeight: 1.4,
                  }}
                >
                  {tool.approvalNote}
                </div>
              </div>
              <button
                type="button"
                onClick={() => copyHint(tool)}
                title="Copy command hint"
                style={{
                  flexShrink: 0,
                  padding: "3px 8px",
                  borderRadius: "6px",
                  border: "1px solid var(--border)",
                  background: copied ? "var(--accent)" : "var(--surf2)",
                  color: copied ? "#fff" : "var(--text3)",
                  fontSize: "9px",
                  fontWeight: 700,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  transition: "background 0.15s, color 0.15s",
                }}
              >
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
