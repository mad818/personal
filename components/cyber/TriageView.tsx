// ── components/cyber/TriageView ────────────────────────────────────────────────
// Triage-first view: correlates CVE/OTX/CISA data into a single prioritized
// action list so operators see the highest-risk items first without switching tabs.

"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useStore } from "@/store/useStore";
import { timeAgo } from "@/lib/helpers";
import type { CVE } from "@/hooks/useCVEs";
import type { OTXPulse } from "@/store/useStore";
import { apiFetch } from "@/lib/apiFetch";

// ── KEV entry (CISA) ──────────────────────────────────────────────────────────
interface KEVEntry {
  cveID: string;
  vendorProject: string;
  product: string;
  vulnerabilityName: string;
  dateAdded: string;
  shortDescription: string;
  requiredAction: string;
  dueDate: string;
  knownRansomwareCampaignUse: string;
}

// ── Unified triage item ──────────────────────────────────────────────────────
type TriageSource = "CVE" | "OTX" | "CISA";
type TriagePriority = "critical" | "high" | "medium";

interface TriageItem {
  id: string;
  source: TriageSource;
  priority: TriagePriority;
  title: string;
  detail: string;
  score: number; // 0–100, used for sort
  age?: string; // human time
  url?: string;
  badge?: string; // extra context label
}

// ── Color helpers ──────────────────────────────────────────────────────────────
const PRIORITY_COLOR: Record<TriagePriority, string> = {
  critical: "#ef4444",
  high: "#f59e0b",
  medium: "#818cf8",
};

const SOURCE_COLOR: Record<TriageSource, string> = {
  CVE: "#00DDFF",
  OTX: "#ef4444",
  CISA: "#f59e0b",
};

function daysUntilDue(dueDate: string): number | null {
  if (!dueDate) return null;
  const d = new Date(dueDate).getTime();
  if (isNaN(d)) return null;
  return Math.ceil((d - Date.now()) / 86_400_000);
}

// ── Map raw CVE list to triage items ──────────────────────────────────────────
function cvesToTriageItems(cves: CVE[]): TriageItem[] {
  return cves
    .filter((c) => c.severity === "CRITICAL" || c.severity === "HIGH")
    .map((c) => ({
      id: c.id,
      source: "CVE" as TriageSource,
      priority: (c.severity === "CRITICAL"
        ? "critical"
        : "high") as TriagePriority,
      title: c.id,
      detail: c.description || "No description.",
      score: c.score
        ? (c.score / 10) * 100
        : c.severity === "CRITICAL"
          ? 90
          : 70,
      age: c.published ? timeAgo(c.published) : undefined,
      url: c.url,
      badge: c.score ? `CVSS ${c.score.toFixed(1)}` : c.severity,
    }));
}

// ── Map OTX pulses to triage items ───────────────────────────────────────────
function otxToTriageItems(pulses: OTXPulse[]): TriageItem[] {
  return pulses
    .filter((p) => p.tlp === "red" || p.tlp === "amber")
    .map((p) => ({
      id: `otx-${p.id}`,
      source: "OTX" as TriageSource,
      priority: (p.tlp === "red" ? "critical" : "high") as TriagePriority,
      title: p.name,
      detail:
        p.description ||
        (p.tags.length
          ? `Tags: ${p.tags.slice(0, 4).join(", ")}`
          : "No description."),
      score: p.tlp === "red" ? 88 : 72,
      age: p.modified ? timeAgo(p.modified) : undefined,
      url: `https://otx.alienvault.com/pulse/${p.id}`,
      badge: `${p.indicator_count} IOCs${p.adversary ? ` · ${p.adversary}` : ""}`,
    }));
}

// ── Map CISA KEV entries to triage items ─────────────────────────────────────
function kevToTriageItems(kevs: KEVEntry[]): TriageItem[] {
  return kevs.map((k) => {
    const days = daysUntilDue(k.dueDate);
    const overdue = days !== null && days < 0;
    const urgent = days !== null && days <= 7;
    return {
      id: `kev-${k.cveID}`,
      source: "CISA" as TriageSource,
      priority: (overdue
        ? "critical"
        : urgent
          ? "high"
          : "medium") as TriagePriority,
      title: `${k.cveID} — ${k.product}`,
      detail: k.shortDescription || k.vulnerabilityName || "",
      score: overdue ? 95 : urgent ? 80 : 60,
      badge:
        days !== null
          ? days < 0
            ? `${Math.abs(days)}d OVERDUE`
            : days === 0
              ? "Due today"
              : `Due in ${days}d`
          : "",
      url: `https://www.cisa.gov/known-exploited-vulnerabilities-catalog`,
    };
  });
}

