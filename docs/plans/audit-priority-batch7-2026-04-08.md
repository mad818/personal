# Audit Priority Batch 7 — Scheduler Guidance Compaction + Office Room Scene Split

## Why this batch

Two of the remaining high-risk files were carrying very different kinds of debt:

- `components/ui/CronSchedulerPanel.tsx` had grown into a dense operator drawer with too much always-visible instructional copy, making the scheduler feel heavier than the actions it exposes.
- `components/home/office/OfficeRoom3D.tsx` still kept a large amount of pure scene configuration and math inline with the React/R3F component tree, which raises cleanup risk every time the room evolves.

This batch tackles both without changing product behavior:

- compact verbose scheduler guidance into expandable operator notes
- extract scheduler helpers into a dedicated utility module
- extract pure office-room scene config/math into a dedicated module

## Goals

1. Reduce visible scheduler text overload without removing important operator context.
2. Shrink `CronSchedulerPanel.tsx` by moving pure constants/formatters/validators out.
3. Shrink `OfficeRoom3D.tsx` by moving pure scene config/helpers out.
4. Re-verify the scheduler/HQ surfaces at both code and browser level.

## Implementation plan

### AP7.1 — Add a reusable compact operator-note primitive
- Create a small expandable note component for concise summary-first guidance.
- Use it where the scheduler currently keeps long instructional copy fully expanded.

### AP7.2 — Extract scheduler helper constants and formatters
- Move cron presets, mission templates, storage keys, and small format/validation helpers into a dedicated scheduler utility module.
- Keep the drawer component focused on state + rendering.

### AP7.3 — Condense scheduler guidance
- Replace the verbose workflow-template, native-batch, and governance explanations with compact operator notes.
- Keep buttons and actions visible while moving rationale into expandable detail.

### AP7.4 — Extract office-room scene config/helpers
- Move pure scene types, palette helpers, geometry transforms, camera presets, and agent style maps into a dedicated module.
- Leave the React/R3F component tree behavior unchanged.

### AP7.5 — Re-verify
- `npm run type-check`
- `npm run verify`
- `npm run build`
- `npm run hq:e2e`
- live reachability:
  - `http://127.0.0.1:3000`
  - `http://127.0.0.1:3000/hq`
  - `http://127.0.0.1:3000/vehicle`
