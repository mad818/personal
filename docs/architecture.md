# Nexus Prime — Architecture

## Overview
Single-file browser dashboard. No build step. No backend. No server required.
Open `nexus-final.html` in any modern browser and it works.

## File
`nexus-final.html` — ~11,500 lines, ~600KB

## Tech stack
| Layer | Technology |
|-------|-----------|
| UI | Vanilla HTML/CSS/JS |
| Maps | Leaflet.js 1.9.4 + MarkerCluster |
| Satellite tracking | satellite.js 4.0.0 (SGP4 propagation) |
| Charts | Chart.js (inline) |
| Fonts | Inter (Google Fonts) |
| Storage | localStorage only |
| AI | Ollama (local) or Anthropic/OpenAI (API key) |

## Data flow
```
loadAll() on page init
    ├── loadCGData()        → S.prices, S.sparklines, S.signals.fg
    ├── loadSources()       → S.articles
    ├── loadCVEs()          → S.cves
    └── initConflictTicker() → conflict data

switchTab(tab)
    └── init function for tab → renders from S.*
```

## Key globals
- `S` — all runtime state
- `SOURCES` — news source definitions
- `DEFAULT_CFG` — settings defaults
- `SB` — Shadowbroker live intel layer state
- `_botResults` — Buy Bot scan results
- `_pmEvents` — Polymarket events cache
- `_fcContext` — Firecrawl scraped content (injected into AI thesis)

## AI architecture
- Default: Ollama at `localhost:11434` (no key needed)
- Optional: Anthropic Claude or any OpenAI-compatible endpoint
- All calls go through `stratAICall(prompt)` or `callAI(prompt, maxTokens)`
- Never call provider APIs directly

## Live intel layers (OPS tab)
```
SB object manages:
├── flights    → OpenSky Network (60s refresh)
├── ships      → aisstream.io WebSocket (real-time)
├── sats       → CelesTrak TLE + local SGP4 (8s refresh)
├── quakes     → USGS GeoJSON (5m refresh)
├── fires      → NASA FIRMS VIIRS (10m refresh)
├── jamming    → gpsjam.org (5m refresh)
└── space      → NOAA SWPC (2m refresh)
```

## Momentum scanner data pipeline (ALPHA tab)
```
runMomentumScan()
├── fetchYahooGainers()      → top gainers from Yahoo Finance screener
├── fetchUniverseScan()      → 100-ticker curated universe batch quote
├── scoreAsset()             → RSI, BB, EMA, volume, trend → 0-100 score
├── filter by verdict/chg    → BUY / WATCH / SKIP
└── renderScannerResults()   → table with thesis + position calc actions
```

## Decisions log
- **Single file**: keeps deployment trivial — share one file, no dependencies
- **localStorage only**: no auth, no server, privacy by default
- **Ollama default**: works offline, no API cost, users can swap to cloud AI
- **CSS variables**: enables dark/light theme with zero JS
- **CORS-free APIs**: all data sources chosen for browser accessibility
