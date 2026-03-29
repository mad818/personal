# Nexus Prime — Performance Improvement Plan

Generated: 2026-03-28
Scope: All tabs (HOME/HQ, COMMAND, SIGNALS, ALPHA, INTEL, OPS, CYBER, VAULT) + API layer + project folder
Source: Full codebase scan + prior optimization sessions

---

## How to read this plan

Each item has:
- **Files**: exact paths to touch
- **What**: what the problem is right now
- **Fix**: what to change
- **Gain**: expected impact (LOW / MEDIUM / HIGH)
- **Effort**: rough work time (S = < 2h, M = half day, L = full day+)

Items are ordered from easiest to hardest within each phase. Do phases in order. Each phase can be committed independently.

---

## Phase 1 — Dead Code and Immediate Wins

These are isolated, low-risk changes with no side effects. Ship them first.

### 1A — Wire `buildDeltaSweep` into `usePrices` and `useCVEs`

**Files**: `hooks/usePrices.ts`, `hooks/useCVEs.ts`, `lib/liveContext.ts`
**What**: `buildDeltaSweep(prev, curr)` is fully written and exported from `lib/liveContext.ts` but zero callers exist anywhere in the codebase. The delta alert system (price moves ≥3%, CVE spikes ≥3, world risk shift ≥10pts) is silently dead.
**Fix**: In `usePrices.fetchPrices`, keep a `prevPricesRef`. After `setPrices(prices)`, compute `buildDeltaSweep(prevSnapshot, currSnapshot)` and push any `DeltaAlert[]` into `useStore.notifications` via `addNotification`. Mirror the same pattern in `useCVEs` after each CVE fetch.
**Gain**: HIGH — activates the real-time alert system that the TelemetryHUD and NotificationCenter expect
**Effort**: S

---

### 1B — Add `visibilitychange` pause to `usePrices` and `useGlobalData`

**Files**: `hooks/usePrices.ts`, `hooks/useGlobalData.ts`
**What**: Both hooks poll on a fixed interval (`setInterval`) with no awareness of tab visibility. When the user switches away from Nexus, both hooks keep firing every 60s — burning API quota and CPU for zero user value. The pattern is already correct in `OfficeCommandCenter.tsx`, `RuntimeEvalTrend.tsx`, and `TelemetryHUD.tsx`; it just hasn't been applied to the data hooks.
**Fix**: In `usePrices.start()`, after calling `setInterval`, add:
```typescript
const onVisible = () => { if (!document.hidden) fetchPrices() }
document.addEventListener('visibilitychange', onVisible)
// store cleanup ref alongside timerRef
```
In `usePrices.stop()`, remove the listener. Apply the same pattern to each individual fetcher in `useGlobalData` (or centrally in `fetchAll`).
**Gain**: MEDIUM — saves external API calls and battery when Nexus is backgrounded
**Effort**: S

---

### 1C — `apiCache.ts` is unused — wire it into slow routes

**Files**: `lib/apiCache.ts`, `app/api/earthquakes/route.ts`, `app/api/fear-greed/route.ts`, `app/api/cves/route.ts`
**What**: `lib/apiCache.ts` is a well-built LRU cache with TTL and hit-rate stats. It exports `createCache` and `fetchJsonCached`. Currently zero API routes import or use it. Every request to `/api/earthquakes` fires two live USGS fetches. Every request to `/api/fear-greed` fires two live alternative.me fetches. The Fear & Greed index updates once per day.
**Fix**:

For `/api/fear-greed`:
```typescript
import { createCache } from '@/lib/apiCache'
const fgCache = createCache<FearGreedResponse>({ defaultTTL: 3_600_000 }) // 1 hour
// At top of GET: check cache first, return cached if hit, else fetch and cache
```

For `/api/earthquakes`:
```typescript
const eqCache = createCache({ defaultTTL: 300_000 }) // 5 min — USGS refreshes ~5 min
```

