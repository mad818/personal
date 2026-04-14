# Nexus Prime — Blocks M–R Implementation Spec
# Context-Aware Intelligence, Agent Quality Gates, Persona Engine, Dynamic UI, Knowledge Graph
# Generated: 2026-04-04

---

## 0. Guiding Principles

1. **Zero breakage guarantee** — Every block is additive. No existing export is renamed or removed.
   Existing consumers never need to change unless they opt into the new capability.
2. **Type-first** — Every new interface is defined in `types.ts` (or a co-located types file)
   before any implementation touches it.
3. **Store-centric** — All runtime state lives in Zustand. No React Context, no local refs for
   shared data.
4. **Surgical edits only** — Files over 500 lines (OfficeCommandCenter, store, prompts) get
   targeted additions, never rewrites.
5. **Approval-gated intelligence** — Blocks M and R involve agent self-improvement. Every proposed
   change generates a `PendingEdit` and waits for Mario to approve. No autonomous writes to
   production files.
6. **Progressive disclosure** — New UI elements default to collapsed/hidden. Users discover them;
   they don't break existing workflows.
7. **tsc --noEmit must pass** after every block before moving to the next.

---

## 1. Implementation Order & Rationale

| # | Block | Risk | Rationale |
|---|-------|------|-----------|
| 1 | **O — Stack Context** | Low | New file only. Extends `buildLiveContext()` with ~5 lines. Isolated. |
| 2 | **R — Regression Suite** | Low | New files only (`tsv`, `json`, `script`). No existing file edits except `package.json`. |
| 3 | **M — Learnings Loop** | Medium | Extends store + OfficeCommandCenter. Well-defined insertion points. |
| 4 | **N — Persona Engine** | Medium | Extends `prompts.ts` + DispatchBar. No type changes to existing interfaces. |
| 5 | **P — Dynamic UI** | Medium | New store slice + one new component mounted in `app/home/page.tsx`. |
| 6 | **Q — VAULT Graph v2** | Higher | Largest build. Extends store + VAULT page. Depends on clean store from blocks above. |

---

## 2. Pre-Flight Checklist (Run Before Starting)

```bash
npx tsc --noEmit                          # must be 0 errors
npm run verify                            # lint + type + path safety
grep -c "AgentId" components/home/office/types.ts   # baseline coupling count
```

---

## BLOCK O — Stack-Aware Context Injection
### Source: midudev/autoskills
### Risk: LOW | Effort: 0.5 session

### What it solves
ORBIT generates raw `fetch()` when it should use `callAI()`. ORBIT inlines price formatting
when `fmtPrice()` exists. These are repeated corrections. Injecting the actual stack into
every agent call eliminates this class of error permanently.

### New files

#### `lib/projectContext.ts` (NEW — ~90 lines)
```typescript
// Reads package.json once at module load (server-side safe).
// Returns a compact multi-line string injected into buildLiveContext().

export interface ProjectContext {
  stack: string[];           // ["Next.js 14", "TypeScript strict", "React 18", "Zustand", "Tailwind"]
  patterns: PatternRule[];   // { name, description, example }[]
  constraints: string[];     // ["tsc --noEmit must pass", "No any casts without comment", ...]
  generatedAt: number;       // Date.now() — for cache invalidation
}

interface PatternRule {
  name: string;
  description: string;
  example?: string;
}

// Reads /package.json relative to process.cwd().
// Never throws — returns a safe fallback on any read/parse failure.
export function detectProjectContext(): ProjectContext

// Returns the compact string block for injection into buildLiveContext().
// ~150 tokens. Example:
//   [NEXUS STACK CONTEXT]
//   Stack: Next.js 14 (App Router) | TypeScript strict | React 18 | Zustand 4 | Tailwind CSS
//   Patterns:
//     fmtPrice(n) / fmtVol(n) / timeAgo(ts) — always use from lib/helpers.ts, never inline
//     callAI(prompt) / streamAI(...) — all AI calls must route here, never fetch provider directly
//     useStore(s => s.field) — always selector form, never useStore().field
//   Constraints:
//     tsc --noEmit must pass before marking any task done
//     All fetches wrapped in try/catch with silent failure
//     No any casts without // eslint-disable + reason comment
//   [END STACK CONTEXT]
export function buildStackContextBlock(): string

// Cache: computed once, stored in module-level variable.
// Re-computed if package.json mtime changes (checked every 60s).
```

### Edits to existing files

#### `lib/liveContext.ts`
**Insertion point:** Inside `buildLiveContext(state)`, after the `[END LIVE INTEL]` block.
```typescript
// Add at the bottom of buildLiveContext() return value:
import { buildStackContextBlock } from "@/lib/projectContext";

// In buildLiveContext():
const stackBlock = buildStackContextBlock();
return `${existingContext}\n${stackBlock}`;
```

**Safety:** `buildStackContextBlock()` never throws (try/catch internally). If it fails,
returns empty string — zero impact on existing context.

#### `components/command/ProjectStackCard.tsx` (NEW — ~80 lines)
A simple read-only card for the COMMAND tab. Shows:
- Detected stack badges
- Key patterns as a list
- Last-detected timestamp
- "Refresh" button (re-reads package.json)

```typescript
// Component signature:
export function ProjectStackCard(): JSX.Element
// No required props. Reads from lib/projectContext.buildStackContextBlock().
```

