# NEXUS PRIME — Vision Gap Analysis & Roadmap
_Updated: 2026-03-22_

> **Status: historical snapshot.** This captures the repository as assessed on 2026-03-22 and is not the current queue or architecture reference. Use `tasks/todo.md`, `docs/SYSTEM_STATE.md`, and `docs/architecture.md` for current state; keep the snapshot body below intact for historical context.

---

## What Already Exists (solid foundation)

| Area | Status | Notes |
|------|--------|-------|
| Next.js 14 App Router, 14 routes | ✅ Complete | home, command, signals, alpha, intel, ops, security, cyber, iot, vehicle, skills, vault, settings |
| ReAct agent loop (lib/agent.ts) | ✅ Complete | Claude + Ollama, auto-fallback, tool-use, 429 handling |
| File editing tools | ✅ Complete | read/list/patch/create project files |
| Auto-learning (autoLearn) | ✅ Complete | Extracts facts from conversations → IndexedDB |
| Memory system (memoryStore) | ✅ Complete | remember/recall, IndexedDB, auto-inject into prompts |
| 20+ API routes | ✅ Complete | news, prices, CVEs, conflict, earthquakes, flights, fires, etc. |
| IoT / MQTT | ✅ Partial | UI components + MQTT route — not wired to real devices yet |
| Vehicle / drone / camera | ✅ Partial | UI stubs — not wired to hardware yet |
| Skills page | ✅ Partial | SkillLibrary, KnowledgeGraph, etc. — not connected to agent routing |
| Zustand store | ✅ Complete | Full state, persisted settings, notifications, activity log |
| CommandBar | ✅ Complete | Floating dock, live step display, conversation history |
| AgentOffice | ✅ Complete | 5 pixel-art agents, emotion states, openclaw design applied |
| ask_max tool | ✅ Complete | Delegates to external OpenClaw agent at 127.0.0.1:18789 |
| Pending drafts (draft mode) | ✅ Complete | Ollama queues drafts for Claude to finalize |
| ActivityTimeline, NotificationCenter | ✅ UI ready | Components exist but not deeply wired |

---

## Vision → Gap Map (priority ordered)

### P1 — Visible Operational States (biggest delta from vision)
**Vision**: The UI shows the AI thinking — "interpreting", "planning", "executing", "validating", "responding".
**Current**: agent.ts emits `onStep` with types `thinking | tool_call | tool_result | answer`. AgentOffice/CommandBar render these but there's no structured **phase model** with named operational states visible to the user.
**Gap**: Need a `OperationalPhase` type and a visible phase strip in the command center showing the current phase with timestamp + confidence.

### P2 — Safe Edit Workflow UI (diff/preview/confirm gates)
**Vision**: Before any project edit, show a diff preview, explain why, estimate risk, ask confirmation, support rollback.
**Current**: `patch_project_file` applies immediately with no preview or confirmation in the UI. The agent just does it.
**Gap**: Need a `ProposedEdit` panel that intercepts patch calls, renders a side-by-side diff, has Approve/Reject buttons, and logs applied changes with rollback support.

### P3 — Task Decomposition Panel (visible workflow layer)
**Vision**: Each request decomposes into visible objectives → subtasks → skill invocations → validation steps.
**Current**: Only `onStep` stream exists. No persistent task plan is shown.
**Gap**: Need a `TaskPlan` component that shows the decomposed steps before/during execution, with status (pending/running/done/failed) per step.

### P4 — Agent State Upgrade (richer status per agent)
**Vision**: Per-agent: queue depth, current task, confidence %, skill being invoked, session history.
**Current**: AgentOffice shows emotion + walking animation. No queue or confidence display.
**Gap**: Add `agentTasks` to store, render a small status column per agent showing active task + confidence ring.

### P5 — Browser/Tab Content Reading
**Vision**: System can read the current open browser tab and use it as context — summarize, extract, transform.
**Current**: `fetch_url` tool can read URLs. The Claude in Chrome MCP IS available in this session.
**Gap**: Wire the Claude in Chrome MCP as an agent tool so agents can call `read_current_tab` and get the visible page content.

### P6 — Audit Log & Change History
**Vision**: Every applied change is logged, visible, reversible.
**Current**: `activityLog` in store has log entries but no change history specifically for project edits.
**Gap**: Add a `changeLog` array in store, persist it, render in a dedicated Audit panel.

### P7 — Skill Routing Visibility
**Vision**: Agent visibly routes to skills; user can see which skill is being invoked and why.
**Current**: `lib/skillEngine.ts` exists but is not visibly connected to the agent routing in the UI.
**Gap**: When an agent invokes a skill, emit a `skill_invoked` step type with skill name + reason, render it distinctly in the step display.

### P8 — Physical Device Real Wiring
**Vision**: IoT sensors, cameras, drones are real live data sources.
**Current**: MQTT API route exists, UI stubs exist. Not connected to actual hardware.
**Gap**: Deferred — requires actual hardware. Design wiring layer when hardware is available.

---

## Build Order (what to build next)

```
PHASE A — Make the AI feel operational (P1 + P3)
  1. Add OperationalPhase system to agent loop
  2. Add visible phase strip to AgentOffice / command center header
  3. Add TaskPlan component — decompose requests into visible steps

PHASE B — Safe editing (P2 + P6)
  4. ProposedEdit panel with diff viewer + Approve/Reject
  5. Change log in store + Audit panel

PHASE C — Richer agent state (P4 + P7)
  6. Per-agent task queue + confidence display
  7. Skill invocation step type + routing visibility

PHASE D — Browser awareness (P5)
  8. read_current_tab agent tool via Claude in Chrome MCP

PHASE E — Hardware (P8)
  9. Real IoT / camera / drone wiring (deferred until hardware ready)
```

---

## Architectural decisions

- All new state goes into `useStore.ts` — no new stores
- All new agent step types go into `AgentStep` union in `lib/agent.ts`
- All new UI panels go into existing tab pages — no new routes needed for P1-P7
- ProposedEdit panel lives in a persistent overlay (like CommandBar), not inside any tab
- OperationalPhase is emitted by the agent loop and consumed by AgentOffice + CommandBar

---

## Files to touch (Phase A)

| File | Change |
|------|--------|
| `lib/agent.ts` | Add `phase` field to `AgentStep`, emit phase transitions |
| `store/useStore.ts` | Add `currentPhase`, `taskPlan` state |
| `components/home/AgentOffice.tsx` | Add phase strip below zone header |
| `components/ui/CommandBar.tsx` | Show phase label in step stream |
| `components/ui/TaskPlanPanel.tsx` | NEW — decomposed task view |
