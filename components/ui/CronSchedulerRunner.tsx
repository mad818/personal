"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { useStore, type ScheduledJob } from "@/store/useStore";
import {
  buildCachedSystemPrompt,
  buildNonInteractiveBatchPrompt,
  buildScheduledMissionPromptParts,
  buildScheduledMissionSingleFlightKey,
  callNonInteractiveAIBatch,
  callNonInteractiveAI,
  callNonInteractiveAIWithMeta,
  pollAnthropicNativeBatch,
  submitAnthropicNativeBatch,
  type NonInteractivePromptParts,
} from "@/lib/ai";
import { OFFICE_OPERATIONAL_PROFILES } from "@/components/home/office/constants";
import {
  getAutoJobsForMode,
  isAutoOpsModeEnabled,
  type AutoModeJob,
} from "@/lib/autoOpsJobs";
import { apiFetch } from "@/lib/apiFetch";
import { getHQWorkflowCatalogItem } from "@/components/home/office/workflowCommands";
import { buildScheduledJobEfficiencySnapshot } from "@/lib/schedulerGovernance";
import { buildSchedulerEfficiencySourcePayload } from "@/lib/schedulerEfficiency";

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
  if (job.lastStatus === "queued" && job.pendingBatchId) return false;
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

const MAX_SCHEDULED_BATCH_SIZE = 3;
const MAX_SCHEDULED_BATCH_PROMPT_CHARS = 2200;
const MAX_NATIVE_BATCH_POLL_FAILURES = 3;

function isBatchEligibleScheduledJob(job: ScheduledJob): boolean {
  const approvalPolicy = job.approvalPolicy ?? "human_gate";
  return approvalPolicy !== "approve_on_write";
}

function buildScheduledBatchGroups(jobs: ScheduledJob[]): {
  batched: ScheduledJob[][];
  singles: ScheduledJob[];
} {
  const singles: ScheduledJob[] = [];
  const batched: ScheduledJob[][] = [];
  let current: ScheduledJob[] = [];
  let currentChars = 0;

  const flush = () => {
    if (current.length >= 2) {
      batched.push(current);
    } else if (current.length === 1) {
      singles.push(current[0]);
    }
    current = [];
    currentChars = 0;
  };

  for (const job of jobs) {
    const promptChars = job.prompt.trim().length;
    if (!isBatchEligibleScheduledJob(job) || promptChars > MAX_SCHEDULED_BATCH_PROMPT_CHARS) {
      flush();
      singles.push(job);
      continue;
    }
    const wouldOverflow =
      current.length >= MAX_SCHEDULED_BATCH_SIZE ||
      currentChars + promptChars > MAX_SCHEDULED_BATCH_PROMPT_CHARS;
    if (wouldOverflow) flush();
    current.push(job);
    currentChars += promptChars;
  }
  flush();

  return { batched, singles };
}

function buildPromptMeasurement(
  systemPrompt: string,
  promptParts: NonInteractivePromptParts,
) {
  const cacheablePrefixChars =
    promptParts.cacheStrategy === "system_plus_user_prefix"
      ? promptParts.cacheablePrefix?.length ?? 0
      : 0;
  return {
    systemPromptChars: systemPrompt.length,
    stablePrefixChars: systemPrompt.length + cacheablePrefixChars,
    volatilePromptChars:
      promptParts.cacheStrategy === "system_plus_user_prefix"
        ? promptParts.volatilePrompt.length
        : promptParts.fullPrompt.length,
  };
}

function getExecutionOriginMeta(
  lastEfficiency: ReturnType<typeof buildScheduledJobEfficiencySnapshot>,
): {
  executionOrigin: NonNullable<ScheduledJob["lastArtifactOrigin"]>;
  executionLabel: string;
  tags: readonly [
    NonNullable<ScheduledJob["lastArtifactOrigin"]>,
    ReturnType<typeof buildScheduledJobEfficiencySnapshot>["cacheStrategy"],
  ];
} {
  const executionOrigin =
    lastEfficiency.batchMode === "provider_native"
      ? "provider_native_batch"
      : lastEfficiency.batchMode === "internal"
        ? "internal_batch"
        : "single_run";
  const executionLabel =
    executionOrigin === "provider_native_batch"
      ? "provider-native batch"
      : executionOrigin === "internal_batch"
        ? "internal batch"
        : "single run";

  return {
    executionOrigin,
    executionLabel,
    tags: [executionOrigin, lastEfficiency.cacheStrategy] as const,
  };
}

