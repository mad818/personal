"use client";

// OfficeCommandCenter
// ---------------------
// Visual "office environment" is encapsulated in `OfficeRoom3D` (right pane).
// This component owns only:
// - agent/tool execution state (runAgent loop)
// - chat terminal UI (messages + input)
// - wiring to the office visuals via props (activeAgent/routing/dispatched + agentPos)
//
// Token usage optimization hooks:
// - We pass only the latest user message to `runAgent` (no long chat history).
// - The office includes native 3D parity indicators for context/trash/server status.

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import PageTransition from "@/components/ui/PageTransition";
import MemoryPanel from "@/components/ui/MemoryPanel";
import CronSchedulerPanel from "@/components/ui/CronSchedulerPanel";
import SurfaceFocusStrip from "@/components/ui/SurfaceFocusStrip";
import { useSessionHrefAutoHeal } from "@/hooks/useSessionHrefAutoHeal";
import { useSurfaceFocusScroll } from "@/hooks/useSurfaceFocusScroll";
import { runAgent, type AgentStep } from "@/lib/agent";
import { buildSystemPrompt } from "@/lib/ai";
import { apiFetch } from "@/lib/apiFetch";
import { fetchJsonCached } from "@/lib/apiCache";
import {
  buildAssistantLiveRetrievalFallback,
  buildAssistantLiveRetrievalPromptBlock,
  type AssistantLiveRetrievalResult,
} from "@/lib/assistantLiveRetrieval";
import {
  renderContextBundle,
  selectContextAssets,
  type ContextAssetId,
} from "@/lib/contextPolicy";
import {
  buildLearningMissionPromptBlock,
} from "@/lib/learningMissions";
import { consumeQueuedHQPrompt } from "@/lib/hqPromptQueue";
import {
  buildMinedMemoryPromptBlock,
  type MemoryCompartment,
  type MinedMemory,
} from "@/lib/memoryMining";
import { gradeFromEvalScore } from "@/lib/helpers";
import { buildStackContextBlock } from "@/lib/projectContext";
import { RUNTIME_CACHE_TTL_MS, RUNTIME_POLL_MS } from "@/lib/runtimeConfig";
import {
  parseRuntimeEvalPayload,
  parseStatusPayload,
} from "@/lib/runtimeTypes";
import { buildMissionHref } from "@/lib/missionHandoff";
import {
  buildCouncilAdoptDraft,
  buildCouncilMergeDraft,
  resolveCouncilMembers,
  runCouncil,
  sortCouncilResults,
  type CouncilMember,
} from "@/lib/personaEngine";
import { useStore } from "@/store/useStore";
import {
  buildCapabilitiesBlock,
  buildFilteredLiveContextBundle,
  buildMemoryDiffBlock,
} from "@/lib/liveContext";
import { buildRagContextBlockAsync } from "@/lib/ragRouter";
import { getTopLessonsForAgent, getLessonTree } from "@/hooks/useLessons";
import { buildWorkflowPackPromptBlock, resolveWorkflowPackId } from "@/lib/workflowPacks";
import {
  detectRouteFromPrompt,
  detectRouteFromTool,
} from "@/lib/chatCapabilityRouting";
import {
  hasSwitchOperatorSignal,
  runSwitchOperator,
} from "@/lib/switchOperator";
import { buildVaultCaptureSuggestion } from "@/lib/vaultCapture";
import { buildVaultWeeklySynthesis } from "@/lib/vaultWeekly";
import type { CompiledMemoryPageSummary } from "@/components/vault/vaultGraphPageUtils";

import { detectAgent, buildAgentPrompt } from "./prompts";
import {
  buildHQRetrievalRetryDirective,
  hasVerifiedRetrievalStep,
  healHQAnswerForChronicle,
  resolveHQAnswerStylePlan,
  resolveHQTargetAgent,
} from "./hqAnswerStyle";
import { resolveHQAssistantContext } from "./hqAssistantContext";
import HQConsoleShellSection from "./HQConsoleShellSection";
import HQTerminalSection from "./HQTerminalSection";
import HQPreludePostureSection from "./HQPreludePostureSection";
import {
  resolveHQWorkflowCommand,
} from "./workflowCommands";
import {
  type StrategiumCommandVerb,
  HQStrategiumDeck,
} from "./HQStrategiumDeck";

import {
  AGENTS,
  AGENT_BREAK,
  AGENT_HOME,
  DISPATCH_LINES,
  OFFICE_LAYOUT_PRESETS,
  OFFICE_OPERATIONAL_PROFILES,
  type OfficeOperationalMode,
} from "./constants";
import type {
  AgentId,
  ChatMessage,
  CouncilResult,
  Emotion,
  HQAssistantIntent,
  PreparedWorkspaceTarget,
} from "./types";
import {
  CAMERA_PRESET_OPTIONS,
  computeAgentPos,
  type DispatchBar,
  formatRelativeTime,
  frontToneScore,
  humanizePhase,
  isEditableTarget,
  OFFICE_HEIGHT_DEFAULT_VH,
  OFFICE_HEIGHT_MAX_PX,
  OFFICE_HEIGHT_MIN_PX,
  OFFICE_HEIGHT_STEP_PX,
  type OfficeCameraPreset,
  SPLIT_LOCK_STORAGE_KEY,
  STRATEGIUM_PROMPTS,
} from "./officeCommandCenterConfig";
import {
  buildCommandTempo,
  buildMissionCodex,
  buildPostureSummary,
  buildPrimaryFront,
  buildRoomMissionLabel,
  buildRoomMissionNote,
  buildRoomMissionState,
  buildSessionRecap,
  buildStrategiumAgents,
  buildStrategiumFronts,
  buildStrategiumShortcuts,
  buildStrategiumSystems,
  buildStrategiumVerbs,
  buildThreatLabel,
  findLatestChronicle,
} from "./officeCommandCenterStrategium";
import {
  buildOfficeRunLessonProposal,
  buildOfficeRunSessionSummary,
  queueOfficeRunSideEffects,
} from "./officeCommandCenterPostRun";
import { runHQMetaCommand } from "./officeCommandCenterMeta";
import { useOfficeConsoleShellControls } from "./useOfficeConsoleShellControls";
import type { UnfinishedSessionArtifactClass } from "@/lib/assistantSessionMemory";

function classifyUnfinishedArtifactClass(input: {
  intent: HQAssistantIntent;
  capabilityId: string;
  routeHint?: string | null;
}) : UnfinishedSessionArtifactClass {
  if (
    input.intent === "learning" ||
    input.capabilityId === "guided-learning"
  ) {
    return "study";
  }
  if (input.capabilityId === "memory-palace") {
    return "memory_palace";
  }
  if (
    input.capabilityId === "reverse-engineering" ||
    input.routeHint?.startsWith("/recon")
  ) {
    return "reverse_engineering";
  }
  if (input.capabilityId === "second-brain") {
    return "second_brain";
  }
  if (input.capabilityId === "scheduler-governance") {
    return "scheduler";
  }
  if (
    input.intent === "archive_continuity" ||
    input.intent === "memory_recall"
  ) {
    return "archive";
  }
  if (input.intent === "repo_work") {
    return "repo_work";
  }
  if (input.intent === "live_current") {
    return "live_context";
  }
  return "generic";
}

function getContinuationValue(input: {
  intent: HQAssistantIntent;
  capabilityId: string;
  preparedWorkspace: PreparedWorkspaceTarget | null;
}) {
  if (!input.preparedWorkspace) return 0;
  if (
    input.intent === "learning" ||
    input.capabilityId === "guided-learning"
  ) {
    return 90;
  }
  if (
    input.capabilityId === "memory-palace"
  ) {
    return 86;
  }
  if (
    input.intent === "repo_work" ||
    input.intent === "research" ||
    input.intent === "archive_continuity" ||
    input.capabilityId === "reverse-engineering"
  ) {
    return 92;
  }
  if (
    input.intent === "memory_recall" ||
    input.capabilityId === "second-brain"
  ) {
    return 88;
  }
  if (
    input.intent === "workspace_action" ||
    input.intent === "product_help" ||
    input.capabilityId === "scheduler-governance"
  ) {
    return 82;
  }
  if (input.intent === "live_current") {
    return 78;
  }
  return 74;
}

