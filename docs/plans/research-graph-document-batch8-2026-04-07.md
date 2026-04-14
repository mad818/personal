# Research / Graph / Document Assimilation — Batch 8

## Goal

Make secure VAULT graph filtering faster to use by adding local-only preset shortcuts and restoring the last used filter state, without adding backend persistence or widening the graph contract.

## Scope

### RGD10 — Graph presets

- add compact one-click presets for:
  - balanced
  - safe-only
  - compiled research
  - restricted topology
- implement presets entirely in the VAULT client on top of the existing source and visibility filters

### RGD10.a — Sticky local state

- persist the last used source and visibility filters in browser storage
- validate restored values before applying them
- keep the persistence local-only and optional

### RGD10.b — Security posture

- do not add any route, sync, or server persistence
- presets must only drive the same existing client-side filtered graph
- hidden nodes must remain hidden when presets are applied or restored

## Success criteria

- operators can jump between named secure graph views with one click
- the last used graph filter state restores locally on reopen/reload
- no backend or extra sensitive surface is introduced
- `type-check`, `verify`, and `handoff:write` all pass after the change
