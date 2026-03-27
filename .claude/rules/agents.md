---
description: Nexus Prime agent system — five specialists, live context injection, reasoning standards, routing
paths:
  - "components/home/**"
  - "lib/ai.ts"
  - "lib/liveContext.ts"
  - "lib/agent.ts"
---

# Agent System

## The five agents
| Agent | Specialty | Key tools |
|-------|-----------|-----------|
| JANSKY | Strategic generalist, orchestrator | Browser tools, web search |
| ORBIT | Codebase engineering | File read/write/patch, tsc |
| NOVA | Research + data gathering | web_search, fetch_url, browser |
| CIPHER | Cybersecurity, CVE analysis | File tools, web search |
| FLUX | Markets, quant, macro | Live data, web search |

Detection: `detectAgent(msg)` in `components/home/office/prompts.ts` — keyword scoring,
falls back to JANSKY at < 2 hits.

## Live context injection (every agent call)
Every agent system prompt gets two injected blocks:
1. `buildLiveContext(useStore.getState())` → `[NEXUS LIVE INTEL]` block with:
   - Live crypto prices (BTC, ETH, SOL, BNB)
   - Fear & Greed value + label
   - World risk score
   - CVE count (critical/high)
   - Top 6 news headlines
   - Session task count
2. `buildCapabilitiesBlock(agentId)` → per-agent tool + reasoning style summary

Both live in `lib/liveContext.ts`. Rebuild on every dispatch — always current.

## Reasoning standards (encoded in prompts.ts)
Each agent follows a specific reasoning framework:

**JANSKY** — Claude-style systematic decomposition:
decompose → reason each part → synthesise → flag uncertainty

**ORBIT** — Claude-style read → plan → patch → verify:
read full context → plan smallest change → check side effects → patch → verify

**NOVA** — Perplexity search + Gemini structured synthesis:
search → read sources → cross-reference → organise by angle → cite every claim

**CIPHER** — Gemini structured threat analysis:
categorise class → ground in live CVEs → prioritise by impact×exploitability → recommend with specifics → verify

**FLUX** — All three combined:
lead with live numbers → decompose market structure → bull/base/bear probability assessment → single actionable signal

## Agent prompt build order (OfficeCommandCenter.tsx send flow)
```typescript
const liveContext    = buildLiveContext(useStore.getState())
const systemPrompt   = buildSystemPrompt(s.settings, liveContext)
const enrichedPrompt = buildAgentPrompt(target, systemPrompt) + buildCapabilitiesBlock(target)
```

## File map
```
app/home/page.tsx                        — home route entry, renders HQ command center
components/home/office/OfficeCommandCenter.tsx — active HQ chat + dispatch + prompt pipeline
components/home/office/OfficeRoom3D.tsx  — 3D office floor, furniture, wall boards, agent markers
components/home/office/WelcomeHUD.tsx    — stat cards shown when chat is empty
components/home/office/CrabMascot.tsx    — emotion-reactive crab
components/home/office/SystemMonitor.tsx — six live counters
components/home/office/DispatchBar.tsx   — animated dispatch travel bar
components/home/office/ToolCallBadge.tsx — collapsible tool step pill in chat
components/home/office/prompts.ts        — buildAgentPrompt, detectAgent
components/home/office/types.ts          — all shared TypeScript types
components/home/office/constants.ts      — AGENTS, positions, TOOL_ICON, animations
components/home/office/palette.tsx       — colour map + SVG Sprite renderer
components/home/office/sprites.ts        — pixel-art sprite data
components/home/office/animations.css    — @keyframes
components/home/office/widgets/          — ServerRackLive, TrashCan, LLMFuelGauge
```
