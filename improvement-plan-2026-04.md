# Nexus Prime — Comprehensive Improvement Plan
**Date:** 2026-04-03
**Scope:** All aspects — code quality, agent intelligence, UI/UX, data, security, performance, testing, and new capabilities
**Author:** JANSKY + ORBIT review pass
**How to use:** Pick a block, write a spec in `specs/features/`, add items to `tasks/todo.md`, build.

---

## GROUND RULES BEFORE BUILDING ANYTHING
1. Write spec first (`specs/features/name.md`) for any item with 3+ steps.
2. Add tasks to `tasks/todo.md` before touching code.
3. Run `npx tsc --noEmit` before and after every change. It must pass.
4. Read the target file before editing it — never edit blind.
5. One item in progress at a time. Mark done only when verified.

---

## BLOCK 1 — IMMEDIATE (Complete P1 + P2 before anything else)

These are non-negotiable. No new features until these are done.

### 1.1 Cinematic IA — Surface Hardening (CP1)
The shell hierarchy is defined but not uniformly applied.

- **CP1.1** — Apply `ShellPage` wrapper consistently across all 8 GA tabs. Every surface needs: hero background art (via `ShellSurface`), panel backdrop, consistent padding, and no raw `div` roots.
- **CP1.2** — Standardize empty states and loading states. Each tab must have a skeleton/spinner that matches the cinematic style — no plain "Loading..." text, no blank white panels.
- **CP1.2b** — Standardize buttons: every primary action uses `ShellButton`, every status indicator uses `ShellBadge`. No raw `<button>` with ad-hoc `className`.
- **CP1.2c** — Standardize segmented controls (sub-tab switchers). Use the same pattern across COMMAND, INTEL, ALPHA, CYBER, RECON. No one-off implementations.
- **CP1.3** — HQ visual integrity pass: run the app, check for overlap/clipping in the 3D office on narrow (1280px), medium (1440px), and wide (1920px) viewports. Fix any issues.
- **CP1.4a** — COMMAND: add graceful "No API key" state for every panel that requires a key. Each panel should display an inline key-input prompt, not a blank card.
- **CP1.4b** — INTEL: graceful degradation when Polymarket/SEC feeds return no data. Show a human-readable fallback ("No predictions available — check back later") not an error boundary.
- **CP1.4c** — ALPHA: BuyBot and MomentumScanner need explicit "no results" states with a "Rescan" action rather than silently showing empty tables.
- **CP1.4d** — CYBER: TriageView needs a "no threats detected" state with a timestamp of last scan.
- **CP1.4e** — RECON: all 5 sub-views need results/loading/empty states that are consistent.
- **CP1.4f** — VAULT: when no saved articles exist, show an onboarding prompt explaining how to save articles from INTEL or COMMAND feeds.

### 1.2 Release Engineering (CP2)
- **CP2.1** — Web release rehearsal. Run Docker build locally, mount `.env`, verify all routes respond, snapshot `/api/status` diagnostics output, prove rollback works by reverting one env var.
- **CP2.2** — Desktop isolation validation. Run with `NEXUS_NETWORK_MODE=isolated`. Confirm all UI panels degrade gracefully (no stuck spinners, no uncaught fetch errors). Document which panels go offline.
- **CP2.3** — Desktop trust chain. Generate checksums for the Tauri binary artifacts. Document signing status (even if unsigned now, document that explicitly). Write SBOM with `cyclonedx`.
- **CP2.4** — Final launch gate script: one command that runs `type-check`, `lint`, `verify`, `route:integrity`, `eval:agent-runtime:ci`, `release:smoke`, and `auth:e2e`. If any fail, exit non-zero. Tie this to a `npm run launch:gate` alias.

---

## BLOCK 2 — CODE QUALITY & TECHNICAL DEBT

These don't add features. They make everything else easier to build and less likely to break.

### 2.1 Dead Code Removal
- **2.1a** — Audit `OfficeRoom3D.tsx` props. Remove any prop that is passed but never used inside the component. This was flagged in lessons but not done.
- **2.1b** — Audit `SettingsDrawer.tsx`. Identify any state slice that is no longer referenced (legacy 2D renderer toggle, etc.) and remove.
- **2.1c** — Audit `prompts.ts`. Check for dead keyword branches in `detectAgent()` that no longer map to real agents or tools.
- **2.1d** — Run `npx ts-prune` or a similar unused-export finder. Document all stale exports. Remove what is safe to remove, comment-gate what is not yet wired.
- **2.1e** — Sweep `store/useStore.ts` for fields that are set but never read in any component. Annotate or remove.

