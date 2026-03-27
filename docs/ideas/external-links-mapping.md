# Nexus Prime — External Ideas Mapping (ALL 43 Links)

This document maps each external link you provided to the **corresponding Nexus Prime folders/files**, and states whether it **makes sense to implement** (and what the safest implementation shape is).

## Core Nexus modules referenced

- **Agent runtime**: `lib/agent.ts`
- **System prompt + provider routing**: `lib/ai.ts`
- **Dynamic live grounding block**: `lib/liveContext.ts`
- **Prompt personas / routing**: `components/home/office/prompts.ts`
- **Tool sandbox + security controls**: `app/api/tools/route.ts` + `middleware.ts`
- **Global fetch orchestration**: `components/ui/GlobalDataLoader.tsx` + `hooks/useGlobalData.ts`
- **Global state**: `store/useStore.ts`
- **Realtime event routing**: `lib/wsManager.ts` + `lib/eventBus.ts`
- **Vault / knowledge UI**: `components/vault/*`

---

## X links (37)

### 1) `elder_plinius` — G0DM0D3 jailbreak / no-guardrails harness
- **Link**: `https://x.com/elder_plinius/status/2036946953418748333`
- **Fits**: `lib/agent.ts`, `lib/ai.ts`, `app/api/tools/route.ts`
- **Implement?**: **NO** (conflicts with your “secure everything” requirement). Only acceptable as isolated internal red-team evaluation (not user-facing).

### 2) `akshay_pachaar` — OCR / document understanding (Chandra OCR idea)
- **Link**: `https://x.com/akshay_pachaar/status/2036798654758232516`
- **Fits**: `app/api/tools/route.ts` (new constrained OCR tool), future document-ingest UI, reference behavior exists in `nexus-final.html`
- **Implement?**: **ONLY if** you want file/screenshot ingestion in Next app. Otherwise defer.

### 3) `GithubProjects` — “team of agents” (OMC-style orchestration)
- **Link**: `https://x.com/GithubProjects/status/2036826536658272754`
- **Fits**: `lib/agent.ts` (phase pipeline + verify/fix loop), UI surfacing in `components/home/office/*`
- **Implement?**: **YES, incremental** (start with phased single-lead orchestration; parallel agents later).

### 4) `aiedge_` — YouTube announcement
- **Link**: `https://x.com/aiedge_/status/2036815449225298369`
- **Fits**: none (no actionable implementation details)
- **Implement?**: **NO**

### 5) `heyrimsha` (thread) — prompt recipes (Example Anchor, Constraint Cage, Failure Finder…)
- **Link**: `https://x.com/heyrimsha/status/2036713372570489041`
- **Fits**: `components/home/office/prompts.ts`, `.claude/skills/*`, `lib/agent.ts` (verify/eval step)
- **Implement?**: **YES** (as Skill templates + eval harness; avoid “Step Exposer” chain-of-thought leakage).

### 6) `advaitpaliwal` — Feynman (research agent: cited meta-analysis, audit claims)
- **Link**: `https://x.com/advaitpaliwal/status/2036900468056875332`
- **Fits**: `lib/agent.ts` research pipeline, `app/api/tools/route.ts` web tools, Vault for artifacts
- **Implement?**: **YES (partial)**: add “cited brief” workflow + claim-audit mode.

### 7) `shannholmberg` — AutoResearch: fast constrained loops + single metric
- **Link**: `https://x.com/shannholmberg/status/2036461256006357409`
- **Fits**: `lib/agent.ts` (looping mode), future scheduler
- **Implement?**: **YES (later)**: useful once you have eval scoring + scheduler.

### 8) `tom_doerr` — hierarchical knowledge graph for agents (iwe)
- **Link**: `https://x.com/tom_doerr/status/2036325658834481164`
- **Fits**: `components/skills/KnowledgeGraphViz.tsx` + any knowledge graph builder
- **Implement?**: **LATER** (bigger scope)

### 9) `sukh_saroy` — list of AI engineer repos/roadmap
- **Link**: `https://x.com/sukh_saroy/status/2036463981687435427`
- **Fits**: primarily reference/inspiration; actionable bits map to existing: Ollama (`lib/ollama.ts`), RAG direction, etc.
- **Implement?**: **NO direct** (use as checklist, not features)

### 10) `Sumanth_077` — Memento-Skills (read→execute→reflect→write)
- **Link**: `https://x.com/Sumanth_077/status/2036807382135943244`
- **Fits**: `lib/skillEngine.ts`, `lib/skillCycle.ts`, `lib/agent.ts`
- **Implement?**: **YES (phased)**: start with routing + failure logs; only do “write back” behind approval.

