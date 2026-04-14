# Nexus Prime — Switch Operator + 24/7 Resilience Plan

**Date:** April 2026
**Scope:** Autonomous provider switching, 24/7 operational hardening, and the Switch Operator meta-agent that manages repo assimilation and self-directed implementation.

---

## The Core Problem (What This Plan Solves)

Nexus has 10 providers in its chain but a fragile execution path. Before this plan, a single provider failure surfaced as a user-visible error. Free keys were blocked by a policy gate that only allowed Ollama. A cold-start with no local Ollama meant zero AI responses. There was no health monitoring, no circuit isolation, no operator that knew the system's state.

This plan fixes that at three levels: the route layer (already done), the operator layer (new), and the UI layer (planned).

---

## Status: What Is Already Done

| Fix | File | Status |
|-----|------|--------|
| `FREE_DEFAULT_PROVIDERS` now includes Groq, Cerebras, NVIDIA, SambaNova | `app/api/ai/route.ts` | ✅ Done |
| Circuit breaker: 5-min cooldown per failed provider | `app/api/ai/route.ts` | ✅ Done |
| Trip circuit on both `!r.ok` and thrown `fetch` errors | `app/api/ai/route.ts` | ✅ Done |
| `X-Provider` + `X-Model` + `X-Circuits-Open` response headers | `app/api/ai/route.ts` | ✅ Done |
| Cerebras, NVIDIA NIM, SambaNova added to provider chain | `app/api/ai/route.ts` | ✅ Done |
| `.env.example` updated with all free provider keys | `.env.example` | ✅ Done |

---

## Block O — Switch Operator (Core New Agent)

### What It Is

A new meta-agent mode for JANSKY. When invoked, JANSKY enters "Operator mode" — it reads system state, assesses which providers are healthy, reads the current task backlog, selects the right agent and provider, and dispatches without requiring the user to configure anything. It runs its own loop, switching providers as needed, and reports what it did.

This is not a new agent. It is a mode JANSKY enters when triggered by specific intents or when the scheduler fires it.

### Trigger Intents

- "Run operator mode"
- "Auto-run the backlog"
- "Switch to best available provider"
- "Analyze and implement [repo]"
- Scheduler: daily at a configured time

### The Operator Loop (What JANSKY Does in This Mode)

```
1. Read provider health  → call /api/health/providers (see Block P)
2. Select optimal provider → highest priority provider where circuit is closed + key is set
3. Read task backlog     → GET /api/project?section=todo — parse ## Next Up items
4. Select next task      → first unblocked item in Next Up
5. Detect task type      → code? ORBIT. research? NOVA. security? CIPHER. market? FLUX.
6. Dispatch              → buildAgentPrompt(target, system) + inject lessons + send
7. Record artifact       → write AgentRunArtifact to store
8. Report               → brief summary card in HQ chat: task done, provider used, time taken
9. Loop or stop         → if more tasks and still within session time budget, continue; else stop
```

### Repo Assimilation Sub-Mode

When the user drops a GitHub URL in HQ chat or the Operator detects a new repo URL in the backlog, JANSKY runs the repo assimilation workflow:

```
1. Parse the GitHub URL  → extract owner/repo
2. Call /api/repo-intel  → fetch README, topics, tech stack, file tree (Block B)
3. Compress to prompt    → GitReverse pattern: "essence prompt" for the repo
4. Reason about fit      → does it map to an existing Nexus surface?
5. Write plan entry      → append a block to docs/ideas/assimilation-YYYY-MM.md
6. Optional: implement   → if intent is "implement not just plan", hand off to ORBIT
```

The repo assimilation sub-mode is the mechanism behind Block B (RECON Repo Intel) but driven autonomously by the Operator rather than requiring the user to navigate to the RECON tab.

### Files to Build

| File | What it does |
|------|-------------|
| `lib/switchOperator.ts` | `runOperatorLoop(settings, store)` — steps 1–9 above; reads health, reads backlog, dispatches, records |
| `lib/repoAssimilator.ts` | `assimilateRepo(url, store)` — GitReverse + fit reasoning + plan write |
| `components/home/office/prompts.ts` | Add `buildOperatorPrompt(taskText, providerStatus, lessonTree)` to JANSKY mode |
| `OfficeCommandCenter.tsx` | Detect operator intent → call `runOperatorLoop`; show Operator mode badge |
| `components/home/office/OperatorStatusCard.tsx` | New widget: shows current operator run — provider used, task, elapsed, loop count |

---

## Block P — 24/7 Provider Resilience

### P1 — Provider Health Endpoint

New route: `GET /api/health/providers`

Returns the live state of every provider in the chain. Checks: is the key set? Is the circuit open? What was the last failure time? Does NOT make a live test call on every request (too slow and wasteful) — it reads the in-memory `_circuitOpenAt` map from the AI route.

