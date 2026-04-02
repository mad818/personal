"use client";

// ── components/signals/TopicHeatmap.tsx ──────────────────────────────────────
// Articles displayed as a heatmap grid.
// Each cell = one topic. Color intensity = article volume.
// Click a cell → slide-in panel with compact article list for that topic.

import { useState, useCallback } from "react";
import { useStore } from "@/store/useStore";
import { timeAgo } from "@/lib/helpers";
import type { Article } from "@/store/useStore";

// ── Bias scoring (shared with NewsFeed) ───────────────────────────────────────
const BULLISH_KW = [
  "surge",
  "rally",
  "gain",
  "soar",
  "jump",
  "rise",
  "high",
  "bull",
  "breakout",
  "record",
  "adoption",
  "approve",
  "launch",
  "partnership",
  "upgrade",
];
const BEARISH_KW = [
  "crash",
  "drop",
  "fall",
  "plunge",
  "decline",
  "sell",
  "bear",
  "loss",
  "low",
  "risk",
  "hack",
  "exploit",
  "ban",
  "fine",
  "lawsuit",
  "bankruptcy",
  "attack",
];

function biasScore(text: string): number {
  const t = text.toLowerCase();
  const bull = BULLISH_KW.filter((k) => t.includes(k)).length;
  const bear = BEARISH_KW.filter((k) => t.includes(k)).length;
  if (bull === 0 && bear === 0) return 0;
  return Math.max(-1, Math.min(1, (bull - bear) / Math.max(bull + bear, 1)));
}

// ── Topic config ──────────────────────────────────────────────────────────────
interface TopicConfig {
  key: string;
  label: string;
  icon: string;
  // hue for the heat glow — each topic has a distinct colour accent
  hue: string;
}

const TOPICS: TopicConfig[] = [
  { key: "crypto", label: "Crypto", icon: "₿", hue: "#f59e0b" },
  { key: "markets", label: "Markets", icon: "📈", hue: "#10b981" },
  { key: "cyber", label: "Cyber", icon: "🔒", hue: "#ef4444" },
  { key: "tech", label: "Tech", icon: "🔬", hue: "#4f6ef7" },
  { key: "world", label: "World", icon: "🌍", hue: "#7c3aed" },
  { key: "other", label: "Other", icon: "📰", hue: "#6875a0" },
];

// ── Bias dot ──────────────────────────────────────────────────────────────────
function BiasDot({ score }: { score: number }) {
  const color =
    score > 0.15 ? "#10b981" : score < -0.15 ? "#ef4444" : "#6875a0";
  const label = score > 0.15 ? "Bull" : score < -0.15 ? "Bear" : "Neutral";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "3px",
        fontSize: "9px",
        fontWeight: 700,
        color,
      }}
    >
      <span
        style={{
          width: "6px",
          height: "6px",
          borderRadius: "50%",
          background: color,
          display: "inline-block",
          boxShadow: `0 0 4px ${color}88`,
        }}
      />
      {label}
    </span>
  );
}

// ── Slide panel (right side) ──────────────────────────────────────────────────
interface SlidePanelProps {
  topic: TopicConfig | null;
  articles: Article[];
  savedIds: Set<string>;
  toggleSaveArticle: (a: Article) => void;
  onClose: () => void;
}

