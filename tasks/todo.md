# Nexus Prime — Task List

## Status: Active Development

## Completed
- [x] Phase 1–4: Full React/Next.js migration, all 8 tabs
- [x] Settings panel (slide-over, all API keys + personal profile)
- [x] Data hooks: usePrices, useArticles, useCVEs
- [x] DataLoader components wired into all pages
- [x] HOME page: PricesLoader + FearGreedLoader + ArticlesLoader
- [x] COMMAND: BTC KPI + Fear & Greed live
- [x] ALPHA: live prices + 7-day SVG sparklines
- [x] SIGNALS: live articles + bias tags (bullish/bearish/neutral) + bookmark button
- [x] CYBER: live CVEs sorted by severity (CRITICAL → LOW)
- [x] VAULT: saved articles persisted across sessions
- [x] Business Builder — 5-stage pipeline, checklist, MRR tracker, AI action plan
- [x] Leaflet quake map (OPS tab, USGS M2.5+, dark tiles)
- [x] Strategy frameworks: Porter 5, VRIO, BCG, JTBD, SaaS tracker (INTEL tab)
- [x] AI Job Risk Analyzer — Karpathy rubric, 23 benchmarks, personalised action plan
- [x] Agent loop (lib/agent.ts): full ReAct tool-use for Claude + Ollama
- [x] Ollama wired: qwen3:14b default, full function-calling loop
- [x] Tool executor API (/api/tools): web_search, fetch_url, write_file, read_file, list_files, calculate
- [x] HomeChat: live tool-call display, collapsible badges
- [x] Type check: passing in current branch (tsc --noEmit)
- [x] Map all 43 external links to Nexus modules with ROI/safety notes (`docs/ideas/external-links-mapping.md`)
- [x] Fix wiring: CameraGrid uses `eventBus` `camera:alert` (not `window` listener)
- [x] Fix wiring: SecurityAlerts prefers `store.securityAlerts` with demo fallback
- [x] Fix wiring: SystemStatusFooter refresh trigger now drives GlobalDataLoader refresh completion event
- [x] HQ Prime Drawbridge mode: edit layout toggle + save/reset + persisted object positions
- [x] HQ Prime renderer toggle: 2D/3D switch with persisted renderer preference
- [x] HQ Prime 3D phase 1.5: animated lighting/window particles + simplified furniture meshes
- [x] Proposed edits quality-of-life: auto-apply office edits option to reduce manual approvals
- [x] Home HQ: MemoryPanel toggle + lazy-load 3D room to reduce initial bundle cost
- [x] Resolve stale TaskPlanPanel states so interrupted/error runs don't leave partial plans onscreen
- [x] Cron scheduler UI: create/toggle/delete recurring jobs with persisted settings + runner
- [x] OTX threat feed: fetch via server-side key path (`/api/threat-intel`) with graceful fallback UX
- [x] Momentum scanner (ALPHA tab: ranked score + buy/neutral/sell labels)
- [x] Prime HQ phase 2: 3D furniture drag handles + no-overlap guardrails
- [x] Prime HQ phase 2: manual Scene Mode controls (Morning/Afternoon/Night + motion intensity)
- [x] Prime HQ phase 2: layout presets (Focus / War Room / Night Ops)
- [x] Prime HQ phase 3: convert remaining office visuals/agent representations to native 3D markers
- [x] Final QA pass across Home 3D + CYBER OTX + scheduler flows
- [x] HQ migration: achieve full 2D -> 3D parity for office visuals/behaviors, make 3D-only renderer, then remove legacy 2D office components
- [x] Chat capability routing: whenever chat invokes a skill/tool/module, auto-open the matching tab/page across Home + HQ flows (and keep mapping centralized for future features)
- [x] Operational profiles: make War Room and Night Ops drive behavior (routing, scheduler cadence, alert policy), not just visuals
- [x] Operational profiles phase 2: mode-specific auto jobs with opt-in toggles + strict cooldown/rate limiting
- [x] Operational profiles phase 3: auto-jobs preview with Run now/Force controls + compact modernized roster/status card UI polish
- [x] Design-token normalization pass: shared spacing/radius/type/elevation tokens + compact dashboard container alignment
- [x] HQ phase 4: mode briefing panel + Night Ops handoff file writeback + responsive office/chat split ratio
- [x] HQ UX: add draggable splitter so office/chat panes are user-resizable
- [x] Persist HQ splitter height in settings across reloads
- [x] HQ UX: add visible Reset Layout chip for office/chat splitter
- [x] HQ UX: splitter accessibility + keyboard resize + inline resize feedback
- [x] HQ UX: add Lock Split toggle to prevent accidental drag resizing
- [x] Fix HQ splitter clipping/overdraw by moving controls to dedicated divider row
- [x] HQ UX: compact splitter controls with More menu on narrow widths
- [x] Wall pass: mount SYS + agent roster overlays in office scene and remove overlapping/duplicate chat roster
- [x] Wall overlay polish: reduce roster/SYS footprint, prevent overlap, remove leftover chat note
- [x] UX pass: move status cards to office wall area + convert agent roster to compact non-scroll grid
- [x] Convert wall HUD to true in-scene mounted 3D wall objects (SYS + roster), remove screen-space overlays
- [x] Improve in-scene wall board readability (larger text + better scaling)
- [x] Wall readability pass 2: relocate boards to side walls near agents and enlarge in-scene text scale
- [x] Wall fine-tune: resolve left board overlap and increase right SYS font size
- [x] Wall boards polish: remove cabinet overlap, raise/right-scale SYS text, add interactive hover behavior
- [x] Camera framing pass: zoom in so office fills viewport while keeping wall/window readable
- [x] Add HQ camera presets (Cinematic + Close Ops) with quick toggle controls
- [x] Add future-proof camera profile system + third preset (Wall Readability)
- [x] AI connection pass: inject capabilities block in active HQ prompt pipeline
- [x] AI connection pass: add missing `/api/health` route + fix `/api/project?section=tree` path fidelity
- [x] AI connection pass: align model/provider maps + refresh stale `.claude` rules docs
- [x] Add path-collision guardrail script + CI workflow
- [x] Publish comprehensive project improvement plan map (interactive roadmap)
- [x] Add release summary doc for secure push batches (`docs/releases/2026-03-27-secure-push-summary.md`)
- [x] Phase 1 execution: unify AI task-model routing into shared module (client/server/store aligned)
- [x] Phase 1 execution: add secure `/api/status` diagnostics endpoint (sanitized readiness/health)
- [x] Phase 1 execution: add CI quality gates workflow (`type-check`, `lint`, `path safety`) + docs/env sync
- [x] Research and codify best-practice patterns from major AI agent ecosystems (NVIDIA, Claude, Codex, Cursor, OpenClaw/OpenHands)
- [x] Translate those patterns into a Nexus execution blueprint with phased implementation backlog
- [x] Batch 2 ideas assimilation — Phase A (security scanner + pre-commit hook + CIPHER self-audit), Phase B (NOVA research modes + source credibility + lesson logger), Phase C (RACI model + 5-state machine + handoff template), Phase D (AlphaEarth reference card in INTEL/world), Phase E (Agent Reach Python service + proxy + tools)
- [x] Phase A execution: add tool risk tiering and default high-risk write approval guard in `lib/agent.ts`
- [x] Phase A execution: expose risk metadata in tool-call traces for operator visibility
- [x] Phase A execution: extend `/api/status` with policy + AI routing diagnostics
- [x] Phase A execution: add explicit Settings checkbox for high-risk write approval policy
- [x] Phase B execution: add verification adapter endpoint (`/api/verify`) for type-check, lint, and route smoke
- [x] Phase B execution: integrate mandatory verification pass for permissive write-capable runs and mark degraded when checks fail
- [x] Phase B execution: add run diagnostics schema in store (run id, status, phase timing, failure cause, verification)
- [x] Phase C execution: add context budget bundle + compaction report primitive in `lib/liveContext.ts`
- [x] Phase C execution: wire budgeted live context into HQ send pipeline
- [x] Phase D execution: add reproducible runtime eval harness (`scripts/eval-agent-runtime.js`) and CI gate step
- [x] Phase D execution: add eval threshold policy (`--min-score`) and wire CI to enforce it
- [x] Phase D execution: persist runtime eval artifacts (`docs/metrics/agent-runtime-latest.json`, history jsonl)
- [x] Phase D execution: expose runtime eval policy in `/api/status` readiness diagnostics
- [x] Phase D execution: add weighted eval categories (safety/reliability/ux/observability) with weighted score output
- [x] Phase D execution: expose runtime eval metrics via `/api/metrics/runtime-eval`
- [x] Phase D execution: add in-app Runtime Eval Trend panel in Settings
- [x] Phase D execution: enforce category-level eval thresholds in CI (`safety/reliability/ux/observability`)
- [x] Phase D execution: add HQ Telemetry EVAL chip sourced from runtime metrics API
- [x] Phase D execution: improve eval failure diagnostics output (failed checks + category threshold failures)
- [x] Phase D execution: expand route smoke adapter to include protected endpoint reachability checks (`/api/tools`, `/api/ai`)
- [x] Phase D execution: include latest runtime eval snapshot in `/api/status` diagnostics
- [x] Phase D execution: add per-category breakdown bars in Settings runtime eval trend panel
- [x] Phase D execution: add eval freshness/staleness signal to metrics API and Settings trend panel
- [x] Phase D execution: add one-click runtime eval trigger route (`POST /api/metrics/runtime-eval/run`) and wire button in Settings
- [x] Phase D execution: expose eval category thresholds in `/api/status` readiness payload + `.env.example`
- [x] Phase D execution: add cooldown-managed revalidation runner state for runtime eval trigger route
- [x] Phase D execution: add status rollup grade/degraded reasons in `/api/status` eval diagnostics
- [x] Phase D execution: add HQ “why degraded” hints in EVAL chip (stale/failure count) and auto-refresh cadence
- [x] Phase D execution: add header-level Eval Grade badge in HQ top bar sourced from `/api/status`
- [x] Phase D execution: add Force Run action to runtime eval panel (cooldown override)
- [x] Phase D execution: add explicit degraded reason list (failed checks/category thresholds) in Settings eval panel
- [x] Phase D execution: add copy/export diagnostics actions in runtime eval panel
- [x] Phase D execution: add grade-drop alert signal via store notifications
- [x] Phase D execution: add recent grade breadcrumb tooltip on HQ header eval badge
- [x] Phase D execution: add Open Status deep-link action in runtime eval panel
- [x] Phase D execution: enrich grade-drop notifications with degraded-reason snapshot context
- [x] Phase D execution: add compact header severity icon before eval grade (fresh/failing/stale)
- [x] Phase D execution: replace raw status JSON jump with in-app status diagnostics drawer
- [x] Phase D execution: persist runtime grade-drop incidents into activity timeline log
- [x] Phase D execution: add cooldown-aware backoff policy for repeated runtime eval runner failures
- [x] Phase D execution: expose runtime eval runner backoff state in `/api/status` rollup diagnostics
- [x] Phase D execution: show eval retry-pressure (`BACKOFF`) chip in HQ telemetry HUD
- [x] Phase D optimization: remove stale-closure polling in runtime eval trend auto-revalidate loop
- [x] Phase D optimization: skip telemetry eval polling while tab is hidden and refresh on visibility restore
- [x] Phase D optimization: dedupe `/api/metrics/runtime-eval` reads across HUD, HQ header, and settings via shared short-TTL cache keys
- [x] Phase D optimization: pause HQ header/status polling while tab is hidden and refresh on visibility restore
- [x] Phase D optimization: pause runtime eval panel polling while tab is hidden and refresh on visibility restore
- [x] Phase D optimization: centralize eval grade visual mapping (color/icon) for consistent HQ and telemetry badges
- [x] Phase O2: centralize runtime polling/TTL cadence in `lib/runtimeConfig.ts` and stagger first reads
- [x] Phase O3: memoize heavy 3D office (`OfficeRoom3D`) to reduce re-render churn on polling updates
- [x] Phase O3: memoize `TelemetryHUD` to prevent parent-driven re-renders on eval header polling
- [x] Phase O4: store/state hardening via shallow selectors and derived settings fields
- [x] Phase O5: add shared runtime API schemas/parsers and enforce validated payloads across HQ runtime consumers
- [x] Phase O6: UX reliability polish (consistent “last updated” hints + microstate tightening for runtime surfaces)
- [x] Add Claude Desktop + Cursor workflow doc + `npm run verify` command
- [x] Stranger Things “Beyond Tier” 3D agents: EL dual outer-ring + floating orbs + Hopper beam sweep at quality=high
- [x] Intel/Markets/Cyber: real sub-tabs (URL + persisted Zustand state) + lazy-load all heavy views
- [x] Intel/Markets/Cyber: unified sub-tab UX (shared switcher style, consistent section headers, no debug timestamps)
- [x] Intel: PolymarketFeed UX — sort controls (% hi/lo, volume, closing), summary bar, bracket labels, search, end-date cues
- [x] Markets: clarity pass — section headers, PriceSparklines wired into watchlist view, sizer label added
- [x] Cyber: triage-first view — TriageView correlated CVE/OTX/CISA, priority+source filters, summary strip, TriageCard with left-border priority
- [x] News feeds: extra free RSS sources + GDELT server fallback when thin; client GDELT backup + stable article IDs (`app/api/news`, `hooks/useArticles`)

