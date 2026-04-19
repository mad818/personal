"use client";

import {
  AGENT_HOME,
  AGENT_MEETING,
  AGENT_PEEK,
} from "./constants";
import type { AgentId } from "./types";
import { HQ_WORKFLOW_PROMPTS } from "./workflowCommands";
import type { StrategiumFront, StrategiumPrompt } from "./HQStrategiumDeck";

export type DispatchBar = { from: AgentId; to: AgentId };
export type OfficeCameraPreset = "cinematic" | "closeOps" | "wallReadability";

export const OFFICE_HEIGHT_MIN_PX = 300;
export const OFFICE_HEIGHT_MAX_PX = 700;
export const OFFICE_HEIGHT_DEFAULT_VH = 42;
export const OFFICE_HEIGHT_STEP_PX = 20;
export const SPLIT_LOCK_STORAGE_KEY = "nexus_hq_split_drag_locked";

export const CAMERA_PRESET_OPTIONS: Array<{
  id: OfficeCameraPreset;
  label: string;
  title: string;
}> = [
  { id: "cinematic", label: "CAM: CINEMATIC", title: "Balanced HQ framing" },
  {
    id: "closeOps",
    label: "CAM: CLOSE OPS",
    title: "Tighter operations framing",
  },
  {
    id: "wallReadability",
    label: "CAM: WALL READ",
    title: "Optimize readability for wall boards",
  },
];

export function deriveWorkflowArtifactSummary(result: string) {
  const lines = result
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !/^#+\s*/.test(line));
  return (lines[0] ?? result).slice(0, 220);
}