// ── Single triage card ────────────────────────────────────────────────────────
function TriageCard({ item }: { item: TriageItem }) {
  const pCol = PRIORITY_COLOR[item.priority];
  const sCol = SOURCE_COLOR[item.source];
  return (
    <a
      href={item.url ?? "#"}
      target={item.url ? "_blank" : undefined}
      rel="noopener noreferrer"
      style={{
        display: "block",
        textDecoration: "none",
        background: "var(--surf2)",
        borderRadius: "10px",
        border: `1px solid var(--border)`,
        borderLeft: `3px solid ${pCol}`,
        padding: "11px 14px",
        transition: "border-color var(--t)",
      }}
    >
      {/* Row 1: source + priority + badge */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "7px",
          marginBottom: "6px",
          flexWrap: "wrap",
        }}
      >
        <span
          style={{
            fontSize: "9.5px",
            fontWeight: 800,
            padding: "1px 7px",
            borderRadius: "6px",
            background: `${sCol}22`,
            color: sCol,
            letterSpacing: ".5px",
          }}
        >
          {item.source}
        </span>
        <span
          style={{
            fontSize: "9.5px",
            fontWeight: 800,
            padding: "1px 7px",
            borderRadius: "6px",
            background: `${pCol}18`,
            color: pCol,
            textTransform: "uppercase",
            letterSpacing: ".4px",
          }}
        >
          {item.priority}
        </span>
        {item.badge && (
          <span
            style={{
              fontSize: "9.5px",
              fontWeight: 700,
              color: "var(--text3)",
              padding: "1px 7px",
              borderRadius: "6px",
              background: "var(--surf3)",
            }}
          >
            {item.badge}
          </span>
        )}
        {item.age && (
          <span
            style={{
              fontSize: "9.5px",
              color: "var(--text3)",
              marginLeft: "auto",
            }}
          >
            {item.age}
          </span>
        )}
      </div>

      {/* Title */}
      <div
        style={{
          fontSize: "12.5px",
          fontWeight: 700,
          color: "var(--text)",
          marginBottom: "4px",
          fontFamily: item.source === "CVE" ? "monospace" : "inherit",
        }}
      >
        {item.title}
      </div>

      {/* Detail */}
      <div
        style={{
          fontSize: "11px",
          color: "var(--text2)",
          lineHeight: 1.45,
          overflow: "hidden",
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical" as const,
        }}
      >
        {item.detail}
      </div>
    </a>
  );
}

