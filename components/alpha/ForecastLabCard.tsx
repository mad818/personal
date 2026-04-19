"use client";

import { useMemo, useState } from "react";
import { apiFetch } from "@/lib/apiFetch";
import { timeAgo } from "@/lib/helpers";
import { useForecastEvalReadiness } from "@/hooks/useForecastEvalReadiness";
import { ShellBadge } from "@/components/ui/shell";
import {
  SurfaceCallout,
  SurfaceEmpty,
  SurfaceSkeletonRows,
} from "@/components/ui/surfacePrimitives";

function toneForQuality(quality?: string, stale?: boolean) {
  if (stale) return "warning" as const;
  if (quality === "ready") return "success" as const;
  if (quality === "guarded") return "info" as const;
  return "warning" as const;
}

export default function ForecastLabCard() {
  const { payload, loading, loadError, refresh } = useForecastEvalReadiness(12);
  const [running, setRunning] = useState(false);
  const [runMsg, setRunMsg] = useState("");

  const latest = payload?.latest;
  const quality = latest?.summary?.quality ?? "degraded";
  const reasons = latest?.summary?.reasons ?? [];

  const horizonCoverage = useMemo(() => {
    const counts = new Map<string, number>();
    for (const result of latest?.backtests ?? []) {
      if (result.status !== "ok" || !result.horizon) continue;
      counts.set(result.horizon, (counts.get(result.horizon) ?? 0) + 1);
    }
    return ["1h", "6h", "24h"].map((horizon) => ({
      horizon,
      covered: counts.get(horizon) ?? 0,
    }));
  }, [latest?.backtests]);

  const runEval = async () => {
    setRunning(true);
    setRunMsg("");
    try {
      const response = await apiFetch("/api/metrics/runtime-eval/forecast/run", {
        method: "POST",
        body: JSON.stringify({}),
      });
      const data = (await response.json()) as {
        ok?: boolean;
        skipped?: boolean;
        reason?: string;
        output?: string;
      };
      if (!response.ok || !data.ok) {
        setRunMsg(`Forecast run failed: ${(data.output || "unknown error").slice(0, 160)}`);
      } else if (data.skipped) {
        setRunMsg(`Forecast bench skipped: ${data.reason ?? "cooldown active"}`);
      } else {
        setRunMsg("Forecast baseline recorded.");
      }
      await refresh();
    } catch {
      setRunMsg("Forecast bench could not be reached.");
    } finally {
      setRunning(false);
    }
  };

  if (loading && !payload) {
    return <SurfaceSkeletonRows rows={3} height={52} />;
  }

  if (!latest) {
    return (
      <div style={{ display: "grid", gap: "10px" }}>
        <SurfaceEmpty
          compact
          tone="muted"
          icon="◎"
          title="Forecast bench standing by"
          description="The native baseline is staged, but no rolling backtest has been recorded yet. Keep the market tape primary until the bench calibrates."
          action={
            <button
              type="button"
              onClick={() => {
                void runEval();
              }}
              className="nexus-shell-button"
              style={{ minHeight: "30px", padding: "0 10px", fontSize: "11px" }}
              disabled={running}
            >
              {running ? "Calibrating…" : "Calibrate baseline"}
            </button>
          }
        />
        {loadError ? (
          <SurfaceCallout
            tone="warning"
            compact
            icon="↺"
            title="Forecast posture recovering"
            description={loadError}
          />
        ) : null}
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: "10px" }}>
      <SurfaceCallout
        tone={toneForQuality(quality, payload?.freshness?.stale)}
        compact
        icon="◎"
        title={`${latest.summary?.label ?? "Baseline posture"} · ${latest.summary?.score ?? 0}/100`}
        description={
          payload?.freshness?.ageMinutes !== null &&
          payload?.freshness?.ageMinutes !== undefined
            ? `Last recorded ${timeAgo(latest.ts ?? new Date().toISOString())}. Forecast lab stays in the support rail until quality is stable.`
            : "Forecast lab stays in the support rail until quality is stable."
        }
      >
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
          <ShellBadge tone="accent">{latest.provider?.label ?? "Native baseline"}</ShellBadge>
          <ShellBadge tone={latest.provider?.ready ? "success" : "muted"}>
            {latest.provider?.ready ? "Provider ready" : "Provider guarded"}
          </ShellBadge>
          <ShellBadge tone="muted">
            {latest.summary?.assetsCovered ?? 0}/{latest.summary?.assetsRequested ?? 0} assets
          </ShellBadge>
          <ShellBadge tone="muted">
            {latest.summary?.windows ?? 0} rolling windows
          </ShellBadge>
        </div>
      </SurfaceCallout>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(128px, 1fr))",
          gap: "10px",
        }}
      >
        <article className="nexus-shell-resource-card">
          <div className="nexus-shell-resource-card__meta">
            <span className="nexus-shell-resource-card__chip">MAPE</span>
            <span className="nexus-shell-resource-card__chip">lower is better</span>
          </div>
          <div className="nexus-shell-resource-card__title">
            {latest.summary?.meanAbsolutePercentageError ?? "—"}%
          </div>
          <p className="nexus-shell-resource-card__description">
            Mean absolute percentage error across the covered rolling windows.
          </p>
        </article>

        <article className="nexus-shell-resource-card">
          <div className="nexus-shell-resource-card__meta">
            <span className="nexus-shell-resource-card__chip">Direction</span>
            <span className="nexus-shell-resource-card__chip">higher is better</span>
          </div>
          <div className="nexus-shell-resource-card__title">
            {latest.summary?.directionalAccuracy ?? "—"}%
          </div>
          <p className="nexus-shell-resource-card__description">
            Directional hit rate for the native baseline across the active horizons.
          </p>
        </article>
      </div>

      <div style={{ display: "grid", gap: "8px" }}>
        {horizonCoverage.map((entry) => (
          <div
            key={entry.horizon}
            className="rounded-md border border-[var(--border)] bg-[var(--surf)] px-3 py-2"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="font-mono text-[11px] text-[var(--text)]">
                Horizon {entry.horizon}
              </div>
              <ShellBadge tone={entry.covered > 0 ? "success" : "muted"}>
                {entry.covered > 0 ? `${entry.covered} assets` : "Insufficient history"}
              </ShellBadge>
            </div>
          </div>
        ))}
      </div>

      {reasons.length ? (
        <div className="rounded-md border border-[var(--border)] bg-[var(--surf)] px-3 py-2">
          <div className="font-mono text-[11px] text-[var(--text)]">
            Bench posture
          </div>
          <div className="mt-2 grid gap-2 text-[10px] leading-5 text-[var(--text3)]">
            {reasons.map((reason) => (
              <div key={reason}>{reason}</div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => {
            void runEval();
          }}
          className="nexus-shell-button"
          style={{ minHeight: "30px", padding: "0 10px", fontSize: "11px" }}
          disabled={running}
        >
          {running ? "Calibrating…" : "Run baseline eval"}
        </button>
        {runMsg ? (
          <span className="text-[10px] text-[var(--text3)]">{runMsg}</span>
        ) : null}
      </div>

      {loadError ? (
        <SurfaceCallout
          tone="warning"
          compact
          icon="↺"
          title="Forecast posture recovering"
          description={loadError}
        />
      ) : null}
    </div>
  );
}