### 2.2 Animation Consistency (2C)
- **2.2a** — Global audit: grep for `transition:` and `duration-` in all `.tsx` and `.css` files. Any value not using `var(--t)` should be replaced.
- **2.2b** — SettingsDrawer exit animation: add a slide-out CSS transition that mirrors the slide-in. Currently the drawer disappears immediately on close.
- **2.2c** — NotificationCenter: match drawer animation to SettingsDrawer.
- **2.2d** — Sub-tab switchers: add a subtle `opacity` + `translateY` transition when switching between sub-views.
- **2.2e** — ShellPage route transitions: verify `PageTransition` is wired on every page. Add where missing.

### 2.3 TypeScript Strictness
- **2.3a** — Audit all `// @ts-ignore` and `// @ts-expect-error` comments. Each one must have a written justification. Remove any that can be resolved properly.
- **2.3b** — Audit all `as any` casts. Replace with proper types wherever possible.
- **2.3c** — Ensure all API route handlers have explicit return types (`NextResponse<ResponseType>`). No implicit `any` returns.
- **2.3d** — Add a `tsconfig.strictNullChecks` pass if not already enforced. Document any found issues.

### 2.4 ESLint Coverage
- **2.4a** — Run `npm run lint` and address any warnings that are currently suppressed by `// eslint-disable` comments. Re-evaluate whether each suppression is still needed.
- **2.4b** — Add `no-console` rule to ESLint config. Replace any `console.log` in production paths with proper store notifications or silent failure.
- **2.4c** — Add `react-hooks/exhaustive-deps` to ESLint if not present. Fix all stale dependency arrays.

### 2.5 Bundle Size
- **2.5a** — Run `npm run build` and check the `.next/analyze` report (add `@next/bundle-analyzer` if missing). Identify any module over 200 KB that could be lazy-loaded.
- **2.5b** — Audit Three.js imports. Only import what is used — `import { ... } from 'three'` not `import * as THREE`. This alone can cut bundle size significantly.
- **2.5c** — Verify all heavy components in `app/home/page.tsx` use `dynamic(() => import(...), { ssr: false })`. Add any that are missing.
- **2.5d** — Check if `recharts` and `leaflet` are both in the top-level bundle. They should be behind `dynamic()` imports.

---

## BLOCK 3 — AGENT INTELLIGENCE

### 3.1 Prompt Caching + Batch (A5)
The system already has single-flight deduplication but not proper Anthropic prompt caching.

- **3.1a** — Add `cache_control: { type: "ephemeral" }` on the system prompt block in `/api/ai/route.ts` for Claude calls. This caches up to the first 4096 tokens of the system prompt across calls.
- **3.1b** — For the `CronSchedulerRunner`, batch all scheduled jobs that fire within the same 60-second window into a single multi-message batch call instead of N separate calls. Use Anthropic's batch API endpoint.
- **3.1c** — Add a cache hit/miss counter in the run diagnostics schema so Mario can see prompt cache effectiveness in the runtime eval panel.
- **3.1d** — Add a `batchedRun` flag to `AgentRunArtifact` so the audit log shows which runs were batched.

### 3.2 Skill Governance Metadata (A6)
The `Skill` interface already has 28 fields but `riskTier`, `approvalRequired`, and `domainTags` are not wired into the execution path.

- **3.2a** — Add `riskTier: SkillTier`, `approvalRequired: boolean`, and `domainTags: string[]` fields to the `Skill` interface if not present. Populate on all existing skill definitions.
- **3.2b** — In `lib/agent.ts`, before executing any tool that maps to a Tier 1 or Tier 2 skill, check `skill.approvalRequired`. If true and `settings.requireApprovalForHighRisk` is on, queue in `pendingEdits`.
- **3.2c** — In `ToolCallBadge.tsx`, display the domain tag badge next to the tool name (RESEARCH / ENGINEERING / SECURITY / FILE I/O / COMPUTE / MARKET).
- **3.2d** — Add a "Skill Registry" view inside the Settings drawer: a table showing all active skills, their tier, approval policy, XP, and last used timestamp.
- **3.2e** — Cyber pack baseline: pre-populate CIPHER's skill registry with 5 default skills (threat-triage, cve-lookup, osint-recon, incident-response, malware-analysis), each with correct risk tier.

### 3.3 TimesFM Forecasting (A7)
- **3.3a** — Add a `timeseries_forecast` tool definition in `/api/tools/route.ts`. Input: array of `{ ts: string, value: number }`. Output: next N predicted values with confidence intervals.
- **3.3b** — Wire a lightweight TimesFM adapter (or a statsmodels fallback via a Python sidecar) behind the tool. If no sidecar, use a simple ETS/ARIMA via the Python companion service.
- **3.3c** — Add a `forecastAccuracy` metric to the runtime eval harness that compares predicted vs. actual on the last 24h of crypto prices. This gives a concrete eval hook for measuring decision lift.
- **3.3d** — Surface forecast output in ALPHA tab as an overlay on price sparklines (thin dashed line beyond current time).

