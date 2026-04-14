# Nexus Prime System State

This file is the canonical source of current reality for Nexus.

Use it for:

- latest shipped tranche
- active blockers
- release posture
- known environment issues
- the active Next Up queue

Do not use it for:

- long historical batch logs
- generalized engineering rules
- stable product intent

## Latest Shipped

- XR1 Comprehensive Assimilation is now live as a native multi-surface tranche instead of a repo-idea queue item: `market-review` ships as a governed workflow pack and exact ALPHA focus target; ALPHA now carries a compact market-review support rail that writes deterministic compiled pages into VAULT; VAULT compiled pages now honor `workflowId` exact-session filtering, surface a compact recent-durable-thread hot cache, and render dedicated market-review / OSINT casefile cues; RECON and CYBER now share a passive-first OSINT casefile loop that files deterministic durable casefiles through the existing memory-pages contract; VEHICLE session bundles remain on `nexus-vehicle-session-v1` but now accept an optional advisory-only `radar` block for later passive sensor continuity; and SKILLS plus RESOURCES now expose compact XR1 playbooks and guidance entries without widening the shell into new tabs, tool catalogs, or flight/trading automation.
- A6 Governance Control Plane and Cyber Pack Baseline is now live as a full native control-plane tranche: shared governance metadata now covers skills, workflow packs, assistant capabilities, and key exact-session continuations through `lib/governanceCatalog.ts`; `cyber-triage` now ships as the first governed cyber workflow pack baseline; assistant capability detection and HQ continuation staging now carry approval-aware governance posture instead of relying on route-only risk hints; SKILLS/System Brain now acts as the operator-facing governance inventory; HQ, COMMAND, and RESOURCES inherit the same compact governance posture through readiness lanes; and CYBER triage now carries a quiet governed support rail that stages RECON and VAULT follow-through without widening the shell into a dashboard wall.
- A5 Efficiency Ops Completion is now live as a balanced backend-plus-shell tranche: the scheduler now writes a sanitized recurring-mission efficiency source snapshot under `.nexus/metrics`, runtime eval carries nested scheduler-efficiency posture with latest/history artifacts under `docs/metrics/scheduler-efficiency-*`, COMMAND now hosts an `Efficiency Ops` chamber with lane usage, cache/batch proof, repair candidates, and bounded execution ledger context, HQ continuity now summarizes the same ops spine compactly, SKILLS and RESOURCES now inherit quiet efficiency/readiness posture, and the runtime trend surface can run and display scheduler-efficiency proof alongside forecast and runtime eval without widening Nexus into another dashboard.
- A7 Forecast Evaluation and Readiness is now live as an eval-first forecasting tranche: Nexus now has a native forecast contract plus TimesFM-compatible provider metadata, a deterministic `native_baseline` rolling backtest recorder that persists latest/history artifacts under `docs/metrics/forecast-eval-*`, protected forecast read/run endpoints under `/api/metrics/runtime-eval/forecast*`, nested forecast posture inside the runtime-eval lane, a quiet Forecast Lab support rail on ALPHA, and compact forecast-readiness signals inside HQ/COMMAND support posture without adding forecast overlays or decision automation.
- Advisory hardening and simplification follow-on is now live: the TradingView embed no longer uses `innerHTML` for third-party widget config, the agent verification runner now resolves tracked task artifacts from an explicit repo root instead of inline `../` path climbs, `SettingsDrawer` now hydrates `/api/settings` through one shared loader instead of duplicating state-sync fetch logic, `OfficeRoom3D` now accepts a compact control contract instead of a long callback prop chain, and the HQ prompt builder now carries persona suffixes through one function instead of a redundant wrapper.
- Full secret lockdown is now live as a repo-wide hardening layer instead of a source-only lint: `security-scan` now walks tracked files across app/components/lib/docs/public/root assets, Husky runs staged plus pre-push secret checks, CI now enforces tracked-file and history audit passes, temp/demo artifacts were sanitized to canonical local-only placeholders, and secret posture is now exposed to the UI only as booleans/counts through `/api/settings` and the protected status surfaces.
- Native fortification posture is now visible inside the shell instead of living only in scripts: HQ continuity, COMMAND doctrine rail, and RESOURCES support rails now share an operator-readiness lane that summarizes secret posture, provider readiness, guarded browser-ops posture, workflow queue strength, memory lifecycle state, and capability-audit signals without widening those routes back into module walls.
- Claude-Mem-style lifecycle posture is now deeper and deterministic inside VAULT and COMMAND: memory artifacts now carry citation IDs, lifecycle state, next-action guidance, and sensitivity tags; `/api/memory/stats` now exposes lifecycle summary plus compact previews; and memory surfaces now show promote/compact/reopen posture without reviving ambient memory injection.
- Native assimilation is now live as a release-safe shell extension instead of a launcher sprawl: COMMAND now exposes governed workflow queue, owner, handoff, and review-gate posture; HQ continuity notes now surface the same ops spine; VAULT now summarizes citation-ready recall, compaction backlog, and reopen lifecycle; guarded browser-ops readiness is available through `/api/recon/status` for COMMAND and RECON; and SKILLS plus RESOURCES now expose a native capability audit so Multica, xyOps, Lightpanda, Claude-Mem, and autoskills patterns land inside existing routes instead of as separate products.
- GA route condensation is now live as a shared chamber grammar: each route resolves a lead chamber, support rail, and continuity strip through the surface-condensation registry; COMMAND, VAULT, RESOURCES, ALPHA, and CYBER now merge adjacent internal views into fewer switchable chambers instead of rendering card walls; and deeper HQ support surfaces now sit behind progressive disclosure so the chronicle and room stay primary.
- Curated upstream ecosystem integrations are now staged inside RESOURCES instead of being dumped into the shell: Multica, Lightpanda Browser, Claude-Mem, xyOps, and autoskills are surfaced as chamber-aware external-stack references so Nexus can absorb browser-ops, memory, scheduler, and skill-system ideas without widening the UI. `udemy-downloader-gui` was intentionally not integrated because it is off-mission and carries avoidable policy/TOS risk.
- The Aegis cinematic systems tranche is now live across the GA shell: routes resolve to explicit atmosphere, sequence, hero-media, and signal-motion specs; shell depth planes and chamber spotlighting are now shared CSS/SVG layers; HQ chronicle order/dispatch/handoff states now animate as a ritual loop; and the HQ room now uses scene-cue camera drift plus mood lighting so the 3D sanctum reacts to live command state instead of sitting beside it.
- The sanctum redesign no longer stops at recolor: HQ now opens with a proclamation chamber, doctrine tower, sequenced mission rail, and utility rail that read as a single room; the toprail tabs now behave like numbered sector studs; and shared module/composer controls now use the same harder-edged command-plate geometry instead of falling back to rounded dashboard chips.
- `npm run type-check` is stable again because baseline verification now runs through `tsconfig.typecheck.json`, which intentionally omits the transient `.next-e2e` type tree even when Playwright builds rewrite `tsconfig.json` for the isolated auth/browser lane.
- Local `main` is now realigned to `origin/main`, while the previously diverged history and dirty worktree were preserved on `codex/preserve-main-2026-04-11` so session startup no longer depends on reconciling `main` first.
- `npm run handoff:pull` is now branch-safe during session startup: when `git pull --ff-only` hits a diverged local branch, it falls back to `git fetch origin main`, refreshes remote refs, and leaves the dirty worktree/history untouched instead of hard-blocking the session.
- Sanctum completion is now live across the GA shell: the app now uses an ultramarine/brass/iron plate system with original sanctum SVG framing, the toprail reads like a command dais with engraved sector studs, HQ opens as a proclamation chamber plus doctrine tower and continuity strip, and shared routes now inherit the same command-plate language instead of falling back to premium-dashboard cards.
- The Aegis cinematic continuation tranche is now live: HQ chronicle/composer now reads as a cinematic command feed, route heroes use explicit per-sector media composition rules, and the HQ room now shifts lighting/emissive posture from shared mission/runtime scene cues under the global motion profile.
- The Aegis motion and graphics upgrade is now live: the global starfield was replaced by a route-aware ambient renderer, page transitions and toprail active states now use sector-aware motion presets, HQ VFX now obey a global motion profile, and command pings/live ribbons now read as part of the shell instead of bolted-on widgets.
- The Aegis flagship visual upgrade is now live: the shell and toprail have stronger sector identity, HQ now puts the live console ahead of the strategium so the chronicle stays primary, and shared module cards/sections carry a calmer premium hierarchy across COMMAND and RESOURCES.
- HQ now uses deterministic selective context loading instead of linear prompt accretion: the 4-file spine is sliceable through `/api/project?section=...&slice=...`, context lanes choose a bounded manifest, and SKILLS/System Brain now exposes the last context-policy report for diagnostics.
- Context Spine Consolidation is now the active canonical context model: `AGENTS.md`, `docs/STANDARDS.md`, `docs/SYSTEM_STATE.md`, and `docs/PROJECT_BIBLE.md` are the live context spine, while legacy handoff/task files are compatibility mirrors only.
- The research/study stack is already in place: DeepTutor + MemPalace assimilation and Claude Scholar assimilation landed, so HQ, VAULT, RESOURCES, and SKILLS now support guided learning, memory mining, workflow-pack research, and repo-bound project memory.
- The authenticated-shell browser baseline is green again: `auth:e2e`, `hq:e2e`, `route:e2e`, and `tabs:e2e` were recovered under the isolated Playwright auth/shell contract.

