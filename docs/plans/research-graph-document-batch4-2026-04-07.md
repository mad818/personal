# Research / Graph / Document Assimilation — Batch 4

## Goal

Make the VAULT knowledge graph actionable by adding a secure drill-down lane for graph nodes, without exposing restricted compiled page bodies or widening the graph contract.

## Scope

### RGD6 — Graph focus panel

- add a local-only detail panel for selected graph nodes
- support both saved article nodes and compiled memory page nodes
- keep the graph canvas unchanged except for click-through wiring

### RGD6.a — Protected compiled page reads

- compiled page drill-down should use the existing protected local detail route
- cache fetched page detail client-side for the current session
- restricted compiled pages should show only the already-sanitized metadata and withholding notice

### RGD6.b — Operator flow and safety

- clicking a graph node should populate the focus panel
- if the selected node disappears after a graph rebuild, clear the stale selection
- do not add any new public route, external dependency, or secret-bearing payload

## Success criteria

- operators can click graph nodes and inspect safe local details immediately
- saved clips render from local store state, compiled pages render through the protected detail path
- restricted compiled pages stay represented but keep body content withheld
- `type-check`, `verify`, and `handoff:write` all pass after the change
