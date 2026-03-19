# NEXUS — Full Expansion Plan
**Session:** March 4, 2026
**Status:** Planning — awaiting confirmation before implementation

---

## How This Document Works

Each idea is rated on two axes:
- **Value** — how much it improves the platform (1–5)
- **Complexity** — how hard it is to build (Low / Medium / High)

Ideas marked **CONFIRMED** are ones the user has already said they want.
Ideas marked **PROPOSED** need sign-off before we build them.

---

## BLOCK 1 — INFORMATION INTELLIGENCE

These improve the raw data coming into the dashboard — more sources, smarter signals, better context.

### 1.1 — Multi-Domain Feed Hub
**Value: 5 · Complexity: Low**

Right now we have 4 geo sources and 3 crypto sources. We should expand to cover:

- **UN News** (unravel.un.org/rss) — official global body, center-rated, high factual
- **USGS Earthquake Feed** (earthquake.usgs.gov/earthquakes/feed) — real JSON API, no proxy needed, shows M4.5+ quakes in near real-time. Geopolitically relevant when a quake hits a conflict zone or capital city.
- **WHO Disease Outbreak News** (who.int RSS) — disease surveillance is increasingly a geopolitical issue post-2020
- **Bellingcat** (bellingcat.com/feed) — gold standard OSINT journalism, center-left, factual 9/10
- **RFERL (Radio Free Europe)** — critical for Russia/Eastern Europe/Central Asia coverage, often missing from Western feeds
- **Kyiv Independent** — essential for Ukraine/Russia war coverage, center, factual 8/10
- **The Intercept** — left-leaning but breaks major surveillance/intelligence stories
- **Defense News** — military procurement, strategy, arms deals
- **Reuters Fact Check** — dedicated fact-checking feed, use to cross-reference articles
- **Whale Alert** (RSS available) — crypto whale movements over $1M, genuinely moves markets

Implementation: add to SOURCES registry, no other changes needed.

---

### 1.2 — Geopolitical Risk Score Board
**Value: 5 · Complexity: Medium**

Build a real-time country risk layer. For each country appearing in articles, assign:
- **Conflict risk** (0–100) derived from frequency of conflict-related terms in articles mentioning that country
- **Economic risk** (based on IMF WEO data, freely available as JSON)
- **Election alert** (flag if an election is within 60 days — using a static calendar we maintain)

Display as a sortable table panel. Color code from green (stable) to red (critical). This becomes the single fastest way to see which countries need attention.

Freely available data sources:
- ACLED (Armed Conflict Location & Event Data) has a public API
- IMF World Economic Outlook JSON API (free, no key)
- World Bank API (free, no key)

---

### 1.3 — Event Timeline
**Value: 4 · Complexity: Low**

A horizontal timeline view mode (toggle from grid view). Articles are plotted on a linear time axis, grouped by topic cluster. This lets you see when a story broke, how it developed, and which sources followed it.

Topic clustering is pure client-side: extract the most common noun phrases from article titles, group articles sharing ≥2 noun matches. No AI needed.

---

### 1.4 — Live World Event Map
**Value: 5 · Complexity: Medium**

Use Leaflet.js (free, no API key, loads from CDN) to render a world map. Pin articles geographically based on country/region extraction from headlines.

Country extraction: maintain a lookup dictionary of 200 country names + common demonyms + capitals. Scan each headline. If a match is found, plot it on the map with a colored marker (geo = blue, crypto regulation = amber, security = red).

Clicking a pin shows the article card. This turns the dashboard into something that feels genuinely like a command center. Very high visual impact.

---

## BLOCK 2 — SECURITY & OSINT

### 2.1 — CVE Vulnerability Feed
**Value: 5 · Complexity: Low**

The US National Vulnerability Database (NVD) publishes a JSON feed at:
`https://services.nvd.nist.gov/rest/json/cves/2.0?resultsPerPage=20&startIndex=0`

No API key needed for basic queries. Pull the last 20 critical/high severity CVEs and show them in a dedicated security feed panel with:
- CVE ID and description
- CVSS severity score (color coded)
- Affected software
- Published date
- Link to full NVD entry

