"use client";

// ── components/ops/GeoHeatmap.tsx ───────────────────────────────────────────
// Geopolitical conflict heatmap. Four impact-level cells.
// Click any cell → slide panel listing matching events.

import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "@/lib/apiFetch";
import { useStore } from "@/store/useStore";

interface ConflictItem {
  title: string;
  url: string;
  impact: "critical" | "high" | "medium" | "low";
  date: string;
}

// ── Impact bucket config ──────────────────────────────────────────────────────
const BUCKETS = [
  { key: "critical", label: "Critical", hue: "#ef4444", icon: "🚨" },
  { key: "high", label: "High", hue: "#f59e0b", icon: "⚠️" },
  { key: "medium", label: "Medium", hue: "#818cf8", icon: "📡" },
  { key: "low", label: "Low", hue: "#10b981", icon: "🟢" },
] as const;

type Impact = "critical" | "high" | "medium" | "low";

// ── Scoring helpers (mirrors ConflictFeed.tsx logic) ─────────────────────────
const CRITICAL_KW = [
  "nuclear",
  "strike",
  "killed",
  "casualties",
  "airstrike",
  "invasion",
  "bomb",
  "missile",
  "attack",
];
const HIGH_KW = [
  "troops",
  "offensive",
  "sanctions",
  "drone",
  "rocket",
  "blockade",
  "coup",
  "war",
  "conflict",
];
const MEDIUM_KW = [
  "tension",
  "threat",
  "diplomacy",
  "protest",
  "dispute",
  "standoff",
  "warning",
  "crisis",
];

function scoreImpact(title: string): Impact {
  const t = title.toLowerCase();
  if (CRITICAL_KW.some((k) => t.includes(k))) return "critical";
  if (HIGH_KW.some((k) => t.includes(k))) return "high";
  if (MEDIUM_KW.some((k) => t.includes(k))) return "medium";
  return "low";
}

function timeAgoShort(dateStr: string): string {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const h = Math.floor(diff / 3_600_000);
  const d = Math.floor(diff / 86_400_000);
  if (h < 1) return "just now";
  if (h < 24) return `${h}h ago`;
  return `${d}d ago`;
}

// ── Slide panel ───────────────────────────────────────────────────────────────
interface PanelProps {
  title: string;
  subtitle: string;
  color: string;
  onClose: () => void;
  children: React.ReactNode;
}

function SlidePanel({ title, subtitle, color, onClose, children }: PanelProps) {
  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(7,8,13,.6)",
          zIndex: 40,
          backdropFilter: "blur(2px)",
          animation: "fadeIn .15s ease",
        }}
      />
      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: "min(500px, 92vw)",
          background: "var(--surf)",
          borderLeft: `1px solid ${color}44`,
          zIndex: 50,
          display: "flex",
          flexDirection: "column",
          boxShadow: "-12px 0 40px rgba(0,0,0,.5)",
          animation: "slideIn .22s cubic-bezier(.4,0,.2,1)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: "16px 18px",
            borderBottom: "1px solid var(--border)",
            flexShrink: 0,
          }}
        >
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontSize: "14px",
                fontWeight: 800,
                color: "var(--text)",
              }}
            >
              {title}
            </div>
            <div style={{ fontSize: "10px", color: "var(--text3)" }}>
              {subtitle}
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close location details"
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: "var(--text3)",
              fontSize: "16px",
              width: "28px",
              height: "28px",
              borderRadius: "6px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ✕
          </button>
        </div>
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "10px 14px",
            display: "flex",
            flexDirection: "column",
            gap: "2px",
          }}
        >
          {children}
        </div>
      </div>
      <style>{`@keyframes fadeIn{from{opacity:0}to{opacity:1}} @keyframes slideIn{from{transform:translateX(100%)}to{transform:translateX(0)}}`}</style>
    </>
  );
}

