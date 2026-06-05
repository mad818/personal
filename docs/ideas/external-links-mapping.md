# Nexus Prime — External Ideas Mapping (ALL 66 Links)

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

## GitHub batch intake — 2026-04-22 (23 links)

This section is the full-triage intake for the latest GitHub batch. It is intentionally broader than [`assimilated-ecosystem.md`](./assimilated-ecosystem.md): everything lands here once, and only the strongest Nexus-fit items get promoted there.

## GitHub/X batch intake — 2026-05-03

This batch feeds the Homefront source-intelligence pass. The useful product move is **not** to install a stack of external tools. The useful move is to show that Homefront can ingest outside ideas with a visible posture: **No vendoring**, **Passive-first**, **Operator approved**, and **Proof kept**.

### Security, autonomy, and agent safety

#### `OWASP/APTS`

- **Link**: `https://github.com/OWASP/APTS`
- **What it is**: Governance standard for autonomous penetration testing platforms: scope enforcement, safety controls, human oversight, auditability, manipulation resistance, supply-chain trust, and reporting.
- **Likely Nexus mapping**: CYBER/CIPHER review posture, agent autonomy tiers, approval gates, audit trail language, future security self-assessment checklists.
- **Disposition**: **Promote as governance reference**
- **Safest implementation shape**: Convert its domains into review questions and source-intake copy. Do not claim APTS conformance until a real assessment exists.

#### `affaan-m/agentshield`

- **Link**: `https://github.com/affaan-m/agentshield`
- **What it is**: AI-agent security scanner for agent configuration, MCP servers, and tool permissions.
- **Likely Nexus mapping**: SECURITY/SKILLS diagnostics, future local audit checklist for MCP/tool permission posture.
- **Disposition**: **Candidate local tool later**
- **Safest implementation shape**: Start as a checklist and possible optional CLI note. Do not add it as a runtime dependency without operator approval and verified local behavior.

#### `416rehman/DeepZero`

- **Link**: `https://github.com/416rehman/DeepZero`
- **What it is**: YAML-driven vulnerability research pipeline engine with orchestration, parallelism, resumable state, and LLM assessment.
- **Likely Nexus mapping**: CIPHER/CYBER pipeline architecture reference, not an end-user feature.
- **Disposition**: **Architecture reference only**
- **Safest implementation shape**: Borrow the idea of resumable pipeline state and evidence records; do not wire automated vulnerability research or zero-day discovery into Nexus.

### OSINT, RECON, and defensive taxonomy

#### `rawfilejson/awesome-osint-arsenal`

- **Link**: `https://github.com/rawfilejson/awesome-osint-arsenal`
- **What it is**: Curated OSINT and recon toolkit inventory with an explicit authorized-use disclaimer.
- **Likely Nexus mapping**: RECON source taxonomy, passive tool catalog, future advisory checklist for which lookup type belongs where.
- **Disposition**: **Taxonomy reference**
- **Safest implementation shape**: Use only the category map and legal/authorized-use boundary. Do not import installer flows or tool binaries.

#### `HunxByts/GhostTrack`

- **Link**: `https://github.com/HunxByts/GhostTrack`
- **What it is**: OSINT/information-gathering utility around IP, phone, and username lookup.
- **Likely Nexus mapping**: RECON boundary lesson for personally identifying lookups.
- **Disposition**: **Guardrail reference**
- **Safest implementation shape**: If similar lookup UX is ever added, keep it consent/authorized-use framed, rate-limited, and evidence-first. No stalking or harassment workflows.

#### `Z4nzu/hackingtool`

- **Link**: `https://github.com/Z4nzu/hackingtool`
- **What it is**: Broad security-tool taxonomy already mapped into the RECON roadmap.
- **Likely Nexus mapping**: Existing RECON categories and passive panels.
- **Disposition**: **Already assimilated**
- **Safest implementation shape**: Keep the current read-only/advisory boundary; do not vendor the tool suite.

#### `CarterPerez-dev/Cybersecurity-Projects`

- **Link**: `https://github.com/CarterPerez-dev/Cybersecurity-Projects`
- **Likely Nexus mapping**: Defensive learning/project taxonomy for CYBER and SKILLS.
- **Disposition**: **Stage for later review**
- **Safest implementation shape**: Review individual projects before mapping; do not infer suitability from the repository name alone.

