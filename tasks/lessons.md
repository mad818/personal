# Nexus Prime — Lessons Learned

## How to use this file

- After ANY correction from Mario, add the pattern here
- Write a rule that prevents the same mistake
- Review this file at the start of each session

---

## Rules

1. When Mario says STOP — stop immediately. No tool calls, no responses, nothing.
2. Never mark a task complete without proving it works first.
3. Keep edits small and targeted — large file edits in one call cause API timeouts.
4. Read the exact line with grep -n before any Edit call. Never guess line numbers.
5. Always search for existing patterns before adding new ones to nexus-final.html.
6. Write the plan to tasks/todo.md before starting any implementation.
7. Do not skip features or lose functionality when refactoring.
8. Avoid the Gemini image generation API — causes ECONNRESET in current setup.
9. Every agent-run exit path (success, error, timeout, fallback) must finalize phase/task-plan state to prevent stale UI panels.
10. When migrating surfaces (2D -> 3D), remove old state toggles from the store in the same pass to avoid dead persisted config and split behavior.
11. Chat-triggered capabilities should route through one centralized intent map (prompt + tool) to keep tab navigation consistent across Home chat and HQ chat.
12. Scene presets must carry behavior policy (scheduler + notification rules), otherwise users perceive them as cosmetic and low value.
13. Auto-ops jobs must be opt-in and cooldown-limited by default; never enable autonomous high-frequency runs silently.
14. If UI previews depend on runtime scheduler state, persist lightweight last-run timestamps so users can see real cooldown/next-run windows.
15. Manual override controls (Run now/Force) should be explicit and visibly differentiated, with safe defaults disabled during cooldown unless user forces.
16. UI modernization scales best when anchored to global design tokens first, then applied to high-traffic panels to avoid one-off style drift.
17. Avoid fixed pixel splits for mixed visual/chat layouts; use responsive clamp/flex ratios so chat keeps usable height on common laptop viewports.
18. For split-pane dashboards, add a direct drag handle with reset affordance; static ratios are never ideal across all monitors.
19. Any user-adjustable layout control should persist in store settings so workspace preferences survive reloads.
20. Pair non-obvious gestures (like double-click reset) with an explicit visible control to improve discoverability.
21. Resizable UI separators should support keyboard arrows/Home/End for accessibility and precision, not mouse-only drag.
22. Resizable panels should support a lock toggle to prevent accidental drag changes during regular interaction.
23. Never place dense interactive controls outside an overflow-hidden canvas via transform offsets; use a dedicated layout row to avoid clipping and paint artifacts.
24. On narrow layouts, prioritize primary controls and collapse secondary actions into a compact overflow menu to avoid horizontal crowding.
25. Keep passive status telemetry off the chat boundary; mount it in-scene (wall area) so chat space remains dedicated to conversation.
26. If a wall panel uses perspective transforms, increase internal padding/line-height of tiny labels to prevent visual overlap artifacts.
27. First wall pass should be conservative in size/placement; oversized overlays can still dominate the scene and obscure utility.
28. For "mounted in environment" requirements, implement panels as in-scene entities in `OfficeRoom3D` (wall-anchored groups), not screen-space overlays.
29. In-scene HTML panels need larger default typography and distance factor than normal UI to remain readable from the fixed camera.
30. If in-scene wall text remains too small, relocate panels to walls closer to camera/agents before only increasing font scale.
31. After relocating in-scene boards, run a collision pass against nearby props and adjust board Y/Z before changing layout intent.
32. For dashboard-like in-scene boards, add subtle hover interaction and board brightening so they behave like interactive environmental displays.
33. Camera framing changes should balance zoom with back-wall visibility so window and mounted boards stay legible without dead space.
34. Expose frequent camera framing choices as persistent presets to avoid repeated manual retuning after visual/layout updates.
35. Keep camera presets config-driven (single preset map + UI metadata) so new framing modes can be added without touching scene/render branching logic.
36. Keep AI wiring contract-aligned across runtime/docs: inject capability blocks in active prompt path, keep `/api` route contracts real, and avoid model-map drift between client/server helpers.
37. Add lightweight repository guardrails (path-collision checks + CI enforcement) when cross-platform path behavior can silently diverge.
38. For large multi-batch pushes, publish a release summary doc with commit scopes, security checks, and rollback references to improve operational confidence.
39. Keep AI model routing in one shared module used by both client and server to prevent silent behavior drift between `/api/ai`, chat wrappers, and store defaults.
40. Default autonomous write tools to approval-gated mode (propose first, apply on review) and surface tool risk tier in traces so operators can audit decisions quickly.
41. For permissive write-capable runs, enforce a post-run verification contract (type-check + lint + route smoke) and downgrade run status when validation fails.
42. Agent runtime trust improves when run diagnostics are first-class state (run id, phase durations, verification, failure cause) and visible in the operator HUD.
43. Add lightweight repo-native eval harness scripts early; they provide repeatable progress signals and can be CI-gated before full benchmark infrastructure exists.
44. Eval gates should be threshold-driven (env/configurable) rather than hardcoded pass/fail so quality bars can tighten over time without script rewrites.
45. For operator trust, pair CI eval gates with an in-app trend view so quality posture is visible without leaving the product surface.
46. CI eval output must explicitly list failing checks and failing category thresholds; opaque "score below target" messages slow down triage.
47. Route smoke checks should distinguish "endpoint unreachable" from "endpoint auth-protected"; 401/403 can still be healthy for protected APIs.
48. Operational metrics should include freshness age/stale flags; score-only views can hide outdated health signals.
49. Trigger endpoints for expensive health/eval jobs should enforce cooldown server-side; client-side throttling alone is insufficient.
50. For operator-grade observability, summary badges should have a drilldown path (e.g., degraded reason list) plus a controlled force override for urgent revalidation.
51. Pair runtime-grade badges with exportable diagnostics and history breadcrumbs so operators can escalate incidents with context in one step.
52. Grade-drop alerts should include concise degraded-reason context; notifying without cause increases acknowledgement time.
53. DraggableProp `y` is treated as the proxy mesh CENTER height; align it with the corresponding anchor group (or adjust by the floor/rug plane) to avoid floor clipping/overdraw.
54. `docs/AGENT_HANDOFF.md` and its compatibility copies must not embed `HEAD` SHA, latest commit subject, or `git show` file lists if those files are committed by `handoff:sync` — those fields change every handoff commit and prevent convergence. Use stable branch links + `docs/handoff-supplement.md` for narrative and `blob/main` permalinks.
55. When early-phase GitHub repos are private or gone, inventory **`archive/`** and local clones first, write a **matrix doc** (`docs/ideas/legacy-*.md`) for implemented vs dropped ideas, and only then port features (e.g. third-party embeds need **CSP** updates, not silent failures).
56. `scripts/generate-handoff.js` must resolve the branch from **`GITHUB_HEAD_REF` / `GITHUB_REF`** before `git rev-parse --abbrev-ref HEAD`, because **GitHub Actions checks out detached HEAD** and otherwise emits `HEAD` while local runs emit `main`, making `handoff:check` fail in CI every push. Also canonicalize **origin** with **`GITHUB_REPOSITORY`** (or normalize HTTPS/SSH) because Actions **`git remote get-url`** often returns `https://github.com/o/r` **without `.git`**, which still makes the committed handoff look stale.

