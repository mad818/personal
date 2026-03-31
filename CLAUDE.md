# NEXUS PRIME

## What this is
**Product invariant:** Nexus Prime is **free (MIT)** — **no in-app charges**, subscriptions, or Nexus-side billing. Optional keys are BYOK. See `lib/productGuarantees.ts` and `assertNexusDoesNotChargeUsers()` in `app/layout.tsx`.

Nexus Prime is a unified React/Next.js 14 intelligence dashboard at `localhost:3000`, with a native **desktop app for Windows and macOS** via Tauri (`desktop/`).
The legacy HTML app (`nexus-final.html`) has been archived to `archive/`. Do not restore it or reference it in new code — all development happens in the React app.

## Commands
```
npm run dev      # start dev server (localhost:3000)
npm run verify   # type-check + lint + path safety (same as CI)
npx tsc --noEmit # type-check only
# PWA: public/manifest.json + public/icon.svg — Chrome/Edge Install; iPhone Safari → Add to Home Screen
# Desktop (Tauri):
npm run desktop:build-runtime  # build Next.js standalone
npm run desktop:start-runtime  # run at 127.0.0.1:3000
npm run desktop:tauri:dev      # open Tauri dev shell
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

<important if="editing any .ts or .tsx file">
## Critical patterns
- `fmtPrice(n)` / `fmtVol(n)` / `timeAgo(ts)` from `lib/helpers.ts` — never inline formatting
- All async fetches: wrapped in `try/catch` with silent failure
- Fear & Greed: always `signals.fg.value` + `signals.fg.label` — never a plain number
- AI calls: always through `callAI()` or `streamAIWithThinking()` from `lib/ai.ts` — never direct provider calls
- State: always read from Zustand store via `useStore(s => s.field)` — never `useStore().field`
</important>

## Tab map (React app)
| Label | Route | Page file |
|-------|-------|-----------|
| 🤖 HQ | /home | `app/home/page.tsx` |
| ⚡ COMMAND | /command | `app/command/page.tsx` |
| 📡 INTEL | /intel | `app/intel/page.tsx` |
| 🎯 ALPHA | /alpha | `app/alpha/page.tsx` |
| 🔒 CYBER | /cyber | `app/cyber/page.tsx` |
| 🕵️ RECON | /recon | `app/recon/page.tsx` |
| 🗂 VAULT | /vault | `app/vault/page.tsx` |

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