### Design and taste system

#### `google-labs-code/design.md`

- **Link**: `https://github.com/google-labs-code/design.md`
- **What it is**: Specification for giving coding agents a persistent visual identity through machine-readable tokens plus human-readable rationale.
- **Likely Nexus mapping**: `docs/NEXUS_TASTE_CONTRACT.md`, Homefront landing/shell continuity, future route-level visual contracts.
- **Disposition**: **Promote as design-system pattern**
- **Safest implementation shape**: Codify Homefront's dark premium command-room rules locally; do not replace the existing design system wholesale.

#### `Leonxlnx/taste-skill`

- **Link**: `https://github.com/Leonxlnx/taste-skill`
- **What it is**: Agent design-skill pack focused on avoiding generic UI output and preserving stronger taste.
- **Likely Nexus mapping**: Design review checklist for landing/shell work and visual updates.
- **Disposition**: **Reference pattern**
- **Safest implementation shape**: Use as a reminder to keep screens product-specific, not as copied skill content.

### Private art/tooling references

#### `blendi-remade/sprite-sheet-creator`

- **Link**: `https://github.com/blendi-remade/sprite-sheet-creator`
- **What it is**: Sprite-sheet generator for 2D pixel characters and maps using external image models and API keys.
- **Likely Nexus mapping**: Private art pipeline inspiration only.
- **Disposition**: **Defer / optional tooling**
- **Safest implementation shape**: Do not add a dependency or public positioning. If used later, keep it behind the private asset lane with license/key review.

#### `0x0funky/agent-sprite-forge`

- **Link**: `https://github.com/0x0funky/agent-sprite-forge`
- **What it is**: Agent skill for sprite sheets, maps, transparent frame extraction, animated GIFs, and QA metadata.
- **Likely Nexus mapping**: Existing private asset tooling reference.
- **Disposition**: **Already tracked for private tooling**
- **Safest implementation shape**: Keep as generation/normalization inspiration; runtime assets still need manifest, license, and quality validation.

#### `Hugo-Dz/spritefusion-pixel-snapper`

- **Link**: `https://github.com/Hugo-Dz/spritefusion-pixel-snapper`
- **What it is**: Tool for snapping AI/procedural pixel art to a consistent grid and quantized palette.
- **Likely Nexus mapping**: Existing private asset-cleanup reference.
- **Disposition**: **Already tracked for private tooling**
- **Safest implementation shape**: Use only as an optional local cleanup step after asset provenance is clean.

### Skill, workflow, and staged links

#### `pranshuparmar/witr`

- **Link**: `https://github.com/pranshuparmar/witr`
- **Likely Nexus mapping**: Workflow/process idea bucket.
- **Disposition**: **Stage for later review**
- **Safest implementation shape**: Review README and license before mapping into SKILLS or Resources.

#### `X links supplied 2026-05-03`

- **Links**: `Voxyz_ai`, `BugBountyCenter`, `heynavtoor`, `Dinosn`, `heygurisingh`, `LearnWithBrij`, `tom_doerr`, `0x0funky`
- **Likely Nexus mapping**: Agent workflow, bug bounty posture, design/development inspiration, and private art tooling references.
- **Disposition**: **Stage for later review**
- **Safest implementation shape**: Do not implement from X headlines alone. Promote only after each post is reviewed, sourceable, and mapped to a safe Nexus surface.

### OSINT / cyber / recon

#### 1) `7WaySecurity/ai_osint`

- **Link**: `https://github.com/7WaySecurity/ai_osint`
- **What it is**: Curated AI-OSINT resources for exposed LLM endpoints, leaked keys, vector databases, MCP services, and related AI infrastructure reconnaissance.
- **Likely Nexus mapping**: RECON/CYBER research taxonomy, `lib/vulnerabilityReview.ts`, `lib/developerResources.ts`, future passive query packs for `app/recon/*` and `app/cyber/*`.
- **Disposition**: **Candidate later**
- **Safest implementation shape**: Convert only the passive-first exposure taxonomy and query ideas into advisory checklists and review prompts; no offensive automation or active exploitation.

#### 2) `mukul975/Anthropic-Cybersecurity-Skills`

