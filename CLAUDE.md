# NEXUS PRIME — Project Memory

## What this project is
Nexus Prime is a single-file intelligence dashboard built as `nexus-final.html`. It runs entirely in the browser — no build step, no backend, no server. Every feature is in that one file. Do not create separate JS or CSS files unless explicitly asked.

## Primary file
```
nexus-final.html  (~11,415 lines, ~600KB)
```
All work happens in this file. Read sections before editing. Always search for existing patterns before adding new ones.

---

## Tab structure
| Nav label | data-tab value | HTML id | Purpose |
|-----------|---------------|---------|---------|
| ⚡ COMMAND | superset | tab-superset | Default landing tab. KPI cards, buy signals, alerts, AI briefing, event predictor, deep research |
| 📡 SIGNALS | articles | tab-articles | Live news feed with bias filter, threads, clusters |
| 🎯 ALPHA | buys | tab-buys | Momentum scanner, Buy Bot signals, position sizing, Firecrawl injector |
| 🌍 OPS | world | tab-world | Conflict tracker, Shadowbroker live intel layers, FX, commodities, OSINT panels |
| 📊 INTEL | strategy | tab-strategy | Polymarket odds, Porter 5 Forces, VRIO, BCG Matrix, JTBD, SaaS lifecycle tracker |
| 🔒 CYBER | security | tab-security | CVEs, OTX threat intel, CISA advisories |
| 🗂 VAULT | saved | tab-saved | Bookmarked articles |

### Tab switch pattern
```javascript
switchTab('superset');  // handles display + active nav state + tab init
```
Each tab has an init function called by `switchTab()`:
- `initSupersetTab()` → COMMAND
- `initBuysTab()` → ALPHA
- `initWorldTab()` → OPS
- `initStratTab()` → INTEL
- `renderSavedTab()` → VAULT

---

## State object
All runtime state lives in `S`:
```javascript
S.settings   // user config (API keys, watchlist, theme)
S.articles   // loaded news articles array
S.prices     // { [coinId]: {price, chg, sym, mcap, vol} }
S.signals    // { fg: {value, label}, mempool, defi }
S.cves       // CVE array
S.tab        // active tab string
S.sparklines // { [coinId]: number[] }
```

---

## Settings / API keys (DEFAULT_CFG)
```javascript
apiKey        // Anthropic Claude API key
aiProvider    // 'openai' | 'anthropic'
localEndpoint // Ollama or OpenAI-compatible endpoint
localModel    // e.g. 'llama3.2'
localApiKey   // for Z.ai / OpenRouter
cgKey         // CoinGecko Demo — coingecko.com
finnhubKey    // Finnhub — finnhub.io
nvdKey        // NVD — nvd.nist.gov
guardianKey   // The Guardian
fredKey       // FRED — fred.stlouisfed.org
otxKey        // AlienVault OTX
aisstreamKey  // aisstream.io — AIS ship tracking
firmsKey      // NASA FIRMS — fire hotspots
firecrawlKey  // Firecrawl — web scraper
```
To add a new key: add to `DEFAULT_CFG`, add input in settings panel HTML, wire in `loadSettings()` and `saveSettings()`.

---

## AI call pattern
All AI calls go through `stratAICall(prompt)`:
```javascript
const raw = await stratAICall(prompt);
// returns string — parse JSON if needed
const match = raw.match(/\{[\s\S]*\}/);
const json = JSON.parse(match?.[0] || raw);
```
For quick one-off AI calls: `callAI(prompt, maxTokens)`.
Never call provider APIs directly — always use these wrappers.

---

## Key data sources (no auth required)
| Source | Endpoint | Used for |
|--------|----------|---------|
| CoinGecko | `api.coingecko.com/api/v3` | Crypto prices, sparklines |
| USGS | `earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson` | Quake layer |
| OpenSky | `opensky-network.org/api/states/all` | Flight layer |
| CelesTrak | `celestrak.org/SOCRATES/query.php` | Satellite TLE |
| NOAA SWPC | `services.swpc.noaa.gov/json` | Space weather |
| gpsjam.org | `gpsjam.org/map-stats` | GPS jamming |
| Polymarket Gamma | `gamma-api.polymarket.com/events` | Prediction odds |
| Alternative.me | `api.alternative.me/fng/?limit=1` | Fear & Greed index |
| FRED | `api.stlouisfed.org/fred/series/observations` | Economic data |

---

## CSS variables (dark theme)
```css
--bg: #07080d          /* page background */
--surf: #0f1117        /* card surface */
--surf2: #151820       /* secondary surface */
--surf3: #1b1e2b       /* tertiary surface */
--border: #1e2233
--border2: #2a2f48
--text: #dde1f0
--text2: #6875a0
--text3: #353c5e
--accent: #4f6ef7      /* primary blue */
--accent2: #7c3aed     /* purple */
--r: 10px              /* border radius */
--rs: 6px              /* small radius */
--t: .18s cubic-bezier(.4,0,.2,1)  /* transition */
--fhi: #10b981         /* green / bullish */
--fmd: #f59e0b         /* yellow / neutral */
--flo: #ef4444         /* red / bearish */
```

---

