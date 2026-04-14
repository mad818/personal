# Obsidian Mind Assimilation Batch 1 — VAULT stewardship lane

## Why this batch exists

`obsidian-mind` gets one thing very right for Nexus: the archive should be treated like a maintained graph, not a passive pile of notes. Orphans, stale content, missing links, and weak routing are archive-health problems, not just cosmetic issues.

Nexus already has the raw ingredients:

- a local vault graph
- a local lint pass
- compiled memory pages
- saved research clips

What it does not have yet is a compact operator-facing stewardship layer that makes those health signals obvious without dropping into a deep graph or synthesis tab.

## Goals

1. Turn existing vault graph/lint signals into one compact archive-health summary.
2. Keep the implementation fully local-first and free-first.
3. Reuse current graph/lint data instead of creating a second audit system.
4. Make stewardship a first-class VAULT focus target so the archive can be inspected intentionally.

## Scope

### In
- Add a pure local stewardship summary helper
- Add a compact VAULT stewardship panel
- Wire a `vault-stewardship` focus target into the VAULT route
- Update surface audit links so the stewardship lane is reachable

### Out
- No new backend/API work
- No external graph/index dependency
- No route removals or vault model changes
- No Obsidian-specific file format support

## Implementation plan

1. Add the batch plan/task entry before coding.
2. Create a pure helper that summarizes archive health from saved articles, compiled pages, graph topology, and lint output.
3. Create a compact VAULT stewardship panel with the highest-signal metrics and next actions.
4. Mount the panel in VAULT and add a focused-session strip / focus target for it.
5. Update the VAULT subsection links in `surfaceCapabilities.ts`.
6. Re-verify code, handoff, and live route reachability.

## Design rules

- Stewardship should feel like operator posture, not like a secondary admin dashboard.
- Show only the highest-signal archive health metrics by default.
- Prefer “what needs attention next” over raw diagnostic dumps.
- Keep using the existing graph/lint foundation so the archive has one source of truth.

## Verification

- `npm run type-check`
- `npm run verify`
- `npm run handoff:write`
- Live checks on:
  - `/vault`
  - `/vault?focus=vault-stewardship`
  - `/resources?view=surfaces`
