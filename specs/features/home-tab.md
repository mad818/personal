# HOME Tab — Spec

## What
Full-screen AI chat as the landing page. Mario's personal intelligence system.

## Components
- HomeChat — main chat interface, streaming responses
- HomeAmbient — live data strip (BTC, ETH, F&G, Reddit buzz, headline)
- HomeWelcome — greeting with time-of-day awareness
- HomeQuickChips — preset prompt buttons

## Data
- useStore: settings, prices, signals, articles, chatHistory
- buildSystemPrompt() from lib/ai.ts
- streamAI() from lib/ai.ts

## Done when
- Chat sends and receives streaming responses
- Ambient strip shows live data when available
- Quick chips send preset prompts
- Chat history persists across tab switches