#### `app/command/page.tsx`
Add `<LazyProjectStackCard />` dynamic import after `<LazyNetworkHealth />`.
One line addition. No structural change.

### Coupling analysis
- No changes to `AgentId`, `Settings`, `store/useStore.ts`, or any component.
- `buildLiveContext()` return type is `string` — adding more text to the string is backward-compatible.
- Safe to deploy independently.

### Verification
```bash
npx tsc --noEmit
# Check output of buildStackContextBlock() manually:
node -e "const {buildStackContextBlock} = require('./lib/projectContext'); console.log(buildStackContextBlock())"
```

---

## BLOCK R — Regression Suite + Metrics Persistence
### Source: neosigmaai/auto-harness
### Risk: LOW | Effort: 1 session

### What it solves
Agent prompts can drift silently. A change to ORBIT's persona that seems harmless can degrade
its code task accuracy. Without a regression suite, we only discover this when ORBIT makes
a mistake in production. This block creates a safety net that runs before any agent prompt
change lands.

### Architecture diagram
```
npm run verify
  └── verify:agents script
        ├── Reads tasks/agent-suite.json (canonical Q/A pairs)
        ├── Calls /api/ai for each pair (actual provider chain)
        ├── Scores each response (keyword + structure match)
        ├── Appends result to tasks/agent-metrics.tsv
        └── Exits non-zero if pass rate < 80%
```

### New files

#### `tasks/agent-suite.json` (NEW)
```json
{
  "version": 1,
  "description": "Canonical regression suite — 2 scenarios per agent. Must not regress.",
  "passThreshold": 0.8,
  "scenarios": [
    {
      "id": "orbit-001",
      "agent": "orbit",
      "query": "Read lib/helpers.ts and tell me what fmtPrice does.",
      "requiredKeywords": ["fmtPrice", "price", "format", "decimal"],
      "requiredStructure": "mentions the function name and its purpose"
    },
    {
      "id": "orbit-002",
      "agent": "orbit",
      "query": "What pattern should I use for all AI calls in Nexus?",
      "requiredKeywords": ["callAI", "streamAI", "lib/ai.ts", "never"],
      "requiredStructure": "references callAI or streamAI"
    },
    {
      "id": "flux-001",
      "agent": "flux",
      "query": "What does a Fear & Greed value of 23 mean for market positioning?",
      "requiredKeywords": ["fear", "greed", "extreme", "contrarian", "position"],
      "requiredStructure": "provides directional analysis"
    },
    {
      "id": "flux-002",
      "agent": "flux",
      "query": "Give me a bull/base/bear scenario for Bitcoin at current price.",
      "requiredKeywords": ["bull", "base", "bear", "probability", "scenario"],
      "requiredStructure": "three distinct scenarios with probabilities"
    },
    {
      "id": "cipher-001",
      "agent": "cipher",
      "query": "A CVE has CVSS 9.8 and affects Apache HTTP Server. What is the triage priority?",
      "requiredKeywords": ["critical", "CVE", "CVSS", "priority", "patch"],
      "requiredStructure": "assigns priority and recommends action"
    },
    {
      "id": "cipher-002",
      "agent": "cipher",
      "query": "What is the difference between CVE severity and exploitability?",
      "requiredKeywords": ["CVSS", "exploitability", "severity", "impact", "score"],
      "requiredStructure": "distinguishes severity from exploitability"
    },
    {
      "id": "nova-001",
      "agent": "nova",
      "query": "Research the current state of AI regulation in the EU.",
      "requiredKeywords": ["EU", "regulation", "AI", "Act", "compliance"],
      "requiredStructure": "structured summary with cited sources or references"
    },
    {
      "id": "nova-002",
      "agent": "nova",
      "query": "Compare Groq and Cerebras for LLM inference speed.",
      "requiredKeywords": ["Groq", "Cerebras", "inference", "speed", "tokens"],
      "requiredStructure": "side-by-side comparison"
    },
    {
      "id": "jansky-001",
      "agent": "jansky",
      "query": "Break down this task: Add a new tab to Nexus Prime for weather tracking.",
      "requiredKeywords": ["plan", "step", "component", "API", "tab"],
      "requiredStructure": "numbered steps or phases"
    },
    {
      "id": "jansky-002",
      "agent": "jansky",
      "query": "What are the risks of adding a new Zustand store slice?",
      "requiredKeywords": ["persist", "coupling", "store", "state", "migration"],
      "requiredStructure": "identifies at least 2 distinct risks"
    }
  ]
}
```

#### `tasks/agent-metrics.tsv` (NEW — append-only log)
```
# Nexus Prime agent regression metrics
# Format: date\tagent\tpass_count\tfail_count\tavg_duration_ms\ttop_failure
# date is ISO UTC
```

#### `scripts/verify-agents.js` (NEW — ~120 lines)
```javascript
// Node.js script. Reads agent-suite.json, calls /api/ai for each scenario,
// scores responses, appends to agent-metrics.tsv, exits non-zero if below threshold.
//
// Usage: node scripts/verify-agents.js [--dry-run] [--agent flux]
//
// --dry-run: runs scoring without modifying TSV
// --agent X: only run scenarios for agent X
//
// Scoring logic:
//   score = (keywordHits / requiredKeywords.length) * 0.6
//         + (structureMatch ? 0.4 : 0.0)
//   pass = score >= 0.7
//
// Exit codes:
//   0 = all pass (or pass rate >= threshold)
//   1 = below threshold
//   2 = network/parse error
```