For `/api/cves`:
```typescript
const cveCache = createCache({ defaultTTL: 600_000 }) // 10 min — NVD is slow (30-45s timeout)
```

Also add `Cache-Control: public, max-age=60, s-maxage=300` headers to the responses of these routes so the Next.js edge layer and any CDN can serve them without hitting the handler at all.
**Gain**: HIGH — `/api/cves` with a 45s timeout is the worst latency in the app. Caching cuts that to < 1ms for repeat callers
**Effort**: S per route

---

### 1D — Add HTTP cache headers to semi-static routes

**Files**: `app/api/gdelt/route.ts`, `app/api/threat-intel/route.ts`, `app/api/hacker-news/route.ts`, `app/api/conflict/route.ts`, `app/api/commodities/route.ts`, `app/api/metals/route.ts`, `app/api/fx/route.ts`
**What**: All 19 routes that use `export const dynamic = 'force-dynamic'` return responses with no `Cache-Control` header. Next.js therefore treats every response as uncacheable. Several of these sources update hourly or less often.
**Fix**: Add `Cache-Control` header to `NextResponse.json(data, { headers: { 'Cache-Control': '...' } })` per route:

| Route | Suggested max-age | Reason |
|-------|------------------|--------|
| `/api/fear-greed` | `s-maxage=3600` | Updates once/day |
| `/api/earthquakes` | `s-maxage=300` | USGS refreshes ~5 min |
| `/api/gdelt` | `s-maxage=600` | 10-min resolution |
| `/api/threat-intel` | `s-maxage=900` | OTX feed is near-hourly |
| `/api/hacker-news` | `s-maxage=600` | HN updates every few minutes |
| `/api/commodities` | `s-maxage=300` | Market hours only |
| `/api/metals` | `s-maxage=300` | Same |
| `/api/fx` | `s-maxage=60` | FX updates frequently |
| `/api/conflict` | `s-maxage=1800` | Conflict events are slow-moving |

**Gain**: MEDIUM — reduces origin load when running behind Vercel, Coolify reverse proxy, or Cloudflare
**Effort**: S (mechanical header addition across routes)

---

## Phase 2 — Store and React Render Efficiency

### 2A — SettingsDrawer subscription narrowing

**Files**: `components/settings/SettingsDrawer.tsx`
**What**: Line 47 uses `useStore((s) => s.settings)` — this subscribes to the entire `settings` object. Any time any setting key changes (including `watchlist`, `alertKeywords`, or any key field updated by another component), `SettingsDrawer` re-renders in full even when it is closed. The drawer is mounted in `app/layout.tsx` and stays mounted for the session lifetime.
**Fix**: The drawer only reads `settings` to populate form fields when `open` is true. Wrap the re-render guard with a state check:
```typescript
// Instead of one broad subscription:
const settings = useStore((s) => s.settings)
// Split into focused selectors for fields actually displayed in form:
const aiProvider    = useStore((s) => s.settings.aiProvider)
const localEndpoint = useStore((s) => s.settings.localEndpoint)
// ... etc only for fields in LOCAL_FIELDS array
```
Alternatively, add `React.memo` to the drawer component and pass `settings` as a stable prop from the parent after filtering.
**Gain**: MEDIUM — eliminates silent re-renders every time prices update (prices update causes store write which can cascade)
**Effort**: S

---

### 2B — Dead props and redundant text in prompts.ts

**Files**: `components/home/office/prompts.ts`
**What**: `prompts.ts` contains several legacy comment blocks that were written during 2D → 3D migration. These blocks add tokens to every single agent prompt but describe behaviors that have been removed or fully replaced. Example: references to 2D canvas drawing, old tool call patterns from pre-RAG-router era.
**Fix**: Audit `prompts.ts` for any comment or instruction block that references a removed feature. Remove or shorten. Target: reduce each agent prompt by 10–20% without removing active directives (TDD discipline, NOVA workflow, ORBIT verify step are all active and must stay).
**Gain**: MEDIUM — shorter prompts = faster first-token latency + lower token cost per run
**Effort**: M (requires careful reading to avoid removing active rules)

