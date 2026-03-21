# Nexus Prime

Personal intelligence dashboard — crypto, geopolitical, cyber, IoT, and market data with AI agent, 12 tabs, live APIs, and self-learning skill engine.

Built with Next.js 14, TypeScript, Zustand, Tailwind CSS, and Anthropic Claude.

## Tabs

| Tab | Purpose |
|-----|---------|
| ⚡ Command | KPI cards, buy signals, AI briefing, event predictor, deep research |
| 📡 Signals | Live news feed with bias filter, threads, clusters |
| 🎯 Alpha | Momentum scanner, Buy Bot signals, position sizing |
| 🌍 Ops | Conflict tracker, live intel layers, FX, commodities, OSINT |
| 📊 Intel | Polymarket odds, Porter 5 Forces, BCG Matrix, SaaS lifecycle |
| 🔒 Cyber | CVEs, OTX threat intel, CISA advisories |
| 🗂 Vault | Bookmarked articles |
| 🌐 World | Interactive world map with live data layers |
| 🔐 Security | Security posture and threat monitoring |
| 🛠 Skills | Self-learning skill engine |
| 🚗 Vehicle | Vehicle tracking and IoT data |
| 📱 IoT | Device monitoring and sensor feeds |

## Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **State**: Zustand
- **Styling**: Tailwind CSS
- **AI**: Anthropic Claude (via server route) or Ollama (local)
- **Maps**: Leaflet
- **UI**: Radix UI

## Quickstart

```bash
cp .env.example .env.local
```

Add your API keys to `.env.local`, then run:

```bash
npm install
npm run dev
```

App runs on [localhost:3000](http://localhost:3000).

## API Keys

| Key | Source |
|-----|--------|
| `ANTHROPIC_API_KEY` | console.anthropic.com |
| `GROQ_API_KEY` | console.groq.com |
| `NEXUS_TOKEN` | set any string — used for API auth |

See `.env.example` for the full list.