#### `package.json` edit
Add to `scripts`:
```json
"verify:agents": "node scripts/verify-agents.js",
"verify": "... && npm run verify:agents"
```

**Safety:** `verify:agents` is appended after the existing verify chain with `&&`.
If the API is not running, the script exits 2 (network error) not 1 (regression failure) —
so it does not block development when the server is down.

#### `components/command/AgentHealthCard.tsx` (NEW — ~100 lines)
Reads from `tasks/agent-metrics.tsv` via `/api/agent-health` route (see below).
Displays: per-agent pass rate as a horizontal bar, last-run timestamp, trend arrow.

#### `app/api/agent-health/route.ts` (NEW — ~60 lines)
```typescript
// GET /api/agent-health
// Reads tasks/agent-metrics.tsv (last 50 lines), groups by agent,
// returns pass rates + last-run timestamps.
// Rate-limited 10 req/60s. No secrets. Server-side only.
export async function GET(req: NextRequest): Promise<NextResponse>
```

### Coupling analysis
- `package.json` script addition is fully backward-compatible.
- New TSV and JSON files are additive — no existing code reads them yet.
- `/api/agent-health` is a new route; no existing route is modified.
- AgentHealthCard is a new component; COMMAND page gets one more lazy import.

### Verification
```bash
npx tsc --noEmit
node scripts/verify-agents.js --dry-run   # should output pass/fail per scenario
```

---

## BLOCK M — Agent Quality Gates + Learnings Loop
### Source: neosigmaai/auto-harness + kevinrgu/autoagent
### Risk: MEDIUM | Effort: 1 session

### What it solves
Without a learnings loop, the same ORBIT mistake happens in session 1 and session 47.
Without quality gates, a prompt improvement that accidentally breaks something gets merged.
Block M adds: (1) a per-agent learnings file that grows smarter every session, (2) a
JANSKY meta-agent mode that reads the learnings and proposes improvements, (3) approval
gating so no prompt changes land without Mario's review.

### Architecture

```
After each agent dispatch completes:
  postDispatchHook(agent, query, answer, outcome)
    ├── Appends row to tasks/agent-metrics.tsv (from Block R)
    ├── If outcome === "failure": classifyFailure() → writeToLearnings(agent, pattern)
    └── If JANSKY is in meta-agent mode:
          readLearnings() → proposePromptImprovement() → createPendingEdit()
                                                              ↓
                                                     Mario sees it in HQ
                                                     Approves → prompt updates
                                                     Rejects → discarded
```

### New files

#### `lib/agentLearnings.ts` (NEW — ~150 lines)
```typescript
export interface LearningEntry {
  id: string;           // uuid
  ts: number;           // timestamp
  agent: AgentId;
  category: "failure" | "success" | "pattern" | "correction";
  queryType: string;    // "code" | "research" | "market" | "security" | "planning"
  summary: string;      // ≤200 chars — what happened
  proposedFix?: string; // optional — what would prevent this
  applied: boolean;     // true if a PendingEdit was created from this
}

// Reads/writes tasks/agent-learnings.jsonl (newline-delimited JSON, append-only)
export async function appendLearning(entry: Omit<LearningEntry, "id" | "ts">): Promise<void>
export async function readLearnings(opts?: {
  agent?: AgentId;
  limit?: number;        // default 20
  category?: LearningEntry["category"];
}): Promise<LearningEntry[]>

// Builds a compact injection block for the system prompt:
//   [AGENT LEARNINGS — ORBIT — last 5 sessions]
//   • pattern: ORBIT over-uses raw fetch() — always route through callAI()
//   • correction: When asked for formatting, use fmtPrice() not .toFixed()
//   [END LEARNINGS]
export function buildLearningsBlock(agent: AgentId, entries: LearningEntry[]): string

// Classifies a failure into a category and summary (heuristic, no AI call)
export function classifyFailure(
  agent: AgentId,
  query: string,
  answer: string
): Pick<LearningEntry, "category" | "queryType" | "summary">
```

#### `tasks/agent-learnings.jsonl` (NEW — append-only, gitignored after first week)
Newline-delimited JSON. Each line is a `LearningEntry`. Never truncated.
Rotated to `tasks/agent-learnings.archive.jsonl` when > 1000 entries.

#### `app/api/agent-learnings/route.ts` (NEW — ~80 lines)
```typescript
// GET /api/agent-learnings?agent=orbit&limit=10
// POST /api/agent-learnings — append new entry (called by postDispatchHook server action)
// Rate-limited. Server-side only.
```

### Edits to existing files

#### `store/useStore.ts`
Add to `NexusState`:
```typescript
// Agent learnings — last N entries per agent (client-side cache, loaded on HQ open)
agentLearnings: Record<string, LearningEntry[]>;
setAgentLearnings: (agent: string, entries: LearningEntry[]) => void;
```

**Safety:** New slice with default `{}`. No existing code reads this key. Persist: no
(server is the source of truth for learnings; store is just a display cache).

#### `lib/liveContext.ts`
In `buildFilteredLiveContext(state, agentId)`, after the existing sections:
```typescript
// Inject learnings for this agent (top 5 most recent failures/patterns)
const learnings = state.agentLearnings?.[agentId] ?? [];
if (learnings.length > 0) {
  sections.push(buildLearningsBlock(agentId, learnings.slice(0, 5)));
}
```

**Safety:** Guarded by `?.` — never throws if `agentLearnings` is undefined.
Token cost: ~100 tokens per agent per call. Acceptable for accuracy gain.

