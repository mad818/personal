# Legacy phases — `experimentalbot` & `sanity-next-js-personal-website`

**Repos (your history):**

- [mad818/experimentalbot](https://github.com/mad818/experimentalbot)
- [mad818/sanity-next-js-personal-website](https://github.com/mad818/sanity-next-js-personal-website)

**Access note:** These URLs currently return **404** to unauthenticated/API checks (likely **private** or renamed). This doc is built from what still exists **inside Nexus**: the **`archive/`** tree (StockBot-style Next app) plus current project-relative runtime docs.

**To recover “lost” GitHub/X ideas:** clone those repos locally (or export issues/README), then paste bullets into a new section below — we can triage into specs.

---

## What `archive/` shows (phase ~StockBot / Groq chat)

| Idea / artifact | In Nexus today? | Notes |
|-----------------|-----------------|--------|
| **Next.js + AI chat** (`archive/app/(chat)/`, `chat.tsx`, Groq) | **Yes — evolved** | Global **CommandBar** + `lib/agent.ts` / `/api/ai` (multi-provider, not Groq-only). |
| **TradingView embed widgets** (ticker, advanced chart, heatmaps, etc.) | **Partial → now extended** | Full suite still only in `archive/components/tradingview/`. **Assimilated:** MARKETS tab **📺 CHARTS** (`/alpha?view=charts`) uses **ticker tape + BTC advanced chart** (`components/alpha/TradingViewMarkets.tsx`). Optional: port screener, heatmap, etc. later. |
| **Model selector UI** (`archive/components/model-selector.tsx`) | **No** (commented stub) | Nexus uses **Settings → AI Provider** + local endpoint/model. A **per-session model dropdown** in CommandBar could be added if you want parity. |
| **Missing API key banner** (Groq-only) | **Different pattern** | Nexus uses **Settings drawer** + `/api/settings` booleans; no top-of-chat Groq banner. Could add a **soft “no AI keys configured”** strip from `/api/status` if desired. |
| **Sanity CMS** | **Not in scope** | Current app is **code-first** content; no Sanity client. Reintroduce only if you want a blog/portfolio slice. |
| **Tailwind + shadcn-style UI primitives** (`archive/components/ui/*`) | **No** | Nexus uses **inline styles + globals.css**; not worth wholesale port without a design pass. |
| **Agent workspace path** (`AGENT_WORKSPACE=.../experimentalbot-main/agent-workspace`) | **Superseded** | Nexus agent tools use **project-relative** `patch_project_file` / API routes, not that folder layout. |
| **Streaming hooks** (`use-streamable-text`, `use-scroll-anchor`, …) | **Partial** | CommandBar has its own scroll/stream behaviour; could mine hooks for polish only. |
| **Stock-specific chat tools** (AI returns `<StockChart/>` etc. in `archive/lib 2/chat/actions.tsx`) | **No** | Nexus agent tools are **project/code/intel** focused, not JSX-injection for TradingView. Charts are a **dedicated MARKETS view** instead. |

---

## X (Twitter) ideas

Not recoverable from the repo. If you bookmarked threads or posted feature lists, **append them here** (bullet list) so they can be tracked like other `docs/ideas/*` files.

---

## Suggested next assimilations (optional)

1. **More TradingView widgets** — copy from `archive/components/tradingview/` into `components/alpha/` (each needs CSP review).
2. **CommandBar model quick-picker** — maps to `localModel` or a new `preferredCloudModel` in `useStore`.
3. **`/api/status`-driven banner** — “No LLM provider configured” when all AI flags false.

---

## Related docs

- [external-links-mapping.md](./external-links-mapping.md)
- [assimilated-ecosystem.md](./assimilated-ecosystem.md)
- [../plans/nexus-comprehensive-roadmap-2026.md](../plans/nexus-comprehensive-roadmap-2026.md)
