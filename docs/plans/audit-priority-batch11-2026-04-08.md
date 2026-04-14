# Audit Priority Batch 11 — HQ Terminal + Scheduler Job List Decomposition

## Why this batch

The runtime/build boundary is stable again, so the next highest-value cleanup move is shrinking the two biggest inline UI render blocks still left in HQ and scheduler:

- `OfficeCommandCenter.tsx` still owns the entire chronicle + composer render path inline
- `CronSchedulerPanel.tsx` still owns the full scheduled-job card list inline
- both blocks are long, text-heavy, and harder to reason about than the rest of the now-split surfaces

This batch extracts those render-heavy sections into dedicated components and uses the existing compact-note pattern to reduce instruction-copy overload where it makes sense.

## Goals

1. Split HQ terminal/chronicle rendering out of `OfficeCommandCenter.tsx`.
2. Split scheduled-job card rendering out of `CronSchedulerPanel.tsx`.
3. Replace the heaviest always-visible HQ helper copy with compact operator-note presentation.
4. Re-verify type, behavior, and live browser reachability after the split.

## Implementation plan

### AP11.1 — Extract HQ terminal section
- Create a dedicated `HQTerminalSection` component for:
  - empty chronicle state
  - message feed
  - pending lesson approval bar
  - composer / prompt chips / persona row
- Keep all runtime behavior identical; move only render structure.

### AP11.2 — Reduce text overload in HQ
- Reuse `CompactOperatorNote` for the chronicle empty state and workflow-command guidance.
- Keep the same information, but collapse long helper copy behind a lighter presentation.

### AP11.3 — Extract scheduler jobs section
- Create a dedicated `CronSchedulerJobsSection` component for the sorted scheduled-job list.
- Keep the governance/filtering behavior unchanged.

### AP11.4 — Re-verify
- `npm run type-check`
- `npm run verify`
- `npm run hq:e2e`
- live reachability:
  - `http://127.0.0.1:3000`
  - `http://127.0.0.1:3000/hq`
  - `http://127.0.0.1:3000/vehicle`