// ── Event row inside panel ────────────────────────────────────────────────────
function EventRow({ item }: { item: ConflictItem }) {
  const cfg = BUCKETS.find((b) => b.key === item.impact);
  const col = cfg?.hue ?? "#6b7280";
  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        textDecoration: "none",
        padding: "9px 10px",
        borderRadius: "8px",
        display: "block",
        transition: "background .12s",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surf2)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          marginBottom: "3px",
        }}
      >
        <span
          style={{
            fontSize: "9px",
            fontWeight: 800,
            padding: "1px 5px",
            borderRadius: "4px",
            background: `${col}22`,
            color: col,
            textTransform: "uppercase",
          }}
        >
          {item.impact}
        </span>
        <span
          style={{ fontSize: "9px", color: "var(--text3)", marginLeft: "auto" }}
        >
          {timeAgoShort(item.date)}
        </span>
      </div>
      <div
        style={{ fontSize: "11.5px", color: "var(--text)", lineHeight: 1.4 }}
      >
        {item.title.slice(0, 140)}
        {item.title.length > 140 ? "…" : ""}
      </div>
    </a>
  );
}

// ── Heat cell ─────────────────────────────────────────────────────────────────
interface CellProps {
  icon: string;
  label: string;
  count: number;
  maxCount: number;
  hue: string;
  topLine: string;
  timestamp: string;
  onClick: () => void;
}

