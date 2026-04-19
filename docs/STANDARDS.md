# Nexus Prime Standards

This file is the durable rulebook for Nexus. Keep it stable, generalized, and implementation-focused.

Use this file for:

- architecture rules
- engineering rules
- generalized lessons that should survive individual tasks

Do not use this file for:

- current blockers
- current queue ordering
- historical batch narratives
- session ritual

## Architecture Standards

1. Nexus is local-first, self-hosted, free-first, and BYOK. Do not add Nexus-side billing, subscriptions, or mandatory cloud dependencies.
2. The client never calls third-party services directly. External fetches go through `app/api/*`.
3. All AI calls route through `lib/ai.ts`. Provider-specific code belongs behind the shared AI boundary, not scattered through product surfaces.
4. Shared state lives in `store/useStore.ts` and is consumed through narrow selectors.
5. Exact-session routing, focus/view healing, and canonical route normalization belong in the assistant/session registry layer, not in ad hoc UI logic.
6. Durable artifacts, related-note ranking, and promotion behavior must flow through shared continuity contracts, not route-specific heuristics.
7. UI density should stay assistant-first: one strongest continuation, compact guidance, progressive disclosure for secondary actions.
8. Browser/server trust boundaries must stay explicit: protected routes, auth-safe exact-session recovery, and honest degraded states are part of the product contract.
9. When Nexus absorbs ideas from upstream repos, implement them as native behaviors inside existing route, state, and API contracts. Do not widen the public shell into a bundle of embedded third-party products.

## Engineering Standards

1. Read the file section before patching. Never edit blind.
2. Prefer the smallest change that solves the problem.
3. Use `npm run type-check` as the baseline post-edit proof; run additional targeted checks for the touched surface.
4. Wrap async fetches in `try/catch` with silent failure unless the surface explicitly requires hard failure.
5. Use shared helpers and contracts before introducing one-off variants.
6. For multi-step work, update the active program in `docs/SYSTEM_STATE.md`. During the compatibility tranche, mirror only what older tooling still needs elsewhere.
7. Generated or compatibility files must not carry unique state that is missing from the canonical context spine.
8. Historical plans and idea docs can remain in the repo, but they are archive/reference material and not part of the live context ritual.

## Rules by Domain

## Process

1. When Mario says STOP, stop immediately. No tool calls, no responses, nothing.
2. Never mark a task complete without proving it works first.
3. Keep edits small and targeted. Large file edits in one call increase review and failure risk.
4. Read the exact target lines before changing them. Never guess line numbers or surrounding context.
5. Always search for existing patterns before adding new ones.
6. Write the active program or queue change into `docs/SYSTEM_STATE.md` before starting any implementation that spans 3 or more steps.
7. Do not skip features or lose functionality when refactoring.
8. Post-run lesson proposals should never auto-commit. Surface an approval bar first so the human can reject noise before it pollutes the standards set.
9. Before recording a new rule, ask whether it still matters if the triggering task disappears. Rules must generalize beyond the incident.
10. Long-running sessions lose quality as context fills up. Refresh the context spine and continue in a new task before avoidable mistakes compound.

---

## Engineering

1. Avoid the Gemini image generation API in the current setup; it causes ECONNRESET here.
2. Use `Array.from(set)` instead of `[...set]` when `downlevelIteration` is not enabled in tsconfig.
3. Validate JSON files after edits. Multi-edit JSON sessions can leave files truncated.
4. Keep `.npmrc` with `production=false`; Windows-level `NODE_ENV=production` can silently prune devDependencies.
5. Cross-platform git scripts should use argument-based process execution, not shell-quoted `execSync`.
6. `orbit:next` and `audit:full` should surface the current `docs/SYSTEM_STATE.md` queue plus repo health, so the next action is available without re-reading the whole repo.
7. Any durable config or secret file used by both dev and standalone runtimes must resolve from the real repo root, not `process.cwd()`.
8. If middleware policy must react immediately to settings saved at runtime, sync the authoritative mode into httpOnly cookies from the settings route.
9. Never launch the standalone runtime in parallel with a build replacing `.next`; finish `build` first, then boot the runtime.
10. Treat a missing Ollama model as a model-selection problem before declaring a runtime outage.
11. Runtime-targeted release checks must require an explicit target URL or an intentional local-runtime opt-in.
12. Orchestrator scripts should call repo entrypoint scripts directly through Node when possible, not nested shell hops.
13. Standalone runtime launchers must preload `.env.local` into the child environment before booting production Next output.
14. Base TypeScript verification must not depend on transient Playwright or runtime build folders that browser suites create and delete during auth/e2e runs.
15. Repo secret scanning must cover tracked docs, assets, config, and temp artifacts in addition to source files. Block on tracked secret-like content, while keeping broader security-pattern findings advisory unless a tranche explicitly promotes them.
16. Canonical secret examples in tracked files must use obvious local-only placeholders such as `<set-in-local-env-only>` or `replace-with-provider-key`. Never normalize real-looking token strings in docs, SVGs, or demo artifacts.
17. Repo scripts should resolve tracked artifacts from an explicit repo-root constant instead of embedding `../` climbs inline in `path.join(...)`; keep the intended trust boundary obvious to both reviewers and scanners.

