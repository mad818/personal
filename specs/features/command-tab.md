# COMMAND Tab — Spec

## What
Mission control. Live KPI cards, buy signals, AI briefing,
personal focus plan, business builder, event predictor, deep research.

## Components
- KPICards — 6 live stat cards (World Risk, BTC, Buy Signals, CVEs, Alerts, F&G)
- SignalsPanel — top buy signals list
- StoriesPanel — top articles list
- FocusPanel — daily AI action plan from user profile
- BusinessBuilder — 5-stage service business pipeline
- AIBriefing — full intel brief button + output
- EventPredictor — topic input + AI forecast
- DeepResearch — DeerFlow multi-agent pipeline

## Data
- useStore: prices, signals, articles, cves, settings

## Done when
- All panels render with live data
- AI buttons call callAI / streamAI correctly
- Business builder checklist persists via settings store