function SlidePanel({
  topic,
  articles,
  savedIds,
  toggleSaveArticle,
  onClose,
}: SlidePanelProps) {
  const open = topic !== null;

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          onClick={onClose}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(7,8,13,0.6)",
            zIndex: 40,
            backdropFilter: "blur(2px)",
            animation: "fadeIn .15s ease",
          }}
        />
      )}

      {/* Panel */}
      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: "min(480px, 92vw)",
          background: "var(--surf)",
          borderLeft: "1px solid var(--border2)",
          zIndex: 50,
          pointerEvents: open ? "auto" : "none",
          transform: open ? "translateX(0)" : "translateX(100%)",
          transition: "transform .25s cubic-bezier(.4,0,.2,1)",
          display: "flex",
          flexDirection: "column",
          boxShadow: open ? "-12px 0 40px rgba(0,0,0,.5)" : "none",
        }}
      >
        {/* Header */}
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
          <span style={{ fontSize: "18px" }}>{topic?.icon}</span>
          <div>
            <div
              style={{
                fontSize: "14px",
                fontWeight: 800,
                color: "var(--text)",
              }}
            >
              {topic?.label}
            </div>
            <div style={{ fontSize: "10px", color: "var(--text3)" }}>
              {articles.length} article{articles.length !== 1 ? "s" : ""}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              marginLeft: "auto",
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
              transition: "background .12s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background =
                "var(--surf2)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background =
                "transparent";
            }}
          >
            ✕
          </button>
        </div>

        {/* Article list */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "10px 14px",
            display: "flex",
            flexDirection: "column",
            gap: "1px",
          }}
        >
          {articles.map((a) => {
            const isSaved = savedIds.has(a.id);
            const score = biasScore(a.title + " " + (a.desc ?? ""));
            return (
              <div
                key={a.id}
                style={{
                  padding: "10px 10px",
                  borderRadius: "8px",
                  background: "transparent",
                  transition: "background .12s",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLDivElement).style.background =
                    "var(--surf2)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.background =
                    "transparent";
                }}
              >
                {/* Top meta row */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    marginBottom: "5px",
                  }}
                >
                  {a.src && (
                    <span
                      style={{
                        fontSize: "9px",
                        fontWeight: 700,
                        color: "var(--text2)",
                      }}
                    >
                      {a.src}
                    </span>
                  )}
                  <BiasDot score={score} />
                  <span
                    style={{
                      marginLeft: "auto",
                      fontSize: "9px",
                      color: "var(--text3)",
                    }}
                  >
                    {timeAgo(a.date)}
                  </span>
                  <button
                    onClick={() => toggleSaveArticle(a)}
                    title={isSaved ? "Remove from Vault" : "Save to Vault"}
                    style={{
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      fontSize: "12px",
                      padding: "0 2px",
                      lineHeight: 1,
                      color: isSaved ? "var(--accent)" : "var(--text3)",
                    }}
                  >
                    {isSaved ? "🔖" : "☆"}
                  </button>
                </div>

                {/* Headline */}
                <a
                  href={a.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ textDecoration: "none" }}
                >
                  <div
                    style={{
                      fontSize: "12.5px",
                      fontWeight: 600,
                      color: "var(--text)",
                      lineHeight: 1.45,
                    }}
                  >
                    {a.title}
                  </div>
                </a>
              </div>
            );
          })}

          {!articles.length && (
            <div
              style={{
                padding: "40px",
                textAlign: "center",
                color: "var(--text3)",
                fontSize: "12px",
              }}
            >
              No articles in this category yet.
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ── Heatmap cell ──────────────────────────────────────────────────────────────
interface CellProps {
  topic: TopicConfig;
  articles: Article[];
  maxCount: number;
  onClick: () => void;
}

function HeatCell({ topic, articles, maxCount, onClick }: CellProps) {
  const count = articles.length;
  const intensity = maxCount > 0 ? count / maxCount : 0; // 0–1

  // Aggregate bias for the cell
  const avgBias =
    count === 0
      ? 0
      : articles.reduce(
          (sum, a) => sum + biasScore(a.title + " " + (a.desc ?? "")),
          0,
        ) / count;

  const biasColor =
    avgBias > 0.1 ? "#10b981" : avgBias < -0.1 ? "#ef4444" : "#6875a0";
  const biasLabel =
    avgBias > 0.1 ? "Bullish" : avgBias < -0.1 ? "Bearish" : "Neutral";

  // Freshest article age label
  const freshest = articles.length
    ? articles.reduce((a, b) => (new Date(a.date) > new Date(b.date) ? a : b))
    : null;

  // Heat glow strength based on intensity
  const glowOpacity = 0.08 + intensity * 0.3;
  const borderOpacity = 0.15 + intensity * 0.5;

  return (
    <button
      onClick={onClick}
      disabled={count === 0}
      style={{
        position: "relative",
        background: `color-mix(in srgb, ${topic.hue} ${Math.round(glowOpacity * 100)}%, var(--surf2))`,
        border: `1px solid color-mix(in srgb, ${topic.hue} ${Math.round(borderOpacity * 100)}%, var(--border))`,
        borderRadius: "12px",
        padding: "18px 16px",
        cursor: count === 0 ? "default" : "pointer",
        textAlign: "left",
        transition: "transform .15s, box-shadow .15s, background .15s",
        minHeight: "110px",
        display: "flex",
        flexDirection: "column",
        gap: "6px",
        boxShadow:
          intensity > 0.4
            ? `0 0 20px color-mix(in srgb, ${topic.hue} ${Math.round(intensity * 25)}%, transparent)`
            : "none",
      }}
      onMouseEnter={(e) => {
        if (count === 0) return;
        const el = e.currentTarget as HTMLButtonElement;
        el.style.transform = "translateY(-2px) scale(1.01)";
        el.style.boxShadow = `0 6px 24px color-mix(in srgb, ${topic.hue} 30%, transparent)`;
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLButtonElement;
        el.style.transform = "";
        el.style.boxShadow =
          intensity > 0.4
            ? `0 0 20px color-mix(in srgb, ${topic.hue} ${Math.round(intensity * 25)}%, transparent)`
            : "none";
      }}
    >
      {/* Icon + label */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <span style={{ fontSize: "18px", lineHeight: 1 }}>{topic.icon}</span>
        <span
          style={{
            fontSize: "12px",
            fontWeight: 800,
            color: "var(--text)",
            textTransform: "uppercase",
            letterSpacing: ".05em",
          }}
        >
          {topic.label}
        </span>
      </div>

      {/* Article count — big number */}
      <div
        style={{
          fontSize: "32px",
          fontWeight: 900,
          lineHeight: 1,
          color: count === 0 ? "var(--text3)" : "var(--text)",
        }}
      >
        {count}
        <span
          style={{
            fontSize: "11px",
            fontWeight: 500,
            color: "var(--text3)",
            marginLeft: "4px",
          }}
        >
          {count === 1 ? "article" : "articles"}
        </span>
      </div>

      {/* Bias + freshness row */}
      {count > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginTop: "auto",
          }}
        >
          <span
            style={{
              fontSize: "9px",
              fontWeight: 700,
              color: biasColor,
              display: "flex",
              alignItems: "center",
              gap: "3px",
            }}
          >
            <span
              style={{
                width: "5px",
                height: "5px",
                borderRadius: "50%",
                background: biasColor,
                display: "inline-block",
              }}
            />
            {biasLabel}
          </span>
          {freshest && (
            <span
              style={{
                fontSize: "9px",
                color: "var(--text3)",
                marginLeft: "auto",
              }}
            >
              Latest {timeAgo(freshest.date)}
            </span>
          )}
        </div>
      )}

      {/* Heat intensity bar at bottom */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: "12px",
          right: "12px",
          height: "3px",
          borderRadius: "0 0 2px 2px",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${Math.round(intensity * 100)}%`,
            background: topic.hue,
            borderRadius: "2px",
            transition: "width .4s ease",
            opacity: 0.7,
          }}
        />
      </div>
    </button>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function TopicHeatmap() {
  const articles = useStore((s) => s.articles);
  const gdeltEvents = useStore((s) => s.gdeltEvents);
  const savedArticles = useStore((s) => s.savedArticles);
  const toggleSaveArticle = useStore((s) => s.toggleSaveArticle);

  const [activeTopic, setActiveTopic] = useState<TopicConfig | null>(null);

  const closePanel = useCallback(() => setActiveTopic(null), []);

  const savedIds = new Set(savedArticles.map((a) => a.id));

  const fallbackArticles: Article[] = (gdeltEvents as Record<string, unknown>[])
    .reduce<Article[]>((acc, event, index) => {
      const title = typeof event.title === "string" ? event.title : "";
      const link =
        typeof event.url === "string"
          ? event.url
          : typeof event.link === "string"
            ? event.link
            : "";
      if (!title || !link) return acc;
      const lower = title.toLowerCase();
      let cat: Article["cat"] = "other";
      if (/bitcoin|crypto|ethereum|blockchain|token|solana/.test(lower)) cat = "crypto";
      else if (/hack|cyber|breach|malware|ransom|cve|vulnerability/.test(lower)) cat = "cyber";
      else if (/market|fed|earnings|inflation|economy|stock|trade/.test(lower)) cat = "markets";
      else if (/software|ai|chip|apple|microsoft|google|openai|tech/.test(lower)) cat = "tech";
      else if (/war|diplomacy|sanctions|world|crisis|conflict/.test(lower)) cat = "world";
      acc.push({
        id: `gdelt-topic-${index}`,
        title,
        desc: "",
        link,
        date:
          typeof event.seendate === "string"
            ? event.seendate
            : typeof event.date === "string"
              ? event.date
              : "",
        src: "GDELT",
        cat,
      } satisfies Article);
      return acc;
    }, []);

  // Bucket articles by topic
  const byTopic: Record<string, Article[]> = {};
  for (const t of TOPICS) byTopic[t.key] = [];
  for (const a of articles.length > 0 ? articles : fallbackArticles) {
    const cat = a.cat ?? "other";
    if (byTopic[cat]) byTopic[cat].push(a);
    else byTopic["other"].push(a);
  }

  const maxCount = Math.max(1, ...TOPICS.map((t) => byTopic[t.key].length));

  const panelArticles = activeTopic ? (byTopic[activeTopic.key] ?? []) : [];
  const displayCount = articles.length > 0 ? articles.length : fallbackArticles.length;

  if (!articles.length && !fallbackArticles.length)
    return (
      <div
        style={{
          padding: "60px",
          textAlign: "center",
          color: "var(--text3)",
          fontSize: "13px",
        }}
      >
        <div style={{ fontSize: "32px", marginBottom: "12px" }}>📡</div>
        Fetching live intel…
      </div>
    );

  return (
    <>
      {/* ── Heatmap grid ──────────────────────────────────────────────────── */}
      <div>
        {/* Summary row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginBottom: "16px",
          }}
        >
          <span style={{ fontSize: "11px", color: "var(--text3)" }}>
            {displayCount} articles across{" "}
            {TOPICS.filter((t) => byTopic[t.key].length > 0).length} topics
          </span>
          <span
            style={{
              fontSize: "10px",
              color: "var(--text3)",
              marginLeft: "auto",
            }}
          >
            Click any cell to read
          </span>
        </div>

        {/* Grid — 3 columns on wide, 2 on narrow */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
            gap: "10px",
          }}
        >
          {TOPICS.map((topic) => (
            <HeatCell
              key={topic.key}
              topic={topic}
              articles={byTopic[topic.key]}
              maxCount={maxCount}
              onClick={() => setActiveTopic(topic)}
            />
          ))}
        </div>

        {/* Legend */}
        <div
          style={{
            marginTop: "16px",
            padding: "10px 14px",
            background: "var(--surf2)",
            borderRadius: "8px",
            border: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            gap: "14px",
            flexWrap: "wrap",
          }}
        >
          <span
            style={{ fontSize: "10px", color: "var(--text3)", fontWeight: 700 }}
          >
            HEAT
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <div
              style={{
                width: "60px",
                height: "4px",
                borderRadius: "2px",
                background: "linear-gradient(to right, var(--surf3), #f59e0b)",
              }}
            />
            <span style={{ fontSize: "9px", color: "var(--text3)" }}>
              Low → High volume
            </span>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginLeft: "auto",
            }}
          >
            <span
              style={{ fontSize: "9px", color: "#10b981", fontWeight: 700 }}
            >
              ● Bullish
            </span>
            <span
              style={{ fontSize: "9px", color: "#6875a0", fontWeight: 700 }}
            >
              ● Neutral
            </span>
            <span
              style={{ fontSize: "9px", color: "#ef4444", fontWeight: 700 }}
            >
              ● Bearish
            </span>
          </div>
        </div>
      </div>

      {/* ── Slide panel ───────────────────────────────────────────────────── */}
      <SlidePanel
        topic={activeTopic}
        articles={panelArticles}
        savedIds={savedIds}
        toggleSaveArticle={toggleSaveArticle}
        onClose={closePanel}
      />

      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
      `}</style>
    </>
  );
}
