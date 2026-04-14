# FFF Assimilation Batch 2 — Deeper Working Context From Finder

Date: 2026-04-09
Owner: Codex

## Why this batch

The first Finder batch made it fast to open the right Nexus route or exact repair session, but many high-value results still stop at an overview page when the operator really wants the best next seeded working context. Broad results like Playbooks, System Design maps, and Surface audits should be able to open the strongest immediate session behind them without forcing extra clicks or turning Finder into another dense console.

## Goals

1. Add an optional working-context contract to finder results so broad entries can also open the strongest next seeded session.
2. Keep the UI compact by offering one secondary action only when it meaningfully improves the route-to-work transition.
3. Reuse existing seeded sessions such as Impact file prefills, spec starters, and exact repair panels instead of inventing a second navigation model.
4. Keep the feature fully local-first and free-first.

## Guardrails

- Do not turn Finder into a large action matrix; keep it to one overview action plus one best-next context action.
- Preserve the current `Exact panel` / `Route` language and extend it rather than replacing it.
- Prefer existing seeded routes and exact repair sessions over new query-parameter schemes.
- Keep ranking behavior stable unless a change directly improves working-context relevance.

## Planned changes

1. Extend `lib/sessionFinder.ts` with optional working-context metadata for finder entries and derive it from existing playbook, spec, system, and surface contracts.
2. Update `components/resources/SessionFinderConsole.tsx` so results can open either the overview route or the strongest seeded working context.
3. Tighten Finder labels/copy so the new context action reads like part of the same audit-to-repair vocabulary.
4. Refresh task tracking and handoff docs.
5. Re-run `type-check`, `verify`, `handoff:write`, and live checks on `/resources?view=finder`, a seeded Impact route, and a seeded Specs route.
