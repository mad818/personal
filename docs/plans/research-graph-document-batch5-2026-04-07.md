# Research / Graph / Document Assimilation — Batch 5

## Goal

Make VAULT graph relationships explainable by adding safe edge inspection to the graph focus panel, without revealing restricted compiled page content or widening the graph route surface.

## Scope

### RGD7 — Linked context

- show the most relevant connected nodes for the currently selected graph item
- explain each connection using the existing graph edge reason and strength
- keep the interaction local-only and derived from the already-built graph

### RGD7.a — Protected linkage rules

- if the selected node is a restricted compiled page, edge reasons should be generalized
- if any connected node is a restricted compiled page, edge reasons should also be generalized
- connected-node titles may remain visible only because they are already present in the graph node set

### RGD7.b — Operator ergonomics

- sort linked context by edge weight
- keep the section compact and easy to scan
- do not add any new backend route or external dependency

## Success criteria

- clicking a graph node shows both local details and related safe link explanations
- restricted compiled pages never surface detailed linkage reasons in the focus panel
- the graph still works entirely through local state plus the existing protected compiled-page route
- `type-check`, `verify`, and `handoff:write` all pass after the change
