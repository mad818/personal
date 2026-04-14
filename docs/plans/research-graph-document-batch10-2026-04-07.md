# Research / Graph / Document Assimilation — Batch 10

## Goal

Make the current VAULT graph state more legible by adding a compact active-view label that tells the operator whether the graph is on a named preset, a custom filtered state, or the balanced default.

## Scope

### RGD12 — Active graph view status

- derive the current graph view from the existing source and visibility filters
- recognize named presets using the existing preset catalog
- treat non-preset combinations as custom views

### RGD12.a — Compact operator signal

- render the status inline with the existing graph controls
- keep the label short and scan-friendly
- avoid introducing a second state model or any backend persistence

### RGD12.b — Security posture

- do not change the graph contract
- do not expose anything beyond the already-visible local filter state
- keep the status purely client-side

## Success criteria

- operators can immediately see whether the current graph is balanced, preset-driven, or custom
- the status updates as soon as filters or presets change
- no backend or extra sensitive surface is introduced
- `type-check`, `verify`, and `handoff:write` all pass after the change