---

### 2C — React.memo on high-frequency list item components

**Files**: `components/signals/NewsFeed.tsx`, `components/cyber/CVEFeed.tsx`, `components/vault/SavedArticles.tsx`, `components/alpha/PriceGrid.tsx`
**What**: Only 4 components in the entire codebase use `React.memo`. List-item sub-components (the card rendered per article, per CVE, per price row) re-render on every store update even when their specific data hasn't changed, because the parent re-renders on any slice update.
**Fix**: Extract or wrap individual list-item renders in `React.memo`:
```typescript
// Example for CVE card
const CVECard = React.memo(function CVECard({ cve }: { cve: CVE }) { ... })
```
This is especially impactful for SavedArticles (which now has tag editors that are full controlled components) and CVEFeed (which can hold 50+ items).
**Gain**: MEDIUM — cuts render work proportional to list length on every polling update
**Effort**: S per component

---

### 2D — Shallow selector for KPICards and AIBriefing

**Files**: `components/command/KPICards.tsx`, `components/command/AIBriefing.tsx`
**What**: Both components subscribe to `prices`, `sparklines`, `signals`, `cves`, and `worldRisk` via separate `useStore` calls. This is correct per-field pattern. However, `signals` is an object: subscribing to `s.signals` causes re-render any time any sub-key of signals updates (mempool, defi, fg). These components only need `signals.fg`.
**Fix**:
```typescript
// Instead of:
const signals = useStore((s) => s.signals)
// Use:
const fg = useStore((s) => s.signals.fg)
```
Apply across all components that only use `fg` from `signals`.
**Gain**: LOW-MEDIUM
**Effort**: S

---

### 2E — Consolidate scheduler polling in CronSchedulerRunner

**Files**: `components/ui/CronSchedulerRunner.tsx`
**What**: The runner checks due jobs on a short poll interval. Each tick calls `useStore.getState()` which is fine, but the component also subscribes to the full `scheduledJobs` array via a store selector. When an agent run completes and updates `agentStats`, the runner re-renders unnecessarily because `agentStats` and `scheduledJobs` share the same store write flush.
**Fix**: Use `subscribeWithSelector` pattern for the runner, or move the polling tick into a `useEffect` with a ref-based store read (`useStore.getState().scheduledJobs`) rather than a reactive selector.
**Gain**: LOW
**Effort**: S

---

## Phase 3 — AI Token Budget and Latency

### 3A — Trim RAG context block for short queries

**Files**: `lib/ragRouter.ts`, `components/home/office/OfficeCommandCenter.tsx`
**What**: `buildRagContextBlock(query)` returns a fixed-length multi-line block regardless of how complex or short the query is. For a 3-word message like "btc price?" the full RAG block (domain, primary tools, fallback tools, credibility, rationale) adds ~60 tokens that repeat the obvious.
**Fix**: Add a query length check in `buildRagContextBlock`:
```typescript
export function buildRagContextBlock(query: string): string {
  if (query.trim().split(/\s+/).length < 8) {
    // Short query — one-liner hint only
    const s = routeQuery(query)
    return `\n[RAG: ${s.domain} — use ${s.primaryTools[0]}]\n`
  }
  // Full block for complex queries
  ...existing code...
}
```
**Gain**: MEDIUM — saves 40-60 tokens per short dispatch, speeds first-token
**Effort**: S

---

### 3B — Stream all remaining AI calls in UI components