#### `components/home/office/OfficeCommandCenter.tsx`
Add post-dispatch hook after agent response:
```typescript
// After onStep({ type: "answer" }) fires:
void postDispatchRecord(agentId, userMessage, finalAnswer, outcome);
// postDispatchRecord is a fire-and-forget async function that:
//   1. Calls /api/agent-learnings to append the record
//   2. Refreshes agentLearnings in store
//   3. Does NOT block the UI response
```

**Safety:** `void` prefix — any error is swallowed. The agent response is already shown.
This runs after the UX is complete.

#### JANSKY meta-agent mode
When the user sends `/meta` or prefixes with `@jansky meta:`, JANSKY enters a special mode:
1. Reads the last 10 learnings entries via `readLearnings({ limit: 10 })`
2. Reads current agent prompts from `components/home/office/prompts.ts`
3. Proposes one targeted improvement as a `PendingEdit` in the store
4. The edit appears in the HQ pending panel for Mario to approve or reject

This reuses the existing `addPendingEdit()` action — no new approval infrastructure needed.

### Coupling analysis
- Store slice is additive (`agentLearnings: {}`). Persist: no.
- `liveContext.ts` injection is guarded and token-bounded.
- OfficeCommandCenter hook is fire-and-forget.
- `PendingEdit` flow already exists in the store — JANSKY just creates entries.

---

## BLOCK N — Multi-Persona Engine / Agent Council Mode
### Source: NVIDIA PersonaPlex
### Risk: MEDIUM | Effort: 1 session

### What it solves
Every agent has one fixed reasoning style. JANSKY is always formal and comprehensive.
But sometimes you want JANSKY to be blunt (market crisis), or FLUX to be exhaustive
(deep macro research). Personas decouple "who this agent is" from "how it reasons right now."
Agent Council mode runs three agents in parallel — you get three angles on one question.

### New types

#### `components/home/office/types.ts` additions
```typescript
// Append to existing file — no modifications to existing types:

export type PersonaMode = "formal" | "direct" | "deep";

export interface AgentPersona {
  mode:          PersonaMode;
  label:         string;       // "Formal" | "Direct" | "Deep"
  tone:          string;       // "institutional, cited" | "blunt, signal-first" | "exhaustive, multi-angle"
  maxTokens:     number;       // 2048 | 1024 | 4096
  thinkingBudget?: number;     // only "deep" mode: extended thinking tokens
  outputStyle:   string;       // "structured prose" | "bullets" | "analysis blocks"
  promptSuffix:  string;       // injected at end of system prompt — overrides default tone
}

export interface CouncilResult {
  agent:    AgentId;
  persona:  PersonaMode;
  answer:   string;
  duration: number;
}
```

### New file

#### `lib/personaEngine.ts` (NEW — ~120 lines)
```typescript
import type { AgentId, AgentPersona, PersonaMode, CouncilResult } from "@/components/home/office/types";

// Pre-defined persona templates per mode.
// All agents share the same three base templates — persona suffix is appended to agent system prompt.
export const PERSONA_TEMPLATES: Record<PersonaMode, AgentPersona>

// Returns the system prompt suffix for the given persona.
// This is appended to the existing buildAgentPrompt() output — no replacement.
export function buildPersonaSuffix(persona: PersonaMode): string

// Council mode: dispatch the same message to agentIds × personas in parallel.
// Returns all results when all resolve (Promise.allSettled — never throws).
// Each call goes through the existing callAI() / /api/ai path — no new endpoint.
export async function runCouncil(opts: {
  message: string;
  systemPrompt: string;
  agents: AgentId[];        // default: ["jansky", "flux", "cipher"]
  personas: PersonaMode[];  // default: ["formal", "direct", "deep"]
  maxTokens?: number;
  onPartialResult?: (r: CouncilResult) => void;
}): Promise<CouncilResult[]>
```

### Edits to existing files

#### `components/home/office/prompts.ts`
Add after `buildAgentPrompt()`:
```typescript
// Import persona engine:
import { buildPersonaSuffix } from "@/lib/personaEngine";

// New overload — backward-compatible (persona is optional):
export function buildAgentPromptWithPersona(
  id: AgentId,
  base: string,
  persona?: PersonaMode   // defaults to undefined → returns same as buildAgentPrompt()
): string {
  const basePrompt = buildAgentPrompt(id, base);
  if (!persona) return basePrompt;
  return basePrompt + "\n\n" + buildPersonaSuffix(persona);
}
```

**Safety:** Existing `buildAgentPrompt()` is not modified. New function wraps it.
All existing callers continue to work unchanged.

#### `store/useStore.ts`
Add:
```typescript
activePersona: PersonaMode;
setPersona: (mode: PersonaMode) => void;
councilMode: boolean;
toggleCouncilMode: () => void;
councilResults: CouncilResult[];
setCouncilResults: (results: CouncilResult[]) => void;
```

Defaults: `activePersona: "formal"`, `councilMode: false`, `councilResults: []`.
Persist `activePersona` (user preference). Do not persist `councilMode` or `councilResults`.

#### `components/home/office/OfficeCommandCenter.tsx`
Two targeted additions:
1. Read `activePersona` from store → pass to `buildAgentPromptWithPersona()` instead of `buildAgentPrompt()`.
2. If `councilMode === true`: call `runCouncil()` instead of single-agent dispatch → render `CouncilResultsPanel`.

