"use client";

import type { AgentStats, ModeBriefing } from "@/store/useStore";
import { AGENTS } from "./constants";
import type {
  StrategiumAgentRow,
  StrategiumCommandVerb,
  StrategiumFront,
  StrategiumMissionCodex,
  StrategiumSessionRecap,
  StrategiumShortcut,
  StrategiumSystemAction,
} from "./HQStrategiumDeck";
import {
  type DispatchBar,
  formatRelativeTime,
  frontToneScore,
} from "./officeCommandCenterConfig";
import type { AgentId, ChatMessage } from "./types";

type BtcLike = { price: number; chg: number } | null | undefined;

interface PrimaryFrontArgs {
  btc: BtcLike;
  cveCount: number;
  fgValue: number | null;
  worldRisk: number;
}

interface StrategiumFrontsArgs extends PrimaryFrontArgs {
  articlesCount: number;
  fearGreedLabel?: string | null;
}

interface StrategiumSystemsArgs {
  cveCount: number;
  enabledScheduledJobsCount: number;
  hasPendingLesson: boolean;
  lastSessionSummary?: string | null;
  worldRisk: number;
}

interface CommandTempoArgs {
  activeAgent: AgentId | null;
  articlesCount: number;
  cveCount: number;
  enabledScheduledJobsCount: number;
  strategiumAgents: StrategiumAgentRow[];
  strategiumFronts: StrategiumFront[];
  worldRisk: number;
}

interface RoomMissionArgs {
  activeAgent: AgentId | null;
  commandTempo: string;
  dispatchBar: DispatchBar | null;
  dispatchedTo: AgentId | null;
  primaryFrontLabel: string;
  routingAgent: AgentId | null;
}

interface MissionCodexArgs extends PrimaryFrontArgs {
  articlesCount: number;
  pendingLessonText?: string | null;
  primaryFront: StrategiumFront;
  runtimeStatusLabel: string;
  lastSessionSummary?: string | null;
}

interface SessionRecapArgs {
  enabledScheduledJobsCount: number;
  lastSessionSummary?: string | null;
  modeBriefings: ModeBriefing[];
}

interface StrategiumVerbsArgs {
  enabledScheduledJobsCount: number;
  hasPendingLesson: boolean;
  primaryFront: StrategiumFront;
  primaryFrontHref: string;
}

export function buildPrimaryFront({
  btc,
  cveCount,
  fgValue,
  worldRisk,
}: PrimaryFrontArgs): StrategiumFront {
  if (cveCount >= 12) {
    return {
      id: "bastion-priority",
      tab: "cyber",
      label: "Bastion",
      value: `${cveCount} CVEs`,
      note: `${cveCount} live CVEs demand triage and containment.`,
      tone: "critical",
      href: "/cyber?view=triage",
    };
  }
  if (worldRisk >= 5) {
    return {
      id: "spectra-priority",
      tab: "intel",
      label: "Spectra",
      value: `${worldRisk} world risk`,
      note: `World-risk posture elevated with ${worldRisk} conflict-linked triggers in scope.`,
      tone: "critical",
      href: "/intel?view=world",
    };
  }
  if (btc && Math.abs(btc.chg) >= 3.5) {
    return {
      id: "quant-priority",
      tab: "alpha",
      label: "Quant",
      value: `${btc.chg >= 0 ? "+" : ""}${btc.chg.toFixed(1)}%`,
      note: `BTC is moving ${btc.chg >= 0 ? "+" : ""}${btc.chg.toFixed(1)}% and deserves a market drill-down.`,
      tone: "warning",
      href: "/alpha?view=signals",
    };
  }
  return {
    id: "vector-priority",
    tab: "command",
    label: "Vector",
    value: fgValue == null ? "Steady" : `FG ${fgValue}`,
    note: "Balanced posture. Stay centered on command synthesis and routing.",
    tone: "steady",
    href: "/command",
  };
}