---

## UI

1. Chat-triggered capabilities should route through one centralized intent map so tab navigation stays consistent.
2. UI modernization should anchor to shared design tokens first to avoid one-off style drift.
3. Avoid fixed pixel splits for mixed visual/chat layouts; use responsive ratios that keep chat usable on laptop viewports.
4. Resizable panels need visible reset and lock affordances, plus keyboard support.
5. Keep passive telemetry off the chat boundary so the conversation surface stays clean.
6. In-scene UI needs larger typography and stronger spacing than flat UI to remain readable at camera distance.
7. All exact-session links, stale aliases, and focus/view repairs must flow through one shared normalizer plus route-level auto-heal.
8. If multiple assistant cues describe the same turn state, collapse them into one shared guidance contract and renderer.
9. Durable archive artifacts need a shared continuity metadata shape at write/read time; do not leave promotion and reopening to tag heuristics alone.
10. If middleware-visible policy cookies refresh after mount, shared loaders should retry immediately from that success signal.
11. When local-model self-heal is meant to be silent, remove or rewrite every remaining user-visible stale-model warning branch.
12. Each surface should present one dominant focal plane before support modules compete for attention.
13. Page chrome, badges, and status metadata should frame the primary workspace, not fight the headline or main action for visual priority.
14. Motion should indicate navigation, hierarchy, live state change, or meaningful signal updates. Avoid ambient pulse spam and ornamental hover noise.
15. Decorative ambient layers must stay behind the content plane, preserve contrast, and honor both reduced-motion preferences and the global surface motion profile.
16. Flagship visual upgrades should deepen the primary content plane, not create a second competing hero layer above the real work surface.
17. Chronicle and composer motion should communicate dispatch, reply, and handoff state, not mimic generic consumer chat animations.
18. Route hero media must use explicit sector composition rules; background swaps alone are not enough to establish surface identity.
19. When a flagship appearance shift is active, shell, nav, hero, and module surfaces must share one material language. Do not mix soft cyber-glass and armored command-plate idioms on the same screen.
20. First-viewport hierarchy should read as proclamation, doctrine, and continuity. Avoid collapsing flagship surfaces back into equal-weight dashboard cards.
21. When a flagship homage direction is active, use original symbols, masks, and framing assets. Never depend on lifted third-party logos or copied art to sell the visual world.
22. If navigation or controls are meant to read like command plates or studs, their geometry must reinforce that. Avoid default pill-based UI treatments on the flagship shell.
23. If a flagship surface adopts a hardened plate language, secondary prompt chips, segmented controls, and composer actions must inherit that same geometry. Do not let lower sections fall back to soft rounded dashboard UI under a sanctum shell.
24. Cinematic motion must explain hierarchy, chamber entry, live signal change, or command state. Do not animate surfaces just to prove they are interactive.
25. Idle motion must stay in the background. If users notice the ambient layer before the primary workspace, the effect is too strong.
26. The chronicle is the lead camera on HQ. Reply, tool, handoff, and continuity motion should reinforce the command loop instead of competing with it.
27. Route changes should feel like chamber entry, not tab switching. Hero, primary workspace, support rail, and continuity reveal order must stay explicit.
28. Capability audits, workflow ops posture, browser readiness, and memory lifecycle summaries should live in support rails or compact disclosures unless they are the active work surface. Do not let assimilation surfaces grow back into equal-weight card walls.
29. Operator-facing readiness lanes may summarize secret posture, provider readiness, browser posture, workflow queue state, and memory lifecycle, but they must never expose raw secret values or partial secret echoes.
30. Third-party script embeds must pass inline widget config through text nodes or `textContent`, never `innerHTML`.
31. Governance metadata for skills, workflow packs, assistant capabilities, and high-value exact-session continuations must resolve from one shared catalog. Do not let risk tier, approval posture, domain tags, or next-move rules drift into surface-local copies.
32. High-risk continuations must stay assistant-first and stage explicit exact sessions or reviewed actions before write-capable or automation-capable follow-through widens.