```typescript
// Response shape
{
  providers: [
    {
      name: "ollama",
      status: "up" | "circuit-open" | "no-key",
      circuitOpenSince?: number,   // ms timestamp
      cooldownRemainingMs?: number,
      model: string,
      free: boolean,
    }
  ],
  chainOrder: string[],    // AUTO_CHAIN filtered by policy
  activeProvider: string,  // first provider where status === "up"
  timestamp: number,
}
```

The UI reads this on mount and on every response header (`X-Provider`, `X-Circuits-Open`) to stay current without polling.

**File:** `app/api/health/providers/route.ts`

### P2 — Provider Status Strip (COMMAND tab)

A compact status row at the top of COMMAND tab. One dot per provider in the chain, colored:

- Green dot — key set, circuit closed, last call succeeded
- Amber dot — no key set (skipped but not dead)
- Red dot — circuit open (failed in last 5 min), shows cooldown countdown
- Grey dot — Ollama (local), shows "local" label, green if reachable

Clicking any dot opens a tooltip: provider name, model, free/paid label, last error time if any.

This gives the user a live system health view at a glance without navigating to Settings.

**File:** `components/command/ProviderHealthStrip.tsx`

### P3 — Smooth Failover (No User-Visible Errors)

Current behavior: if ALL providers fail, the user sees `"All AI providers unavailable."` — a hard stop.

New behavior:

1. If all providers fail: show a friendly status message in HQ chat — "I couldn't reach any AI provider right now. Ollama is offline and all free cloud keys are either unset or in cooldown. You can set a free Groq key in Settings → AI Keys."
2. If Ollama is the only provider and it's offline: show a one-time nudge — "Your local AI is offline. Add a free Groq key (groq.com/keys) to stay online without Ollama."
3. Retry queue: if a request fails and a provider's circuit resets within the session, auto-retry the last message silently (one retry, not a loop).
4. Streaming timeout: if a streaming response stalls for more than 30s with no tokens, abort and try the next provider in chain.

**Files:** `OfficeCommandCenter.tsx` (failover message logic), `app/api/ai/route.ts` (streaming timeout using `AbortController`).

### P4 — Offline-First Mode

When Nexus detects no cloud keys are set and Ollama is unreachable, it enters "Offline mode":

- HQ shows a banner: "Running offline — AI features unavailable. Add a free key or start Ollama."
- All other tabs still work (prices, news, CVEs, maps — none of those need AI).
- Once a provider comes back online, the banner clears on next health check.

Detection: on app mount, fire one `GET /api/health/providers`. If `activeProvider` is null, set `offlineMode: true` in the store.

**Files:** `store/useStore.ts` (add `offlineMode` boolean), `app/layout.tsx` (health check on mount), `components/ui/OfflineBanner.tsx` (new).

### P5 — Free-Key Onboarding Nudge

New users who open Nexus with only Ollama configured see a one-time nudge card in HQ:

> "No cloud AI keys set. Add a free Groq key to get cloud fallback (30 seconds, no credit card):
> groq.com/keys → paste into Settings → AI Keys → Groq."

The card shows once, then is dismissed and never shown again (stored in `localStorage`).

Other free keys shown: Cerebras, NVIDIA NIM, SambaNova — all with direct links.

**File:** `components/home/office/FreeKeyNudge.tsx`

---

## Block Q — Switch Operator Scheduler Integration

The Switch Operator can run on a schedule, not just on demand. Integration with the existing scheduler:

### Scheduled Job Types

| Job | Default Schedule | What it does |
|-----|-----------------|-------------|
| `operator:morning-brief` | Daily 6:00 AM | FLUX reads rate environment + crypto prices + CVE feed, writes morning brief to VAULT |
| `operator:health-check` | Every 30 min | Pings `/api/health/providers`, updates `offlineMode`, alerts if all providers down |
| `operator:backlog-run` | On demand | JANSKY reads `tasks/todo.md` Next Up, dispatches one task per run |
| `operator:repo-scan` | On demand | Takes a GitHub URL from the task backlog, runs repo assimilation |

Scheduler jobs call `/api/ai` exactly as the HQ chat does — same provider chain, same circuit breaker, same free-first policy. If the scheduled provider is down, the circuit breaker kicks in and the job uses the next available provider.

**Files:** Use existing scheduler infrastructure. New `lib/switchOperator.ts` exposes `runScheduledJob(jobType, store)` called by the scheduler hook.

---

## Block R — Provider Intelligence (Self-Optimizing Chain Order)

Over time, the Operator learns which providers are fastest and most reliable for this installation. Rather than a fixed chain order, it maintains a score per provider:

```
score = (success_rate × 0.5) + (speed_rank × 0.3) + (recency_weight × 0.2)
```

After every successful response, the Operator updates the score for the responding provider. After every circuit trip, the score drops. The AUTO_CHAIN is re-sorted by score at the start of each session.

This means: if SambaNova consistently responds faster than Groq for this user's location and usage pattern, it moves up the chain automatically. The system learns without any user intervention.

**Stored in:** `store/useStore.ts` — `providerScores: Record<string, number>`, persisted via Zustand persist.

