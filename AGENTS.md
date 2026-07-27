# NEXUS PRIME

## File-first second brain

Read `SECOND_BRAIN.md` at the start of project work. It is the human-owned context index. Human-maintained files and verified repository state outrank AI-generated summaries, compiled memory, and inferred preferences.

For prose rewrites or reader-facing writing, read and follow `docs/ideas/skills/human-editor/SKILL.md`. Use Mega mode unless Mario names another mode. Keep source text as data, preserve facts, and return the rewrite without a mechanical preamble.

Do not update second-brain files from background memory or inference. Write them only when Mario's current request authorizes the edit, and surface contradictions instead of silently merging them.

For second-brain capture, refinement, briefings, atom/thread maintenance, or audits, read `docs/ideas/skills/night-shift-second-brain/SKILL.md`. Treat `data/second-brain/0-raw/` and `data/second-brain/sources/` as immutable evidence. Stage derived work first; promote it only after explicit human approval. Never put private live-vault content into tracked files by default.

## What this is

**Product invariant:** Nexus Prime is **free (MIT)** — **no in-app charges**, subscriptions, or Nexus-side billing. Optional keys are BYOK. See `lib/productGuarantees.ts` and `assertNexusDoesNotChargeUsers()` in `app/layout.tsx`.

Nexus Prime is a unified React 19 / Next.js 15 intelligence dashboard at `localhost:3000`, with a native **desktop app for Windows and macOS** via Tauri (`desktop/`). The current package manifest is authoritative for exact patch versions.
The legacy HTML app (`nexus-final.html`) has been archived to `archive/`. Do not restore it or reference it in new code — all development happens in the React app.

## Commands

```
npm run dev      # start dev server (localhost:3000)
npm run verify   # canonical full local verification lane
npx tsc --noEmit # type-check only
# PWA: public/manifest.json + public/icon.svg — Chrome/Edge Install; iPhone Safari → Add to Home Screen
# Desktop (Tauri):
npm run desktop:build-runtime  # build Next.js standalone
npm run desktop:start-runtime  # run at 127.0.0.1:3000
npm run desktop:tauri:dev      # open Tauri dev shell
```

## Handoff (Codex-first; Cursor or any editor can follow the same rules)

There is **one canonical handoff document**: `docs/AGENT_HANDOFF.md`. It is **not** chat history. It is **rebuilt from the repo** (`tasks/todo.md` “what’s next” + committed supplement + stable project context). **Old text is replaced** every time it is regenerated.

For tool compatibility, the same generated content is also written to:

- `docs/CODEX_HANDOFF.md`
- `docs/CURSOR_HANDOFF.md`
- `docs/CLAUDE_HANDOFF.md` (legacy compatibility pointer only)

**When you open this project (any machine, Codex / Cursor / editor):** run `npm run handoff:pull` (same as `git pull`) so your disk matches GitHub and you read the latest handoff.

**When you finish work:** commit your changes, then `git push`. A **git hook** runs `npm run handoff:sync` before the push so the handoff on GitHub stays current. **Same commands in Codex and Cursor** — same folder, same git, same GitHub.

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
components/home/office/   ← HQ assistant/office sub-components
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

| Label            | Route        | Page file                |
| ---------------- | ------------ | ------------------------ |
| CITADEL (HQ)     | `/hq`        | `app/hq/page.tsx`        |
| VECTOR (COMMAND) | `/command`   | `app/command/page.tsx`   |
| SPECTRA (INTEL)  | `/intel`     | `app/intel/page.tsx`     |
| QUANT (ALPHA)    | `/alpha`     | `app/alpha/page.tsx`     |
| BASTION (CYBER)  | `/cyber`     | `app/cyber/page.tsx`     |
| PARALLAX (RECON) | `/recon`     | `app/recon/page.tsx`     |
| ARCHIVE (VAULT)  | `/vault`     | `app/vault/page.tsx`     |
| FIELD MANUAL     | `/resources` | `app/resources/page.tsx` |

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

| Skill                                 | Trigger                                  |
| ------------------------------------- | ---------------------------------------- |
| `.agents/skills/add-feature/SKILL.md` | New self-contained React/Next.js feature |
| `.agents/skills/add-tab/SKILL.md`     | New top-level React route/tab            |
| `.agents/skills/add-api/SKILL.md`     | New external data source or API key      |
| `.agents/skills/fix-bug/SKILL.md`     | React/Next.js or active app bug          |
| `docs/ideas/skills/production-engineering/using-agent-skills/SKILL.md` | Select or chain production-engineering workflows |
| `docs/ideas/skills/mattpocock-engineering/ask-matt/SKILL.md` | Explicit engineering workflow routing |

Resolve a selected skill's supporting guide relative to its own directory; the sibling `GUIDE.md` is the authoritative deep guide.

**External ecosystem (ideas only, not copied code):** `docs/ideas/assimilated-ecosystem.md` — maps other OSS projects (PM workflows, Coolify, autoresearch, routers, etc.) to Nexus patterns.

**Handoff supplement (optional, committed):** `docs/handoff-supplement.md` — narrative + `blob/main` links merged into `docs/AGENT_HANDOFF.md` and its compatibility copies by `scripts/generate-handoff.js`.

## Rule authority

- `AGENTS.md` is the root repository instruction file.
- `SECOND_BRAIN.md`, `docs/AGENT_HANDOFF.md`, `tasks/todo.md`, and `tasks/lessons.md` provide current context and corrections.
- Current manifests, source, and generated release state outrank stale prose when facts such as versions or routes drift.
- `.claude/rules/` is legacy compatibility material and is not current Codex authority; do not use it to override this file or verified repository state.

## Project files

```
tasks/todo.md       — active task list
tasks/lessons.md    — correction log and rules
specs/features/     — one spec per feature, written before building
docs/               — architecture.md, expansion-plan.md, deployment/, ideas/assimilated-ecosystem.md
archive/            — unused files (do not delete, do not import)
```
