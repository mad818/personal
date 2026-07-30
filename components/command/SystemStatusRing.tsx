"use client";

import { useMemo } from "react";
import { useStore } from "@/store/useStore";
import { CHART } from "@/lib/chartTheme";
import { useFearGreed } from "@/hooks/useFearGreed";

// ── Ring segment data ─────────────────────────────────────────────────────────
interface RingSegment {
  label: string;
  value: number | null; // 0–100, null when evidence is unavailable
  color: string;
}

// ── SVG ring math ─────────────────────────────────────────────────────────────
const R = 70;
const CX = 90;
const CY = 90;
const CIRCUMFERENCE = 2 * Math.PI * R;
const GAP = 4; // degrees gap between segments

function segmentArc(
  startDeg: number,
  sweepDeg: number,
): { d: string; dasharray: string; dashoffset: string } {
  const toRad = (d: number) => (d - 90) * (Math.PI / 180);
  const x1 = CX + R * Math.cos(toRad(startDeg));
  const y1 = CY + R * Math.sin(toRad(startDeg));
  const x2 = CX + R * Math.cos(toRad(startDeg + sweepDeg));
  const y2 = CY + R * Math.sin(toRad(startDeg + sweepDeg));
  const largeArc = sweepDeg > 180 ? 1 : 0;
  const d = `M ${x1} ${y1} A ${R} ${R} 0 ${largeArc} 1 ${x2} ${y2}`;

  // For stroke-dasharray animation
  const arcLen = (sweepDeg / 360) * CIRCUMFERENCE;
  return {
    d,
    dasharray: `${arcLen} ${CIRCUMFERENCE}`,
    dashoffset: `${arcLen}`,
  };
}

