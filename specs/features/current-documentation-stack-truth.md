# Current Documentation Stack Truth

## Goal

Make every current public or operator-facing stack claim agree with the active package manifest and release matrix, while preserving dated planning documents as clearly labeled historical snapshots.

## Current surfaces

- `README.md` framework badge, product summary, and stack summary.
- The five README/social SVGs that visibly print a Next.js major.
- `docs/architecture.md` as the current architecture overview.
- `docs/NEXUS_FIGMA_IMPLEMENTATION_RULES.md` as the current design-to-code guide.
- `docs/pm-operator-model.md` as the current operator playbook.
- Current security backlog wording in `tasks/todo.md`.
- `docs/README.md` as the reader-facing document index.

## Historical surfaces

- `tasks/vision-roadmap.md` remains an unchanged March 2026 snapshot below a prominent historical-status notice.
- `docs/plans/nexus-comprehensive-roadmap-2026.md` remains a planning snapshot below a prominent historical-status notice.
- Historical bodies may retain period-accurate versions, routes, and gaps; they must point readers to current authority and must not call themselves living/current.

## Guardrails

- No runtime, component, API, dependency, provider, state, private-data, `.agents`, `.claude`, or RPG-file change.
- No redesign or raster generation; SVG edits are text-only and preserve geometry, styling, and accessibility metadata.
- No bulk rewriting of historical plans or erasure of their original context.
- Exact patch versions remain owned by `package.json`; current reader-facing prose uses framework majors.

## Acceptance

- Current/public surfaces say Next.js 15 and React 19 where both are relevant, and contain no active Next.js 14 or React 18 claim.
- README text, badge, banner, infographics, stack table, and social card agree.
- Current architecture lists the eight GA routes from `lib/release-matrix.json` and describes the archived HTML boundary accurately.
- The PM playbook routes current work through `tasks/todo.md`, `docs/SYSTEM_STATE.md`, and `specs/features/`, not the historical vision snapshot or legacy Claude rules.
- Both dated plans carry explicit historical status and current-authority links.
- `npm run docs:stack:check` is wired into canonical verification and fails on future drift.
- Focused checks, canonical verification, production build, handoff freshness, publication safety, formatting, and diff checks pass with zero RPG path modified.
