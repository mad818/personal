"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch, type TokenValidationStatus } from "@/lib/apiFetch";
import { useProviderHealthPosture } from "@/hooks/useProviderHealthPosture";
import { StepUpAccessDialog } from "@/components/ui/ActionDialog";
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
  Isolation: "Iso",
  "External tools": "Tools",
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
  const [diagnostics, setDiagnostics] =
    useState<TrustDiagnosticsPayload | null>(null);
  const [stepUpOpen, setStepUpOpen] = useState(false);
  const [statusNote, setStatusNote] = useState<string | null>(null);

  const loadDiagnostics = useCallback(async (signal?: AbortSignal) => {
    try {
      const response = await apiFetch("/api/auth-diagnostics", {
        cache: "no-store",
        signal,
      });
      if (signal?.aborted) return;
      if (!response.ok) return;
      const payload = (await response
        .json()
        .catch(() => null)) as TrustDiagnosticsPayload | null;
      if (!payload) return;
      setDiagnostics(payload);
    } catch {
      // Silent degradation keeps route support rails non-blocking.
    }
  }, []);

  useEffect(() => {
    let active = true;
    let controller: AbortController | null = null;
    let timer: number | null = null;

    const refresh = () => {
      if (!active) return;
      if (typeof document !== "undefined" && document.hidden) return;
      controller?.abort();
      controller = new AbortController();
      void loadDiagnostics(controller.signal);
    };

    refresh();
    timer = window.setInterval(() => {
      refresh();
    }, 30000);
    const handleVisibility = () => {
      if (document.hidden) return;
      refresh();
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      active = false;
      controller?.abort();
      if (timer !== null) {
        window.clearInterval(timer);
      }
      document.removeEventListener("visibilitychange", handleVisibility);
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
          row.label === "High-risk" ||
          row.label === "Isolation" ||
          row.label === "External tools" ||
          row.label === "Privacy",
      ),
    [trustRows],
  );

  const handleRevalidate = useCallback(() => {
    setStatusNote(null);
    setStepUpOpen(true);
  }, []);

  const handleRevalidationResult = useCallback(
    (_status: TokenValidationStatus, message: string) => {
      setStatusNote(message);
      return loadDiagnostics();
    },
    [loadDiagnostics],
  );

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
                  <span className="nexus-trust-operations__label">
                    {row.label}
                  </span>
                  <span className="nexus-trust-operations__value">
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
            <div className="nexus-trust-operations__grid nexus-trust-operations__grid--actions">
              {actionRows.map((row) => (
                <div key={row.label} className="nexus-trust-operations__row">
                  <span className="nexus-trust-operations__label">
                    {row.label}
                  </span>
                  <span className="nexus-trust-operations__value">
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
            <div className="nexus-trust-operations__footer">
              <ShellButton onClick={handleRevalidate}>
                Refresh access
              </ShellButton>
              {statusNote ? (
                <span
                  role="status"
                  aria-live="polite"
                  className="nexus-trust-operations__note"
                >
                  {statusNote}
                </span>
              ) : null}
            </div>
          </div>
        </details>
        <StepUpAccessDialog
          open={stepUpOpen}
          onClose={() => setStepUpOpen(false)}
          onResult={handleRevalidationResult}
        />
      </div>
    </OpsField>
  );
}
