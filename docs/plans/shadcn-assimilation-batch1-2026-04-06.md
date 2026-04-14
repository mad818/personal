# Nexus Prime — Shadcn Assimilation Batch 1

**Date:** 2026-04-06  
**Status:** implementation batch  
**Scope:** reverse-engineer the strongest `shadcn-ui/ui` ideas and absorb them into Nexus without replacing the existing shell system.

## Why this is an assimilation batch, not a rewrite

Nexus already has the underlying ingredients that make shadcn work well:

- Radix primitives are already installed.
- `class-variance-authority` is already installed.
- `clsx` and `tailwind-merge` are already installed.
- The repo already has a house UI system in `components/ui/shell.tsx`.

The correct move is to absorb the patterns that matter:

- open-code composition
- one shared `cn()` utility
- variant-driven primitives
- semantic empty, alert, and loading states

The wrong move would be to initialize a second competing UI system and force the project into a full `components.json` migration midstream.

## Reverse-engineered takeaways from `shadcn-ui/ui`

From the official repo and docs:

- the project is intentionally open-code and meant to be customized inside the host app
- composable structure matters more than visual mimicry
- reusable semantic primitives beat ad hoc status markup
- themeable surface primitives should inherit host tokens instead of hardcoding brand colors

Applied to Nexus, that means:

- keep the existing shell and brand language
- adopt `cn()` and `cva()` patterns where they reduce drift
- centralize status callouts, empty states, and skeleton rows
- upgrade high-traffic panels first instead of bulk-converting the whole app

## Deliverables

1. Add shared `cn()` utility for future shadcn-style composition.
2. Add reusable Nexus surface primitives:
   - alert/callout
   - empty state
   - loading rows
3. Refactor hand-rolled command and intel surfaces onto those primitives.
4. Keep verification green with `type-check`, `lint`, and `verify`.

## Explicitly not in scope

- full shadcn CLI init
- adding a new `components.json` track
- replacing the Nexus shell page system
- converting every panel in one pass

## Acceptance criteria

- Nexus gains one reusable primitive layer inspired by shadcn composition.
- Existing shell visuals remain intact.
- At least the command/intel surfaces touched in this batch stop hand-rolling their empty and alert states.
- `npm run type-check`, `npm run lint`, and `npm run verify` pass.