function selectMemoryCompartment(input: {
  intent: HQAssistantIntent;
  capabilityId: string;
  query: string;
  workflowCompartment?: MemoryCompartment | null;
}) : MemoryCompartment | null {
  if (input.workflowCompartment) {
    return input.workflowCompartment;
  }
  const lower = input.query.toLowerCase();
  if (
    input.intent === "repo_work" ||
    /\b(repo|repository|codebase|component|hook|api route|refactor|typescript|next\.?js|react)\b/i.test(
      lower,
    )
  ) {
    return "project";
  }
  if (
    input.intent === "learning" ||
    input.intent === "memory_recall" ||
    /\b(research|sources|evidence|citation|synthesis|write this up|rebuttal)\b/i.test(
      lower,
    )
  ) {
    return "research";
  }
  if (
    /\b(quiz|practice|study plan|teach|explain|checkpoint|review sheet)\b/i.test(
      lower,
    )
  ) {
    return "study";
  }
  if (
    /\b(what do we know|what have we done|review|quiz|teach|explain|practice|study)\b/i.test(
      lower,
    )
  ) {
    return "conversation";
  }
  if (
    input.capabilityId === "memory-palace" ||
    /\b(vault|archive|saved article|general memory|reference)\b/i.test(lower)
  ) {
    return "general";
  }
  return null;
}

function buildLessonsPromptBlock(agentId: AgentId, rules: { rule: string }[]) {
  if (rules.length === 0) return "";
  return (
    `\n\n[OPERATOR LESSONS — domain-scoped rules for ${agentId}]\n` +
    rules.map((rule) => `• ${rule.rule}`).join("\n") +
    `\n[END LESSONS]\n`
  );
}

async function fetchProjectContextSlices(
  section: "agents" | "standards" | "state" | "bible",
  slices?: string[],
) {
  const targets = slices && slices.length > 0 ? slices : [null];
  const parts = await Promise.all(
    targets.map(async (slice) => {
      const key = slice
        ? `project:${section}:${slice}`
        : `project:${section}:full`;
      const endpoint = slice
        ? `/api/project?section=${section}&slice=${slice}`
        : `/api/project?section=${section}`;
      const data = await fetchJsonCached(
        key,
        async () => {
          const response = await apiFetch(endpoint, { cache: "no-store" });
          if (!response.ok) return { content: "" };
          return (await response.json()) as { content?: string };
        },
        15_000,
      );
      return data.content ?? "";
    }),
  );
  return parts.filter(Boolean).join("\n\n");
}