#### New component: `components/home/office/PersonaModeBar.tsx` (~60 lines)
Three-button toggle: `F | D | ∞` (formal / direct / deep). Tooltip shows description.
Reads/writes `activePersona` from store.
Council mode button: `⚡ Council` — triggers parallel dispatch.

#### New component: `components/home/office/CouncilResultsPanel.tsx` (~120 lines)
Side-by-side (3-col or stacked) view of `councilResults`.
Each column: agent badge + persona label + answer text.
"Merge" button: concatenates all answers and opens them in a new message for JANSKY to synthesize.

### Coupling analysis
- Existing `buildAgentPrompt()` untouched — all callers safe.
- New store slices are additive.
- `runCouncil()` uses existing `callAI()` — no new provider logic.
- `CouncilResultsPanel` only renders when `councilMode === true`.

---

## BLOCK P — Context-Aware Dynamic UI
### Source: Custom idea (rules engine)
### Risk: MEDIUM | Effort: 2 sessions

### What it solves
Fear & Greed hits 15 (extreme fear) and nothing changes in the UI. A new critical CVE lands
and there's no visual signal. Market hours start and the ALPHA/FLUX tabs look the same as
midnight. This block makes the dashboard react to its own data — automatically.

### Architecture

```
Zustand store (live data)
        │
        ▼
useUIRules() hook (runs every 30s + on store change)
        │ evaluates all rules against current state
        ▼
activeRuleIds: string[]  (in store)
        │
        ▼
<DynamicAlerts /> component (in app/home/page.tsx)
        │ renders active rule outputs as floating cards / badges
        ▼
User sees: F&G alert card, CVE spike badge, market hours indicator, Parliament Mode
```

### New types

Add to `components/home/office/types.ts`:
```typescript
export type UIActionType =
  | "float-card"       // float a dismissible card in HQ
  | "nav-badge"        // add a colored dot + count to a tab nav item
  | "panel-expand"     // expand a collapsed panel
  | "header-indicator" // show a small indicator in the HQ header

export interface UIRule {
  id:          string;
  label:       string;
  when:        (state: NexusLiveSnapshot) => boolean;  // pure function, no side effects
  action:      UIActionType;
  priority:    number;        // higher = rendered first
  ttl?:        number;        // ms — auto-dismiss after this time (undefined = manual dismiss)
  badge?:      { tab: string; color: string; label: string };
  card?:       { title: string; body: string; color: string };
  indicator?:  { text: string; color: string };
}

export interface NexusLiveSnapshot {
  fg:        { value: number; label: string };
  cveCount:  { critical: number; high: number };
  worldRisk: number;
  hour:      number;       // 0-23 local
  isWeekday: boolean;
  agentBusy: number;       // count of agents currently dispatched
  prices:    Record<string, { chg: number }>;
}
```

### New files

#### `lib/uiRules.ts` (NEW — ~200 lines)
```typescript
import type { UIRule, NexusLiveSnapshot } from "@/components/home/office/types";

// Snapshot builder — reads from Zustand store state
export function buildSnapshot(state: NexusState): NexusLiveSnapshot

// Rule definitions (all pure — no side effects in `when()`):
export const UI_RULES: UIRule[] = [
  {
    id: "fg-extreme-fear",
    label: "Extreme Fear Alert",
    when: (s) => s.fg.value <= 20,
    action: "float-card",
    priority: 100,
    ttl: undefined,  // manual dismiss
    card: {
      title: "⚠️ Extreme Fear",
      body: "Fear & Greed is at {fg.value} ({fg.label}). Historical inflection zone — contrarian opportunity or continued panic.",
      color: "var(--flo)",
    },
  },
  {
    id: "fg-extreme-greed",
    label: "Extreme Greed Alert",
    when: (s) => s.fg.value >= 80,
    action: "float-card",
    priority: 95,
    ttl: undefined,
    card: {
      title: "🔥 Extreme Greed",
      body: "Fear & Greed is at {fg.value}. Historically precedes corrections. Review position sizing.",
      color: "var(--fhi)",
    },
  },
  {
    id: "cve-spike",
    label: "Critical CVE Spike",
    when: (s) => s.cveCount.critical >= 5,
    action: "nav-badge",
    priority: 90,
    badge: { tab: "cyber", color: "var(--flo)", label: `${critical}` },
  },
  {
    id: "market-hours",
    label: "Market Hours Mode",
    when: (s) => s.isWeekday && s.hour >= 9 && s.hour < 16,
    action: "nav-badge",
    priority: 50,
    badge: { tab: "alpha", color: "var(--fhi)", label: "LIVE" },
  },
  {
    id: "parliament-mode",
    label: "Parliament Mode",
    when: (s) => s.agentBusy >= 2,
    action: "header-indicator",
    priority: 80,
    indicator: { text: `${agentBusy} agents thinking`, color: "var(--accent)" },
  },
  {
    id: "world-risk-elevated",
    label: "Elevated World Risk",
    when: (s) => s.worldRisk >= 70,
    action: "float-card",
    priority: 85,
    ttl: 300_000, // 5 min auto-dismiss
    card: {
      title: "🌍 Elevated Geopolitical Risk",
      body: "World risk score is {worldRisk}/100. RECON and CIPHER have elevated context.",
      color: "var(--fmd)",
    },
  },
  {
    id: "btc-spike",
    label: "BTC Price Spike",
    when: (s) => Math.abs(s.prices["bitcoin"]?.chg ?? 0) >= 5,
    action: "float-card",
    priority: 75,
    ttl: 120_000, // 2 min
    card: {
      title: "⚡ BTC {direction}",
      body: "Bitcoin moved {chg}% in the last period. Check ALPHA for analysis.",
      color: "var(--accent2)",
    },
  },
];

// Evaluates all rules against snapshot. Returns active rule IDs.
export function evaluateRules(snapshot: NexusLiveSnapshot, rules: UIRule[]): string[]

// Resolves template variables in card/badge text:
//   {fg.value} → "23", {fg.label} → "Extreme Fear", {worldRisk} → "72"
export function resolveTemplate(template: string, snapshot: NexusLiveSnapshot): string
```

