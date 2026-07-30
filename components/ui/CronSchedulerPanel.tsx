"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useStore, type ScheduledJob } from "@/store/useStore";
import SurfaceFocusStrip from "@/components/ui/SurfaceFocusStrip";
import { requestTextDownload } from "@/components/ui/downloadFeedback";
import { OFFICE_OPERATIONAL_PROFILES } from "@/components/home/office/constants";
import { getAutoJobsForMode, isAutoOpsModeEnabled } from "@/lib/autoOpsJobs";
import CronSchedulerAutoOpsSection from "@/components/ui/CronSchedulerAutoOpsSection";
import CronSchedulerComposerSection from "@/components/ui/CronSchedulerComposerSection";
import CronSchedulerGovernanceSection from "@/components/ui/CronSchedulerGovernanceSection";
import CronSchedulerJobsSection from "@/components/ui/CronSchedulerJobsSection";
import CronSchedulerWorkflowTemplatesSection from "@/components/ui/CronSchedulerWorkflowTemplatesSection";
import { readAnthropicNativeBatchPosture } from "@/lib/ai";
import {
  areSchedulerAuditFiltersEqual,
  buildScheduledMissionReviewState,
  clearScheduledMissionReview,
  buildSchedulerAuditExport,
  buildSavedSchedulerAuditViewsExport,
  coerceSchedulerAuditFilters,
  coerceSavedSchedulerAuditViewsImport,
  coerceSavedSchedulerAuditViews,
  DEFAULT_SCHEDULED_MISSION_REVIEW_EXPIRY_HOURS,
  DEFAULT_SCHEDULER_AUDIT_FILTERS,
  hasActiveSchedulerAuditFilters,
  MAX_SAVED_SCHEDULER_AUDIT_VIEWS,
  type SavedSchedulerAuditView,
  type SavedSchedulerAuditViewsImportPreview,
  sanitizeSchedulerAuditViewName,
  SCHEDULER_AUDIT_FILTER_PRESETS,
  summarizeSavedSchedulerAuditViewsImport,
} from "@/lib/schedulerGovernance";
import {
  buildHQWorkflowScheduledDraft,
  HQ_WORKFLOW_CATALOG,
  type HQWorkflowCommandId,
} from "@/components/home/office/workflowCommands";
import {
  isValidCron,
  MISSION_TEMPLATES,
  type NativeBatchPostureState,
  PRESET_CRONS,
  SCHEDULER_AUDIT_FILTER_STORAGE_KEY,
  SCHEDULER_AUDIT_VIEWS_STORAGE_KEY,
} from "@/components/ui/cronSchedulerPanelUtils";
import { useSurfaceFocusScroll } from "@/hooks/useSurfaceFocusScroll";

interface Props {
  open: boolean;
  onClose: () => void;
  focus?: string | null;
}

