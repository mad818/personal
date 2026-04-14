# Research / Graph / Document Assimilation — Batch 11

## Goal

Add a local-only copy action for the current VAULT graph view so operators can quickly reuse the active secure graph state in notes, task logs, and handoffs.

## Scope

### RGD13 — Copy view summary

- derive a compact text summary from the current graph view state
- include the active view label, source filter, visibility filter, and visible topology counts
- keep the summary limited to the currently visible filtered graph

### RGD13.a — Local feedback

- add a small `Copy view summary` action in graph mode
- show lightweight success/failure feedback next to the existing controls
- keep the action fully client-side and clipboard-only

### RGD13.b — Security posture

- do not expose hidden-node counts or unfiltered graph state
- do not add any backend route, sync, or persistence
- keep the copied payload bounded to safe local UI state that is already visible

## Success criteria

- operators can copy the active graph view summary with one click
- the copied text reflects only the visible filtered graph state
- no backend or extra sensitive surface is introduced
- `type-check`, `verify`, and `handoff:write` all pass after the change
