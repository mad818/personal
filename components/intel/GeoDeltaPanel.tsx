"use client";

import { useEffect, useMemo, useState } from "react";
import DataLoadingState from "@/components/ui/DataLoadingState";
import { SectionLabel, ShellBadge, ShellButton } from "@/components/ui/shell";
import { SurfaceCallout } from "@/components/ui/surfacePrimitives";
import type { GeoDeltaSnapshot, SweepTheater } from "@/lib/assimilation/types";

export default function GeoDeltaPanel({ theater }: { theater: SweepTheater }) {
  const [snapshots, setSnapshots] = useState<GeoDeltaSnapshot[]>([]);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoadState("loading");
      setSnapshots([]);
      try {
        const response = await fetch(`/api/geo-delta?theater=${theater}`, {
          cache: "no-store",
        });
        if (!response.ok) throw new Error("Geo delta load failed");
        const payload = (await response.json()) as {
          snapshots: GeoDeltaSnapshot[];
        };
        if (!active) return;
        setSnapshots(payload.snapshots);
        setLoadState("ready");
      } catch {
        if (!active) return;
        setLoadState("error");
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [retryToken, theater]);

  const latest = useMemo(() => snapshots[0] ?? null, [snapshots]);

  if (loadState === "loading") {
    return <DataLoadingState dataName="geo delta evidence" height={160} />;
  }

  if (loadState === "error") {
    return (
      <SurfaceCallout
        tone="warning"
        compact
        role="alert"
        title="Geo delta unavailable"
        description="The stored theater evidence could not be loaded. Retry without leaving INTEL."
      >
        <ShellButton onClick={() => setRetryToken((current) => current + 1)}>
          Retry geo delta
        </ShellButton>
      </SurfaceCallout>
    );
  }

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
