"use client";

import {
  areSchedulerAuditFiltersEqual,
  DEFAULT_SCHEDULER_AUDIT_FILTERS,
  SCHEDULER_AUDIT_FILTER_PRESETS,
  type SchedulerAuditFilters,
} from "@/lib/schedulerGovernance";

interface Props {
  auditFilters: SchedulerAuditFilters;
  hasActiveAuditFilters: boolean;
  auditMsg: string;
  onSetAuditFilters: (
    next:
      | SchedulerAuditFilters
      | ((current: SchedulerAuditFilters) => SchedulerAuditFilters),
  ) => void;
}

export default function CronSchedulerAuditFiltersSection({
  auditFilters,
  hasActiveAuditFilters,
  auditMsg,
  onSetAuditFilters,
}: Props) {
  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        {SCHEDULER_AUDIT_FILTER_PRESETS.map((preset) => {
          const active = areSchedulerAuditFiltersEqual(auditFilters, preset.filters);
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => onSetAuditFilters({ ...preset.filters })}
              style={{
                borderRadius: 999,
                border: active
                  ? "1px solid rgba(0,221,255,.38)"
                  : "1px solid #1A2040",
                background: active ? "rgba(0,221,255,.12)" : "#0a1120",
                color: active ? "#00DDFF" : "#cbd5e1",
                padding: "4px 10px",
                cursor: "pointer",
                fontSize: 10,
                fontWeight: 700,
              }}
            >
              {preset.label}
            </button>
          );
        })}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <select
          value={auditFilters.lane}
          onChange={(event) =>
            onSetAuditFilters((current) => ({
              ...current,
              lane: event.target.value as SchedulerAuditFilters["lane"],
            }))
          }
          style={{
            background: "#080d18",
            border: "1px solid #1A2040",
            borderRadius: 6,
            color: "#ccd6f6",
            padding: "4px 8px",
            fontSize: 10,
          }}
        >
          <option value="all">All lanes</option>
          <option value="single_run">Single run</option>
          <option value="internal_batch">Internal batch</option>
          <option value="provider_native_batch">Provider-native batch</option>
        </select>
        <select
          value={auditFilters.status}
          onChange={(event) =>
            onSetAuditFilters((current) => ({
              ...current,
              status: event.target.value as SchedulerAuditFilters["status"],
            }))
          }
          style={{
            background: "#080d18",
            border: "1px solid #1A2040",
            borderRadius: 6,
            color: "#ccd6f6",
            padding: "4px 8px",
            fontSize: 10,
          }}
        >
          <option value="all">All outcomes</option>
          <option value="ok">OK only</option>
          <option value="error">Errors only</option>
        </select>
        <select
          value={auditFilters.window}
          onChange={(event) =>
            onSetAuditFilters((current) => ({
              ...current,
              window: event.target.value as SchedulerAuditFilters["window"],
            }))
          }
          style={{
            background: "#080d18",
            border: "1px solid #1A2040",
            borderRadius: 6,
            color: "#ccd6f6",
            padding: "4px 8px",
            fontSize: 10,
          }}
        >
          <option value="all">All time</option>
          <option value="24h">Last 24h</option>
          <option value="7d">Last 7d</option>
        </select>
        {hasActiveAuditFilters ? (
          <button
            type="button"
            onClick={() => onSetAuditFilters({ ...DEFAULT_SCHEDULER_AUDIT_FILTERS })}
            style={{
              borderRadius: 6,
              border: "1px solid rgba(79,110,247,.3)",
              background: "rgba(79,110,247,.08)",
              color: "#9fb7ff",
              padding: "4px 8px",
              cursor: "pointer",
              fontSize: 10,
              fontWeight: 700,
            }}
          >
            Reset filters
          </button>
        ) : null}
      </div>
      {auditMsg ? (
        <div style={{ color: "#9fb7ff", fontSize: 10 }}>{auditMsg}</div>
      ) : null}
    </>
  );
}
