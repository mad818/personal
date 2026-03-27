---
description: nexus-final.html single-file app — state, API keys, data sources, tab patterns, CSS variables
paths:
  - "nexus-final.html"
  - "archive/**"
---

# nexus-final.html Reference

## What it is
Single-file browser intelligence dashboard. ~12,265 lines. No build step.
Do not split it into separate files unless Mario explicitly asks.
Always search for existing patterns before adding new ones.

## State object (S)
```javascript
S.settings   // user config (API keys, watchlist, theme)
S.articles   // loaded news articles array
S.prices     // { [coinId]: { price, chg, sym, mcap, vol } }
S.signals    // { fg: { value, label }, mempool, defi }
S.cves       // CVE array
S.tab        // active tab string
S.sparklines // { [coinId]: number[] }
```

Fear & Greed: `S.signals.fg.value` (Number) and `S.signals.fg.label` (String).
Never read fg as a plain number — it is always an object.

## AI call pattern
```javascript
const raw = await stratAICall(prompt);
const match = raw.match(/\{[\s\S]*\}/);
const json = JSON.parse(match?.[0] || raw);
```
Quick one-off: `callAI(prompt, maxTokens)`.
Never call provider APIs directly.

## API keys (DEFAULT_CFG)
```
apiKey        // Anthropic Claude
cgKey         // CoinGecko Demo
finnhubKey    // Finnhub
nvdKey        // NVD (NIST)
guardianKey   // The Guardian
fredKey       // FRED (St. Louis Fed)
otxKey        // AlienVault OTX
aisstreamKey  // aisstream.io (AIS ships)
firmsKey      // NASA FIRMS (fires)
firecrawlKey  // Firecrawl (web scraper)
```
To add a new key: `DEFAULT_CFG` → settings panel HTML → `loadSettings()` → `saveSettings()`.

## Free data sources
| Source | Endpoint | Used for |
|--------|----------|---------|
| CoinGecko | `api.coingecko.com/api/v3` | Crypto prices, sparklines |
| USGS | `earthquake.usgs.gov/.../all_day.geojson` | Quakes |
| OpenSky | `opensky-network.org/api/states/all` | Flights |
| CelesTrak | `celestrak.org/SOCRATES/query.php` | Satellites |
| NOAA SWPC | `services.swpc.noaa.gov/json` | Space weather |
| gpsjam.org | `gpsjam.org/map-stats` | GPS jamming |
| Polymarket Gamma | `gamma-api.polymarket.com/events` | Prediction odds |
| Alternative.me | `api.alternative.me/fng/?limit=1` | Fear & Greed |
| FRED | `api.stlouisfed.org/fred/series/observations` | Economic data |

## Tab structure
| Label | data-tab | Init function |
|-------|----------|---------------|
| ⚡ COMMAND | superset | `initSupersetTab()` |
| 📡 SIGNALS | articles | _(auto)_ |
| 🎯 ALPHA | buys | `initBuysTab()` |
| 🌍 OPS | world | `initWorldTab()` |
| 📊 INTEL | strategy | `initStratTab()` |
| 🔒 CYBER | security | _(auto)_ |
| 🗂 VAULT | saved | `renderSavedTab()` |

Tab switch: `switchTab('superset')` — handles display + nav state + init.

## CSS variables (dark theme)
```css
--bg: #07080d      --surf: #0f1117    --surf2: #151820   --surf3: #1b1e2b
--border: #1e2233  --border2: #2a2f48
--text: #dde1f0    --text2: #6875a0   --text3: #353c5e
--accent: #4f6ef7  --accent2: #7c3aed
--r: 10px          --rs: 6px
--t: .18s cubic-bezier(.4,0,.2,1)
--fhi: #10b981     --fmd: #f59e0b     --flo: #ef4444
```

## Adding a new section to a tab
1. Add CSS near the top of `<style>` in the relevant section block
2. Add HTML inside `<div id="tab-X">`
3. Add JS near the bottom, grouped with related functions
4. If it needs to init on tab open, call it inside that tab's init function
5. If it needs an API key, wire through `DEFAULT_CFG` → settings → load/save

## Shadowbroker live intel (OPS tab)
All layer logic in the `SB` object. Toggle: `toggleLiveLayer(name)`.
Layers: `flights`, `ships`, `sats`, `quakes`, `fires`, `jamming`, `space`.
Refresh intervals in `SB_REFRESH`.

## Momentum Scanner (ALPHA tab)
- `runMomentumScan()` — Yahoo Finance screener + batch quotes + Finnhub fallback
- `scoreAsset(asset)` — RSI, Stoch RSI, BB, EMA, volume, trend scoring
- `openTradeThesis(data)` — AI thesis via `stratAICall()` + optional Firecrawl context
- Firecrawl context stored in `_fcContext` global

## Polymarket (INTEL tab)
- `loadPolymarket()` — Gamma API, auto-loads on tab open
- `filterPmCat(btn, cat)` — category buttons
- `renderPolymarket()` — renders probability cards