## Next Up

### Phase 1 — Agent Intelligence (see `docs/plans/ideas-assimilation-plan.md`)
- [x] 1B — Agent prompt sharpening: ORBIT phase-discipline, NOVA research-first, CIPHER triage-first
- [x] 1C — Passive auto-memory: post-run capture hook + session log writer
- [x] 1A — Agentic RAG router: `lib/ragRouter.ts` + per-agent data-source block in prompts

### Phase 2 — Design Pass
- [x] 2A — Typography + spacing audit: normalize 3-level type scale across Settings, HQ HUD, tabs
- [ ] 2B — Simplify pass: dead props + redundant state in OfficeRoom3D, SettingsDrawer, prompts.ts
- [ ] 2C — Animation polish: consistent `var(--t)` usage + drawer exit animation

### Phase 3 — OPS Tab AI Layer
- [x] GeoDeep geospatial layer: local Python service + `/api/geo-scan` + Leaflet toggle (standalone sprint)

### Phase 4 — Automation Backbone
- [x] n8n deployment doc + agent tool wrapper (document like Coolify, runs alongside Nexus)

### PM Cockpit
- [x] PM cockpit Phase A — read-only health strip (see `docs/pm-cockpit-plan.md` + handoff supplement)
- [x] PM cockpit Phase B — interactive daily checklist (Zustand-persisted, copy diagnostics button)