- **Link**: `https://github.com/mukul975/Anthropic-Cybersecurity-Skills`
- **What it is**: Large structured cybersecurity skill pack for AI agents, mapped to common defensive and governance frameworks.
- **Likely Nexus mapping**: CIPHER playbook references, `components/home/office/prompts.ts`, `lib/agent.ts`, future defensive skill docs.
- **Disposition**: **Candidate later**
- **Safest implementation shape**: Extract defensive control-taxonomy ideas and response structure only; do not import the skill library wholesale.

#### 3) `aingram702/OSINT-Master-Tool`

- **Link**: `https://github.com/aingram702/OSINT-Master-Tool`
- **What it is**: Master-index style OSINT toolkit / reconnaissance bundle.
- **Likely Nexus mapping**: RECON reference taxonomy, `app/recon/*`, `components/recon/*`, operator research notes.
- **Disposition**: **Reference only**
- **Safest implementation shape**: Use only as a comparison checklist for passive recon coverage; do not vendor tools or widen Nexus into an automation-heavy OSINT suite.

#### 4) `Astrosp/Awesome-OSINT-For-Everything`

- **Link**: `https://github.com/Astrosp/Awesome-OSINT-For-Everything`
- **What it is**: Broad categorized list of OSINT resources across intelligence gathering, reverse searching, bug bounty, trust and safety, and related workflows.
- **Likely Nexus mapping**: RECON category naming, future docs references, passive-source gap analysis.
- **Disposition**: **Reference only**
- **Safest implementation shape**: Mine only the taxonomy and category language for future RECON organization; keep the repo external.

#### 5) `GH05TCREW/pentestagent`

- **Link**: `https://github.com/GH05TCREW/pentestagent`
- **What it is**: AI penetration-testing agent framework for black-box security testing and bug-bounty workflows.
- **Likely Nexus mapping**: CYBER boundary definition, `lib/agent.ts`, `app/api/tools/route.ts`, `docs/SYSTEM_STATE.md` security posture.
- **Disposition**: **Reference only**
- **Safest implementation shape**: Treat it as a boundary and red-team reference for what Nexus should not automate; keep Nexus read-only and advisory.

#### 6) `psyray/oasis`

- **Link**: `https://github.com/psyray/oasis`
- **What it is**: Ollama-powered security auditing scanner with multi-model analysis, orchestration, caching, and report generation.
- **Likely Nexus mapping**: CYBER review workflows, `lib/vulnerabilityReview.ts`, future local-only code-review assist flows.
- **Disposition**: **Defer / out of scope**
- **Safest implementation shape**: Borrow only report-shaping or local triage ideas later; do not turn Nexus into an automated scanner.

#### 7) `h0tak88r/AutoAR`

- **Link**: `https://github.com/h0tak88r/AutoAR`
- **What it is**: Automated reconnaissance / ASM tool and Discord bot for bug bounty and pentest workflows.
- **Likely Nexus mapping**: RECON/CYBER boundary notes, later OPS/internal-monitoring comparisons.
- **Disposition**: **Defer / out of scope**
- **Safest implementation shape**: Keep it as an external reference for automation-heavy recon patterns that remain outside Nexus.

#### 8) `trimstray/the-book-of-secret-knowledge`

- **Link**: `https://github.com/trimstray/the-book-of-secret-knowledge`
- **What it is**: Large curated collection of lists, manuals, cheatsheets, blogs, one-liners, and CLI/web tools.
- **Likely Nexus mapping**: General operator reference, RECON/CYBER reading list, docs-only inspiration.
- **Disposition**: **Reference only**
- **Safest implementation shape**: Use only as a reference shelf for operator research; do not mirror or import its content into product UX.

### Agent workflow / eval / memory

#### 9) `rohitg00/pro-workflow`

- **Link**: `https://github.com/rohitg00/pro-workflow`
- **What it is**: Agent workflow system centered on correction memory, context engineering, parallel worktrees, and battle-tested skills.
- **Likely Nexus mapping**: `docs/AGENT_HANDOFF.md`, `tasks/lessons.md`, worktree discipline, review-loop patterns, `lib/agent.ts`.
- **Disposition**: **Candidate later**
- **Safest implementation shape**: Absorb workflow discipline and memory patterns into repo process docs and agent prompts, not as a direct framework dependency.

