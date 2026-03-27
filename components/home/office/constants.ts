// ── constants.ts ──────────────────────────────────────────────────────────────
// All configuration maps, position tables, and geometry constants for the
// agent office. Centralised here so every component imports from one place.
// Changing a value here propagates automatically to all consumers.
// No React or browser APIs — safe to import anywhere including server code.

import type { AgentId, OfficeObjectId, OfficeObjectPos } from './types'
import { JANSKY_F, ORBIT_F, NOVA_F, CIPHER_F, FLUX_F } from './sprites'

// ── Agent config ──────────────────────────────────────────────────────────────
// Display name, role, brand colour, AI model association, and sprite frames.
// The colour drives glows, badges, desk borders, and speech bubbles.
//
// ST character → role → AI model reasoning:
//   MAX    → Command  → Claude Opus   — calm orchestrator, real boss
//   EL     → Operative→ o1 / o3      — raw psychic power = extended reasoning
//   DUSTIN → Research → Perplexity   — always searching, loves science
//   HOPPER → Security → Gemini       — chief investigator, threat-aware
//   LUCAS   → Coordinator → Grok     — route coordinator, call-sign strategist
export const AGENTS: Record<AgentId, {
  name: string; role: string; color: string; model: string; frames: string[][]
}> = {
  jansky: { name: 'MAX',    role: 'Command',   color: '#ef4444', model: 'Claude Opus',  frames: JANSKY_F },
  orbit:  { name: 'EL',     role: 'Operative', color: '#818cf8', model: 'o1 / o3',      frames: ORBIT_F  },
  nova:   { name: 'DUSTIN', role: 'Research',  color: '#f59e0b', model: 'Perplexity',   frames: NOVA_F   },
  cipher: { name: 'HOPPER', role: 'Security',  color: '#3b82f6', model: 'Gemini',       frames: CIPHER_F },
  flux:   { name: 'LUCAS',  role: 'Coordinator', color: '#10b981', model: 'Grok',       frames: FLUX_F   },
}

// Left-to-right render order — used by DispatchBar to calculate % positions.
export const AGENT_ORDER: AgentId[] = ['cipher', 'orbit', 'jansky', 'nova', 'flux']

// ── Top-down position maps ────────────────────────────────────────────────────
// Expressed as % of the right-panel width/height so they scale with viewport.
// HOME = agent's own desk (where they sit when idle).
// MEETING = seats around the conference table (where active agents walk to).
export const AGENT_HOME: Record<AgentId, { x: number; y: number }> = {
  jansky: { x: 50, y: 13 },   // boss desk — top-centre
  cipher: { x: 11, y: 33 },   // security terminal — left wall
  flux:   { x: 89, y: 33 },   // trading station — right wall
  orbit:  { x: 19, y: 54 },   // coder desk — lower-left
  nova:   { x: 81, y: 54 },   // research desk — lower-right
}
export const AGENT_MEETING: Record<AgentId, { x: number; y: number }> = {
  jansky: { x: 50, y: 47 },   // head of table
  cipher: { x: 37, y: 53 },   // table back-left seat
  flux:   { x: 63, y: 53 },   // table back-right seat
  orbit:  { x: 40, y: 62 },   // table front-left seat
  nova:   { x: 60, y: 62 },   // table front-right seat
}

// Break spots — where each agent wanders during idle intervals.
// Each agent has an array of role-appropriate destinations so movement
// feels natural rather than repetitive.
//
// Shared landmarks (% of right-panel width/height):
//   Water cooler  → x: 83, y:  9
//   Sofa          → x: 45, y: 85
//   Plant corner  → x:  6, y:  9
//   Server rack   → x: 88, y: 12
//   Conference table (reviewing solo) → x: 50, y: 52
//
// When visiting a colleague's desk during a management round, JANSKY
// uses each agent's AGENT_HOME position — wired in AgentOffice.tsx.
export const AGENT_BREAK: Record<AgentId, Array<{ x: number; y: number }>> = {
  // Boss — water cooler + solo conf-table review (management rounds handled separately)
  jansky: [
    { x: 83, y:  9 },   // water cooler
    { x: 50, y: 52 },   // conf table — reviewing notes solo
  ],
  // Coder — mostly stays at desk; sofa or quick water run when brain-dead
  orbit: [
    { x: 45, y: 85 },   // sofa — mandatory brain break
    { x: 83, y:  9 },   // water cooler — caffeine run
  ],
  // Researcher — plant corner for thinking strolls, sofa for deep reading
  nova: [
    { x:  6, y:  9 },   // top-left plant corner
    { x: 45, y: 85 },   // sofa — reading
    { x: 50, y: 52 },   // conf table — solo research review
  ],
  // Security — never fully rests; paces left corridor or checks server rack
  cipher: [
    { x: 11, y: 70 },   // lower-left pacing corridor
    { x: 88, y: 12 },   // server rack — hardware check
  ],
  // Trader — stress-driven water cooler runs; sofa to decompress after bad ticks
  flux: [
    { x: 83, y:  9 },   // water cooler (primary stress valve)
    { x: 83, y:  9 },   // water cooler again — high weight so it triggers more
    { x: 45, y: 85 },   // sofa — decompress after a big red candle
  ],
}

