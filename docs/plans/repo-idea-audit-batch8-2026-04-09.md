# Repo Idea Audit Batch 8 — subsection and repair-session continuity

## Why

The audit-to-repair loop is now strong across Resources, but two important surfaces still lagged behind the pattern:

- `Surfaces` subsection cards still mixed explanation and one-off open buttons
- VAULT compiled-page repair views explained the problem clearly, but did not immediately offer the strongest exact repair sessions from inside the filtered lane

The next useful improvement is not more explanation. It is cleaner continuity:

- descriptive cards should stay readable
- shared exact-session launchers should carry the real navigation work
- repair filters should offer the next fix directly from the problem view

## Scope

In scope:

- Simplify `Surfaces` subsection cards so they read as lane descriptions first
- Add one shared exact-session cluster for subsection openings
- Add compact repair-session launchers to the VAULT compiled-page filtered repair views
- Refresh task tracking and handoff

Out of scope:

- Changing the underlying surface-capability data model beyond what the new launchers need
- Reworking compiled-page content rendering or archive heuristics
- Adding entirely new repair destinations

## Implementation plan

1. Add a shared subsection-opening cluster to `SurfaceCapabilitiesConsole`
2. Remove redundant per-card open buttons from subsection cards so the section is lighter to scan
3. Add exact repair-session launchers to the VAULT compiled-page filtered repair views
4. Refresh task tracking and handoff docs
5. Re-run verification and live route checks

## Done when

- `Surfaces` subsection cards are lighter and the shared exact-session launcher handles openings consistently
- VAULT route-less and untagged compiled-page repair views offer direct repair-session jump-offs
- `npm run type-check`, `npm run verify`, and `npm run handoff:write` pass
- Live `127.0.0.1:3000` checks succeed on `/resources?view=surfaces&surface=vault`, `/vault?focus=vault-compiled-pages&compiledFilter=route-less`, and `/vault?focus=vault-compiled-pages&compiledFilter=untagged`
