// ── types.ts ──────────────────────────────────────────────────────────────────
// All shared TypeScript types for the Homefront agent office.
// Import from here — never re-declare these in other office/ files.
// No React or store imports — pure type definitions only.

import type { AgentStep } from "@/lib/agent";
import type { AssistantChatActionModel } from "@/lib/assistantChatActions";
import type { AssistantOperatorWorkflowState } from "@/lib/assistantOperatorWorkflow";
import type { VaultCaptureSuggestion } from "@/lib/vaultCapture";

// ── Emotion ───────────────────────────────────────────────────────────────────
// The seven states the crab mascot can display.
// Drives glow colour, animation, and label inside CrabMascot.
export type Emotion =
  | "idle"
  | "thinking"
  | "happy"
  | "working"
  | "excited"
  | "error"
  | "success";

// ── AgentId ───────────────────────────────────────────────────────────────────
// The five agent identifiers — used as keys in every config map.
export type AgentId = "jansky" | "orbit" | "nova" | "cipher" | "flux";
export type HQAnswerStyle =
  | "conversational"
  | "learning"
  | "live_current"
  | "product_help"
  | "repo_work"
  | "workflow";
export type HQResponseKind = "assistant" | "evidence" | "workflow";
export type HQAssistantIntent =
  | "conversation"
  | "learning"
  | "product_help"
  | "repo_work"
  | "live_current"
  | "research"
  | "workspace_action"
  | "memory_recall"
  | "archive_continuity"
  | "workflow";

export interface PreparedWorkspaceTarget {
  href: string;
  label: string;
  detail: string;
}

export type SwitchOperatorMode =
  | "idle"
  | "running"
  | "blocked"
  | "completed"
  | "failed";

export interface SwitchOperatorStatus {
  mode: SwitchOperatorMode;
  requestedAt: number;
  updatedAt: number;
  readinessSummary: string;
  taskLabel?: string;
  taskId?: string;
  selectedLane?: string;
  selectedHref?: string;
  selectedAgent?: AgentId;
  providerUsed?: string;
  nextStep?: string;
  detail?: string;
}

export type AssistantGuidanceKind =
  | "continuation"
  | "learning"
  | "archive"
  | "execution"
  | "scope_drift"
  | "degraded";

export type AssistantGuidanceTone = "info" | "caution" | "positive" | "neutral";

export interface AssistantGuidance {
  kind: AssistantGuidanceKind;
  tone: AssistantGuidanceTone;
  title: string;
  detail: string;
  href?: string;
  priority?: number;
}

// ── Office layout editor (Drawbridge-style) ────────────────────────────────────
export type OfficeObjectId =
  | "serverRack"
  | "plantBackLeft"
  | "plantBottomLeft"
  | "waterCooler"
  | "trashCan"
  | "fuelGauge"
  | "conferenceTable"
  | "sofa"
  | "janskyDesk"
  | "cipherDesk"
  | "fluxDesk"
  | "orbitDesk"
  | "novaDesk";

export type OfficeObjectPos = {
  x: number;
  y: number;
  ax: "l" | "r"; // horizontal anchor: left/right (% from that edge)
  ay: "t" | "b"; // vertical anchor: top/bottom (% from that edge)
};

// ── TimeZone ──────────────────────────────────────────────────────────────────
// Returned by getTimeOfDay() — drives ambient decorations (coffee/sofa/moon).
export type TimeZone = "morning" | "afternoon" | "night";

// ── AvatarProps ───────────────────────────────────────────────────────────────
// Props accepted by AgentAvatar — renders one agent's full card with desk.
export interface AvatarProps {
  id: AgentId;
  active: boolean; // true while this agent is responding to a message
  routing: boolean; // true while JANSKY is choosing where to dispatch
  dispatched: boolean; // true in the 700 ms after this agent was pinged
  dispatch: string | null; // speech-bubble text shown above JANSKY only
  activeTool?: string | null; // name of the tool currently being called
  isReasoning?: boolean; // true when running R1 — uses thought-cloud bubble style
  awayFromDesk?: boolean; // true when agent has walked away from home position
}