export function buildPostureSummary({
  activeProfileLabel,
  activeProfileFocusTabs,
  btc,
  fgValue,
}: {
  activeProfileLabel: string;
  activeProfileFocusTabs: string[];
  btc: BtcLike;
  fgValue: number | null;
}) {
  const fgCopy =
    fgValue == null ? "sentiment unconfirmed" : `fear & greed ${fgValue}`;
  const btcCopy =
    btc == null
      ? "BTC awaiting price data"
      : `BTC ${btc.chg >= 0 ? "up" : "down"} ${Math.abs(btc.chg).toFixed(1)}%`;
  return `${activeProfileLabel} mode keeps the board centered on ${activeProfileFocusTabs.join(" + ")} while ${btcCopy.toLowerCase()} and ${fgCopy}.`;
}

export function buildThreatLabel({
  cveCount,
  fgValue,
  worldRisk,
}: {
  cveCount: number;
  fgValue: number | null;
  worldRisk: number;
}) {
  if (cveCount >= 12 || worldRisk >= 6) return "Threat theater elevated";
  if (fgValue != null && (fgValue <= 25 || fgValue >= 75)) {
    return "Sentiment extreme";
  }
  return "Posture steady";
}

export function buildStrategiumFronts({
  articlesCount,
  btc,
  cveCount,
  fearGreedLabel,
  fgValue,
  worldRisk,
}: StrategiumFrontsArgs): StrategiumFront[] {
  const fronts: StrategiumFront[] = [
    {
      id: "vector",
      label: "Vector",
      value:
        fgValue == null ? "No sentiment" : `${fgValue} ${fearGreedLabel || ""}`.trim(),
      note:
        fgValue == null
          ? "Fear and greed feed has not reported yet."
          : `Command posture anchored by sentiment classification: ${fearGreedLabel || "mixed"}.`,
      tone:
        fgValue != null && (fgValue <= 25 || fgValue >= 75)
          ? "warning"
          : "steady",
      tab: "command",
      href: "/command",
    },
    {
      id: "spectra",
      label: "Spectra",
      value: `${articlesCount} live signals`,
      note:
        articlesCount > 0
          ? `${articlesCount} articles in queue for geopolitical and macro synthesis.`
          : "Intel feed is quiet right now.",
      tone:
        worldRisk >= 5 ? "critical" : articlesCount > 0 ? "steady" : "warning",
      tab: "intel",
      href:
        worldRisk >= 5
          ? "/intel?view=world"
          : articlesCount > 0
            ? "/intel?view=news"
            : "/intel?view=sweeps",
    },
    {
      id: "quant",
      label: "Quant",
      value:
        btc == null
          ? "BTC pending"
          : `$${Math.round(btc.price).toLocaleString()} · ${btc.chg >= 0 ? "+" : ""}${btc.chg.toFixed(1)}%`,
      note:
        btc == null
          ? "Market loaders have not confirmed BTC yet."
          : "Use Quant when price pressure becomes a mission, not just a headline.",
      tone: btc != null && Math.abs(btc.chg) >= 3.5 ? "warning" : "steady",
      tab: "alpha",
      href:
        btc != null && Math.abs(btc.chg) >= 3.5
          ? "/alpha?view=signals"
          : "/alpha?view=watchlist",
    },
    {
      id: "bastion",
      label: "Bastion",
      value: `${cveCount} CVEs`,
      note:
        cveCount > 0
          ? "Cyber posture is active. Open Bastion for triage, OTX, and KEV context."
          : "No CVE loadout confirmed yet.",
      tone: cveCount >= 12 ? "critical" : cveCount >= 1 ? "warning" : "steady",
      tab: "cyber",
      href: cveCount > 0 ? "/cyber?view=triage" : "/cyber?view=matrix",
    },
  ];

  return fronts.sort((a, b) => frontToneScore(b.tone) - frontToneScore(a.tone));
}