**Files**: `components/command/AIBriefing.tsx`, `components/command/BusinessBuilder.tsx`, `components/command/FocusPanel.tsx`, `components/command/JobRiskAnalyzer.tsx`, `components/alpha/BuyBot.tsx`, `components/intel/StrategyFrameworks.tsx`, `components/ui/CronSchedulerRunner.tsx`
**What**: All 7 of these components call `callAI(prompt, maxTokens)` — the non-streaming version — and display the result only after the entire response is generated. For long outputs (JobRiskAnalyzer, BusinessBuilder) users wait 10-20 seconds with no feedback.
**Fix**: Replace each `callAI(...)` call with `streamAI(...)` and accumulate the streamed text into a `useState` as chunks arrive. Display partial text as it streams. This is the same pattern already used in `OfficeCommandCenter`.
Example:
```typescript
// Before:
const result = await callAI(prompt, 1200)
setOutput(result)
// After:
let buf = ''
await streamAI({ prompt, maxTokens: 1200, onChunk: (chunk) => {
  buf += chunk
  setOutput(buf)
}})
```
**Gain**: HIGH for UX — users see words as they arrive instead of a loading spinner
**Effort**: M (each component needs state + onChunk wiring)

---

### 3C — Compress live context block in buildLiveContext

**Files**: `lib/liveContext.ts`
**What**: `buildLiveContext(state)` generates a verbose block with full decimal prices, full article titles (up to 6), and full CVE descriptions. The entire block can exceed 800 tokens for a loaded store. For HQ agent runs that also include `buildFilteredLiveContext`, `buildDeltaSweep` output, and `buildRagContextBlock`, the system prompt can grow past 2000 tokens before the user message even starts.
**Fix**: Apply a character budget to articles and CVEs in the block:
- Cap article titles at 80 chars (use `.slice(0, 80)`)
- Limit CVE descriptions to CVE ID + CVSS score only (drop description text)
- Truncate worldRisk to integer (it is already but verify)
- Add total block length assertion (`if (block.length > 1200) trimBlock(block)`)

Also consider building a `buildCompactLiveContext` variant for short-query dispatches (under 10 words) that skips the full article list.
**Gain**: MEDIUM — 30-40% smaller system prompt → faster first-token, lower cost
**Effort**: S

---

### 3D — Per-agent context filtering already in place — extend it

**Files**: `lib/liveContext.ts`, `components/home/office/prompts.ts`
**What**: `buildFilteredLiveContext(state, agentId)` exists but the filter table only covers a few agents. FLUX gets market data filtered in but all agents still receive the full capabilities block.
**Fix**: Extend the filter map to make `buildCapabilitiesBlock(agentId)` return only the tools listed as `primaryTools` or `fallbackTools` in the RAG routing table for that agent's domain. CIPHER doesn't need `open_meteo_weather`. FLUX doesn't need `hf_papers_search`. Each tool description in the capabilities block costs ~15-20 tokens.
**Gain**: LOW-MEDIUM
**Effort**: S

---

## Phase 4 — API Layer Hardening and Parallelism

### 4A — Parallelize `fetchGDELTFallback` in `app/api/news/route.ts`

**Files**: `app/api/news/route.ts`
**What**: The `fetchGDELTFallback()` function iterates four queries sequentially with a `for...of` loop. Each query is an independent HTTP request to GDELT. Currently they run one after another — minimum 4 × network RTT even if all succeed fast.
**Fix**:
```typescript
async function fetchGDELTFallback(): Promise<NewsItem[]> {
  const queries = [...]
  const results = await Promise.allSettled(
    queries.map(({ q, cat }) => fetchSingleGDELT(q, cat))
  )
  return results.flatMap((r) => r.status === 'fulfilled' ? r.value : [])
}
```
**Gain**: MEDIUM — GDELT fallback path goes from ~32s worst case to ~8s worst case
**Effort**: S

---

### 4B — Guardian API call: move to server-side proxy

