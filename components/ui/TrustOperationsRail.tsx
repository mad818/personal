"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch, validateToken } from "@/lib/apiFetch";
import { useProviderHealthPosture } from "@/hooks/useProviderHealthPosture";
import {
  buildTrustActionRows,
  buildTrustPostureRows,
  type TrustDiagnosticsPayload,
} from "@/lib/trustPostureDescriptor";
import { useStore } from "@/store/useStore";
import { OpsField, ShellBadge, ShellButton } from "@/components/ui/shell";

const SUMMARY_LABELS: Record<string, string> = {
  Session: "Session",
  "Step-up": "Step",
  Network: "Net",
  Connectors: "Conn",
  "High-risk": "Risk",
  Privacy: "Shield",
  Providers: "Lane",
};

export default function TrustOperationsRail({
  title = "Trust operations",
  detail = "Session, privilege, connector, and protected-action posture",
  compact = false,
}: {
  title?: string;
  detail?: string;
  compact?: boolean;
}) {
  const { posture } = useProviderHealthPosture();
  const privacyShieldStatus = useStore((s) => s.privacyShieldStatus);
  const [diagnostics, setDiagnostics] = useState<TrustDiagnosticsPayload | null>(null);
  const [busy, setBusy] = useState(false);
  const [statusNote, setStatusNote] = useState<string | null>(null);

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
      // Silent degradation keeps route support rails non-blocking.
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

  const trustRows = useMemo(
    () =>
      buildTrustPostureRows({
        diagnostics,
        providerPosture: posture,
        privacyShieldStatus,
      }),
    [diagnostics, posture, privacyShieldStatus],
  );

  const actionRows = useMemo(
    () => buildTrustActionRows({ diagnostics }),
    [diagnostics],
  );
  const summaryRows = useMemo(
    () =>
      trustRows.filter(
        (row) =>
          row.label === "Session" ||
          row.label === "Step-up" ||
          row.label === "Network" ||
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
    setBusy(true);
    setStatusNote(null);
    const result = await validateToken(rawToken, {
      persistOnSuccess: true,
      elevate: true,
    });
    setBusy(false);
    setStatusNote(
      result === "ok"
        ? "Step-up refreshed."
        : result === "rate_limited"
          ? "Revalidation is rate limited."
          : result === "server_error"
            ? "Runtime could not refresh privilege."
            : result === "unreachable"
              ? "Runtime unreachable."
              : "Token rejected.",
    );
    await loadDiagnostics();
  }, [loadDiagnostics]);

  return (
    <OpsField title={title} detail={detail} tone="muted" compact={compact}>
      <div className="nexus-trust-operations">
        <div className="nexus-trust-operations__badges">
          {summaryRows.map((row) => (
            <ShellBadge key={row.label} tone="muted">
              {(SUMMARY_LABELS[row.label] ?? row.label) + " · " + row.value}
            </ShellBadge>
          ))}
        </div>
        <details className="nexus-surface-disclosure nexus-trust-operations__details">
          <summary>Expand trust posture</summary>
          <div className="nexus-surface-disclosure__body">
            <div className="nexus-trust-operations__grid">
              {trustRows.map((row) => (
                <div key={row.label} className="nexus-trust-operations__row">
                  <span className="nexus-trust-operations__label">{row.label}</span>
                  <span className="nexus-trust-operations__value">{row.value}</span>
                </div>
              ))}
            </div>
            <div className="nexus-trust-operations__grid nexus-trust-operations__grid--actions">
              {actionRows.map((row) => (
                <div key={row.label} className="nexus-trust-operations__row">
                  <span className="nexus-trust-operations__label">{row.label}</span>
                  <span className="nexus-trust-operations__value">{row.value}</span>
                </div>
              ))}
            </div>
            <div className="nexus-trust-operations__footer">
              <ShellButton onClick={handleRevalidate} disabled={busy}>
                {busy ? "Refreshing" : "Refresh access"}
              </ShellButton>
              {statusNote ? (
                <span className="nexus-trust-operations__note">{statusNote}</span>
              ) : null}
            </div>
          </div>
        </details>
      </div>
    </OpsField>
  );
}
