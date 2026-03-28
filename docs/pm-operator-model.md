# PM / engineering squad model (operator playbook)

This is how to **run** Nexus (and any parallel AI tooling) as a small org: **you are the product manager**, **the agents are engineers**, and your job is to **keep the engineering loop healthy**, not to do every line yourself.

## Roles

| Role | Who | Job |
|------|-----|-----|
| **Product manager** | You (Max) | Priorities, scope, acceptance, unblock, say no, merge direction |
| **Engineering squad** | In-app specialists (MAX / EL / DUSTIN / …) + IDE agents (Cursor, Claude Code, etc.) | Execute: code, research, review, ops |
| **Quality / SRE** | CI (Quality Gates), `npm run verify`, runtime eval | Objective “is the factory green?” |

## What “keep them running at all times” means

It is **not** “every model is always streaming.” It **is**:

1. **Clear backlog** — `tasks/todo.md` has a real `## Next Up`; you re-order and cut scope.
2. **Unblocked execution** — agents get specs, file paths, and constraints; you resolve ambiguities in one message.
3. **Green pipeline** — before you call a slice “done”: `npm run verify`, handoff doc in sync, CI green on `main`.
4. **Parallel lanes when safe** — e.g. one agent on UI, another on docs, another on research; you own integration.
5. **Escalation** — when an agent loops or drifts, you stop, shrink the task, or switch specialist (HQ dispatch or new chat).

## Map to Nexus Prime

| PM habit | In this repo |
|----------|----------------|
| Roadmap | `tasks/todo.md`, `tasks/vision-roadmap.md`, `specs/features/` |
| Spec before build | `specs/features/*.md` before large features |
| Code + review | HQ **EL (orbit)** for edits; MAX for synthesis |
| Health check | **Settings** diagnostics, `/api/status`, **Quality Gates** workflow |
| Lessons | `tasks/lessons.md` after any correction |
| Handoff between sessions | `docs/CLAUDE_HANDOFF.md` + `npm run handoff:write` |

## In-app fiction vs real life

- **MAX (JANSKY)** in HQ is the in-universe “boss” persona.
- **You** are still the real PM: MAX’s prompt is written to **serve your intent**, route to specialists, and surface blockers—like a staff engineer who reports to you.

## Optional extensions (later)

- Scheduled **eval** or smoke on a cron (GitHub Actions `schedule`).
- A **PM checklist** panel (verify, last eval grade, open Next Up count).
- Explicit **task queue** API if you outgrow markdown todos.

---

*Keep this doc aligned with `.claude/rules/agents.md` and `components/home/office/prompts.ts`.*