**Files**: `hooks/useArticles.ts`, `app/api/news/route.ts`
**What**: The Guardian fetch in `useArticles.fetchArticles()` (line 106) makes a direct browser-side request to `content.guardianapis.com` using the key stored in `settings.guardianKey`. This exposes the key in network traffic visible to the browser. It also bypasses the `revalidate: 300` caching that the server-side news route uses.
**Fix**: Add Guardian to the server-side `app/api/news/route.ts` handler. Read `process.env.GUARDIAN_KEY` there. Remove the browser-side Guardian fetch from `useArticles.ts`. This also lets the Next.js `next: { revalidate: 300 }` cache apply to Guardian results.
**Gain**: MEDIUM-HIGH — security improvement + Guardian results cached server-side
**Effort**: M

---

### 4C — Abort stale requests in `useGlobalData`

**Files**: `hooks/useGlobalData.ts`
**What**: `fetchAll()` fires 8 requests with `Promise.allSettled`. Each individual fetcher creates its own `AbortSignal.timeout(10000)`. But if the user navigates away or triggers a second `fetchAll` before the first completes, both sets of requests are in flight simultaneously. The second set writes store state over the first in unpredictable order.
**Fix**: Add an `AbortController` at the `fetchAll` level:
```typescript
const controllerRef = useRef<AbortController | null>(null)
const fetchAll = useCallback(async () => {
  controllerRef.current?.abort()
  controllerRef.current = new AbortController()
  const signal = controllerRef.current.signal
  // pass signal down to each fetcher
})
```
**Gain**: LOW-MEDIUM — prevents race conditions during rapid refresh
**Effort**: S

---

### 4D — Add request deduplication to `apiFetch`

**Files**: `lib/apiFetch.ts`
**What**: Multiple components can call the same endpoint within the same render cycle. For example, `GlobalDataLoader` and a tab-specific loader may both call `/api/fear-greed` within milliseconds. Both requests go out independently.
**Fix**: Add an in-flight request map to `apiFetch`:
```typescript
const inflight = new Map<string, Promise<Response>>()
export async function apiFetch(url: string, opts?: RequestInit): Promise<Response> {
  const key = url
  if (inflight.has(key)) return inflight.get(key)!
  const p = fetch(url, opts).finally(() => inflight.delete(key))
  inflight.set(key, p)
  return p
}
```
**Gain**: LOW-MEDIUM — eliminates duplicate in-flight requests to the same endpoint
**Effort**: S

---

## Phase 5 — Tab-Specific Improvements

### COMMAND tab

**5A — AIBriefing: memoize article slice**
`AIBriefing` reads `articles` (full array) and builds a briefing prompt from the top 5. The `articles` array can hold 60+ items and is replaced wholesale on each fetch. Wrap the prompt-building logic in `useMemo([articles])` so the prompt string only rebuilds when articles actually change.
Files: `components/command/AIBriefing.tsx` | Gain: LOW | Effort: S

**5B — KPICards: memoize derived values**
KPICards computes derived stats (BTC dominance %, total market cap) inline on every render. These are pure functions of `prices`. Move them into `useMemo`.
Files: `components/command/KPICards.tsx` | Gain: LOW | Effort: S

**5C — BusinessBuilder and JobRiskAnalyzer: lazy mount**
Both components are visible on the COMMAND tab but are complex (267/266 lines each with their own state machines). They are imported eagerly. Add `next/dynamic` lazy loading with `ssr: false` to defer their JS until the user interacts with the tab.
Files: `app/command/page.tsx` | Gain: MEDIUM (initial load) | Effort: S

---

### SIGNALS tab

**5D — NewsFeed: virtualize long article list**
Articles can reach 80+ items. The feed renders all of them to the DOM at once. Use `react-intersection-observer` (already in `package.json`) to implement a "load more" or infinite scroll pattern — render 20 items, then append 20 more when the user scrolls to the bottom.
Files: `components/signals/NewsFeed.tsx` | Gain: MEDIUM | Effort: M

