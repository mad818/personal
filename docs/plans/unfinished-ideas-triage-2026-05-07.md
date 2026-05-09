# Unfinished Ideas Triage - 2026-05-07

## Purpose

This is the working ledger for unfinished, half-implemented, blocked, or stale ideas across Nexus Prime / Homefront and the private Aether Reliquary lane.

It reconciles the current repo truth from `tasks/todo.md`, `docs/SYSTEM_STATE.md`, `tasks/vision-roadmap.md`, `docs/ideas/*`, and recent feature specs into one ranked queue. It does not add routes, does not make the RPG a public product surface, and does not wire real drone or hardware control.

## Status Vocabulary

- `complete`: shipped or accepted by the repo's fallback proof lane.
- `open-ready`: can be worked locally now.
- `blocked-external`: waiting on a real external prerequisite such as approved assets, a staged host, Docker, hardware, or manual branch acceptance.
- `stale/superseded`: older item is represented by newer shipped work, or remains open only because Windows Playwright proof is blocked.
- `rejected`: deliberately not moving forward.

## Ranked Completion Queue

1. Proof and hygiene baseline: keep merge-marker sweep, `verify`, build/runtime health, route checks, and handoff sync as the first closeout gate for every tranche.
2. Private RPG closure: finish high-fidelity prologue visuals, asset pipeline ledger, release gates, and acceptance proof while keeping `/hq` route-stable and private.
3. Vehicle/drone readiness: complete for the current no-hardware phase; keep future work to simulation, passive telemetry, and artifact packaging until real hardware arrives.
4. AI operator workflow gaps: complete for the current shared-dispatch phase; future improvements should deepen proof and proposed-edit UX without adding a second chat system.
5. Release engineering blockers: leave FD2/CP2 blocked until the real staged host/Docker path exists, but prepare the runbook and diagnostics capture flow so proof becomes executable immediately.

## Audit Ledger