export function buildStrategiumAgents({
  activeAgent,
  agentStats,
}: {
  activeAgent: AgentId | null;
  agentStats: Record<string, AgentStats>;
}): StrategiumAgentRow[] {
  const ids = Object.keys(AGENTS) as AgentId[];
  return ids.map((id) => {
    const stats = agentStats[id];
    const delta = stats?.lastActiveAt
      ? Date.now() - stats.lastActiveAt
      : Number.POSITIVE_INFINITY;
    const status =
      activeAgent === id
        ? "active"
        : delta < 15 * 60_000
          ? "hot"
          : stats?.totalTasks
            ? "ready"
            : "standby";
    return {
      id,
      status,
      confidence: stats?.lastConfidence ?? 0,
      lastTask: stats?.lastTask
        ? stats.lastTask.replace(/_/g, " ")
        : "Awaiting a routed objective.",
      lastSeen: formatRelativeTime(stats?.lastActiveAt ?? 0),
    };
  });
}

export function buildStrategiumSystems({
  cveCount,
  enabledScheduledJobsCount,
  hasPendingLesson,
  lastSessionSummary,
  worldRisk,
}: StrategiumSystemsArgs): StrategiumSystemAction[] {
  return [
    {
      id: "workflow-forge",
      label: "Dispatch Workflow",
      note: "Native graph builder with runs, replay, approval gates, and scheduler-linked templates.",
      href: "/skills?view=forge",
      status: enabledScheduledJobsCount > 0 ? "Armed" : "Ready",
      tone: enabledScheduledJobsCount > 0 ? "warning" : "steady",
    },
    {
      id: "blacksite-lab",
      label: "Open Blacksite",
      note: "Operator-only mutation arena for prompt defense, refusal mapping, and multi-model comparison.",
      href: "/skills?view=blacksite",
      status: hasPendingLesson ? "Hot" : "Ready",
      tone: hasPendingLesson ? "warning" : "steady",
    },
    {
      id: "sweep-engine",
      label: "Run Sweep",
      note: "One-command multi-source bundles with live stream progress, theaters, and geo-delta evidence.",
      href: "/intel?view=sweeps",
      status: worldRisk >= 5 || cveCount >= 12 ? "Live" : "Ready",
      tone: worldRisk >= 5 || cveCount >= 12 ? "critical" : "steady",
    },
    {
      id: "registry",
      label: "Inspect Registry",
      note: "Kits, evidence packs, models, workflows, and saved operators assets under one custody layer.",
      href: "/resources?view=registry",
      status: lastSessionSummary?.trim() ? "Tracking" : "Ready",
      tone: lastSessionSummary?.trim() ? "warning" : "steady",
    },
    {
      id: "doctrine",
      label: "Review controls",
      note: "WSTG-v42 scenarios plus AI-surface risk coverage for auth, SSRF, inputs, and prompt boundaries.",
      href: "/security?view=doctrine",
      status: cveCount > 0 || worldRisk >= 5 ? "Review" : "Covered",
      tone: cveCount > 0 || worldRisk >= 5 ? "warning" : "steady",
    },
  ];
}

export function buildCommandTempo({
  activeAgent,
  articlesCount,
  cveCount,
  enabledScheduledJobsCount,
  strategiumAgents,
  strategiumFronts,
  worldRisk,
}: CommandTempoArgs) {
  const hotFronts = strategiumFronts.filter(
    (front) => frontToneScore(front.tone) >= 2,
  ).length;
  const hotAgents = strategiumAgents.filter(
    (agent) => agent.status === "active" || agent.status === "hot",
  ).length;
  if (activeAgent && (hotFronts >= 2 || worldRisk >= 5 || cveCount >= 12)) {
    return "Critical";
  }
  if (activeAgent || hotFronts >= 2 || hotAgents >= 2) return "Compressed";
  if (articlesCount >= 8 || enabledScheduledJobsCount >= 2 || worldRisk >= 3) {
    return "Active";
  }
  return "Calm";
}

export function buildRoomMissionState({
  activeAgent,
  dispatchBar,
  dispatchedTo,
  routingAgent,
}: Pick<RoomMissionArgs, "activeAgent" | "dispatchBar" | "dispatchedTo" | "routingAgent">) {
  if (activeAgent) return "executing" as const;
  if (dispatchBar || dispatchedTo) return "handoff" as const;
  if (routingAgent) return "routing" as const;
  return "standby" as const;
}

