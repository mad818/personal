# Universal Context Efficiency Plan (2026-04-06)

**Purpose**

Turn the Claude-session token-waste lessons into a Nexus-native runtime program so context, tools, memory, and scheduled missions stay cheap, predictable, and reusable across HQ, scheduled jobs, internal workbench flows, and future desktop/third-party lanes.

This is not a generic "optimize prompts" note. It is a project-specific execution plan based on the current Nexus runtime.

---

## Current reality

Nexus already has some good foundations:

- live context compaction exists in `lib/liveContext.ts`
- a cached system-prompt builder exists in `lib/ai.ts`
- Anthropic prompt caching is partially enabled in `app/api/ai/route.ts`
- scheduled jobs already use single-flight guards in `lib/ai.ts`
- `/api/tools` already has a small session read-cache for some external fetches

But the largest waste points are still present in the main runtime:

1. **Full tool catalog is always sent to tool-capable agent runs**
   - `lib/agent.ts` exposes one large `AGENT_TOOLS` array for every Anthropic and MiniMax tool-use run.
   - This includes research, browser, workspace, memory, and write tools together even when most are irrelevant.

2. **HQ interactive runs build full live context, not agent-scoped live context**
   - `components/home/office/OfficeCommandCenter.tsx` uses `buildLiveContextBundle(...)`.
   - The repo already has `buildFilteredLiveContext(...)`, but the interactive send path is not using it.

3. **Prompt reuse is structurally weak**
   - Anthropic caching exists only for the `system` block.
   - Tool schemas are still re-sent every tool-use request.
   - Interactive system prompt construction is rebuilt around volatile data on every send.

4. **Project-file repeated reads are still under-optimized**
   - `/api/tools` has eviction for `read_project_file:*`, but `readProjectFile(...)` does not actually cache those reads.
   - The code already expects that cache to exist, which means repeated code reads are still wasting runtime budget.

5. **Memory + lessons + RAG blocks are additive, but not budgeted as separate segments**
   - `OfficeCommandCenter` appends live context, memory diff, lessons, capabilities, and RAG blocks.
   - Only the live-context segment has a formal compaction report today.

6. **There is no first-class efficiency observability layer**
   - `AgentRunArtifact` tracks `contextChars` and `toolTraces`, which is useful.
   - It does not yet record prompt segment sizes, tool catalog size, duplicate reads, cache-hit rate, or prompt-cache eligibility.

---

## Primary fixes needed

### 1. Dynamic tool packs instead of one universal tool catalog

Replace the flat `AGENT_TOOLS` runtime path with domain-scoped tool packs:

- `research_pack`
- `workspace_read_pack`
- `workspace_write_pack`
- `browser_pack`
- `memory_pack`
- `ops_pack`

Add a selector such as:

- `getAgentToolCatalog(agentId, userMessage, mode)`

Rules:

- default to the smallest safe pack
- do not expose write tools unless the run is clearly code-editing or file-output oriented
- keep browser tools out of research/analysis-only runs
- keep workspace mutation tools out of non-coding flows
- preserve current approval/risk gating

**Why**

This is the Nexus equivalent of reducing always-loaded tool schemas. It is the single highest-leverage runtime reduction available in the current architecture.

---

### 2. Agent-scoped live context everywhere

Promote the filtered context path into the default runtime contract:

- HQ interactive send path should use an agent-scoped bundle, not the full bundle
- scheduled jobs should declare a context scope
- future internal missions should choose from `full | agent_scoped | minimal | none`

Needed additions:

- `buildFilteredLiveContextBundle(state, agentId, opts)`
- explicit segment caps for:
  - live intel
  - memory
  - learnings
  - RAG
  - stack/project doctrine

**Why**

The repo already did the hard design work by creating agent-specific section maps. The main send path just is not taking advantage of it yet.

---

### 3. Stable cached prefix + volatile delta split

Separate prompt construction into two layers:

- **stable prefix**
  - user profile
  - product rules
  - agent persona core
  - supported surface policy
  - project doctrine / stack block
- **volatile delta**
  - live context
  - current query
  - recent learnings
  - current RAG block
  - task-specific warnings

Apply this to:

- `buildSystemPrompt(...)`
- `buildCachedSystemPrompt(...)`
- `callNonInteractiveAI(...)`
- Anthropic system blocks in `/api/ai`

**Why**

Right now Nexus caches some prompt assembly work, but the structure is not optimized for stable-prefix reuse. This limits the value of prompt caching and makes scheduler jobs more expensive than they need to be.

---

### 4. Finish the repeated-read defense

Make the `/api/tools` cache real for codebase reads:

- cache `read_project_file(path)`
- cache `list_project_files(directory)`
- keep eviction on patch/create
- add optional read counters for per-run diagnostics

Also add duplicate-read tracking:

- same file read `3+` times in one run
- same directory listed repeatedly in one run

**Why**

This is the most direct match to the "same file read 33 times" class of waste. The repo already has partial scaffolding for it.

---

### 5. Non-interactive mission efficiency lane

Treat scheduled jobs and auto-ops as the first universal rollout target.

Implement:

- prompt-cache-friendly system prefixes
- job batching when multiple missions are due in the same tick
- explicit context policy per scheduled job
- reusable mission templates
- shared single-flight windowing for equivalent jobs

This should absorb and sharpen existing backlog item `A5`.

**Why**

Scheduled jobs are predictable, repetitive, and ideal for cache wins. They are the cleanest place to prove the optimization model before spreading it across all interactive runs.

---

### 6. Token-efficiency observability and internal dashboard

Add first-class metrics to runtime artifacts:

- `systemPromptChars`
- `liveContextChars`
- `memoryContextChars`
- `ragChars`
- `lessonsChars`
- `toolCatalogCount`
- `toolCatalogChars`
- `duplicateReadCount`
- `readCacheHits`
- `provider`
- `cacheEligible`

Then surface them in an internal panel:

- COMMAND diagnostics card or internal workbench panel
- per-run breakdown
- top waste sources
- duplicate-read offenders
- cacheable vs non-cacheable runs

**Why**

Without a feedback loop, the optimization work will drift. This needs to become visible, not theoretical.

---

## Execution order

### Phase 1 — Measurement first

1. Extend `AgentRunArtifact` and diagnostics capture for prompt/tool/read metrics.
2. Add per-run context segment accounting in `OfficeCommandCenter`, `lib/agent.ts`, and scheduler jobs.
3. Add duplicate-read and cache-hit counters in `/api/tools`.

**Exit**

- We can see where tokens/context are going in real Nexus runs.

### Phase 2 — Reduce the biggest waste

1. Replace universal `AGENT_TOOLS` with dynamic tool packs.
2. Switch HQ interactive send path to filtered live-context bundles.
3. Add budget caps for memory, lessons, and RAG blocks.

**Exit**

- Interactive runs stop paying for irrelevant tools and unrelated live data.

### Phase 3 — Make caching actually work

1. Split stable prompt prefix from volatile delta.
2. Use that split in `buildCachedSystemPrompt`, `/api/ai`, and scheduler flows.
3. Expand non-interactive single-flight + batching behavior.

**Exit**

- Repeated scheduled runs and repeated operator flows reuse more of the expensive prompt shape.

### Phase 4 — Close repeated-read waste

1. Cache `read_project_file` and `list_project_files`.
2. Evict caches correctly on patch/create.
3. Add duplicate-read warnings in diagnostics.

**Exit**

- The runtime no longer burns tokens and latency by re-reading identical source files unnecessarily.

### Phase 5 — Ship the internal efficiency dashboard

1. Add internal diagnostics UI for token/context efficiency.
2. Add repo-native verification checks for:
   - tool pack selection
   - context bundle caps
   - repeated-read cache behavior
3. Record efficiency posture in handoff/status docs.

**Exit**

- Optimization becomes part of the operating model, not a one-off cleanup.

---

## Files most directly involved

### Interactive runtime

- `components/home/office/OfficeCommandCenter.tsx`
- `lib/agent.ts`
- `lib/liveContext.ts`
- `lib/ai.ts`

### AI proxy and provider path

- `app/api/ai/route.ts`
- `lib/aiProviderHealth.ts`
- `lib/aiUsageGuard.ts`

### Tool/runtime waste control

- `app/api/tools/route.ts`
- `lib/skillMetadata.ts`
- `lib/chatCapabilityRouting.ts`

### Scheduler / missions

- `components/ui/CronSchedulerRunner.tsx`
- `components/ui/CronSchedulerPanel.tsx`
- `store/useStore.ts`

### Observability

- `store/useStore.ts`
- `app/api/status/route.ts`
- `app/api/diagnostics/route.ts`
- `app/command/page.tsx`

---

## Project-specific findings that drove this plan

1. `OfficeCommandCenter` currently uses `buildLiveContextBundle(...)` instead of the filtered agent-aware path.
2. `lib/agent.ts` currently sends one large `AGENT_TOOLS` schema into tool-use runs.
3. `/api/tools` evicts `read_project_file:*` cache keys, but the corresponding cache is not implemented for `readProjectFile(...)`.
4. Anthropic prompt caching is present, but only covers the `system` block and does not reduce tool-schema overhead.
5. Scheduler jobs already use `buildCachedSystemPrompt(...)` and single-flight keys, so they are the best first lane for universal rollout.

---

## Acceptance criteria

This plan is complete only when:

- HQ interactive runs use agent-scoped context by default
- tool-capable runs no longer ship the full universal tool schema unless explicitly required
- project-file repeated reads are cached and measurable
- scheduled jobs use stable cached prompt prefixes and shared batching/single-flight logic
- runtime diagnostics show prompt segment sizes, tool overhead, and duplicate-read counts
- the optimization contract is visible in the app and enforceable in repo-native checks

---

## Recommended immediate next batch

If this starts now, the first implementation slice should be:

1. instrument runtime efficiency metrics
2. add real caching for `read_project_file` / `list_project_files`
3. switch HQ send path from full live context to filtered live context
4. split `AGENT_TOOLS` into minimal dynamic packs

That batch delivers real cost/latency wins without changing product behavior.
