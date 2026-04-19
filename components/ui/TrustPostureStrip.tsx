"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch, validateToken } from "@/lib/apiFetch";
import { useProviderHealthPosture } from "@/hooks/useProviderHealthPosture";
import {
  buildTrustActionRows,
  buildTrustPostureRows,
  summarizeTrustState,
  type TrustDiagnosticsPayload,
} from "@/lib/trustPostureDescriptor";
import { useStore } from "@/store/useStore";
import { ShellButton } from "@/components/ui/shell";

const SUMMARY_LABELS: Record<string, string> = {
  Session: "Session",
  "Step-up": "Step",
  Network: "Net",
  Connectors: "Conn",
  "High-risk": "Risk",
  Privacy: "Shield",
  Providers: "Lane",
};

export default function TrustPostureStrip() {
  const { posture } = useProviderHealthPosture();
  const privacyShieldStatus = useStore((s) => s.privacyShieldStatus);
  const [diagnostics, setDiagnostics] = useState<TrustDiagnosticsPayload | null>(null);
  const [revalidating, setRevalidating] = useState(false);
  const [revalidateNote, setRevalidateNote] = useState<string | null>(null);

  const loadDiagnostics = useCallback(async () => {
    try {
      const response = await apiFetch("/api/auth-diagnostics", {
        cache: "no-store",
      });
      if (!response.ok) return;
      const payload = (await response.json().catch(() => null)) as
        | TrustDiagnosticsPayload
        | null;
      if (!payload) return;
      setDiagnostics(payload);
    } catch {
      // Silent degradation keeps the strip compact and non-blocking.
    }
  }, []);

  useEffect(() => {
    let active = true;
    let timer: number | null = null;

    const refresh = async () => {
      if (!active) return;
      await loadDiagnostics();
    };

    void refresh();
    timer = window.setInterval(() => {
      void refresh();
    }, 30000);

    return () => {
      active = false;
      if (timer !== null) {
        window.clearInterval(timer);
      }
    };
  }, [loadDiagnostics]);

  const trustRows = useMemo(() => {
    return buildTrustPostureRows({
      diagnostics,
      providerPosture: posture,
      privacyShieldStatus,
    });
  }, [diagnostics, posture.noAiLaneAvailable, posture.runtimeReachable, privacyShieldStatus]);

  const actionRows = useMemo(
    () => buildTrustActionRows({ diagnostics }),
    [diagnostics],
  );

  const summaryState = summarizeTrustState(diagnostics);
  const summaryRows = useMemo(
    () =>
      trustRows.filter(
        (row) =>
          row.label === "Session" ||
          row.label === "Step-up" ||
          row.label === "High-risk",
      ),
    [trustRows],
  );

  const handleRevalidate = useCallback(async () => {
    const rawToken =
      typeof window !== "undefined"
        ? window.prompt("Re-enter the Nexus token to refresh protected actions.")
        : null;
    if (!rawToken) return;
    setRevalidating(true);
    setRevalidateNote(null);
    const status = await validateToken(rawToken, {
      persistOnSuccess: true,
      elevate: true,
    });
    setRevalidating(false);
    setRevalidateNote(
      status === "ok"
        ? "Step-up refreshed."
        : status === "rate_limited"
          ? "Revalidation is rate limited."
          : status === "server_error"
            ? "Runtime could not refresh privilege."
            : status === "unreachable"
              ? "Runtime unreachable."
              : "Token rejected.",
    );
    await loadDiagnostics();
  }, [loadDiagnostics]);

  return (
    <details className="nexus-trust-strip" data-state={summaryState}>
      <summary className="nexus-trust-strip__summary">
        <span className="nexus-trust-strip__label">Trust</span>
        <div className="nexus-trust-strip__badges">
          {summaryRows.map((row) => (
            <span key={row.label} className="nexus-trust-strip__badge">
              <span className="nexus-trust-strip__badgeLabel">
                {SUMMARY_LABELS[row.label] ?? row.label}
              </span>
              <span className="nexus-trust-strip__badgeValue">{row.value}</span>
            </span>
          ))}
        </div>
      </summary>
      <div className="nexus-trust-strip__body">
        {trustRows.map((row) => (
          <div key={row.label} className="nexus-trust-strip__row">
            <span className="nexus-trust-strip__rowLabel">{row.label}</span>
            <span className="nexus-trust-strip__rowValue">{row.value}</span>
          </div>
        ))}
        <div className="nexus-trust-strip__divider" />
        {actionRows.map((row) => (
          <div key={row.label} className="nexus-trust-strip__row">
            <span className="nexus-trust-strip__rowLabel">{row.label}</span>
            <span className="nexus-trust-strip__rowValue">{row.value}</span>
          </div>
        ))}
        <div className="nexus-trust-strip__actions">
          <ShellButton onClick={handleRevalidate} disabled={revalidating}>
            {revalidating ? "Checking" : "Recheck"}
          </ShellButton>
          {revalidateNote ? (
            <span className="nexus-trust-strip__note">{revalidateNote}</span>
          ) : null}
        </div>
      </div>
    </details>
  );
}
