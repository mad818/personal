"use client";

// ── SystemMonitor.tsx ─────────────────────────────────────────────────────────
// Horizontal stat strip shown below the crab mascot in the left panel.
// Displays six live counters pulled from the Zustand store and memoryStore:
//   Signals (news articles loaded), Tickers (crypto prices), World Risk score,
//   Memory entries, active Model name, and which Agent is currently live.
// Colour of each value shifts based on threshold logic (green/amber/red).

import { useState, useEffect } from "react";
import { useStore } from "@/store/useStore";
import { getMemoryStats } from "@/lib/memoryStore";
import { AGENTS } from "./constants";
import type { AgentId } from "./types";

interface SystemMonitorProps {
  activeAgent: AgentId | null;
}

export function SystemMonitor({ activeAgent }: SystemMonitorProps) {
  const articles = useStore((s) => s.articles.length);
  const prices = useStore((s) => Object.keys(s.prices).length);
  const settings = useStore((s) => s.settings);
  const worldRisk = useStore((s) => s.worldRisk);

  // Memory count is async — fetched on mount and refreshed every 10 s
  const [memCount, setMemCount] = useState(0);
  useEffect(() => {
    const load = () =>
      getMemoryStats()
        .then((st) => setMemCount(st.total))
        .catch(() => {});
    load();
    const id = setInterval(load, 10_000);
    return () => clearInterval(id);
  }, []);

  // Truncate model name to just the base name (e.g. "qwen3" from "qwen3:8b")
  const modelLabel = settings.localModel?.split(":")[0] ?? "auto";

  // Each row: [label, displayed value, colour]
  const rows: [string, string | number, string][] = [
    ["📡 Signals", articles, articles > 0 ? "#10b981" : "#ef4444"],
    ["💱 Tickers", prices, prices > 0 ? "#10b981" : "#6875a0"],
    [
      "🌍 Risk",
      worldRisk,
      worldRisk > 4 ? "#ef4444" : worldRisk > 1 ? "#f59e0b" : "#10b981",
    ],
    ["🧠 Memory", memCount, memCount > 0 ? "#4f6ef7" : "#6875a0"],
    ["🤖 Model", modelLabel, "#f59e0b"],
    [
      "🎯 Active",
      activeAgent ? AGENTS[activeAgent].name : "—",
      activeAgent ? AGENTS[activeAgent].color : "#6875a0",
    ],
  ];

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "4px",
        padding: "8px 8px 8px",
        borderRadius: "10px",
        background: "var(--surf3)",
        border: "1px solid var(--border)",
        width: "100%",
      }}
    >
      <span
        style={{
          fontSize: "7px",
          fontWeight: 900,
          color: "var(--text3)",
          letterSpacing: ".16em",
          marginBottom: "4px",
          textAlign: "center",
          lineHeight: 1,
          display: "block",
        }}
      >
        SYS
      </span>
      {rows.map(([label, val, color]) => (
        <div
          key={String(label)}
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span
            style={{ fontSize: "8px", color: "var(--text3)", lineHeight: 1.2 }}
          >
            {label}
          </span>
          <span
            style={{
              fontSize: "8px",
              fontWeight: 700,
              color: color as string,
              fontFamily: "monospace",
              lineHeight: 1.2,
            }}
          >
            {String(val)}
          </span>
        </div>
      ))}
    </div>
  );
}
