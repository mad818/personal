# Nexus Prime Agent Contract

## Canonical Context Spine

Read these in order:

1. `AGENTS.md`
2. `docs/SYSTEM_STATE.md`
3. `docs/STANDARDS.md` when implementation starts
4. `docs/PROJECT_BIBLE.md` only when product intent or long-horizon direction matters

Legacy compatibility files still exist for one transition tranche, but they are no longer canonical:

- `CLAUDE.md`
- `tasks/todo.md`
- `tasks/lessons.md`
- `docs/AGENT_HANDOFF.md`

## Session Ritual

1. Run `npm run handoff:pull` before touching code so the local repo matches GitHub when possible.
2. Read this file.
3. Read `docs/SYSTEM_STATE.md` for the latest shipped tranche, blockers, release posture, and Next Up queue.
4. Read `docs/STANDARDS.md` before editing code.
5. Read `docs/PROJECT_BIBLE.md` only if the task needs stable product truth rather than current execution state.

## Operating Rules

- When Mario says `STOP`, halt immediately. No more tool calls or edits.
- Read the relevant file section before patching. Never edit blind.
- Make the smallest change that solves the problem. No scope creep.
- For work with 3 or more meaningful steps, update the active program in `docs/SYSTEM_STATE.md`. During the compatibility tranche, mirror Next Up only where older tooling still needs it.
- `npm run type-check` must pass after code changes before the task is considered done.
- All async fetches must use `try/catch` with silent failure unless the surface explicitly needs hard failure.
- All AI calls go through `lib/ai.ts` (`callAI()` or `streamAIWithThinking()`). Never call providers directly from product code.
- All external browser fetches go through `app/api/*`. Do not call third-party APIs directly from the client.
- Zustand reads must use narrow selectors like `useStore((s) => s.field)`, never `useStore().field`.
- Use shared helpers for formatting (`fmtPrice()`, `fmtVol()`, `timeAgo()`) instead of inline formatting.

## File Order Guidance

- `AGENTS.md` explains how to work.
- `docs/SYSTEM_STATE.md` explains what is true right now.
- `docs/STANDARDS.md` explains what must stay true while we build.
- `docs/PROJECT_BIBLE.md` explains what Nexus is trying to become.

## Verification

Minimum bar after implementation:

1. `npm run type-check`
2. Any targeted checks relevant to the touched surface or script
3. Read the patched section again and confirm it matches the intended behavior

## End Of Session

- Refresh compatibility outputs with `npm run handoff:write` when the current state changes.
- Use normal git workflow (`git add`, `git commit`, `git push`) only when the user wants the work committed or published.
