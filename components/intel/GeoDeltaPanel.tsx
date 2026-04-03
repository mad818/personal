"use client";

import { useEffect, useMemo, useState } from "react";
import { SectionLabel, ShellBadge } from "@/components/ui/shell";
import type { GeoDeltaSnapshot, SweepTheater } from "@/lib/assimilation/types";

export default function GeoDeltaPanel({ theater }: { theater: SweepTheater }) {
  const [snapshots, setSnapshots] = useState<GeoDeltaSnapshot[]>([]);

  useEffect(() => {
    let active = true;
    void fetch(`/api/geo-delta?theater=${theater}`, { cache: "no-store" })
      .then((response) => response.json() as Promise<{ snapshots: GeoDeltaSnapshot[] }>)
      .then((payload) => {
        if (!active) return;
        setSnapshots(payload.snapshots);
      });
    return () => {
      active = false;
    };
  }, [theater]);

  const latest = useMemo(() => snapshots[0] ?? null, [snapshots]);

  if (!latest) {
    return (
      <div style={{ color: "var(--text3)", fontSize: "12px" }}>
        No geo delta snapshot is stored for this theater yet. Run a sweep to seed the first before/after evidence chain.
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: "12px" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
          gap: "12px",
        }}
      >
        <article
          style={{
            padding: "14px",
            borderRadius: "14px",
            border: "1px solid var(--border)",
            background: "rgba(10, 15, 30, 0.62)",
          }}
        >
          <SectionLabel detail="Before">Baseline theater</SectionLabel>
          <div style={{ marginTop: "10px", fontSize: "18px", fontWeight: 900 }}>
            {latest.title}
          </div>
          <p style={{ margin: "8px 0 0", fontSize: "12px", color: "var(--text2)", lineHeight: 1.6 }}>
            {latest.observations.map((item) => item.beforeLabel).join(" · ")}
          </p>
        </article>
        <article
          style={{
            padding: "14px",
            borderRadius: "14px",
            border: "1px solid rgba(214, 165, 109, 0.35)",
            background: "rgba(214, 165, 109, 0.08)",
          }}
        >
          <SectionLabel detail="After">Current anomalies</SectionLabel>
          <div style={{ display: "flex", gap: "8px", alignItems: "center", marginTop: "10px" }}>
            <div style={{ fontSize: "18px", fontWeight: 900 }}>{latest.summary}</div>
            <ShellBadge tone={latest.severity === "high" ? "accent" : "success"}>
              {latest.severity}
            </ShellBadge>
          </div>
          <p style={{ margin: "8px 0 0", fontSize: "12px", color: "var(--text2)", lineHeight: 1.6 }}>
            {latest.observations.map((item) => item.afterLabel).join(" · ")}
          </p>
        </article>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "12px",
        }}
      >
        {latest.observations.map((observation) => (
          <article
            key={observation.id}
            style={{
              padding: "12px",
              borderRadius: "12px",
              border: "1px solid var(--border)",
              background: "rgba(8, 12, 22, 0.86)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", alignItems: "center" }}>
              <strong style={{ fontSize: "12px" }}>{observation.label}</strong>
              <ShellBadge tone={observation.severity === "high" ? "accent" : "muted"}>
                {observation.severity}
              </ShellBadge>
            </div>
            <p style={{ margin: "8px 0 0", fontSize: "11px", color: "var(--text2)", lineHeight: 1.55 }}>
              {observation.note}
            </p>
            <div style={{ marginTop: "10px", fontSize: "10px", color: "var(--text3)", lineHeight: 1.55 }}>
              {observation.lat.toFixed(1)}, {observation.lon.toFixed(1)}
              <br />
              {observation.beforeLabel} → {observation.afterLabel}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
