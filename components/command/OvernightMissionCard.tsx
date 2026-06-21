"use client";

import { useMemo } from "react";
import { overnightMissionStatusColor } from "@/lib/designTokens";
import { useStore } from "@/store/useStore";
import { buildOvernightMissionBrief } from "@/lib/overnightMissionHandoff";

function statusColor(status: string): string {
  return overnightMissionStatusColor(status);
}

export default function OvernightMissionCard() {
  const scheduledJobs = useStore((s) => s.settings.scheduledJobs);
  const brief = useMemo(
    () => buildOvernightMissionBrief(scheduledJobs),
    [scheduledJobs],
  );

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        background: "var(--surf)",
        border: "1px solid var(--border)",
        borderRadius: "10px",
        padding: "12px",
      }}
    >
      <div>
        <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--text)" }}>
          Overnight mission handoff
        </div>
        <div style={{ fontSize: "10px", color: "var(--text3)", marginTop: "2px" }}>
          gnhf pattern — bounded missions with morning re-entry
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(96px, 1fr))",
          gap: "6px",
        }}
      >
        {[
          { label: "Armed", value: brief.activeMissions },
          { label: "Review", value: brief.pendingReview },
          { label: "Expired", value: brief.expired },
          { label: "Cleared", value: brief.cleared },
        ].map((stat) => (
          <div
            key={stat.label}
            style={{
              background: "var(--surf2)",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              padding: "8px 10px",
            }}
          >
            <div style={{ fontSize: "9px", color: "var(--text3)" }}>{stat.label}</div>
            <div
              style={{
                marginTop: "4px",
                fontSize: "13px",
                fontWeight: 700,
                color: "var(--text)",
              }}
            >
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          fontSize: "10px",
          color: "var(--text2)",
          lineHeight: 1.5,
          background: "var(--surf2)",
          border: "1px solid var(--border)",
          borderRadius: "8px",
          padding: "8px 10px",
        }}
      >
        {brief.morningReentry}
      </div>

      {brief.lines.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {brief.lines.slice(0, 3).map((line) => (
            <div
              key={line.jobId}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "8px",
                fontSize: "10px",
                color: "var(--text3)",
              }}
            >
              <span style={{ color: "var(--text)" }}>{line.jobName}</span>
              <span style={{ color: statusColor(line.status), fontWeight: 700 }}>
                {line.status.replaceAll("_", " ")}
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