### Always Last
- [x] Telegram bot integration — Batch 7A: `/api/telegram` webhook route + `docs/deployment/telegram.md`

## Batch 3–7 Assimilation (completed 2026-03-28)
- [x] Batch 3A/3D — Filtered live context per agent (`buildFilteredLiveContext`) + memory diff block
- [x] Batch 4A — WCAG 2.1 AA `:focus-visible` global rule + `var(--t)` transition fixes
- [x] Batch 4B/4C — CyberArticleHeatmap transition + drawer slide unified to `var(--t)`
- [x] Batch 4D — Vault tags: `updateArticleTags` store action + SavedArticles tag input/filter/search rebuild
- [x] Batch 5A — `buildDeltaSweep()` in `lib/liveContext.ts`: price/CVE/world-risk delta alerts
- [x] Batch 5B — `hf_papers_search` tool (HuggingFace daily papers, no key)
- [x] Batch 5C — Session-scoped 60 s read cache + cache eviction on patch in `/api/tools`
- [x] Batch 5D — `open_meteo_weather` + `sec_edgar_search` tools added to `/api/tools`
- [x] Batch 6A — `lib/ragRouter.ts`: keyword-first RAG router with 9 domain routes + `buildRagContextBlock`
- [x] Batch 6B — Memento-Skills: post-run lesson proposal UI in OfficeCommandCenter (approve → `log_lesson`)
- [x] Batch 6C — `ScheduledJob` extended with `type`, `outputTarget`, `missionAgent` fields
- [x] Batch 7B — ORBIT TDD discipline added to prompts.ts (ASSERT comment before fn, verify after)
- [x] Batch 7C — `scripts/orbit.js` (`npm run orbit:next`) + `scripts/audit.js` (`npm run audit:full`)
- [x] Batch 7D — NOVA deep research workflow added to prompts.ts (5-tool pipeline → Feynman brief → Vault)

