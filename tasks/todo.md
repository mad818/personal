# Nexus Prime — Task List

## Status: Active Development

## Completed
- [x] Phase 1–4: Full React/Next.js migration, all 8 tabs
- [x] Settings panel (slide-over, all API keys + personal profile)
- [x] Data hooks: usePrices, useArticles, useCVEs
- [x] DataLoader components wired into all pages
- [x] HOME page: PricesLoader + FearGreedLoader + ArticlesLoader
- [x] COMMAND: BTC KPI + Fear & Greed live
- [x] ALPHA: live prices + 7-day SVG sparklines
- [x] SIGNALS: live articles + bias tags (bullish/bearish/neutral) + bookmark button
- [x] CYBER: live CVEs sorted by severity (CRITICAL → LOW)
- [x] VAULT: saved articles persisted across sessions
- [x] Business Builder — 5-stage pipeline, checklist, MRR tracker, AI action plan
- [x] Leaflet quake map (OPS tab, USGS M2.5+, dark tiles)
- [x] Strategy frameworks: Porter 5, VRIO, BCG, JTBD, SaaS tracker (INTEL tab)
- [x] AI Job Risk Analyzer — Karpathy rubric, 23 benchmarks, personalised action plan
- [x] Agent loop (lib/agent.ts): full ReAct tool-use for Claude + Ollama
- [x] Ollama wired: qwen3:14b default, full function-calling loop
- [x] Tool executor API (/api/tools): web_search, fetch_url, write_file, read_file, list_files, calculate
- [x] HomeChat: live tool-call display, collapsible badges
- [x] Type check: zero errors

## Next Up
- [ ] Telegram bot integration (message agent from phone)
- [ ] Cron scheduler UI (set recurring agent tasks from the app)
- [ ] Momentum scanner (ALPHA tab: score assets, buy signals)
- [ ] OTX threat feed (CYBER tab, requires otxKey in Settings)
