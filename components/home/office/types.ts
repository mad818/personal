// ── types.ts ──────────────────────────────────────────────────────────────────
// All shared TypeScript types for the Nexus Prime agent office.
// Import from here — never re-declare these in other office/ files.
// No React or store imports — pure type definitions only.

import type { AgentStep } from '@/lib/agent'

// ── Emotion ───────────────────────────────────────────────────────────────────
// The seven states the crab mascot can display.
// Drives glow colour, animation, and label inside CrabMascot.
export type Emotion = 'idle' | 'thinking' | 'happy' | 'working' | 'excited' | 'error' | 'success'

// ── AgentId ───────────────────────────────────────────────────────────────────
// The five agent identifiers — used as keys in every config map.
export type AgentId = 'jansky' | 'orbit' | 'nova' | 'cipher' | 'flux'

// ── Office layout editor (Drawbridge-style) ────────────────────────────────────
export type OfficeObjectId =
  | 'serverRack'
  | 'plantBackLeft'
  | 'plantBottomLeft'
  | 'waterCooler'
  | 'trashCan'
  | 'fuelGauge'
  | 'conferenceTable'
  | 'sofa'
  | 'janskyDesk'
  | 'cipherDesk'
  | 'fluxDesk'
  | 'orbitDesk'
  | 'novaDesk'

export type OfficeObjectPos = {
  x: number
  y: number
  ax: 'l' | 'r' // horizontal anchor: left/right (% from that edge)
  ay: 't' | 'b' // vertical anchor: top/bottom (% from that edge)
}

// ── TimeZone ──────────────────────────────────────────────────────────────────
// Returned by getTimeOfDay() — drives ambient decorations (coffee/sofa/moon).
export type TimeZone = 'morning' | 'afternoon' | 'night'

// ── AvatarProps ───────────────────────────────────────────────────────────────
// Props accepted by AgentAvatar — renders one agent's full card with desk.
export interface AvatarProps {
  id:           AgentId
  active:       boolean        // true while this agent is responding to a message
  routing:      boolean        // true while JANSKY is choosing where to dispatch
  dispatched:   boolean        // true in the 700 ms after this agent was pinged
  dispatch:     string | null  // speech-bubble text shown above JANSKY only
  activeTool?:   string | null  // name of the tool currently being called
  isReasoning?:  boolean        // true when running R1 — uses thought-cloud bubble style
  awayFromDesk?: boolean        // true when agent has walked away from home position
}

// ── ActivityEntry ─────────────────────────────────────────────────────────────
// One row in the scrolling activity log panel shown in the left panel.
export interface ActivityEntry {
  id:    number               // Date.now() at creation — used as React key
  agent: AgentId              // which agent generated this entry
  text:  string               // human-readable description of what happened
  type:  'dispatch' | 'tool' | 'response' | 'idle'
  // dispatch  — JANSKY routing a message to a specialist
  // tool      — an agent called an external tool
  // response  — an agent finished and returned text
  // idle      — startup / standby messages
}

// ── ChatMessage ───────────────────────────────────────────────────────────────
// A single bubble in the main chat history list.
export interface ChatMessage {
  role:   'user' | 'agent'
  agent?: AgentId             // present on every agent reply
  text:   string
  steps?: AgentStep[]         // tool call steps attached to agent replies (collapsible)
}