// Peek positions — where idle agents step to while watching a colleague work.
// Slightly closer to centre than home desks; gives "leaning in" body language.
export const AGENT_PEEK: Record<AgentId, { x: number; y: number }> = {
  jansky: { x: 50, y: 22 },   // leans forward from boss desk
  cipher: { x: 22, y: 40 },   // steps right toward the action
  flux:   { x: 78, y: 40 },   // steps left toward the action
  orbit:  { x: 28, y: 62 },   // inches inward from lower-left
  nova:   { x: 72, y: 62 },   // inches inward from lower-right
}

// ── HQ Prime layout objects (edit-mode draggable) ──────────────────────────────
export const OFFICE_OBJECT_DEFAULTS: Record<OfficeObjectId, OfficeObjectPos> = {
  serverRack:       { x: 4,  y: 24, ax: 'r', ay: 't' }, // right:4%, top:24%
  plantBackLeft:    { x: 4,  y: 30, ax: 'l', ay: 't' },
  plantBottomLeft:  { x: 4,  y: 3,  ax: 'l', ay: 'b' },
  waterCooler:      { x: 15, y: 25, ax: 'r', ay: 't' }, // right:15%, top:25%
  trashCan:         { x: 13, y: 3,  ax: 'r', ay: 'b' },
  fuelGauge:        { x: 9,  y: 2,  ax: 'l', ay: 'b' },
  conferenceTable:  { x: 50, y: 50, ax: 'l', ay: 't' },
  sofa:             { x: 50, y: 97, ax: 'l', ay: 't' },
  janskyDesk:       { x: 50, y: 13, ax: 'l', ay: 't' },
  cipherDesk:       { x: 11, y: 33, ax: 'l', ay: 't' },
  fluxDesk:         { x: 89, y: 33, ax: 'l', ay: 't' },
  orbitDesk:        { x: 19, y: 54, ax: 'l', ay: 't' },
  novaDesk:         { x: 81, y: 54, ax: 'l', ay: 't' },
}

// ── HQ Prime 3D layout presets ──────────────────────────────────────────────
type OfficeSceneMode = 'auto' | 'morning' | 'afternoon' | 'night'
export type OfficeOperationalMode = 'normal' | 'war' | 'nightOps'

export const OFFICE_OPERATIONAL_PROFILES: Record<
  OfficeOperationalMode,
  {
    label: string
    focusTabs: string[]
    schedulerTickMs: number
    noisySuccessAlerts: boolean
    promptPrefix: string
  }
> = {
  normal: {
    label: 'FOCUS',
    focusTabs: ['home', 'intel'],
    schedulerTickMs: 30_000,
    noisySuccessAlerts: true,
    promptPrefix: '[Operational Profile: Focus/Normal] Balanced execution. Keep updates concise.',
  },
  war: {
    label: 'WAR ROOM',
    focusTabs: ['cyber', 'ops'],
    schedulerTickMs: 15_000,
    noisySuccessAlerts: true,
    promptPrefix: '[Operational Profile: War Room] Prioritize active threat monitoring and rapid incident context.',
  },
  nightOps: {
    label: 'NIGHT OPS',
    focusTabs: ['security', 'cyber'],
    schedulerTickMs: 30_000,
    noisySuccessAlerts: false,
    promptPrefix: '[Operational Profile: Night Ops] Low-noise monitoring. Surface anomalies and high-risk changes only.',
  },
}

export const OFFICE_LAYOUT_PRESETS: Record<
  'focus' | 'war' | 'nightOps',
  {
    label: string
    officeSceneMode?: OfficeSceneMode
    officeMotion?: number
    layout: Record<OfficeObjectId, OfficeObjectPos>
  }