57. JSON files edited by multiple tool calls in one session can end up truncated (missing closing brace). Always validate `package.json` after edits via `npm run security-scan` or any `npm run` command — an EJSONPARSE error is the signal. Fix: append the missing `}` and never leave a JSON file partially written.
58. When installing a pre-commit hook on Windows, write via Desktop Commander (not Bash sandbox) because the sandbox may have a stale `.git/index.lock`. Use `git config core.hooksPath .git/hooks` to confirm the hook path is active.
59. Static reference cards (AlphaEarth, geodep) with zero API cost belong in `components/ops/` as standalone exported components and mount inside an existing `CollapsibleSection` — no new routes needed, no API keys required.
60. Agent Reach companion service follows the n8n/geodep pattern: standalone Python script + Next.js proxy (`/api/agent-reach`) + deployment doc in `docs/deployment/`. The proxy always degrades gracefully (503 + setup hint) when the service is not running.
61. Generated handoff docs should stay Codex-first and compact: keep `docs/AGENT_HANDOFF.md` / `docs/CODEX_HANDOFF.md` useful, but keep Claude/Cursor mirrors as short compatibility pointers unless Mario explicitly asks to revive those workflows.
62. For Aether Reliquary production art, do not promote flat vector/glyph sheets, dashboard-style icons, or minimal symbolic cards as game-facing assets. If Mario rejects a visual style, mark the batch rejected/reference-only, remove it from runtime previews, and require higher-fidelity painted/rendered 2D or approved-pack art before shipping.
63. Viewport-derived game-window values rendered in Next client components must be hydration-gated or suppressed until mount, and Phaser resize hooks must guard scene camera readiness before calling `cameras.main`.
64. Repo helper scripts that read task state must scope to canonical sections first (for example `## Next Up`) and only fall back to whole-file scans when the section is absent, so old backlog items do not outrank current work.
65. In sandboxed Windows shells, orchestration scripts should delegate verification to npm scripts instead of nesting child-process health gates that can fail with `spawn EPERM`.
66. Do not make unauthenticated operators pass through a public landing and then a second protected auth landing before password entry; the landing CTA should either continue directly when authenticated or collect the token on the same landing surface.
67. The RPG world is Mario's personal/private lane and will move elsewhere later; do not frame Aether Reliquary or RPG production as public Nexus/Homefront positioning, landing copy, or shared shell doctrine.
68. Shell self-heal reloads must be one-shot by both session state and URL marker; if `__shellHeal` is already present, show recovery or wait for hydration instead of writing a new timestamp and creating an infinite reload loop.
69. Premium Homefront visual work must land in the authenticated shell chrome too, not only the public landing page; keep the RPG playfield untouched unless Mario explicitly asks for game-surface changes.
70. Protected route IA should use the shared surface capability registry for purpose, best-use signals, and next actions before adding one-off explanatory copy or new dashboard panels.
71. After premium landing/media/CSP work, run a browser probe that captures console errors, page errors, unhandled rejections, and failed requests; Next dev can surface blocked resource events as `[object Event]` overlays even when HTTP routes return 200.
72. Stop the live `3100` dev runtime before `npm run build`; building while Next dev owns `.next` can create false `PageNotFoundError` module failures that disappear after a clean build lane.
73. Public landing hero visuals must be image-led and cinematic, not faint line-art dashboards or tiny debug panels. If the concept is surveillance/drone/Homefront, use a strong media-grade scene first and keep instrumentation sparse, readable, and secondary.
74. Homefront drone/perimeter scenarios may show deterrence warning scripts, including language that the operator may contact 911, but must never imply Nexus/Homefront places an actual emergency call automatically.
75. When Mario gives Homefront surveillance scenarios, replace vague dog/pet copy with the authored false-alarm and breach flows; the scenario UI should be playable/selectable, not just a decorative loop.
76. Homefront landing media must not bake readable HUD copy, pet-safe labels, dog/animal silhouettes, or old scenario text into raster/video assets. Keep scenario words in React UI where they can be reviewed, changed, and tested.
77. Premium Homefront object imagery should be object-first and recognizable in the generated media source, not symbolic top-down glyphs or abstract markers. Regenerate the active WebP/reel from the source pipeline so later media updates do not revert the visual quality.
78. When Mario asks for photoreal Homefront hardware, do not keep polishing SVGs. Use a real raster generation path, remove the background cleanly, save the source inside `public/images`, and make the media generator prefer that source so future runs do not fall back to illustration.
79. Photoreal Homefront environment assets should be source-isolated like the drone: generate the home/perimeter as a real raster source with no baked text, people, animals, drone, HUD, police, or emergency-call cues, then layer patrol route and scenario behavior in React/video so it stays editable.
80. Simple assistant greetings, pings/tests, and acknowledgements should prove the chat is alive through a local fast reply instead of starting the full agent/runtime loop; reserve `LIVE EXECUTION` for real tasks, route actions, retrieval, or review-gated work.
81. When HQ is waiting on a local Ollama/model turn, the live execution rail must show a slow-runtime watchdog and a provider-health recovery lane instead of looking like a frozen chat.
82. Never label a GitHub/X idea fully implemented from a feature sample or command-name match. Reverse-engineer the primary source into an exhaustive capability matrix; implement every capability that fits Nexus, explicitly reject only capabilities that conflict with security, legality, licensing, the free/local invariant, or product purpose, and require acceptance proof for every implemented/adapted row before marking parity complete.
83. Complete upstream assimilation means every useful capability is adapted and proven inside Nexus, not that Nexus reproduces or installs the entire upstream project. Track optional upstream runtime readiness separately and never let an unavailable optional runtime block Nexus integration completion or appear live.
84. JavaScript chunk budgets must distinguish a production `.next` build with `BUILD_ID` from unminified development output; keep source-level performance boundaries active in development and enforce byte budgets only against production chunks.
85. Preserve the Next development cache between normal development starts, but detect `.next/BUILD_ID` and clear incompatible production output before launching `next dev`; reusing a production build can force first-interaction dynamic imports to reload the page and lose UI state.