export const OFFICE_ANIMATIONS_CSS = `
  /* Office animations (inline so we don't depend on Next CSS-import rules). */

  /* ── CRAB MASCOT ──────────────────────────────────────────────────────────── */
  /* Up/down float — used while the crab is happy, working, or excited */
  @keyframes crabBob    { from{transform:translateY(0)} to{transform:translateY(-4px)} }

  /* ── AGENT IDLE PERSONALITIES ─────────────────────────────────────────────── */
  /* Each agent has a distinct idle so the office looks alive when nothing runs. */

  /* JANSKY — slow authoritative nod */
  @keyframes idleNod      { 0%,60%,100%{transform:translateY(0)} 30%{transform:translateY(-3px)} 45%{transform:translateY(-1px)} }
  /* ORBIT — rapid keyboard micro-movement */
  @keyframes idleTyping   { 0%,100%{transform:translate(0,0)} 15%{transform:translate(-1px,1px)} 30%{transform:translate(1px,0px)} 50%{transform:translate(-1px,1px)} 70%{transform:translate(1px,-1px)} 85%{transform:translate(0,1px)} }
  /* NOVA — side-to-side intelligence scan */
  @keyframes idleScan     { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-3px)} 50%{transform:translateX(0)} 80%{transform:translateX(3px)} }
  /* CIPHER — vigilant micro-rotation, always watching */
  @keyframes idleVigilant { 0%,100%{transform:translateX(0) rotate(0deg)} 25%{transform:translateX(-2px) rotate(-1deg)} 75%{transform:translateX(2px) rotate(1deg)} }
  /* FLUX — chart-watching rhythmic bob */
  @keyframes idleCharts   { 0%,100%{transform:translateY(0) rotate(0deg)} 33%{transform:translateY(-2px) rotate(0deg)} 66%{transform:translateY(-1px) rotate(1deg)} }
  /* Generic float — used for ambient props (sofa emoji on afternoon shift) */
  @keyframes idleFloat    { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-2px)} }

  /* ── ACTIVE / WORK STATES ─────────────────────────────────────────────────── */
  /* workFury — outer wrapper shake while actively responding */
  @keyframes workFury   { 0%,100%{transform:translate(0,0)} 20%{transform:translate(-2px,1px)} 40%{transform:translate(2px,-1px)} 60%{transform:translate(-1px,2px)} 80%{transform:translate(1px,-2px)} }
  /* workFocus — slower, more controlled focus pulse */
  @keyframes workFocus  { 0%,100%{transform:translateY(0) rotate(0deg)} 50%{transform:translateY(-3px) rotate(-2deg)} }
  /* routePulse — JANSKY deciding where to dispatch */
  @keyframes routePulse { 0%,100%{transform:translateX(0) rotate(0deg)} 25%{transform:translateX(-3px) rotate(-2deg)} 75%{transform:translateX(3px) rotate(2deg)} }
  /* taskGet — agent receives a task (jumps up then lands) */
  @keyframes taskGet    { 0%{transform:scale(1) translateY(0)} 25%{transform:scale(1.12) translateY(-6px)} 55%{transform:scale(1.05) translateY(-3px)} 100%{transform:scale(1) translateY(0)} }
  /* taskDone — celebrate completion (double-bounce) */
  @keyframes taskDone   { 0%,100%{transform:translateY(0)} 18%{transform:translateY(-9px)} 36%{transform:translateY(-4px)} 54%{transform:translateY(-11px)} 72%{transform:translateY(-2px)} 90%{transform:translateY(-5px)} }

  /* ── SPRITE INNER MOTION ──────────────────────────────────────────────────── */
  /* agentWalk — side-to-side sway for the walking animation */
  @keyframes agentWalk  { from{transform:translateX(-2px)} to{transform:translateX(2px)} }
  /* spriteBob — gentle up/down breathing */
  @keyframes spriteBob  { from{transform:translateY(0)} to{transform:translateY(-2px)} }
  /* spriteType — keyboard typing micro-movement */
  @keyframes spriteType { 0%,100%{transform:translate(0,0)} 25%{transform:translate(-1px,1px)} 75%{transform:translate(1px,-1px)} }

  /* ── UI / DISPATCH ELEMENTS ───────────────────────────────────────────────── */
  /* dotPulse — the three waiting dots while an agent is thinking */
  @keyframes dotPulse     { 0%,80%,100%{transform:scale(.8);opacity:.5} 40%{transform:scale(1.1);opacity:1} }
  /* pulse-dot — the green "online" dot in the header bar */
  @keyframes pulse-dot    { 0%,100%{opacity:.5;transform:scale(.85)} 50%{opacity:1;transform:scale(1.15)} }
  /* bubbleUp — speech bubble fade-in from slightly below */
  @keyframes bubbleUp     { from{opacity:0;transform:translateX(-50%) translateY(4px)} to{opacity:1;transform:translateX(-50%) translateY(0)} }
  /* dispatchRing — expanding ring around an agent that just received a task */
  @keyframes dispatchRing { 0%{transform:scale(1);opacity:.9} 100%{transform:scale(1.18);opacity:0} }
  /* dispatchFill — the colour line filling between agents on the dispatch bar */
  @keyframes dispatchFill { from{transform:scaleX(0)} to{transform:scaleX(1)} }
  /* dispatchDot — the travelling dot moving between agents on the dispatch bar */
  @keyframes dispatchDot  { from{left:var(--dot-start,0%)} to{left:var(--dot-end,100%)} }
  /* fadeIn — simple opacity fade used for new activity log entries and bubbles */
  @keyframes fadeIn       { from{opacity:0} to{opacity:1} }

  /* ── ENVIRONMENT EFFECTS ──────────────────────────────────────────────────── */
  /* monitorPulse — the screen flicker on idle monitors */
  @keyframes monitorPulse { 0%,100%{opacity:.75} 50%{opacity:1} }
  /* screenScroll — scrolling text on active screens */
  @keyframes screenScroll { from{transform:translateY(0)} to{transform:translateY(-50%)} }
  /* lightFlicker — fluorescent ceiling light occasional flutter */
  @keyframes lightFlicker { 0%,100%{opacity:1} 94%{opacity:.82} 97%{opacity:1} 99%{opacity:.9} }
  /* ambientGlow — radial glow behind active agents breathes slowly */
  @keyframes ambientGlow  { 0%,100%{opacity:.3} 50%{opacity:.55} }
  /* progressBar — used in any progress fill element */
  @keyframes progressBar  { from{width:0%} to{width:100%} }
  /* deskGlow — desk border accent pulse on active agent's desk */
  @keyframes deskGlow     { 0%,100%{box-shadow:none} 50%{box-shadow:0 0 12px var(--agent-color,#4f6ef7)} }
  /* statusPip — the coloured dot that pulses next to an agent's name / in the log */
  @keyframes statusPip    { 0%,100%{opacity:.5;transform:scale(.9)} 50%{opacity:1;transform:scale(1.2)} }

  /* ── PROPS ────────────────────────────────────────────────────────────────── */
  /* stompCan — trash can squish when chat is cleared */
  @keyframes stompCan    { 0%{transform:scaleY(1)} 20%{transform:scaleY(0.6) scaleX(1.3)} 50%{transform:scaleY(1.1) scaleX(0.95)} 100%{transform:scaleY(1)} }
  /* coffeeFloat — coffee cup drifting upward on the morning shift */
  @keyframes coffeeFloat { 0%,100%{transform:translateY(0) rotate(-5deg)} 50%{transform:translateY(-6px) rotate(5deg)} }
`;

