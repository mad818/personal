"use client";

// ── components/cyber/CyberHeatmap.tsx ────────────────────────────────────────
// CVE severity + OTX threat-level heatmap.
// Two rows of heat cells. Click any cell → slide panel with item list.

import { useState, useCallback } from "react";
import { useStore } from "@/store/useStore";
import type { CVE } from "@/hooks/useCVEs";
import type { OTXPulse } from "@/store/useStore";
import { timeAgo } from "@/lib/helpers";

// ── CVE severity config ───────────────────────────────────────────────────────
const CVE_BUCKETS = [
  { key: "CRITICAL", label: "Critical", hue: "#ef4444", icon: "💀" },
  { key: "HIGH", label: "High", hue: "#f59e0b", icon: "🔴" },
  { key: "MEDIUM", label: "Medium", hue: "#818cf8", icon: "🟡" },
  { key: "LOW", label: "Low", hue: "#10b981", icon: "🟢" },
  { key: "NONE", label: "Unknown", hue: "#6b7280", icon: "⚪" },
];

// ── OTX TLP config ────────────────────────────────────────────────────────────
const OTX_BUCKETS = [
  { key: "red", label: "TLP:RED", hue: "#ef4444", icon: "🚨" },
  { key: "amber", label: "TLP:AMBER", hue: "#f59e0b", icon: "⚠️" },
  { key: "green", label: "TLP:GREEN", hue: "#10b981", icon: "✅" },
  { key: "white", label: "TLP:WHITE", hue: "#6b7280", icon: "📋" },
];

// ── Reusable slide panel ──────────────────────────────────────────────────────
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
          boxShadow: `-12px 0 40px rgba(0,0,0,.5)`,
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

// ── CVE item row ──────────────────────────────────────────────────────────────
function CVERow({ cve }: { cve: CVE }) {
  const col = CVE_BUCKETS.find((b) => b.key === cve.severity)?.hue ?? "#6b7280";
  return (
    <a
      href={cve.url}
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
            fontFamily: "monospace",
            fontSize: "10px",
            fontWeight: 700,
            color: col,
          }}
        >
          {cve.id}
        </span>
        <span
          style={{
            fontSize: "9px",
            fontWeight: 700,
            padding: "1px 5px",
            borderRadius: "4px",
            background: `${col}22`,
            color: col,
          }}
        >
          {cve.score.toFixed(1)}
        </span>
        <span
          style={{ fontSize: "9px", color: "var(--text3)", marginLeft: "auto" }}
        >
          {timeAgo(cve.published)}
        </span>
      </div>
      <div
        style={{ fontSize: "11.5px", color: "var(--text)", lineHeight: 1.4 }}
      >
        {cve.description.slice(0, 160)}
        {cve.description.length > 160 ? "…" : ""}
      </div>
    </a>
  );
}

// ── OTX pulse row ──────────────────────────────────────────────────────────────
function OTXRow({ pulse }: { pulse: OTXPulse }) {
  const col = OTX_BUCKETS.find((b) => b.key === pulse.tlp)?.hue ?? "#6b7280";
  const url = `https://otx.alienvault.com/pulse/${pulse.id}`;
  return (
    <a
      href={url}
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
          }}
        >
          TLP:{pulse.tlp.toUpperCase()}
        </span>
        {pulse.adversary && (
          <span style={{ fontSize: "9px", color: "#ef4444", fontWeight: 700 }}>
            {pulse.adversary}
          </span>
        )}
        <span
          style={{ fontSize: "9px", color: "var(--text3)", marginLeft: "auto" }}
        >
          {pulse.indicator_count} IOCs · {timeAgo(pulse.modified)}
        </span>
      </div>
      <div
        style={{ fontSize: "11.5px", color: "var(--text)", lineHeight: 1.4 }}
      >
        {pulse.name}
      </div>
    </a>
  );
}

