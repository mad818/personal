"use client";

import { useState, useMemo, useCallback } from "react";
import { useStore } from "@/store/useStore";
import { timeAgo } from "@/lib/helpers";

// ── Bias scoring ──────────────────────────────────────────────────────────────
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

function BiasBar({ score }: { score: number }) {
  const pct = Math.round(((score + 1) / 2) * 100);
  const dotColor =
    score > 0.1 ? "#10b981" : score < -0.1 ? "#ef4444" : "#6875a0";
  const label = score > 0.1 ? "Bullish" : score < -0.1 ? "Bearish" : "Neutral";
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "6px",
        marginTop: "8px",
        minWidth: "120px",
      }}
    >
      <span
        style={{
          fontSize: "9px",
          color: "#10b981",
          fontWeight: 700,
          flexShrink: 0,
        }}
      >
        B
      </span>
      <div
        style={{
          position: "relative",
          flex: 1,
          height: "4px",
          borderRadius: "2px",
          background: "var(--surf3)",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "2px",
            background: "linear-gradient(to right, #10b981, #6875a0, #ef4444)",
            opacity: 0.35,
          }}
        />
        <div
          style={{
            position: "absolute",
            top: "50%",
            transform: "translate(-50%, -50%)",
            left: `${pct}%`,
            width: "8px",
            height: "8px",
            borderRadius: "50%",
            background: dotColor,
            border: "2px solid var(--surf)",
            boxShadow: `0 0 5px ${dotColor}88`,
          }}
        />
      </div>
      <span
        style={{
          fontSize: "9px",
          color: "#ef4444",
          fontWeight: 700,
          flexShrink: 0,
        }}
      >
        S
      </span>
      <span
        style={{
          fontSize: "9px",
          color: dotColor,
          fontWeight: 700,
          flexShrink: 0,
          minWidth: "38px",
        }}
      >
        {label}
      </span>
    </div>
  );
}

// ── Tag chip ──────────────────────────────────────────────────────────────────
function TagChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        background: active ? "var(--accent)" : "var(--surf3)",
        border: `1px solid ${active ? "var(--accent)" : "var(--border2)"}`,
        borderRadius: "var(--radius-pill)",
        color: active ? "#fff" : "var(--text2)",
        fontSize: "10px",
        fontWeight: 700,
        padding: "2px 9px",
        cursor: "pointer",
        transition:
          "background var(--t), border-color var(--t), color var(--t)",
        whiteSpace: "nowrap",
        flexShrink: 0,
      }}
    >
      {label}
    </button>
  );
}