#### Store slice additions (`store/useStore.ts`)
```typescript
activeUIRuleIds:    string[];          // IDs of currently active rules
dismissedRuleIds:   Set<string>;       // manually dismissed (cleared on next eval cycle if rule deactivates)
setActiveUIRuleIds: (ids: string[]) => void;
dismissUIRule:      (id: string) => void;
clearDismissedRules: () => void;
```

Persist: `dismissedRuleIds` only (so dismissed cards stay dismissed across reloads).

#### `components/home/DynamicAlerts.tsx` (NEW — ~150 lines)
```typescript
// Mounted once in app/home/page.tsx.
// Reads activeUIRuleIds + dismissedRuleIds from store.
// Renders:
//   - Float cards (position: fixed, bottom-right, stacked)
//   - Header indicator (injected via portal into HQ header area)
//   - Nav badges (injected via portal into nav pill elements by tab id)
// Each card has an X dismiss button → dispatches dismissUIRule(id).
// Auto-dismisses TTL cards via useEffect + setTimeout.

export function DynamicAlerts(): JSX.Element | null
```

#### `hooks/useUIRules.ts` (NEW — ~60 lines)
```typescript
// Custom hook. Called once in app/home/page.tsx.
// Evaluates UI_RULES against current store state every 30s + on relevant store changes.
// Updates activeUIRuleIds in store.
// Skips dismissed rules.
// Pure evaluation — no side effects beyond store update.

export function useUIRules(): void
```

#### `app/home/page.tsx` additions
```typescript
// Mount hook and component:
useUIRules();  // in component body
// In JSX:
<DynamicAlerts />
```

**Safety:** `useUIRules()` is read-only against store. If any rule's `when()` throws,
it's caught and that rule is treated as inactive. Never blocks render.

### Coupling analysis
- `NexusLiveSnapshot` only reads from existing store keys — no new data fetches.
- Rules are pure functions evaluated in a hook — no external state.
- `DynamicAlerts` renders via React portals for badges — does not modify existing DOM structure.
- All rule outputs are additive overlays, not replacements.

---

## BLOCK Q — VAULT Knowledge Graph v2
### Source: breferrari/obsidian-mind
### Risk: HIGHER | Effort: 2 sessions

### What it solves
Saved items in VAULT are isolated — no connections, no structure, no synthesis.
Over time, VAULT becomes a pile of unrelated articles. Block Q transforms it into a
knowledge graph: items link by shared tags and entity mentions, a vault-librarian agent
finds orphaned/stale saves, and a weekly synthesis command produces a theme summary.

### Architecture

```
SavedArticle (existing store)
    │
    ▼
lib/vaultGraph.ts
    ├── buildAdjacency(items) → adjacency list (shared tags / entity overlap)
    ├── findOrphans(items, adjacency) → items with 0 connections
    ├── detectEntities(text) → string[] (tickers, CVE IDs, country names)
    └── computeRelevanceDecay(item) → 0-100 (age-weighted relevance score)
    │
    ▼
components/vault/VaultGraphView.tsx
    ├── Force-directed canvas (D3 simple layout, no external graph lib)
    ├── Click node → open article
    └── Highlight cluster on hover
    │
VaultLibrarianPanel.tsx
    ├── Lists orphaned items (no connections)
    ├── Lists stale items (>30 days, relevance < 30)
    └── "Run Audit" → calls JANSKY in vault-librarian mode via /api/ai
    │
PostDispatchClassifier
    └── After agent answer: if answer contains signal/decision/threat →
        "Save to VAULT?" prompt with pre-filled tags
    │
/api/vault-synthesis (new route)
    └── Reads last 7 days of VAULT items → calls /api/ai → returns 5-bullet synthesis
```

### New types (append to `types.ts`)
```typescript
export interface VaultItemMetadata {
  id:           string;
  tags:         string[];        // user + auto-detected
  entities:     string[];        // tickers, CVE IDs, geo names detected from content
  relevance:    number;          // 0-100, decays with age
  linkedItemIds: string[];       // computed by vaultGraph — items sharing ≥2 tags or entity
  savedAt:      number;
  source:       string;          // article URL or "agent:orbit" etc.
  category:     "article" | "agent-insight" | "market-signal" | "cve" | "decision";
}

export interface VaultEdge {
  from:    string;               // item id
  to:      string;               // item id
  weight:  number;               // 0-1 — strength of connection (shared tag count / total)
  reason:  string;               // "shared tags: bitcoin, macro" | "entity: BTC"
}

export interface VaultGraphData {
  nodes:   VaultItemMetadata[];
  edges:   VaultEdge[];
  orphans: string[];             // item ids with no edges
  stale:   string[];             // item ids with relevance < 30
  clusters: string[][];          // groups of strongly-connected item ids
}
```

