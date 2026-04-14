# Nexus Prime — Onboarding Guide

**Time to read:** ~10 minutes. After this, you can run the app, understand how it works, and add a new data panel.

---

## What is Nexus Prime?

A free, self-hosted intelligence dashboard. It pulls live data from 20+ sources (crypto prices, CVEs, geopolitical news, prediction markets, OSINT tools) and gives you an AI agent team that can reason over all of it.

No cloud backend. No subscriptions. You bring your own API keys. Everything runs locally.

---

## How to run it

```bash
# 1. Install dependencies
npm install

# 2. Copy env file and add your keys (at minimum, set NEXUS_TOKEN)
cp .env.example .env.local

# 3. Start the dev server
npm run dev
# → http://localhost:3000
```

To verify everything is wired correctly:

```bash
npm run verify       # type-check + lint + path safety + security scan
npm run type-check   # TypeScript only
```

---

## App structure in 60 seconds

```
app/[tab]/page.tsx        ← one page per tab (hq, command, intel, alpha, cyber, recon, vault)
components/[tab]/         ← components for that tab
store/useStore.ts         ← all runtime state (Zustand, persisted to localStorage)
lib/                      ← shared logic (agent loop, AI calls, live context, helpers)
app/api/                  ← server-side API routes (all fetches go through here)
```

**One rule:** the client never calls external APIs directly. Everything goes through `app/api/`.

---

## The 8 tabs

| Tab | Route | What it does |
|-----|-------|-------------|
| HQ | `/hq` | Agent office — chat with JANSKY, ORBIT, NOVA, CIPHER, FLUX |
| COMMAND | `/command` | Market signals, KPIs, network health |
| INTEL | `/intel` | Geopolitics, prediction markets, SEC filings |
| ALPHA | `/alpha` | Crypto prices, momentum scanner, watchlist |
| CYBER | `/cyber` | CVE triage, OTX threat feed, CISA KEV |
| RECON | `/recon` | OSINT — RDAP, WHOIS, DNS, HIBP, Shodan |
| VAULT | `/vault` | Saved articles, tags, search |
| RESOURCES | `/resources` | Manuals, reference cards |

---

## How the agent loop works

1. You type a message in HQ chat.
2. `detectAgent()` scores the message for keywords and picks one of 5 agents: JANSKY (strategic), ORBIT (code), NOVA (research), CIPHER (security), FLUX (markets).
3. `buildLiveContext()` injects a `[NEXUS LIVE INTEL]` block with current prices, CVEs, news, and risk score into the system prompt.
4. The agent calls `callAI()` or `streamAIWithThinking()` — this hits `/api/ai` (server-side proxy), never the provider directly.
5. The agent may call tools (web_search, fetch_url, read_file, etc.) — each tool call goes through `/api/tools`.
6. The response streams back to the chat.

Key files: `lib/agent.ts` (the loop), `lib/ai.ts` (the AI calls), `lib/liveContext.ts` (the context block).

---

## How to add a new data panel

This is the most common task. Here is the exact pattern to follow.

**Step 1 — Write a spec** at `specs/features/my-panel.md` before writing any code.

**Step 2 — Add a server route** at `app/api/my-data/route.ts`:

```typescript
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const res = await fetch("https://api.example.com/data")
    const data = await res.json()
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: "fetch failed" }, { status: 500 })
  }
}
```

**Step 3 — Add a component** at `components/[tab]/MyPanel.tsx`:

```tsx
"use client"
import { useEffect, useState } from "react"

export function MyPanel() {
  const [data, setData] = useState<null | unknown[]>(null)

  useEffect(() => {
    fetch("/api/my-data")
      .then(r => r.json())
      .then(setData)
      .catch(() => {/* silent fail */})
  }, [])

  if (!data) return <div className="text-[var(--text2)] text-sm">Loading…</div>
  return <div>{/* render data */}</div>
}
```

**Step 4 — Import it** in the relevant `app/[tab]/page.tsx`.

**Step 5 — Verify:**

```bash
npx tsc --noEmit   # must pass
npm run lint       # must pass
```

That's it. No other files to touch.

---

## Key rules to know

These come from `docs/STANDARDS.md`. The most important ones:

1. **Never edit a file without reading it first.** Always read the target section before changing it.
2. **All async fetches must be wrapped in `try/catch`** — no unhandled rejections, ever.
3. **Never hardcode colors.** Use CSS variables: `var(--accent)`, `var(--surf2)`, `var(--text2)`.
4. **Fear & Greed is always `signals.fg.value` + `signals.fg.label`** — never a plain number.
5. **Format currency with `fmtPrice(n)`**, volume with `fmtVol(n)`, time with `timeAgo(ts)` from `lib/helpers.ts`. Never inline.
6. **AI calls go through `callAI()` or `streamAIWithThinking()`** from `lib/ai.ts`. Never call providers directly.
7. **State is read from Zustand via `useStore(s => s.field)`** — always a narrow selector, never the full store.
8. **`tsc --noEmit` must pass before marking any task done.**
9. **When Mario says STOP — stop immediately.**

---

## Common commands

```bash
npm run dev              # start dev server
npm run verify           # full check (type-check + lint + path safety + security)
npm run type-check       # TypeScript only
npm run lint:fix         # auto-fix lint issues
npm run test             # unit tests (vitest)
npm run eval:agent-runtime  # run the agent runtime eval harness
npm run orbit:next       # show next backlog item from docs/SYSTEM_STATE.md
npm run audit:full       # full project audit
```

---

## Where things live

| What | Where |
|------|-------|
| Current state + Next Up | `docs/SYSTEM_STATE.md` |
| Architecture + engineering rules | `docs/STANDARDS.md` |
| Feature specs | `specs/features/` |
| Architecture | `docs/architecture.md` |
| Improvement plan | `docs/plans/improvement-plan-2026-04.md` |
| Agent contract | `AGENTS.md` |
| Compatibility handoff mirror | `docs/AGENT_HANDOFF.md` |
| All API keys | `.env.local` (never committed) |
| User settings | `store/useStore.ts` → persisted to `localStorage` |