---

## Agents

1. Every agent-run exit path must finalize phase and task-plan state to prevent stale UI panels.
2. Keep AI wiring contract-aligned across runtime and docs: capability blocks in prompt path, real `/api` contracts, and no model-map drift.
3. Keep AI model routing in one shared module used by both client and server.
4. Default autonomous write tools to approval-gated mode and surface tool risk tier in traces.
5. For permissive write-capable runs, enforce post-run verification and downgrade status when validation fails.
6. Agent runtime trust improves when run diagnostics are first-class state and visible in the HUD.
7. Route live context through agent-specific filters instead of dumping all signals to every agent.
8. Session-scoped read cache with TTL reduces redundant external API hits; evict on write.
9. Keyword-first RAG routing is preferable to making the model decide its first tool call from scratch.
10. Agent prompts need TDD discipline and deep-research pipelines to enforce quality floors at the prompt level.
11. Keep all agents on the same provider during active optimization sessions unless there is a deliberate measured reason not to.
12. Never render raw model `<think>` traces in operator-visible replies.
13. Ambiguous handle/person/live lookups must fall through to open-web search when domain-specific feeds are weak or mismatched.
14. Never preload more than one workflow pack, one continuity source, and one verification layer into a single assistant turn.

---

## Eval

1. Add lightweight repo-native eval harnesses early so progress can be measured and gated in CI.
2. Eval gates should be threshold-driven, not hardcoded pass/fail forever.
3. Pair CI eval gates with an in-app trend view so quality posture is visible inside the product.
4. CI eval output must explicitly list failing checks and failing category thresholds.
5. Route smoke checks should distinguish unreachable endpoints from auth-protected-but-healthy endpoints.
6. Operational metrics should include freshness age and stale flags, not just scores.
7. Trigger endpoints for expensive health/eval jobs need server-side cooldowns.
8. Summary badges should have drilldown paths and controlled force overrides.
9. Pair runtime-grade badges with exportable diagnostics and history breadcrumbs.
10. Grade-drop alerts should include concise degraded-reason context.
11. Forecasting ships measurement-first: land provider contracts, rolling backtests, artifacts, and readiness posture before adding visible forecast overlays or decision automation.
12. Recurring-mission efficiency ships measurement-first too: expose serializable cache/batch posture and recorded latest/history artifacts before UI surfaces claim optimization gains.

--- 

## Ops

1. When migrating a surface, remove obsolete toggles and dead config in the same pass.
2. Scene presets must carry behavior policy, not only visuals.
3. Auto-ops jobs must be opt-in and cooldown-limited by default.
4. If UI previews depend on scheduler state, persist lightweight last-run timestamps so cooldown windows are explainable.
5. Manual override controls should be explicit and visibly differentiated from normal actions.
6. Browser-ops companions must stay behind protected server routes with explicit approval posture and honest readiness state. Never expose direct third-party browser control from the client shell.
7. Secret posture exposed to the client must stay boolean/count-based and server-derived. Settings, diagnostics, and readiness lanes may describe configuration state, but secret values remain local-env only.

---

## Data

1. VAULT and saved-article UX need retrieval features like search, tags, and sort to stay useful at scale.
2. Delta sweeps should compare snapshots and fire typed alerts on threshold crossings instead of logging every tick.
3. Memory compaction, citation posture, promotion, and reopen state must remain deterministic and serializable so continuity can be rendered natively without reviving ambient context loading.
4. Memory artifacts should carry deterministic citation IDs, lifecycle state, next-action posture, and sensitivity tags so archive UI and APIs can summarize continuity without ad hoc heuristics.

---

## Deployment

1. Add lightweight repository guardrails when cross-platform path behavior can silently diverge.
2. For large pushes, publish a release summary with commit scope, security checks, and rollback references.
3. `docs/AGENT_HANDOFF.md` and its compatibility copies must stay thin generated mirrors of `docs/SYSTEM_STATE.md` plus pointers to the 4-file core.
4. When old GitHub repos are private or gone, inventory local archive/reference material first and document what was implemented vs dropped.
5. `scripts/generate-handoff.js` must stay branch-safe in CI, but handoff generation itself should avoid embedding per-commit churn.

## Proposed Rules Inbox

New proposed rules can be appended here temporarily during the compatibility tranche, but they should be consolidated back into the correct domain section before the next stable batch.