This is genuinely useful for anyone running systems or tracking supply chain risk. A CVSS 9.8 zero-day in OpenSSL matters as much as any geopolitical headline.

---

### 2.2 — Threat Intelligence Panel
**Value: 5 · Complexity: Low–Medium**

AlienVault OTX (Open Threat Exchange) has a public RSS/API that doesn't require a key for basic pulse data. It surfaces:
- Active malware campaigns
- Phishing infrastructure
- Nation-state activity (Russia, China, Iran, North Korea APTs)
- Indicators of compromise (IOCs)

Cross-reference this with the geo news feed. If an article says "Russia launches cyber attack" and OTX shows new indicators tagged "Russia/APT29" — surface that connection visually.

---

### 2.3 — OSINT Toolkit Panel
**Value: 4 · Complexity: Low**

A utility panel with quick-launch OSINT tools. User types an IP, domain, email, or hash. We fire lookups against:

- **IP lookup:** `ipapi.co/{ip}/json/` — free, no key, returns ASN, country, ISP, org
- **WHOIS:** link to `https://www.whois.com/whois/{domain}` (user opens in new tab — we can't do server-side WHOIS without a backend)
- **Shodan:** link to `https://shodan.io/host/{ip}` (user's own login) — link only, no API call
- **VirusTotal:** link to `https://virustotal.com/gui/domain/{domain}` — link only
- **HaveIBeenPwned:** `https://haveibeenpwned.com/api/v3/breachedaccount/{email}` — requires a $3.50/month API key, so make it user-configurable
- **AbuseIPDB:** `https://www.abuseipdb.com/check/{ip}` — link only

This panel doesn't replace a full OSINT workbench but it cuts lookup time from minutes to seconds.

---

### 2.4 — Breach & Dark Web Signals
**Value: 4 · Complexity: Medium**

Two parts:

**Part A — HaveIBeenPwned integration.** User enters their own API key (stored in localStorage). They can monitor email addresses for breach appearances. Show: breach name, date, data types exposed, domain count.

**Part B — Dark web news feed.** Several OSINT publications cover dark web activity without requiring dark web access: DarkReading, Bleeping Computer, Krebs on Security all have public RSS feeds. Add these to the security feed with appropriate bias/factual ratings.

We are NOT connecting to the actual dark web — we are aggregating public journalism about dark web activity. Clear distinction.

---

### 2.5 — Keyword Alert Engine
**Value: 5 · Complexity: Low**

User defines alert keywords (e.g., "nuclear", "cyberattack", "bank run", "exploit", their company name, their crypto project). Whenever a newly fetched article contains a match, the browser fires a Notification API alert (with user permission) and highlights the matching article with a colored border.

This turns passive monitoring into active intelligence. The user doesn't need to watch the screen — it watches for them.

Storage: localStorage for alert rules. No backend needed.

---

## BLOCK 3 — CRYPTO INTELLIGENCE

### 3.1 — On-Chain Signal Panel
**Value: 5 · Complexity: Low–Medium**

Freely available signals, no paid API key needed for basics:

- **Fear & Greed Index:** `https://api.alternative.me/fng/` — returns 0–100 score + label. Extreme fear historically = buying opportunity. Extreme greed = top signal. Free.
- **Bitcoin Mempool:** `https://mempool.space/api/v1/fees/recommended` — returns sat/vbyte for fast/medium/slow. Critical for anyone moving funds.
- **Blockchain stats:** `https://blockchain.info/stats?format=json` — hash rate, difficulty, block time, miners revenue. Tracks network health.
- **Whale Alert feed:** RSS or their free API tier — $1M+ transfers on-chain. These move markets.
- **Exchange net flow:** glassnode has a free tier, or we use DefiLlama's public API for TVL. Shows whether crypto is flowing onto exchanges (bearish) or off (bullish).

---

### 3.2 — DeFi & Protocol Monitor
**Value: 4 · Complexity: Low**

DefiLlama has a completely free, no-auth API:
- `https://api.llama.fi/protocols` — returns top 100 DeFi protocols with TVL
- `https://api.llama.fi/v2/chains` — chain-by-chain TVL
- Protocol TVL 24h change — sudden -30% TVL in a protocol = possible exploit or rug pull

Also: a dedicated "Exploit Tracker" panel pulling from Rekt.news (they have an API) and blockchain security firm RSS feeds (PeckShield, CertiK). Crypto hacks are geopolitically significant — many are North Korean state-sponsored.

---

### 3.3 — Regulatory Action Tracker
**Value: 5 · Complexity: Low**

Scrape/aggregate crypto regulatory news specifically from:
- SEC press releases RSS (sec.gov/rss/litigation/litreleases.xml)
- CFTC enforcement actions
- EU MiCA implementation news
- BIS (Bank for International Settlements) research publications

Tag each action by jurisdiction, affected entity, action type (fine / ban / approval / investigation). This is critical intelligence for anyone holding or building in crypto.

---

### 3.4 — Portfolio & Watchlist
**Value: 4 · Complexity: Low**

User enters token symbols and optional holdings. Dashboard shows:
- Current price, 24h change
- Portfolio value if holdings entered
- Color-coded change bars
- News feed filtered to watchlist assets automatically

Stored in localStorage. No backend. Pure client-side value calculation.

---

## BLOCK 4 — AI CHAT & SCREEN READING [CONFIRMED EXPANSION]

This is the most significant capability expansion. The user has confirmed they want to go here.

### 4.1 — Contextual AI Chat Panel
**Value: 5 · Complexity: Medium**

A collapsible right-side or bottom panel with a chat interface. The user asks natural language questions and the AI responds with context from the currently loaded articles.

How it works:
- User types: "What's the situation in Ukraine today?"
- We take the last 5 matching articles as context
- We call the Anthropic API (or OpenAI) with: system prompt defining the assistant as a geopolitical/crypto analyst + the article context + the user's question
- Response streams back in the chat panel

The user provides their own API key (Anthropic or OpenAI), stored in localStorage. No backend needed — all API calls go directly from the browser to the AI provider.

Capabilities:
- Ask about any topic in the news feed
- "Give me a bias analysis summary of today's top stories"
- "Which articles contradict each other?"
- "Explain the geopolitical implications of this event"
- "Summarize all crypto news in 3 sentences"
- "Is this a buying signal for Bitcoin?"

---

### 4.2 — Screen Reader / Document Analyzer [CONFIRMED EXPANSION]
**Value: 5 · Complexity: Medium**

Drag and drop (or paste) any of the following into the dashboard:
- Screenshot of a news article → AI reads it, extracts text, runs bias analysis, extracts entities
- PDF document → parse text client-side with pdf.js (free, no backend), then send to AI for summary
- Plain text paste → instant analysis
- Image of a chart → AI describes and interprets it

This is powerful for analyzing sources the RSS feeds don't cover — a leaked document, a screenshot of a tweet, a PDF report. The user pastes it in, the AI runs the same pipeline as the live feed articles: bias score, factual assessment, entity extraction, key claims.

---

### 4.3 — Entity Intelligence Graph
**Value: 4 · Complexity: Medium**

Extract named entities (people, organizations, countries, companies) from all loaded articles. Build a relationship graph: entities that appear in the same article are connected. Render with D3.js force-directed graph.

Clicking an entity node filters the article feed to show only articles mentioning it. This surfaces hidden connections — if Putin, Xi Jinping, and a specific Russian bank all appear together in 3 articles, the node cluster makes that visible instantly.

---

### 4.4 — AI Article Summarizer
**Value: 5 · Complexity: Low (once API key is present)**

Add a "Summarize" button to every article card. On click, fetch the article content (via CORS proxy) and send it to the AI API with a prompt to return: a 3-sentence summary, the main claim, any identified bias signals, and a confidence rating for the factual content.

Display inline in the card without navigating away. This is the single most time-saving feature for a user monitoring 100+ articles.

---

### 4.5 — Voice Input
**Value: 3 · Complexity: Low**

Web Speech API is built into Chrome and most modern browsers — no library needed. Add a microphone button to the search bar. User speaks a query, it transcribes to the search field. Zero dependencies.

---

## BLOCK 5 — DEVICE & MONITORING INTEGRATION

### 5.1 — WebSocket Device Hub
**Value: 5 · Complexity: Medium**

Replace the placeholder device cards with real WebSocket connections. The architecture:

- Dashboard opens a WebSocket to a user-provided address (e.g., `ws://192.168.1.100:8080`)
- The remote endpoint (a Raspberry Pi, a server, a smart home hub) sends JSON telemetry
- Dashboard renders it in real time

Standard message format we define now (this makes it "future-proof"):
```json
{
  "device_id": "server-01",
  "name": "Primary Server",
  "status": "online",
  "metrics": { "cpu": 34, "ram": 61, "temp": 52 },
  "alerts": [],
  "timestamp": "2026-03-04T12:00:00Z"
}
```

Any device that emits this format — Raspberry Pi with a 10-line Python script, a Node.js server, a smart sensor — plugs straight into the dashboard.

---

### 5.2 — Alert Rules Engine
**Value: 5 · Complexity: Medium**

A no-code rule builder. User creates rules like:
- "If CPU > 80% for device server-01 → show red alert"
- "If article contains 'nuclear' → play alert sound"
- "If BTC drops > 5% in 1 hour → send browser notification"
- "If new CVE with CVSS ≥ 9.0 → flash security panel"

Rules stored in localStorage as JSON. The engine evaluates all rules on every data refresh. This turns the dashboard from a viewer into an active early warning system.

---

### 5.3 — Camera / RTSP Feed Viewer
**Value: 4 · Complexity: High**

RTSP streams can't be viewed directly in a browser due to protocol limitations. However:

- **MJPEG streams** (which most IP cameras support as a fallback) work directly via `<img src="http://camera-ip/video.mjpeg">` — zero libraries needed if the camera is on the same network
- **HLS streams** can be played with hls.js (free CDN)
- For true RTSP, we'd need a local relay (a small Node.js or Python service) that transcodes to HLS or WebSocket — we can provide a script for this

We design the camera widget to accept three input types: MJPEG URL, HLS URL, or WebSocket stream. User configures in the device panel.

---

### 5.4 — System Health Monitor
**Value: 4 · Complexity: Low (if user runs a small agent)**

Build a tiny companion script (Python, ~30 lines) that the user runs on their server/machine. It exposes a minimal JSON endpoint:
```
GET http://localhost:9000/health
→ { cpu, ram, disk, network_in, network_out, uptime, processes }
```

The dashboard polls this every 10 seconds and renders sparkline charts for each metric. The agent is entirely optional — the panel degrades gracefully if it's not running.

---

## BLOCK 6 — ARCHITECTURE & FUTURE-PROOFING

### 6.1 — Plugin Architecture
**Value: 5 · Complexity: Medium**

Define a standard module interface so new data panels can be added without touching the core dashboard code:

```javascript
const MyPlugin = {
  id:       'my-plugin',
  name:     'My Data Source',
  category: 'security',
  async fetch() { return [...] },    // returns normalized article objects
  render(container) { ... },         // optional: custom panel renderer
  settings: [...]                    // optional: user-configurable fields
};
Nexus.registerPlugin(MyPlugin);
```

This means the user or a developer can write a plugin for any data source — a private company feed, a custom API, a local file — and drop it into the dashboard. The core engine handles caching, filtering, sorting, and bias analysis automatically.

---

### 6.2 — Progressive Web App (PWA)
**Value: 4 · Complexity: Low**

Add a service worker and a web manifest. The dashboard becomes installable as a desktop app from Chrome. Benefits:
- Works offline with cached data
- Receives push notifications even when the browser is closed
- Runs in its own window without browser chrome
- Can be set as a startup application

Service worker also pre-caches the app shell (HTML/CSS/JS) so first load is instant even on slow connections.

---

### 6.3 — Local REST API Mode
**Value: 3 · Complexity: Medium**

A mode where the dashboard acts as a data broker: it fetches and processes all the feeds, then exposes the normalized, analyzed data via a local REST API on `http://localhost:PORT`. Other applications (a Python script, a mobile app, another dashboard) can query:

- `GET /api/articles?cat=geo&bias=left&limit=20`
- `GET /api/prices`
- `GET /api/threats`
- `GET /api/alerts`

This requires a small local server (Node.js/Express or Python/FastAPI — we write it). The HTML dashboard becomes just one of many possible frontends.

---

### 6.4 — Settings Panel & User Configuration
**Value: 5 · Complexity: Low**

A proper settings panel (slide-out drawer) where users configure:
- Which sources to enable/disable
- API keys (Anthropic, OpenAI, HaveIBeenPwned, CoinGecko Pro)
- Alert keywords
- Portfolio watchlist
- Device endpoints
- Refresh intervals
- Default layout (grid vs. timeline vs. map)
- Color accent customization
- Notification preferences

All stored in localStorage. Exportable as a JSON file for backup/sharing.

---

## PRIORITY MATRIX

| # | Feature | Value | Complexity | Do First? |
|---|---------|-------|------------|-----------|
| 4.1 | AI Chat Panel | 5 | Med | ✅ YES |
| 4.2 | Screen Reader / Doc Analyzer | 5 | Med | ✅ YES |
| 2.5 | Keyword Alert Engine | 5 | Low | ✅ YES |
| 1.4 | World Event Map | 5 | Med | ✅ YES |
| 2.1 | CVE Vulnerability Feed | 5 | Low | ✅ YES |
| 1.2 | Country Risk Scoreboard | 5 | Med | ✅ YES |
| 3.1 | On-Chain Signal Panel | 5 | Low | ✅ YES |
| 6.4 | Settings Panel | 5 | Low | ✅ YES |
| 5.1 | WebSocket Device Hub | 5 | Med | 🔜 NEXT |
| 5.2 | Alert Rules Engine | 5 | Med | 🔜 NEXT |
| 6.1 | Plugin Architecture | 5 | Med | 🔜 NEXT |
| 4.3 | Entity Graph | 4 | Med | 🔜 NEXT |
| 1.1 | More Feed Sources | 5 | Low | ✅ YES |
| 3.2 | DeFi Monitor | 4 | Low | ✅ YES |
| 3.3 | Regulatory Tracker | 5 | Low | ✅ YES |
| 6.2 | PWA / Installable | 4 | Low | 🔜 NEXT |

---

## CONFIRMED EXPANSION DIRECTION

Based on what the user has stated, we build in this order:

**Phase 1 — Intelligence Depth**
More sources (OSINT + security), CVE feed, Fear & Greed, DeFi TVL, world map, country risk, entity extraction, keyword alerts, settings panel.

**Phase 2 — AI Chat + Screen Reading** [USER CONFIRMED]
AI chat panel with API key input, document analyzer (paste/drop), article summarizer, voice input.

**Phase 3 — Device Integration**
WebSocket hub, real-time device telemetry, camera viewer, alert rules engine, system health monitor companion script.

**Phase 4 — Architecture**
Plugin system, PWA/installable, local REST API mode.

---

## IMPLEMENTATION NOTES

**What stays in the single HTML file:**
Everything in Phase 1 and Phase 2. The AI calls go directly from the browser to the API provider (Anthropic/OpenAI). No backend needed. The app remains portable — open the HTML file in any browser and it works.

**What needs a companion service:**
Phase 3 device integration needs a small local agent. We write it in Python (~50 lines) or Node.js. It runs on the user's machine/server and exposes a WebSocket or REST endpoint.

**What needs a full backend:**
Only if multi-user, persistent server-side storage, or dark web scraping is required. We defer this to Phase 4+.

---

*Document generated by Nexus planning session — March 4, 2026*
