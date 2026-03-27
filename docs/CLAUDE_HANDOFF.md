## Nexus Prime — Claude Desktop Handoff

### Project purpose

Nexus Prime is a **free, open-source, self-hosted intelligence dashboard**. It runs locally (no cloud backend, no DB) and aggregates data across markets, geopolitics, cyber, ops, IoT, etc. It also includes an AI agent that can run a tool-use loop (Claude via server proxy or local Ollama).

### Current development surface

- **Active app**: Next.js 14 + TypeScript in repo root (`app/`, `components/`, `lib/`, `store/`).
- **Legacy reference**: `nexus-final.html` (single-file app; keep intact).

### How to run

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

### Verification (always run after edits)

```bash
npm run verify
```

Runs: TypeScript (`tsc --noEmit`), ESLint (`next lint`), and path-collision guardrails.

Optional stricter check:

```bash
npm run verify:full
```

### Security model (important)

- Server routes under `app/api/*` are protected by `NEXUS_TOKEN` (see `.env.example`).
- Never commit `.env.local` or secrets.
- CSP is enforced via `next.config.js` headers. Client-side fetches must respect `connect-src` (prefer server-side proxy routes).

### What changed recently (high signal)

- **Intel/Markets/Cyber sub-tabs fixed**: URL ↔ Zustand persisted state syncing was thrashing and could revert clicks (made tabs appear “unclickable”). Fixed by making URL→store sync depend only on the URL value and making store→URL sync conditional to avoid replace thrash.
  - Files: `app/intel/page.tsx`, `app/alpha/page.tsx`, `app/cyber/page.tsx`

- **Click interception hardening**:
  - Added `components/ui/ClickDebug.tsx` (debug overlay) and fixed it to *ignore clicks in its own rectangle* so it doesn’t misreport by clicking-through to elements underneath.
  - Offscreen fixed slide-panels were hardened to not intercept clicks when closed by using `pointerEvents: open ? 'auto' : 'none'`.
    - Files: `components/signals/TopicHeatmap.tsx`, `components/ops/WorldTopicHeatmap.tsx`, `components/cyber/CyberArticleHeatmap.tsx`

- **News CSP fix**:
  - Client CryptoCompare fetch was blocked by CSP; moved the CryptoCompare fetch server-side into `/api/news` and removed the client fetch.
    - Files: `app/api/news/route.ts`, `hooks/useArticles.ts`

- **Dev workflow**:
  - Added `docs/workflow.md` describing “Claude Desktop = brain / Cursor = hands” and a debug paste template.
  - Added `npm run verify` and `npm run verify:full` scripts to standardize checks.

- **HQ/3D office work** (in progress but functional):
  - 3D office scene improvements, wall-mounted control/KPI boards, LA skyline window asset + attribution, VFX quality toggle.
  - Files live primarily under `components/home/office/` and settings/state in `store/useStore.ts`.

### Repo map (where to look)

- **Tabs**: `app/[tab]/page.tsx`
  - Intel: `app/intel/page.tsx`
  - Markets: `app/alpha/page.tsx`
  - Cyber: `app/cyber/page.tsx`
- **Global state**: `store/useStore.ts` (Zustand + persistence + migrations)
- **AI**:
  - Agent loop: `lib/agent.ts`
  - Model/provider routing: `lib/ai.ts`, `lib/aiModelRouting.ts`
  - Live context: `lib/liveContext.ts`
  - Tool executor route: `app/api/tools/route.ts`
  - AI proxy route: `app/api/ai/route.ts`
- **Runtime/verification**:
  - Verify endpoint: `app/api/verify/*`
  - Status endpoint: `app/api/status/*`
  - Runtime eval harness script: `scripts/eval-agent-runtime.js`

### Known open work / “what’s missing”

Top items from `tasks/todo.md`:

- Stranger Things “Beyond Tier” 3D agents: stature/stance + VFX polish + quality toggle.
- Telegram bot integration (message agents from phone) — last.
- Intel/Markets/Cyber: unify sub-tab UX (shared switcher patterns, consistent empty/loading/error).
- Intel: better news drill-down, topic clustering; prediction market UX upgrades.
- Markets: performance + clarity pass on watchlist/scanner/sizer.
- Cyber: triage-first correlation view (CVE/OTX/CISA) reliability improvements.

### Operating principles (project conventions)

- Plan first for multi-step work (`tasks/todo.md`).
- Verify before done (`npm run verify`).
- Keep changes surgical; don’t remove existing features.

