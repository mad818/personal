"use client";

import { useMemo, useRef, useState } from "react";
import { SectionLabel, ShellBadge, ShellButton } from "@/components/ui/shell";
import { InternalWorkbenchNotice } from "@/components/ui/InternalWorkbenchNotice";
import { SurfaceCallout } from "@/components/ui/surfacePrimitives";
import { apiFetch } from "@/lib/apiFetch";
import GeoDeltaPanel from "@/components/intel/GeoDeltaPanel";
import type { SweepBundle, SweepTheater } from "@/lib/assimilation/types";
import type { InternalWorkbenchMeta } from "@/lib/assimilation/contracts";

const THEATERS: Array<{ id: SweepTheater; label: string }> = [
  { id: "markets", label: "Markets" },
  { id: "cyber", label: "Cyber" },
  { id: "geopolitics", label: "Geopolitics" },
  { id: "air-sea", label: "Air / Sea" },
  { id: "infra", label: "Infra" },
  { id: "watchlist", label: "Watchlist" },
];

interface SweepStreamEvent {
  id: string;
  label: string;
  ok?: boolean;
  count?: number;
  durationMs?: number;
  message?: string;
}

export default function SweepEnginePanel() {
  const [theater, setTheater] = useState<SweepTheater>("markets");
  const [events, setEvents] = useState<SweepStreamEvent[]>([]);
  const [latestSweep, setLatestSweep] = useState<SweepBundle | null>(null);
  const [meta, setMeta] = useState<InternalWorkbenchMeta | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const sourceRef = useRef<EventSource | null>(null);

  const successCount = useMemo(
    () => events.filter((event) => event.ok).length,
    [events],
  );

  function stopStream() {
    sourceRef.current?.close();
    sourceRef.current = null;
  }

  async function runSweep() {
    stopStream();
    setBusy(true);
    setEvents([]);
    const source = new EventSource(`/api/events/sweeps?theater=${theater}`);
    sourceRef.current = source;
    source.addEventListener("source", (event) => {
      const payload = JSON.parse((event as MessageEvent<string>).data) as SweepStreamEvent;
      setEvents((current) => [...current, payload]);
    });
    source.addEventListener("complete", () => {
      stopStream();
    });
    source.onerror = () => {
      setError(
        "Sweep progress streaming is temporarily unavailable. Retained events and the latest verdict stay visible locally.",
      );
      stopStream();
    };

    try {
      const response = await apiFetch("/api/sweeps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theater, persistSnapshot: true }),
      });
      if (!response.ok) throw new Error("Failed to run sweep.");
      const payload = (await response.json()) as {
        sweep: SweepBundle;
        meta?: InternalWorkbenchMeta;
      };
      setLatestSweep(payload.sweep);
      setMeta(payload.meta ?? null);
      setError("");
    } catch {
      setError(
        "The sweep did not complete. Existing streamed events and the last stored verdict were kept locally.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: "16px" }}>
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
        {THEATERS.map((option) => (
          <ShellButton
            key={option.id}
            active={option.id === theater}
            onClick={() => setTheater(option.id)}
          >
            {option.label}
          </ShellButton>
        ))}
        <ShellButton onClick={() => void runSweep()}>
          {busy ? "Sweeping..." : "Run sweep"}
        </ShellButton>
      </div>

      <InternalWorkbenchNotice meta={meta} compact />
      {error ? (
        <SurfaceCallout
          tone="warning"
          compact
          icon="↺"
          title="Sweep engine degraded"
          description={error}
        />
      ) : null}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 0.54fr) minmax(300px, 0.46fr)",
          gap: "16px",
          alignItems: "start",
        }}
      >
        <section
          style={{
            padding: "14px",
            borderRadius: "14px",
            border: "1px solid var(--border)",
            background: "rgba(10, 15, 30, 0.62)",
          }}
        >
          <SectionLabel detail={`${successCount}/${events.length || 0} sources complete`}>
            Sweep engine
          </SectionLabel>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: "12px",
              marginTop: "12px",
            }}
          >
            {events.map((event) => (
              <article
                key={`${event.id}-${event.durationMs}`}
                style={{
                  padding: "12px",
                  borderRadius: "12px",
                  border: "1px solid var(--border)",
                  background: "rgba(8, 12, 22, 0.86)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", alignItems: "center" }}>
                  <strong style={{ fontSize: "12px" }}>{event.label}</strong>
                  <ShellBadge tone={event.ok ? "success" : "muted"}>
                    {event.ok ? "ok" : "error"}
                  </ShellBadge>
                </div>
                <div style={{ marginTop: "8px", fontSize: "10px", color: "var(--text3)" }}>
                  {event.count ?? 0} records · {event.durationMs ?? 0} ms
                </div>
                {event.message ? (
                  <p style={{ margin: "8px 0 0", fontSize: "11px", color: "var(--text2)", lineHeight: 1.55 }}>
                    {event.message}
                  </p>
                ) : null}
              </article>
            ))}
            {!events.length && (
              <p style={{ margin: 0, color: "var(--text3)", fontSize: "12px" }}>
                Run a theater sweep to stream source progress and store a geo-delta snapshot.
              </p>
            )}
          </div>
        </section>

        <section
          style={{
            padding: "14px",
            borderRadius: "14px",
            border: "1px solid rgba(214, 165, 109, 0.35)",
            background: "rgba(214, 165, 109, 0.08)",
          }}
        >
          <SectionLabel detail="Latest aggregate">Command verdict</SectionLabel>
          {latestSweep ? (
            <>
              <div style={{ display: "flex", gap: "8px", alignItems: "center", marginTop: "10px" }}>
                <div style={{ fontSize: "18px", fontWeight: 900 }}>{latestSweep.theater.toUpperCase()}</div>
                <ShellBadge tone={latestSweep.severity === "high" ? "accent" : "success"}>
                  {latestSweep.severity}
                </ShellBadge>
              </div>
              <p style={{ margin: "10px 0 0", fontSize: "12px", color: "var(--text2)", lineHeight: 1.6 }}>
                {latestSweep.summary}
              </p>
            </>
          ) : (
            <p style={{ margin: "10px 0 0", fontSize: "12px", color: "var(--text2)", lineHeight: 1.6 }}>
              No sweep recorded yet for this session.
            </p>
          )}
        </section>
      </div>

      <section
        style={{
          padding: "14px",
          borderRadius: "14px",
          border: "1px solid var(--border)",
          background: "rgba(10, 15, 30, 0.62)",
        }}
      >
        <SectionLabel detail="Before / after theater evidence">Geo delta</SectionLabel>
        <div style={{ marginTop: "12px" }}>
          <GeoDeltaPanel theater={theater} />
        </div>
      </section>
    </div>
  );
}
