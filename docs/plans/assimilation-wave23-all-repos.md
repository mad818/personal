# Assimilation Wave 23 — All Repos (2026-06-21 Batch)

**Batch:** `2026-06-21-mario`  
**Repos assimilated:** 44 GitHub repos + 4 X posts  
**Matrices enriched:** 44 (all GitHub repos; X posts remain pending until source inspection)  
**Surgical code wins:** 3 new lib files + 1 validation script  

---

## Summary

Wave 23 covers the full 2026-06-21 batch. All 44 GitHub repos have enriched parity
matrices replacing the inventory-pending stubs. Matrices are set to `in_progress`
because pending capabilities remain. The implementation order below is P0 → P3.

---

## P0 — Agent Platform (implement next, highest leverage)

These repos directly improve Nexus's agent architecture and skill system.

### 1. Ponytail (YAGNI) → ORBIT prompt discipline
**Repo:** `DietrichGebert/ponytail`  
**Lane:** `agent-skills / HQ`  
**Code win done:** `lib/agentYagniGuardrails.ts`

**Remaining implementation:**
- [x] Wire `YAGNI_AGENT_DIRECTIVE` into `lib/ai.ts` and `lib/agent.ts` system prompt construction
- [x] Add YAGNI violation patterns to `.claude/hooks/pre-tool-use.mjs`
- [x] Implement per-step tool budget in skill runner (reject plans that exceed step limit)

---

### 2. SkillSpector → Skill security CI gate
**Repo:** `NVIDIA/SkillSpector`  
**Lane:** `CYBER / agent platform`  
**Code win done:** `lib/skillSpectrumPolicy.ts`

**Remaining implementation:**
- [x] Wire blocked skill capabilities into `.claude/hooks/pre-tool-use.mjs` for runtime checks
- [x] Add `scripts/validate-skill-capabilities.mjs` CI script that scans `.claude/skills/`
- [x] Surface violations in `CyberGovernanceCards.tsx`
- [ ] Add inter-skill dependency graph analysis (transitive privilege check)

---

### 3. addyosmani/agent-skills → Skills catalog expansion
**Repo:** `addyosmani/agent-skills`  
**Lane:** `skills / ORBIT`

**Remaining implementation:**
- [x] Create `.claude/skills/review/SKILL.md` — structured code review skill
- [x] Create `.claude/skills/refactor/SKILL.md` — scope-bounded refactor skill
- [x] Create `.claude/skills/optimize/SKILL.md` — performance optimization skill
- [x] Create `.claude/skills/architect/SKILL.md` — architecture design skill
- [x] Align all SKILL.md files to include explicit trigger/steps/success-criteria format

---

### 4. agentmemory → Episodic memory store
**Repo:** `rohitg00/agentmemory`  
**Lane:** `HQ / memory`  
**Code win done:** `lib/assimilation/reconCodeIntelBridge.ts` (routing reference)

**Remaining implementation:**
- [x] Create `lib/episodicMemoryStore.ts` — episodic event log with recency decay
- [ ] Implement semantic similarity retrieval over past sessions
- [x] Add recency-decay weighting function
- [ ] Build benchmark harness comparing episodic vs semantic vs hybrid retrieval
- [x] Add cross-session fact deduplication pass

---

### 5. codegraph → Code knowledge graph for RECON
**Repo:** `colbymchenry/codegraph`  
**Lane:** `RECON / ORBIT`  
**Code win done:** `lib/assimilation/reconCodeIntelBridge.ts` (routing reference)

**Remaining implementation:**
- [x] Create `scripts/build-codegraph.mjs` — walk TypeScript source, emit call-graph JSON
- [x] Create `lib/codegraphIndex.ts` — load and query the generated graph
- [x] Expose `callers-of`, `callees-of`, `definitions-of` queries to ORBIT agents
- [ ] Wire into `RepoAssimilationQueueCard.tsx` for imported repo navigation
- [ ] Add incremental re-index on file save (watch mode)

---

### 6. academic-research-skills → Feynman workflow extension
**Repo:** `Imbad0202/academic-research-skills`  
**Lane:** `VAULT / Feynman`  
**Code win done:** `lib/assimilation/reconCodeIntelBridge.ts` (routing reference)

**Remaining implementation:**
- [x] Add structured paper search filters (field, date, citation threshold) to `lib/feynmanResearch.ts`
- [x] Implement citation extraction from paper body in `lib/feynmanResearch.ts`
- [x] Add methodology critique framework to Feynman verifier stage
- [x] Implement reproducibility scoring (paper provides enough to replicate?)
- [ ] Add literature gap analysis to literature review workflow

---

### 7. 12-factor-agents → Agent architecture hardening
**Repo:** `humanlayer/12-factor-agents`  
**Lane:** `agent-platform / architecture`

**Remaining implementation (prioritized by impact):**
- [ ] Factor 3: Add explicit context window budget to `lib/ai.ts` (hard token limit, trim policy)
- [ ] Factor 6: Implement structured pause-and-ask approval gates for irreversible agent actions
- [ ] Factor 8: Extend `lib/feynmanContinuity.ts` to a general agent execution checkpoint
- [ ] Factor 4: Add JSON schema validation for tool argument payloads in `lib/security/toolCapabilityPolicy.ts`
- [ ] Factor 2: Externalize all loop/branch/retry logic from prompts into TypeScript control flow
- [ ] Factor 5: Create unified serializable agent execution state record
- [ ] Factors 1,7,9,10,11,12: Document and implement progressively

---

### 8. mattpocock/skills → TypeScript skill taxonomy
**Repo:** `mattpocock/skills`  
**Lane:** `skills / ORBIT`

