"use client";

// ── components/intel/SECFilingsFeed.tsx ────────────────────────────────────────
// NEXUS PRIME — SEC Filings Feed: fetches recent filings from /api/sec-filings
// and displays them with color-coding by form type.

import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { apiFetch } from "@/lib/apiFetch";
import { useStore } from "@/store/useStore";
import {
  SurfaceCallout,
  SurfaceEmpty,
  SurfaceSkeletonRows,
} from "@/components/ui/surfacePrimitives";
import FeedStatusPill from "@/components/ui/FeedStatusPill";
import { useInternetAvailability } from "@/hooks/useInternetAvailability";

interface Filing {
  id: string;
  company: string;
  formType: string;
  dateFiled: string;
  description: string;
  url?: string;
  cik?: string;
}

// Form type color coding per spec
const FORM_TYPE_COLOR: Record<string, string> = {
  "10-K": "var(--gold)",
  "10-Q": "var(--blush)",
  "8-K": "var(--rose)",
  "10-K/A": "var(--gold)",
  "10-Q/A": "var(--blush)",
  "8-K/A": "var(--rose)",
  "S-1": "#818cf8",
  "S-11": "#818cf8",
  "DEF 14A": "var(--text3)",
};

function getFormColor(formType: string): string {
  // Exact match first
  if (FORM_TYPE_COLOR[formType]) return FORM_TYPE_COLOR[formType];
  // Prefix match
  if (formType.startsWith("10-K")) return FORM_TYPE_COLOR["10-K"];
  if (formType.startsWith("10-Q")) return FORM_TYPE_COLOR["10-Q"];
  if (formType.startsWith("8-K")) return FORM_TYPE_COLOR["8-K"];
  if (formType.startsWith("S-")) return "#818cf8";
  return "var(--text3)";
}