export default function OfficeCommandCenter() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  useSessionHrefAutoHeal();
  const settings = useStore((s) => s.settings);
  const prices = useStore((s) => s.prices);
  const fearGreed = useStore((s) => s.signals?.fg);
  const worldRisk = useStore((s) => s.worldRisk);
  const articles = useStore((s) => s.articles);
  const cves = useStore((s) => s.cves);
  const agentStats = useStore((s) => s.agentStats);
  const agentRuntime = useStore((s) => s.agentRuntime);
  const modeBriefings = useStore((s) => s.modeBriefings);
  const addOfficeMessage = useStore((s) => s.addOfficeMessage);
  const clearOfficeMessages = useStore((s) => s.clearOfficeMessages);
  const officeMessages = useStore((s) => s.officeMessages);
  const setContextLoadReport = useStore((s) => s.setContextLoadReport);
  const setPreparedWorkspace = useStore((s) => s.setPreparedWorkspace);
  const clearPreparedWorkspace = useStore((s) => s.clearPreparedWorkspace);
  const setPrivacyShieldStatus = useStore((s) => s.setPrivacyShieldStatus);
  const setSwitchOperatorStatus = useStore((s) => s.setSwitchOperatorStatus);
  const patchSwitchOperatorStatus = useStore((s) => s.patchSwitchOperatorStatus);
  const unfinishedSessions = useStore((s) => s.unfinishedSessions);
  const rememberUnfinishedSession = useStore((s) => s.rememberUnfinishedSession);
  const officeEditMode = useStore((s) => s.officeEditMode);
  const setOfficeEditMode = useStore((s) => s.setOfficeEditMode);
  const resetOfficeLayout = useStore((s) => s.resetOfficeLayout);
  const officeLayout = useStore((s) => s.officeLayout);
  const updateSettings = useStore((s) => s.updateSettings);
  const lessons = useStore((s) => s.lessons);
  const reinforceLesson = useStore((s) => s.reinforceLesson);
  const officeSceneMode = settings.officeSceneMode ?? "auto";
  const surfaceMotionProfile = settings.surfaceMotionProfile ?? "flagship";
  const officeMotion = settings.officeMotion ?? 1;
  const officeCameraPreset = (settings.officeCameraPreset ??
    "cinematic") as OfficeCameraPreset;
  const officeSplitHeightPx = settings.officeSplitHeightPx ?? 0;
  const officeOperationalMode = settings.officeOperationalMode ?? "normal";
  const officeVfxQuality = (settings.officeVfxQuality ?? "low") as
    | "off"
    | "low"
    | "high";
  const setOfficeLayout = useStore((s) => s.setOfficeLayout);
  const setTab = useStore((s) => s.setTab);
  const addNotification = useStore((s) => s.addNotification);
  const addLog          = useStore((s) => s.addLog);
  const addPendingEdit  = useStore((s) => s.addPendingEdit);
  const activePersona    = useStore((s) => s.activePersona);
  const councilMode      = useStore((s) => s.councilMode);
  const setCouncilResults = useStore((s) => s.setCouncilResults);
  const clearCouncilResults = useStore((s) => s.clearCouncilResults);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");

  const [activeAgent, setActiveAgent] = useState<AgentId | null>(null);
  const [routingAgent, setRoutingAgent] = useState<AgentId | null>(null);
  const [dispatchedTo, setDispatchedTo] = useState<AgentId | null>(null);

  const [dispatchBubble, setDispatchBubble] = useState<string | null>(null);
  const [dispatchBar, setDispatchBar] = useState<DispatchBar | null>(null);

  const [emotion, setEmotion] = useState<Emotion>("idle");
  const [liveSteps, setLiveSteps] = useState<AgentStep[]>([]);
  const [memoryOpen, setMemoryOpen] = useState(false);
  const [schedulerOpen, setSchedulerOpen] = useState(false);
  const [idleRoamPos, setIdleRoamPos] = useState<Record<
    AgentId,
    { x: number; y: number }
  > | null>(null);
  const [officeHeightPx, setOfficeHeightPx] = useState<number | null>(null);
  const [splitNotice, setSplitNotice] = useState<string | null>(null);
  const [splitDragLocked, setSplitDragLocked] = useState(false);
  const [compactSplitControls, setCompactSplitControls] = useState(false);
  const [showSplitMore, setShowSplitMore] = useState(false);
  const [viewportHeight, setViewportHeight] = useState(0);
  const [clockLabel, setClockLabel] = useState("--:--:--");
  const [evalGrade, setEvalGrade] = useState<"A" | "B" | "C" | "unknown">(
    "unknown",
  );
  const [evalTrail, setEvalTrail] = useState<string>("");
  const [evalStale, setEvalStale] = useState(false);
  const [evalFailureCount, setEvalFailureCount] = useState(0);
  const [evalUpdatedAt, setEvalUpdatedAt] = useState<number | null>(null);

  // ── Memento-Skills: post-run lesson proposal ──────────────────────────────
  // After a substantive run (>= 2 tool calls), propose a lesson for approval.
  // User can approve (→ log_lesson) or dismiss. Based on the OpenClaw pattern
  // of never auto-committing agent-generated lessons without human review.
  const [pendingLesson, setPendingLesson] = useState<{
    text: string;
    agent: string;
  } | null>(null);
  const searchParamFocus = searchParams.get("focus");
  const [focus, setFocus] = useState<string | null>(searchParamFocus);
  const schedulerFocus =
    focus === "hq-scheduler-composer" ||
    focus === "hq-scheduler-governance" ||
    focus === "hq-scheduler-jobs"
      ? focus
      : null;
  const focusTargetId =
    focus === "hq-strategium"
      ? "hq-strategium"
      : focus === "hq-console-shell"
        ? "hq-console-shell"
        : focus === "hq-chronicle"
          ? "hq-chronicle"
          : null;

  useEffect(() => {
    if (searchParamFocus) {
      setFocus(searchParamFocus);
      return;
    }
    if (typeof window === "undefined") {
      setFocus(null);
      return;
    }
    try {
      setFocus(new URLSearchParams(window.location.search).get("focus"));
    } catch {
      setFocus(null);
    }
  }, [pathname, searchParamFocus]);

  // Local scroll management for the terminal chat area.
  const chronicleScrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const prevEvalGradeRef = useRef<"A" | "B" | "C" | "unknown">("unknown");

  useEffect(() => {
    if (activeAgent || input.trim().length > 0) return;
    const queuedPrompt = consumeQueuedHQPrompt();
    if (!queuedPrompt) return;
    setInput(queuedPrompt);
    window.setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.setSelectionRange(
        queuedPrompt.length,
        queuedPrompt.length,
      );
    }, 0);
  }, [activeAgent, input]);

  // Keep emotion in sync when we transition from thinking -> working -> done.
  useEffect(() => {
    if (!activeAgent) return;
    if (
      emotion !== "working" &&
      emotion !== "excited" &&
      emotion !== "thinking"
    )
      setEmotion("working");
  }, [activeAgent]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const viewport = chronicleScrollRef.current;
    if (!viewport) return;
    viewport.scrollTo({
      top: viewport.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, liveSteps, emotion]);

  useEffect(() => {
    if (officeHeightPx !== null) return;
    const fromSettings = Number(officeSplitHeightPx || 0);
    const fallback = Math.round(
      (window.innerHeight * OFFICE_HEIGHT_DEFAULT_VH) / 100,
    );
    const initial = fromSettings > 0 ? fromSettings : fallback;
    const maxByViewport = Math.round(window.innerHeight * 0.62);
    const maxAllowed = Math.max(
      OFFICE_HEIGHT_MIN_PX,
      Math.min(OFFICE_HEIGHT_MAX_PX, maxByViewport),
    );
    setOfficeHeightPx(
      Math.max(OFFICE_HEIGHT_MIN_PX, Math.min(maxAllowed, initial)),
    );
  }, [officeHeightPx, officeSplitHeightPx]);

  useEffect(() => {
    if (!splitNotice) return;
    const t = window.setTimeout(() => setSplitNotice(null), 950);
    return () => window.clearTimeout(t);
  }, [splitNotice]);

  useSurfaceFocusScroll(focusTargetId);

  useEffect(() => {
    if (!schedulerFocus) return;
    setSchedulerOpen(true);
  }, [schedulerFocus]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SPLIT_LOCK_STORAGE_KEY);
      setSplitDragLocked(raw === "1");
    } catch {
      // silent fail
    }
  }, []);

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (typeof document !== "undefined" && document.hidden) return;
      try {
        const d = await fetchJsonCached(
          "status:readiness",
          async () => {
            const r = await apiFetch("/api/status");
            return await r.json();
          },
          RUNTIME_CACHE_TTL_MS.statusReadiness,
        );
        const statusData = parseStatusPayload(d);
        const trailRaw = await fetchJsonCached(
          "runtime-eval:limit=5",
          async () => {
            const trailRes = await apiFetch(
              "/api/metrics/runtime-eval?limit=5",
            );
            return await trailRes.json();
          },
          RUNTIME_CACHE_TTL_MS.runtimeEvalLimit5,
        );
        const trailData = parseRuntimeEvalPayload(trailRaw);
        if (!active) return;
        const nextGrade =
          statusData?.readiness?.evalPolicy?.rollup?.grade ?? "unknown";
        const prevGrade = prevEvalGradeRef.current;
        setEvalGrade(nextGrade);
        setEvalUpdatedAt(Date.now());
        const stale = Boolean(
          statusData?.readiness?.evalPolicy?.rollup?.stale ??
          trailData?.freshness?.stale,
        );
        setEvalStale(stale);
        const failureCount =
          (trailData?.failures?.checks?.length ?? 0) +
          (trailData?.failures?.categories?.length ?? 0);
        setEvalFailureCount(failureCount);
        const trail = (trailData.history ?? [])
          .map((h) => {
            const score = Number(h.score ?? 0);
            return gradeFromEvalScore(score);
          })
          .join(" > ");
        setEvalTrail(trail);

        // Alert when quality posture drops from A/B to lower grade.
        if (
          (prevGrade === "A" || prevGrade === "B") &&
          (nextGrade === "C" || nextGrade === "unknown")
        ) {
          const reasons =
            statusData?.readiness?.evalPolicy?.rollup?.degradedReasons ?? [];
          const reasonHint = reasons.length
            ? reasons.slice(0, 3).join(", ")
            : "unknown cause";
          const incidentText = `Runtime eval grade ${prevGrade} -> ${nextGrade}${stale ? " (stale)" : ""} · ${reasonHint}`;
          addNotification({
            type: "system",
            severity: "high",
            title: "Runtime eval grade dropped",
            message: `Eval grade ${prevGrade} -> ${nextGrade}. ${reasonHint}${stale ? " (stale)" : ""}`,
            source: "runtime-eval",
          });
          addLog({
            type: "system",
            text: incidentText,
            color: "#ef4444",
          });
        }
        prevEvalGradeRef.current = nextGrade;
      } catch {
        if (!active) return;
        setEvalGrade("unknown");
      }
    };
    void load();
    const timer = window.setInterval(() => {
      void load();
    }, RUNTIME_POLL_MS.hqStatus);
    const onVisible = () => {
      if (!document.hidden) void load();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      active = false;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [addNotification, addLog]);

  useEffect(() => {
    const onResize = () => {
      const compact = window.innerWidth < 980;
      setCompactSplitControls(compact);
      setViewportHeight(window.innerHeight);
      if (!compact) setShowSplitMore(false);
    };
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    const renderClock = () =>
      setClockLabel(
        new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
      );
    renderClock();
    const id = window.setInterval(renderClock, 1000);
    return () => window.clearInterval(id);
  }, []);

  const agentPos = useMemo(() => {
    return computeAgentPos({
      activeAgent,
      routingAgent,
      dispatchedTo,
      idleRoamPos,
    });
  }, [activeAgent, routingAgent, dispatchedTo, idleRoamPos]);

  // Ambient roaming to make HQ feel like a live workplace when idle.
  useEffect(() => {
    if (activeAgent || routingAgent || dispatchedTo) {
      setIdleRoamPos(null);
      return;
    }

    let mounted = true;
    const ids = Object.keys(AGENTS) as AgentId[];
    const makeRoam = () => {
      const next = {} as Record<AgentId, { x: number; y: number }>;
      ids.forEach((id) => {
        const spots = [AGENT_HOME[id], ...AGENT_BREAK[id]];
        const shouldRoam = Math.random() < 0.62;
        const target = shouldRoam
          ? spots[Math.floor(Math.random() * spots.length)]
          : AGENT_HOME[id];
        next[id] = { x: target.x, y: target.y };
      });
      return next;
    };

    setIdleRoamPos(makeRoam());
    const timer = window.setInterval(() => {
      if (!mounted) return;
      setIdleRoamPos(makeRoam());
    }, 5200);

    return () => {
      mounted = false;
      window.clearInterval(timer);
    };
  }, [activeAgent, routingAgent, dispatchedTo]);

  const isThinking = useMemo(() => {
    return liveSteps.some((s) => s.type === "thinking");
  }, [liveSteps]);

  const dutyAgent = useMemo<AgentId>(() => {
    // Match existing behavior: default to JANSKY when idle.
    return activeAgent ?? "jansky";
  }, [activeAgent]);

  const handleClear = useCallback(() => {
    setMessages([]);
    setLiveSteps([]);
    setActiveAgent(null);
    setRoutingAgent(null);
    setDispatchedTo(null);
    setDispatchBubble(null);
    setDispatchBar(null);
    setEmotion("idle");
    clearCouncilResults();
    clearOfficeMessages();
    clearPreparedWorkspace();
    setPrivacyShieldStatus(null);
    setContextLoadReport(null);
  }, [
    clearCouncilResults,
    clearOfficeMessages,
    clearPreparedWorkspace,
    setPrivacyShieldStatus,
    setContextLoadReport,
  ]);

  const openMemoryLane = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed || activeAgent) return;
    setTab("command");
    router.push(`/command?memoryAsk=${encodeURIComponent(trimmed)}`);
  }, [activeAgent, input, router, setTab]);

  const send = useCallback(async () => {
    const value = input.trim();
    if (!value) return;
    if (activeAgent) return;
    setPrivacyShieldStatus(null);
    const AGENT_PIN_RE = /^@(jansky|orbit|nova|cipher|flux):\s*/i;
    const pinMatch = value.match(AGENT_PIN_RE);
    const unpinnedValue = pinMatch ? value.replace(AGENT_PIN_RE, "").trim() : value;
    const workflow = resolveHQWorkflowCommand(unpinnedValue);
    const operatorRequested =
      workflow?.id === "operator" || hasSwitchOperatorSignal(unpinnedValue);
    const answerStylePlan = resolveHQAnswerStylePlan(unpinnedValue, {
      hasWorkflow: Boolean(workflow),
    });
    const operatorPlan = operatorRequested
      ? await runSwitchOperator({ command: unpinnedValue })
      : null;
    if (operatorPlan) {
      setSwitchOperatorStatus(operatorPlan.status);
    }
    const routeFromPrompt =
      operatorPlan?.routeHint ??
      workflow?.route ??
      detectRouteFromPrompt(unpinnedValue);
    const assistantContext = resolveHQAssistantContext({
      input: unpinnedValue,
      answerStyle: answerStylePlan.style,
      routeHint: routeFromPrompt,
      unfinishedSessions,
    });
    let liveRetrieval: AssistantLiveRetrievalResult | null = null;
    let minedMemory: MinedMemory[] = [];

    if (answerStylePlan.verifiedRetrievalRequired) {
      try {
        const params = new URLSearchParams({ q: unpinnedValue });
        if (routeFromPrompt) params.set("routeHint", routeFromPrompt);
        const response = await apiFetch(`/api/assistant/retrieve?${params.toString()}`, {
          cache: "no-store",
        });
        if (response.ok) {
          liveRetrieval = (await response.json()) as AssistantLiveRetrievalResult;
        }
      } catch {
        liveRetrieval = null;
      }
    }

    const memoryCompartment = selectMemoryCompartment({
      intent: assistantContext.intent,
      capabilityId: assistantContext.capabilityId,
      query: unpinnedValue,
      workflowCompartment: assistantContext.learningMission?.memoryCompartment ?? null,
    });
    const shouldMineMemory =
      assistantContext.intent === "learning" ||
      assistantContext.intent === "research" ||
      assistantContext.intent === "memory_recall" ||
      assistantContext.capabilityId === "memory-palace" ||
      assistantContext.learningMission?.workflowPackId === "research-workflow";

    if (shouldMineMemory) {
      try {
        const params = new URLSearchParams({
          q: unpinnedValue,
          limit: assistantContext.intent === "learning" ? "4" : "3",
        });
        if (memoryCompartment) {
          params.set("compartment", memoryCompartment);
        }
        const response = await apiFetch(`/api/memory/mine?${params.toString()}`, {
          cache: "no-store",
        });
        if (response.ok) {
          const data = (await response.json()) as { mined?: MinedMemory[] };
          minedMemory = Array.isArray(data.mined) ? data.mined : [];
        }
      } catch {
        minedMemory = [];
      }
    }

    // ── M8: /meta command — JANSKY analyses learnings and proposes one prompt fix ──
    if (value.toLowerCase().startsWith("/meta")) {
      clearPreparedWorkspace();
      setInput("");
      setMessages((prev) => [...prev, { role: "user", text: value }]);
      setActiveAgent("jansky");
      setEmotion("thinking");
      try {
        const metaResult = await runHQMetaCommand();
        if (metaResult.kind === "pending_edit") {
          addPendingEdit(metaResult.edit);
        }
        setMessages((prev) => [
          ...prev,
          { role: "agent", agent: "jansky", text: metaResult.text },
        ]);
        setEmotion("success");
        setTimeout(() => setEmotion("happy"), 550);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Meta-analysis failed.";
        setMessages((prev) => [
          ...prev,
          { role: "agent", agent: "jansky" as import("@/components/home/office/types").AgentId, text: `Error: ${msg}` },
        ]);
        setEmotion("error");
      } finally {
        setTimeout(() => { setActiveAgent(null); setEmotion("idle"); }, 1200);
      }
      return;
    }
    // ─────────────────────────────────────────────────────────────────────────────

    clearCouncilResults();
    setInput("");
    setLiveSteps([]);
    setDispatchBubble(null);
    setDispatchBar(null);

    // Persist messages for the "LLM fuel" and trash-can environment props.
    addOfficeMessage({ role: "user", text: value });

    // Display in terminal UI (local, includes steps).
    setMessages((prev) => [...prev, { role: "user", text: value }]);

    // Phase 1: JANSKY routing + animation.
    setRoutingAgent("jansky");
    setEmotion("thinking");

    // Give the office time to show a routing flash.
    await new Promise((r) => setTimeout(r, 450));

    // Allow operator to force an agent with @AGENTNAME: prefix.
    // E.g. "@ORBIT: fix the bug in lib/agent.ts" — skips auto-detection.
    const detectedTarget = workflow?.agent ?? detectAgent(unpinnedValue);
    const target: AgentId = pinMatch
      ? (pinMatch[1].toLowerCase() as AgentId)
      : operatorPlan?.targetAgent ??
        resolveHQTargetAgent(answerStylePlan, detectedTarget);
    // Strip the pin prefix from the payload sent to the agent.
    const agentInput =
      operatorPlan?.agentPrompt ?? workflow?.userPrompt ?? unpinnedValue;
    const shouldRunCouncil =
      councilMode && !pinMatch && !workflow && !operatorRequested;

    // Phase 2: dispatch ring + travel bar (only when specialist != JANSKY).
    if (target !== "jansky") {
      setDispatchBubble(DISPATCH_LINES[target] ?? `→ ${target}`);
      setDispatchBar({ from: "jansky", to: target });
      setDispatchedTo(target);
      setEmotion("excited");

      await new Promise((r) => setTimeout(r, 700));

      setActiveAgent(target);
      setRoutingAgent(null);
      setDispatchedTo(null);
      setDispatchBubble(null);
      setDispatchBar(null);
    } else {
      setActiveAgent("jansky");
      setRoutingAgent(null);
      setDispatchedTo(null);
      setEmotion("working");
    }

    if (operatorPlan && !operatorPlan.dispatch) {
      if (operatorPlan.preparedWorkspace) {
        setPreparedWorkspace(operatorPlan.preparedWorkspace, {
          intent: "workflow",
          sourceQuery: value,
        });
        rememberUnfinishedSession(operatorPlan.preparedWorkspace, {
          intent: "workflow",
          sourceQuery: value,
          confidence: 90,
          completionState: "prepared",
        });
      } else {
        clearPreparedWorkspace();
      }
      setMessages((prev) => [
        ...prev,
        {
          role: "agent",
          agent: "jansky",
          text: operatorPlan.summary,
          sourceQuery: value,
          answerStyle: "workflow",
          responseKind: "workflow",
          assistantIntent: "workflow",
          preparedWorkspace: operatorPlan.preparedWorkspace,
        },
      ]);
      addOfficeMessage({
        role: "agent",
        agent: "jansky",
        text: operatorPlan.summary,
      });
      setEmotion(operatorPlan.status.mode === "blocked" ? "error" : "success");
      setTimeout(() => {
        setActiveAgent(null);
        setEmotion("idle");
        setLiveSteps([]);
      }, 1200);
      return;
    }

    // Memory diff — injects a one-line summary of the last session's outcome
    const memDiff = answerStylePlan.includeMemoryDiff
      ? buildMemoryDiffBlock(settings.lastSessionSummary ?? "")
      : "";
    const systemBase = buildSystemPrompt(settings, memDiff);
    const learningMissionBlock = buildLearningMissionPromptBlock(
      assistantContext.learningMission,
    );
    const minedMemoryBlock = buildMinedMemoryPromptBlock(minedMemory);

    const workflowPackId = resolveWorkflowPackId({
      assistantIntent: assistantContext.intent,
      capabilityId: assistantContext.capabilityId,
      learningMission: assistantContext.learningMission,
      query: agentInput,
    });
    const lessonTree = getLessonTree();

    const buildPromptForAgent = async (
      agentId: AgentId,
      personaMode: CouncilMember["persona"],
    ) => {
      const manifest = selectContextAssets({
        query: agentInput,
        answerStyle: answerStylePlan.style,
        assistantIntent: assistantContext.intent,
        capabilityId: assistantContext.capabilityId,
        routeHint: routeFromPrompt,
        filePath:
          agentInput.match(
            /\b(?:app|components|lib|store|hooks|scripts|tests|docs)\/[A-Za-z0-9._/-]+\.(?:[cm]?tsx?|md|mjs|json)\b/,
          )?.[0] ?? null,
        learningMission: assistantContext.learningMission,
        workflowPackId,
        verifiedRetrievalRequired: answerStylePlan.verifiedRetrievalRequired,
        includeLessons: answerStylePlan.includeLessons,
        includeLiveContext:
          answerStylePlan.includeLiveContext ||
          answerStylePlan.style === "live_current",
        hasMinedMemory: minedMemory.length > 0,
        hasPreparedWorkspace: Boolean(
          assistantContext.preparedWorkspaceBlock.trim(),
        ),
        hasContinuation: Boolean(assistantContext.continuationBlock.trim()),
        hasVerificationDocs:
          Boolean(liveRetrieval) ||
          answerStylePlan.includeRag ||
          assistantContext.intent === "research",
      });
      const wantsLiveIntel = manifest.assets.some(
        (asset) => asset.id === "live_intel",
      );
      const wantsLessons = manifest.assets.some((asset) => asset.id === "lessons");
      const wantsVerification = manifest.assets.some(
        (asset) => asset.id === "retrieval_docs",
      );
      const liveBundle = wantsLiveIntel
        ? buildFilteredLiveContextBundle(useStore.getState(), agentId, {
            maxChars: manifest.laneBudgetChars,
            includeStackContext: false,
            includeLearnings: false,
          })
        : {
            context: "",
            report: {
              chars: 0,
              compacted: false,
            },
          };
      const ragBlock =
        wantsVerification && !liveRetrieval
          ? await buildRagContextBlockAsync(agentInput, {
              savedArticles: useStore.getState().savedArticles,
            })
          : "";
      const liveRetrievalBlock =
        wantsVerification && liveRetrieval
          ? buildAssistantLiveRetrievalPromptBlock(liveRetrieval)
          : "";
      const topLessons = wantsLessons
        ? lessonTree
          ? getTopLessonsForAgent(lessonTree, agentInput, agentId, 3)
          : lessons.slice(0, 3)
        : [];
      const lessonsBlock = buildLessonsPromptBlock(agentId, topLessons);
      const contentByAsset: Partial<Record<ContextAssetId, string>> = {};
      for (const asset of manifest.assets) {
        if (!asset.section) continue;
        contentByAsset[asset.id] = await fetchProjectContextSlices(
          asset.section,
          asset.slices,
        );
      }
      contentByAsset.live_intel = liveBundle.context;
      contentByAsset.stack = buildStackContextBlock();
      contentByAsset.workflow_pack = buildWorkflowPackPromptBlock(workflowPackId);
      contentByAsset.learning_mission = learningMissionBlock;
      contentByAsset.retrieval_docs = liveRetrievalBlock || ragBlock;
      contentByAsset.mined_memory = minedMemoryBlock;
      contentByAsset.assistant_context =
        assistantContext.promptBlock + buildCapabilitiesBlock(agentId);
      contentByAsset.continuation = assistantContext.continuationBlock;
      contentByAsset.prepared_workspace = assistantContext.preparedWorkspaceBlock;
      contentByAsset.lessons = lessonsBlock;
      const contextBundle = renderContextBundle({
        manifest,
        contentByAsset,
      });

      return {
        enrichedPrompt:
          buildAgentPrompt(agentId, systemBase, personaMode) +
          answerStylePlan.promptDirective +
          contextBundle.context +
          (workflow?.systemDirective ?? ""),
        contextReport: contextBundle.report,
        liveReport: liveBundle.report,
        ragChars: ragBlock.length,
        lessonsChars: lessonsBlock.length,
        lessonIds: topLessons.map((lesson) => lesson.id),
      };
    };

    if (shouldRunCouncil) {
      const members = resolveCouncilMembers({
        target,
        intent: assistantContext.intent,
        routeHint: routeFromPrompt,
      });
      const councilBuilds = await Promise.all(
        members.map(async (member) => ({
          member,
          build: await buildPromptForAgent(member.agent, member.persona),
        })),
      );
      const firstBuild = councilBuilds[0]?.build ?? null;
      setContextLoadReport(firstBuild?.contextReport ?? null);
      Array.from(
        new Set(councilBuilds.flatMap(({ build }) => build.lessonIds)),
      ).forEach((lessonId) => reinforceLesson(lessonId));

      const councilPromptMap = new Map(
        councilBuilds.map(({ member, build }) => [
          `${member.agent}:${member.persona}`,
          build,
        ]),
      );
      const councilIntroStep: AgentStep = {
        type: "thinking",
        content: `Council convened: ${members
          .map(
            (member) =>
              `${member.agent.toUpperCase()} [${member.persona}]`,
          )
          .join(" · ")}`,
      };
      let latestCouncilSteps: AgentStep[] = [councilIntroStep];
      setLiveSteps([...latestCouncilSteps]);

      try {
        const partialResults: CouncilResult[] = [];
        const results = await runCouncil({
          message: agentInput,
          members,
          buildSystemPrompt: (member) =>
            councilPromptMap.get(`${member.agent}:${member.persona}`)
              ?.enrichedPrompt ?? systemBase,
          onPartialResult: (result) => {
            partialResults.push(result);
            const sorted = sortCouncilResults(partialResults, members);
            setCouncilResults(sorted);
            latestCouncilSteps = [
              councilIntroStep,
              ...sorted.map((entry) => ({
                type: "thinking" as const,
                content: `${entry.agent.toUpperCase()} [${entry.persona}] ready in ${(
                  entry.duration / 1000
                ).toFixed(1)}s`,
              })),
            ];
            setLiveSteps([...latestCouncilSteps]);
          },
        });

        if (results.length === 0) {
          throw new Error(
            "Council returned no answers. Retry once the active AI lane is healthy.",
          );
        }

        setCouncilResults(results);
        clearPreparedWorkspace();
        const councilSummary = `Council complete: ${results
          .map((result) => `${result.agent.toUpperCase()} [${result.persona}]`)
          .join(" · ")}. Review the side-by-side answers below, use one as a draft, or merge them back through JANSKY.`;
        setMessages((prev) => [
          ...prev,
          {
            role: "agent",
            agent: "jansky",
            text: councilSummary,
            steps: latestCouncilSteps,
            sourceQuery: value,
            assistantIntent: assistantContext.intent,
          },
        ]);
        addOfficeMessage({
          role: "agent",
          agent: "jansky",
          text: councilSummary,
        });
        updateSettings({
          lastSessionSummary: buildOfficeRunSessionSummary({
            query: value,
            result: councilSummary,
            steps: latestCouncilSteps,
            target: "jansky",
          }),
        });
        setEmotion("success");
        setTimeout(() => setEmotion("happy"), 550);
      } catch (err) {
        clearPreparedWorkspace();
        setCouncilResults([]);
        const msg =
          err instanceof Error ? err.message : "Council dispatch failed.";
        setMessages((prev) => [
          ...prev,
          {
            role: "agent",
            agent: "jansky",
            text: `Error: ${msg}`,
            steps: latestCouncilSteps,
            sourceQuery: value,
            assistantIntent: assistantContext.intent,
          },
        ]);
        addOfficeMessage({
          role: "agent",
          agent: "jansky",
          text: `Error: ${msg}`,
        });
        setEmotion("error");
      } finally {
        setTimeout(() => {
          setActiveAgent(null);
          setEmotion("idle");
          setLiveSteps([]);
        }, 1200);
      }
      return;
    }

    if (workflow?.id === "vault-weekly") {
      try {
        const weeklyResponse = await apiFetch("/api/memory/pages?limit=48", {
          cache: "no-store",
        });
        const weeklyPayload = weeklyResponse.ok
          ? ((await weeklyResponse.json()) as {
              pages?: CompiledMemoryPageSummary[];
            })
          : { pages: [] };
        const weeklyPages = Array.isArray(weeklyPayload.pages)
          ? weeklyPayload.pages
          : [];
        const weeklySynthesis = await buildVaultWeeklySynthesis({
          savedArticles: useStore.getState().savedArticles,
          compiledPages: weeklyPages,
        });
        clearPreparedWorkspace();
        setMessages((prev) => [
          ...prev,
          {
            role: "agent",
            agent: target,
            text: weeklySynthesis.content,
            sourceQuery: value,
            answerStyle: "workflow",
            responseKind: "workflow",
            assistantIntent: "workflow",
          },
        ]);
        addOfficeMessage({
          role: "agent",
          agent: target,
          text: weeklySynthesis.content,
        });
        queueOfficeRunSideEffects({
          query: value,
          result: weeklySynthesis.content,
          steps: [],
          target,
          workflow,
          artifactOverrides: {
            title: "Vault weekly · Archive synthesis",
            summary:
              "Seven-day archive synthesis with compact themes, repair lane, and strongest next session.",
            sourceLabel: "Vault weekly synthesis",
            topic: "Weekly archive synthesis",
            route: "/command",
            workflowPackId: "second-brain",
            memoryCompartment: "conversation",
            sourceRefs: weeklySynthesis.sourceRefs,
            sourceType: "memory-spine",
            evidenceStrength: "contextual",
            extraTags: weeklySynthesis.tags,
          },
        });
        setEmotion("success");
        setTimeout(() => setEmotion("happy"), 550);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Weekly synthesis failed.";
        clearPreparedWorkspace();
        setMessages((prev) => [
          ...prev,
          {
            role: "agent",
            agent: target,
            text: `Error: ${msg}`,
            sourceQuery: value,
            answerStyle: "workflow",
            responseKind: "workflow",
            assistantIntent: "workflow",
          },
        ]);
        addOfficeMessage({ role: "agent", agent: target, text: `Error: ${msg}` });
        setEmotion("error");
      } finally {
        setTimeout(() => {
          setActiveAgent(null);
          setEmotion("idle");
          setLiveSteps([]);
        }, 1200);
      }
      return;
    }

    const promptBuild = await buildPromptForAgent(target, activePersona);
    setContextLoadReport(promptBuild.contextReport);
    Array.from(new Set(promptBuild.lessonIds)).forEach((lessonId) =>
      reinforceLesson(lessonId),
    );
    const enrichedPrompt = promptBuild.enrichedPrompt;

    const runWithDirective = async (
      extraDirective = "",
      seedSteps: AgentStep[] = [],
    ) => {
      const runSteps: AgentStep[] = [...seedSteps];
      let preparedWorkspaceCandidate =
        operatorPlan?.preparedWorkspace ?? assistantContext.preparedWorkspace;
      const result = await runAgent({
        settings,
        agentId: target,
        systemPrompt: enrichedPrompt + extraDirective,
        messages: [{ role: "user", content: agentInput }],
        efficiencyHint: {
          contextScope: "agent_scoped",
          liveContextChars: promptBuild.liveReport.chars,
          liveContextCompacted: promptBuild.liveReport.compacted,
          memoryDiffChars: memDiff.length,
          ragChars: promptBuild.ragChars,
          lessonsChars: promptBuild.lessonsChars,
        },
        onStep: (step) => {
          if (step.type === "tool_call") {
            const routeFromTool = detectRouteFromTool(step.tool);
            if (routeFromTool) {
              const toolContext = resolveHQAssistantContext({
                input: agentInput,
                answerStyle: answerStylePlan.style,
                routeHint: routeFromTool,
                unfinishedSessions,
              });
              if (toolContext.preparedWorkspace) {
                preparedWorkspaceCandidate = toolContext.preparedWorkspace;
              }
            }
          }
          if (step.type === "phase" || step.type === "task_plan") return;
          runSteps.push(step);
          setLiveSteps([...runSteps]);
        },
      });

      return {
        result,
        steps: runSteps,
        preparedWorkspace: preparedWorkspaceCandidate,
      };
    };

    let latestSteps: AgentStep[] = [];
    const hasVerifiedRetrievalPreflight = Boolean(liveRetrieval?.verified);

    try {
      let { result, steps, preparedWorkspace } = await runWithDirective();
      latestSteps = steps;

      if (
        answerStylePlan.verifiedRetrievalRequired &&
        !hasVerifiedRetrievalPreflight &&
        !hasVerifiedRetrievalStep(steps)
      ) {
        const safeguardStep: AgentStep = {
          type: "thinking",
          content:
            "Live-query safeguard: no verified retrieval occurred on the first pass. Retrying with forced verification.",
        };
        const retrySeed = [...steps, safeguardStep];
        setLiveSteps([...retrySeed]);
        const retryRun = await runWithDirective(
          buildHQRetrievalRetryDirective(),
          retrySeed,
        );
        result = retryRun.result;
        steps = retryRun.steps;
        preparedWorkspace = retryRun.preparedWorkspace;
        latestSteps = steps;

        if (!hasVerifiedRetrievalStep(steps)) {
          result = `${buildAssistantLiveRetrievalFallback(liveRetrieval)}\n\n${result}`;
        }
      }

      const chronicleText = healHQAnswerForChronicle(result, answerStylePlan);
      if (preparedWorkspace) {
        const continuationConfidence =
          assistantContext.intent === "repo_work" ||
          assistantContext.intent === "research" ||
          assistantContext.intent === "archive_continuity" ||
          assistantContext.intent === "workflow"
            ? 88
            : assistantContext.intent === "learning"
              ? 86
            : assistantContext.intent === "memory_recall"
              ? 84
              : assistantContext.intent === "workspace_action" ||
                  assistantContext.intent === "product_help"
                ? 82
                : assistantContext.intent === "live_current"
                  ? 80
                  : 76;
        const artifactClass = classifyUnfinishedArtifactClass({
          intent: assistantContext.intent,
          capabilityId: assistantContext.capabilityId,
          routeHint: preparedWorkspace.href,
        });
        const continuationValue = getContinuationValue({
          intent: assistantContext.intent,
          capabilityId: assistantContext.capabilityId,
          preparedWorkspace,
        });
        setPreparedWorkspace(preparedWorkspace, {
          intent: assistantContext.intent,
          sourceQuery: value,
        });
        rememberUnfinishedSession(preparedWorkspace, {
          intent: assistantContext.intent,
          sourceQuery: value,
          confidence: continuationConfidence,
          capability: assistantContext.capabilityId,
          artifactClass,
          continuationValue,
          completionState: "prepared",
        });
      } else {
        clearPreparedWorkspace();
      }
      const vaultCaptureSuggestion = buildVaultCaptureSuggestion({
        query: value,
        result: chronicleText,
        agentId: target,
        assistantIntent: assistantContext.intent,
        preparedWorkspace,
        suppress: workflow?.outputTarget === "compiled_memory_page",
      });

      // Finalize UI: agent reply + tool trace.
      setMessages((prev) => [
        ...prev,
        {
          role: "agent",
          agent: target,
          text: chronicleText,
          steps: steps.length ? steps : undefined,
          sourceQuery: value,
          answerStyle: answerStylePlan.style,
          responseKind: answerStylePlan.responseKind,
          showEvidencePosture: answerStylePlan.showEvidencePosture,
          assistantIntent: assistantContext.intent,
          preparedWorkspace,
          assistantGuidance: assistantContext.assistantGuidance,
          vaultCaptureSuggestion,
        },
      ]);

      addOfficeMessage({ role: "agent", agent: target, text: chronicleText });

      queueOfficeRunSideEffects({
        query: value,
        result: chronicleText,
        steps,
        target,
        workflow,
      });

      if (operatorPlan) {
        const latestArtifact = useStore.getState().agentRunHistory[0];
        patchSwitchOperatorStatus({
          mode: "completed",
          providerUsed: latestArtifact?.providerUsed,
          detail: `Operator mode completed one bounded run for ${
            operatorPlan.status.taskId ?? "the selected tranche"
          }.`,
          nextStep:
            preparedWorkspace?.detail ??
            operatorPlan.status.nextStep ??
            "Review the selected lane before widening the next move.",
        });
      }

      setEmotion("success");
      setTimeout(() => setEmotion("happy"), 550);

      const sessionSummary = buildOfficeRunSessionSummary({
        query: value,
        result: chronicleText,
        steps,
        target,
      });
      updateSettings({ lastSessionSummary: sessionSummary });
      const proposedLesson = buildOfficeRunLessonProposal({
        query: value,
        result: chronicleText,
        steps,
        target,
      });
      if (proposedLesson) {
        setPendingLesson({ text: proposedLesson, agent: target });
      }
    } catch (err) {
      if (operatorPlan) {
        patchSwitchOperatorStatus({
          mode: "failed",
          detail:
            err instanceof Error
              ? err.message
              : "Operator mode failed before the bounded run could complete.",
        });
      }
      clearPreparedWorkspace();
      const msg = err instanceof Error ? err.message : "Something went wrong.";
      setMessages((prev) => [
        ...prev,
        {
          role: "agent",
          agent: target,
          text: `Error: ${msg}`,
          steps: latestSteps.length ? latestSteps : undefined,
          sourceQuery: value,
          assistantIntent: assistantContext.intent,
        },
      ]);
      addOfficeMessage({ role: "agent", agent: target, text: `Error: ${msg}` });
      setEmotion("error");
    } finally {
      // Release active agent lock.
      setTimeout(() => {
        setActiveAgent(null);
        setEmotion("idle");
        setLiveSteps([]);
      }, 1200);
    }
  }, [
    input,
    activeAgent,
    addOfficeMessage,
    addPendingEdit,
    clearCouncilResults,
    clearPreparedWorkspace,
    councilMode,
    settings,
    updateSettings,
    activePersona,
    lessons,
    reinforceLesson,
    setCouncilResults,
    setContextLoadReport,
    setPreparedWorkspace,
    setSwitchOperatorStatus,
    setPrivacyShieldStatus,
    patchSwitchOperatorStatus,
    rememberUnfinishedSession,
    unfinishedSessions,
  ]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        void send();
      }
    },
    [send],
  );

  const activeColor = activeAgent
    ? AGENTS[activeAgent].color
    : AGENTS[dutyAgent].color;
  const activeProfile = OFFICE_OPERATIONAL_PROFILES[officeOperationalMode];
  const btc = prices["bitcoin"];
  const fgValue = fearGreed?.value ?? null;
  const runtimePhaseLabel = humanizePhase(agentRuntime.currentPhase || "idle");
  const runtimeStatusLabel = humanizePhase(agentRuntime.status || "idle");
  const enabledScheduledJobs =
    settings.scheduledJobs?.filter((job) => job.enabled) ?? [];

  const primaryFront = useMemo(
    () =>
      buildPrimaryFront({
        btc,
        cveCount: cves.length,
        fgValue,
        worldRisk,
      }),
    [btc, cves.length, fgValue, worldRisk],
  );

  const postureSummary = useMemo(() => {
    return buildPostureSummary({
      activeProfileLabel: activeProfile.label,
      activeProfileFocusTabs: activeProfile.focusTabs,
      btc,
      fgValue,
    });
  }, [activeProfile, btc, fgValue]);

  const threatLabel = useMemo(
    () => buildThreatLabel({ cveCount: cves.length, fgValue, worldRisk }),
    [cves.length, fgValue, worldRisk],
  );

  const strategiumFronts = useMemo(
    () =>
      buildStrategiumFronts({
        articlesCount: articles.length,
        btc,
        cveCount: cves.length,
        fearGreedLabel: fearGreed?.label,
        fgValue,
        worldRisk,
      }),
    [articles.length, btc, cves.length, fearGreed?.label, fgValue, worldRisk],
  );

  const strategiumAgents = useMemo(
    () =>
      buildStrategiumAgents({
        activeAgent,
        agentStats,
      }),
    [activeAgent, agentStats],
  );

  const strategiumSystems = useMemo(
    () =>
      buildStrategiumSystems({
        cveCount: cves.length,
        enabledScheduledJobsCount: enabledScheduledJobs.length,
        hasPendingLesson: pendingLesson != null,
        lastSessionSummary: settings.lastSessionSummary,
        worldRisk,
      }),
    [
      cves.length,
      enabledScheduledJobs.length,
      pendingLesson,
      settings.lastSessionSummary,
      worldRisk,
    ],
  );

  const primaryFrontHref = primaryFront.href;

  const commandTempo = useMemo(() => {
    return buildCommandTempo({
      activeAgent,
      articlesCount: articles.length,
      cveCount: cves.length,
      enabledScheduledJobsCount: enabledScheduledJobs.length,
      strategiumAgents,
      strategiumFronts,
      worldRisk,
    });
  }, [
    activeAgent,
    articles.length,
    cves.length,
    enabledScheduledJobs.length,
    strategiumAgents,
    strategiumFronts,
    worldRisk,
  ]);

  const roomMissionState = useMemo(
    () =>
      buildRoomMissionState({
        activeAgent,
        dispatchBar,
        dispatchedTo,
        routingAgent,
      }),
    [activeAgent, dispatchBar, dispatchedTo, routingAgent],
  );

  const roomMissionLabel = useMemo(
    () =>
      buildRoomMissionLabel({
        activeAgent,
        dispatchedTo,
        primaryFrontLabel: primaryFront.label,
        routingAgent,
      }),
    [activeAgent, dispatchedTo, primaryFront.label, routingAgent],
  );

  const roomMissionNote = useMemo(() => {
    return buildRoomMissionNote({
      activeAgent,
      commandTempo,
      dispatchBar,
      dispatchedTo,
      primaryFrontLabel: primaryFront.label,
      routingAgent,
    });
  }, [
    activeAgent,
    commandTempo,
    dispatchBar,
    dispatchedTo,
    primaryFront.label,
    routingAgent,
  ]);

  const missionCodex = useMemo(
    () =>
      buildMissionCodex({
        articlesCount: articles.length,
        btc,
        cveCount: cves.length,
        fgValue,
        pendingLessonText: pendingLesson?.text,
        primaryFront,
        runtimeStatusLabel,
        lastSessionSummary: settings.lastSessionSummary,
        worldRisk,
      }),
    [
      articles.length,
      btc,
      cves.length,
      fgValue,
      pendingLesson?.text,
      primaryFront,
      runtimeStatusLabel,
      settings.lastSessionSummary,
      worldRisk,
    ],
  );

  const sessionRecap = useMemo(
    () =>
      buildSessionRecap({
        enabledScheduledJobsCount: enabledScheduledJobs.length,
        lastSessionSummary: settings.lastSessionSummary,
        modeBriefings,
      }),
    [enabledScheduledJobs.length, modeBriefings, settings.lastSessionSummary],
  );

  const strategiumShortcuts = useMemo(
    () => buildStrategiumShortcuts(primaryFront.label),
    [primaryFront.label],
  );

  const strategiumVerbs = useMemo(
    () =>
      buildStrategiumVerbs({
        enabledScheduledJobsCount: enabledScheduledJobs.length,
        hasPendingLesson: pendingLesson != null,
        primaryFront,
        primaryFrontHref,
      }),
    [
      enabledScheduledJobs.length,
      pendingLesson,
      primaryFront,
      primaryFrontHref,
    ],
  );

  const latestChronicle = useMemo(
    () =>
      findLatestChronicle({
        messages,
        modeBriefings,
        officeMessages,
      }),
    [messages, officeMessages, modeBriefings],
  );

  const applyOperationalPreset = useCallback(
    (mode: OfficeOperationalMode) => {
      const presetKey =
        mode === "war" ? "war" : mode === "nightOps" ? "nightOps" : "focus";
      const preset = OFFICE_LAYOUT_PRESETS[presetKey];
      const nextLayout = Object.fromEntries(
        Object.entries(preset.layout).map(([key, value]) => [key, { ...value }]),
      ) as typeof preset.layout;

      updateSettings({
        officeOperationalMode: mode,
        officeSceneMode: preset.officeSceneMode ?? officeSceneMode,
        officeMotion: preset.officeMotion ?? officeMotion,
      });
      setOfficeLayout(nextLayout);

      if (mode !== officeOperationalMode) {
        const label = OFFICE_OPERATIONAL_PROFILES[mode].label;
        addNotification({
          type: "system",
          severity: "low",
          title: "Operations mode updated",
          message: `HQ posture shifted to ${label}.`,
          source: "hq-strategium",
        });
        addLog({
          type: "system",
          text: `Operations mode -> ${label}`,
          color: "#d6a56d",
        });
      }
    },
    [
      addLog,
      addNotification,
      officeMotion,
      officeOperationalMode,
      officeSceneMode,
      setOfficeLayout,
      updateSettings,
    ],
  );

  const primePrompt = useCallback(
    (prompt: string) => {
      if (activeAgent) return;
      setInput(prompt);
      window.setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.setSelectionRange(prompt.length, prompt.length);
      }, 0);
    },
    [activeAgent],
  );

  const openSurface = useCallback(
    (tab: string) => {
      const href = tab.startsWith("/") ? tab : tab === "hq" ? "/hq" : `/${tab}`;
      const pathOnly = href.split("?")[0] || "/hq";
      const routeId = pathOnly.replace(/^\//, "").split("/")[0] || "hq";
      const normalizedTab = routeId === "hq" ? "home" : routeId;
      setTab(normalizedTab);
      router.push(href);
    },
    [router, setTab],
  );
  const {
    openBriefingTab,
    startResize,
    resetSplit,
    handleSplitterKey,
    toggleSplitLock,
  } = useOfficeConsoleShellControls({
    router,
    setTab,
    openSurface,
    primaryFrontHref,
    strategiumSystems,
    setMemoryOpen,
    setSchedulerOpen,
    officeHeightPx,
    setOfficeHeightPx,
    updateOfficeSplitHeight: (patch) => updateSettings(patch),
    splitDragLocked,
    setSplitNotice,
    setSplitDragLocked,
  });

  return (
    <PageTransition>
      <div className="nexus-hq-shell">
        {focus === "hq-strategium" ? (
          <SurfaceFocusStrip
            title="Focused session: operations deck"
            description="Fronts, posture, and continuity open first."
          />
        ) : null}

        {focus === "hq-console-shell" ? (
          <SurfaceFocusStrip
            title="Focused session: HQ console shell"
            description="Runtime and shell state open first."
          />
        ) : null}

        {focus === "hq-chronicle" ? (
          <SurfaceFocusStrip
            title="Focused session: HQ chronicle"
            description="The command loop stays in front."
          />
        ) : null}

        {focus === "hq-scheduler-composer" ? (
          <SurfaceFocusStrip
            title="Focused session: scheduler composer"
            description="The mission draft opens first."
          />
        ) : null}

        {focus === "hq-scheduler-governance" ? (
          <SurfaceFocusStrip
            title="Focused session: scheduler governance"
            description="Audit posture opens first."
          />
        ) : null}

        {focus === "hq-scheduler-jobs" ? (
          <SurfaceFocusStrip
            title="Focused session: scheduler jobs"
            description="Mission state opens first."
          />
        ) : null}

        <div className="nexus-hq-commandTable">
          <div className="nexus-hq-commandTable__workspace">
            <div className="nexus-hq-console">
              <div
                id="hq-console-shell"
                style={{ scrollMarginTop: "120px", flexShrink: 0 }}
              >
                <HQConsoleShellSection
                  activeAgent={activeAgent}
                  evalGrade={evalGrade}
                  evalTrail={evalTrail}
                  evalStale={evalStale}
                  evalFailureCount={evalFailureCount}
                  evalUpdatedAt={evalUpdatedAt}
                  runtimeStatusLabel={runtimeStatusLabel}
                  runtimePhaseLabel={runtimePhaseLabel}
                  clockLabel={clockLabel}
                  officeHeightPx={officeHeightPx}
                  compactSplitControls={compactSplitControls}
                  viewportHeight={viewportHeight}
                  splitDragLocked={splitDragLocked}
                  showSplitMore={showSplitMore}
                  splitNotice={splitNotice}
                  officeEditMode={officeEditMode}
                  officeLayout={officeLayout}
                  agentPos={agentPos}
                  roomMissionState={roomMissionState}
                  roomMissionLabel={roomMissionLabel}
                  roomMissionNote={roomMissionNote}
                  commandTempo={commandTempo}
                  primaryFront={primaryFront}
                  officeSceneMode={officeSceneMode}
                  surfaceMotionProfile={surfaceMotionProfile}
                  officeMotion={officeMotion}
                  officeCameraPreset={officeCameraPreset}
                  officeVfxQuality={officeVfxQuality}
                  dispatchBar={dispatchBar}
                  emotion={emotion}
                  onOpenMemory={() => setMemoryOpen(true)}
                  onOpenScheduler={() => setSchedulerOpen(true)}
                  onOpenPrimaryFront={() => openSurface(primaryFrontHref)}
                  onOpenSweep={() => openSurface("/intel?view=sweeps")}
                  onOpenForge={() => openSurface("/skills?view=forge")}
                  onOpenDoctrine={() => openSurface("/security?view=doctrine")}
                  onToggleEditMode={() => setOfficeEditMode(!officeEditMode)}
                  onResetLayout={() => resetOfficeLayout()}
                  onSetCameraPreset={(preset) =>
                    updateSettings({ officeCameraPreset: preset })
                  }
                  onSetVfxQuality={(quality) =>
                    updateSettings({ officeVfxQuality: quality })
                  }
                  onOpenBriefingTab={openBriefingTab}
                  onStartResize={startResize}
                  onResetSplit={resetSplit}
                  onHandleSplitterKey={handleSplitterKey}
                  onToggleSplitLock={toggleSplitLock}
                  onSetShowSplitMore={setShowSplitMore}
                />
              </div>

              <MemoryPanel open={memoryOpen} onClose={() => setMemoryOpen(false)} />
              <CronSchedulerPanel
                open={schedulerOpen}
                focus={schedulerFocus}
                onClose={() => setSchedulerOpen(false)}
              />

              <div
                id="hq-chronicle"
                style={{
                  scrollMarginTop: "120px",
                  display: "flex",
                  flex: "1 1 auto",
                  minHeight: 0,
                }}
              >
                <HQTerminalSection
                  messages={messages}
                  activeAgent={activeAgent}
                  activeColor={activeColor}
                  liveSteps={liveSteps}
                  pendingLesson={pendingLesson}
                  input={input}
                  surfaceMotionProfile={surfaceMotionProfile}
                  agentDebugMode={settings.agentDebugMode}
                  canClear={messages.length > 0 || officeMessages.length > 0}
                  inputRef={inputRef}
                  scrollViewportRef={chronicleScrollRef}
                  onPrimePrompt={primePrompt}
                  onInputChange={setInput}
                  onDictationAppend={(transcript) =>
                    setInput((current) =>
                      [current.trim(), transcript.trim()]
                        .filter(Boolean)
                        .join(current.trim() ? " " : ""),
                    )
                  }
                  onInputKeyDown={handleKeyDown}
                  onAskMemory={openMemoryLane}
                  onSend={send}
                  onClear={handleClear}
                  onMergeCouncil={(results) =>
                    setInput(buildCouncilMergeDraft(results))
                  }
                  onUseCouncilResult={(result) =>
                    setInput(buildCouncilAdoptDraft(result))
                  }
                  onLogLesson={() => {
                    if (!pendingLesson) return;
                    apiFetch("/api/tools", {
                      method: "POST",
                      body: JSON.stringify({
                        tool: "log_lesson",
                        input: {
                          agent: pendingLesson.agent,
                          lesson: pendingLesson.text,
                        },
                      }),
                    }).catch(() => {
                      /* non-fatal */
                    });
                    setPendingLesson(null);
                  }}
                  onDismissLesson={() => setPendingLesson(null)}
                />
              </div>
            </div>
          </div>

        <HQPreludePostureSection
            eyebrow="Sector rail"
            title="Live sector."
            description="Fronts and continuity stay beside the chronicle."
            activeProfileLabel={activeProfile.label}
            activeProfileFocusTabs={activeProfile.focusTabs}
            activeAgent={activeAgent}
            evalGrade={evalGrade}
            primaryFrontLabel={primaryFront.label}
            runtimeStatusLabel={runtimeStatusLabel}
            runtimePhaseLabel={runtimePhaseLabel}
            evalStale={evalStale}
            primaryFrontNote={primaryFront.note}
            commandTempo={commandTempo}
            enabledScheduledJobsCount={enabledScheduledJobs.length}
            warmedAgentStationsCount={
              strategiumAgents.filter((agent) => agent.status !== "standby").length
            }
            sessionRecapSummary={sessionRecap.summary}
            investigateLabel={`Investigate ${primaryFront.label}`}
            investigateNote={
              primaryFront.tab === "cyber" || primaryFront.tab === "intel"
                ? `Open ${primaryFront.label} with the most relevant live theater already staged.`
                : "Widen evidence through sweeps and recon before escalating action."
            }
            onOpenPrimaryFront={() => openSurface(primaryFrontHref)}
            onOpenObserve={() =>
              openSurface(buildMissionHref("/command", "observe"))
            }
            onOpenInvestigate={() =>
              openSurface(
                buildMissionHref(
                  primaryFront.tab === "cyber" || primaryFront.tab === "intel"
                    ? primaryFrontHref
                    : "/intel?view=sweeps",
                  "investigate",
                  {
                    source:
                      primaryFront.tab === "cyber" || primaryFront.tab === "intel"
                        ? primaryFront.tab
                        : "intel",
                  },
                ),
              )
            }
            onOpenArchive={() =>
              openSurface(buildMissionHref("/vault", "archive"))
            }
            onOpenLaunch={() =>
              openSurface(buildMissionHref("/vehicle", "launch"))
            }
            onOpenScheduler={() => setSchedulerOpen(true)}
            onOpenFieldManual={() => openSurface("resources")}
          />
        </div>

        <div id="hq-strategium" style={{ scrollMarginTop: "120px" }}>
          <HQStrategiumDeck
            operationalMode={officeOperationalMode}
            activeAgent={activeAgent}
            evalGrade={evalGrade}
            evalStale={evalStale}
            runtimeStatus={runtimeStatusLabel}
            runtimePhase={runtimePhaseLabel}
            latestChronicle={latestChronicle}
            pendingLessonAgent={pendingLesson?.agent ?? null}
            pendingLessonSummary={pendingLesson?.text ?? null}
            postureSummary={postureSummary}
            threatLabel={threatLabel}
            tempoLabel={commandTempo}
            fronts={strategiumFronts}
            agents={strategiumAgents}
            systems={strategiumSystems}
            missionCodex={missionCodex}
            sessionRecap={sessionRecap}
            shortcuts={strategiumShortcuts}
            verbs={strategiumVerbs}
            prompts={STRATEGIUM_PROMPTS}
            onSetOperationalMode={applyOperationalPreset}
            onPrimePrompt={primePrompt}
            onOpenTab={openSurface}
            onOpenMemory={() => setMemoryOpen(true)}
            onOpenScheduler={() => setSchedulerOpen(true)}
          />
        </div>
      </div>
    </PageTransition>
  );
}
