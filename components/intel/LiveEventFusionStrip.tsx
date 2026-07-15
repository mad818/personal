// ── components/intel/LiveEventFusionStrip ───────────────────────────────────
// Osiris-inspired fused live-event strip: links intel conflict feed events to
// OPS map layer by surfacing geo-tagged high/critical items inline on INTEL.
//
// Source parity: simplifaisoul/osiris — unified-map-and-event-layers
// Pattern: narrow strip that bridges the INTEL feed and the OPS world-map
// layer without vendoring Osiris. Events with geo coordinates link out to
// the OPS tab map view.

"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/apiFetch";

interface FusedEvent {
  title: string;
  url: string;
  impact: "critical" | "high";
  region: string;
}

const IMPACT_COLOR: Record<FusedEvent["impact"], string> = {
  critical: "#ef4444",
  high: "#f59e0b",
};

const REGION_RE =
  /\b(ukraine|russia|israel|gaza|taiwan|china|iran|sudan|somalia|haiti|myanmar|afghanistan|syria|pakistan|yemen)\b/i;

function extractRegion(title: string): string {
  const m = REGION_RE.exec(title);
  return m ? m[1].charAt(0).toUpperCase() + m[1].slice(1).toLowerCase() : "";
}

function isFuseable(title: string): FusedEvent["impact"] | null {
  const t = title.toLowerCase();
  const critKW = [
    "nuclear",
    "airstrike",
    "killed",
    "casualties",
    "invasion",
    "missile",
    "bomb",
    "strike",
  ];
  const highKW = [
    "troops",
    "offensive",
    "sanctions",
    "drone",
    "blockade",
    "coup",
    "war",
    "conflict",
  ];
  if (critKW.some((k) => t.includes(k))) return "critical";
  if (highKW.some((k) => t.includes(k))) return "high";
  return null;
}

function regionMapHref(region: string) {
  const query = new URLSearchParams({
    view: "world",
    focus: "intel-world",
    region: region.toLowerCase(),
  });
  return `/intel?${query.toString()}`;
}

export default function LiveEventFusionStrip() {
  const [events, setEvents] = useState<FusedEvent[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await apiFetch("/api/conflict", {
        signal: AbortSignal.timeout(12000),
      });
      const d = await r.json();
      const raw = (d.articles ?? []) as { title: string; url: string }[];
      const fused: FusedEvent[] = [];
      for (const a of raw) {
        const impact = isFuseable(a.title);
        if (!impact) continue;
        const region = extractRegion(a.title);
        if (!region) continue;
        fused.push({ title: a.title, url: a.url, impact, region });
        if (fused.length >= 6) break;
      }
      setEvents(fused);
    } catch {
      // non-fatal — strip stays hidden on error
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading || events.length === 0) return null;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 0,
        borderRadius: 8,
        overflow: "hidden",
        border: "1px solid rgba(239,68,68,0.18)",
        background: "rgba(239,68,68,0.04)",
      }}
      data-testid="live-event-fusion-strip"
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "6px 10px",
          background: "rgba(239,68,68,0.08)",
          borderBottom: "1px solid rgba(239,68,68,0.14)",
        }}
      >
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: "#ef4444",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}
        >
          🗺 Geo-fused events
        </span>
        <span
          style={{ fontSize: 10, color: "var(--text3)", marginLeft: "auto" }}
        >
          <a
            href="/intel?view=world&focus=intel-world"
            style={{ color: "var(--accent)", textDecoration: "none" }}
          >
            Open world map →
          </a>
        </span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        {events.map((ev, i) => (
          <div
            key={i}
            style={{
              display: "grid",
              gridTemplateColumns: "auto minmax(0, 1fr) auto auto",
              gap: 8,
              alignItems: "center",
              padding: "6px 10px",
              borderTop: i > 0 ? "1px solid rgba(255,255,255,0.04)" : undefined,
              background: "transparent",
            }}
          >
            <span
              style={{
                fontSize: 9,
                fontWeight: 700,
                color: IMPACT_COLOR[ev.impact],
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                whiteSpace: "nowrap",
              }}
            >
              {ev.impact}
            </span>
            <a
              href={regionMapHref(ev.region)}
              style={{
                fontSize: 11,
                color: "var(--text2)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                textDecoration: "none",
              }}
            >
              {ev.title}
            </a>
            <span
              style={{
                fontSize: 10,
                color: "var(--text3)",
                background: "rgba(255,255,255,0.06)",
                borderRadius: 4,
                padding: "1px 5px",
                whiteSpace: "nowrap",
              }}
            >
              {ev.region}
            </span>
            <a
              href={ev.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: 10,
                color: "var(--accent)",
                textDecoration: "none",
                whiteSpace: "nowrap",
              }}
            >
              Source
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