### 11) `eng_khairallah1` — Crucix “personal intelligence terminal”
- **Link**: `https://x.com/eng_khairallah1/status/2036352712153911627`
- **Fits**: your existing multi-feed `app/api/*` + global loaders + alerting
- **Implement?**: **YES (partial)**: adopt “delta sweep + alerts” pattern, not full 27-source clone.

### 12) `alifcoder` — everything-claude-code repo
- **Link**: `https://x.com/alifcoder/status/2036377068875948342`
- **Fits**: `.claude/*` (rules/skills/commands), `app/api/tools/route.ts` (security)
- **Implement?**: **PARTIAL** (copy patterns, not bulk import)

### 13) `0xSero` — use agents for mock DB/UI variants before real code
- **Link**: `https://x.com/0xSero/status/2036554133285614021`
- **Fits**: `lib/agent.ts` (proposal mode), `store/useStore.ts` (`pendingEdits`)
- **Implement?**: **YES (later)**: good when you formalize “prototype variants” output.

### 14) `oliviscusAI` — Dexter (finance agent)
- **Link**: `https://x.com/oliviscusAI/status/2036395922016686548`
- **Fits**: `app/alpha/page.tsx`, `components/alpha/*`, `hooks/usePrices.ts`, `lib/liveContext.ts`
- **Implement?**: **YES (partial)**: “thesis generator” based on current feeds.

### 15) `josesilesIA` — token optimization / memory / subagents (everything-claude-code)
- **Link**: `https://x.com/josesilesIA/status/2036097159213318478`
- **Fits**: `lib/agent.ts` memory injection + tool caching; `.claude/*` practices
- **Implement?**: **YES (partial)**: adopt read-caching + memory hygiene.

### 16) `heynavtoor` — Context engineering article
- **Link**: `https://x.com/heynavtoor/status/2036157094341255344`
- **Fits**: `lib/ai.ts` + `lib/agent.ts` + `lib/liveContext.ts` + Vault/memory tools
- **Implement?**: **YES**: make “dynamic context assembly” the default for every run.

### 17) `heyrimsha` — prompt failure-rate / Skills improvement prompts (Karpathy-style)
- **Link**: `https://x.com/heyrimsha/status/2035995286150234480`
- **Fits**: `.claude/skills/*`, `lib/agent.ts` (eval + verify)
- **Implement?**: **YES**: build eval harness + minimal-change remediation loop.

### 18) `charliejhills` — claude-subconscious (background memory)
- **Link**: `https://x.com/charliejhills/status/2035999601954865229`
- **Fits**: `lib/memoryStore.ts`, `lib/agent.ts` (memory diff injection)
- **Implement?**: **YES (partial)**: “memory diff” injection + summary, no hidden background daemon at first.

### 19) `carlosvillu` — Siftly: X bookmarks → searchable KB + mindmap graph
- **Link**: `https://x.com/carlosvillu/status/2035627562215334254`
- **Fits**: `components/vault/*`, future “tagging” + `components/skills/KnowledgeGraphViz.tsx`
- **Implement?**: **YES (later)**: start with tags + retrieval; graph later.

### 20) `koylanai` — HF papers API research skill
- **Link**: `https://x.com/koylanai/status/2035787531586064663`
- **Fits**: `app/api/tools/route.ts` web tools + research skill templates
- **Implement?**: **YES (later)**: add papers search + methodology-first extraction.

### 21) `om_patel5` — “clone websites” skill using browser automation
- **Link**: `https://x.com/om_patel5/status/2037014741692961141`
- **Fits**: browser tools exist in `lib/agent.ts`, but safe website cloning is a big scope
- **Implement?**: **NO for now** (security/scope risk). Use only for design inspiration workflows.

### 22) `ericzakariasson` — “CLI for agents” patterns
- **Link**: `https://x.com/ericzakariasson/status/2036762680401223946`
- **Fits**: `start-nexus.ps1`, any future CLIs/scripts; tool definitions in `lib/agent.ts`
- **Implement?**: **YES (later)**: standardize non-interactive CLI wrappers if needed.

### 23) `mdancho84` — production agentic RAG course (meta)
- **Link**: `https://x.com/mdancho84/status/2035679446905032777`
- **Fits**: `components/vault/*`, `lib/liveContext.ts`, `app/api/tools/route.ts`
- **Implement?**: **YES (partial)**: start with keyword-first retrieval + citations + eval scoring.

