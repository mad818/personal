# Research / Graph / Document Assimilation — Batch 7

## Goal

Make the filtered VAULT graph easier to read by adding compact topology stats and a legend, while keeping every count and label derived only from the already-visible local node set.

## Scope

### RGD9 — Filtered topology awareness

- summarize visible node, edge, cluster, and orphan counts from the active filtered graph
- present those stats directly in graph mode near the existing filter controls
- keep all calculations client-side on top of the already-built filtered graph

### RGD9.a — Compact legend

- show visible node-type composition for clips, reports, and notes
- show visible visibility composition for safe, internal, and restricted nodes
- ensure the legend reflects current filters rather than hidden graph state

### RGD9.b — Security posture

- do not compute or show counts for hidden nodes outside the active filters
- do not add any new route, persistence, or external dependency
- keep restricted items represented only through the same safe metadata already present in the filtered graph

## Success criteria

- graph mode shows compact stats and legend for the active filtered view
- counts change immediately when source or visibility filters change
- no new backend surface or extra sensitive detail is introduced
- `type-check`, `verify`, and `handoff:write` all pass after the change