// ── ActivityEntry ─────────────────────────────────────────────────────────────
// One row in the scrolling activity log panel shown in the left panel.
export interface ActivityEntry {
  id: number; // Date.now() at creation — used as React key
  agent: AgentId; // which agent generated this entry
  text: string; // human-readable description of what happened
  type: "dispatch" | "tool" | "response" | "idle";
  // dispatch  — JANSKY routing a message to a specialist
  // tool      — an agent called an external tool
  // response  — an agent finished and returned text
  // idle      — startup / standby messages
}

// ── ChatMessage ───────────────────────────────────────────────────────────────
// A single bubble in the main chat history list.
export interface ChatMessage {
  role: "user" | "agent";
  agent?: AgentId; // present on every agent reply
  text: string;
  steps?: AgentStep[]; // tool call steps attached to agent replies (collapsible)
  sourceQuery?: string; // originating operator prompt for reply-level memory routing
  answerStyle?: HQAnswerStyle;
  responseKind?: HQResponseKind;
  showEvidencePosture?: boolean;
  assistantIntent?: HQAssistantIntent;
  preparedWorkspace?: PreparedWorkspaceTarget | null;
  actionModel?: AssistantChatActionModel | null;
  operatorWorkflow?: AssistantOperatorWorkflowState | null;
  assistantGuidance?: AssistantGuidance[];
  vaultCaptureSuggestion?: VaultCaptureSuggestion | null;
}

// ── Dynamic UI rules engine ───────────────────────────────────────────────────

export type UIActionType =
  | "float-card"        // dismissible card floating in bottom-right
  | "nav-badge"         // colored dot on a tab nav item
  | "header-indicator"; // small text indicator in the shell top rail

export interface NexusLiveSnapshot {
  fg:        { value: number; label: string };
  cveCount:  { critical: number; high: number };
  worldRisk: number;
  hour:      number;       // 0–23 local time
  dayKey:    string;       // YYYY-MM-DD local date key for time-bound rule activations
  isWeekday: boolean;
  agentBusy: number;       // count of agents currently dispatched
  btcChgPct: number;       // BTC 24h change %
}

export interface UIRule {
  id:          string;
  label:       string;
  when:        (s: NexusLiveSnapshot) => boolean;
  activationKey?: (s: NexusLiveSnapshot) => string;
  action:      UIActionType;
  priority:    number;         // higher = shown first
  ttl?:        number;         // ms — undefined = manual dismiss only
  card?: {
    title:   string;
    body:    string;
    color:   string;           // CSS variable e.g. "var(--flo)"
    emoji?:  string;
  };
  badge?: {
    tab:   string;             // matches data-nexus-tab attribute on nav links
    color: string;
    label: string;
  };
  indicator?: {
    text:  string;
    color: string;
  };
}

// ── Persona Engine (Block N) ──────────────────────────────────────────────────

export type PersonaMode = "formal" | "direct" | "deep";

export interface AgentPersona {
  mode:          PersonaMode;
  label:         string;        // "Formal" | "Direct" | "Deep"
  tone:          string;        // e.g. "institutional, cited"
  maxTokens:     number;        // 2048 | 1024 | 4096
  thinkingBudget?: number;      // only "deep" mode
  outputStyle:   string;        // "structured prose" | "bullets" | "analysis blocks"
  promptSuffix:  string;        // injected after base system prompt
}

export interface CouncilResult {
  agent:    AgentId;
  persona:  PersonaMode;
  answer:   string;
  duration: number;             // ms
}

// ── VAULT Knowledge Graph v2 (Block Q) ────────────────────────────────────────

