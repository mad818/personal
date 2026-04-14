"use client";

import { SurfaceCallout, SurfaceSkeletonRows } from "@/components/ui/surfacePrimitives";
import { ShellBadge } from "@/components/ui/shell";
import { useBrowserOpsReadiness } from "@/hooks/useBrowserOpsReadiness";

function formatState(value: "standby" | "companion_ready" | "not_configured") {
  switch (value) {
    case "companion_ready":
      return "Companion ready";
    case "not_configured":
      return "Optional companion";
    default:
      return "Guarded standby";
  }
}

export default function BrowserOpsReadinessCard() {
  const { snapshot, loading, loadError } = useBrowserOpsReadiness();

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surf2)] p-3 text-xs">
      <div className="flex items-center justify-between gap-2 text-[var(--text2)]">
        <span className="font-mono font-semibold tracking-wider">
          BROWSER OPS
        </span>
        {snapshot ? (
          <span className="text-[9px] text-[var(--text3)]">
            {formatState(snapshot.state)}
          </span>
        ) : null}
      </div>

      <div className="mt-3 flex flex-col gap-3">
        {loading && !snapshot ? <SurfaceSkeletonRows rows={2} height={18} /> : null}

        {snapshot ? (
          <SurfaceCallout
            tone={snapshot.state === "companion_ready" ? "success" : "info"}
            compact
            icon="◎"
            title={
              snapshot.state === "companion_ready"
                ? "Guarded browser companion staged"
                : "Protected recon routes stay primary"
            }
            description={snapshot.reason}
          />
        ) : null}

        {loadError ? (
          <SurfaceCallout
            tone="warning"
            compact
            icon="↺"
            title="Readiness unavailable"
            description={loadError}
          />
        ) : null}

        {snapshot ? (
          <>
            <div className="grid grid-cols-2 gap-2 text-[10px] sm:grid-cols-4">
              <div className="rounded-md border border-[var(--border)] bg-[var(--surf)] px-2 py-1.5">
                <div className="text-[var(--text3)]">Execution lane</div>
                <div className="mt-1 font-mono text-[var(--text)]">
                  {snapshot.mode === "lightpanda_companion" ? "Companion" : "Protected"}
                </div>
              </div>
              <div className="rounded-md border border-[var(--border)] bg-[var(--surf)] px-2 py-1.5">
                <div className="text-[var(--text3)]">Guarded routes</div>
                <div className="mt-1 font-mono text-[var(--text)]">
                  {snapshot.guardedRouteCount}
                </div>
              </div>
              <div className="rounded-md border border-[var(--border)] bg-[var(--surf)] px-2 py-1.5">
                <div className="text-[var(--text3)]">Network mode</div>
                <div className="mt-1 font-mono text-[var(--text)]">
                  {snapshot.networkMode}
                </div>
              </div>
              <div className="rounded-md border border-[var(--border)] bg-[var(--surf)] px-2 py-1.5">
                <div className="text-[var(--text3)]">Approval</div>
                <div className="mt-1 font-mono text-[var(--text)]">
                  {snapshot.requiresApproval ? "Required" : "Open"}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5">
              <ShellBadge tone={snapshot.guardedRoutes.lookup ? "success" : "muted"}>
                Lookup
              </ShellBadge>
              <ShellBadge tone={snapshot.guardedRoutes.passiveDns ? "success" : "muted"}>
                Passive DNS
              </ShellBadge>
              <ShellBadge tone={snapshot.guardedRoutes.torCheck ? "success" : "muted"}>
                OPSEC
              </ShellBadge>
              <ShellBadge tone={snapshot.guardedRoutes.sweeps ? "success" : "muted"}>
                Sweeps
              </ShellBadge>
              {snapshot.endpointLabel ? (
                <ShellBadge tone="muted">{snapshot.endpointLabel}</ShellBadge>
              ) : null}
            </div>

            <div className="text-[10px] leading-5 text-[var(--text3)]">
              {snapshot.windowsNote}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
