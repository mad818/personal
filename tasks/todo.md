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

## Next Up
- [ ] Telegram bot integration (message agent from phone) — do last

## In Progress
- [ ] (empty)