| id | source | surface | status | blocker | nextAction | proofRequired | ownerArea |
| --- | --- | --- | --- | --- | --- | --- | --- |
| PROOF-HYGIENE-BASELINE | `tasks/todo.md`, repo state | repo-wide | complete | none | Keep as first gate for every future tranche. | merge-marker sweep, `type-check`, `verify`, `build`, route health, handoff sync | source hygiene |
| MW6FR1-ARPG-FIRST-TOWN-RELEASE-SLICE | `tasks/todo.md`, `docs/SYSTEM_STATE.md` | private `/hq` RPG | complete | browser-suite proof only; Windows Playwright `spawn EPERM` | Close the stale checkbox; later MW6FR2-FR9 town slices already depend on this foundation. | accepted fallback proof: ARPG checks, type/build/verify, `/hq` HTTP 200 | private RPG |
| MW6FR2-FR9-VEYRHOLD-RUNTIME | `tasks/todo.md`, `docs/SYSTEM_STATE.md` | private `/hq` RPG | complete | none | Treat Veyrhold as the first playable town foundation. | ARPG content/production/release checks plus route health | private RPG |
| MW6V-ENEMY-BOSS-HIFI-STORY-INTRO | `tasks/todo.md` | private `/hq` RPG | stale/superseded | proof-held by local Playwright; content appears implemented | Reconcile after a fresh browser-capable shell or accept fallback proof in a dedicated cleanup pass. | ARPG visual/content/assets/production/release checks plus `/hq` proof | private RPG |
| MW6V-ARPG-PROLOGUE-VISUAL-ASSETS | `tasks/todo.md` | private `/hq` RPG | open-ready | approved high-fidelity art not created yet | Create and wire the next illustrated prologue batch with provenance, manifest entries, and Adventure/Journal/People visibility. | `arpg:illustrated:generate`, ARPG validators, `build`, `/hq` proof | private RPG |
| MW6V/W-ARPG-ARSENAL-VISUAL-ITEMIZATION | `tasks/todo.md` | private `/hq` RPG | stale/superseded | only clean browser proof is missing | Close only after fresh browser proof or a focused fallback-proof acceptance pass. | ARPG validators plus `/hq` Kit/Armory proof | private RPG |
| MW6V-REAL-ASSET-INTAKE | `tasks/todo.md` | private `/hq` RPG | blocked-external | no approved pack files in `assets/arpg/intake/raw/` | Keep optional; resume only when CC0/operator-approved assets exist locally. | asset ledger, manifest, `arpg:assets:check`, preview proof | private RPG assets |
| MW6V-ILLUSTRATED-PLAYFIELD-CONSISTENCY | `tasks/todo.md` | private `/hq` RPG | stale/superseded | proof-held by browser-worker failures | Reconcile in a cleanup pass; do not create new art until prologue visuals are approved. | build/verify plus `/hq` playfield proof | private RPG |
| MW6V-HQ-GAME-FOCUS-LAYOUT | `tasks/todo.md` | private `/hq` RPG | stale/superseded | browser-worker proof only | Reconcile after the next accepted HQ browser proof. | type/build/verify plus game-focus DOM proof | private RPG |
| MW6U-ARPG-ASSET-PIPELINE | `tasks/todo.md` | private `/hq` RPG | open-ready | none | Build the production asset lane, ledger, provenance, import conventions, and validation gates. | `arpg:assets:check`, `arpg:production:check`, `verify` | private RPG assets |
| MW6AA-ARPG-TESTING-RELEASE-GATES | `tasks/todo.md` | private `/hq` RPG | open-ready | Windows browser-worker instability affects full E2E | Add deterministic content/save/combat/item/city validators and a fallback proof matrix for browser acceptance. | ARPG validators, `build`, `verify`, runtime route health | private RPG release |
| V0.1-VEHICLE-SIMULATED-TELEMETRY | `tasks/todo.md` | `/internal/vehicle` | complete | none | Keep replay scenarios review-first; resume only for new scenario coverage. | `vehicle:readiness:check`, `/internal/vehicle` route proof | vehicle/drone readiness |
| V0.2-VEHICLE-TELEMETRY-SCHEMA | `tasks/todo.md` | `/internal/vehicle`, Vault | complete | none | Keep passive telemetry schema stable until real hardware creates a new proof need. | type-check, vehicle readiness validator, route proof | vehicle/drone readiness |
| V0.3-VAULT-FLIGHT-LOG-PACKAGING | `tasks/todo.md` | `/vault`, `/internal/vehicle` | complete | none | Keep simulated incident package visible as Vault-ready proof. | route proof, artifact fixture check | vehicle/drone readiness |
| V1.1-F450-BENCH-CHECKLIST | `tasks/todo.md`, `docs/plans/f450-drone-readiness-plan.md` | Resources / vehicle | complete | no real bench execution in repo | Keep checklist as props-off readiness only until hardware arrives. | docs/source proof and route proof | vehicle/drone readiness |
| V1.2-PASSIVE-TELEMETRY-BRIDGE | `tasks/todo.md` | `/internal/vehicle` | complete | real hardware absent | Keep passive ingest protected and read-only; no flight-critical control path. | schema tests, route proof, safety copy | vehicle/drone readiness |
| AI-P1-P3-OPERATIONAL-PHASE-TASK-PLAN | `tasks/vision-roadmap.md`, assistant dispatch specs | HQ / CommandBar | complete | none | Preserve the shared operator workflow model; future changes should refine existing panels. | `eval:agent-runtime:ci`, `verify`, `/hq` and `/command` proof | AI operator |
| AI-P2-P6-PROPOSED-EDIT-CHANGELOG | `tasks/vision-roadmap.md` | HQ / Vault | complete | real diffs remain owned by `ProposedEditPanel` | Keep proposed-edit posture review-gated; deepen only after diff UX asks for it. | planner tests, route proof, mutation-gate checks | AI operator |
| AI-P7-SKILL-VISIBILITY | `tasks/vision-roadmap.md`, Resources | HQ / Resources / CommandBar | complete | none | Keep skill/tool visibility compact inside the shared workflow panel. | `eval:agent-runtime:ci`, route proof | AI operator |
| EXTERNAL-LINK-BATCH | `docs/ideas/external-links-mapping.md`, `docs/ideas/assimilated-ecosystem.md` | Resources / Recon / Cyber | stale/superseded | already mapped as ideas/reference only | Do not vendor code; only revisit when a concrete route asks for a pattern. | docs/source proof | ideas intake |
| FD2-CP2-RELEASE-PROOF | `tasks/todo.md`, `docs/plans/nexus-completion-program-2026.md` | release | blocked-external | real staged Coolify/VPS hostname, Docker proof, and local env are not present | Prepare runbook and diagnostics capture flow; do not mark release proof complete. | Docker/staged host proof when env exists | release engineering |
| UXA3-REPLAY-WORKTREE-RETIREMENT | `tasks/todo.md` | repo hygiene | blocked-external | requires accepted merged `main` and no rollback/reference need | Keep as manual cleanup only. | branch/worktree audit after acceptance | source hygiene |
| OLDER-M2-M3-M4-QUEUE-RETIREMENT | `tasks/todo.md` | repo hygiene | blocked-external | depends on UXA3/manual acceptance | Do not delete branches/worktrees during feature work. | branch/worktree audit plus Mario approval | source hygiene |

## Closeout Criteria

- `tasks/todo.md` keeps active open-ready work separate from blocked/manual watchlist items.
- Completed-but-unchecked proof-held items are reconciled only when their fallback proof is explicit.
- Vehicle/drone work remains simulation, telemetry, documentation, and passive artifact readiness only.
- Aether Reliquary remains private inside `/hq`; public Homefront positioning stays separate.
- Release engineering stays blocked until the real staged host/Docker/env path exists.