### 3.4 Agent Detection Improvement
- **3.4a** — Add bigram/phrase matching to `detectAgent()`. Currently it's unigram keyword scoring. "security scan" should score higher for CIPHER than just "scan" would.
- **3.4b** — Add a debug mode in Settings that shows which agent was detected and why (top 3 scoring agents with their keyword hit counts). Useful for tuning.
- **3.4c** — Add a manual agent pin: user can type `@ORBIT: ...` or `@NOVA: ...` to force a specific agent. Parse `@AGENTNAME:` prefix in the send handler before running detection.

### 3.5 Memory System Improvements
- **3.5a** — The `memoryStore` (IndexedDB) currently captures facts post-run. Add a "memory search" tool (`recall_by_query`) that does semantic search over stored memories using a simple TF-IDF index — no external API needed.
- **3.5b** — Add a memory age-out policy: entries older than 30 days without a "reinforced" flag get moved to a cold archive, not deleted. Surface this in the MemoryPanel.
- **3.5c** — Add a "memory confidence" score to each `KnowledgeEntry` (0–1). When recalling, show confidence. Let the agent include confidence in its response framing.
- **3.5d** — Memento-Skills lesson approval: when a user approves a lesson, write it not just to `tasks/lessons.md` but also to the relevant agent's skill XP record in `skillEngine.ts`.

### 3.6 RAG Router Improvements
- **3.6a** — Add a `confidence` score to each `routeQuery()` result. When confidence is below 0.4, include multiple strategy blocks (multi-domain retrieval) instead of picking just one.
- **3.6b** — Add two new domain routes: `geopolitical` (triggers on: war, conflict, sanctions, diplomacy, NATO, UN) and `healthcare` (triggers on: FDA, clinical, pharma, outbreak, WHO).
- **3.6c** — Log which RAG route was selected per agent run in the `AgentRunArtifact`. Show it in `ToolCallBadge` as a "data source" hint.

---

## BLOCK 4 — UI/UX IMPROVEMENTS

### 4.1 Navigation
- **4.1a** — Add keyboard shortcuts for tab switching. `Alt+1` through `Alt+8` should switch to each GA tab. Show shortcuts in a tooltip on hover.
- **4.1b** — Add a breadcrumb path inside the shell for sub-tab navigation (e.g. `INTEL > Polymarket > Politics`). Clicking any crumb navigates up.
- **4.1c** — Add a "recently visited" quick-jump. Pressing `/` opens a command palette showing last 5 tabs visited + 5 suggested actions. Reuse the existing `CommandBar` or build a new lightweight one.
- **4.1d** — Make the nav rail collapse on viewports below 1024px into a hamburger menu with the same tab list.

### 4.2 HQ Agent Office
- **4.2a** — Agent speech bubbles currently show tool names. Extend them to show short status phrases: "Searching…", "Reading file…", "Writing patch…", "Verifying…". Map from `OperationalPhase` + current tool.
- **4.2b** — When an agent run finishes with a verified result, play a short success particle burst from the active agent's position. Use the existing Three.js `ParticleBackground` emitter.
- **4.2c** — Add a "confidence ring" to the active agent: a thin ring around the agent that fills proportionally as the run progresses (phase 1 = 20%, phase 2 = 40%, etc.).
- **4.2d** — Night Ops mode: dim the office to 30% brightness, keep only the active agent's desk light at full intensity. Morning mode: full brightness. War Room: cool blue tint.

### 4.3 Data Panels
- **4.3a** — All panels that show live data should have a visible "last updated X seconds ago" indicator in the bottom-right corner. Use `timeAgo()` from `lib/helpers.ts`.
- **4.3b** — Add a "copy data" button on every major data panel (price grid, CVE feed, Polymarket cards). Copies the panel's current data as structured JSON to clipboard.
- **4.3c** — Add a "pin panel" action: user can pin any panel to a "Dashboard" view that shows only pinned panels side-by-side. Store pinned panel IDs in settings.
- **4.3d** — Add sparkline hover tooltips to the price sparklines in ALPHA. On hover, show the exact price + timestamp for each data point.

### 4.4 Notifications
- **4.4a** — Notification center: add a "mark all read" button. Currently each notification must be dismissed individually.
- **4.4b** — Add notification categories (MARKET, THREAT, AGENT, SYSTEM) with a filter row at the top of the notification center.
- **4.4c** — Add a `doNotDisturb` toggle in Settings. When on, all toast notifications are suppressed — they still appear in the notification center.

