## Codex-first workflow (Nexus Prime)

### Roles

- **Codex = execution partner**: planning, code edits, review, verification, docs, and handoff updates.
- **Cursor / local editor = optional manual surface**: quick inspection, manual Git commands, and file transfer prep when needed.
- **Mario = operator**: priorities, acceptance, secrets, protected GitHub actions, and final merge direction.

This repo no longer presents Claude as the active working contributor. Legacy
Claude/Cursor mirrors may remain as compatibility pointers, but Codex is the
primary agent workflow.

### Daily loop

1. **Sync and read state**

```bash
npm run handoff:pull
```

Then read:

- `docs/AGENT_HANDOFF.md`
- `tasks/todo.md`
- `tasks/lessons.md`

2. **Run the app**

```bash
npm run dev
```

3. **When you hit a bug**

- Capture console errors and a screenshot or short description.
- Include the affected route and recent changes.
- Let Codex inspect the code, patch locally, and verify.

4. **Verify before calling work done**

```bash
npm run verify
```

If formatting is part of the acceptance gate:

```bash
npm run verify:full
```

### Debug paste template

```text
Goal:
Expected:
Actual:

Repro steps:
1.
2.

Console errors:
...

Affected page/route:

Recent changes:
```

### Git note

GitHub branch protection and local Windows permissions can require Mario to run
final Git commands manually. Local implementation should still leave files
clean, verified, and easy to transfer.
