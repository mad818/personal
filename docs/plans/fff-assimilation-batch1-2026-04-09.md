# FFF Assimilation Batch 1 — Fast Local Session Finder

Date: 2026-04-09
Owner: Codex

## Why this batch

The strongest transferable idea from `dmtrKovalenko/fff.nvim` is not a file-picker clone. It is fast, typo-tolerant finding with lightweight memory so an operator or agent can get to the right target with fewer roundtrips and less wandering. Nexus already has high-value exact sessions across Playbooks, Specs, System Design, Surfaces, and route focus links, but there is no single fast lane that ranks them together.

## Goals

1. Build a local session finder catalog from existing Resources data instead of inventing a second navigation tree.
2. Add lightweight recency memory so recently useful exact sessions surface faster.
3. Prefer exact repair sessions over broad route tops when ranking results.
4. Keep the implementation fully local-first and free-first.

## Guardrails

- No external search service, vector index, or paid dependency.
- Do not turn this into a generic file picker; optimize for Nexus work sessions and repair routes first.
- Keep the UI compact and operator-grade, not another text-heavy console.
- Reuse the existing `Exact panel` / `Route` language so the finder fits the current audit-to-repair model.

## Planned changes

1. Add a shared finder catalog and local ranking/memory helper in `lib/sessionFinder.ts`.
2. Add a `Resources > Finder` console that searches playbooks, specs, system maps, surface lanes, and exact repair sessions together.
3. Add local usage memory so recently opened entries get a small ranking boost.
4. Thread the finder lane into the Resources workbench, route copy, and Resources surface capability audit.
5. Re-run `type-check`, `verify`, `handoff:write`, and live checks on `/resources`, `/resources?view=finder`, and one exact-session result.