### 4.5 Settings Drawer
- **4.5a** — Settings is currently one long scroll. Add section navigation tabs inside the drawer (General, AI, Data Sources, Security, Agent, Appearance, Advanced).
- **4.5b** — Add an "export settings" button that downloads the current settings JSON. Add an "import settings" button that reads a JSON file and applies it.
- **4.5c** — Add a settings search. Typing in a search box filters visible settings fields. Useful once there are 30+ settings.

### 4.6 Accessibility
- **4.6a** — Run a WCAG 2.1 AA audit on all 8 GA tabs. Fix any contrast failures (dark text on dark background is common in the cinematic theme).
- **4.6b** — All interactive elements must have explicit `aria-label` or `aria-labelledby`. No unlabeled icon buttons.
- **4.6c** — Keyboard focus management: when a modal/drawer opens, focus should move to the first interactive element inside. When it closes, focus should return to the trigger.
- **4.6d** — Add `prefers-reduced-motion` media query. When set, disable all non-essential animations (particle background, agent poses, bloom, matrix overlay).

---

## BLOCK 5 — DATA & INTELLIGENCE SOURCES

### 5.1 New Free Data Sources
Each of these is a standalone addition — no API key needed.

- **5.1a** — **GDELT 2.0 GKG** (Global Knowledge Graph): fetch conflict/protest/crisis events by country code. Wire into OPS tab as a "global events" layer on the Leaflet map.
- **5.1b** — **ACLED** (Armed Conflict Location & Event Data): free academic API. Add to OPS tab. Provides precise lat/lon for conflict events.
- **5.1c** — **World Bank Open API**: GDP, inflation, poverty, population by country. Wire into INTEL tab as a "Country Profile" card triggered when a country name appears in articles.
- **5.1d** — **UN Comtrade** (trade data, free tier): add a "Trade Flow" panel in INTEL for top imports/exports by country.
- **5.1e** — **WHO Disease Outbreak News RSS**: free RSS. Add to INTEL feeds as a category.
- **5.1f** — **BIS (Bank for International Settlements) stats API**: central bank rates, FX reserves. Add to COMMAND as a macro overlay.
- **5.1g** — **Satellite Imagery Alerts (NASA EONET)**: free API for wildfire, volcano, storm events. Layer onto OPS map.

### 5.2 Existing Source Improvements
- **5.2a** — CoinGecko rate limit: add exponential backoff + queue when the free tier 429s. Currently the fetch just fails silently.
- **5.2b** — NVD CVE feed: fetch the last 7 days not just last 20. Store them with deduplication by CVE ID. Show a 7-day CVE trend sparkline.
- **5.2c** — RSS articles: add source credibility scoring (per-domain rating stored in a static map). Show credibility badge on articles.
- **5.2d** — Fear & Greed: add a 30-day history chart in ALPHA, not just the current value. Alternative.me provides history with a `limit` param.
- **5.2e** — Mempool.space: add a visual "fee levels" indicator in ALPHA — low/medium/high sat/vByte. Update every 5 minutes.

### 5.3 Geopolitical Risk Score
This was in the expansion plan (Block 1.2) and remains unbuilt.

- **5.3a** — Build a `geopoliticalRisk` store slice: an array of `{ country, iso2, conflictScore, economicScore, electionScore, overallScore }`.
- **5.3b** — Wire ACLED + World Bank + GDELT data into a scoring formula. Each source contributes a sub-score.
- **5.3c** — Display as a sortable table in INTEL with color-coded risk bands (green < 30, amber 30–60, red > 60).
- **5.3d** — Wire highest-risk countries as Leaflet map layer overlays in OPS tab.

### 5.4 Entity Intelligence Graph
This was in the expansion plan (Block 4.3) and remains unbuilt.

- **5.4a** — Build an entity extractor that runs over fetched articles client-side. Use a static list of 2000 known entities (leaders, organizations, countries, companies). No AI needed for basic extraction.
- **5.4b** — Build a D3.js force-directed graph showing co-occurrence: two entities are connected if they appear in the same article.
- **5.4c** — Clicking an entity node filters the INTEL article feed to show only articles mentioning that entity.
- **5.4d** — Add this as a "Graph" sub-view in INTEL.

---

## BLOCK 6 — SECURITY HARDENING

### 6.1 Rate Limiting
- **6.1a** — Add per-IP rate limiting to all `/api/ai` calls. Use `lib/security/rateLimit.ts`. Default: 60 req/min per IP.
- **6.1b** — Add per-IP rate limiting to `/api/tools` calls that execute `write_file` or `patch_project_file`. Default: 10 req/min.
- **6.1c** — Return `Retry-After` header on 429 responses so clients can back off correctly.