## Active Blockers

- Local Docker proof is still blocked because Docker is not currently available on this machine.
- The target-runtime gate now reads repo-root `.env.local`, but the current project-local config still does not define `NEXUS_RELEASE_BASE_URL`, so the combined `FD2`/`FD3` proof remains blocked until the real Coolify host is added there.
- A live runtime on `127.0.0.1:3000` can still block guarded build flows until it is intentionally stopped.

## Release Posture

- Current stage: late internal beta / release-candidate hardening for the web lane.
- Highest-value milestone: first web deployment proof, not another major feature tranche.
- First release remains web-only and GA-scope only: `/hq`, `/command`, `/intel`, `/alpha`, `/cyber`, `/recon`, `/vault`, `/resources`.
- Desktop remains the second release wave after the web lane is proven in staged hosting.

## Known Environment Issues

- `handoff:pull` now succeeds through a fetch-only fallback when local `main` is diverged, so session startup is no longer blocked by ahead/behind history.
- The active working branch is currently `codex/preserve-main-2026-04-11`, which intentionally preserves the formerly diverged local history and dirty worktree while local `main` stays aligned to `origin/main`.
- Docker CLI is unavailable on this machine, so `FD2` cannot be proven locally here yet.
- Target-runtime proof now auto-loads repo-root `.env.local` for `NEXUS_RELEASE_BASE_URL` and `NEXUS_TOKEN`, so `npm run launch:gate:target` no longer requires inline env export when the local operator file is populated.
- The repo-local deployment docs intentionally use placeholder hostnames such as `your-host.example`, `target-host.example`, and `<staging-host>`; no real staging hostname is committed under `docs/`, `scripts/`, `.github/`, or env examples, and the current `.env.local` still needs the operator's real Coolify domain.
- The preserved-branch candidate now has a fresh `.nexus-release-boundary.json` capture on `codex/preserve-main-2026-04-11`, and `npm run release:boundary` plus `npm run launch:gate` both pass again on that captured state.
- Local release proof surfaced and closed two deployment-gate regressions during this session: the forecast and scheduler-efficiency runtime-eval endpoints now have explicit route-policy coverage, and their protected `run` handlers now emit direct no-store protected responses.
- Some local shells still do not expose a working `vitest` binary even though repo-level verification and browser harnesses are green.
- Authenticated Playwright suites should still run sequentially on Windows because they share the `.next-e2e` dist dir, but `type-check` no longer depends on that transient folder and `clean-next` now retries removal before failing.

