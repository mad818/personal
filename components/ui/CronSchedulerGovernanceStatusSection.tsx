"use client";

import type { ScheduledJob } from "@/store/useStore";
import CompactOperatorNote from "@/components/ui/CompactOperatorNote";
import SchedulerGovernanceCard from "@/components/ui/SchedulerGovernanceCard";
import type { NativeBatchPostureState } from "@/components/ui/cronSchedulerPanelUtils";

interface Props {
  jobs: ScheduledJob[];
  nativeBatchPosture: NativeBatchPostureState;
  onCopySchedulerAudit: () => void;
  onExportSchedulerAudit: () => void;
}

export default function CronSchedulerGovernanceStatusSection({
  jobs,
  nativeBatchPosture,
  onCopySchedulerAudit,
  onExportSchedulerAudit,
}: Props) {
  return (
    <>
      <CompactOperatorNote
        label="NATIVE BATCH POSTURE"
        tone={nativeBatchPosture.nativeReady ? "positive" : "info"}
        summary={
          nativeBatchPosture.loading
            ? "Checking whether provider-native batch execution is available for queued missions."
            : nativeBatchPosture.nativeReady
              ? "Anthropic native batching is ready. Queued provider-native missions can run when that optional lane is allowed."
              : "Internal fallback batching remains the active path. Free-first scheduling stays on the local/default lane unless paid provider posture is explicitly enabled."
        }
        detail={nativeBatchPosture.reason}
      >
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          <span style={{ color: "#6875a0", fontSize: 10 }}>
            feature {nativeBatchPosture.featureEnabled ? "on" : "off"}
          </span>
          <span style={{ color: "#6875a0", fontSize: 10 }}>
            paid APIs{" "}
            {nativeBatchPosture.paidApisAllowed ? "allowed" : "blocked"}
          </span>
          <span style={{ color: "#6875a0", fontSize: 10 }}>
            anthropic key{" "}
            {nativeBatchPosture.apiKeyConfigured ? "configured" : "missing"}
          </span>
        </div>
      </CompactOperatorNote>
      <CompactOperatorNote
        label="SCHEDULER GOVERNANCE"
        tone="info"
        summary="Audit export, saved views, and recent-run review stay local to this drawer without adding backend state."
      />
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          flexWrap: "wrap",
        }}
      >
        <button
          type="button"
          onClick={onCopySchedulerAudit}
          style={{
            borderRadius: 6,
            border: "1px solid rgba(0,221,255,.35)",
            background: "rgba(0,221,255,.1)",
            color: "#00DDFF",
            padding: "4px 8px",
            cursor: "pointer",
            fontSize: 10,
            fontWeight: 700,
          }}
        >
          Copy audit
        </button>
        <button
          type="button"
          onClick={onExportSchedulerAudit}
          style={{
            borderRadius: 6,
            border: "1px solid #1A2040",
            background: "#0a1120",
            color: "#cbd5e1",
            padding: "4px 8px",
            cursor: "pointer",
            fontSize: 10,
            fontWeight: 700,
          }}
        >
          Export audit
        </button>
        <span style={{ color: "#6875a0", fontSize: 10 }}>
          Use saved views for recurring slices. Export only when a handoff needs
          to leave the drawer.
        </span>
      </div>
      <SchedulerGovernanceCard jobs={jobs} />
    </>
  );
}