// ── Heat cell ──────────────────────────────────────────────────────────────────
interface CellProps {
  icon: string;
  label: string;
  count: number;
  maxCount: number;
  hue: string;
  topLine: string; // short descriptor of most critical item
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
          items
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
      {/* heat bar */}
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

// ── Main component ─────────────────────────────────────────────────────────────
export default function CyberHeatmap() {
  const cves = useStore((s) => s.cves) as CVE[];
  const cvesLoaded = useStore((s) => s.cvesLoaded);
  const otxPulses = useStore((s) => s.otxPulses) as OTXPulse[];

  const [panel, setPanel] = useState<{
    type: "cve" | "otx";
    key: string;
  } | null>(null);
  const close = useCallback(() => setPanel(null), []);

  // ── Bucket CVEs ──────────────────────────────────────────────────────────────
  const cveBuckets: Record<string, CVE[]> = {};
  CVE_BUCKETS.forEach((b) => {
    cveBuckets[b.key] = [];
  });
  cves.forEach((c) => {
    if (cveBuckets[c.severity]) cveBuckets[c.severity].push(c);
  });
  const cveMax = Math.max(
    1,
    ...CVE_BUCKETS.map((b) => cveBuckets[b.key].length),
  );

  // ── Bucket OTX ───────────────────────────────────────────────────────────────
  const otxBuckets: Record<string, OTXPulse[]> = {};
  OTX_BUCKETS.forEach((b) => {
    otxBuckets[b.key] = [];
  });
  otxPulses.forEach((p) => {
    const key = p.tlp?.toLowerCase() ?? "white";
    if (otxBuckets[key]) otxBuckets[key].push(p);
    else otxBuckets["white"].push(p);
  });
  const otxMax = Math.max(
    1,
    ...OTX_BUCKETS.map((b) => otxBuckets[b.key].length),
  );

  // ── Slide panel data ──────────────────────────────────────────────────────────
  const panelItems =
    panel?.type === "cve"
      ? (cveBuckets[panel.key] ?? [])
      : panel?.type === "otx"
        ? (otxBuckets[panel.key] ?? [])
        : [];
  const panelCfg =
    panel?.type === "cve"
      ? CVE_BUCKETS.find((b) => b.key === panel.key)
      : OTX_BUCKETS.find((b) => b.key === panel?.key);

  if (!cves.length && !otxPulses.length)
    return (
      <div
        style={{
          padding: "40px",
          textAlign: "center",
          color: "var(--text3)",
          fontSize: "12px",
        }}
      >
        <div style={{ fontSize: "24px", marginBottom: "8px" }}>🔒</div>
        {cvesLoaded
          ? "No cyber severity signals were returned from the current feeds."
          : "Loading threat data…"}
      </div>
    );

  return (
    <>
      {/* CVE severity row */}
      <div style={{ marginBottom: "16px" }}>
        <div
          style={{
            fontSize: "9px",
            fontWeight: 700,
            color: "var(--text3)",
            letterSpacing: ".1em",
            marginBottom: "8px",
          }}
        >
          CVE SEVERITY — {cves.length} vulnerabilities
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
            gap: "8px",
          }}
        >
          {CVE_BUCKETS.map((b) => {
            const items = cveBuckets[b.key];
            const top = items[0];
            return (
              <HeatCell
                key={b.key}
                icon={b.icon}
                label={b.label}
                count={items.length}
                maxCount={cveMax}
                hue={b.hue}
                topLine={top?.description ?? ""}
                timestamp={top ? timeAgo(top.published) : ""}
                onClick={() => setPanel({ type: "cve", key: b.key })}
              />
            );
          })}
        </div>
      </div>

      {/* OTX TLP row */}
      {otxPulses.length > 0 && (
        <div>
          <div
            style={{
              fontSize: "9px",
              fontWeight: 700,
              color: "var(--text3)",
              letterSpacing: ".1em",
              marginBottom: "8px",
            }}
          >
            OTX THREAT PULSES — {otxPulses.length} pulses
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
              gap: "8px",
            }}
          >
            {OTX_BUCKETS.map((b) => {
              const items = otxBuckets[b.key];
              const top = items[0];
              return (
                <HeatCell
                  key={b.key}
                  icon={b.icon}
                  label={b.label}
                  count={items.length}
                  maxCount={otxMax}
                  hue={b.hue}
                  topLine={top?.name ?? ""}
                  timestamp={
                    top
                      ? `${top.indicator_count} IOCs · ${timeAgo(top.modified)}`
                      : ""
                  }
                  onClick={() => setPanel({ type: "otx", key: b.key })}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Slide panel */}
      {panel && panelCfg && (
        <SlidePanel
          title={panelCfg.label}
          subtitle={`${panelItems.length} ${panel.type === "cve" ? "vulnerabilities" : "threat pulses"}`}
          color={panelCfg.hue}
          onClose={close}
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
              No items in this category.
            </div>
          )}
          {panel.type === "cve" &&
            (panelItems as CVE[]).map((c) => <CVERow key={c.id} cve={c} />)}
          {panel.type === "otx" &&
            (panelItems as OTXPulse[]).map((p) => (
              <OTXRow key={p.id} pulse={p} />
            ))}
        </SlidePanel>
      )}
    </>
  );
}