**5E — TopicHeatmap: debounce resize observer**
The heatmap SVG recalculates cell sizes on every resize event. Add a 150ms debounce to the resize handler.
Files: `components/signals/TopicHeatmap.tsx` | Gain: LOW | Effort: S

---

### ALPHA tab

**5F — MomentumScanner: run scoring off main thread**
`computeScore()` runs a linear regression over sparkline arrays for every coin on every render triggered by a price update. Move this to a `useMemo` keyed on `[prices, sparklines]` so it only recomputes when data changes, not on every parent re-render.
Files: `components/alpha/MomentumScanner.tsx` | Gain: MEDIUM | Effort: S

**5G — PriceGrid: stable row keys and memo**
PriceGrid renders one row per coin. Each row re-renders when `prices` updates (every 60s). Wrap each row in `React.memo` with a custom comparator that only re-renders when that specific coin's price or change value differs.
Files: `components/alpha/PriceGrid.tsx` | Gain: MEDIUM | Effort: S

---

### INTEL tab

**5H — PolymarketFeed: paginate events**
PolymarketFeed can return 200+ events. All render at once. Add pagination or a "show more" button. Limit initial render to 30 events.
Files: `components/intel/PolymarketFeed.tsx` | Gain: MEDIUM | Effort: S

**5I — SECFilingsFeed: cache the last fetch timestamp**
SEC EDGAR search is slow. The component fetches on every mount (tab switch). Add a `lastFetchedAt` ref and skip the fetch if last fetch was < 5 minutes ago, returning the cached store data instead.
Files: `components/intel/SECFilingsFeed.tsx` | Gain: MEDIUM | Effort: S

**5J — FlightTracker: pause polling when sub-tab is not active**
FlightTracker polls OpenSky every 60s. The intel tab has sub-tabs. If the user is on a different sub-tab, FlightTracker should pause. Check the active sub-tab from the store before each poll tick.
Files: `components/intel/FlightTracker.tsx` | Gain: LOW | Effort: S

---

### OPS tab

**5K — OpsMap: lazy-load Leaflet layers**
OpsMap is 692 lines and loads all Leaflet layer plugins eagerly. Several layers (fires, ships, satellites) are rarely toggled. Import the layer modules inside the toggle handler using dynamic `import()` instead of at the top of the file.
Files: `components/ops/OpsMap.tsx` | Gain: MEDIUM (initial bundle) | Effort: M

**5L — GeoHeatmap: throttle canvas redraws**
The heatmap canvas redraws on every data update. Wrap the draw call in `requestAnimationFrame` to batch multiple rapid updates into a single frame paint.
Files: `components/ops/GeoHeatmap.tsx` | Gain: LOW | Effort: S

---

### CYBER tab

**5M — CVEFeed: paginate and memo item cards**
CVEFeed renders all CVEs sorted by severity. The list can hold 50+ items. Paginate to 25 items (with a "show more" button) and wrap `CVECard` in `React.memo`. The card only needs to re-render when its specific CVE object changes.
Files: `components/cyber/CVEFeed.tsx` | Gain: MEDIUM | Effort: S

**5N — TriageView: debounce filter changes**
TriageView re-filters and re-correlates CVE/OTX/CISA data on every keypress in the search box. Add a 200ms debounce to the filter input before applying the filter pipeline.
Files: `components/cyber/TriageView.tsx` | Gain: LOW | Effort: S

**5O — OTXFeed: cache per-pulse TTL**
OTX pulses change infrequently. The `useOTX` hook fetches on every mount with no cache check. Add a `lastFetched` ref: skip fetch if store already has data from < 10 minutes ago.
Files: `hooks/useOTX.ts` | Gain: MEDIUM | Effort: S

---

### VAULT tab

**5P — SavedArticles: virtualize large vaults**
The Vault can hold unlimited bookmarked articles. All render to DOM at once. Use the same `react-intersection-observer` pattern from 5D to cap the initial render at 30 articles with progressive loading.
Files: `components/vault/SavedArticles.tsx` | Gain: MEDIUM | Effort: M