function fmtDate(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ── Filing row ────────────────────────────────────────────────────────────────
function FilingRow({ filing }: { filing: Filing }) {
  const color = getFormColor(filing.formType);

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2 }}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        padding: "9px 12px",
        background: "var(--surf2)",
        border: "1px solid var(--border)",
        borderRadius: "8px",
        borderLeft: `3px solid ${color}`,
      }}
    >
      {/* Form type badge */}
      <span
        style={{
          fontSize: "9px",
          fontWeight: 800,
          padding: "2px 7px",
          borderRadius: "4px",
          background: `${color}18`,
          color,
          textTransform: "uppercase",
          letterSpacing: "0.4px",
          flexShrink: 0,
          minWidth: "40px",
          textAlign: "center",
          border: `1px solid ${color}44`,
        }}
      >
        {filing.formType}
      </span>

      {/* Company + description */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: "11.5px",
            fontWeight: 700,
            color: "var(--text)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {filing.company}
        </div>
        {filing.description && (
          <div
            style={{
              fontSize: "10px",
              color: "var(--text3)",
              marginTop: "1px",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {filing.description}
          </div>
        )}
      </div>

      {/* Date */}
      <div
        style={{
          fontSize: "10px",
          color: "var(--text3)",
          flexShrink: 0,
          fontFamily: "monospace",
          textAlign: "right",
        }}
      >
        {fmtDate(filing.dateFiled)}
      </div>

      {/* Link if available */}
      {filing.url && (
        <a
          href={filing.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          style={{
            fontSize: "10px",
            color: "var(--text3)",
            flexShrink: 0,
            textDecoration: "none",
          }}
        >
          ↗
        </a>
      )}
    </motion.div>
  );
}

// ── Main SECFilingsFeed export ────────────────────────────────────────────────
export default function SECFilingsFeed() {
  const filings = useStore((s) => (s.secFilings as unknown as Filing[]) ?? []);
  const setSecFilings = useStore((s) => s.setSecFilings);
  const secFilingsStatus = useStore((s) => s.feedStatus.secFilings);
  const updateFeedStatus = useStore((s) => s.updateFeedStatus);
  const { internetReachable } = useInternetAvailability();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "10-K" | "10-Q" | "8-K">("all");
  const [query, setQuery] = useState("10-K");
  const latestQueryRef = useRef(query);

  useEffect(() => {
    latestQueryRef.current = query;
  }, [query]);

  const load = useCallback(
    async (q: string) => {
      setLoading(true);
      setError(null);
      updateFeedStatus("secFilings", { lastAttemptAt: Date.now() });
      try {
        const r = await apiFetch(
          `/api/sec-filings?query=${encodeURIComponent(q)}`,
        );
        const d = await r.json();
        const raw: any[] = d.filings ?? [];
        const mapped: Filing[] = raw.slice(0, 40).map((f: any, i: number) => ({
          id: f.id ?? f.accessionNumber ?? `filing-${i}`,
          company:
            f.companyName ?? f.company ?? f.entityName ?? "Unknown Company",
          formType: f.form ?? f.formType ?? f.type ?? "?",
          dateFiled: f.filed ?? f.dateFiled ?? f.filedAt ?? "",
          description: f.description ?? f.fileDescription ?? f.items ?? "",
          url:
            f.url ??
            (f.accessionNumber
              ? `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&company=${encodeURIComponent(f.companyName ?? "")}&type=${encodeURIComponent(f.form ?? "")}&dateb=&owner=include&count=40`
              : undefined),
          cik: f.cik ?? "",
        }));
        setSecFilings(mapped as unknown as Record<string, unknown>[]);
        updateFeedStatus("secFilings", {
          lastSuccessAt: Date.now(),
          lastError: null,
        });
      } catch {
        updateFeedStatus("secFilings", {
          lastFailureAt: Date.now(),
          lastError: "Unable to fetch SEC filings. Check API connectivity.",
        });
        setError("Unable to fetch SEC filings. Check API connectivity.");
      } finally {
        setLoading(false);
      }
    },
    [setSecFilings, updateFeedStatus],
  );

  // Auto-load on mount
  useEffect(() => {
    if (!internetReachable) return;
    void load(latestQueryRef.current);
  }, [internetReachable, load]);

  const visible =
    filter === "all"
      ? filings
      : filings.filter((f) => f.formType.startsWith(filter));
  const showFilteredEmpty = filings.length > 0 && visible.length === 0 && !loading;

  const FORM_FILTERS: Array<{
    key: "all" | "10-K" | "10-Q" | "8-K";
    label: string;
  }> = [
    { key: "all", label: "All Forms" },
    { key: "10-K", label: "10-K Annual" },
    { key: "10-Q", label: "10-Q Quarterly" },
    { key: "8-K", label: "8-K Current" },
  ];

  return (
    <div>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          marginBottom: "12px",
          flexWrap: "wrap",
        }}
      >
        <span
          style={{
            fontSize: "12px",
            fontWeight: 700,
            color: "var(--text3)",
            textTransform: "uppercase",
          }}
        >
          📄 SEC EDGAR — Filings
        </span>
        <FeedStatusPill
          label="SEC"
          status={secFilingsStatus}
          internetReachable={internetReachable}
        />
        <div
          style={{
            flex: 1,
            display: "flex",
            gap: "6px",
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void load(query)}
            placeholder="Search query (e.g. 10-K, Apple, AI)"
            style={{
              flex: 1,
              maxWidth: "220px",
              background: "var(--surf)",
              border: "1px solid var(--border)",
              borderRadius: "6px",
              padding: "5px 8px",
              color: "var(--text)",
              fontSize: "11px",
              outline: "none",
              fontFamily: "inherit",
            }}
          />
          <button
            onClick={() => void load(query)}
            disabled={loading || !internetReachable}
            style={{
              height: "26px",
              padding: "0 12px",
              borderRadius: "6px",
              background: loading || !internetReachable ? "var(--border2)" : "var(--accent)",
              border: "none",
              color: "#fff",
              fontSize: "11px",
              fontWeight: 600,
              cursor: loading || !internetReachable ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Loading…" : !internetReachable ? "Offline" : "↻ Refresh"}
          </button>
        </div>
      </div>

      {!internetReachable ? (
        <SurfaceCallout
          tone="info"
          compact
          icon="Offline"
          title="Internet offline · showing last-known SEC stream"
          description="Manual SEC refresh is paused until reconnect. Existing local filing results remain available for review."
          style={{ marginBottom: "10px" }}
        />
      ) : null}

      {internetReachable &&
      (secFilingsStatus.lastFailureAt ?? 0) > (secFilingsStatus.lastSuccessAt ?? 0) ? (
        <SurfaceCallout
          tone="warning"
          compact
          icon="Alert"
          title="SEC stream is stale"
          description="The latest refresh failed, so this panel is preserving the last good filing results instead of clearing them."
          style={{ marginBottom: "10px" }}
        />
      ) : null}

      {/* Form type legend */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          marginBottom: "10px",
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        {(["10-K", "10-Q", "8-K"] as const).map((t) => (
          <div
            key={t}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              fontSize: "9px",
              color: "var(--text3)",
            }}
          >
            <div
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "2px",
                background: getFormColor(t),
              }}
            />
            <span>{t}</span>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      {filings.length > 0 && (
        <div
          style={{
            display: "flex",
            gap: "5px",
            flexWrap: "wrap",
            marginBottom: "10px",
          }}
        >
          {FORM_FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              style={{
                height: "24px",
                padding: "0 9px",
                borderRadius: "6px",
                fontSize: "10.5px",
                fontWeight: 700,
                border: "1px solid var(--border2)",
                cursor: "pointer",
                background: filter === f.key ? "var(--accent)" : "transparent",
                color: filter === f.key ? "#fff" : "var(--text3)",
              }}
            >
              {f.label}
              {f.key !== "all" && (
                <span style={{ marginLeft: "4px", opacity: 0.7 }}>
                  (
                  {filings.filter((fl) => fl.formType.startsWith(f.key)).length}
                  )
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <SurfaceCallout
          tone="critical"
          icon="!"
          title="SEC feed unavailable"
          description={error}
          style={{ marginBottom: "10px" }}
        />
      )}

      {/* Empty state */}
      {!filings.length && !loading && !error && (
        <SurfaceEmpty
          icon="📄"
          title="No SEC filings loaded yet"
          description="Hit Refresh to fetch the live EDGAR filing stream for the current query."
        />
      )}

      {/* Loading skeleton */}
      {loading ? <SurfaceSkeletonRows rows={5} height={52} /> : null}

      {showFilteredEmpty ? (
        <SurfaceEmpty
          icon="🔎"
          title="No filings match this filter"
          description="Try another filing type or switch back to All Forms to see the broader stream."
          compact
          style={{ marginBottom: "10px" }}
        />
      ) : null}

      {/* Filings list */}
      {!loading && !showFilteredEmpty && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "6px",
            maxHeight: "480px",
            overflowY: "auto",
            scrollbarWidth: "thin",
            scrollbarColor: "var(--border) transparent",
          }}
        >
          <AnimatePresence initial={false}>
            {visible.map((filing) => (
              <FilingRow key={filing.id} filing={filing} />
            ))}
          </AnimatePresence>
        </div>
      )}

      {filings.length > 0 && (
        <div
          style={{
            marginTop: "8px",
            fontSize: "10px",
            color: "var(--text3)",
            textAlign: "right",
          }}
        >
          {visible.length} filing{visible.length !== 1 ? "s" : ""} shown
        </div>
      )}
    </div>
  );
}
