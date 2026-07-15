"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch, type TokenValidationStatus } from "@/lib/apiFetch";
import { useProviderHealthPosture } from "@/hooks/useProviderHealthPosture";
import { StepUpAccessDialog } from "@/components/ui/ActionDialog";
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
  Isolation: "Iso",
  "External tools": "Tools",
  Privacy: "Shield",
  Providers: "Lane",
};

export default function TrustPostureStrip() {
  const { posture } = useProviderHealthPosture();
  const privacyShieldStatus = useStore((s) => s.privacyShieldStatus);
  const [diagnostics, setDiagnostics] =
    useState<TrustDiagnosticsPayload | null>(null);
  const [stepUpOpen, setStepUpOpen] = useState(false);
  const [revalidateNote, setRevalidateNote] = useState<string | null>(null);

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
      // Silent degradation keeps the strip compact and non-blocking.
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

  const trustRows = useMemo(() => {
    return buildTrustPostureRows({
      diagnostics,
      providerPosture: posture,
      privacyShieldStatus,
    });
  }, [diagnostics, posture, privacyShieldStatus]);

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
          row.label === "High-risk" ||
          row.label === "External tools" ||
          row.label === "Privacy",
      ),
    [trustRows],
  );

  const handleRevalidate = useCallback(() => {
    setRevalidateNote(null);
    setStepUpOpen(true);
  }, []);

  const handleRevalidationResult = useCallback(
    (_status: TokenValidationStatus, message: string) => {
      setRevalidateNote(message);
      return loadDiagnostics();
    },
    [loadDiagnostics],
  );

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
          <ShellButton onClick={handleRevalidate}>Recheck</ShellButton>
          {revalidateNote ? (
            <span
              role="status"
              aria-live="polite"
              className="nexus-trust-strip__note"
            >
              {revalidateNote}
            </span>
          ) : null}
        </div>
      </div>
      <StepUpAccessDialog
        open={stepUpOpen}
        onClose={() => setStepUpOpen(false)}
        onResult={handleRevalidationResult}
      />
    </details>
  );
}