## Next Up

- Active program: FD2 Remote Artifact Proof — XR1 is now shipped locally, so the top follow-through returns to the staged deployment proof lane once repo-root `.env.local` carries the real Coolify hostname.
- [x] XR1 — Comprehensive assimilation program: keep Nexus native to its existing shell, routes, governance posture, and trust boundaries while mapping the current external source set into three sequenced subprograms instead of vendoring third-party products
- [x] MR1 — Market Research Workbench: adapt the DefiLeo trader-journaling cue plus reference inputs such as `public-apis`, `ai-engineering-from-scratch`, and the existing `timesfm_companion` contract into governed thesis review, loss review, and emotion-aware market continuity across `/hq`, `/alpha`, and `/vault` without adding autonomous trading or a new top-level route
- [x] MO1 — Memory + OSINT Casefile Loop: adapt `claude-obsidian`, `D4rk_Intel-OSINT-Investigative-Toolkit`, and `public-apis` as native patterns for VAULT memory stewardship plus passive-first RECON/CYBER case progression without bundling third-party binaries, widening the shell into a tool catalog, or relaxing the current advisory boundary
- [x] VR1 — Vehicle + Radar Readiness: adapt `PLFM_RADAR` and reference-only learning patterns from `ai-engineering-from-scratch` into `/vehicle` readiness, onboarding, artifact packaging, and future radar session continuity without adding RF control, flight-critical behavior, or new public routes
- [ ] FD2 — Blocked on the real staged Coolify hostname in repo-root `.env.local`; once present, stand up the first Coolify/VPS staging deployment from the repo-root `Dockerfile` with conservative web-self-hosted defaults and the preserved candidate branch `codex/preserve-main-2026-04-11`
- [ ] FD3 — Blocked on FD2 host config; run `npm run launch:gate:target` against that exact host after repo-root `.env.local` carries the real staged `NEXUS_RELEASE_BASE_URL` and local `NEXUS_TOKEN`
- [ ] FD4 — Blocked on staged-host proof; capture remote `/api/diagnostics`, GA route/manual smoke, and the focused A6 CYBER/SKILLS/HQ/COMMAND staging pass on the staged host
- [ ] FD5 — Blocked on staged-host proof; document the first production rollback target and promotion checklist before going live
- [x] A6 — Add shared governance metadata (risk tier, approval requirement, domain tags, operator-only/automation posture) and cyber pack baseline across skills, workflow packs, assistant capabilities, readiness lanes, and CYBER support rails
- [ ] A7b — Blocked forecast execution lane: compare a TimesFM companion provider against the native baseline only after decision-lift measurement and staging proof are stable

## Compatibility Tranche

- `CLAUDE.md`, `tasks/todo.md`, `tasks/lessons.md`, and `docs/AGENT_HANDOFF.md` remain in the repo for compatibility only.
- Historical execution detail remains in `docs/plans/`, `docs/ideas/`, and git history.
