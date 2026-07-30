"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ShellBadge, ShellButton, SectionLabel } from "@/components/ui/shell";
import {
  clearLocalUsage,
  LOCAL_USAGE_RETENTION_DAYS,
  readLocalUsageStore,
  summarizeLocalUsage,
  type LocalUsageStore,
} from "@/lib/localUsageAnalytics";

export default function LocalUsageMetricsPanel() {
  const [store, setStore] = useState<LocalUsageStore | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  const refresh = useCallback(() => {
    setStore(readLocalUsageStore());
  }, []);

  useEffect(() => {
    refresh();
    window.addEventListener("nexus-local-usage-updated", refresh);
    return () =>
      window.removeEventListener("nexus-local-usage-updated", refresh);
  }, [refresh]);

  const summary = useMemo(
    () => (store ? summarizeLocalUsage(store) : null),
    [store],
  );

  const removeMetrics = () => {
    if (!clearLocalUsage()) return;
    setConfirmClear(false);
    refresh();
  };

  return (
    <div
      data-testid="local-usage-metrics"
      style={{ display: "grid", gap: "10px" }}
    >
      <SectionLabel detail={`${LOCAL_USAGE_RETENTION_DAYS}-day local window`}>
        Private usage pulse
      </SectionLabel>
      <p
        style={{
          margin: 0,
          color: "var(--text3)",
          fontSize: "11px",
          lineHeight: 1.55,
        }}
      >
        Aggregated route counts stay in this browser. No cookies, user
        identifier, query text, IP address, provider call, or individual event
        timeline is stored.
      </p>
      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
        <ShellBadge tone="muted">
          {summary?.routeViews ?? 0} route views
        </ShellBadge>
        <ShellBadge tone="muted">
          {summary?.activeDays ?? 0} active days
        </ShellBadge>
        <ShellBadge tone="muted">
          {summary?.totalEvents ?? 0} local events
        </ShellBadge>
      </div>
      <div style={{ display: "grid", gap: "6px" }}>
        {(summary?.topRoutes ?? []).map((entry) => (
          <div
            key={entry.route}
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: "10px",
              padding: "7px 9px",
              borderRadius: "9px",
              border: "1px solid var(--border)",
              fontSize: "10px",
              color: "var(--text2)",
            }}
          >
            <span>{entry.route}</span>
            <strong>{entry.count}</strong>
          </div>
        ))}
        {summary?.topRoutes.length === 0 ? (
          <span style={{ color: "var(--text3)", fontSize: "10px" }}>
            Route totals appear after authenticated workspace navigation.
          </span>
        ) : null}
      </div>
      {confirmClear ? (
        <div
          role="alertdialog"
          aria-label="Clear local usage metrics"
          style={{
            display: "grid",
            gap: "8px",
            padding: "10px",
            borderRadius: "10px",
            border: "1px solid rgba(214, 165, 109, 0.62)",
          }}
        >
          <span style={{ fontSize: "11px", color: "var(--text2)" }}>
            Delete all browser-local aggregate usage counts?
          </span>
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            <ShellButton onClick={removeMetrics}>Clear counts</ShellButton>
            <ShellButton onClick={() => setConfirmClear(false)}>
              Keep counts
            </ShellButton>
          </div>
        </div>
      ) : (
        <ShellButton onClick={() => setConfirmClear(true)}>
          Clear local metrics
        </ShellButton>
      )}
    </div>
  );
}
