# CITADEL (HQ) Tab — Spec

## What
Operator office and persistent agent chronicle for Mario's personal intelligence system.

## Components
- OfficeCommandCenter — primary agent dispatch and operator workflow
- HQTerminalSection — persistent conversation chronicle and runtime receipts
- HQDataRail — bounded live context and market posture
- QuickStartGrid — preset operator actions

## Data
- useStore: settings, prices, signals, articles, agent messages and runtime state
- buildSystemPrompt() and streamAIWithThinking() from lib/ai.ts
- buildLiveContext() from lib/liveContext.ts

## Done when
- Office dispatch sends and receives streaming responses
- Live context renders only when verified data is available
- Quick-start actions route through the shared agent dispatch
- Agent chronicle and run receipts persist across tab switches