#### 10) `kunchenguid/gnhf`

- **Link**: `https://github.com/kunchenguid/gnhf`
- **What it is**: Overnight / “good night, have fun” agent-run pattern for continuing work after the operator steps away.
- **Likely Nexus mapping**: Future scheduler/heartbeat ideas, `lib/agent.ts`, automation docs, local-only review flows.
- **Disposition**: **Candidate later**
- **Safest implementation shape**: Reuse only the idea of bounded, resumable background work after strong approval gates exist.

#### 11) `algorithmicsuperintelligence/openevolve`

- **Link**: `https://github.com/algorithmicsuperintelligence/openevolve`
- **What it is**: Open-source implementation of AlphaEvolve-style search and improvement loops.
- **Likely Nexus mapping**: `lib/agent.ts`, eval discipline, experiment archive ideas, `tasks/lessons.md`.
- **Disposition**: **Candidate later**
- **Safest implementation shape**: Use only as a methodology reference for benchmark-gated improvement loops; no autonomous self-modifying runtime.

#### 12) `kyegomez/OpenMythos`

- **Link**: `https://github.com/kyegomez/OpenMythos`
- **What it is**: Theoretical reconstruction of Claude Mythos-style architecture from public research.
- **Likely Nexus mapping**: Long-range agent architecture notes, prompt/system-design research, `lib/agent.ts`.
- **Disposition**: **Reference only**
- **Safest implementation shape**: Keep it as theory input for future architecture thinking, not a product roadmap driver.

#### 13) `obra/superpowers`

- **Link**: `https://github.com/obra/superpowers`
- **What it is**: Agentic planning / TDD / review methodology for software development.
- **Likely Nexus mapping**: ORBIT reasoning loop, agent execution discipline, review phases.
- **Disposition**: **Already covered**
- **Safest implementation shape**: Already tracked in [`assimilated-ecosystem.md`](./assimilated-ecosystem.md); continue using it as a prompt/process pattern only.

#### 13A) `msitarzewski/agency-agents`

- **Link**: `https://github.com/msitarzewski/agency-agents`
- **What it is**: MIT-licensed library of specialist AI-agent Markdown definitions plus conversion/install notes for multiple agentic coding tools, including Codex TOML generation.
- **Likely Nexus mapping**: ORBIT/NOVA/CIPHER/JANSKY role taxonomy, `components/home/office/prompts.ts`, `lib/agent.ts`, future prompt-pack eval fixtures, and Resources/source-ledger review notes.
- **Disposition**: **Candidate prompt taxonomy**
- **Safest implementation shape**: Mine only reviewed role categories, checklist structure, and evaluation ideas; do not run its install scripts, copy the prompt bodies wholesale, generate `.codex` agents, bypass Nexus routing, or expand the product into hundreds of unreviewed background agents.

### Privacy / sandbox / runtime hardening

#### 14) `google/magika`

- **Link**: `https://github.com/google/magika`
- **What it is**: AI-powered file content-type detection for safer and more accurate artifact classification.
- **Likely Nexus mapping**: VAULT/file inspection surfaces, future upload or local-project artifact triage, `app/api/project/route.ts`.
- **Disposition**: **Candidate later**
- **Safest implementation shape**: Add only as an optional local classification helper for artifacts and uploads; keep it off the critical runtime path.

#### 15) `zeroc00I/LLM-anonymization`

- **Link**: `https://github.com/zeroc00I/LLM-anonymization`
- **What it is**: Reverse proxy that anonymizes sensitive security data before it reaches an external LLM provider.
- **Likely Nexus mapping**: existing privacy-shield posture, `app/api/ai/route.ts`, `lib/developerResources.ts`, `lib/vulnerabilityReview.ts`.
- **Disposition**: **Candidate later**
- **Safest implementation shape**: Continue treating it as a pattern for pre-provider anonymization and operator-controlled redaction; keep it external and optional.

#### 16) `TencentCloud/CubeSandbox`

- **Link**: `https://github.com/TencentCloud/CubeSandbox`
- **What it is**: Secure, lightweight sandbox for AI agents with strong isolation goals.
- **Likely Nexus mapping**: future safe-execution path for `app/api/tools/route.ts`, Docker/self-hosted ops docs, local runtime hardening.
- **Disposition**: **Candidate later**
- **Safest implementation shape**: Treat as an external sandbox-service pattern for future isolated execution, not as bundled infrastructure inside Nexus.

