"use client";

// ── WelcomeHUD.tsx ────────────────────────────────────────────────────────────
// Shown in the chat pane when no messages exist yet.
// Reads live data from the Zustand store to populate six stat cards:
//   BTC price, Fear & Greed index, World Risk score, CVE count today,
//   total tasks run across all agents, and system status.
// Below the cards is the full agent roster with per-agent task / confidence.

import { useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "@/store/useStore";

export function WelcomeHUD() {
  const [pulse, setPulse] = useState(false);
  const lastSigRef = useRef<string>("");

  // Pull live values from the global store
  const prices = useStore((s) => s.prices);
  const fg = useStore((s) => s.signals?.fg);
  const worldRisk = useStore((s) => s.worldRisk);
  const cves = useStore((s) => s.cves);
  const agentStats = useStore((s) => s.agentStats);

  const btc = prices["bitcoin"];
  const btcPrice = btc?.price;
  const btcChg = btc?.chg;
  const fgValue = fg?.value;
  const totalTasks = Object.values(agentStats).reduce(
    (sum, a) => sum + a.totalTasks,
    0,
  );

  const signature = useMemo(() => {
    const fgVal = fgValue !== undefined ? String(fgValue) : "";
    return [
      btcPrice !== undefined ? String(btcPrice) : "",
      btcChg !== undefined ? String(btcChg) : "",
      fgVal,
      String(worldRisk),
      String(cves.length),
      String(totalTasks),
    ].join("|");
  }, [btcPrice, btcChg, fgValue, worldRisk, cves.length, totalTasks]);

  useEffect(() => {
    const prev = lastSigRef.current;
    lastSigRef.current = signature;
    if (!prev) return;
    if (prev === signature) return;
    setPulse(true);
    const t = window.setTimeout(() => setPulse(false), 650);
    return () => window.clearTimeout(t);
  }, [signature]);

  // ── Six stat card definitions ───────────────────────────────────────────────
  const cards = [
    {
      label: "BTC PRICE",
      value: btc ? `$${(btc.price / 1000).toFixed(1)}K` : "—",
      sub: btc ? `${btc.chg >= 0 ? "+" : ""}${btc.chg.toFixed(2)}%` : undefined,
      color: btc ? (btc.chg >= 0 ? "#00FF66" : "#ef4444") : "#304060",
      icon: "₿",
    },
    {
      label: "FEAR & GREED",
      value: fg ? `${fg.value}` : "—",
      sub: fg ? fg.label.toUpperCase() : undefined,
      color: fg
        ? Number(fg.value) >= 60
          ? "#00FF66"
          : Number(fg.value) >= 40
            ? "#f59e0b"
            : "#ef4444"
        : "#304060",
      icon: "📊",
    },
    {
      label: "WORLD RISK",
      value: worldRisk > 0 ? `${worldRisk}` : "—",
      sub:
        worldRisk > 70
          ? "HIGH"
          : worldRisk > 40
            ? "MEDIUM"
            : worldRisk > 0
              ? "LOW"
              : undefined,
      color:
        worldRisk > 70 ? "#ef4444" : worldRisk > 40 ? "#f59e0b" : "#00FF66",
      icon: "🌍",
    },
    {
      label: "CVE TODAY",
      value: cves.length > 0 ? `${cves.length}` : "—",
      sub:
        cves.length > 10 ? "ELEVATED" : cves.length > 0 ? "NORMAL" : undefined,
      color:
        cves.length > 20 ? "#ef4444" : cves.length > 5 ? "#f59e0b" : "#00DDFF",
      icon: "🔒",
    },
    {
      label: "TASKS RUN",
      value: totalTasks > 0 ? `${totalTasks}` : "0",
      sub:
        Object.keys(agentStats).length > 0
          ? `${Object.keys(agentStats).length} AGENTS`
          : undefined,
      color: "#00DDFF",
      icon: "⚡",
    },
    {
      label: "STATUS",
      value: "READY",
      sub: "ONLINE",
      color: "#00FF66",
      icon: "●",
    },
  ];

  return (
    <div
      style={{
        padding: "18px 18px",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
      }}
    >
      {/* ── Title ── */}
      <div style={{ textAlign: "center" }}>
        <div
          style={{
            fontSize: "16px",
            fontFamily: "'VT323', monospace",
            color: "#00FF66",
            letterSpacing: "4px",
            marginBottom: "4px",
          }}
        >
          ◈ NEXUS PRIME INTEL CORPS ◈
        </div>
        <div
          style={{
            fontSize: "10px",
            fontFamily: "'VT323', monospace",
            color: "#1A2040",
            letterSpacing: "3px",
          }}
        >
          MULTI-AGENT AI COMMAND CENTER
        </div>
      </div>

      {/* ── Live stat cards — 3-column grid ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "var(--space-2)",
        }}
      >
        {cards.map((card, i) => (
          <div
            key={i}
            style={{
              background: "#0a0f1e",
              border: `1px solid ${card.color}22`,
              borderRadius: "var(--radius-sm)",
              padding: "var(--space-2)",
              transition:
                "box-shadow .25s ease, border-color .25s ease, transform .25s ease",
              boxShadow: pulse
                ? `0 0 0 1px ${card.color}55, 0 0 24px rgba(0,221,255,.08)`
                : "none",
              textAlign: "center",
            }}
          >
            {/* Card label */}
            <div
              style={{
                fontSize: "7px",
                fontFamily:
                  "'Inter', system-ui, -apple-system, Segoe UI, sans-serif",
                color: "#304060",
                letterSpacing: "1px",
                marginBottom: "4px",
              }}
            >
              {card.icon} {card.label}
            </div>
            {/* Primary value */}
            <div
              style={{
                fontSize: "16px",
                fontFamily:
                  "'Inter', system-ui, -apple-system, Segoe UI, sans-serif",
                color: card.color,
                letterSpacing: "1px",
              }}
            >
              {card.value}
            </div>
            {/* Sub-label (e.g. "HIGH", "+2.4%") */}
            {card.sub && (
              <div
                style={{
                  fontSize: "7px",
                  fontFamily: "'VT323', monospace",
                  color: card.color + "88",
                  letterSpacing: "1px",
                  marginTop: "2px",
                  lineHeight: "var(--lh-tight)",
                }}
              >
                {card.sub}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
