## Claude Desktop + Cursor workflow (Nexus Prime)

### Roles (most effective split)

- **Claude Desktop = brain**: planning, root-cause analysis, reviews, edge cases, step-by-step patch plans.
- **Cursor = hands**: navigation, edits, applying patches, running checks, fixing TypeScript/runtime errors.

This keeps one tool authoritative for editing (Cursor) and avoids “two writers” corrupting context.

### Daily loop (fast + reliable)

1. **Run the app**

```bash
npm run dev
```

2. **When you hit a bug**

- Capture **console errors** + a screenshot (or short description).
- If clickability is broken, read the in-app **CLICK DEBUG** overlay:
  - `target: …`
  - `top: …`

3. **Ask Claude Desktop**

Paste the template below (copy/paste) so Claude can reason precisely.

4. **Implement in Cursor**

Apply changes in Cursor (not in Claude Desktop), then run:

```bash
npm run verify
```

### Debug paste template (for Claude Desktop)

Paste this block and fill in the blanks:

```text
Goal:
Expected:
Actual:

Repro steps:
1)
2)

Console errors (top 20 lines):
...

CLICK DEBUG (if relevant):
target: ...
top: ...

Affected page/route:

Recent changes:
```

### Repo checks (single command)

Use this after any meaningful change:

```bash
npm run verify
```

It runs: TypeScript, lint, and path-collision guardrails.

If you want to also enforce formatting (Prettier), use:

```bash
npm run verify:full
```