## Shadowbroker live intel layers (OPS tab)
All layer logic is in the `SB` object. Toggle via `toggleLiveLayer(name)`.
Layers: `flights` (OpenSky), `ships` (aisstream.io WS), `sats` (CelesTrak SGP4), `quakes` (USGS), `fires` (NASA FIRMS), `jamming` (gpsjam), `space` (NOAA SWPC).
Refresh intervals in `SB_REFRESH`.

---

## Momentum Scanner (ALPHA tab)
- Entry: `runMomentumScan()` — fetches Yahoo Finance screener + batch quotes + Finnhub fallback
- Scoring: `scoreAsset(asset)` — RSI, Stoch RSI, BB, EMA, volume, trend
- AI thesis: `openTradeThesis(data)` — calls `stratAICall()` with ticker data + optional Firecrawl context
- Firecrawl context: stored in `_fcContext` global, injected into thesis prompt if set

---

## Polymarket (INTEL tab)
- Load: `loadPolymarket()` — Gamma API, auto-loads on INTEL tab open
- Filter: `filterPmCat(btn, cat)` — category filter buttons
- Render: `renderPolymarket()` — renders probability cards

---

## Fear & Greed — important
Stored as `S.signals.fg = { value: Number, label: String }`.
NEVER read as a plain number. Always use `S.signals.fg.value` and `S.signals.fg.label`.
Bug history: was incorrectly read as `fg.classification` and as a raw object — both fixed.

---

## Adding a new section to a tab
1. Add CSS near the top of `<style>` in the relevant section block
2. Add HTML inside the correct `<div id="tab-X">` block
3. Add JS near the bottom, before `</script>` or grouped with related functions
4. If it needs to init on tab open, add a call inside the tab's init function
5. If it needs an API key, add to `DEFAULT_CFG`, settings HTML, `loadSettings()`, `saveSettings()`

---

## File size / line count
nexus-final.html: ~12,265 lines — kept as reference only, do not delete.
New React app: component-based. Run `npx tsc --noEmit` to verify types before finishing any task.

## New app structure (React/Next.js)
```
app/[tab]/page.tsx    ← one route per tab
components/[tab]/     ← one folder + file per component
store/useStore.ts     ← Zustand store (replaces S{} object)
lib/ai.ts             ← callAI, streamAI, buildSystemPrompt
lib/helpers.ts        ← fmtPrice, fmtVol, timeAgo, esc
```

---

## Patterns to follow
- Use `$(id)` instead of `document.getElementById(id)` — helper is defined at top
- Use `showToast(msg, type)` for user-facing notifications
- Format prices with `fmtPrice(n)`, volumes with `fmtVol(n)`, large numbers with `fmtGopsCost(n)`
- All async fetches wrapped in `try/catch` with silent failure (`}catch(e){}`)
- CSS class names: kebab-case, prefixed by feature (e.g. `ms-` for momentum scanner, `pm-` for polymarket, `sb-` for shadowbroker, `ss-` for superset/command)

---

## Operating Principles

### 1. Plan First
- Write plan to `tasks/todo.md` before touching any code
- For any non-trivial task (3+ steps): plan first, verify plan, then build
- If something goes sideways — stop, re-plan, don't keep pushing

### 2. Subagent Strategy
- Offload research, exploration, and parallel analysis to subagents
- Keep main context window clean
- One task per subagent for focused execution

### 3. Self-Improvement Loop
- After ANY correction: update `tasks/lessons.md` with the pattern
- Write a rule that prevents the same mistake
- Review `tasks/lessons.md` at the start of each session

### 4. Verification Before Done
- Never mark a task complete without proving it works
- Ask: "Would a staff engineer approve this?"
- Run checks, read logs, confirm correctness

### 5. Demand Elegance
- For non-trivial changes: pause and ask "is there a more elegant way?"
- Challenge your own work before presenting it
- Skip this for simple obvious fixes — don't over-engineer

### 6. Autonomous Bug Fixing
- When given a bug report: just fix it — don't ask for hand-holding
- Point at logs, errors, failing output — then resolve them

### 7. Stop Means Stop
- When Mario says STOP — stop immediately
- No tool calls, no responses, nothing
- Wait for the next instruction

---

## Project Skills
These skills live in `.claude/skills/` and must be read before the relevant work begins.

| Skill | File | Use when |
|-------|------|----------|
| add-feature | `.claude/skills/add-feature/SKILL.md` | Building any new self-contained feature into nexus-final.html |
| add-tab | `.claude/skills/add-tab/SKILL.md` | Adding a new top-level tab to nexus-final.html |
| add-api | `.claude/skills/add-api/SKILL.md` | Wiring any new external data source or API key |
| fix-bug | `.claude/skills/fix-bug/SKILL.md` | Debugging any issue in nexus-final.html |

Read the matching skill file first — before writing any code.

---

## Project Structure
```
.claude/skills/  — project-level skills (add-feature, add-tab, add-api, fix-bug)
tasks/
  todo.md        — active task list, written before any work starts
  lessons.md     — updated after every correction
specs/
  features/      — one spec file per feature, written before building
docs/
  architecture.md
  expansion-plan.md
archive/
  app/           — unused Next.js files
  components/    — unused React components
```