// Rule 1: namespace keeps personal notes separate from agent speculative writes
// Rule 2: sourceType drives type-specific extraction (paper vs transcript vs report)
// Rule 3: biasCheck forces counter-arguments and data gaps on every entry
// Rule 4: tldr enables fast index scanning without loading full content
export interface VaultItemMetadata {
  id:          string;
  title:       string;
  tags:        string[];
  timestamp:   number;
  agentId?:    AgentId;
  type:        "note" | "report" | "clip" | "task" | "other";
  visibility?: "safe" | "internal" | "restricted";
  originKind?: "saved_article" | "compiled_page";
  // Rule 1 - vault separation
  namespace:   "user" | "agent";
  // Rule 2 - source classification
  sourceType:  "paper" | "transcript" | "report" | "clip" | "note" | "query" | "other";
  extractMethod?: "method+findings" | "speaker-attribution" | "exec-summary-first" | "generic";
  // Rule 3 - bias check
  biasCheck?:  { counterArguments: string[]; dataGaps: string[] };
  // Rule 4 - TLDR for fast index scanning
  tldr?:       string;
}

// Rule 4: lightweight index — scan TLDRs only, load full page only if relevant
export interface VaultIndex {
  builtAt: number;
  entries: Array<{ id: string; title: string; tldr: string; tags: string[]; namespace: "user" | "agent" }>;
}

// Rule 7: lint pass results
export interface VaultLintResult {
  contradictions: Array<{ ids: [string, string]; reason: string }>;
  staleClaims:    Array<{ id: string; title: string; ageMs: number }>;
  orphanPages:    string[];   // ids with no edges
  underlinkedPages: string[]; // ids with only one visible connection
  noBacklinkPages: string[];  // ids with no explicit inbound archive links
  gapTopics:      string[];   // tags with only 1 item (thin coverage)
  checkedAt:      number;
}

export type VaultArchiveLinkKind = "semantic" | "topic" | "workflow" | "manual";
export type VaultArchiveLinkState = "suggested" | "confirmed";

export interface VaultArchiveLink {
  targetId: string;
  reason: string;
  strength: number;
  kind: VaultArchiveLinkKind;
  state: VaultArchiveLinkState;
}

// Drone legal compliance
export interface DroneComplianceCheck {
  location:    { city: string; state: string; country?: string };
  operationType: "recreational" | "commercial" | "mapping" | "inspection" | "delivery";
  droneWeight:  number;        // lbs
  altitude:     number;        // ft AGL
  nightOps:     boolean;
  nearAirport:  boolean;
  additionalContext?: string;
}

export interface DroneComplianceResult {
  overallScore:  number;       // 0-100 compliance score
  status:        "compliant" | "review-required" | "likely-violation";
  checkedAt:     number;
  location:      { city: string; state: string; country?: string };
  agents: {
    faa:         DroneAgentResult;
    state:       DroneAgentResult;
    local:       DroneAgentResult;
    airspace:    DroneAgentResult;
    operational: DroneAgentResult;
  };
  topIssues:     string[];
  recommendations: string[];
}

export interface DroneAgentResult {
  agentName:   string;
  score:       number;         // 0-100
  weight:      number;         // 0-1, weights sum to 1.0
  findings:    string[];
  violations:  string[];
  citations:   string[];       // law/reg references
}

export interface VaultEdge {
  source:   string;    // VaultItem id
  target:   string;    // VaultItem id
  weight:   number;    // 0–1 — shared tag / entity co-occurrence strength
  reason:   string;    // "shared tag: bitcoin" | "same agent" | "entity overlap"
  kind?:    "heuristic" | "archive_link";
  directed?: boolean;
}

export interface VaultGraphData {
  nodes:     VaultItemMetadata[];
  edges:     VaultEdge[];
  clusters:  string[][];          // groups of related node ids
  orphans:   string[];            // node ids with no edges
  builtAt:   number;              // Date.now()
}

export interface VaultSynthesis {
  agentId:   AgentId;
  summary:   string;
  gaps:      string[];            // topics with <2 items
  clusters:  string[];            // one-line descriptions of each cluster
  createdAt: number;
}
