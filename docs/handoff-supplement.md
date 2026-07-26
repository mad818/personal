<!-- Compact companion to the generated Codex handoff. Keep this short. -->

**Codex operating spine**

- `AGENTS.md` — session startup rules and repo-specific coding constraints.
- `docs/SYSTEM_STATE.md` — current shipped state, active architecture, and known blockers.
- `tasks/todo.md` — active queue; use `## Next Up` as the work selector.
- `tasks/lessons.md` — corrections and rules from past sessions.

**Handoff rule**

- Run `npm run handoff:write` after task/docs state changes.
- Run `npm run handoff:check` before calling handoff docs synced.
- Do not expand Claude/Cursor mirrors unless Mario explicitly asks; this repo is Codex-first now.