export default function CronSchedulerPanel({
  open,
  onClose,
  focus = null,
}: Props) {
  const settings = useStore((s) => s.settings);
  const updateSettings = useStore((s) => s.updateSettings);
  const jobs = useMemo(
    () => settings.scheduledJobs ?? [],
    [settings.scheduledJobs],
  );

  const [name, setName] = useState("");
  const [prompt, setPrompt] = useState("");
  const [cron, setCron] = useState(PRESET_CRONS[0].value);
  const [jobType, setJobType] = useState<ScheduledJob["type"]>("mission");
  const [outputTarget, setOutputTarget] =
    useState<NonNullable<ScheduledJob["outputTarget"]>>("vault");
  const [approvalPolicy, setApprovalPolicy] =
    useState<NonNullable<ScheduledJob["approvalPolicy"]>>("human_gate");
  const [missionAgent, setMissionAgent] = useState("orbit");
  const [missionScope, setMissionScope] = useState("");
  const [missionReviewExpiryHours, setMissionReviewExpiryHours] = useState(
    DEFAULT_SCHEDULED_MISSION_REVIEW_EXPIRY_HOURS,
  );
  const [missionReentrySummary, setMissionReentrySummary] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [workflowTopic, setWorkflowTopic] = useState("");
  const [error, setError] = useState("");
  const [auditMsg, setAuditMsg] = useState("");
  const [auditFilters, setAuditFilters] = useState(() => ({
    ...DEFAULT_SCHEDULER_AUDIT_FILTERS,
  }));
  const [auditFiltersHydrated, setAuditFiltersHydrated] = useState(false);
  const [savedAuditViews, setSavedAuditViews] = useState<
    SavedSchedulerAuditView[]
  >([]);
  const [savedAuditViewsHydrated, setSavedAuditViewsHydrated] = useState(false);
  const [showSaveAuditView, setShowSaveAuditView] = useState(false);
  const [newAuditViewName, setNewAuditViewName] = useState("");
  const [showPasteAuditViews, setShowPasteAuditViews] = useState(false);
  const [pastedAuditViewsText, setPastedAuditViewsText] = useState("");
  const [pendingImportedAuditViews, setPendingImportedAuditViews] = useState<{
    views: SavedSchedulerAuditView[];
    summary: SavedSchedulerAuditViewsImportPreview;
  } | null>(null);
  const importSavedViewsInputRef = useRef<HTMLInputElement | null>(null);
  const [nativeBatchPosture, setNativeBatchPosture] =
    useState<NativeBatchPostureState>({
      loading: true,
      nativeReady: false,
      mode: "internal_fallback",
      featureEnabled: false,
      paidApisAllowed: false,
      apiKeyConfigured: false,
      reason: "Loading native batch posture…",
    });

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
  const automationCandidateWorkflows = useMemo(
    () =>
      HQ_WORKFLOW_CATALOG.filter(
        (workflow) => workflow.automationReady && workflow.schedulerDefaults,
      ),
    [],
  );
  const reviewOnlyWorkflows = useMemo(
    () =>
      HQ_WORKFLOW_CATALOG.filter(
        (workflow) => workflow.automationPosture === "review_only",
      ),
    [],
  );
  const hasActiveAuditFilters = useMemo(
    () => hasActiveSchedulerAuditFilters(auditFilters),
    [auditFilters],
  );
  const schedulerAuditPayload = useMemo(
    () =>
      buildSchedulerAuditExport(
        jobs,
        {
          nativeReady: nativeBatchPosture.nativeReady,
          mode: nativeBatchPosture.mode,
          featureEnabled: nativeBatchPosture.featureEnabled,
          paidApisAllowed: nativeBatchPosture.paidApisAllowed,
          apiKeyConfigured: nativeBatchPosture.apiKeyConfigured,
          reason: nativeBatchPosture.reason,
        },
        {
          filters: auditFilters,
        },
      ),
    [jobs, nativeBatchPosture, auditFilters],
  );
  const focusTargetId =
    focus === "hq-scheduler-composer"
      ? "cron-scheduler-composer"
      : focus === "hq-scheduler-governance"
        ? "cron-scheduler-governance"
        : focus === "hq-scheduler-jobs"
          ? "cron-scheduler-jobs"
          : null;

  useSurfaceFocusScroll(open ? focusTargetId : null);

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

  const applyWorkflowTemplate = (workflowId: HQWorkflowCommandId) => {
    const draft = buildHQWorkflowScheduledDraft(workflowId, workflowTopic);
    if (!draft) return;
    setName(draft.name);
    setPrompt(draft.prompt);
    setCron(draft.cronSuggestion);
    setJobType("mission");
    setOutputTarget(draft.outputTarget);
    setApprovalPolicy(draft.approvalPolicy);
    setMissionAgent(draft.missionAgent);
    setMissionScope(
      `${draft.name} inside the existing ${draft.outputTarget} review lane.`,
    );
    setMissionReviewExpiryHours(DEFAULT_SCHEDULED_MISSION_REVIEW_EXPIRY_HOURS);
    setMissionReentrySummary(
      `Review ${draft.name}, decide approve/adapt/reject, and reopen the strongest next route before the next scheduled cycle overlaps it.`,
    );
    setTemplateId(draft.templateId);
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
    if (jobType === "mission") {
      if (!missionScope.trim()) {
        setError("Mission scope is required for reviewed mission jobs.");
        return;
      }
      if (!missionReentrySummary.trim()) {
        setError("Re-entry summary is required for reviewed mission jobs.");
        return;
      }
    }
    const createdAt = Date.now();
    const next: ScheduledJob = {
      id: `job-${createdAt}`,
      name: trimmedName,
      prompt: trimmedPrompt,
      cron: trimmedCron,
      enabled: true,
      type: jobType,
      outputTarget,
      approvalPolicy,
      missionAgent,
      missionReview:
        jobType === "mission"
          ? buildScheduledMissionReviewState({
              scope: missionScope,
              targetAgent: missionAgent,
              outputTarget,
              approvalPolicy,
              expiryHours: missionReviewExpiryHours,
              reentrySummary: missionReentrySummary,
              createdAt,
            })
          : undefined,
      templateId: templateId || undefined,
    };
    saveJobs([next, ...jobs]);
    setName("");
    setPrompt("");
    setCron(PRESET_CRONS[0].value);
    setJobType("mission");
    setOutputTarget("vault");
    setApprovalPolicy("human_gate");
    setMissionAgent("orbit");
    setMissionScope("");
    setMissionReviewExpiryHours(DEFAULT_SCHEDULED_MISSION_REVIEW_EXPIRY_HOURS);
    setMissionReentrySummary("");
    setTemplateId("");
    setWorkflowTopic("");
  };

  const applyMissionTemplate = (templateId: string) => {
    const template = MISSION_TEMPLATES.find(
      (candidate) => candidate.id === templateId,
    );
    if (!template) return;
    setName(template.label);
    setPrompt(template.prompt);
    if (template.cron) setCron(template.cron);
    setOutputTarget(template.outputTarget);
    setApprovalPolicy(template.approvalPolicy);
    setMissionScope(template.scope);
    setMissionReviewExpiryHours(template.expiryHours);
    setMissionReentrySummary(template.reentrySummary);
    setTemplateId(template.id);
  };

  const toggleJob = (id: string) => {
    saveJobs(
      jobs.map((j) => (j.id === id ? { ...j, enabled: !j.enabled } : j)),
    );
  };

  const removeJob = (id: string) => {
    saveJobs(jobs.filter((j) => j.id !== id));
  };

  const clearQueuedJob = (id: string) => {
    saveJobs(
      jobs.map((job) =>
        job.id === id
          ? {
              ...job,
              lastStatus: "error" as const,
              lastSummary: "Queued native batch cleared by operator.",
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
      ),
    );
  };

  const clearMissionReview = (id: string) => {
    saveJobs(
      jobs.map((job) =>
        job.id === id
          ? {
              ...job,
              missionReview: clearScheduledMissionReview(job, Date.now()),
            }
          : job,
      ),
    );
  };

  const copySchedulerAudit = async () => {
    try {
      await navigator.clipboard.writeText(
        JSON.stringify(schedulerAuditPayload, null, 2),
      );
      setAuditMsg("Scheduler audit copied to clipboard.");
    } catch {
      setAuditMsg("Copy failed.");
    }
  };

  const exportSchedulerAudit = () => {
    const requested = requestTextDownload({
      filename: `scheduler-audit-${Date.now()}.json`,
      content: JSON.stringify(schedulerAuditPayload, null, 2),
      label: "Scheduler audit",
      mimeType: "application/json",
      announce: false,
    });
    setAuditMsg(
      requested
        ? "Scheduler audit download requested."
        : "Scheduler audit download failed.",
    );
  };

  const copyJobAudit = async (job: ScheduledJob) => {
    const payload = buildSchedulerAuditExport(
      jobs,
      {
        nativeReady: nativeBatchPosture.nativeReady,
        mode: nativeBatchPosture.mode,
        featureEnabled: nativeBatchPosture.featureEnabled,
        paidApisAllowed: nativeBatchPosture.paidApisAllowed,
        apiKeyConfigured: nativeBatchPosture.apiKeyConfigured,
        reason: nativeBatchPosture.reason,
      },
      {
        jobIds: [job.id],
        scopeLabel: `${job.name} audit`,
        filters: auditFilters,
      },
    );
    try {
      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
      setAuditMsg(`Copied audit for ${job.name}.`);
    } catch {
      setAuditMsg(`Copy failed for ${job.name}.`);
    }
  };

  const exportJobAudit = (job: ScheduledJob) => {
    const payload = buildSchedulerAuditExport(
      jobs,
      {
        nativeReady: nativeBatchPosture.nativeReady,
        mode: nativeBatchPosture.mode,
        featureEnabled: nativeBatchPosture.featureEnabled,
        paidApisAllowed: nativeBatchPosture.paidApisAllowed,
        apiKeyConfigured: nativeBatchPosture.apiKeyConfigured,
        reason: nativeBatchPosture.reason,
      },
      {
        jobIds: [job.id],
        scopeLabel: `${job.name} audit`,
        filters: auditFilters,
      },
    );
    const requested = requestTextDownload({
      filename: `scheduler-audit-${job.id}.json`,
      content: JSON.stringify(payload, null, 2),
      label: `${job.name} audit`,
      mimeType: "application/json",
      announce: false,
    });
    setAuditMsg(
      requested
        ? `Audit download requested for ${job.name}.`
        : `Audit download failed for ${job.name}.`,
    );
  };

  const saveCurrentAuditView = () => {
    const sanitizedName = sanitizeSchedulerAuditViewName(newAuditViewName);
    if (!sanitizedName) {
      setAuditMsg("Saved view name is required.");
      return;
    }
    let replaced = false;
    let trimmed = false;
    setSavedAuditViews((current) => {
      const existing = current.find(
        (view) => view.name.toLowerCase() === sanitizedName.toLowerCase(),
      );
      const nextView: SavedSchedulerAuditView = {
        id:
          existing?.id ??
          `audit-view-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: sanitizedName,
        filters: { ...auditFilters },
      };
      replaced = Boolean(existing);
      const next = [
        nextView,
        ...current.filter((view) => view.id !== existing?.id),
      ];
      if (next.length > MAX_SAVED_SCHEDULER_AUDIT_VIEWS) {
        trimmed = true;
      }
      return next.slice(0, MAX_SAVED_SCHEDULER_AUDIT_VIEWS);
    });
    setShowSaveAuditView(false);
    setNewAuditViewName("");
    setAuditMsg(
      replaced
        ? `Updated saved audit view ${sanitizedName}.`
        : trimmed
          ? `Saved ${sanitizedName}. Oldest saved view was removed.`
          : `Saved audit view ${sanitizedName}.`,
    );
  };

  const removeSavedAuditView = (viewId: string, viewName: string) => {
    setSavedAuditViews((current) =>
      current.filter((view) => view.id !== viewId),
    );
    setAuditMsg(`Removed saved audit view ${viewName}.`);
  };

  const exportSavedAuditViews = () => {
    const payload = buildSavedSchedulerAuditViewsExport(savedAuditViews);
    const requested = requestTextDownload({
      filename: "scheduler-audit-views.json",
      content: JSON.stringify(payload, null, 2),
      label: "Saved audit views",
      mimeType: "application/json",
      announce: false,
    });
    setAuditMsg(
      requested
        ? "Saved audit view download requested."
        : "Saved audit view download failed.",
    );
  };

  const previewImportedSavedAuditViews = (
    incoming: SavedSchedulerAuditView[],
  ) => {
    if (!incoming.length) {
      setAuditMsg("No valid saved audit views were found in that file.");
      return;
    }
    const summary = summarizeSavedSchedulerAuditViewsImport(
      savedAuditViews,
      incoming,
    );
    setPendingImportedAuditViews({ views: incoming, summary });
    setAuditMsg(
      `Loaded import preview for ${summary.incomingCount} saved audit views.`,
    );
  };

  const previewImportedSavedAuditViewsFromText = (
    rawText: string,
    sourceLabel: "file" | "pasted JSON",
  ) => {
    try {
      const incoming = coerceSavedSchedulerAuditViewsImport(
        JSON.parse(rawText),
      );
      if (!incoming.length) {
        setAuditMsg(
          `No valid saved audit views were found in the ${sourceLabel}.`,
        );
        return;
      }
      previewImportedSavedAuditViews(incoming);
    } catch {
      setAuditMsg(
        sourceLabel === "file"
          ? "Saved audit view import failed. Use a valid JSON export."
          : "Pasted JSON import failed. Use a valid saved audit view export.",
      );
    }
  };

  const mergeImportedSavedAuditViews = (
    incoming: SavedSchedulerAuditView[],
  ) => {
    if (!incoming.length) {
      setAuditMsg("No valid saved audit views were found in that file.");
      return;
    }
    let replaced = 0;
    let trimmed = false;
    setSavedAuditViews((current) => {
      const next: SavedSchedulerAuditView[] = [];
      const seenIds = new Set<string>();
      const byName = new Map(
        current.map((view) => [view.name.toLowerCase(), view] as const),
      );

      const allocateId = (preferredId: string, fallbackName: string) => {
        if (preferredId && !seenIds.has(preferredId)) return preferredId;
        let candidate = `audit-view-${
          fallbackName
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "") || "saved"
        }-${Date.now()}`;
        let suffix = 1;
        while (seenIds.has(candidate)) {
          candidate = `${candidate}-${suffix++}`;
        }
        return candidate;
      };

      for (const view of incoming) {
        const existing = byName.get(view.name.toLowerCase());
        if (existing) replaced += 1;
        const id = allocateId(existing?.id ?? view.id, view.name);
        seenIds.add(id);
        next.push({
          id,
          name: view.name,
          filters: { ...view.filters },
        });
      }

      for (const view of current) {
        if (
          incoming.some(
            (candidate) =>
              candidate.name.toLowerCase() === view.name.toLowerCase(),
          )
        ) {
          continue;
        }
        const id = allocateId(view.id, view.name);
        seenIds.add(id);
        next.push({
          id,
          name: view.name,
          filters: { ...view.filters },
        });
      }

      if (next.length > MAX_SAVED_SCHEDULER_AUDIT_VIEWS) {
        trimmed = true;
      }
      return next.slice(0, MAX_SAVED_SCHEDULER_AUDIT_VIEWS);
    });
    setAuditMsg(
      trimmed
        ? `Imported ${incoming.length} saved audit views. Oldest extra views were removed.`
        : replaced
          ? `Imported ${incoming.length} saved audit views and updated ${replaced} existing names.`
          : `Imported ${incoming.length} saved audit views.`,
    );
  };

  const applyImportedSavedAuditViews = () => {
    if (!pendingImportedAuditViews) return;
    mergeImportedSavedAuditViews(pendingImportedAuditViews.views);
    setPendingImportedAuditViews(null);
  };

  const importSavedAuditViewsFromFile = async (file: File | null) => {
    if (!file) return;
    try {
      const text = await file.text();
      previewImportedSavedAuditViewsFromText(text, "file");
    } catch {
      setAuditMsg("Saved audit view import failed. Use a valid JSON export.");
    }
  };

  const previewPastedAuditViewsImport = () => {
    const trimmed = pastedAuditViewsText.trim();
    if (!trimmed) {
      setAuditMsg("Paste a saved audit view JSON export first.");
      return;
    }
    previewImportedSavedAuditViewsFromText(trimmed, "pasted JSON");
  };

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(
        SCHEDULER_AUDIT_FILTER_STORAGE_KEY,
      );
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<
          typeof DEFAULT_SCHEDULER_AUDIT_FILTERS
        >;
        setAuditFilters(coerceSchedulerAuditFilters(parsed));
      }
    } catch {
      // Ignore storage read failures and fall back to broad defaults.
    } finally {
      setAuditFiltersHydrated(true);
    }
  }, []);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(
        SCHEDULER_AUDIT_VIEWS_STORAGE_KEY,
      );
      if (stored) {
        setSavedAuditViews(coerceSavedSchedulerAuditViews(JSON.parse(stored)));
      }
    } catch {
      // Ignore storage read failures and fall back to no saved views.
    } finally {
      setSavedAuditViewsHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!auditFiltersHydrated) return;
    try {
      window.localStorage.setItem(
        SCHEDULER_AUDIT_FILTER_STORAGE_KEY,
        JSON.stringify(auditFilters),
      );
    } catch {
      // Ignore storage write failures and keep the in-memory filters active.
    }
  }, [auditFilters, auditFiltersHydrated]);

  useEffect(() => {
    if (!savedAuditViewsHydrated) return;
    try {
      window.localStorage.setItem(
        SCHEDULER_AUDIT_VIEWS_STORAGE_KEY,
        JSON.stringify(savedAuditViews),
      );
    } catch {
      // Ignore storage write failures and keep the in-memory saved views active.
    }
  }, [savedAuditViews, savedAuditViewsHydrated]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setNativeBatchPosture((current) => ({
      ...current,
      loading: true,
      reason: current.nativeReady
        ? current.reason
        : "Loading native batch posture…",
    }));
    void (async () => {
      try {
        const posture = await readAnthropicNativeBatchPosture();
        if (cancelled) return;
        setNativeBatchPosture({
          loading: false,
          nativeReady: posture.nativeReady,
          mode: posture.mode,
          featureEnabled: posture.featureEnabled,
          paidApisAllowed: posture.paidApisAllowed,
          apiKeyConfigured: posture.apiKeyConfigured,
          reason: posture.reason,
        });
      } catch {
        if (cancelled) return;
        setNativeBatchPosture({
          loading: false,
          nativeReady: false,
          mode: "internal_fallback",
          featureEnabled: false,
          paidApisAllowed: false,
          apiKeyConfigured: false,
          reason:
            "Native batch posture is unavailable right now. Scheduler missions will continue on the internal batch lane.",
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

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
            aria-label="Close cron scheduler"
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
        <div style={{ flex: 1, overflowY: "auto", paddingBottom: "16px" }}>
          {focus === "hq-scheduler-composer" ? (
            <div style={{ padding: "12px 12px 0" }}>
              <SurfaceFocusStrip
                title="Focused session: scheduler composer"
                description="You opened the scheduler directly on mission composition so the draft prompt, cadence, and workflow defaults can be repaired without hunting through the drawer."
              />
            </div>
          ) : null}

          {focus === "hq-scheduler-governance" ? (
            <div style={{ padding: "12px 12px 0" }}>
              <SurfaceFocusStrip
                title="Focused session: scheduler governance"
                description="You opened the scheduler directly on governance so native-batch readiness, audit exports, and saved review views are visible before broader automation edits."
              />
            </div>
          ) : null}

          {focus === "hq-scheduler-jobs" ? (
            <div style={{ padding: "12px 12px 0" }}>
              <SurfaceFocusStrip
                title="Focused session: scheduler jobs"
                description="You opened the scheduler directly on active jobs so mission state, last artifact posture, and queue recovery actions are visible immediately."
              />
            </div>
          ) : null}

          <div id="cron-scheduler-composer" style={{ scrollMarginTop: "96px" }}>
            <CronSchedulerComposerSection
              name={name}
              prompt={prompt}
              cron={cron}
              jobType={jobType}
              outputTarget={outputTarget}
              approvalPolicy={approvalPolicy}
              missionAgent={missionAgent}
              missionScope={missionScope}
              missionReviewExpiryHours={missionReviewExpiryHours}
              missionReentrySummary={missionReentrySummary}
              workflowTopic={workflowTopic}
              error={error}
              automationCandidateWorkflows={automationCandidateWorkflows}
              reviewOnlyWorkflows={reviewOnlyWorkflows}
              onNameChange={setName}
              onPromptChange={setPrompt}
              onCronChange={setCron}
              onJobTypeChange={setJobType}
              onOutputTargetChange={setOutputTarget}
              onApprovalPolicyChange={setApprovalPolicy}
              onMissionAgentChange={setMissionAgent}
              onMissionScopeChange={setMissionScope}
              onMissionReviewExpiryHoursChange={setMissionReviewExpiryHours}
              onMissionReentrySummaryChange={setMissionReentrySummary}
              onWorkflowTopicChange={setWorkflowTopic}
              onAddJob={addJob}
              onApplyMissionTemplate={applyMissionTemplate}
              onApplyWorkflowTemplate={applyWorkflowTemplate}
            />
          </div>

          <div
            id="cron-scheduler-governance"
            style={{ scrollMarginTop: "96px" }}
          >
            <CronSchedulerGovernanceSection
              jobs={jobs}
              nativeBatchPosture={nativeBatchPosture}
              savedAuditViews={savedAuditViews}
              pendingImportedAuditViews={pendingImportedAuditViews}
              importSavedViewsInputRef={importSavedViewsInputRef}
              showSaveAuditView={showSaveAuditView}
              newAuditViewName={newAuditViewName}
              showPasteAuditViews={showPasteAuditViews}
              pastedAuditViewsText={pastedAuditViewsText}
              auditFilters={auditFilters}
              hasActiveAuditFilters={hasActiveAuditFilters}
              auditMsg={auditMsg}
              onCopySchedulerAudit={() => {
                void copySchedulerAudit();
              }}
              onExportSchedulerAudit={exportSchedulerAudit}
              onToggleSaveAuditView={() => {
                setShowSaveAuditView((current) => !current);
                setNewAuditViewName("");
              }}
              onExportSavedAuditViews={exportSavedAuditViews}
              onImportSavedAuditViewsClick={() =>
                importSavedViewsInputRef.current?.click()
              }
              onTogglePasteAuditViews={() => {
                setShowPasteAuditViews((current) => !current);
                if (showPasteAuditViews) {
                  setPastedAuditViewsText("");
                }
              }}
              onImportSavedAuditViewsFromFile={importSavedAuditViewsFromFile}
              onPastedAuditViewsTextChange={setPastedAuditViewsText}
              onPreviewPastedAuditViewsImport={previewPastedAuditViewsImport}
              onApplyImportedSavedAuditViews={applyImportedSavedAuditViews}
              onCancelImportedSavedAuditViews={() => {
                setPendingImportedAuditViews(null);
                setAuditMsg("Canceled saved audit view import preview.");
              }}
              onNewAuditViewNameChange={setNewAuditViewName}
              onSaveCurrentAuditView={saveCurrentAuditView}
              onApplySavedAuditView={(view) => {
                setAuditFilters({ ...view.filters });
                setAuditMsg(`Applied saved audit view ${view.name}.`);
              }}
              onRemoveSavedAuditView={(view) =>
                removeSavedAuditView(view.id, view.name)
              }
              onSetAuditFilters={setAuditFilters}
            />
          </div>

          <CronSchedulerAutoOpsSection
            profileLabel={profile.label}
            modeEnabled={modeEnabled}
            modeJobs={modeJobs}
            autoOpsLastRunAt={settings.autoOpsLastRunAt}
            cooldownMs={cooldownMs}
            now={now}
            nextSlotLabel={nextSlotLabel}
            fmtRemaining={fmtRemaining}
            onTriggerAutoJob={triggerAutoJob}
          />

          <div id="cron-scheduler-jobs" style={{ scrollMarginTop: "96px" }}>
            <CronSchedulerJobsSection
              sortedJobs={sortedJobs}
              auditFilters={auditFilters}
              hasActiveAuditFilters={hasActiveAuditFilters}
              onToggleJob={toggleJob}
              onRemoveJob={removeJob}
              onCopyJobAudit={copyJobAudit}
              onExportJobAudit={exportJobAudit}
              onClearQueuedJob={clearQueuedJob}
              onClearMissionReview={clearMissionReview}
            />
          </div>
        </div>
      </div>
    </>
  );
}
