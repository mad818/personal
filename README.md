<div align="center">

# ⚡ Nexus Prime

**Personal intelligence dashboard — crypto, geopolitical, cyber, IoT, and market data with an AI agent, 12 live tabs, and a self-learning skill engine.**

[![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?style=flat-square&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-06b6d4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Claude](https://img.shields.io/badge/Claude-Anthropic-d97706?style=flat-square)](https://anthropic.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-22c55e?style=flat-square)](LICENSE)

</div>

---

## What it is

Nexus Prime is a single-person intelligence dashboard. It pulls live data from dozens of sources — crypto markets, geopolitical events, CVEs, threat feeds, news, prediction markets, IoT sensors — and surfaces it across 12 purpose-built tabs. An AI agent built on Claude runs inside the app and can use tools, reason across data, and answer questions in real time.

There is no cloud backend. Everything runs locally via `npm run dev`.

---

## Tabs

| | Tab | What it does |
|---|-----|-------------|
| ⚡ | **Command** | KPI cards, buy signals, AI briefing, event predictor, deep research |
| 📡 | **Signals** | Live news feed, bias tagging (bullish / bearish / neutral), article clusters |
| 🎯 | **Alpha** | Momentum scanner, Buy Bot signals, live sparklines, position sizing |
| 🌍 | **Ops** | Conflict tracker, Leaflet world map, FX, commodities, OSINT panels |
| 📊 | **Intel** | Polymarket odds, Porter 5 Forces, VRIO, BCG Matrix, SaaS lifecycle tracker |
| 🔒 | **Cyber** | Live CVEs sorted by severity, OTX threat intel, CISA advisories |
| 🗂 | **Vault** | Bookmarked articles, persisted across sessions |
| 🌐 | **World** | Interactive map with earthquake, flight, ship, fire, and GPS-jamming layers |
| 🔐 | **Security** | Security posture monitoring and threat surface overview |
| 🛠 | **Skills** | Self-learning skill engine — agent reads, writes, and improves its own skills |
| 🚗 | **Vehicle** | Vehicle tracking and telemetry |
| 📱 | **IoT** | Device monitoring and live sensor feeds |

---

## Stack

| Layer | Tech |
|-------|------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| State | Zustand (persisted settings + session-only live data) |
| Styling | Tailwind CSS + Radix UI |
| AI | Anthropic Claude via server route, or Ollama locally |
| Maps | Leaflet + react-leaflet |
| Animation | Framer Motion |
| Notifications | Sonner |
| AI SDK | Vercel AI SDK + `@ai-sdk/openai` |

The AI agent runs a full **ReAct tool-use loop** — it can search the web, fetch URLs, read and write files, and calculate. Tool calls show live in the UI as collapsible badges.

---

## Quickstart

**1. Clone and install**

```bash
git clone https://github.com/mad818/personal.git
cd personal
npm install
```

**2. Set up environment**

```bash
cp .env.example .env.local
```

Open `.env.local` and fill in your keys (see table below).

**3. Run**

```bash
npm run dev
```

App runs on [localhost:3000](http://localhost:3000).

---

## API Keys

All keys are optional. The app degrades gracefully when a key is missing.

| Variable | Service | Get one |
|----------|---------|---------|
| `ANTHROPIC_API_KEY` | Claude AI (agent + chat) | [console.anthropic.com](https://console.anthropic.com) |
| `GROQ_API_KEY` | Groq (fast inference fallback) | [console.groq.com](https://console.groq.com/keys) |
| `NEXUS_TOKEN` | Internal API auth | Set any string |
| `CG_KEY` | CoinGecko (crypto prices) | [coingecko.com/api](https://www.coingecko.com/en/api) |
| `FINNHUB_KEY` | Finnhub (stock quotes) | [finnhub.io](https://finnhub.io) |
| `GUARDIAN_KEY` | The Guardian (news) | [open-platform.theguardian.com](https://open-platform.theguardian.com) |
| `OTX_KEY` | AlienVault OTX (threat intel) | [otx.alienvault.com](https://otx.alienvault.com) |
| `FIRECRAWL_KEY` | Firecrawl (web scraper) | [firecrawl.dev](https://firecrawl.dev) |
| `NVD_KEY` | NVD (CVE data) | [nvd.nist.gov/developers](https://nvd.nist.gov/developers/request-an-api-key) |

---

## Project Structure

```
app/                  — one route per tab (Next.js App Router)
components/           — one folder per tab, shared UI in /ui and /system
store/useStore.ts     — Zustand store (settings + live data)
lib/ai.ts             — callAI, streamAI, buildSystemPrompt
lib/agent.ts          — ReAct agent loop with tool use
app/api/              — server routes (/api/ai, /api/tools, /api/search, ...)
.claude/skills/       — project-level agent skills (add-feature, fix-bug, ...)
tasks/                — todo.md, lessons.md, active task tracking
specs/features/       — one spec file per planned feature
docs/                 — architecture notes and expansion plan
```

---

## Local AI (Ollama)

To run the agent fully offline:

```bash
ollama pull qwen2.5:7b
```

Then set `localModel: 'qwen2.5:7b'` in the app's Settings panel. No API key needed.

---

## License

MIT