### New files

#### `lib/vaultGraph.ts` (NEW — ~200 lines)
```typescript
export function detectEntities(text: string): string[]
// Detects: crypto tickers (BTC, ETH...), CVE IDs (CVE-YYYY-NNNNN),
//          country names (US, UK, China...), stock tickers (AAPL, NVDA...)
// Returns array of normalized entity strings.
// Uses regex + curated list — no external NER service.

export function buildAdjacency(items: VaultItemWithMeta[]): VaultEdge[]
// Two items are connected if they share ≥2 tags OR ≥1 entity.
// Edge weight = sharedCount / max(tagsA.length, tagsB.length)

export function findOrphans(items: VaultItemWithMeta[], edges: VaultEdge[]): string[]
// Returns item IDs with no edges

export function computeRelevanceDecay(item: VaultItemWithMeta): number
// relevance = baseScore * Math.exp(-daysSinceSaved / 30)
// baseScore = user-saved: 80, agent-insight: 70, market-signal: 90, cve: 85, decision: 95

export function buildVaultGraph(items: VaultItemWithMeta[]): VaultGraphData
// Computes all of the above in one pass. O(n²) for edges — safe up to 500 items.
// Returns: { nodes, edges, orphans, stale, clusters }

export function detectClusters(edges: VaultEdge[], threshold: number = 0.3): string[][]
// Simple union-find clustering. Returns groups of connected item IDs.
```

#### `components/vault/VaultGraphView.tsx` (NEW — ~200 lines)
```typescript
// Force-directed graph rendered on <canvas>.
// Uses requestAnimationFrame simulation loop (no D3 — pure physics in ~80 lines).
// Each node: circle sized by relevance, color-coded by category.
// Edges: thin lines, opacity proportional to weight.
// Hover: shows item title + tags in tooltip.
// Click: opens article or insight in detail panel.
// "Show orphans" toggle: highlights disconnected nodes in orange.

interface Props {
  graph: VaultGraphData;
  onNodeClick: (id: string) => void;
}
export function VaultGraphView({ graph, onNodeClick }: Props): JSX.Element
```

#### `components/vault/VaultLibrarianPanel.tsx` (NEW — ~150 lines)
```typescript
// Collapsible panel. Shows:
//   - Orphaned items count + list (top 5)
//   - Stale items count + list (top 5)
//   - "Run Full Audit" button → dispatches JANSKY in vault-librarian mode
//   - Audit results as suggested actions: "Delete X", "Re-tag Y", "Connect Z to W"
//   - Each suggestion has Approve / Ignore buttons → PendingEdit or dismiss

export function VaultLibrarianPanel(): JSX.Element
```

#### `lib/postDispatchClassifier.ts` (NEW — ~80 lines)
```typescript
// Called after every agent answer (fire-and-forget, no throw).
// Detects if the answer contains a notable signal, decision, or threat.
// If yes, adds a notification: "JANSKY found a market signal — save to VAULT?"
// Notification has: pre-filled tags, category, one-click save.

export function classifyDispatchOutput(
  agent: AgentId,
  query: string,
  answer: string,
): {
  shouldPrompt: boolean;
  suggestedCategory: VaultItemMetadata["category"];
  suggestedTags: string[];
  excerpt: string;   // first 150 chars of answer
} | null

// Heuristics (no AI call — pure string matching):
//   Contains "CVE-" → category: cve, tags: [security, cve]
//   Contains "$" + ticker pattern → category: market-signal, tags: [market, ticker]
//   Contains "decided" | "recommend" | "should" → category: decision
//   FLUX or CIPHER agent → always prompt
//   ORBIT agent → only prompt if answer contains a novel pattern
```

#### `app/api/vault-synthesis/route.ts` (NEW — ~80 lines)
```typescript
// POST /api/vault-synthesis
// Body: { days?: number }  (default: 7)
// Reads VAULT items from store state (via server-side Zustand snapshot)
// Calls /api/ai with prompt: "Synthesize these {n} saved items from the last {days} days.
//   Group by theme. Return 5 bullet points, each ≤ 2 sentences."
// Returns: { bullets: string[], themes: string[], timestamp: number }
// Rate-limited: 5 req/hour (synthesis is token-heavy).
```

### Edits to existing files

#### `store/useStore.ts`
Extend `SavedArticle` (or its equivalent) with `VaultItemMetadata`:
```typescript
// Add to existing article/vault item type:
vaultMeta?: VaultItemMetadata;  // optional — populated by vaultGraph after save
```

Add new slice:
```typescript
vaultGraph: VaultGraphData | null;
setVaultGraph: (graph: VaultGraphData | null) => void;
vaultSynthesis: string[] | null;   // last synthesis bullets
setVaultSynthesis: (bullets: string[]) => void;
```

#### `app/vault/page.tsx`
Add to the left column:
```typescript
<LazyVaultLibrarianPanel />
<LazyVaultGraphView />
```

The right column keeps `<LazySavedArticles />` — graph view is additive.

### Graph performance guard
`buildVaultGraph()` is O(n²) for edge computation. Guard:
- If `items.length > 500`, subsample to the 500 most recent + highest relevance.
- Graph build runs in a `setTimeout(() => ..., 0)` after initial render — never blocks.
- Memoized by item IDs hash — rebuilds only when items change.