### 24) `oliviscusAI` — AgentScope framework mention
- **Link**: `https://x.com/oliviscusAI/status/2035762710424572330`
- **Fits**: architecture reference for future “agent graphs”; your phase system is in `store/useStore.ts` + `lib/agent.ts`
- **Implement?**: **REFERENCE ONLY**

### 25) `tom_doerr` — “agent skill creator” repo
- **Link**: `https://x.com/tom_doerr/status/2035777044508815392`
- **Fits**: `.claude/skills/*` + your existing skill cycle
- **Implement?**: **REFERENCE ONLY** (concept already present in your repo)

### 26) `quantscience_` — TensorTrade RL trading library
- **Link**: `https://x.com/quantscience_/status/2036834550182019134`
- **Fits**: ALPHA tab if you ever add backtesting; not currently aligned with core UX
- **Implement?**: **NO now** (scope)

### 27) `jianw851` — “commands you need” productivity list
- **Link**: `https://x.com/jianw851/status/2036843438193496526`
- **Fits**: internal ops; not a Nexus feature by itself
- **Implement?**: **REFERENCE ONLY**

### Remaining X links from your list (not all individually expanded here)
For these, the actionable mapping falls into one of these buckets:
- **Prompt packs / template prompts** → `.claude/skills/*` + `components/home/office/prompts.ts`
- **RAG/knowledge/vault ideas** → `components/vault/*` + `lib/memoryStore.ts` + `app/api/tools/route.ts`
- **Multi-agent orchestration** → `lib/agent.ts` (phases/verify/fix loops)
- **Feed/intel terminal ideas** → `app/api/*` + `hooks/useGlobalData.ts` + `lib/liveContext.ts`

Links:
- `https://x.com/eng_khairallah1/status/2037076992374284310` (mirror returned no body)
- `https://x.com/leopardracer/status/2035999459729895493` (mirror returned no body)
- `https://x.com/KanikaBK/status/2036117598132441196` (mirror returned no body)
- `https://x.com/KanikaBK/status/2036459326064435377` (mirror returned no body)
- `https://x.com/cyrilXBT/status/2036280031782060364` (covered by your pasted “300 prompts” content)
- plus the other X links in your original paste (advait/shann/tom/etc.) which are covered above or fall into the buckets above

---

## GitHub repos (6)

### A) Drawbridge — visual annotations → structured tasks
- **Link**: `https://github.com/breschio/drawbridge`
- **Fits**: `store/useStore.ts` (`pendingEdits`) + future UI annotation tooling
- **Implement?**: **REFERENCE** (adopt the “proposal/approval” workflow concept)

### B) Aeon — scheduled autonomous skills
- **Link**: `https://github.com/aaronjmars/aeon`
- **Fits**: your planned “Cron scheduler UI” + Telegram integration
- **Implement?**: **YES (later)** as scheduler/mission layer, not a copy.

### C) claude-context-optimizer — token/context waste reduction
- **Link**: `https://github.com/egorfedorov/claude-context-optimizer`
- **Fits**: `lib/agent.ts` + `app/api/tools/route.ts` (read caching; avoid redundant reads)
- **Implement?**: **YES (partial)**: add session-scoped read cache + context allow/deny.

### D) production-agentic-rag-course — production RAG patterns
- **Link**: `https://github.com/jamwithai/production-agentic-rag-course`
- **Fits**: Vault + web tools + live context
- **Implement?**: **YES (partial)**: keyword-first retrieval + eval scoring before embeddings.

### E) code-review-graph — blast radius / dependency graphing
- **Link**: `https://github.com/tirth8205/code-review-graph`
- **Fits**: `lib/agent.ts` (pre-patch dependency/breadth minimization)
- **Implement?**: **LATER**

### F) turbovault — Obsidian-style vault indexing via MCP
- **Link**: `https://github.com/Epistates/turbovault`
- **Fits**: `components/vault/*`
- **Implement?**: **LATER / only if** you want external vault integration; security-sensitive.

---

## Implemented (safe wiring fixes)

These were already flagged as “not wired / mismatched,” and are safe to fix:

1) **Camera alerts** now subscribe via typed `eventBus` (instead of `window` events)  
   - `components/security/CameraGrid.tsx`

2) **Manual refresh button** now triggers `fetchAll()` and emits `nexus-data-refreshed`  
   - `components/ui/GlobalDataLoader.tsx`

3) **SecurityAlerts** now prefers `store.securityAlerts` when present (falls back to demo otherwise)  
   - `components/security/SecurityAlerts.tsx`