> = {
  focus: {
    label: 'FOCUS',
    officeSceneMode: 'afternoon',
    officeMotion: 1.35,
    layout: {
      ...OFFICE_OBJECT_DEFAULTS,
      // Bring desks slightly inward for a “tighter” war-room feel.
      janskyDesk: { x: 52, y: 16, ax: 'l', ay: 't' },
      orbitDesk:  { x: 26, y: 56, ax: 'l', ay: 't' },
      novaDesk:   { x: 74, y: 56, ax: 'l', ay: 't' },
      cipherDesk: { x: 14, y: 36, ax: 'l', ay: 't' },
      fluxDesk:   { x: 86, y: 36, ax: 'l', ay: 't' },
      conferenceTable: { x: 50, y: 48, ax: 'l', ay: 't' },
      sofa:             { x: 50, y: 92, ax: 'l', ay: 't' },
    },
  },
  war: {
    label: 'WAR ROOM',
    officeSceneMode: 'night',
    officeMotion: 1.6,
    layout: {
      ...OFFICE_OBJECT_DEFAULTS,
      // Cluster props nearer center while keeping anchors consistent.
      serverRack:      { x: 22, y: 26, ax: 'r', ay: 't' },
      waterCooler:     { x: 24, y: 28, ax: 'r', ay: 't' },
      trashCan:        { x: 26, y: 18, ax: 'r', ay: 'b' },
      fuelGauge:       { x: 18, y:  6, ax: 'l', ay: 'b' },
      conferenceTable: { x: 50, y: 50, ax: 'l', ay: 't' },
      sofa:             { x: 52, y: 90, ax: 'l', ay: 't' },
      // Slightly re-stage desks
      orbitDesk:        { x: 28, y: 58, ax: 'l', ay: 't' },
      novaDesk:         { x: 72, y: 58, ax: 'l', ay: 't' },
      cipherDesk:       { x: 18, y: 34, ax: 'l', ay: 't' },
      fluxDesk:         { x: 82, y: 34, ax: 'l', ay: 't' },
    },
  },
  nightOps: {
    label: 'NIGHT OPS',
    officeSceneMode: 'night',
    officeMotion: 1.2,
    layout: {
      ...OFFICE_OBJECT_DEFAULTS,
      // Shift the “energy” objects to feel like night operations.
      serverRack:      { x: 12, y: 22, ax: 'r', ay: 't' },
      waterCooler:     { x: 12, y: 24, ax: 'r', ay: 't' },
      trashCan:        { x: 10, y:  8, ax: 'r', ay: 'b' },
      fuelGauge:       { x: 20, y:  4, ax: 'l', ay: 'b' },
      plantBackLeft:   { x: 6,  y:  26, ax: 'l', ay: 't' },
      plantBottomLeft: { x: 6, y:  8, ax: 'l', ay: 'b' },
      // Keep furniture near defaults.
      conferenceTable: { x: 50, y: 50, ax: 'l', ay: 't' },
      sofa:             { x: 50, y: 97, ax: 'l', ay: 't' },
    },
  },
}

// ── Dispatch speech-bubble text ───────────────────────────────────────────────
// What MAX says when routing a message to each specialist.
export const DISPATCH_LINES: Record<AgentId, string> = {
  jansky: 'On it. — MAX.',
  orbit:  '→ EL. Open a portal.',
  nova:   '→ DUSTIN. Find it.',
  cipher: '→ HOPPER. Check the threat.',
  flux:   '→ LUCAS. Crack the pattern.',
}

// ── Tool call icons ───────────────────────────────────────────────────────────
// Emoji shown on ToolCallBadge and in agent speech bubbles during tool use.
export const TOOL_ICON: Record<string, string> = {
  web_search:           '🔍',
  fetch_url:            '🌐',
  write_file:           '💾',
  draft_file:           '📝',
  read_file:            '📂',
  list_files:           '📋',
  calculate:            '🧮',
  remember:             '🧠',
  recall:               '🧠',
  read_project_file:    '🗂️',
  list_project_files:   '📁',
  patch_project_file:   '✏️',
  create_project_file:  '🆕',
  propose_project_edit: '📋',
  ask_max:              '🤖',
  navigate_to:          '🧭',
  read_current_tab:     '👁️',
  click_element:        '🖱️',
  type_text:            '⌨️',
}