---

## Session Log

### 2026-03-14

- ECONNRESET errors caused by large file edits and heavy context — keep edits smaller
- User rejected Gemini image generation — skip this feature entirely
- Stop command must be obeyed instantly with zero tool calls

### 2026-03-27

- Stale TaskPlanPanel came from non-finalized run paths and missing auto-clear; always close run lifecycle and clear terminal plans.

### 2026-03-28

- Git index.lock in the container overlay blocks sandbox Bash git commands. Always route git operations through Desktop Commander (cmd shell) using `git commit -F commit_msg.txt` pattern.
- When adding a new layer type to a Leaflet component (like geodep), follow the established pattern: dedicated fetch fn → dedicated `useCallback` → dedicated `useEffect` (not bolted onto the shared activeLayers effect). This keeps each layer isolated and avoids dependency array sprawl.
- Companion services (GeoDeep, n8n) belong in `docs/deployment/` docs, not bundled into the Next.js app. Document like Coolify: setup, env vars, integration points, notes.
- PM Cockpit checklist should be seeded with DEFAULT items in the store constant so new installs always have a usable list without migration logic.
- `Array.from(set)` not `[...set]` when `downlevelIteration` is not enabled in tsconfig — TypeScript spread on Set fails without it.
- `NODE_ENV=production` set at the Windows system level silently prunes all devDependencies on every `npm install`, removing tailwindcss/postcss/autoprefixer and breaking the build. Fix: `.npmrc` in the project root with the supported `include=dev` setting. This replaces the deprecated `production=false` alias and must never be removed.
- Completed HQ office 2D -> 3D migration; keep one renderer path only and mirror runtime parity signals natively in 3D before deleting legacy components.
- Added shared chat capability routing layer and wired both chat surfaces to auto-open matching tabs for prompt intent and tool calls.
- Bound War Room/Night Ops presets to operational mode settings so runtime scheduler and alert policy change with the selected profile.
- Added mode auto-jobs with explicit settings toggles and strict global cooldown to prevent noisy or runaway autonomous scheduling.
- Added Auto Ops Preview with persisted last-run timestamps so armed state, cooldown, and next-run windows are explainable in UI.
- Added Run now/Force controls and compacted roster/stat card containers to improve usability and visual density without changing core behavior.
- Added global spacing/radius/type/elevation tokens and aligned key HQ scheduler/roster/footer panels to the shared token scale.
- Added mode briefing stream + Night Ops handoff writeback and replaced fixed office height with responsive split to prevent chat viewport starvation.
- Added user-resizable HQ office/chat splitter with drag + double-click reset to keep chat visibility controllable at runtime.
- Persisted HQ splitter height in settings to keep the preferred office/chat ratio after refresh.
- Added visible RESET LAYOUT chip next to the splitter handle so users can restore defaults without hidden gestures.
- Added keyboard resizing + inline feedback on splitter actions so layout adjustments are accessible and clearly confirmed.
- Added LOCK/UNLOCK SPLIT toggle with persisted preference so drag resizing can be intentionally disabled while keeping reset/keyboard controls.
- Moved splitter controls into a dedicated divider row between office and chat to eliminate clipping/black band overdraw from absolute+transform positioning.
- Added responsive splitter controls that collapse lock action into a More menu under narrow widths to keep the divider clean and usable.
- Repositioned live status panel to a wall-mounted office overlay and converted Welcome roster to compact non-scroll cards to prevent chat-height and roster-scroll friction.
- Moved both SYS telemetry and full agent roster to wall overlays in Office scene, removed duplicate scroll-heavy chat roster, and fixed SYS label overlap with stronger spacing.
- Reduced wall overlay footprints, anchored both below header controls, and removed leftover Welcome note to keep first-view composition clean.
- Converted SYS and roster to true in-scene wall-mounted boards inside the 3D room and removed screen-space wall overlay wrappers from `OfficeCommandCenter`.
- Increased wall board distanceFactor and text scale so roster/SYS content is readable at standard HQ camera distance.
- Relocated wall boards from back wall to side walls near agent area and increased board/text scale again for practical readability.
- Resolved left wall board overlap by nudging mount point up/forward and increased right SYS board font scale while preserving placement.
- Removed left-board cabinet overlap by moving mount further away in Z/Y, raised right SYS text block, increased right font again, and enabled interactive hover brightening.
- Tightened HQ camera position/FOV/lookAt so the office fills more viewport while still showcasing wall/window context.
- Added persistent camera presets (Cinematic and Close Ops) and wired quick controls for instant framing switches.
- Added a Wall Readability preset and moved camera handling to a centralized preset map to make future framing profiles low-risk and fast to extend.
- Completed AI connection pass: wired capability injection in HQ, added `/api/health`, fixed `/api/project` tree fidelity, aligned local model maps/defaults, and updated `.claude` rules to match runtime architecture.
- Added a cross-platform path-collision guard script + GitHub Actions workflow and published an interactive 90-day improvement plan map with gates, KPIs, and phased work packages.
- Added a formal release summary for secure two-batch push flow, including commit IDs, verification checklist, and rollback commands.
- Executed Phase 1 release hardening: centralized task-model routing, added sanitized `/api/status` diagnostics, introduced CI quality gates, and aligned env/docs defaults for local model and key naming.
- Added Phase A guardrails: risk-tiered tool policy with default high-risk write blocking unless reviewed through proposed edits, plus status diagnostics for policy/routing visibility.
- Executed multi-phase hardening slice: added `/api/verify` adapters, integrated verification/degraded run status into agent runtime, wired run diagnostics into store/HUD, added context-budget bundle helper, and introduced a reproducible runtime eval script + CI step.
- Upgraded eval workflow with configurable min-score policy, CI enforcement at threshold, and persisted run artifacts/history in `docs/metrics` for trend visibility.
- Added weighted eval scoring by category and surfaced runtime eval history through an API route plus a Settings-side trend panel for quick operator review.
- Added category-threshold CI gating and a Telemetry HUD eval chip, plus explicit failure diagnostics output for faster remediation.
- Extended route smoke to cover protected endpoint reachability and surfaced latest eval snapshot + category bars in status/settings diagnostics for faster operator triage.
- Added a secure in-app eval trigger path and freshness-aware trend display, reducing operator friction for updating and validating runtime quality posture.
- Added cooldown-governed eval runner state, `/api/status` rollup grade + degraded reasons, and HQ telemetry hints for stale/failing eval posture.
- Added top-bar Eval Grade badge, force-run override in Settings, and explicit degraded reason lists so operators can move from signal -> diagnosis -> action quickly.
- Added grade-drop notification signals plus copy/export diagnostics and recent-grade breadcrumb context to accelerate incident triage and reporting.
- Added Open Status deep-link and compact severity iconography, plus reason-enriched drop alerts, to close the loop from detection to investigation.