export const STRATEGIUM_PROMPTS: StrategiumPrompt[] = [
  {
    label: "Global brief",
    prompt:
      "Brief me on the global posture across markets, cyber, and geopolitics. Focus on what changed and what needs action.",
  },
  {
    label: "Threat watch",
    prompt:
      "What cyber threats or CVEs need attention right now, and what is the most credible evidence behind them?",
  },
  {
    label: "Market pressure",
    prompt:
      "Summarize BTC, ETH, macro risk, and sentiment pressure with a practical operator takeaway.",
  },
  {
    label: "Recon dispatch",
    prompt:
      "Dispatch recon on a target and tell me what evidence matters before I act.",
  },
  ...HQ_WORKFLOW_PROMPTS,
];

export function formatRelativeTime(ts: number): string {
  if (!ts) return "No recent action";
  const delta = Date.now() - ts;
  const min = Math.floor(delta / 60_000);
  if (min < 1) return "Just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  return `${day}d ago`;
}

export function humanizePhase(value: string) {
  return value.replace(/([A-Z])/g, " $1").replace(/_/g, " ").trim();
}

export function frontToneScore(tone: StrategiumFront["tone"]) {
  return tone === "critical" ? 3 : tone === "warning" ? 2 : 1;
}

export function isEditableTarget(target: EventTarget | null) {
  const element = target as HTMLElement | null;
  const tag = element?.tagName?.toLowerCase();
  return (
    tag === "input" ||
    tag === "textarea" ||
    tag === "select" ||
    Boolean(element?.isContentEditable)
  );
}

export function computeAgentPos(args: {
  activeAgent: AgentId | null;
  routingAgent: AgentId | null;
  dispatchedTo: AgentId | null;
  idleRoamPos: Record<AgentId, { x: number; y: number }> | null;
}): Record<AgentId, { x: number; y: number }> {
  const { activeAgent, routingAgent, dispatchedTo, idleRoamPos } = args;

  const base: Record<AgentId, { x: number; y: number }> = {
    ...AGENT_HOME,
  };

  if (activeAgent) {
    return {
      ...base,
      jansky: { ...AGENT_MEETING.jansky },
      [activeAgent]: { ...AGENT_MEETING[activeAgent] },
    };
  }

  if (dispatchedTo) {
    return {
      ...base,
      jansky: { ...AGENT_MEETING.jansky },
      [dispatchedTo]: { ...AGENT_MEETING[dispatchedTo] },
    };
  }

  if (routingAgent) {
    return {
      ...base,
      jansky: { ...AGENT_PEEK.jansky },
      ...(routingAgent !== "jansky"
        ? { [routingAgent]: { ...AGENT_PEEK[routingAgent] } }
        : {}),
    };
  }

  if (idleRoamPos) return idleRoamPos;

  return base;
}