function buildExecutionFeedDetail(input: {
  executionLabel: string;
  summary: string;
  outputTarget?: ScheduledJob["outputTarget"];
  wroteArtifact: boolean;
}) {
  const lane = `via ${input.executionLabel}`;
  const target =
    input.wroteArtifact && input.outputTarget && input.outputTarget !== "none"
      ? ` → ${input.outputTarget}`
      : "";
  return `${lane}${target}: ${input.summary}`;
}

function pushRecentExecution(
  existing: ScheduledJob["recentExecutions"],
  entry: NonNullable<ScheduledJob["recentExecutions"]>[number],
) {
  return [entry, ...(existing ?? [])].slice(0, 5);
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
    const payload = buildSchedulerEfficiencySourcePayload(
      settings.scheduledJobs ?? [],
    );
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          await apiFetch("/api/metrics/runtime-eval/scheduler-efficiency/source", {
            method: "POST",
            body: JSON.stringify(payload),
          });
        } catch {
          // Silent fail by design; the next scheduler change or eval run can recover the sync.
        }
      })();
    }, 120);

    return () => {
      window.clearTimeout(timer);
    };
  }, [settings.scheduledJobs]);

  useEffect(() => {
    const tick = async () => {
      if (busyRef.current) return;
      const jobs = settings.scheduledJobs ?? [];
      const now = new Date();
      const queuedNativeJobs = jobs.filter(
        (job) =>
          job.lastStatus === "queued" &&
          job.pendingBatchProvider === "anthropic" &&
          Boolean(job.pendingBatchId),
      );
      const due = jobs.filter((j) => shouldRunNow(j, now));
      const dueAuto = dueAutoJobs(now);
      if (!due.length && !dueAuto.length && !queuedNativeJobs.length) return;

      busyRef.current = true;
      try {
        let nextJobs = [...jobs];
        const applyJobOutcome = async (
          job: ScheduledJob,
          outcome: {
            status: Exclude<ScheduledJob["lastStatus"], "queued" | undefined>;
            summary: string;
            artifactContent: string;
            lastEfficiency: ReturnType<typeof buildScheduledJobEfficiencySnapshot>;
          },
        ) => {
          const workflowTemplate = getHQWorkflowCatalogItem(job.templateId);
          const { status, summary, artifactContent, lastEfficiency } = outcome;
          const executionMeta = getExecutionOriginMeta(lastEfficiency);
          const runAt = Date.now();
          const wroteArtifact =
            status === "ok" && Boolean(job.outputTarget && job.outputTarget !== "none");
          const recentExecution = {
            recordedAt: runAt,
            status,
            executionOrigin: executionMeta.executionOrigin,
            summary,
            wroteArtifact,
            artifactTarget: wroteArtifact ? job.outputTarget : undefined,
            cacheStrategy: lastEfficiency.cacheStrategy,
            batchMode: lastEfficiency.batchMode,
            cacheHit: lastEfficiency.cacheHit,
          } satisfies NonNullable<ScheduledJob["recentExecutions"]>[number];
          const feedDetail = buildExecutionFeedDetail({
            executionLabel: executionMeta.executionLabel,
            summary,
            outputTarget: job.outputTarget,
            wroteArtifact,
          });
          nextJobs = nextJobs.map((j) =>
            j.id === job.id
              ? {
                  ...j,
                  lastRunAt: runAt,
                  lastStatus: status,
                  lastSummary: summary,
                  lastEfficiency,
                  lastExecutionOrigin: executionMeta.executionOrigin,
                  lastExecutionAt: runAt,
                  recentExecutions: pushRecentExecution(
                    j.recentExecutions,
                    recentExecution,
                  ),
                  lastArtifactOrigin: wroteArtifact
                    ? executionMeta.executionOrigin
                    : j.lastArtifactOrigin,
                  lastArtifactTarget: wroteArtifact
                    ? (job.outputTarget as NonNullable<ScheduledJob["outputTarget"]>)
                    : j.lastArtifactTarget,
                  lastArtifactAt: wroteArtifact ? runAt : j.lastArtifactAt,
                  pendingBatchId: undefined,
                  pendingBatchProvider: undefined,
                  pendingBatchSubmittedAt: undefined,
                  pendingBatchSize: undefined,
                  pendingBatchPollFailures: undefined,
                  pendingBatchSystemPromptChars: undefined,
                  pendingBatchStablePrefixChars: undefined,
                  pendingBatchVolatilePromptChars: undefined,
                  pendingBatchCacheStrategy: undefined,
                }
              : j,
          );

          addLog({
            type: "system",
            text: `${profile.label} cron "${job.name}" ${status === "ok" ? "ran" : "failed"} ${feedDetail}`,
            color: status === "ok" ? "#10b981" : "#ef4444",
          });

          if (status === "ok" && job.outputTarget && job.outputTarget !== "none") {
            const registryKind =
              job.outputTarget === "vault" || job.outputTarget === "review"
                ? "evidence_pack"
                : "media_kit";
            try {
              await apiFetch("/api/registry", {
                method: "POST",
                body: JSON.stringify({
                  item: {
                    id: `sched-${job.id}-${runAt}`,
                    title: `${job.name} artifact`,
                    type: registryKind,
                    summary,
                    owner: "Mission Foundry",
                    custody: job.outputTarget,
                    costTier: "free_local",
                    status:
                      job.outputTarget === "review"
                        ? "draft"
                        : status === "ok"
                          ? "ready"
                          : "watch",
                    license: "Internal",
                    tags: [
                      "scheduled-job",
                      profile.label.toLowerCase(),
                      job.outputTarget,
                      job.id,
                      ...executionMeta.tags,
                      ...(workflowTemplate
                        ? [
                            "workflow-template",
                            workflowTemplate.id,
                            workflowTemplate.automationPosture,
                          ]
                        : []),
                    ],
                    lastReviewedAt: new Date(runAt).toISOString(),
                    notes: workflowTemplate
                      ? `Generated by ${job.missionAgent ?? "orbit"} with ${job.approvalPolicy ?? "human_gate"} via ${executionMeta.executionLabel}. Workflow lineage: ${workflowTemplate.command} (${workflowTemplate.source}, ${workflowTemplate.automationPosture}).`
                      : `Generated by ${job.missionAgent ?? "orbit"} with ${job.approvalPolicy ?? "human_gate"} via ${executionMeta.executionLabel}.`,
                  },
                }),
              });
            } catch {
              // Artifact persistence is additive; don't fail the scheduler if it misses.
            }

            if (
              (job.outputTarget === "vault" || job.outputTarget === "review") &&
              artifactContent
            ) {
              try {
                await apiFetch("/api/memory/pages", {
                  method: "POST",
                  body: JSON.stringify({
                    title: `${job.name} artifact`,
                    summary,
                    content: artifactContent,
                    source: "scheduler",
                    sourceLabel: workflowTemplate
                      ? `Scheduler page · ${workflowTemplate.command} · ${executionMeta.executionLabel}`
                      : `Scheduler page · ${job.name} · ${executionMeta.executionLabel}`,
                    workflowId: workflowTemplate?.id,
                    workflowLabel: workflowTemplate?.label ?? job.name,
                    agentId: job.missionAgent ?? "orbit",
                    route:
                      job.outputTarget === "review" ? "/command" : "/vault",
                    topic: job.prompt.slice(0, 160),
                    layer: job.outputTarget === "review" ? "knowledge" : "output",
                    tags: [
                      "scheduled-job",
                      profile.label.toLowerCase(),
                      job.outputTarget,
                      job.id,
                      ...executionMeta.tags,
                      ...(workflowTemplate
                        ? [
                            "workflow-template",
                            workflowTemplate.id,
                            workflowTemplate.automationPosture,
                          ]
                        : []),
                    ],
                  }),
                });
              } catch {
                // Compiled page persistence is additive only.
              }
            }
          }

          if (status !== "ok" || profile.noisySuccessAlerts) {
            addNotification({
              type: "system",
              severity: status === "ok" ? "low" : "high",
              title: `Scheduled Job ${status === "ok" ? "Complete" : "Failed"}`,
              message: `${job.name} ${feedDetail}`,
              source: `Cron Scheduler (${profile.label})`,
            });
          }
        };

        const pollQueuedNativeBatch = async (group: ScheduledJob[]) => {
          const batchId = group[0]?.pendingBatchId?.trim() ?? "";
          if (!batchId) return;

          try {
            const batch = await pollAnthropicNativeBatch(batchId);
            if (batch.processingStatus !== "ended") {
              nextJobs = nextJobs.map((job) =>
                group.some((queuedJob) => queuedJob.id === job.id)
                  ? {
                      ...job,
                      lastStatus: "queued",
                      lastSummary: `Anthropic native batch ${batch.processingStatus.replaceAll("_", " ")}.`,
                      pendingBatchPollFailures: 0,
                    }
                  : job,
              );
              return;
            }

            for (const job of group) {
              const result = batch.results.find((item) => item.id === job.id);
              const artifactContent = result?.content?.trim() ?? "";
              const status: Exclude<ScheduledJob["lastStatus"], "queued" | undefined> =
                result?.status === "error" ? "error" : "ok";
              const summary =
                artifactContent.slice(0, 200) ||
                (status === "ok"
                  ? "Completed with no output."
                  : "Native batch result missing content.");
              const lastEfficiency = buildScheduledJobEfficiencySnapshot({
                systemPromptChars: job.pendingBatchSystemPromptChars ?? 0,
                stablePrefixChars:
                  job.pendingBatchStablePrefixChars ??
                  job.pendingBatchSystemPromptChars ??
                  0,
                volatilePromptChars:
                  job.pendingBatchVolatilePromptChars ?? job.prompt.trim().length,
                output: artifactContent,
                cacheStrategy: job.pendingBatchCacheStrategy ?? "system_only",
                singleFlightScope: "shared_window",
                batchedRun: true,
                batchMode: "provider_native",
                batchSize: job.pendingBatchSize ?? group.length,
                cacheObserved: false,
                cacheReadTokens: 0,
                cacheWriteTokens: 0,
              });
              await applyJobOutcome(job, {
                status,
                summary,
                artifactContent,
                lastEfficiency,
              });
            }
          } catch (error) {
            const summary =
              error instanceof Error
                ? error.message.slice(0, 200)
                : "Native batch polling failed.";
            const previousFailures = Math.max(
              0,
              ...group.map((job) => job.pendingBatchPollFailures ?? 0),
            );
            const nextFailures = previousFailures + 1;
            if (nextFailures >= MAX_NATIVE_BATCH_POLL_FAILURES) {
              const releasedAt = Date.now();
              nextJobs = nextJobs.map((job) =>
                group.some((queuedJob) => queuedJob.id === job.id)
                  ? {
                      ...job,
                      lastRunAt: releasedAt,
                      lastStatus: "error",
                      lastSummary: `Native batch queue cleared after ${nextFailures} poll failures: ${summary}`,
                      lastExecutionOrigin: "provider_native_batch",
                      lastExecutionAt: releasedAt,
                      recentExecutions: pushRecentExecution(job.recentExecutions, {
                        recordedAt: releasedAt,
                        status: "error",
                        executionOrigin: "provider_native_batch",
                        summary: `Native batch queue cleared after ${nextFailures} poll failures: ${summary}`,
                        wroteArtifact: false,
                        cacheStrategy: job.pendingBatchCacheStrategy ?? "system_only",
                        batchMode: "provider_native",
                        cacheHit: false,
                      }),
                      pendingBatchId: undefined,
                      pendingBatchProvider: undefined,
                      pendingBatchSubmittedAt: undefined,
                      pendingBatchSize: undefined,
                      pendingBatchPollFailures: undefined,
                      pendingBatchSystemPromptChars: undefined,
                      pendingBatchStablePrefixChars: undefined,
                      pendingBatchVolatilePromptChars: undefined,
                      pendingBatchCacheStrategy: undefined,
                    }
                  : job,
              );
              addLog({
                type: "system",
                text: `${profile.label} cron native batch released after ${nextFailures} poll failures: ${summary}`,
                color: "#ef4444",
              });
              addNotification({
                type: "system",
                severity: "high",
                title: "Queued Native Batch Released",
                message: `Anthropic batch queue cleared after repeated poll failures: ${summary}`,
                source: `Cron Scheduler (${profile.label})`,
              });
              return;
            }
            nextJobs = nextJobs.map((job) =>
              group.some((queuedJob) => queuedJob.id === job.id)
                ? {
                    ...job,
                    lastStatus: "queued",
                    lastSummary: `Native batch poll retry ${nextFailures}/${MAX_NATIVE_BATCH_POLL_FAILURES}: ${summary}`,
                    pendingBatchPollFailures: nextFailures,
                  }
                : job,
            );
          }
        };

        const runSingleScheduledJob = async (
          job: ScheduledJob,
          batchedFallback = false,
        ) => {
          if (profile.noisySuccessAlerts) {
            addNotification({
              type: "system",
              severity: "low",
              title: `Scheduled Job: ${job.name}`,
              message: `Started recurring task (${profile.label}).`,
              source: "Cron Scheduler",
            });
          }

          let status: Exclude<ScheduledJob["lastStatus"], "queued" | undefined> = "ok";
          let summary = "Completed.";
          let artifactContent = "";
          let systemPrompt = "";
          let outcomeMeta = {
            cacheObserved: false,
            cacheReadTokens: 0,
            cacheWriteTokens: 0,
            cacheHit: false,
          };
          const promptParts = buildScheduledMissionPromptParts(
            profile.promptPrefix,
            job.prompt,
          );
          const promptMeasurement = {
            systemPromptChars: 0,
            stablePrefixChars: 0,
            volatilePromptChars: 0,
          };
          try {
            systemPrompt = buildCachedSystemPrompt(settings);
            Object.assign(
              promptMeasurement,
              buildPromptMeasurement(systemPrompt, promptParts),
            );
            const result = await callNonInteractiveAIWithMeta({
              systemPrompt,
              userPrompt: promptParts.fullPrompt,
              maxTokens: 300,
              task: "fast",
              promptParts,
              singleFlightKey: buildScheduledMissionSingleFlightKey({
                systemPrompt,
                cacheablePrefix: promptParts.cacheablePrefix,
                volatilePrompt: promptParts.volatilePrompt,
              }),
            });
            artifactContent = (result.content || "Completed with no output.").trim();
            summary = artifactContent.slice(0, 200);
            outcomeMeta = result.meta;
          } catch (e) {
            status = "error";
            summary =
              e instanceof Error
                ? e.message.slice(0, 200)
                : "Scheduled task failed.";
          }
          const lastEfficiency = buildScheduledJobEfficiencySnapshot({
            systemPromptChars: promptMeasurement.systemPromptChars,
            stablePrefixChars: promptMeasurement.stablePrefixChars,
            volatilePromptChars: promptMeasurement.volatilePromptChars,
            output: artifactContent,
            cacheStrategy: promptParts.cacheStrategy,
            singleFlightScope: "shared_window",
            batchedRun: false,
            batchMode: "single",
            batchSize: 1,
            cacheObserved: outcomeMeta.cacheObserved,
            cacheReadTokens: outcomeMeta.cacheReadTokens,
            cacheWriteTokens: outcomeMeta.cacheWriteTokens,
          });
          await applyJobOutcome(job, {
            status,
            summary:
              batchedFallback && status === "error"
                ? `Batch fallback failed: ${summary}`
                : summary,
            artifactContent,
            lastEfficiency,
          });
        };

        const queuedGroups = new Map<string, ScheduledJob[]>();
        for (const job of queuedNativeJobs) {
          const batchId = job.pendingBatchId?.trim();
          if (!batchId) continue;
          const existing = queuedGroups.get(batchId) ?? [];
          existing.push(job);
          queuedGroups.set(batchId, existing);
        }
        for (const group of Array.from(queuedGroups.values())) {
          await pollQueuedNativeBatch(group);
        }

        const { batched, singles } = buildScheduledBatchGroups(due);
        for (const group of batched) {
          const systemPrompt = buildCachedSystemPrompt(settings);
          const batchPrompt = buildNonInteractiveBatchPrompt(
            group.map((job) => ({
              id: job.id,
              name: job.name,
              prompt: job.prompt,
            })),
          );
          const promptParts = buildScheduledMissionPromptParts(
            profile.promptPrefix,
            batchPrompt,
          );
          const promptMeasurement = buildPromptMeasurement(
            systemPrompt,
            promptParts,
          );
          const nativeSharedPrefix = promptParts.cacheablePrefix ?? "";
          const nativeMaxTokens = Math.min(1800, 320 * group.length + 220);

          if (settings.aiProvider === "anthropic") {
            try {
              const submission = await submitAnthropicNativeBatch({
                systemPrompt,
                sharedPrefix: nativeSharedPrefix,
                items: group.map((job) => ({
                  id: job.id,
                  name: job.name,
                  prompt: job.prompt,
                })),
                maxTokens: nativeMaxTokens,
              });
              const submittedAt = Date.now();
              nextJobs = nextJobs.map((job) =>
                group.some((scheduledJob) => scheduledJob.id === job.id)
                  ? {
                      ...job,
                      lastRunAt: submittedAt,
                      lastStatus: "queued",
                      lastSummary: `Anthropic native batch queued (${submission.processingStatus}).`,
                      pendingBatchId: submission.batchId,
                      pendingBatchProvider: "anthropic",
                      pendingBatchSubmittedAt: submittedAt,
                      pendingBatchSize: group.length,
                      pendingBatchPollFailures: 0,
                      pendingBatchSystemPromptChars:
                        promptMeasurement.systemPromptChars,
                      pendingBatchStablePrefixChars:
                        promptMeasurement.stablePrefixChars,
                      pendingBatchVolatilePromptChars:
                        group.find((scheduledJob) => scheduledJob.id === job.id)?.prompt
                          .trim()
                          .length ?? 0,
                      pendingBatchCacheStrategy: promptParts.cacheStrategy,
                    }
                  : job,
              );
              addLog({
                type: "system",
                text: `${profile.label} cron native batch queued: ${group.length} jobs via Anthropic.`,
                color: "#00DDFF",
              });
              continue;
            } catch {
              // Fall through to the existing internal batch lane.
            }
          }

          try {
            const batchResponse = await callNonInteractiveAIBatch({
              systemPrompt,
              items: group.map((job) => ({
                id: job.id,
                name: job.name,
                prompt: job.prompt,
              })),
              maxTokens: nativeMaxTokens,
              task: "fast",
              promptParts,
              singleFlightKey: buildScheduledMissionSingleFlightKey({
                systemPrompt,
                cacheablePrefix: promptParts.cacheablePrefix,
                volatilePrompt: promptParts.volatilePrompt,
              }),
            });
            const perJobReadTokens =
              batchResponse.meta.cacheReadTokens > 0
                ? Math.round(batchResponse.meta.cacheReadTokens / group.length)
                : 0;
            const perJobWriteTokens =
              batchResponse.meta.cacheWriteTokens > 0
                ? Math.round(batchResponse.meta.cacheWriteTokens / group.length)
                : 0;

            for (const job of group) {
              const result = batchResponse.results.find((item) => item.id === job.id);
              const artifactContent = result?.content?.trim() ?? "";
              const status: ScheduledJob["lastStatus"] =
                result?.status === "error" ? "error" : "ok";
              const summary =
                artifactContent.slice(0, 200) ||
                (status === "ok"
                  ? "Completed with no output."
                  : "Batch result missing content.");
              const lastEfficiency = buildScheduledJobEfficiencySnapshot({
                systemPromptChars: promptMeasurement.systemPromptChars,
                stablePrefixChars: promptMeasurement.stablePrefixChars,
                volatilePromptChars: promptMeasurement.volatilePromptChars,
                output: artifactContent,
                cacheStrategy: promptParts.cacheStrategy,
                singleFlightScope: "shared_window",
                batchedRun: true,
                batchMode: "internal",
                batchSize: group.length,
                cacheObserved: batchResponse.meta.cacheObserved,
                cacheReadTokens: perJobReadTokens,
                cacheWriteTokens: perJobWriteTokens,
              });
              await applyJobOutcome(job, {
                status,
                summary,
                artifactContent,
                lastEfficiency,
              });
            }
          } catch {
            for (const job of group) {
              await runSingleScheduledJob(job, true);
            }
          }
        }

        for (const job of singles) {
          await runSingleScheduledJob(job, false);
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
