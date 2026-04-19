"use client";

import type { AutoModeJob } from "@/lib/autoOpsJobs";

interface Props {
  profileLabel: string;
  modeEnabled: boolean;
  modeJobs: AutoModeJob[];
  autoOpsLastRunAt?: Record<string, number>;
  cooldownMs: number;
  now: number;
  nextSlotLabel: (intervalMin: number) => string;
  fmtRemaining: (ms: number) => string;
  onTriggerAutoJob: (jobId: string, force?: boolean) => void;
}

export default function CronSchedulerAutoOpsSection({
  profileLabel,
  modeEnabled,
  modeJobs,
  autoOpsLastRunAt,
  cooldownMs,
  now,
  nextSlotLabel,
  fmtRemaining,
  onTriggerAutoJob,
}: Props) {
  return (
    <div
      style={{
        padding: "9px 12px",
        borderBottom: "1px solid #1A2040",
        display: "grid",
        gap: 8,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ color: "#f59e0b", fontWeight: 800, fontSize: 11 }}>
          AUTO OPS PREVIEW
        </span>
        <span style={{ color: "#6875a0", fontSize: 10 }}>
          Mode: {profileLabel}
        </span>
        <span
          style={{
            marginLeft: "auto",
            color: modeEnabled ? "#10b981" : "#ef4444",
            fontSize: 10,
            fontWeight: 700,
          }}
        >
          {modeEnabled ? "ARMED" : "DISARMED"}
        </span>
      </div>
      {modeJobs.length === 0 ? (
        <div style={{ color: "#6875a0", fontSize: 11 }}>
          No mode auto-jobs in this profile.
        </div>
      ) : (
        modeJobs.map((job) => {
          const last = autoOpsLastRunAt?.[job.id] ?? 0;
          const remaining = Math.max(0, cooldownMs - (now - last));
          return (
            <div
              key={job.id}
              style={{
                border: "1px solid #1A2040",
                borderRadius: 8,
                background: "#080d18",
                padding: "8px 10px",
                display: "grid",
                gap: 4,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span
                  style={{
                    color: "#ccd6f6",
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                >
                  {job.name}
                </span>
                <span
                  style={{
                    marginLeft: "auto",
                    color: "#00DDFF",
                    fontSize: 10,
                    fontFamily: "monospace",
                  }}
                >
                  every {job.intervalMin}m
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  fontSize: 10,
                  flexWrap: "wrap",
                }}
              >
                <span style={{ color: "#8892b0" }}>
                  Next slot: {nextSlotLabel(job.intervalMin)}
                </span>
                <span style={{ color: "#8892b0" }}>
                  Cooldown: {fmtRemaining(remaining)}
                </span>
                <span style={{ color: last ? "#6875a0" : "#304060" }}>
                  Last run:{" "}
                  {last
                    ? new Date(last).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "never"}
                </span>
              </div>
              <div style={{ display: "flex", gap: 6, marginTop: 2 }}>
                <button
                  onClick={() => onTriggerAutoJob(job.id, false)}
                  disabled={!modeEnabled || remaining > 0}
                  style={{
                    borderRadius: 6,
                    border: "1px solid #00DDFF55",
                    background:
                      modeEnabled && remaining <= 0
                        ? "rgba(0,221,255,0.12)"
                        : "rgba(26,32,64,0.2)",
                    color:
                      modeEnabled && remaining <= 0 ? "#00DDFF" : "#6875a0",
                    padding: "4px 8px",
                    cursor:
                      modeEnabled && remaining <= 0 ? "pointer" : "not-allowed",
                    fontSize: 10,
                    fontWeight: 700,
                  }}
                >
                  Run now
                </button>
                <button
                  onClick={() => onTriggerAutoJob(job.id, true)}
                  disabled={!modeEnabled}
                  style={{
                    borderRadius: 6,
                    border: "1px solid rgba(245,158,11,.45)",
                    background: modeEnabled
                      ? "rgba(245,158,11,.12)"
                      : "rgba(26,32,64,0.2)",
                    color: modeEnabled ? "#f59e0b" : "#6875a0",
                    padding: "4px 8px",
                    cursor: modeEnabled ? "pointer" : "not-allowed",
                    fontSize: 10,
                    fontWeight: 700,
                  }}
                  title="Force run (bypass cooldown)"
                >
                  Force
                </button>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
