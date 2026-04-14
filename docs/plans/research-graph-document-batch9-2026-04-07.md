# Research / Graph / Document Assimilation — Batch 9

## Goal

Add an explicit reset path for sticky local graph state so operators can intentionally discard saved presets and return VAULT graph mode to a clean secure default.

## Scope

### RGD11 — Reset view

- add a compact `Reset view` action in VAULT graph mode
- return graph source and visibility filters to the balanced default
- clear any current graph node selection

### RGD11.a — Local persistence reset

- remove the saved graph filter state from browser storage when reset is used
- keep the reset entirely local-only
- allow normal sticky persistence to resume after the reset

### RGD11.b — Security posture

- do not add any route, sync, or server persistence
- do not change the protected local graph contract
- keep reset behavior limited to the current browser state and current local machine

## Success criteria

- operators can reset graph mode back to the balanced default with one action
- sticky local graph state is cleared when reset is used
- no backend or extra sensitive surface is introduced
- `type-check`, `verify`, and `handoff:write` all pass after the change