export default function SystemStatusRing() {
  const cves = useStore((s) => s.cves);
  const threatIntel = useStore((s) => s.threatIntel);
  const fearGreed = useStore((s) => s.signals.fg);
  const sentimentStatus = useStore((s) => s.feedStatus.fearGreed);
  const prices = useStore((s) => s.prices);
  const { fetchFearGreed, loading: sentimentLoading } = useFearGreed();

  // Derive 0–100 scores for each segment
  const segments: RingSegment[] = useMemo(() => {
    // API Health: based on how many data sources are loaded
    const loaded = [
      cves.length > 0,
      threatIntel.threatfox.length > 0,
      fearGreed != null,
      Object.keys(prices).length > 0,
    ].filter(Boolean).length;
    const apiHealth = Math.round((loaded / 4) * 100);

    // Data Freshness: based on threat intel recency (synthetic)
    const hasRecent = threatIntel.threatfox.some((ioc: any) => {
      const seen = ioc.first_seen ?? ioc.date_added ?? "";
      if (!seen) return false;
      const d = new Date(seen);
      return !isNaN(d.getTime()) && Date.now() - d.getTime() < 86400000;
    });
    const dataFreshness = hasRecent ? 88 : 60;

    // Threat Level: inverse of high-confidence IOC ratio
    const highConf = threatIntel.threatfox.filter((ioc: any) => {
      const c = ioc.confidence_level ?? ioc.confidence ?? 0;
      return c >= 75;
    }).length;
    const totalIocs = Math.max(1, threatIntel.threatfox.length);
    const threatLevel = Math.min(100, Math.round((highConf / totalIocs) * 150));

    // Market Sentiment: 0 = extreme fear (bad), 100 = extreme greed (good)
    const marketSentiment = fearGreed?.value ?? null;

    return [
      { label: "API Health", value: apiHealth, color: CHART.teal },
      { label: "Data Freshness", value: dataFreshness, color: CHART.cyan },
      { label: "Threat Level", value: 100 - threatLevel, color: CHART.rose },
      { label: "Market Sentiment", value: marketSentiment, color: CHART.gold },
    ];
  }, [cves, threatIntel, fearGreed, prices]);

  const scoredSegments = segments.filter(
    (segment): segment is RingSegment & { value: number } =>
      segment.value !== null,
  );
  const overall = Math.round(
    scoredSegments.reduce((sum, segment) => sum + segment.value, 0) /
      scoredSegments.length,
  );

  // Build 4 equal segments (each 90°) with a small gap
  const startAngles = [0, 90, 180, 270];
  const sweepPerSeg = 90 - GAP;

  // Score color
  const overallColor =
    overall >= 75 ? CHART.teal : overall >= 50 ? CHART.amber : CHART.rose;

  return (
    <div
      style={{
        background: CHART.surf,
        border: `1px solid ${CHART.border}`,
        borderRadius: "12px",
        padding: "16px 18px",
      }}
    >
      {/* Header */}
      <div
        style={{
          fontSize: "11px",
          fontWeight: 700,
          color: CHART.text3,
          textTransform: "uppercase",
          letterSpacing: ".6px",
          marginBottom: "12px",
          display: "flex",
          alignItems: "center",
          gap: "8px",
        }}
      >
        <span style={{ color: CHART.violet }}>◉</span> System Health
      </div>

      {sentimentStatus.lastError ? (
        <div
          role="alert"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "10px",
            padding: "8px 10px",
            marginBottom: "10px",
            border: `1px solid ${CHART.border}`,
            borderRadius: "7px",
            background: CHART.surf2,
            color: CHART.amber,
            fontSize: "10px",
          }}
        >
          <span>
            {fearGreed
              ? "Sentiment refresh failed; the last verified value remains in the score."
              : sentimentStatus.lastError}
          </span>
          <button
            type="button"
            onClick={() => void fetchFearGreed()}
            disabled={sentimentLoading}
            style={{
              border: `1px solid ${CHART.border}`,
              borderRadius: "6px",
              background: CHART.surf3,
              color: CHART.text2,
              padding: "4px 8px",
              cursor: sentimentLoading ? "wait" : "pointer",
              fontSize: "9px",
              fontWeight: 700,
            }}
          >
            {sentimentLoading ? "Retrying…" : "Retry sentiment"}
          </button>
        </div>
      ) : !fearGreed ? (
        <div
          role="status"
          style={{
            color: CHART.text3,
            fontSize: "10px",
            marginBottom: "10px",
          }}
        >
          Market sentiment is awaiting verified data.
        </div>
      ) : null}

      <div style={{ display: "flex", alignItems: "center", gap: "18px" }}>
        {/* SVG Ring */}
        <div style={{ flexShrink: 0 }}>
          <svg
            width="180"
            height="180"
            viewBox="0 0 180 180"
            aria-label="System status ring"
          >
            {/* Background track */}
            <circle
              cx={CX}
              cy={CY}
              r={R}
              fill="none"
              stroke={CHART.surf3}
              strokeWidth="14"
            />

            {/* Glow filter */}
            <defs>
              {segments.map((seg, i) => (
                <filter
                  key={`glow-${i}`}
                  id={`ring-glow-${i}`}
                  x="-30%"
                  y="-30%"
                  width="160%"
                  height="160%"
                >
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              ))}
            </defs>

            {/* Colored segments */}
            {segments.map((seg, i) => {
              const start = startAngles[i];
              const { d } = segmentArc(start, sweepPerSeg);
              // Opacity scales with value
              const opacity =
                seg.value === null ? 0.12 : 0.3 + (seg.value / 100) * 0.7;
              return (
                <path
                  key={seg.label}
                  d={d}
                  fill="none"
                  stroke={seg.color}
                  strokeWidth="14"
                  strokeLinecap="round"
                  opacity={opacity}
                  style={{
                    filter: `url(#ring-glow-${i})`,
                    animation: `nex-ring 1.2s ease-out ${i * 0.2}s both`,
                    strokeDasharray: `${(sweepPerSeg / 360) * CIRCUMFERENCE} ${CIRCUMFERENCE}`,
                  }}
                />
              );
            })}

            {/* Center text */}
            <text
              x={CX}
              y={CY - 8}
              textAnchor="middle"
              fill={overallColor}
              fontSize="26"
              fontWeight="900"
              fontFamily="monospace"
            >
              {overall}
            </text>
            <text
              x={CX}
              y={CY + 10}
              textAnchor="middle"
              fill={CHART.text3}
              fontSize="9"
              fontWeight="700"
              textDecoration="none"
            >
              SYSTEM SCORE
            </text>
          </svg>
        </div>

        {/* Legend */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            gap: "10px",
          }}
        >
          {segments.map((seg) => (
            <div key={seg.label}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "3px",
                }}
              >
                <span
                  style={{
                    fontSize: "10px",
                    color: CHART.text2,
                    fontWeight: 600,
                  }}
                >
                  {seg.label}
                </span>
                <span
                  style={{
                    fontSize: "10px",
                    color: seg.color,
                    fontWeight: 700,
                    fontFamily: "monospace",
                  }}
                >
                  {seg.value ?? "—"}
                </span>
              </div>
              <div
                style={{
                  height: "3px",
                  background: CHART.surf3,
                  borderRadius: "2px",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${seg.value ?? 0}%`,
                    height: "100%",
                    background: seg.color,
                    borderRadius: "2px",
                    transition: "width 1s ease-out",
                    boxShadow: `0 0 6px ${seg.color}88`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