## Completed (2026-03-29 — HQ Graphics Enhancement)
- [x] G1A — Per-desk colored point lights (5 agents + ceiling boosted)
- [x] G1B — CityWindow nightFactor wired: emissiveIntensity + city spill pointLight
- [x] G1C — Ceiling plane + ceiling trim band + AO contact shadow discs
- [x] G1D — Animated wall clock (LiveClock component, real-time hands)
- [x] G2A — TOOL_POSE_MAP + AGENT_WORK_POSE in constants.ts
- [x] G2B — Per-agent work poses (type/read/search/wait/compute) in AgentFloorShadows
- [x] G2C — Rim highlight (BackSide outline mesh, agent-color glow on active agent)
- [x] G2D — Speech bubbles (Html overlay above head, shows active tool name)
- [x] G3A — MatrixOverlay component (canvas-texture column cascade, green rain spawn effect)
- [x] G4A — Bloom post-processing (@react-three/postprocessing v2, vfxQuality gated)
- [x] G4C — Procedural floor tile canvas texture (tile seams + grain, replaces line-segment grid)
- [x] Pixel-agents assimilation plan map (docs/plans/pixel-agents-assimilation-plan.md)

## RECON Tab — OSINT & Privacy (2026-03-29)
- [ ] RECON tab: nav button, HTML panel, switchTab registration
- [ ] RECON API keys: hibpKey, vtKey, shodanKey in DEFAULT_CFG + settings
- [ ] RECON lookups: RDAP/WHOIS, DNS, crt.sh, IP geo, HIBP, VirusTotal, Shodan
- [ ] RECON local tools: WebRTC leak probe, fingerprint entropy, OPSEC score
- [ ] RECON CSS (rc- prefix) + CLAUDE.md tab map update

## In Progress
_(none)_