// ── Inline tag editor ─────────────────────────────────────────────────────────
function TagEditor({ articleId, tags }: { articleId: string; tags: string[] }) {
  const updateArticleTags = useStore((s) => s.updateArticleTags);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(tags.join(", "));

  const commit = useCallback(() => {
    const next = draft
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);
    updateArticleTags(articleId, next);
    setEditing(false);
  }, [draft, articleId, updateArticleTags]);

  const handleKey = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") commit();
      if (e.key === "Escape") setEditing(false);
    },
    [commit],
  );

  if (editing) {
    return (
      <div
        style={{
          display: "flex",
          gap: "4px",
          alignItems: "center",
          marginTop: "8px",
        }}
      >
        <input
          aria-label="Article tags"
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKey}
          onBlur={commit}
          placeholder="tag1, tag2, tag3"
          style={{
            flex: 1,
            background: "var(--surf)",
            border: "1px solid var(--accent)",
            borderRadius: "6px",
            color: "var(--text)",
            fontSize: "11px",
            padding: "3px 8px",
            outline: "none",
            fontFamily: "monospace",
          }}
        />
        <button
          onClick={commit}
          style={{
            background: "var(--accent)",
            border: "none",
            borderRadius: "5px",
            color: "#fff",
            fontSize: "10px",
            fontWeight: 700,
            padding: "3px 8px",
            cursor: "pointer",
          }}
        >
          Save
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "4px",
        alignItems: "center",
        marginTop: "8px",
      }}
    >
      {tags.map((t) => (
        <span
          key={t}
          style={{
            background: "var(--surf3)",
            border: "1px solid var(--border2)",
            borderRadius: "var(--radius-pill)",
            color: "var(--text2)",
            fontSize: "10px",
            fontWeight: 600,
            padding: "2px 8px",
          }}
        >
          {t}
        </span>
      ))}
      <button
        onClick={() => {
          setDraft(tags.join(", "));
          setEditing(true);
        }}
        title="Edit tags"
        style={{
          background: "transparent",
          border: "1px dashed var(--border2)",
          borderRadius: "var(--radius-pill)",
          color: "var(--text3)",
          fontSize: "10px",
          padding: "2px 7px",
          cursor: "pointer",
          transition: "border-color var(--t), color var(--t)",
        }}
      >
        {tags.length ? "✏️" : "＋ tag"}
      </button>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function SavedArticles() {
  const savedArticles = useStore((s) => s.savedArticles);
  const toggleSaveArticle = useStore((s) => s.toggleSaveArticle);

  const [query, setQuery] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<
    "newest" | "oldest" | "mostTagged"
  >("newest");

  // Collect all unique tags across saved articles
  const allTags = useMemo<string[]>(() => {
    const seen = new Set<string>();
    for (const a of savedArticles) {
      for (const t of a.tags ?? []) seen.add(t);
    }
    return Array.from(seen).sort();
  }, [savedArticles]);

  // Filter + sort pipeline
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    let result = savedArticles.filter((a) => {
      // Text search — title, desc, tags
      if (q) {
        const haystack = [a.title, a.desc ?? "", ...(a.tags ?? [])]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      // Tag filter
      if (activeTag) {
        if (!(a.tags ?? []).includes(activeTag)) return false;
      }
      return true;
    });

    switch (sortOrder) {
      case "oldest":
        result = [...result].sort((a, b) => a.date.localeCompare(b.date));
        break;
      case "mostTagged":
        result = [...result].sort(
          (a, b) => (b.tags?.length ?? 0) - (a.tags?.length ?? 0),
        );
        break;
      default:
        result = [...result].sort((a, b) => b.date.localeCompare(a.date));
    }
    return result;
  }, [savedArticles, query, activeTag, sortOrder]);

  if (!savedArticles.length)
    return (
      <div
        style={{
          padding: "60px",
          textAlign: "center",
          color: "var(--text3)",
          fontSize: "13px",
        }}
      >
        <div style={{ fontSize: "32px", marginBottom: "10px" }}>🗂</div>
        No saved articles yet. Tap ☆ on any article in the SIGNALS tab to save
        it here.
      </div>
    );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      {/* ── Controls row ── */}
      <div
        style={{
          display: "flex",
          gap: "6px",
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        {/* Search */}
        <input
          aria-label="Search saved articles"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search title, description, tags…"
          style={{
            flex: "1 1 180px",
            minWidth: "140px",
            background: "var(--surf2)",
            border: "1px solid var(--border2)",
            borderRadius: "7px",
            color: "var(--text)",
            fontSize: "12px",
            padding: "6px 10px",
            outline: "none",
            transition: "border-color var(--t)",
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = "var(--accent)";
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = "var(--border2)";
          }}
        />

        {/* Sort */}
        <select
          aria-label="Saved article sort order"
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value as typeof sortOrder)}
          style={{
            background: "var(--surf2)",
            border: "1px solid var(--border2)",
            borderRadius: "7px",
            color: "var(--text2)",
            fontSize: "11px",
            padding: "6px 8px",
            cursor: "pointer",
            outline: "none",
            transition: "border-color var(--t)",
          }}
        >
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="mostTagged">Most tagged</option>
        </select>

        {/* Count badge */}
        <span
          style={{
            fontSize: "10px",
            color: "var(--text3)",
            whiteSpace: "nowrap",
            background: "var(--surf3)",
            padding: "4px 8px",
            borderRadius: "20px",
          }}
        >
          {visible.length} / {savedArticles.length}
        </span>
      </div>

      {/* ── Tag filter strip ── */}
      {allTags.length > 0 && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "4px",
            alignItems: "center",
          }}
        >
          <span
            style={{
              fontSize: "10px",
              color: "var(--text3)",
              marginRight: "2px",
              flexShrink: 0,
            }}
          >
            Filter:
          </span>
          <TagChip
            label="All"
            active={activeTag === null}
            onClick={() => setActiveTag(null)}
          />
          {allTags.map((t) => (
            <TagChip
              key={t}
              label={t}
              active={activeTag === t}
              onClick={() => setActiveTag(activeTag === t ? null : t)}
            />
          ))}
        </div>
      )}

      {/* ── Empty state for filtered view ── */}
      {visible.length === 0 && (
        <div
          style={{
            padding: "40px",
            textAlign: "center",
            color: "var(--text3)",
            fontSize: "12px",
          }}
        >
          No articles match your search.
        </div>
      )}

      {/* ── Article cards ── */}
      {visible.map((a) => (
        <div
          key={a.id}
          style={{
            background: "var(--surf2)",
            border: "1px solid var(--accent)",
            borderRadius: "10px",
            padding: "12px 14px",
            transition: "border-color var(--t)",
          }}
        >
          {/* Header row */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "5px",
              flexWrap: "wrap",
            }}
          >
            {a.src && (
              <span
                style={{
                  fontSize: "10px",
                  color: "var(--text3)",
                  fontWeight: 700,
                }}
              >
                {a.src}
              </span>
            )}
            {a.cat && (
              <span
                style={{
                  fontSize: "9px",
                  fontWeight: 700,
                  color: "var(--accent2)",
                  background: "rgba(212,149,106,.1)",
                  borderRadius: "4px",
                  padding: "1px 5px",
                }}
              >
                {a.cat.toUpperCase()}
              </span>
            )}
            <span
              style={{
                fontSize: "10px",
                color: "var(--text3)",
                marginLeft: "auto",
              }}
            >
              {timeAgo(a.date)}
            </span>
            <button
              onClick={() => toggleSaveArticle(a)}
              title="Remove from Vault"
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                fontSize: "13px",
                padding: "0 2px",
                color: "var(--accent)",
                transition: "opacity var(--t)",
              }}
            >
              🔖
            </button>
          </div>

          {/* Title + desc */}
          <a
            href={a.link}
            target="_blank"
            rel="noopener noreferrer"
            style={{ textDecoration: "none" }}
          >
            <div
              style={{
                fontSize: "13px",
                fontWeight: 600,
                color: "var(--text)",
                lineHeight: 1.4,
              }}
            >
              {a.title}
            </div>
            {a.desc && (
              <div
                style={{
                  fontSize: "11.5px",
                  color: "var(--text2)",
                  marginTop: "4px",
                  lineHeight: 1.5,
                }}
              >
                {a.desc.slice(0, 180)}
                {a.desc.length > 180 ? "…" : ""}
              </div>
            )}
          </a>

          <BiasBar score={biasScore(a.title + " " + (a.desc ?? ""))} />

          {/* Tag editor */}
          <TagEditor articleId={a.id} tags={a.tags ?? []} />
        </div>
      ))}
    </div>
  );
}
