"use client";

import { useMemo, useState } from "react";
import { useStore, type ScheduledJob } from "@/store/useStore";
import { OFFICE_OPERATIONAL_PROFILES } from "@/components/home/office/constants";
import { getAutoJobsForMode, isAutoOpsModeEnabled } from "@/lib/autoOpsJobs";

interface Props {
  open: boolean;
  onClose: () => void;
}

const PRESET_CRONS = [
  { label: "Every 15 min", value: "*/15 * * * *" },
  { label: "Every hour", value: "0 * * * *" },
  { label: "Every day at 09:00", value: "0 9 * * *" },
  { label: "Every day at 18:00", value: "0 18 * * *" },
  { label: "Mon-Fri 08:30", value: "30 8 * * 1-5" },
];

function isValidCron(expr: string): boolean {
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) return false;
  return parts.every((p) => /^(\*|\d+|\*\/\d+|\d+-\d+|\d+(,\d+)*)$/.test(p));
}

export default function CronSchedulerPanel({ open, onClose }: Props) {
  const settings = useStore((s) => s.settings);
  const updateSettings = useStore((s) => s.updateSettings);
  const jobs = useMemo(
    () => settings.scheduledJobs ?? [],
    [settings.scheduledJobs],
  );

  const [name, setName] = useState("");
  const [prompt, setPrompt] = useState("");
  const [cron, setCron] = useState(PRESET_CRONS[0].value);
  const [error, setError] = useState("");

  const sortedJobs = useMemo(
    () =>
      [...jobs].sort((a, b) =>
        a.enabled === b.enabled ? 0 : a.enabled ? -1 : 1,
      ),
    [jobs],
  );

  const saveJobs = (next: ScheduledJob[]) =>
    updateSettings({ scheduledJobs: next });
  const mode = settings.officeOperationalMode ?? "normal";
  const profile = OFFICE_OPERATIONAL_PROFILES[mode];
  const modeJobs = getAutoJobsForMode(mode);
  const modeEnabled = isAutoOpsModeEnabled(mode, settings);
  const cooldownMs =
    Math.max(10, Number(settings.autoOpsJobCooldownMin ?? 30)) * 60_000;
  const now = Date.now();

  const fmtRemaining = (ms: number) => {
    if (ms <= 0) return "ready";
    const min = Math.ceil(ms / 60_000);
    return `${min}m`;
  };

  const triggerAutoJob = (jobId: string, force = false) => {
    window.dispatchEvent(
      new CustomEvent("nexus-auto-ops-run-now", {
        detail: { jobId, force },
      }),
    );
  };

  const nextSlotLabel = (intervalMin: number) => {
    const d = new Date();
    const cur = d.getMinutes();
    const add = intervalMin - (cur % intervalMin || intervalMin);
    d.setMinutes(cur + add, 0, 0);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const addJob = () => {
    setError("");
    const trimmedName = name.trim();
    const trimmedPrompt = prompt.trim();
    const trimmedCron = cron.trim();
    if (!trimmedName || !trimmedPrompt) {
      setError("Name and task prompt are required.");
      return;
    }
    if (!isValidCron(trimmedCron)) {
      setError('Cron format is invalid. Use 5 fields, e.g. "*/15 * * * *".');
      return;
    }
    const next: ScheduledJob = {
      id: `job-${Date.now()}`,
      name: trimmedName,
      prompt: trimmedPrompt,
      cron: trimmedCron,
      enabled: true,
    };
    saveJobs([next, ...jobs]);
    setName("");
    setPrompt("");
    setCron(PRESET_CRONS[0].value);
  };

  const toggleJob = (id: string) => {
    saveJobs(
      jobs.map((j) => (j.id === id ? { ...j, enabled: !j.enabled } : j)),
    );
  };

  const removeJob = (id: string) => {
    saveJobs(jobs.filter((j) => j.id !== id));
  };

  if (!open) return null;

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(7,8,13,0.65)",
          zIndex: 500,
        }}
      />
      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: "min(500px, 96vw)",
          background: "#0a0f1e",
          borderLeft: "1px solid #1A2040",
          zIndex: 501,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            padding: "10px 12px",
            borderBottom: "1px solid #1A2040",
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <span
            style={{
              color: "#00DDFF",
              fontWeight: 900,
              letterSpacing: ".08em",
              fontSize: 11,
            }}
          >
            CRON SCHEDULER
          </span>
          <span style={{ color: "#304060", fontSize: 10 }}>
            {jobs.filter((j) => j.enabled).length} active
          </span>
          <button
            onClick={onClose}
            style={{
              marginLeft: "auto",
              background: "none",
              border: "1px solid #1A2040",
              color: "#6875a0",
              borderRadius: 4,
              padding: "2px 7px",
              cursor: "pointer",
            }}
          >
            ✕
          </button>
        </div>

        <div
          style={{
            padding: "10px 12px",
            borderBottom: "1px solid #1A2040",
            display: "grid",
            gap: 8,
          }}
        >
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Job name (e.g. Morning macro brief)"
            style={{
              background: "#080d18",
              border: "1px solid #1A2040",
              borderRadius: 6,
              color: "#ccd6f6",
              padding: "7px 10px",
            }}
          />
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Task prompt (what should run on schedule)"
            rows={3}
            style={{
              background: "#080d18",
              border: "1px solid #1A2040",
              borderRadius: 6,
              color: "#ccd6f6",
              padding: "7px 10px",
              resize: "vertical",
            }}
          />
          <div style={{ display: "flex", gap: 8 }}>
            <select
              value={cron}
              onChange={(e) => setCron(e.target.value)}
              style={{
                flex: 1,
                background: "#080d18",
                border: "1px solid #1A2040",
                borderRadius: 6,
                color: "#ccd6f6",
                padding: "7px 10px",
              }}
            >
              {PRESET_CRONS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
            <button
              onClick={addJob}
              style={{
                background: "rgba(0,221,255,0.1)",
                border: "1px solid #00DDFF55",
                color: "#00DDFF",
                borderRadius: 6,
                padding: "0 12px",
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              ADD
            </button>
          </div>
          <input
            value={cron}
            onChange={(e) => setCron(e.target.value)}
            placeholder="Cron expression (minute hour day month weekday)"
            style={{
              background: "#080d18",
              border: "1px solid #1A2040",
              borderRadius: 6,
              color: "#ccd6f6",
              padding: "7px 10px",
              fontFamily: "monospace",
            }}
          />
          {error ? (
            <div style={{ color: "#ef4444", fontSize: 11 }}>{error}</div>
          ) : null}
        </div>

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
              Mode: {profile.label}
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
            modeJobs.map((j) => {
              const last = settings.autoOpsLastRunAt?.[j.id] ?? 0;
              const remaining = Math.max(0, cooldownMs - (now - last));
              return (
                <div
                  key={j.id}
                  style={{
                    border: "1px solid #1A2040",
                    borderRadius: 8,
                    background: "#080d18",
                    padding: "8px 10px",
                    display: "grid",
                    gap: 4,
                  }}
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
                    <span
                      style={{
                        color: "#ccd6f6",
                        fontSize: 11,
                        fontWeight: 700,
                      }}
                    >
                      {j.name}
                    </span>
                    <span
                      style={{
                        marginLeft: "auto",
                        color: "#00DDFF",
                        fontSize: 10,
                        fontFamily: "monospace",
                      }}
                    >
                      every {j.intervalMin}m
                    </span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      fontSize: 10,
                    }}
                  >
                    <span style={{ color: "#8892b0" }}>
                      Next slot: {nextSlotLabel(j.intervalMin)}
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
                      onClick={() => triggerAutoJob(j.id, false)}
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
                          modeEnabled && remaining <= 0
                            ? "pointer"
                            : "not-allowed",
                        fontSize: 10,
                        fontWeight: 700,
                      }}
                    >
                      Run now
                    </button>
                    <button
                      onClick={() => triggerAutoJob(j.id, true)}
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

        <div
          style={{
            padding: "9px 12px",
            overflowY: "auto",
            display: "grid",
            gap: 8,
          }}
        >
          {sortedJobs.length === 0 ? (
            <div
              style={{
                color: "#6875a0",
                textAlign: "center",
                padding: "22px 8px",
              }}
            >
              No scheduled jobs yet.
            </div>
          ) : (
            sortedJobs.map((job) => (
              <div
                key={job.id}
                style={{
                  border: `1px solid ${job.enabled ? "#00DDFF33" : "#1A2040"}`,
                  borderRadius: 8,
                  background: "#080d18",
                  padding: "10px 12px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div
                    style={{ color: "#ccd6f6", fontWeight: 700, fontSize: 12 }}
                  >
                    {job.name}
                  </div>
                  <span
                    style={{
                      marginLeft: "auto",
                      color: job.enabled ? "#10b981" : "#6875a0",
                      fontSize: 10,
                      fontWeight: 700,
                    }}
                  >
                    {job.enabled ? "ENABLED" : "DISABLED"}
                  </span>
                </div>
                <div
                  style={{
                    color: "#8892b0",
                    fontSize: 11,
                    marginTop: 4,
                    lineHeight: 1.45,
                  }}
                >
                  {job.prompt}
                </div>
                <div
                  style={{
                    marginTop: 6,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <span
                    style={{
                      fontFamily: "monospace",
                      color: "#00DDFF",
                      fontSize: 11,
                    }}
                  >
                    {job.cron}
                  </span>
                  {job.lastRunAt ? (
                    <span style={{ color: "#6875a0", fontSize: 10 }}>
                      Last run: {new Date(job.lastRunAt).toLocaleString()}
                    </span>
                  ) : (
                    <span style={{ color: "#304060", fontSize: 10 }}>
                      Never run
                    </span>
                  )}
                </div>
                <div style={{ marginTop: 8, display: "flex", gap: 6 }}>
                  <button
                    onClick={() => toggleJob(job.id)}
                    style={{
                      borderRadius: 6,
                      border: "1px solid #1A2040",
                      background: "transparent",
                      color: "#ccd6f6",
                      padding: "4px 8px",
                      cursor: "pointer",
                      fontSize: 10,
                    }}
                  >
                    {job.enabled ? "Disable" : "Enable"}
                  </button>
                  <button
                    onClick={() => removeJob(job.id)}
                    style={{
                      borderRadius: 6,
                      border: "1px solid rgba(239,68,68,.45)",
                      background: "rgba(239,68,68,.1)",
                      color: "#ef4444",
                      padding: "4px 8px",
                      cursor: "pointer",
                      fontSize: 10,
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