### 6.2 Input Sanitization Audit
- **6.2a** — Audit all `/api/*` routes. Every query param and body field must be validated (length, type, allowed characters). Add `zod` validation schemas if not present.
- **6.2b** — Audit all places where user-supplied strings are rendered. Confirm `esc()` is called everywhere. Add a lint rule or grep-based check in `npm run verify`.
- **6.2c** — RECON tab: ensure all IP/domain inputs from the user are validated before being used in fetch URLs. A user could inject a path traversal or redirect.

### 6.3 Secret Hygiene
- **6.3a** — Run `git log --all --full-history -- '*.env*'` to confirm no `.env` file was ever committed. Document the result.
- **6.3b** — Add `secretlint` or `trufflehog` as a pre-commit hook step. Blocks commits containing API key patterns.
- **6.3c** — Add a `settings:export` route that redacts all key fields before export (replace with `"***SET***"` or `""`).

### 6.4 CSP Review
- **6.4a** — Review `Content-Security-Policy` in `next.config.js`. Confirm it blocks inline scripts (except those explicitly nonce'd). Run through [CSP Evaluator](https://csp-evaluator.withgoogle.com/).
- **6.4b** — Confirm Tauri desktop build uses the Tauri CSP, not the Next.js CSP. Document which directives differ and why.

---

## BLOCK 7 — PERFORMANCE

### 7.1 Polling Optimization
- **7.1a** — Audit all `setInterval` calls across `GlobalDataLoader` and any component-level pollers. Confirm all respect the `runtimeConfig.ts` cadence values. No hardcoded intervals.
- **7.1b** — Add `navigator.onLine` checks before any polling fetch. When offline, skip the fetch and show an offline badge.
- **7.1c** — Add Intersection Observer to all off-screen panels. Pause their data polling while they are not visible. Resume when they scroll into view.

### 7.2 React Rendering
- **7.2a** — Audit all Zustand store selectors in components. Replace any `useStore(s => s)` (full store subscription) with narrow selectors.
- **7.2b** — Add `React.memo()` to any component that re-renders on polling updates but doesn't depend on the updated state (e.g. static header elements, empty state cards).
- **7.2c** — Profile the ALPHA tab's price grid with React DevTools Profiler. Identify any render cascade and add `useMemo` or `useCallback` where needed.

### 7.3 Three.js / 3D Office
- **7.3a** — Add `frustumCulled={true}` to all Three.js objects that are off-camera. This is the default but confirm it's not being overridden.
- **7.3b** — MatrixOverlay canvas texture: regenerate only when scene mode changes, not every frame. Current implementation may be regenerating the texture on every render cycle.
- **7.3c** — Bloom post-processing: confirm `vfxQuality` gate is working. If `vfxQuality` is "low", bloom should be completely disabled — not just reduced.
- **7.3d** — Add a "performance mode" toggle in HQ settings that disables: bloom, matrix overlay, animated particles, and per-desk point lights. Reduces to static lighting only.

---

## BLOCK 8 — TESTING

### 8.1 Unit Tests
Currently all tests are E2E (Playwright). Core lib functions have no unit tests.

- **8.1a** — Add unit tests for `lib/helpers.ts`: `fmtPrice`, `fmtVol`, `timeAgo`. Use Vitest or Jest. Test edge cases: zero, negative, very large numbers, null inputs.
- **8.1b** — Add unit tests for `lib/ragRouter.ts`: `routeQuery()`. Test that each domain route's keywords correctly trigger that route and not others.
- **8.1c** — Add unit tests for `lib/liveContext.ts`: `compactToBudget()`. Test that it respects `maxChars` and that `compacted: true` is set correctly.
- **8.1d** — Add unit tests for `lib/aiModelRouting.ts`: verify each `AITask` maps to the expected model name.
- **8.1e** — Add unit tests for `lib/chatCapabilityRouting.ts`: `detectRouteFromPrompt()`. Test that each keyword set correctly maps to the expected route.

### 8.2 Integration Tests
- **8.2a** — Add a Playwright test that exercises the agent run loop: type a message, confirm a response appears, confirm the phase strip progresses correctly.
- **8.2b** — Add a Playwright test for the notification system: trigger a delta alert, confirm it appears in the notification center.
- **8.2c** — Add a Playwright test for the cron scheduler: create a job, toggle it on, verify it appears in the job list, delete it.
- **8.2d** — Add a Playwright test for the VAULT: save an article from INTEL, navigate to VAULT, confirm it appears.

### 8.3 Eval Coverage
- **8.3a** — Add a `user_satisfaction` eval category to the runtime eval harness. Measure: response length appropriateness, no hallucinated tool names, no broken JSON in tool calls. Weight: 10%.
- **8.3b** — Add a `latency` eval metric: P50 and P95 response time for agent runs. Surface in the runtime eval panel.
- **8.3c** — Add golden-set regression tests: a fixed set of 10 prompt/expected-response pairs. Run them weekly. Alert if any response diverges more than 30% from the golden answer.

---

## BLOCK 9 — DEVELOPER EXPERIENCE

### 9.1 Tooling
- **9.1a** — Add `@next/bundle-analyzer` to dev dependencies. Wire as `npm run analyze`. Makes bundle size visible.
- **9.1b** — Add `knip` for unused dependency detection (`npm run check:unused`). Run before adding new packages.
- **9.1c** — Add `madge` for circular dependency detection (`npm run check:cycles`). Circular imports are a common source of hard-to-debug Next.js issues.
- **9.1d** — Add a `npm run dev:clean` command: kills any running dev server, clears `.next`, then starts fresh. Useful after merge conflicts.

### 9.2 Documentation
- **9.2a** — Write a `docs/onboarding.md`: a 10-minute guide for a new contributor. Cover: what the app does, how to run it, how to add a new data panel, how the agent loop works.
- **9.2b** — Write a `docs/agent-cookbook.md`: 5 example prompts for each agent with the expected output type and which tools they use. Useful for calibrating prompts.
- **9.2c** — Update `docs/architecture.md` to reflect the current state: 3D office, cinematic shell, operational profiles, RAG router, skill engine. The current doc predates several of these.
- **9.2d** — Add JSDoc comments to all exported functions in `lib/agent.ts`, `lib/ai.ts`, and `lib/liveContext.ts`. These are the most complex files and the ones new contributors will read first.

### 9.3 Scripts
- **9.3a** — Add `npm run check:stale` — a script that lists all `tasks/todo.md` items marked `[ ]` that have not been touched in 14+ days (based on git log). Surfaces forgotten work.
- **9.3b** — Add `npm run health` — a command that runs all non-destructive checks in one pass: `type-check`, `lint`, `check:path-collisions`, `security-scan`, `check:unused`. Returns a grade.
- **9.3c** — Add `npm run snapshot:api` — calls each API route and snapshots the response shape. Next run compares shapes. Alerts on any breaking changes to the API contract.

---

## BLOCK 10 — NEW CAPABILITIES (Feature Additions)

These are additions that extend what the platform can do. Build after Blocks 1–2 are done.

### 10.1 Voice Input (Expansion 4.5)
Low complexity, high user impact.

- **10.1a** — Add a microphone button to the HQ chat input. Wire the Web Speech API (`SpeechRecognition`). Transcribe to the input field. No library needed.
- **10.1b** — Show a visual indicator (pulsing ring) when recording. Stop recording on button re-tap or 5 seconds of silence.
- **10.1c** — Add `voiceInputEnabled` toggle in Settings (defaults to off).

### 10.2 Keyword Alert Engine (Expansion 2.5)
Low complexity, high value.

- **10.2a** — Add an `alertKeywords: string[]` field to settings. User can add up to 20 keywords.
- **10.2b** — In the articles loader, after fetching, scan all article titles and summaries for keyword matches. Any match triggers a notification with the article title and source.
- **10.2c** — Highlight matching keywords in article cards with a colored underline.
- **10.2d** — Add keyword rules to the notification center filter row (show alerts triggered by specific keywords).

### 10.3 World Event Map (Expansion 1.4)
Already partially done in OPS. Extend it.

- **10.3a** — Add a country-extraction function that takes an article title and returns a list of ISO2 country codes found. Use a static 250-country lookup dict (name + ISO code).
- **10.3b** — Plot extracted articles as colored Leaflet markers on the OPS map. Color by article category (geo=blue, financial=green, security=red, health=yellow).
- **10.3c** — Clicking a marker opens a popup with the article title, source, and a "Read" link.
- **10.3d** — Add a "Event Density" heatmap overlay: clusters many articles in one region into a heat gradient.

### 10.4 Geopolitical Risk Scoreboard (Expansion 1.2)
See Block 5.3 above. Build the UI after the data is wired.

- **10.4a** — INTEL > "Risk" sub-view: sortable table of countries with risk scores.
- **10.4b** — Click a country row: expand an inline card showing sub-scores (conflict, economic, elections) and the most recent article from that country.
- **10.4c** — Add a "watchlist" for countries. Watched countries trigger notifications when their risk score changes by more than 10 points.

### 10.5 Article Summarizer (Expansion 4.4)
- **10.5a** — Add a "Summarize" button to each article card in INTEL. On click, call `callAI()` with the article URL via `fetch_url` + summarization prompt.
- **10.5b** — Summary format: 3 sentences, 1 bias signal, 1 confidence score. Display inline below the article card.
- **10.5c** — Add a "Summarize all" button at the top of the feed. Queues all visible articles for summarization with a 1-second delay between each (rate-limit protection).

### 10.6 Dashboard Pin System (Block 4.3c above)
- **10.6a** — Add `pinnedPanels: string[]` to settings. Max 6 panels.
- **10.6b** — Add a "Pin" icon to every major panel. Toggle pin/unpin.
- **10.6c** — Add a `/dashboard` route that renders only pinned panels in a responsive grid. Link to it from the Nav with a "Dashboard" entry.

### 10.7 Vehicle / Drone Lane (V0-V1)
These are already in `tasks/todo.md`. Adding detail here.

- **10.7a** — V0.1: Build a `SimulatedTelemetry` module in `lib/vehicle/simTelemetry.ts`. Emits fake telemetry events (GPS, battery, altitude, mode) on a 1-second interval. Used for UI development without real hardware.
- **10.7b** — V0.2: Define the flight telemetry schema as a TypeScript interface. Match MAVLink conventions where possible. Fields: `timestamp`, `lat`, `lon`, `alt`, `battery`, `mode`, `linkQuality`, `velocity`, `heading`, `missionStep`.
- **10.7c** — V0.3: Wire simulated telemetry into the VEHICLE tab. Show: HUD (altitude, speed, battery, mode), map position, attitude indicator.
- **10.7d** — V1.1: Bench bring-up checklist component. A static but printable/saveable checklist with checkbox state persisted in settings.

### 10.8 Plugin Architecture (Expansion 6.1)
The most complex item. Design before building.

- **10.8a** — Write a spec at `specs/features/plugin-architecture.md`. Define: plugin manifest shape, lifecycle hooks (init/fetch/render/teardown), sandbox policy, key injection model.
- **10.8b** — Build the plugin loader: reads manifests from `/plugins/*.json`, validates against the manifest schema, registers each plugin as a named data source.
- **10.8c** — Build the plugin runtime: each plugin's `fetch()` is called on the configured interval, result stored in a `pluginData: Record<pluginId, unknown>` store slice.
- **10.8d** — Build the plugin renderer: a `<PluginCard pluginId="..." />` component that calls each plugin's `render(data)` and mounts the result safely.
- **10.8e** — Write a sample plugin (`plugins/example-rss.json`) that fetches an RSS feed and renders article cards using the existing article card design.

---

## BLOCK 11 — RETENTION & SELF-IMPROVEMENT SYSTEMS

These specifically address the "reinforce learning and retention" ask.

### 11.1 Lessons Engine
- **11.1a** — Parse `tasks/lessons.md` at runtime into a `Lesson[]` store slice. Each lesson has: `id`, `rule`, `why`, `addedAt`, `reinforcedCount`, `applicableAgents`.
- **11.1b** — Before each agent run in `lib/agent.ts`, filter lessons applicable to the detected agent and inject the top 3 (by relevance to the current query) as a `[ACTIVE RULES]` block in the system prompt.
- **11.1c** — After a run that triggered a lesson-relevant path, increment `reinforcedCount` for that lesson. This surfaces frequently-triggered lessons for review.
- **11.1d** — Add a "Lessons" view to the Settings drawer: shows all lessons sorted by `reinforcedCount`. The most-triggered lessons are the most important to keep.

### 11.2 Memento-Skills Improvements
- **11.2a** — When a Memento-Skills lesson is approved, tag it with the agent ID and the RAG domain route that was active during the run.
- **11.2b** — Add a "lesson conflict detector": before writing a new lesson, check existing lessons for semantic similarity. If a conflict exists, prompt Mario to merge or override.
- **11.2c** — Show a "lesson impact" score: how many subsequent runs explicitly used this lesson (requires the injection tracking from 11.1c).

### 11.3 Run History & Replay
- **11.3a** — `agentRunHistory` is stored in the Zustand store. Add a "Run History" panel in Settings: a list of past runs with agent, duration, tool count, verification status.
- **11.3b** — Each run entry in the panel can be expanded to show: the original user message, the tool call sequence, the final answer, and the verification summary.
- **11.3c** — Add a "Replay" button: pre-fills the HQ chat input with the original message from that run. User can re-run it to compare results.
- **11.3d** — Add a "Share run" button: exports the run artifact as a JSON file. Useful for debugging or showing Mario what the agent did.

### 11.4 Agent Performance Tracking
- **11.4a** — `AgentStats` already has `totalTasks`, `lastConfidence`, `lastActiveAt`. Add: `avgConfidence`, `totalToolCalls`, `verificationPassRate`, `lessonsTaught`.
- **11.4b** — Show per-agent performance cards in the HQ office wall board: a compact stats row under each agent's name (tasks / pass rate / lessons).
- **11.4c** — Add a weekly summary notification: every Monday at 9am, if the cron scheduler is running, generate a "Week in Review" that shows: which agent ran most, which tool was used most, highest-confidence runs, any degraded runs.

### 11.5 Knowledge Retention Drills
An idea for making the system teach Mario, not just answer him.

- **11.5a** — Add a "Daily Briefing" cron job preset: every morning, JANSKY reads the last 24h of `agentRunHistory`, identifies the most important insight from each run, and writes a 5-bullet summary to a markdown file in VAULT.
- **11.5b** — Add a "Flash Review" feature: user can mark any agent response as "important". Once per session, if there are 3+ marked responses, offer a quick-review mode showing just those responses with a checkbox to confirm retained.
- **11.5c** — NOVA generates "Key Claims" for every research output: a bullet list of the most important facts found. These are stored separately in the memory store tagged `type: "key_claim"`.

---

## PRIORITY MATRIX

| Block | Item Range | Priority | Estimated Effort | Do First |
|-------|-----------|----------|-----------------|----------|
| 1 — P1 Cinematic | CP1.1–CP1.4 | P0 | 2–3 weeks | YES — blocks GA |
| 1 — P2 Release | CP2.1–CP2.4 | P0 | 1–2 weeks | YES — blocks GA |
| 2 — Code Quality | 2.1–2.5 | P1 | 1 week | YES — reduces bugs |
| 3.1 — Prompt Caching | A5 | P1 | 3 days | YES — cost reduction |
| 3.2 — Skill Governance | A6 | P1 | 4 days | YES — agent safety |
| 4.1 — Navigation UX | 4.1a–4.1d | P1 | 2 days | YES — daily use |
| 4.4 — Notifications | 4.4a–4.4c | P1 | 1 day | YES — daily use |
| 10.2 — Keyword Alerts | 2.5 | P1 | 1 day | YES — high value |
| 10.1 — Voice Input | 4.5 | P2 | 2 days | NEXT |
| 5.1 — New Data Sources | 5.1a–5.1g | P2 | 1 week | NEXT |
| 6.1 — Rate Limiting | 6.1a–6.1c | P1 | 2 days | YES — security |
| 6.2 — Input Sanitization | 6.2a–6.2c | P1 | 2 days | YES — security |
| 8.1 — Unit Tests | 8.1a–8.1e | P2 | 3 days | NEXT |
| 11.1 — Lessons Engine | 11.1a–11.1d | P2 | 3 days | NEXT |
| 11.3 — Run History | 11.3a–11.3d | P2 | 2 days | NEXT |
| 3.4 — Agent Detection | 3.4a–3.4c | P2 | 2 days | NEXT |
| 7.2 — React Rendering | 7.2a–7.2c | P2 | 2 days | NEXT |
| 10.3 — World Event Map | 1.4 | P3 | 4 days | LATER |
| 10.4 — Geo Risk Board | 1.2 | P3 | 5 days | LATER |
| 10.5 — Summarizer | 4.4 | P3 | 2 days | LATER |
| 3.3 — TimesFM | A7 | P3 | 1 week | LATER |
| 10.7 — Vehicle Lane | V0–V1 | P3 | 2 weeks | LATER |
| 10.8 — Plugin System | 6.1 | P4 | 3 weeks | FUTURE |

---

## SEQUENCING RECOMMENDATION

**Week 1–3:** Complete Block 1 entirely (P1 cinematic + P2 release). Nothing else.

**Week 4:** Block 2 (code quality). Run `npm run verify` clean at the end of each day.

**Week 5:** Block 3.1 (prompt caching) + Block 3.2 (skill governance) + Block 6.1–6.2 (security).

**Week 6–7:** Block 4 (UX improvements) + Block 10.2 (keyword alerts) + Block 10.1 (voice input).

**Week 8–10:** Block 5 (data sources) + Block 11 (retention systems) + Block 8.1 (unit tests).

**Week 11+:** Block 10.3–10.5 (world map, geo risk, summarizer), Block 3.3–3.4 (forecasting, agent detection).

**Month 4+:** Block 10.7 (vehicle), Block 10.8 (plugins), Block 3.5–3.6 (memory, RAG).

---

## DEFINITION OF DONE (for each item)
1. `npx tsc --noEmit` passes.
2. `npm run verify` passes.
3. The patched section of each file has been re-read after editing.
4. The feature works in a local `npm run dev` session.
5. For UI items: tested at 1280px, 1440px, and 1920px.
6. For agent items: one manual run in HQ confirms expected behavior.
7. Lesson added to `tasks/lessons.md` if a correction was needed.
8. Item checked off in `tasks/todo.md`.
