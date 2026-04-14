# Research / Graph / Document Assimilation — Batch 12

## Goal

Add a local-only export of the currently visible VAULT graph node set so operators can reuse the active secure graph view in notes, task logs, and handoffs.

## Scope

### RGD14 — Copy visible nodes

- derive a clipboard-safe payload from the current filtered graph node set
- include only metadata already visible in the active filtered graph
- keep the payload tied to the active view label and current visible-node count

### RGD14.a — Local-only operator action

- add a `Copy visible nodes` action in graph mode
- provide lightweight success/failure feedback in the existing graph control area
- keep the feature entirely client-side and clipboard-only

### RGD14.b — Security posture

- do not include hidden nodes or unfiltered graph state
- do not add any backend route, persistence, or sync
- keep restricted nodes limited to the same metadata already visible in the graph layer

## Success criteria

- operators can copy the currently visible graph node set with one click
- the copied payload reflects only the active filtered graph
- no backend or extra sensitive surface is introduced
- `type-check`, `verify`, and `handoff:write` all pass after the change
