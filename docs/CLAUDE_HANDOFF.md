## Nexus Prime — Claude Desktop Handoff (AUTO)

**Generated from commit:** `2026-03-27T07:37:44-07:00`
**Commit:** `58f4293` — Ship tab click fixes, CSP-safe news, and Claude handoff.

### Project purpose

Nexus Prime is a **free, open-source, self-hosted intelligence dashboard** that runs locally (no cloud backend, no DB).
It aggregates markets, geopolitics, cyber, ops, IoT, and includes an AI agent (Claude via server proxy or local Ollama).

### Development stage

- Next.js 14 app is the active surface (`app/`, `components/`, `lib/`, `store/`).
- `nexus-final.html` remains as legacy reference and should stay single-file.

### Run + verify

```bash
npm install
npm run dev
```

**Always verify after edits:**

```bash
npm run verify
```

### Security + ops constraints

- Secrets live in `.env.local` (never commit). See `.env.example`.
- Server routes are protected by `NEXUS_TOKEN` and CSP is enforced in `next.config.js`.
- Prefer server-side API routes for external fetches to avoid CSP/CORS issues.

### What changed in the latest push

Files touched in the latest commit:

- `.env.example`
- `.github/workflows/quality-gates.yml`
- `README.md`
- `app/alpha/page.tsx`
- `app/api/ai/route.ts`
- `app/api/metrics/runtime-eval/route.ts`
- `app/api/metrics/runtime-eval/run/route.ts`
- `app/api/news/route.ts`
- `app/api/status/route.ts`
- `app/api/verify/route.ts`
- `app/cyber/page.tsx`
- `app/intel/page.tsx`
- `app/layout.tsx`
- `app/reset/page.tsx`
- `components/cyber/CyberArticleHeatmap.tsx`
- `components/home/office/OfficeCommandCenter.tsx`
- `components/home/office/OfficeRoom3D.tsx`
- `components/home/office/constants.ts`
- `components/home/office/palette.tsx`
- `components/home/office/prompts.ts`
- `components/home/office/sprites.ts`
- `components/ops/WorldTopicHeatmap.tsx`
- `components/settings/SettingsDrawer.tsx`
- `components/signals/TopicHeatmap.tsx`
- `components/ui/ClickDebug.tsx`
- `components/ui/CronSchedulerPanel.tsx`
- `components/ui/CronSchedulerRunner.tsx`
- `components/ui/RuntimeEvalTrend.tsx`
- `components/ui/TelemetryHUD.tsx`
- `docs/CLAUDE_HANDOFF.md`
- `docs/attribution.md`
- `docs/ideas/agent-ecosystem-patterns-to-nexus-blueprint.md`
- `docs/metrics/README.md`
- `docs/metrics/agent-runtime-history.jsonl`
- `docs/metrics/agent-runtime-latest.json`
- `docs/releases/2026-03-27-secure-push-summary.md`
- `docs/workflow.md`
- `hooks/useArticles.ts`
- `lib/agent.ts`
- `lib/ai.ts`
- `lib/aiModelRouting.ts`
- `lib/apiCache.ts`
- `lib/helpers.ts`
- `lib/liveContext.ts`
- `lib/runtimeConfig.ts`
- `lib/runtimeTypes.ts`
- `next.config.js`
- `package.json`
- `public/office/la-skyline.jpg`
- `scripts/eval-agent-runtime.js`
- `specs/features/multi-phase-agent-hardening-sprint.md`
- `specs/features/release-hardening-phase1.md`
- `store/useStore.ts`
- `tasks/lessons.md`
- `tasks/todo.md`
- `tsconfig.tsbuildinfo`

### What’s next (from `tasks/todo.md`)

- Stranger Things “Beyond Tier” 3D agents: stature + stance + VFX (EL aura, Hopper flashlight) + quality toggle
- Telegram bot integration (message agent from phone) — do last
- Intel/Markets/Cyber: convert sections to real sub-tabs (URL + persisted state) and lazy-load heavy views (NO HQ changes)
- Intel/Markets/Cyber: unify sub-tab UX (shared switcher, consistent headers, empty/loading/error states) (NO HQ changes)
- Intel: improve News drill-down + topic clustering; Prediction market UX upgrades (NO HQ changes)
- Markets: watchlist/screener/sizer performance + clarity pass (NO HQ changes)
- Cyber: triage-first view + correlation (CVE/OTX/CISA) + reliability pass (NO HQ changes)

### Where to look

- **Tabs**: `app/[tab]/page.tsx`
- **State**: `store/useStore.ts`
- **AI**: `lib/agent.ts`, `lib/ai.ts`, `app/api/ai/*`, `app/api/tools/*`
- **Diagnostics**: `app/api/status/*`, `app/api/verify/*`, `docs/metrics/*`
