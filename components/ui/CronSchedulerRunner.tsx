"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { useStore, type ScheduledJob } from "@/store/useStore";
import { buildCachedSystemPrompt, callNonInteractiveAI } from "@/lib/ai";
import { OFFICE_OPERATIONAL_PROFILES } from "@/components/home/office/constants";
import {
  getAutoJobsForMode,
  isAutoOpsModeEnabled,
  type AutoModeJob,
} from "@/lib/autoOpsJobs";
import { apiFetch } from "@/lib/apiFetch";

function fieldMatches(expr: string, value: number): boolean {
  const part = expr.trim();
  if (part === "*") return true;
  if (part.startsWith("*/")) {
    const step = Number(part.slice(2));
    return Number.isFinite(step) && step > 0 ? value % step === 0 : false;
  }
  if (part.includes(",")) {
    return part.split(",").some((p) => fieldMatches(p, value));
  }
  if (part.includes("-")) {
    const [a, b] = part.split("-").map(Number);
    return Number.isFinite(a) && Number.isFinite(b) && value >= a && value <= b;
  }
  const n = Number(part);
  return Number.isFinite(n) ? n === value : false;
}

function cronMatches(cron: string, d: Date): boolean {
  const parts = cron.trim().split(/\s+/);
  if (parts.length !== 5) return false;
  const [min, hour, dom, mon, dow] = parts;
  return (
    fieldMatches(min, d.getMinutes()) &&
    fieldMatches(hour, d.getHours()) &&
    fieldMatches(dom, d.getDate()) &&
    fieldMatches(mon, d.getMonth() + 1) &&
    fieldMatches(dow, d.getDay())
  );
}

function shouldRunNow(job: ScheduledJob, now: Date): boolean {
  if (!job.enabled) return false;
  if (!cronMatches(job.cron, now)) return false;
  if (!job.lastRunAt) return true;
  const last = new Date(job.lastRunAt);
  const sameMinute =
    last.getFullYear() === now.getFullYear() &&
    last.getMonth() === now.getMonth() &&
    last.getDate() === now.getDate() &&
    last.getHours() === now.getHours() &&
    last.getMinutes() === now.getMinutes();
  return !sameMinute;
}