// ── Skill routing ─────────────────────────────────────────────────────────────
// Maps a tool name to the human-readable skill label and colour shown in
// the badge inside ToolCallBadge when a step has a recognised skill.
export const SKILL_ROUTE: Record<string, { label: string; color: string }> = {
  web_search:           { label: 'RESEARCH',    color: '#00FF66' },
  fetch_url:            { label: 'RESEARCH',    color: '#00FF66' },
  read_project_file:    { label: 'ENGINEERING', color: '#7c3aed' },
  list_project_files:   { label: 'ENGINEERING', color: '#7c3aed' },
  patch_project_file:   { label: 'ENGINEERING', color: '#7c3aed' },
  create_project_file:  { label: 'ENGINEERING', color: '#7c3aed' },
  propose_project_edit: { label: 'REVIEW GATE', color: '#f59e0b' },
  write_file:           { label: 'FILE I/O',    color: '#00DDFF' },
  read_file:            { label: 'FILE I/O',    color: '#00DDFF' },
  draft_file:           { label: 'FILE I/O',    color: '#00DDFF' },
  list_files:           { label: 'FILE I/O',    color: '#00DDFF' },
  calculate:            { label: 'COMPUTE',     color: '#f59e0b' },
  remember:             { label: 'MEMORY',      color: '#10b981' },
  recall:               { label: 'MEMORY',      color: '#10b981' },
  ask_max:              { label: 'AGENT CALL',  color: '#ef4444' },
  navigate_to:          { label: 'BROWSER',     color: '#00DDFF' },
  read_current_tab:     { label: 'BROWSER',     color: '#00DDFF' },
  click_element:        { label: 'BROWSER',     color: '#00DDFF' },
  type_text:            { label: 'BROWSER',     color: '#00DDFF' },
}

// ── Desk decorations ──────────────────────────────────────────────────────────
// Emoji prop shown next to the agent's name on their desk nameplate.
// Each icon is tied to the ST character's signature prop or trait.
export const DESK_DECO: Record<AgentId, string> = {
  jansky: '🎶',  // MAX — Walkman / Kate Bush
  orbit:  '🌀',  // EL  — psychic vortex / portal
  nova:   '🔭',  // DUSTIN — scientist, always exploring
  cipher: '🔦',  // HOPPER — flashlight, investigator
  flux:   '🗝️',  // LUCAS — route coordinator / pattern key
}

// ── Desk monitor data ─────────────────────────────────────────────────────────
// Label and bar-chart heights shown on the SVG monitor in each agent's desk.
// bars[] values are in arbitrary units (0–14 visible height in the SVG).
export const DESK_MONITOR: Record<AgentId, { label: string; bars: number[] }> = {
  jansky: { label: 'CMD', bars: [8, 5, 10, 7, 9, 6, 11, 8] },
  orbit:  { label: 'IDE', bars: [3, 9, 5, 2, 12, 4, 7, 10] },
  nova:   { label: 'NET', bars: [6, 9, 4, 11, 7, 13, 5, 8]  },
  cipher: { label: 'SEC', bars: [11, 4, 8, 3, 10, 7, 5, 9]  },
  flux:   { label: 'MKT', bars: [5, 8, 12, 6, 14, 9, 11, 7] },
}

// ── Idle animation personalities (outer wrapper) ──────────────────────────────
// Each agent has a distinct idle animation so the office looks alive even when
// nothing is happening. The animation drives the whole agent card div.
export const IDLE_ANIM: Record<AgentId, string> = {
  jansky: 'idleNod 3.2s ease-in-out infinite',       // authoritative head nod
  orbit:  'idleTyping 1.4s ease-in-out infinite',    // constant keyboard rhythm
  nova:   'idleScan 4.0s ease-in-out infinite',      // side-to-side intel scan
  cipher: 'idleVigilant 2.8s ease-in-out infinite',  // alert micro-rotation
  flux:   'idleCharts 2.4s ease-in-out infinite',    // chart-watching bob
}

// ── Idle inner sprite motion ───────────────────────────────────────────────────
// Drives just the character body independently of the outer wrapper animation.
// This creates a two-layer motion: body sways + sprite moves inside it.
export const IDLE_SPRITE_ANIM: Record<AgentId, string> = {
  jansky: 'spriteBob 2.8s ease-in-out infinite',
  orbit:  'spriteType 0.9s ease-in-out infinite',
  nova:   'spriteBob 3.5s ease-in-out infinite',
  cipher: 'agentWalk 2.0s ease-in-out infinite alternate',
  flux:   'spriteType 1.2s ease-in-out infinite',
}