export function buildRoomMissionLabel({
  activeAgent,
  dispatchedTo,
  primaryFrontLabel,
  routingAgent,
}: Pick<RoomMissionArgs, "activeAgent" | "dispatchedTo" | "primaryFrontLabel" | "routingAgent">) {
  if (activeAgent) return `${AGENTS[activeAgent].name} executing`;
  if (dispatchedTo) return `Handoff to ${AGENTS[dispatchedTo].name}`;
  if (routingAgent) return `${AGENTS[routingAgent].name} routing`;
  return `${primaryFrontLabel} on watch`;
}

export function buildRoomMissionNote({
  activeAgent,
  commandTempo,
  dispatchBar,
  dispatchedTo,
  primaryFrontLabel,
  routingAgent,
}: RoomMissionArgs) {
  if (activeAgent) {
    return `${AGENTS[activeAgent].name} is carrying the live task while the room holds ${primaryFrontLabel} at ${commandTempo.toLowerCase()} tempo.`;
  }
  if (dispatchBar || dispatchedTo) {
    const target = dispatchedTo ?? dispatchBar?.to ?? null;
    return target
      ? `Mission transfer is underway toward ${AGENTS[target].name}. Keep evidence in view before sanctioning the next action.`
      : "Mission transfer is underway between agent stations.";
  }
  if (routingAgent) {
    return `${AGENTS[routingAgent].name} is evaluating the next specialist handoff based on the current theater and command directive.`;
  }
  return `The room is steady and centered on ${primaryFrontLabel}. Use the codex, verbs, or dock directive to start the next operation.`;
}

export function buildMissionCodex({
  articlesCount,
  btc,
  cveCount,
  fgValue,
  pendingLessonText,
  primaryFront,
  runtimeStatusLabel,
  lastSessionSummary,
  worldRisk,
}: MissionCodexArgs): StrategiumMissionCodex {
  const urgency =
    primaryFront.tab === "cyber" || primaryFront.tab === "intel"
      ? "Elevated theater"
      : primaryFront.tab === "alpha"
        ? "Market pressure"
        : "Steady command watch";
  const evidence =
    primaryFront.tab === "cyber"
      ? `${cveCount} CVEs are shaping the current risk queue.`
      : primaryFront.tab === "intel"
        ? `${articlesCount} live signals and world-risk ${worldRisk} define the brief.`
        : primaryFront.tab === "alpha"
          ? btc == null
            ? "Price feed is still forming."
            : `BTC ${btc.chg >= 0 ? "up" : "down"} ${Math.abs(btc.chg).toFixed(1)}% with sentiment ${fgValue ?? "pending"}.`
          : `Command posture is anchored by runtime ${runtimeStatusLabel.toLowerCase()} and sentiment ${fgValue ?? "pending"}.`;
  const nextAction =
    primaryFront.tab === "cyber"
      ? "Open triage, rank exposure, and hold sanction until evidence converges."
      : primaryFront.tab === "intel"
        ? "Brief the current theater, then pivot into sweeps if the feed is thin."
        : primaryFront.tab === "alpha"
          ? "Drill into signals and sizing before promoting movement into action."
          : "Stay centered on routing, system state, and the next mission dispatch.";
  return {
    title: `${primaryFront.label} mission codex`,
    objective: primaryFront.note,
    urgency,
    evidence,
    nextAction,
    handoff:
      pendingLessonText ??
      lastSessionSummary?.trim() ??
      "No explicit handoff is waiting. Use the codex and choir to stage the next action.",
    primaryActionLabel: `Open ${primaryFront.label}`,
    primaryActionHref: primaryFront.href,
    secondaryActionLabel:
      primaryFront.tab === "cyber" || primaryFront.tab === "intel"
        ? "Review controls"
        : "Workflow forge",
    secondaryActionHref:
      primaryFront.tab === "cyber" || primaryFront.tab === "intel"
        ? "/security?view=doctrine"
        : "/skills?view=forge",
  };
}