57. Route live context through agent-specific filters (`buildFilteredLiveContext`) rather than dumping all signals to every agent; irrelevant signals waste tokens and dilute focus.
58. Vault/saved-article UX needs search + tag filter + sort to be useful at scale; bookmarking without retrieval is a dead end.
59. Delta sweeps (price, CVE, world-risk) should compare two snapshots and fire typed alerts with severity — don't log every tick, only threshold crossings.
60. Session-scoped read cache with 60 s TTL reduces external API hits on repeated agent reads; evict on write (patch_project_file) to avoid stale context.
61. A keyword-first RAG router (`routeQuery`) eliminates the need for agents to decide which tool to call first — pre-route and inject the block into the system prompt.
62. Post-run lesson proposals should never auto-commit; surface an approval bar first (Memento-Skills pattern) so the human can reject noise before it pollutes lessons.md.
63. Agent prompts need TDD discipline (assert-before-write) and deep-research pipelines (5-tool sequence → Feynman brief) to enforce quality floors at the prompt level.
64. `orbit:next` and `audit:full` scripts turn backlog and health checks into one-command CLI ops — faster than reading files or running separate commands.
65. Telegram webhook must return HTTP 200 immediately and dispatch agent asynchronously; Telegram retries on slow responses, causing duplicate messages.
66. Claude/Codex hook commands must be cross-platform on Windows: use Node scripts that read hook JSON from stdin and legacy tool-input env vars instead of Bash-only `tr`/`grep` one-liners.
67. Public repo identity should be Codex-first: do not present Claude as an active contributor or primary workflow; keep Claude files only as legacy compatibility pointers unless Mario explicitly revives that workflow.
68. When Mario says the Homefront drone and home are meant to stay and asks to remove effects, preserve those assets, route, scenario copy, and controls; remove only overlay/effect layers such as video overlays, scans, sweeps, marker chips, beams, and decorative HUD indicators.
69. Homefront hero interactivity should feel alive through small input acknowledgements, not by restoring heavy overlays; click or mouse effects should preserve the approved home/drone assets and stay non-looping, reduced-motion-safe, and control-aware.
70. Homefront hero scenarios should be depicted through the approved home/drone scene, not through oversized explanatory cards or control boxes in the first viewport; keep scenario language in normal copy or deeper sections.
71. On Windows, `spawnSync("npm.cmd", ..., { shell: false })` can fail with `EINVAL`; for fixed repository-owned npm scripts, invoke `npm.cmd run <script>` through `ComSpec /d /s /c` with `shell: false`, and never interpolate user-controlled text into that command.
72. Whole-app regression gates must cover equivalent syntax forms. A string scan for `window.alert(` missed bare `alert()` calls while claiming native-dialog closure; use TypeScript AST detection with bare, explicitly global, bracket-access, and allowed component-method fixtures, then confirm the active source tree independently.
73. Client effects must not launch `void fetch(...).then(...)` or `void Promise.all(...).then(...)` without a rejection path. Use an effect-local async loader with `try/catch`, `response.ok`, a cleanup guard, distinct loading/error/empty state, and local retry; otherwise route failures become unhandled rejections or misleading zero-data panels.
74. A `try/catch` around a client mutation does not reject HTTP 4xx/5xx responses. Check `response.ok` before parsing or presenting POST/PUT/PATCH/DELETE results, and protect literal mutation methods with an AST fixture so failed writes cannot become false success.
75. Clipboard writes can reject because of browser permissions or secure-context policy. Never end copy actions with an empty `.catch(() => {})` or an unguarded `await`; confirm only after fulfillment, expose a retryable failure, and cover property/bracket syntax plus forwarded promises in the AST gate.
76. Whole-app mutation gates must cover the canonical `apiFetch()` wrapper as well as native `fetch()`. A route body's `ok` field is not a substitute for `response.ok`, and calls to routes that do not exist should be removed instead of preserved as best-effort persistence.
77. A generated-anchor click proves only that a browser download was requested, not that a file reached disk. Route active exports through one guarded helper, say “download requested,” return a boolean for inline status, and revoke object URLs after the click turn rather than immediately.
78. Browser posture checks must disclose every external contact and preserve an explicit unknown state. An incomplete STUN probe is not proof of “no leak,” a client API that would expose the browser IP must be omitted when no correct proxy exists, and informational availability must not silently change the security score.
79. A `display:none` file input nested inside a label is not a reliable keyboard browse path, and a native file input retains its previous selection unless explicitly cleared. Expose a named native trigger, read and reset the input before async work, and single-flight local processors so same-file retries work without stale results winning a race.
80. Visible async feedback is not equivalent to accessible feedback. Newly rendered failures need `role="alert"`, routine completion/progress messages need `role="status"`, and regression gates should inspect the feedback identifier actually rendered so full data dashboards are not accidentally turned into noisy live regions.
81. Semantic colors used through generated CSS can still look unused to the design-system linter when `DESIGN.md` component recipes omit them. Give every active palette entry an honest supported recipe, parse the linter report, and keep zero warnings inside the normal verification lane instead of relying on a historical plan claim.
82. `next lint` is deprecated, but replacing it with `eslint .` silently widens coverage into archives, generated snapshots, scripts, hooks, and store code. Migrate the active Next.js scope explicitly (`app`, `components`, `lib`), keep `--max-warnings 0`, and protect the command plus Core Web Vitals/Tailwind/TypeScript config with a focused gate.
83. Dependency install-script posture must follow lockfile `hasInstallScript` and consumer `preinstall`/`install`/`postinstall` semantics; package-author `prepare` and publish scripts are context, not equivalent execution risk. Pin each consumer hook by path, version, integrity, platform posture, and allowed hook names, then fail on review drift.
84. A process that prints a green verification verdict must own the verifier process and inspect its real exit status; never trust a caller-supplied “already verified” flag. Invoke the active npm CLI with fixed shell-free arguments, protect the delegation contract, and keep local health distinct from push success or remote CI.
85. Canonical formatting can expose validators that accidentally test line layout instead of code contracts. Run the formatter's AST debug check before bulk writes, then make source assertions whitespace-tolerant or AST-aware so verification survives deterministic wrapping without weakening the behavior being proved.
86. Formatter writer/checker commands must use the same exact slash-delimited scopes and exclusions and be backed by an independently enumerated source inventory. A malformed glob can still match a plausible subset and let literal assertions, format checks, and full audits agree on a false coverage claim; run the no-write debug check over the resolved intended scope before any baseline write, preserve explicit product exclusions such as the RPG boundary, and make generated TypeScript emit canonical formatting so freshness and format gates are simultaneously satisfiable.
87. Source-contract validators must ignore formatter-only whitespace and punctuation shape. Normalize whitespace for human-readable proof phrases and dynamic-import snippets; parse security-critical TypeScript inventories with the compiler AST instead of regex so line wraps, property layout, and trailing commas cannot turn an existing route or boundary into a false missing-policy result.
88. Dependency queue state must be reconciled against current manifests, installed-version gates, and the live no-network next-patch helper before naming another package. A stale Dependabot export may justify keeping the parent audit open, but it must not keep an already-patched package task open or advertise an obsolete next target; wait for a fresh remote rescan rather than guessing from historical alerts.
89. Historical scripts, artifacts, and “shipped” prose do not prove that an operator command is still executable; validate every documented npm entry against the current package manifest and its real downstream command. Keep final launch proof split into a local static gate and an explicit live-target gate, disable Playwright auto-start for externally managed targets, and never convert missing target health, token, CI, promotion, or rollback evidence into a green launch claim.