**Remaining implementation:**
- [ ] Document a TypeScript skill taxonomy for ORBIT covering narrowing, generics, inference, branded types
- [ ] Create test-gated exercises for ORBIT TypeScript discipline
- [ ] Build progressive skill paths with prerequisites for the skills system

---

## P1 — Markets, RECON, Orchestration

### 9. TradingAgents → Multi-agent ALPHA
**Repo:** `TauricResearch/TradingAgents`  
**Lane:** `ALPHA`

- [ ] Decompose `TradeThesisPanel` into separate analyst, risk, and sentiment agents
- [ ] Add agent debate mechanism: bull/bear agents argue thesis before final recommendation
- [ ] Implement backtesting loop for historical signal evaluation

---

### 10. Dexter → Autonomous financial research agent
**Repo:** `virattt/dexter`  
**Lane:** `ALPHA / INTEL`

- [ ] Add SEC filing reader (EDGAR API) to ALPHA lane
- [ ] Add earnings call transcript ingestion and NLP extraction
- [ ] Implement structured JSON investment thesis output with scored sections

---

### 11. Maigret → RECON username OSINT
**Repo:** `soxoj/maigret`  
**Lane:** `RECON / OSINT`

- [ ] Implement username sweep route `app/api/recon/username-sweep/route.ts`
- [ ] Build site check database subset (top 200 platforms)
- [ ] Add structured person report output
- [ ] Implement recursive username extraction (follow aliases)
- [ ] Add proxy routing for OSINT requests (with CloakBrowser privacy patterns)

---

### 12. Symphony / Ruflo → Agent orchestration patterns
**Repos:** `openai/symphony`, `ruvnet/ruflo`  
**Lane:** `agent-platform / orchestration`

- [ ] Add typed handoff contracts between Nexus agents
- [ ] Implement parallel agent execution with synchronized result merging
- [ ] Add conditional branching in agent flows based on output values
- [ ] Add per-step retry with exponential backoff policy

---

### 13. Umbrel → Self-host UX patterns
**Repo:** `getumbrel/umbrel`  
**Lane:** `deployment / desktop`  
**Note:** Reference-only. OpenClaw runtime excluded.

- [ ] Apply app-store UX to COMMAND tab for managing optional Nexus modules
- [ ] Implement per-service health dashboard in COMMAND (CPU, RAM, status)
- [ ] Design guided onboarding wizard for desktop app first-run

---

### 14. CloakBrowser → RECON privacy model
**Repo:** `CloakHQ/CloakBrowser`  
**Lane:** `CYBER / RECON`

- [ ] Document fingerprint threat models in CYBER docs
- [ ] Implement tracker blocking guidance for RECON outbound requests
- [ ] Wire proxy rotation into maigret OSINT requests

---

### 15. RuView → ESPectre IoT extension (deferred)
**Repo:** `ruvnet/RuView`  
**Lane:** `IoT / ESPectre`  
**Status:** Deferred pending IoT lane maturity.

- [ ] Evaluate WiFi CSI sensing as an ESPectre capability when IoT lane is active

---

## P2 — Reference Patterns (low-code, high-value documentation)

These repos have 1-2 patterns worth documenting and adapting. No major code work.

| Repo | Pattern to adapt | Nexus surface |
|------|-----------------|---------------|
| openhuman | Long-term user preference model | HQ agent persona |
| jcode | Semantic code chunking for LLM context | RECON / ORBIT |
| 12-factor: Factor 11 | Event-driven agent invocation | COMMAND automation |
| documenso | PDF rendering in browser (react-pdf) | VAULT / INTEL |
| chatwoot | Conversation UI: thread grouping, quick replies | HQ HomeChat |
| plausible | Lightweight event API for local usage telemetry | COMMAND |
| penpot | Design token JSON export for theme system | Theme system |
| cal.com | Availability computation and webhook event schema | COMMAND |
| listmonk | Single-binary embedding pattern | Desktop runtime |
| formbricks | Conditional logic for multi-step agent wizards | COMMAND |
| ERPNext | DocType form generation and report builder UX | INTEL |
| varnan-opendirectory | Hierarchical taxonomy for assimilation catalog | assimilated-ecosystem.md |

---

## P3 — Password Manager Pattern Catalog

All 10 password managers are catalogued with `excluded` for core product and `pending`
for specific patterns. No active implementation planned. Patterns available for reference:

| Pattern | Repos | Value |
|---------|-------|-------|
| E2E client-side encryption | vaultwarden, bitwarden, padloc | VAULT crypto model reference |
| Argon2 key derivation | keepassxc | VAULT key derivation reference |
| Stateless password derivation | lesspass | VAULT passphrase utility |
| Offline-first PWA sync | keeweb, padloc | PWA offline improvements |
| Git as encrypted data store | gopass | Settings security reference |
| Hierarchical secret paths | gopass | API key organization UX |
| Secure password generator | keepassxc | VAULT utility |
| SRP authentication | padloc | Future auth pattern reference |
| Desktop UX: vault, tray, secure input | buttercup | Tauri desktop reference |
| Plugin architecture | keeweb | Skills system reference |

---

## Completion Criteria

A wave-23 repo matrix can move to `complete` when:
1. All pending capabilities are either implemented (with proof) or explicitly excluded
2. All `adapted`/`implemented` capabilities have valid proof paths
3. `npm run source:parity:check` passes for that matrix

**Current validation status:** Run `npm run source:parity:check` to confirm all 44
matrices pass the validator (no inventory-pending rows remain, all pending rows have
reason strings, all excluded rows have valid conflict + reason).