export default function CronSchedulerRunner() {
  const settings = useStore((s) => s.settings);
  const updateSettings = useStore((s) => s.updateSettings);
  const addNotification = useStore((s) => s.addNotification);
  const addLog = useStore((s) => s.addLog);
  const addModeBriefing = useStore((s) => s.addModeBriefing);
  const busyRef = useRef(false);
  const autoLastRunRef = useRef<Record<string, number>>({});
  const mode = settings.officeOperationalMode ?? "normal";
  const profile = OFFICE_OPERATIONAL_PROFILES[mode];
  const autoCooldownMs =
    Math.max(10, Number(settings.autoOpsJobCooldownMin ?? 30)) * 60_000;
  const autoLastRunAt = useMemo(
    () => settings.autoOpsLastRunAt ?? {},
    [settings.autoOpsLastRunAt],
  );

  const runAutoJob = useCallback(
    async (autoJob: AutoModeJob, force = false) => {
      const last =
        autoLastRunRef.current[autoJob.id] ?? autoLastRunAt[autoJob.id] ?? 0;
      const inCooldown = Date.now() - last < autoCooldownMs;
      if (!force && inCooldown) return;

      let autoStatus: ScheduledJob["lastStatus"] = "ok";
      let autoSummary = "Completed.";
      try {
        const systemPrompt = buildCachedSystemPrompt(settings);
        const result = await callNonInteractiveAI({
          systemPrompt,
          userPrompt: `${profile.promptPrefix}\n\n[Mode Auto Job: ${autoJob.name}]\n${autoJob.prompt}`,
          maxTokens: 260,
          task: "fast",
          singleFlightKey: `auto:${mode}:${autoJob.id}:${Math.floor(Date.now() / 60000)}`,
        });
        autoSummary = (result || "Completed with no output.").slice(0, 200);
      } catch (e) {
        autoStatus = "error";
        autoSummary =
          e instanceof Error
            ? e.message.slice(0, 200)
            : "Mode auto job failed.";
      }

      const autoRunAt = Date.now();
      autoLastRunRef.current[autoJob.id] = autoRunAt;
      const nextAutoLast = { ...autoLastRunAt, [autoJob.id]: autoRunAt };
      addLog({
        type: "system",
        text: `${profile.label} auto "${autoJob.name}" ${autoStatus === "ok" ? "ran" : "failed"}: ${autoSummary}`,
        color: autoStatus === "ok" ? "#10b981" : "#ef4444",
      });
      const relatedTab =
        mode === "war" ? "cyber" : mode === "nightOps" ? "security" : "intel";
      addModeBriefing({
        mode,
        jobId: autoJob.id,
        jobName: autoJob.name,
        status: autoStatus,
        summary: autoSummary,
        relatedTab,
      });

      const notifySuccess = profile.noisySuccessAlerts;
      if (autoStatus !== "ok" || notifySuccess || force) {
        addNotification({
          type: "system",
          severity: autoStatus === "ok" ? "low" : "high",
          title: `Mode Auto Job ${autoStatus === "ok" ? "Complete" : "Failed"}`,
          message: `${autoJob.name}: ${autoSummary}`,
          source: `Auto Ops (${profile.label})`,
        });
      }

      // Night Ops handoff writeback for morning review.
      if (mode === "nightOps" && autoStatus === "ok") {
        const handoff = [
          `# Night Ops Handoff`,
          ``,
          `Generated: ${new Date().toISOString()}`,
          `Job: ${autoJob.name}`,
          `Mode: ${profile.label}`,
          ``,
          `## Summary`,
          autoSummary,
          ``,
        ].join("\n");
        try {
          await apiFetch("/api/tools", {
            method: "POST",
            body: JSON.stringify({
              tool: "write_file",
              input: {
                filename: "night-ops-handoff-latest.md",
                content: handoff,
              },
            }),
          });
        } catch {
          // Silent fail by design; runtime briefings still captured in-app.
        }
      }
      updateSettings({ autoOpsLastRunAt: nextAutoLast });
    },
    [
      addLog,
      addModeBriefing,
      addNotification,
      autoCooldownMs,
      autoLastRunAt,
      mode,
      profile,
      settings,
      updateSettings,
    ],
  );

  const dueAutoJobs = useCallback(
    (now: Date): AutoModeJob[] => {
      if (!isAutoOpsModeEnabled(mode, settings)) return [];
      return getAutoJobsForMode(mode).filter((j) => {
        const last = autoLastRunRef.current[j.id] ?? autoLastRunAt[j.id] ?? 0;
        const enoughCooldown = Date.now() - last >= autoCooldownMs;
        const onInterval = now.getMinutes() % j.intervalMin === 0;
        return enoughCooldown && onInterval;
      });
    },
    [autoCooldownMs, autoLastRunAt, mode, settings],
  );

  useEffect(() => {
    const tick = async () => {
      if (busyRef.current) return;
      const jobs = settings.scheduledJobs ?? [];
      const now = new Date();
      const due = jobs.filter((j) => shouldRunNow(j, now));
      const dueAuto = dueAutoJobs(now);
      if (!due.length && !dueAuto.length) return;

      busyRef.current = true;
      try {
        let nextJobs = [...jobs];
        for (const job of due) {
          if (profile.noisySuccessAlerts) {
            addNotification({
              type: "system",
              severity: "low",
              title: `Scheduled Job: ${job.name}`,
              message: `Started recurring task (${profile.label}).`,
              source: "Cron Scheduler",
            });
          }

          let status: ScheduledJob["lastStatus"] = "ok";
          let summary = "Completed.";
          try {
            const systemPrompt = buildCachedSystemPrompt(settings);
            const result = await callNonInteractiveAI({
              systemPrompt,
              userPrompt: `${profile.promptPrefix}\n\n[Scheduled Task]\n${job.prompt}`,
              maxTokens: 300,
              task: "fast",
              singleFlightKey: `scheduled:${job.id}:${Math.floor(Date.now() / 60000)}`,
            });
            summary = (result || "Completed with no output.").slice(0, 200);
          } catch (e) {
            status = "error";
            summary =
              e instanceof Error
                ? e.message.slice(0, 200)
                : "Scheduled task failed.";
          }

          const runAt = Date.now();
          nextJobs = nextJobs.map((j) =>
            j.id === job.id
              ? {
                  ...j,
                  lastRunAt: runAt,
                  lastStatus: status,
                  lastSummary: summary,
                }
              : j,
          );

          addLog({
            type: "system",
            text: `${profile.label} cron "${job.name}" ${status === "ok" ? "ran" : "failed"}: ${summary}`,
            color: status === "ok" ? "#10b981" : "#ef4444",
          });
          if (status !== "ok" || profile.noisySuccessAlerts) {
            addNotification({
              type: "system",
              severity: status === "ok" ? "low" : "high",
              title: `Scheduled Job ${status === "ok" ? "Complete" : "Failed"}`,
              message: `${job.name}: ${summary}`,
              source: `Cron Scheduler (${profile.label})`,
            });
          }
        }
        // Strict rate limit: run at most one auto job per tick.
        if (dueAuto.length > 0) await runAutoJob(dueAuto[0], false);
        updateSettings({ scheduledJobs: nextJobs });
      } finally {
        busyRef.current = false;
      }
    };

    const onManualRun = (e: Event) => {
      const ev = e as CustomEvent<{ jobId?: string; force?: boolean }>;
      const jobId = ev.detail?.jobId ?? "";
      const force = Boolean(ev.detail?.force);
      if (!jobId) return;
      const job = getAutoJobsForMode(mode).find((j) => j.id === jobId);
      if (!job) return;
      if (busyRef.current) return;
      busyRef.current = true;
      void runAutoJob(job, force).finally(() => {
        busyRef.current = false;
      });
    };

    void tick();
    window.addEventListener(
      "nexus-auto-ops-run-now",
      onManualRun as EventListener,
    );
    const id = window.setInterval(() => void tick(), profile.schedulerTickMs);
    return () => {
      window.removeEventListener(
        "nexus-auto-ops-run-now",
        onManualRun as EventListener,
      );
      window.clearInterval(id);
    };
  }, [
    settings,
    updateSettings,
    addNotification,
    addLog,
    addModeBriefing,
    profile,
    mode,
    autoCooldownMs,
    autoLastRunAt,
    dueAutoJobs,
    runAutoJob,
  ]);

  return null;
}