#### 17) `ruvnet/RuView`

- **Link**: `https://github.com/ruvnet/RuView`
- **What it is**: WiFi-sensing platform that infers presence, pose, and vital signs from radio signals instead of cameras.
- **Likely Nexus mapping**: later OPS/VEHICLE/internal-monitoring concepts, room/telemetry experimentation, privacy-aware sensing references.
- **Disposition**: **Defer / out of scope**
- **Safest implementation shape**: Keep as inspiration for future sensing/telemetry explorations only; no current product integration.

#### 18) `GyulyVGC/sniffnet`

- **Link**: `https://github.com/GyulyVGC/sniffnet`
- **What it is**: Desktop network-traffic monitoring application.
- **Likely Nexus mapping**: later internal monitoring references for COMMAND/SECURITY, network-health UI inspiration.
- **Disposition**: **Defer / out of scope**
- **Safest implementation shape**: Use only as external inspiration for future internal observability panels; no packet-capture features in Nexus.

### Design / media / interaction tooling

#### 19) `heygen-com/hyperframes`

- **Link**: `https://github.com/heygen-com/hyperframes`
- **What it is**: Agent-friendly HTML-to-video rendering system.
- **Likely Nexus mapping**: future demo/export tooling, motion studies, presentation capture.
- **Disposition**: **Defer / out of scope**
- **Safest implementation shape**: Keep as media-pipeline inspiration only; do not expand Nexus into a video-render product.

#### 20) `webadderall/Recordly`

- **Link**: `https://github.com/webadderall/Recordly`
- **What it is**: Open-source polished screen-recording tool, positioned as an alternative to Screen Studio.
- **Likely Nexus mapping**: demo capture workflow, operator docs, release/showcase media.
- **Disposition**: **Defer / out of scope**
- **Safest implementation shape**: Use externally for demos if useful; no in-app recording feature work from this repo.

#### 21) `onlook-dev/onlook`

- **Link**: `https://github.com/onlook-dev/onlook`
- **What it is**: AI-first visual editor for React apps, aimed at design-to-code iteration.
- **Likely Nexus mapping**: design-to-code workflow references, future visual editing experiments, `docs/NEXUS_TASTE_CONTRACT.md`.
- **Disposition**: **Reference only**
- **Safest implementation shape**: Treat as an external design tool pattern and comparison point for UI iteration; do not embed its editor into Nexus.

#### 22) `Leonxlnx/taste-skill`

- **Link**: `https://github.com/Leonxlnx/taste-skill`
- **What it is**: High-agency frontend taste skill focused on avoiding generic, low-intent UI output.
- **Likely Nexus mapping**: `lib/nexusTasteContract.ts`, `docs/NEXUS_TASTE_CONTRACT.md`, `docs/SYSTEM_STATE.md`.
- **Disposition**: **Already covered**
- **Safest implementation shape**: Already absorbed into the shipped taste/design contract and tracked in repo history; do not re-triage it as new work.

#### 23) `Liquid4All/cookbook` `audio-car-cockpit`

- **Link**: `https://github.com/Liquid4All/cookbook/tree/main/examples/audio-car-cockpit`
- **What it is**: Audio-driven cockpit interaction example with strong vehicle / instrument-panel flavor.
- **Likely Nexus mapping**: HQ/VEHICLE ambience, future audio-reactive cockpit inspiration, `components/home/office/*`.
- **Disposition**: **Defer / out of scope**
- **Safest implementation shape**: Keep as aesthetic inspiration for later spatial/audio experiments; no direct product adoption now.

---

## Implemented (safe wiring fixes)

These were already flagged as “not wired / mismatched,” and are safe to fix:

1. **Camera alerts** now subscribe via typed `eventBus` (instead of `window` events)
   - `components/security/CameraGrid.tsx`

2. **Manual refresh button** now triggers `fetchAll()` and emits `nexus-data-refreshed`
   - `components/ui/GlobalDataLoader.tsx`

3. **SecurityAlerts** now prefers `store.securityAlerts` when present (falls back to demo otherwise)
   - `components/security/SecurityAlerts.tsx`