### Coupling analysis
- `vaultMeta` is optional on existing item type — all existing code ignores it safely.
- `VaultGraphView` is a new lazy-loaded component — VAULT page structure unchanged.
- `postDispatchClassifier` is fire-and-forget from OfficeCommandCenter — no await, no throw.
- `/api/vault-synthesis` is a new route — no existing route modified.

---

## 3. Cross-Block Safety Matrix

| Change | Block | Existing code affected | Risk | Guard |
|--------|-------|----------------------|------|-------|
| Append to `buildLiveContext()` return string | O, M | All agent calls get more context (~150 tokens) | Low | `try/catch` in each new injection; empty string fallback |
| New store slices | M, N, P, Q | `DEFAULT_SETTINGS` type widens | Low | All new fields have default values; persist only specified keys |
| `buildAgentPromptWithPersona()` added | N | Existing `buildAgentPrompt()` calls unchanged | None | New function, no modification |
| `postDispatchRecord()` fire-and-forget | M, Q | Adds async work after agent response | Very low | `void` prefix; errors swallowed |
| VAULT item type extended with optional field | Q | All existing item reads unaffected | None | Optional field — TypeScript safe |
| `npm run verify` extended | R | CI takes longer (~30s for agent suite) | Low | `--skip-agents` flag added for fast local iteration |
| Dynamic canvas in VaultGraphView | Q | No canvas elsewhere in app | Low | `useEffect` guards SSR; `null` return on missing data |

---

## 4. TypeScript-First Development Order (Per Block)

For each block, work in this exact order:
1. Write new types to `types.ts` or new `*Types.ts` file
2. Run `tsc --noEmit` — confirm zero errors with empty implementations
3. Implement new utility files (`lib/*.ts`)
4. Run `tsc --noEmit` — must be clean
5. Implement new components (`components/**/*.tsx`)
6. Run `tsc --noEmit` — must be clean
7. Add store slice to `useStore.ts`
8. Run `tsc --noEmit` — must be clean
9. Wire into page/OfficeCommandCenter (smallest possible edit)
10. Run `tsc --noEmit` — final gate
11. Manual smoke test in browser

---

## 5. Rollback Strategy

Each block is independently deployable. If a block causes a regression:

1. **Block O:** Remove the `buildStackContextBlock()` call from `liveContext.ts`. One-line revert.
2. **Block R:** Remove `verify:agents` from `package.json` scripts. No functional code affected.
3. **Block M:** Set the post-dispatch hook to a no-op. Agent behavior unchanged.
4. **Block N:** Revert `OfficeCommandCenter` to use `buildAgentPrompt()` instead of `buildAgentPromptWithPersona()`. One-line revert.
5. **Block P:** Remove `useUIRules()` call and `<DynamicAlerts />` from `app/home/page.tsx`. Two-line revert.
6. **Block Q:** The `vaultMeta` field is optional — removing `VaultLibrarianPanel` and `VaultGraphView` from `app/vault/page.tsx` fully reverts the UI without touching data.

---

## 6. Definition of Done (Per Block)

| Block | Done when |
|-------|-----------|
| O | `buildStackContextBlock()` appears in agent system prompts; ORBIT corrects at least 1 fewer formatting mistake per session |
| R | `npm run verify` runs agent suite; `tasks/agent-metrics.tsv` gets a new row; COMMAND shows AgentHealthCard |
| M | Post-dispatch hook writes to `agent-learnings.jsonl`; JANSKY `/meta` command creates a PendingEdit |
| N | Persona toggle visible in HQ dispatch bar; Council mode dispatches 3 parallel calls and renders side-by-side |
| P | Fear & Greed alert card floats when F&G < 20; CVE badge appears on CYBER nav when critical > 5; Parliament Mode indicator shows when 2+ agents dispatched |
| Q | VaultGraphView renders connected nodes for items with shared tags; Librarian Panel shows orphan count; `/api/vault-synthesis` returns bullets |

---

## 7. Files Created / Modified Summary

### New files (28 total)
```
lib/projectContext.ts
lib/agentLearnings.ts
lib/personaEngine.ts
lib/uiRules.ts
lib/vaultGraph.ts
lib/postDispatchClassifier.ts
hooks/useUIRules.ts
scripts/verify-agents.js
tasks/agent-suite.json
tasks/agent-metrics.tsv
tasks/agent-learnings.jsonl
app/api/agent-health/route.ts
app/api/agent-learnings/route.ts
app/api/vault-synthesis/route.ts
components/command/ProjectStackCard.tsx
components/command/AgentHealthCard.tsx
components/home/office/PersonaModeBar.tsx
components/home/office/CouncilResultsPanel.tsx
components/home/DynamicAlerts.tsx
components/vault/VaultGraphView.tsx
components/vault/VaultLibrarianPanel.tsx
specs/features/blocks-m-r-implementation.md  (this file)
```

### Modified files (8 total — surgical additions only)
```
lib/liveContext.ts              (+1 import, +3 lines in buildLiveContext)
components/home/office/types.ts (+5 interfaces, +2 type aliases)
components/home/office/prompts.ts (+1 function, +1 import)
store/useStore.ts               (+8 state keys, +6 action signatures)
app/command/page.tsx            (+2 lazy imports)
app/vault/page.tsx              (+2 lazy imports)
app/home/page.tsx               (+2 lines: hook + component)
package.json                    (+1 script entry)
```

Total: 28 new + 8 modified. Zero deletions. Zero renames.