export function buildSessionRecap({
  enabledScheduledJobsCount,
  lastSessionSummary,
  modeBriefings,
}: SessionRecapArgs): StrategiumSessionRecap {
  const summary =
    lastSessionSummary?.trim() ||
    modeBriefings[0]?.summary ||
    "No prior handoff has been preserved yet. The next substantive run will stamp a reusable session memory.";
  return {
    title: "Since last session",
    summary,
    note:
      enabledScheduledJobsCount > 0
        ? `${enabledScheduledJobsCount} auto orders are armed for the next cycle.`
        : "No auto orders are armed right now.",
  };
}

export function buildStrategiumShortcuts(primaryFrontLabel: string): StrategiumShortcut[] {
  return [
    {
      key: "/",
      label: "Focus vox command",
      note: "Jump straight into the HQ command input.",
    },
    {
      key: "R",
      label: "Resume primary theater",
      note: `Open ${primaryFrontLabel} with its most relevant view already selected.`,
    },
    {
      key: "1-5",
      label: "Open command systems",
      note: "Launch Forge, Blacksite, Sweep Engine, Registry, or controls instantly.",
    },
    {
      key: "M",
      label: "Open archive memory",
      note: "Review saved lessons, context, and prior command memory.",
    },
    {
      key: "O",
      label: "Open auto orders",
      note: "Inspect scheduler jobs, mission templates, and cooldown state.",
    },
  ];
}

export function buildStrategiumVerbs({
  enabledScheduledJobsCount,
  hasPendingLesson,
  primaryFront,
  primaryFrontHref,
}: StrategiumVerbsArgs): StrategiumCommandVerb[] {
  return [
    {
      id: "brief",
      label: "Brief",
      note: `Resume ${primaryFront.label} with the most relevant filtered surface already staged.`,
      href: primaryFrontHref,
      tone: primaryFront.tone,
    },
    {
      id: "dispatch",
      label: "Dispatch",
      note:
        enabledScheduledJobsCount > 0
          ? "Open Workflow Forge with mission systems already armed from scheduler state."
          : "Open Workflow Forge and stage the next mission graph or template.",
      href: "/skills?view=forge",
      tone: enabledScheduledJobsCount > 0 ? "warning" : "steady",
    },
    {
      id: "investigate",
      label: "Investigate",
      note:
        primaryFront.tab === "cyber" || primaryFront.tab === "intel"
          ? "Pivot into sweep evidence or control review to test the current theater."
          : "Open Sweep Engine to widen evidence before sanctioning action.",
      href: "/intel?view=sweeps",
      tone:
        primaryFront.tab === "cyber" || primaryFront.tab === "intel"
          ? "warning"
          : "steady",
    },
    {
      id: "approve",
      label: "Approve",
      note:
        hasPendingLesson
          ? "Review the current lesson proposal and promote only what deserves memory."
          : "Open archive memory and sanction the next control review or handoff deliberately.",
      href: hasPendingLesson ? "/resources?view=registry" : "/security?view=doctrine",
      tone: hasPendingLesson ? "warning" : "steady",
    },
  ];
}

export function findLatestChronicle({
  messages,
  modeBriefings,
  officeMessages,
}: {
  messages: ChatMessage[];
  modeBriefings: ModeBriefing[];
  officeMessages: Array<{
    role: "user" | "agent";
    text: string;
  }>;
}) {
  const latestAgentMessage = [...messages]
    .reverse()
    .find((message) => message.role === "agent");
  if (latestAgentMessage?.text) return latestAgentMessage.text;
  const persistedAgentMessage = [...officeMessages]
    .reverse()
    .find((message) => message.role === "agent");
  if (persistedAgentMessage?.text) return persistedAgentMessage.text;
  if (modeBriefings[0]?.summary) return modeBriefings[0].summary;
  return "No operation has been logged yet. Prime a briefing, dispatch a mission, or open a front to begin the next cycle.";
}