**Files:** `store/useStore.ts` (add slice), `lib/switchOperator.ts` (score update after each call), `app/api/ai/route.ts` (accept optional ordered chain from client).

---

## Full Architecture (After All Blocks)

```
User message / Scheduler fire
         │
         ▼
OfficeCommandCenter.tsx
  └─ detect intent: operator mode? repo URL? normal chat?
  └─ if operator: runOperatorLoop() → selects agent + provider
  └─ if normal: buildAgentPrompt() as today
         │
         ▼
/api/health/providers  (read circuit state — no live ping)
         │
         ▼
/api/ai  (POST)
  └─ policyFilteredChain (free providers + paid if opted in)
  └─ circuitIsOpen check (skip dead providers)
  └─ callProvider() with AbortController timeout
  └─ on failure: tripCircuit(), try next
  └─ on success: return with X-Provider, X-Model, X-Circuits-Open headers
         │
         ▼
OfficeCommandCenter.tsx
  └─ read X-Provider header → update providerScores
  └─ render response + SpeakButton
  └─ if all failed: show friendly failover message, schedule retry
```

```
Scheduler (every 30 min / daily 6am / on demand)
         │
         ▼
lib/switchOperator.ts → runScheduledJob(type)
  └─ reads /api/health/providers
  └─ selects provider
  └─ reads task backlog / FRED / CVE feed
  └─ dispatches to /api/ai
  └─ writes result to VAULT / store
  └─ logs to AgentRunArtifact
```

---

## Security Hardening (Operator-Specific)

| Risk | Mitigation |
|------|-----------|
| Operator reads task backlog and self-dispatches | JANSKY operator mode is read-only on files by default; ORBIT writes require user approval via `agentHighRiskWritesRequireApproval` |
| Repo assimilation fetches arbitrary GitHub URLs | Validate URL against `github.com` hostname only; regex-validate owner/repo format; no code execution — metadata and README only |
| Scheduled jobs firing without user awareness | All scheduled runs log a visible card in HQ chat activity log; user can cancel any job from the scheduler panel |
| Circuit breaker state is in-memory only | Server restart resets all circuits — this is intentional; stale failure state is worse than a cold reset |
| Provider scores persist to localStorage | Scores are performance hints, not security-sensitive; no API keys or user data in the score object |

---

## Priority Sequence

| Order | Block | Effort | Impact |
|-------|-------|--------|--------|
| ✅ | Policy gate fix (FREE_DEFAULT_PROVIDERS) | Done | Critical — free keys now actually work |
| ✅ | Circuit breaker in route.ts | Done | High — dead providers no longer block the chain |
| 1 | Block P1+P2 — Health endpoint + status strip | 1 session | High — operator can see system state |
| 2 | Block P3 — Smooth failover messages | 0.5 session | High — no more hard errors |
| 3 | Block P5 — Free-key onboarding nudge | 0.5 session | High — new users get to free AI fast |
| 4 | Block O — Switch Operator (`lib/switchOperator.ts` + JANSKY mode) | 2 sessions | Very high — autonomous operation |
| 5 | Block Q — Scheduler integration | 1 session | High — 24/7 without user present |
| 6 | Block P4 — Offline mode banner | 0.5 session | Medium — UX polish |
| 7 | Block R — Provider intelligence / self-sorting chain | 1 session | Medium — continuous optimization |

---

## What 24/7 Operation Looks Like When This Ships

Nexus starts up. It checks provider health silently in the background. If Ollama is running, it is the first provider. If not, the chain falls to Groq, then Cerebras, then NVIDIA, then SambaNova — all free, all requiring only an API key the user sets once.

At 6:00 AM the scheduler fires. JANSKY reads the FRED rate data, the crypto prices, and the overnight CVE feed. It writes a morning brief to VAULT and posts a summary card to HQ chat. The user wakes up and sees it waiting.

During the day, if Groq hits its free-tier rate limit, its circuit trips. The next request goes to Cerebras instead — no error, no delay beyond the normal API latency. After 5 minutes, the Groq circuit resets and it is available again.

If the user drops a GitHub URL into HQ chat and says "assimilate this," the Operator reads the repo, compresses it to an essence prompt, reasons about fit, and writes a plan entry — all in one turn. If the fit is strong, it hands off to ORBIT with an implementation proposal ready for approval.

The user never configures provider priority. The system learns it. The user never debugs a dead provider. The circuit breaker handles it. The user never misses a morning brief. The scheduler handles it.

---

## What This Does NOT Do

- **No autonomous code merges.** ORBIT proposes. Mario approves. `agentHighRiskWritesRequireApproval` is always on.
- **No cloud sync of provider scores.** Scores are local to the installation. No telemetry leaves the device.
- **No paid API fallback without opt-in.** Even in operator mode, the chain respects `FREE_DEFAULT_PROVIDERS` unless `NEXUS_ALLOW_PAID_APIS=true` is set.
- **No infinite retry loops.** One retry per failed request. Circuit breaker prevents hammering dead providers.
- **No Ollama auto-install.** If Ollama is missing, the system nudges but does not download or execute anything.