function HeatCell({
  icon,
  label,
  count,
  maxCount,
  hue,
  topLine,
  timestamp,
  onClick,
}: CellProps) {
  const intensity = maxCount > 0 ? count / maxCount : 0;
  const glow = `color-mix(in srgb, ${hue} ${Math.round((0.06 + intensity * 0.22) * 100)}%, var(--surf2))`;
  const borderCol = `color-mix(in srgb, ${hue} ${Math.round((0.15 + intensity * 0.45) * 100)}%, var(--border))`;
  return (
    <button
      onClick={onClick}
      disabled={count === 0}
      style={{
        background: glow,
        border: `1px solid ${borderCol}`,
        borderRadius: "10px",
        padding: "14px 12px",
        cursor: count === 0 ? "default" : "pointer",
        textAlign: "left",
        display: "flex",
        flexDirection: "column",
        gap: "5px",
        minHeight: "90px",
        position: "relative",
        overflow: "hidden",
        transition: "transform .15s, box-shadow .15s",
        boxShadow:
          intensity > 0.4
            ? `0 0 18px color-mix(in srgb, ${hue} ${Math.round(intensity * 20)}%, transparent)`
            : "none",
      }}
      onMouseEnter={(e) => {
        if (count > 0) {
          const el = e.currentTarget as HTMLButtonElement;
          el.style.transform = "translateY(-2px)";
          el.style.boxShadow = `0 6px 20px color-mix(in srgb, ${hue} 28%, transparent)`;
        }
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLButtonElement;
        el.style.transform = "";
        el.style.boxShadow =
          intensity > 0.4
            ? `0 0 18px color-mix(in srgb, ${hue} ${Math.round(intensity * 20)}%, transparent)`
            : "";
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        <span style={{ fontSize: "14px" }}>{icon}</span>
        <span
          style={{
            fontSize: "11px",
            fontWeight: 800,
            color: "var(--text)",
            textTransform: "uppercase",
            letterSpacing: ".05em",
          }}
        >
          {label}
        </span>
      </div>
      <div
        style={{
          fontSize: "30px",
          fontWeight: 900,
          lineHeight: 1,
          color: count === 0 ? "var(--text3)" : "var(--text)",
        }}
      >
        {count}
        <span
          style={{
            fontSize: "10px",
            color: "var(--text3)",
            marginLeft: "3px",
            fontWeight: 500,
          }}
        >
          events
        </span>
      </div>
      {topLine && (
        <div
          style={{
            fontSize: "9.5px",
            color: "var(--text2)",
            lineHeight: 1.4,
            flex: 1,
          }}
        >
          {topLine.slice(0, 80)}
          {topLine.length > 80 ? "…" : ""}
        </div>
      )}
      {timestamp && (
        <div style={{ fontSize: "8px", color: "var(--text3)" }}>
          {timestamp}
        </div>
      )}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: "10px",
          right: "10px",
          height: "3px",
          borderRadius: "0 0 2px 2px",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${Math.round(intensity * 100)}%`,
            background: hue,
            borderRadius: "2px",
            opacity: 0.7,
            transition: "width .4s",
          }}
        />
      </div>
    </button>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function GeoHeatmap() {
  const gdeltEvents = useStore((s) => s.gdeltEvents);
  const [items, setItems] = useState<ConflictItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [panel, setPanel] = useState<Impact | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await apiFetch("/api/conflict", {
        signal: AbortSignal.timeout(15000),
      });
      const d = await r.json();
      const raw = (d.articles ?? []) as {
        title: string;
        url: string;
        seendate?: string;
      }[];
      const parsed = raw.map((a) => ({
        title: a.title,
        url: a.url,
        impact: scoreImpact(a.title),
        date: a.seendate ?? "",
      }));
      const fallback = (gdeltEvents as Record<string, unknown>[])
        .map((event) => ({
          title: typeof event.title === "string" ? event.title : "",
          url:
            typeof event.url === "string"
              ? event.url
              : typeof event.link === "string"
                ? event.link
                : "",
          impact:
            typeof event.title === "string"
              ? scoreImpact(event.title)
              : "low",
          date:
            typeof event.seendate === "string"
              ? event.seendate
              : typeof event.date === "string"
                ? event.date
                : "",
        }))
        .filter(
          (event): event is ConflictItem => Boolean(event.title && event.url),
        );
      setItems(parsed.length > 0 ? parsed : fallback);
    } catch {
      const fallback = (gdeltEvents as Record<string, unknown>[])
        .map((event) => {
          const title = typeof event.title === "string" ? event.title : "";
          const url =
            typeof event.url === "string"
              ? event.url
              : typeof event.link === "string"
                ? event.link
                : "";
          return {
            title,
            url,
            impact: scoreImpact(title),
            date:
              typeof event.seendate === "string"
                ? event.seendate
                : typeof event.date === "string"
                  ? event.date
                  : "",
          } satisfies ConflictItem;
        })
        .filter((event) => event.title && event.url);
      setItems(fallback);
    } finally {
      setLoading(false);
    }
  }, [gdeltEvents]);

  useEffect(() => {
    load();
  }, [load]);

  // ── Bucket items ─────────────────────────────────────────────────────────
  const buckets: Record<Impact, ConflictItem[]> = {
    critical: [],
    high: [],
    medium: [],
    low: [],
  };
  items.forEach((i) => buckets[i.impact].push(i));
  const max = Math.max(
    1,
    ...BUCKETS.map((b) => buckets[b.key as Impact].length),
  );

  const panelItems = panel ? buckets[panel] : [];
  const panelCfg = panel ? BUCKETS.find((b) => b.key === panel) : null;

  if (!items.length)
    return (
      <div
        style={{
          padding: "40px",
          textAlign: "center",
          color: "var(--text3)",
          fontSize: "12px",
        }}
      >
        <div style={{ fontSize: "24px", marginBottom: "8px" }}>🌍</div>
        {loading
          ? "Loading conflict intelligence…"
          : "No conflict events matched the current free world feeds."}
      </div>
    );

  return (
    <>
      <div
        style={{
          fontSize: "9px",
          fontWeight: 700,
          color: "var(--text3)",
          letterSpacing: ".1em",
          marginBottom: "8px",
        }}
      >
        CONFLICT IMPACT — {items.length} events
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
          gap: "8px",
        }}
      >
        {BUCKETS.map((b) => {
          const list = buckets[b.key as Impact];
          const top = list[0];
          return (
            <HeatCell
              key={b.key}
              icon={b.icon}
              label={b.label}
              count={list.length}
              maxCount={max}
              hue={b.hue}
              topLine={top?.title ?? ""}
              timestamp={top ? timeAgoShort(top.date) : ""}
              onClick={() => setPanel(b.key as Impact)}
            />
          );
        })}
      </div>

      {panel && panelCfg && (
        <SlidePanel
          title={panelCfg.label}
          subtitle={`${panelItems.length} conflict events`}
          color={panelCfg.hue}
          onClose={() => setPanel(null)}
        >
          {panelItems.length === 0 && (
            <div
              style={{
                padding: "40px",
                textAlign: "center",
                color: "var(--text3)",
                fontSize: "12px",
              }}
            >
              No events in this category.
            </div>
          )}
          {panelItems.map((item, i) => (
            <EventRow key={i} item={item} />
          ))}
        </SlidePanel>
      )}
    </>
  );
}
