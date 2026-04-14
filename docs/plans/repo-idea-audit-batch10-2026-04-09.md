# Repo Idea Audit Batch 10 — interactive audit details

## Why

The audit layer can now diagnose and open many repair sessions, but two detail areas were still too passive:

- `System Design` could list read-first files without turning them into immediate analysis sessions
- VAULT graph drill-down could show linked context without letting the operator pivot through those linked artifacts directly

The next useful improvement is to make those detail surfaces more interactive without adding more copy:

- read-first files should be launch points into local impact analysis
- linked graph context should be explorable in place

## Scope

In scope:

- Add shared launchers for `System Design` read-first files
- Make VAULT graph linked-context items pivotable from inside `VaultGraphFocusPanel`
- Refresh task tracking and handoff

Out of scope:

- Changing graph ranking heuristics
- Reworking the underlying system-map data model beyond action generation
- Adding new archive destinations beyond the focused sessions already present

## Implementation plan

1. Add a shared read-first action cluster to `SystemDesignConsole`
2. Add linked-context pivot controls to `VaultGraphFocusPanel`
3. Wire the VAULT page to support in-panel node pivots
4. Refresh task tracking and handoff docs
5. Re-run verification and live route checks

## Done when

- `System Design` turns read-first files into immediate local impact sessions
- VAULT graph linked-context items can be inspected directly from the focus panel
- `npm run type-check`, `npm run verify`, and `npm run handoff:write` pass
- Live `127.0.0.1:3000` checks succeed on `/resources?view=system&system=memory-spine` and `/vault?focus=vault-graph-focus&graphAudit=orphans`
