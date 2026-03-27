---
description: React/Next.js app architecture, store shape, component conventions, and file patterns
paths:
  - "app/**/*.tsx"
  - "app/**/*.ts"
  - "components/**/*.tsx"
  - "components/**/*.ts"
  - "store/**/*.ts"
  - "lib/**/*.ts"
---

# React App Architecture

## Stack
- Next.js 14 (App Router), TypeScript strict, React 18, Zustand, Tailwind CSS
- No build output committed — `.next/` is gitignored
- Single entry: `app/layout.tsx` → `app/home/page.tsx` is the main view

## Store (store/useStore.ts)
All runtime state lives in the Zustand store. Key slices:
```
settings       // user config: API keys, watchlist, theme, AI provider
articles       // Article[] — loaded news
prices         // Record<coinId, PriceData> — live crypto prices
signals        // { fg: FearGreedData, mempool, defi }
cves           // CVE[]
worldRisk      // number 0–100
agentStats     // Record<AgentId, AgentStats>
officeMessages // OfficeChatMessage[] — persisted across tab switches
sparklines     // Record<coinId, number[]>
```

Fear & Greed is always an object: `{ value: number, label: string }`.
Never read as a plain number. Always access `.value` and `.label`.

## Component conventions
- One folder per feature under `components/[tab]/`
- Sub-components go in `components/[tab]/[feature]/`
- `AgentOffice` sub-components live in `components/home/office/`
- No barrel `index.ts` unless the folder has 5+ exports
- Named exports only — no default exports except page-level components

## Helpers (lib/helpers.ts)
Always use these — never inline formatting:
- `fmtPrice(n)` — currency with smart decimals
- `fmtVol(n)` — volume abbreviation (K/M/B)
- `timeAgo(ts)` — human relative time
- `esc(s)` — HTML escape for any user-supplied string in templates

## AI (lib/ai.ts)
- `callAI(prompt, maxTokens)` — simple one-shot call
- `streamAIWithThinking(opts)` — streaming with extended thinking
- `buildSystemPrompt(settings, liveContext?)` — builds the full system prompt
Never call Anthropic/OpenAI APIs directly.

## Live context (lib/liveContext.ts)
- `buildLiveContext(state)` — reads store snapshot, returns `[NEXUS LIVE INTEL]` block
- `buildCapabilitiesBlock(agentId)` — per-agent tool + reasoning descriptor
Both are injected into every agent system prompt in `AgentOffice.tsx`.

## API routes (app/api/)
All server-side. Use Node `fs` only in route handlers — never in client components.
Key routes:
- `/api/prices` — crypto price fetcher with sparklines and markets modes
- `/api/project` — serves CLAUDE.md, tasks, lessons, directory tree to agents

## TypeScript rules
- `npx tsc --noEmit` must pass before any task is marked done
- No `any` casts without a comment explaining why
- All shared types live in `components/home/office/types.ts` or `store/useStore.ts`
- Prefer `interface` for objects, `type` for unions and aliases
