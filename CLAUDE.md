# NEXUS PRIME

## What this is
**Product invariant:** Nexus Prime is **free (MIT)** — **no in-app charges**, subscriptions, or Nexus-side billing. Optional keys are BYOK. See `lib/productGuarantees.ts` and `assertNexusDoesNotChargeUsers()` in `app/layout.tsx`.

Nexus Prime is a dual-surface intelligence dashboard:
- `nexus-final.html` — original single-file browser app (~12,265 lines). Do not split it.
- React/Next.js 14 app in the project root — active development surface.

## Commands
```
npm run dev      # start dev server (localhost:3000)
npm run verify   # type-check + lint + path safety (same as CI)
npx tsc --noEmit # type-check only
# PWA: public/manifest.json + public/icon.svg — Chrome/Edge Install; iPhone Safari → Add to Home Screen
```

## Handoff (Cursor, Claude, or any editor — same rules)

There is **one** handoff file: `docs/CLAUDE_HANDOFF.md`. It is **not** chat history. It is **rebuilt from the repo** (latest commit + file list + `tasks/todo.md` “what’s next”). **Old text is replaced** every time it is regenerated.

**When you open this project (any machine, Cursor or Claude):** run `npm run handoff:pull` (same as `git pull`) so your disk matches GitHub and you read the latest handoff.

**When you finish work:** commit your changes, then `git push`. A **git hook** runs `npm run handoff:sync` before the push so the handoff on GitHub stays current. **Same commands in Cursor and in Claude** — same folder, same git, same GitHub.

**If “what to do next” should change:** edit `tasks/todo.md` (section `## Next Up`). The next `handoff:write` / push will pull that into the handoff.

```
npm run handoff:pull   # start of session — get latest from GitHub
npm run handoff:write  # optional — refresh handoff without pushing
git add / git commit / git push   # end of session — push updates handoff via hook
```

## React app structure
```
app/[tab]/page.tsx        ← one route per tab
components/[tab]/         ← one folder per tab
components/home/office/   ← AgentOffice sub-components (all split files here)
store/useStore.ts         ← Zustand state (replaces S{} from the HTML app)
lib/ai.ts                 ← callAI, streamAI, buildSystemPrompt
lib/liveContext.ts        ← buildLiveContext, buildCapabilitiesBlock
lib/helpers.ts            ← fmtPrice, fmtVol, timeAgo, esc
app/api/                  ← Next.js server routes
```

<important if="editing nexus-final.html, any .ts, or any .tsx file">
## Critical patterns
- `$(id)` not `document.getElementById` — helper defined at top of HTML app
- `showToast(msg, type)` for all user-facing notifications
- `fmtPrice(n)` / `fmtVol(n)` for formatting — never raw `.toFixed()`
- All async fetches: wrapped in `try/catch` with silent failure
- CSS class names: kebab-case, feature-prefixed (`ms-`, `pm-`, `sb-`, `ss-`)
- Fear & Greed: always `S.signals.fg.value` + `S.signals.fg.label` — never a plain number
- AI calls: always through `stratAICall()` or `callAI()` — never direct API calls
</important>

## Tab map (HTML app)
| Label | data-tab | Init function |
|-------|----------|---------------|
| ⚡ COMMAND | superset | `initSupersetTab()` |
| 📡 SIGNALS | articles | _(auto)_ |
| 🎯 ALPHA | buys | `initBuysTab()` |
| 🌍 OPS | world | `initWorldTab()` |
| 📊 INTEL | strategy | `initStratTab()` |
| 🔒 CYBER | security | _(auto)_ |
| 🗂 VAULT | saved | `renderSavedTab()` |

<important if="making any code change">
## Operating principles
1. **Plan first** — write to `tasks/todo.md` before touching code on any 3+ step task
2. **Read before edit** — always read the full file section before patching
3. **Verify before done** — `tsc --noEmit` must pass; read the patched section; confirm it works
4. **Lessons loop** — after any correction, update `tasks/lessons.md` with a rule
5. **Surgical edits** — smallest change that solves the problem; no scope creep
6. **Stop means stop** — when Mario says STOP, halt immediately, no further tool calls
</important>

## Skills (read before starting the relevant work)
| Skill | Trigger |
|-------|---------|
| @.claude/skills/add-feature/SKILL.md | New feature in nexus-final.html |
| @.claude/skills/add-tab/SKILL.md | New top-level tab |
| @.claude/skills/add-api/SKILL.md | New external data source or API key |
| @.claude/skills/fix-bug/SKILL.md | Any bug in nexus-final.html |

**External ecosystem (ideas only, not copied code):** `docs/ideas/assimilated-ecosystem.md` — maps other OSS projects (PM workflows, Coolify, autoresearch, routers, etc.) to Nexus patterns.

**Handoff supplement (optional, committed):** `docs/handoff-supplement.md` — narrative + `blob/main` links merged into `docs/CLAUDE_HANDOFF.md` by `scripts/generate-handoff.js`.

## Rules (auto-loaded by path — do not repeat here)
@.claude/rules/security.md
@.claude/rules/architecture.md
@.claude/rules/html-app.md
@.claude/rules/agents.md

## Project files
```
tasks/todo.md       — active task list
tasks/lessons.md    — correction log and rules
specs/features/     — one spec per feature, written before building
docs/               — architecture.md, expansion-plan.md, deployment/, ideas/assimilated-ecosystem.md
archive/            — unused files (do not delete, do not import)
```