**5Q — VaultSearch: debounce text input**
The search input in SavedArticles runs the full filter + sort pipeline synchronously on every keystroke. Add a 150ms debounce before calling `setQuery`.
Files: `components/vault/SavedArticles.tsx` | Gain: LOW | Effort: S

---

### HOME / HQ tab

**5R — OfficeRoom3D: isolate agent animation from data polling**
`OfficeRoom3D` is 2234 lines and handles both 3D rendering and data-driven agent state. When `agentStats` updates (every agent run), the entire component tree inside `Canvas` re-renders including the lighting, furniture, and particle systems that don't depend on agent state.
**Fix**: Extract the agent-state-dependent nodes (AgentMarker, WallBoard) into a separate child component that only subscribes to `agentStats`. The static scene geometry (furniture, lighting, particles) should receive no store subscriptions.
Files: `components/home/office/OfficeRoom3D.tsx` | Gain: HIGH | Effort: L

**5S — ParticleBackground: use CSS instead of canvas**
`components/ui/ParticleBackground.tsx` runs a canvas animation loop via `requestAnimationFrame` on every frame. This runs even when no user interaction is happening and consumes a GPU compositing layer. Replace with a CSS `@keyframes` animation on positioned `<div>` elements — identical visual result, zero JS frame cost.
Files: `components/ui/ParticleBackground.tsx` | Gain: MEDIUM | Effort: M

**5T — HomeAmbient: pause ambient effects when HQ tab not visible**
`HomeAmbient` may run animations or intervals. Check if it respects tab visibility. Add the `visibilitychange` pattern if not.
Files: `components/home/HomeAmbient.tsx` | Gain: LOW | Effort: S

---

## Phase 6 — Bundle Size and Build Pipeline

### 6A — Analyze bundle with `@next/bundle-analyzer`

**Files**: `package.json`, `next.config.js`
**What**: No bundle analysis is set up. The project uses Three.js (`three@0.180`), Framer Motion (`framer-motion@11`), Recharts, and Leaflet — all heavy packages. Without analysis, it is unknown which chunks are largest or if tree-shaking is working.
**Fix**:
```bash
npm install --save-dev @next/bundle-analyzer
```
Add to `next.config.js`:
```javascript
const withBundleAnalyzer = require('@next/bundle-analyzer')({ enabled: process.env.ANALYZE === 'true' })
module.exports = withBundleAnalyzer({...})
```
Add to `package.json`:
```json
"analyze": "ANALYZE=true next build"
```
Run once, record the largest chunks, then target them in 6B–6D.
**Gain**: Diagnostic — enables 6B, 6C, 6D
**Effort**: S

---

### 6B — Three.js: import only used classes

**Files**: `components/home/office/OfficeRoom3D.tsx` and any file that imports from `three`
**What**: If any file has `import * as THREE from 'three'`, the entire 1.8MB Three.js library is bundled. Even named imports pull full modules if the package doesn't support tree-shaking (Three.js does with ESM, but only if the bundler is configured correctly).
**Fix**: Ensure all Three.js imports are named (`import { MeshStandardMaterial, BoxGeometry } from 'three'`), never namespace. Confirm `package.json` has no `sideEffects: true` override.
**Gain**: MEDIUM (initial JS download) | Effort: M

---

### 6C — Framer Motion: replace with CSS transitions where possible

**Files**: any component using `motion.*` for simple fade/slide transitions
**What**: `framer-motion@11` is ~130KB minified. Many of its uses in Nexus are simple `opacity` and `translateY` fades that a CSS `transition` or `@keyframes` could handle.
**Fix**: Audit `motion.*` usage. Replace any `motion.div` that only animates `opacity`, `x`, or `y` with a plain `div` and a Tailwind transition class. Keep Framer Motion only for physics-based or gesture-driven animations.
**Gain**: LOW-MEDIUM | Effort: M

