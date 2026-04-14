# Research / Graph / Document Assimilation — Batch 6

## Goal

Add compact graph filters so VAULT operators can isolate saved clips, compiled pages, and sensitive topology without changing the underlying secure local graph contract.

## Scope

### RGD8 — Graph filters

- add a compact source filter for `all`, `saved clips`, and `compiled pages`
- add a compact visibility filter for `all`, `safe`, `sensitive`, and `restricted`
- apply filters only in the VAULT client on top of the already-built graph

### RGD8.a — Filtered graph safety

- drop edges automatically when either endpoint is hidden by the current filter
- pass the same filtered graph into the graph canvas and graph focus panel
- clear the current node selection if it becomes hidden by the active filters

### RGD8.b — Minimal contract change

- extend graph node metadata only with local-only `originKind` and `visibility` hints
- keep saved clips defaulted to `safe`
- preserve the existing protected local compiled-page boundary

## Success criteria

- operators can isolate saved clips, compiled pages, and sensitive topology from graph mode
- the focus panel never receives nodes outside the active filter scope
- no new backend route or external dependency is introduced
- `type-check`, `verify`, and `handoff:write` all pass after the change