// ── Summary strip ─────────────────────────────────────────────────────────────
function TriageSummary({ items }: { items: TriageItem[] }) {
  const critical = items.filter((i) => i.priority === "critical").length;
  const high = items.filter((i) => i.priority === "high").length;
  const cveCount = items.filter((i) => i.source === "CVE").length;
  const otxCount = items.filter((i) => i.source === "OTX").length;
  const cisaCount = items.filter((i) => i.source === "CISA").length;

  return (
    <div
      style={{
        display: "flex",
        gap: "8px",
        flexWrap: "wrap",
        marginBottom: "16px",
      }}
    >
      {[
        { label: "CRITICAL", value: critical, color: "#ef4444" },
        { label: "HIGH", value: high, color: "#f59e0b" },
        { label: "CVEs", value: cveCount, color: "#00DDFF" },
        { label: "OTX", value: otxCount, color: "#ef4444" },
        { label: "CISA KEV", value: cisaCount, color: "#f59e0b" },
      ].map(({ label, value, color }) => (
        <div
          key={label}
          style={{
            background: "var(--surf2)",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            padding: "6px 12px",
            textAlign: "center",
            minWidth: "64px",
          }}
        >
          <div
            style={{
              fontSize: "9px",
              fontWeight: 700,
              color: "var(--text3)",
              letterSpacing: ".08em",
              textTransform: "uppercase",
              marginBottom: "2px",
            }}
          >
            {label}
          </div>
          <div style={{ fontSize: "18px", fontWeight: 900, color }}>
            {value}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
type PriorityFilter = "all" | "critical" | "high";
type SourceFilter = "all" | "CVE" | "OTX" | "CISA";

export default function TriageView() {
  const cves = useStore((s) => s.cves) as CVE[];
  const cvesLoaded = useStore((s) => s.cvesLoaded);
  const otxPulses = useStore((s) => s.otxPulses);
  const [kevEntries, setKevEntries] = useState<KEVEntry[]>([]);
  const [kevLoading, setKevLoading] = useState(false);
  const [kevLoaded, setKevLoaded] = useState(false);

  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("all");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");

  // Fetch CISA KEV once on mount (light endpoint, tiny payload)
  const loadKev = useCallback(async () => {
    if (kevLoading || kevEntries.length > 0) return;
    setKevLoading(true);
    try {
      const r = await apiFetch("/api/cisa-kev");
      const d = await r.json();
      const catalog = (d.vulnerabilities ?? []) as KEVEntry[];
      // Surface overdue + closing-soon items first
      const sorted = catalog.slice().sort((a, b) => {
        const da = daysUntilDue(a.dueDate) ?? 9999;
        const db = daysUntilDue(b.dueDate) ?? 9999;
        return da - db;
      });
      setKevEntries(sorted.slice(0, 30));
    } catch {
      // silent fail
    } finally {
      setKevLoaded(true);
      setKevLoading(false);
    }
  }, [kevLoading, kevEntries.length]);

  useEffect(() => {
    loadKev();
  }, [loadKev]);

  const allItems = useMemo<TriageItem[]>(() => {
    const items = [
      ...cvesToTriageItems(cves),
      ...otxToTriageItems(otxPulses),
      ...kevToTriageItems(kevEntries),
    ];
    return items.sort((a, b) => b.score - a.score);
  }, [cves, otxPulses, kevEntries]);

  const visible = useMemo(() => {
    return allItems.filter((item) => {
      if (priorityFilter !== "all" && item.priority !== priorityFilter)
        return false;
      if (sourceFilter !== "all" && item.source !== sourceFilter) return false;
      return true;
    });
  }, [allItems, priorityFilter, sourceFilter]);

  const hasData =
    cves.length > 0 || otxPulses.length > 0 || kevEntries.length > 0;

  if (!hasData) {
    const isStillLoading = !cvesLoaded || kevLoading || !kevLoaded;
    return (
      <div
        style={{
          padding: "60px",
          textAlign: "center",
          color: "var(--text3)",
          fontSize: "13px",
        }}
      >
        <div style={{ fontSize: "32px", marginBottom: "10px" }}>🧠</div>
        <div>
          {isStillLoading
            ? "Loading threat feeds…"
            : "No active cyber triage items were returned from the current feeds."}
        </div>
        <div style={{ fontSize: "11px", marginTop: "6px" }}>
          CVEs and OTX pulses load automatically. CISA KEV is fetched here.
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Summary */}
      <TriageSummary items={allItems} />

      {/* Filter bar */}
      <div
        style={{
          display: "flex",
          gap: "10px",
          marginBottom: "16px",
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        {/* Priority filters */}
        <div style={{ display: "flex", gap: "4px" }}>
          {(["all", "critical", "high"] as PriorityFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setPriorityFilter(f)}
              style={{
                height: "26px",
                padding: "0 10px",
                borderRadius: "6px",
                fontSize: "10px",
                fontWeight: 700,
                border: "1px solid var(--border2)",
                cursor: "pointer",
                textTransform: "uppercase",
                background:
                  priorityFilter === f
                    ? (PRIORITY_COLOR[f as TriagePriority] ?? "var(--accent)")
                    : "transparent",
                color: priorityFilter === f ? "#fff" : "var(--text3)",
              }}
            >
              {f === "all" ? "All Priority" : f}
            </button>
          ))}
        </div>

        {/* Source filters */}
        <div style={{ display: "flex", gap: "4px" }}>
          {(["all", "CVE", "OTX", "CISA"] as SourceFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setSourceFilter(f)}
              style={{
                height: "26px",
                padding: "0 10px",
                borderRadius: "6px",
                fontSize: "10px",
                fontWeight: 700,
                border: "1px solid var(--border2)",
                cursor: "pointer",
                background:
                  sourceFilter === f
                    ? (SOURCE_COLOR[f as TriageSource] ?? "var(--accent)")
                    : "transparent",
                color: sourceFilter === f ? "#000" : "var(--text3)",
              }}
            >
              {f === "all" ? "All Sources" : f}
            </button>
          ))}
        </div>

        <span
          style={{
            marginLeft: "auto",
            fontSize: "10px",
            color: "var(--text3)",
          }}
        >
          {visible.length} items
          {kevLoading ? " · Loading CISA…" : ""}
        </span>
      </div>

      {/* Card list */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {visible.length === 0 && (
          <div
            style={{
              padding: "40px",
              textAlign: "center",
              color: "var(--text3)",
              fontSize: "13px",
            }}
          >
            No items match this filter. Try widening the priority or source
            filter.
          </div>
        )}
        {visible.map((item) => (
          <TriageCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}