---

### 6D — Code-split COMMAND tab heavy components

**Files**: `app/command/page.tsx`
**What**: BusinessBuilder, JobRiskAnalyzer, and EventRadar are imported at the top of the COMMAND page. They are visible only when the user clicks to that tab. They contain complex local state machines and reference several chart libraries.
**Fix**: Apply `next/dynamic` with `ssr: false` to all three:
```typescript
const BusinessBuilder = dynamic(() => import('@/components/command/BusinessBuilder'), { ssr: false })
```
**Gain**: MEDIUM (fast initial tab load) | Effort: S

---

### 6E — Remove archive imports from active build

**Files**: `archive/` directory, `tsconfig.json`
**What**: The `archive/` directory contains ~25 TSX/TS files from a previous chat UI. `tsconfig.json` may include the `archive/` path in compilation. Running `tsc` already passes, but the bundler may include some archive modules if they are accidentally imported.
**Fix**: Add `"exclude": ["archive"]` to `tsconfig.json` if not already present. Verify no active file imports from `archive/`.
**Gain**: LOW (clean compile, clearer code surface) | Effort: S

---

## Phase 7 — Developer Experience and Observability

### 7A — Add `npm run perf` command for profiling

**Files**: `package.json`, `scripts/perf-check.js`
**What**: There is no standard way to run a quick performance snapshot. Developers rely on browser DevTools ad hoc.
**Fix**: Add a Node script that hits the 5 slowest endpoints sequentially (`/api/cves`, `/api/fear-greed`, `/api/earthquakes`, `/api/news`, `/api/gdelt`) and prints response times. Add to `package.json` as `"perf": "node scripts/perf-check.js"`.
**Gain**: LOW (DX) | Effort: S

---

### 7B — Expose cache hit rate in `/api/status`

**Files**: `app/api/status/route.ts`, `lib/apiCache.ts`
**What**: Once Phase 1C is complete (apiCache wired into routes), the cache hit rate is available via `cache.stats()`. This should be surfaced in the status diagnostics endpoint so the HQ status drawer can show it.
**Fix**: Export a singleton cache registry from `lib/apiCache.ts`. Each route registers its cache on import. `/api/status` calls `.stats()` on each and includes them in the `diagnostics` object.
**Gain**: LOW (observability) | Effort: S

---

### 7C — Add animation mode setting to suppress all motion

**Files**: `store/useStore.ts`, `components/home/office/OfficeRoom3D.tsx`, `components/ui/ParticleBackground.tsx`
**What**: Users on low-power machines or those with `prefers-reduced-motion` get the full 3D office, particles, and Framer Motion animations with no opt-out.
**Fix**: Add `reducedMotion: boolean` to `settings`. Check `window.matchMedia('(prefers-reduced-motion: reduce)')` on first load and pre-set it. Components check this flag and skip/simplify their animations.
**Gain**: MEDIUM (accessibility + low-power UX) | Effort: M

---

## Execution order summary

| Priority | Phase | Items | Expected time |
|----------|-------|-------|---------------|
| Ship now | 1 | 1A, 1B, 1C, 1D | 1 day |
| Next sprint | 2 | 2A, 2B, 2C, 2D | 1 day |
| Next sprint | 3 | 3A, 3B, 3C | 1.5 days |
| Next sprint | 4 | 4A, 4B, 4C, 4D | 1 day |
| Per tab | 5 | Any tab-specific items as you work that tab | As you go |
| Background | 6 | 6A first, then 6B–6E after analysis | 2 days |
| Ongoing | 7 | 7A, 7B, 7C | 0.5 days |

**Start with Phase 1.** Items 1A through 1D are independent, low-risk, and produce measurable gains with < 2 hours of work each. Phase 3B (streaming) has the highest user-facing impact and should be prioritized in the next sprint after Phase 1 ships.
