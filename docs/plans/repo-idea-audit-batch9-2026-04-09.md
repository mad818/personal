# Repo Idea Audit Batch 9 — deeper audit-to-repair continuity

## Why

The audit layer is now strong across Resources, but two deeper surfaces still lagged behind the same diagnose-to-fix discipline:

- `System Design` still used a one-off button row for impact seeds instead of the shared repair-session launcher pattern
- VAULT graph drill-down could explain an isolated or incomplete artifact, but it did not yet open the strongest repair sessions directly from that focused detail surface

The next useful improvement is continuity, not more explanation:

- architecture maps should launch blast-radius work through the same shared cluster pattern
- graph/detail drill-down should open orphan, route, and tag repair views from the selected artifact itself

## Scope

In scope:

- Move `System Design` impact seeds onto the shared action-session cluster
- Add repair-session launchers to `VaultGraphFocusPanel` for orphaned, route-less, and untagged artifact states
- Refresh task tracking and handoff

Out of scope:

- Changing graph heuristics or compiled-page filtering logic
- Adding new repair destinations beyond the focused sessions that already exist
- Reworking the broader VAULT graph layout or System Design data model

## Implementation plan

1. Convert `System Design` impact-seed actions to the shared action-session cluster
2. Add focused repair-session actions to VAULT graph drill-down when the selected node shows archive repair signals
3. Refresh task tracking and handoff docs
4. Re-run verification and live route checks

## Done when

- `System Design` uses the same shared exact-session cluster for impact seeds as the other audit consoles
- VAULT graph drill-down can open orphan, route-less, and untagged repair sessions from the selected artifact when relevant
- `npm run type-check`, `npm run verify`, and `npm run handoff:write` pass
- Live `127.0.0.1:3000` checks succeed on `/resources?view=system&system=memory-spine`, `/vault?focus=vault-graph-focus&graphAudit=orphans`, and `/vault?focus=vault-compiled-pages&compiledFilter=route-less`
